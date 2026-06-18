"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/session";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function login(formData: FormData): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Username and password are required." };
  }

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPasswordHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUsername || !expectedPasswordHash) {
    return { ok: false, error: "Auth is not configured on the server." };
  }

  const { username, password } = parsed.data;

  if (username !== expectedUsername) {
    return { ok: false, error: "Invalid username or password." };
  }

  const passwordMatches = await bcrypt.compare(password, expectedPasswordHash);
  if (!passwordMatches) {
    return { ok: false, error: "Invalid username or password." };
  }

  const token = createSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return { ok: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
