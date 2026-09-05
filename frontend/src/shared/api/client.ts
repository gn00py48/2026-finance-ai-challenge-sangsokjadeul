const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

// Add the CSRF header when cookie-session authentication is implemented.
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, { ...options, credentials: 'include' })
  if (!response.ok) throw new Error(`API request failed (${response.status})`)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
