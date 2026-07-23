import { describe, expect, it } from "vitest";
import {
  getVerifiedSession,
  isInvalidRefreshTokenError,
  isSupabaseAuthCookie,
  readStoredAuthSession
} from "../lib/supabase/auth-session";

describe("sesión autenticada", () => {
  it("obtiene el usuario desde claims verificadas", async () => {
    const session = await getVerifiedSession({
      auth: {
        async getClaims() {
          return { data: { claims: { sub: "usuario-1" } }, error: null };
        }
      }
    });

    expect(session).toEqual({ hasInvalidRefreshToken: false, userId: "usuario-1" });
  });

  it("identifica un refresh token inexistente sin propagar la excepción", async () => {
    const session = await getVerifiedSession({
      auth: {
        async getClaims() {
          throw Object.assign(new Error("Invalid Refresh Token: Refresh Token Not Found"), {
            code: "refresh_token_not_found",
            status: 400
          });
        }
      }
    });

    expect(session).toEqual({ hasInvalidRefreshToken: true, userId: null });
  });

  it("no confunde un error transitorio con una sesión revocada", () => {
    expect(isInvalidRefreshTokenError({ code: "request_timeout", message: "Tiempo agotado" })).toBe(false);
  });

  it("lee una sesión SSR fragmentada sin exponer sus tokens", () => {
    const stored = {
      access_token: "acceso",
      refresh_token: "renovación",
      expires_at: 1234
    };
    const encoded = `base64-${Buffer.from(JSON.stringify(stored)).toString("base64url")}`;
    const midpoint = Math.ceil(encoded.length / 2);

    expect(
      readStoredAuthSession([
        { name: "sb-proyecto-auth-token.1", value: encoded.slice(midpoint) },
        { name: "sb-proyecto-auth-token.0", value: encoded.slice(0, midpoint) }
      ])
    ).toEqual({ accessToken: "acceso", refreshToken: "renovación", expiresAt: 1234 });
  });

  it("reconoce cookies de autenticación completas y fragmentadas", () => {
    expect(isSupabaseAuthCookie("sb-proyecto-auth-token")).toBe(true);
    expect(isSupabaseAuthCookie("sb-proyecto-auth-token.1")).toBe(true);
    expect(isSupabaseAuthCookie("sb-proyecto-auth-token-code-verifier")).toBe(false);
    expect(isSupabaseAuthCookie("preferencias")).toBe(false);
  });
});
