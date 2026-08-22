// safely reads a JSON error body from a failed fetch response. some server
// errors (a non-JSON body, an empty body, a request that never reached the
// backend at all) make response.json() reject - calling that directly and
// reading .message off the result throws before any error state gets set,
// so the UI just does nothing and the user sees no feedback at all.
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json();
        return data?.message || fallback;
    } catch {
        return fallback;
    }
}
