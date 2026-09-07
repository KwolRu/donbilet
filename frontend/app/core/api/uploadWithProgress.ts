/**
 * PUT a File/Blob to a presigned URL with per-file progress.
 *
 * Uses XMLHttpRequest because the fetch API does not expose upload progress
 * events in any current browser. The returned promise resolves on a 2xx
 * response and rejects otherwise (or on network error / abort).
 */
export function uploadWithProgress(
  url: string,
  file: File | Blob,
  mime: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url, true)
    xhr.setRequestHeader("Content-Type", mime)

    const onAbort = () => {
      try {
        xhr.abort()
      } catch {
        // ignore
      }
    }

    if (signal) {
      signal.addEventListener("abort", onAbort)
    }

    const cleanup = () => {
      if (signal) signal.removeEventListener("abort", onAbort)
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      cleanup()
      reject(new Error("Network error during upload"))
    }

    xhr.onabort = () => {
      cleanup()
      reject(new DOMException("Upload aborted", "AbortError"))
    }

    xhr.send(file)
  })
}
