// single source of truth for the backend URL - used to be copy-pasted as a
// hardcoded literal into every page, which meant the app couldn't be pointed
// at a different backend (e.g. a deployed one) without editing 11 files.
// falls back to localhost so local dev keeps working with no .env file.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// thin fetch wrapper - just prepends the base URL, everything else (headers,
// auth token, method, body, error handling) stays exactly as each call site
// already does it. not trying to centralize more than that here.
export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    return fetch(`${API_BASE_URL}${path}`, options);
}

// every caller used to do `localStorage.getItem("token")!`, asserting a token
// is always there. ProtectedRoute normally guarantees that, but a token can
// still disappear mid-session (cleared in another tab, expired and removed
// elsewhere) - in that case the assertion just lied and every subsequent
// fetch silently sent "Authorization: Bearer null". send the user back to
// login instead of pretending nothing's wrong.
export function getToken(): string {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
        throw new Error("Not authenticated");
    }
    return token;
}

export { readErrorMessage } from "./httpError";
