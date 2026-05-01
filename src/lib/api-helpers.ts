'use client'

const API_BASE = '/api'

class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any
    try {
      errorData = await response.json()
    } catch {
      errorData = { error: 'Error de conexión' }
    }
    throw new ApiError(
      errorData.error || `Error ${response.status}`,
      response.status,
      errorData
    )
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T
  }

  return response.json()
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return handleResponse<T>(response)
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

export async function apiPut<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  return handleResponse<T>(response)
}

// TanStack Query fetcher
export function fetcher<T>(path: string): Promise<T> {
  return apiGet<T>(path)
}

export { ApiError }
