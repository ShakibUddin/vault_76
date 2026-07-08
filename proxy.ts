// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

// Routes anyone can access, logged in or not.
// Keep this list small and explicit — everything NOT here requires auth.
const publicRoutes = ["/", "/about", "/contact"];

// Routes a logged-in user shouldn't see (redirect them away instead).
const authRoutes = ["/login", "/signup", "/forgot-password"];

async function verifyToken(token: string) {
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("auth_token")?.value;

    const isAuthenticated = token ? await verifyToken(token) : null;

    const isPublicRoute = publicRoutes.includes(pathname);
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // Everything is protected UNLESS it's explicitly public or an auth route.
    const isProtectedRoute = !isPublicRoute && !isAuthRoute;

    if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};