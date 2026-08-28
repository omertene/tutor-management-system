/* Safely reads a JSON error body from a failed fetch response. Some server
   errors have a non-JSON or empty body, which makes response.json() reject -
   calling that directly would throw before any error state gets set, leaving
   the user with no feedback at all. */
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data: unknown = await response.json();
        if (data && typeof data === "object" && "message" in data && typeof data.message === "string" && data.message) {
            return data.message;
        }
        return fallback;
    } catch {
        return fallback;
    }
}
