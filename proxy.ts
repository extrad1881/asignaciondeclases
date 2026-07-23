import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session } from "@supabase/supabase-js";
import {
  getVerifiedSession,
  isInvalidRefreshTokenError,
  isSupabaseAuthCookie,
  readStoredAuthSession
} from "@/lib/supabase/auth-session";

const REFRESH_MARGIN_SECONDS = 60;

function redirectWithCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

function clearInvalidAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter((cookie) => isSupabaseAuthCookie(cookie.name))
    .forEach((cookie) => {
      request.cookies.delete(cookie.name);
      response.cookies.set({
        name: cookie.name,
        value: "",
        expires: new Date(0),
        maxAge: 0,
        path: "/"
      });
    });
}

function createStatelessAuthClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        skipAutoInitialize: true
      }
    }
  );
}

async function persistRefreshedSession(
  request: NextRequest,
  response: NextResponse,
  session: Session
) {
  // El cliente SSR no debe alcanzar a leer el token revocado mientras se
  // reemplaza. Primero se elimina la sesión anterior y luego se escribe la nueva.
  clearInvalidAuthCookies(request, response);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });
  if (error) throw error;
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const storedSession = readStoredAuthSession(request.cookies.getAll());
  const hasStoredAuthCookie = request.cookies
    .getAll()
    .some((cookie) => isSupabaseAuthCookie(cookie.name));
  let verifiedSession = { hasInvalidRefreshToken: false, userId: null as string | null };

  if (hasStoredAuthCookie && !storedSession) {
    clearInvalidAuthCookies(request, response);
  }

  if (storedSession) {
    const authClient = createStatelessAuthClient();
    const needsRefresh =
      storedSession.expiresAt <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS;

    try {
      if (needsRefresh) {
        const { data, error } = await authClient.auth.refreshSession({
          refresh_token: storedSession.refreshToken
        });

        if (error) {
          verifiedSession = {
            hasInvalidRefreshToken: isInvalidRefreshTokenError(error),
            userId: null
          };
        } else if (data.session) {
          verifiedSession = await getVerifiedSession(authClient, data.session.access_token);
          if (verifiedSession.userId) {
            await persistRefreshedSession(request, response, data.session);
          }
        }
      } else {
        verifiedSession = await getVerifiedSession(authClient, storedSession.accessToken);
      }
    } catch (error) {
      verifiedSession = {
        hasInvalidRefreshToken: isInvalidRefreshTokenError(error),
        userId: null
      };
    }
  }

  const { userId, hasInvalidRefreshToken } = verifiedSession;
  if (hasInvalidRefreshToken) clearInvalidAuthCookies(request, response);

  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const protectedPaths = [
    "/admin",
    "/aulas",
    "/carreras",
    "/coordinador",
    "/coordinadores",
    "/ciclos",
    "/cohortes",
    "/dashboard",
    "/datos-incompletos",
    "/docentes",
    "/grupos",
    "/horarios",
    "/materias",
    "/reportes"
  ];
  const isProtected = protectedPaths.some((pathname) => request.nextUrl.pathname.startsWith(pathname));

  if (!userId && isProtected) {
    return redirectWithCookies(request, response, "/login");
  }

  if (userId && isLogin) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/aulas/:path*",
    "/api/reportes/:path*",
    "/carreras/:path*",
    "/coordinador/:path*",
    "/coordinadores/:path*",
    "/ciclos/:path*",
    "/cohortes/:path*",
    "/dashboard/:path*",
    "/datos-incompletos/:path*",
    "/docentes/:path*",
    "/grupos/:path*",
    "/horarios/:path*",
    "/materias/:path*",
    "/reportes/:path*"
  ]
};
