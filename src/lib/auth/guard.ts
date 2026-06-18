import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

// Used inside Server Actions/Server Components to confirm the request is
// authenticated, as a defense-in-depth check alongside middleware.ts.
export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    throw new Error("Unauthorized");
  }
}
