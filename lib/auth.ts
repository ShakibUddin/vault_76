import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_NAME = "auth_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

if (!JWT_SECRET) {
    throw new Error("Please define the JWT_SECRET environment variable.");
}

export interface TokenPayload {
    userId: string;
    email: string;
}

/**
 * Sign a JWT for a given user payload.
 */
export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET as string, {
        expiresIn: TOKEN_MAX_AGE,
    });
}

/**
 * Verify and decode a JWT. Returns null if invalid/expired
 * instead of throwing, so callers can treat it as "not authenticated".
 */
export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
    } catch {
        return null;
    }
}

/**
 * Set the auth cookie on the response.
 * - httpOnly: not accessible to client-side JS (mitigates XSS token theft)
 * - secure: only sent over HTTPS in production
 * - sameSite: "lax" balances CSRF protection with normal navigation
 */
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TOKEN_MAX_AGE,
    });
}

/**
 * Clear the auth cookie (logout).
 */
export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

/**
 * Read and verify the current request's auth token from cookies.
 * Returns the decoded payload, or null if not authenticated.
 */
export async function getAuthUser(): Promise<TokenPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}