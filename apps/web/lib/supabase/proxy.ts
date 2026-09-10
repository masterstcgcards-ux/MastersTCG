import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasEnvVars } from "../utils";

const AUTH_TIMEOUT_MS = 8000;

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
) {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => {
      response.cookies.set({
        name: cookie.name,
        value: "",
        path: "/",
        expires: new Date(0),
        maxAge: 0,
      });
    });

  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user: unknown = null;

  try {
    const authResult = await Promise.race([
      supabase.auth.getClaims(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Tempo limite da autenticação excedido."));
        }, AUTH_TIMEOUT_MS);
      }),
    ]);

    if (authResult.error) {
      throw authResult.error;
    }

    user = authResult.data?.claims || null;
  } catch {
    const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
    const isHomeRoute = request.nextUrl.pathname === "/";

    if (isAuthRoute || isHomeRoute) {
      const response = NextResponse.next({
        request,
      });

      return clearSupabaseAuthCookies(request, response);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("reason", "session_expired");

    const response = NextResponse.redirect(loginUrl);

    return clearSupabaseAuthCookies(request, response);
  }

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";

    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
