export async function requestJson(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = localStorage.getItem('scholarlink_token')
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  })
  const contentType = response.headers.get('content-type') || ''
  const responseText = await response.text()
  let data = {}

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      if (contentType.includes('text/html')) {
        throw new Error(
          `The API returned an HTML page instead of JSON (HTTP ${response.status}). Restart the backend from the scholarlink-api folder and confirm it is running on port 5000.`
        )
      }
      throw new Error(`The API returned an invalid response (HTTP ${response.status}).`)
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (HTTP ${response.status}).`)
  }

  return data
}
