/* Pulls the payload out of a JWT and parses it into an object */
export function decodeToken(token: string): { userId: number; email: string; role: string } {
  const payloadBase64 = token.split(".")[1];
  const payloadJson = atob(payloadBase64);
  const payload = JSON.parse(payloadJson);

  return {
    userId: payload.userId,
    email: payload.sub,
    role: payload.role,
  };
}
