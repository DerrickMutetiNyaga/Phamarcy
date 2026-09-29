export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

export async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, formData, signal } = options;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError(0, "Network error. Check your connection and try again.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data: unknown = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${response.status})`;
    if (response.status === 401) window.location.assign(new URL("/login", window.location.origin));
    throw new ApiClientError(response.status, message);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
