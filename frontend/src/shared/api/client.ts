const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

// refresh token은 HttpOnly 쿠키에 있어 JS가 읽지 못한다. 갱신은 서버가 쿠키로만 판단한다.
let refreshing: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!response.ok) return false
      const body = (await response.json()) as { accessToken: string }
      localStorage.setItem('accessToken', body.accessToken)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

function send(path: string, options: RequestInit): Promise<Response> {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  return fetch(`${baseUrl}/${path.replace(/^\//, '')}`, { ...options, headers, credentials: 'include' })
}

async function request(path: string, options: RequestInit): Promise<Response> {
  let response = await send(path, options)
  // 만료된 access token은 한 번만 갱신하고 재시도한다. 실패하면 로그인 상태를 지운다.
  if (response.status === 401 && !path.startsWith('auth/')) {
    if (await refreshSession()) response = await send(path, options)
    else localStorage.removeItem('accessToken')
  }
  return response
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await request(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || `요청에 실패했습니다. (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function apiBlob(path: string): Promise<Blob> {
  const response = await request(path, {})
  if (!response.ok) throw new Error(`원본을 불러오지 못했습니다. (${response.status})`)
  return response.blob()
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) })
