/**
 * Intercept XMLHttpRequest to chunk Mapillary API requests that exceed 30 image_ids.
 * mapillary-js uses XHR internally (xhrFetch), not window.fetch.
 * This MUST be imported before mapillary-js so the patched XHR is in place.
 */
const CHUNK_SIZE = 30
const OriginalXHR = window.XMLHttpRequest

class PatchedXHR extends OriginalXHR {
  private _url = ''
  private _method = ''
  private _needsChunking = false
  private _chunks: string[][] = []
  private _baseUrl = ''

  open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
    const urlStr = typeof url === 'string' ? url : url.href
    this._method = method
    this._url = urlStr

    if (urlStr.includes('graph.mapillary.com')) {
      try {
        const parsed = new URL(urlStr)
        const imageIds = parsed.searchParams.get('image_ids')
        if (imageIds) {
          const ids = imageIds.split(',')
          if (ids.length > CHUNK_SIZE) {
            this._needsChunking = true
            this._baseUrl = urlStr
            this._chunks = []
            for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
              this._chunks.push(ids.slice(i, i + CHUNK_SIZE))
            }
            // Open with first chunk URL so the XHR object is in a valid state
            const firstUrl = new URL(urlStr)
            firstUrl.searchParams.set('image_ids', this._chunks[0]!.join(','))
            super.open(method, firstUrl.href, async ?? true, username, password)
            return
          }
        }
      } catch { /* not a valid URL, pass through */ }
    }

    this._needsChunking = false
    super.open(method, urlStr, async ?? true, username, password)
  }

  send(body?: Document | XMLHttpRequestBodyInit | null) {
    if (!this._needsChunking || this._chunks.length <= 1) {
      super.send(body)
      return
    }

    // Fire all chunk requests in parallel, merge results, then fake the response
    const promises = this._chunks.map((chunk) => {
      const chunkedUrl = new URL(this._baseUrl)
      chunkedUrl.searchParams.set('image_ids', chunk.join(','))

      return new Promise<any>((resolve, reject) => {
        const xhr = new OriginalXHR()
        xhr.open(this._method, chunkedUrl.href, true)
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            resolve({ data: [] })
          }
        }
        xhr.onerror = () => reject(new Error('chunk request failed'))
        xhr.send()
      })
    })

    Promise.all(promises)
      .then((jsons) => {
        const merged = { data: jsons.flatMap((j: any) => j.data || []) }
        const mergedStr = JSON.stringify(merged)

        // Override response properties
        Object.defineProperty(this, 'status', { get: () => 200, configurable: true })
        Object.defineProperty(this, 'statusText', { get: () => 'OK', configurable: true })
        Object.defineProperty(this, 'responseText', { get: () => mergedStr, configurable: true })
        Object.defineProperty(this, 'response', { get: () => mergedStr, configurable: true })
        Object.defineProperty(this, 'readyState', { get: () => 4, configurable: true })

        // Fire readystatechange and load events
        this.dispatchEvent(new Event('readystatechange'))
        this.dispatchEvent(new ProgressEvent('load'))
        this.dispatchEvent(new ProgressEvent('loadend'))

        if (typeof this.onreadystatechange === 'function') {
          this.onreadystatechange(new Event('readystatechange') as any)
        }
        if (typeof this.onload === 'function') {
          this.onload(new ProgressEvent('load') as any)
        }
      })
      .catch(() => {
        // Let the first chunk request go through normally as fallback
        super.send(body)
      })
  }
}

window.XMLHttpRequest = PatchedXHR as any
