import { readErrorMessage } from "./httpError";

// single source of truth for the backend URL - used to be copy-pasted as a
// hardcoded literal into every page, which meant the app couldn't be pointed
// at a different backend (e.g. a deployed one) without editing 11 files.
// falls back to localhost so local dev keeps working with no .env file.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// thrown when the session is over. apiFetch has already cleared the token and sent
// the user to /login by the time this is thrown, so callers don't need to handle it -
// it exists to stop the calling function from carrying on and overwriting the login
// redirect with an error banner nobody will see.
export class SessionExpiredError extends Error {
    constructor() {
        super("Session expired");
        this.name = "SessionExpiredError";
    }
}

function redirectToLogin(): never {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new SessionExpiredError();
}

// every authenticated request goes through here. it prepends the base URL, attaches
// the bearer token, and - the part that matters - handles an expired session in one
// place.
//
// previously each of ~70 call sites did its own fetch with its own Authorization
// header and checked only `response.ok`, so once the 24h token expired the app still
// looked logged in (ProtectedRoute reads the role claim, never the expiry) and every
// page just showed "Failed to load ..." with no way to recover short of clearing
// storage by hand. now a 401/403 clears the token and bounces to the login screen.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem("token");
    if (!token) {
        redirectToLogin();
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    // only set a JSON content type when there's a body and the caller hasn't chosen
    // one - FormData uploads must be left alone so the browser can add the multipart
    // boundary itself
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
