import { readErrorMessage } from "./httpError";

/* Single source of truth for the backend URL - falls back to localhost so
   local dev keeps working with no .env file */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/* Thrown when the session is over. apiFetch has already cleared the token and
   redirected to /login by the time this is thrown, so callers don't need to
   handle it - it just stops the caller from overwriting the redirect with an
   error banner nobody will see. */
export class SessionExpiredError extends Error {
    constructor() {
        super("Session expired");
        this.name = "SessionExpiredError";
    }
}

/* Clears the token and sends the user to login */
function redirectToLogin(): never {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new SessionExpiredError();
}

/* Every authenticated request goes through here - prepends the base URL,
   attaches the bearer token, and redirects to login on a 401/403 so an
   expired session doesn't just show "Failed to load..." everywhere */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem("token");
    if (!token) {
        redirectToLogin();
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    /* Only sets a JSON content type when there's a body and the caller hasn't
       chosen one - FormData uploads are left alone so the browser can add its
       own multipart boundary */
    if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
    }

    return response;
}

export { readErrorMessage };
