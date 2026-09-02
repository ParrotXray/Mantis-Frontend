import { getAuthHeaders } from './authStore'

export const createWebSocket = (
  url: string,
  onMessage: (data: any) => void,
  onError?: (error: Event) => void
): WebSocket => {
  const ws = new WebSocket(url)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error)
    }
  }

  ws.onerror = (error) => {
    console.error("WebSocket Error:", error)
    if (onError) onError(error)
  }

  return ws
}

export const fetchData = async (
  url: string,
  onSuccess: (data: string) => void,
  onError?: (error?: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(url, { headers: getAuthHeaders() })
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
    const data = await response.text()
    onSuccess(data)
  } catch (error) {
    console.error(`Failed to fetch data from URL: ${url}`)
    if (onError) onError(error as Error)
  }
}

export const fetchBlob = async (
  url: string,
  onSuccess: (blob: Blob, filename?: string) => void,
  onError?: (error?: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(url, { headers: getAuthHeaders() })
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
    const blob = await response.blob()
    const disposition = response.headers.get("Content-Disposition")
    const filename = disposition ? /filename="?([^"]+)"?/.exec(disposition)?.[1] : undefined
    onSuccess(blob, filename)
  } catch (error) {
    console.error(`Failed to fetch file from URL: ${url}`)
    if (onError) onError(error as Error)
  }
}

export const postCsvFile = async (
  url: string,
  file: File,
  onSuccess?: (data?: any) => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const text = await file.text()
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/csv",
        ...getAuthHeaders(),
      },
      body: text,
    })

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)

    const data = await response.json()
    if (onSuccess) onSuccess(data)
  } catch (error) {
    console.error(`Failed to upload CSV to URL: ${url}`, error)
    if (onError) onError(error as Error)
  }
}

export const postData = async (
  url: string,
  payload: any,
  onSuccess?: (data?: any) => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)

    const contentType = response.headers.get("Content-Type")
    const isJsonResponse = contentType && contentType.includes("application/json")
    const data = isJsonResponse ? await response.json() : null

    if (onSuccess) onSuccess(data)
  } catch (error) {
    console.error(`Failed to send POST request to URL: ${url}`, error)
    if (onError) onError(error as Error)
  }
}

export const putData = async (
  url: string,
  payload: any,
  onSuccess?: (data?: any) => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)

    const contentType = response.headers.get("Content-Type")
    const isJsonResponse = contentType && contentType.includes("application/json")
    const data = isJsonResponse ? await response.json() : null

    if (onSuccess) onSuccess(data)
  } catch (error) {
    console.error(`Failed to send PUT request to URL: ${url}`, error)
    if (onError) onError(error as Error)
  }
}

export const deleteData = async (
  url: string,
  data: any,
  onSuccess?: (data: string) => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)

    const responseData = await response.text()
    if (onSuccess) onSuccess(responseData)
  } catch (error) {
    console.error(`Failed to send DELETE request to URL: ${url}`, error)
    if (onError) onError(error as Error)
  }
}