const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, { ...options, headers })
  if (response.status === 401) localStorage.removeItem('accessToken')
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || `요청에 실패했습니다. (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function apiBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, { headers })
  if (response.status === 401) localStorage.removeItem('accessToken')
  if (!response.ok) throw new Error(`원본을 불러오지 못했습니다. (${response.status})`)
  return response.blob()
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) })
