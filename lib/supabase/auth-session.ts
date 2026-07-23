type ClaimsClient = {
  auth: {
    getClaims(jwt?: string): PromiseLike<{
      data: { claims?: { sub?: unknown } } | null;
      error: unknown;
    }>;
  };
};

export type VerifiedSession = {
  hasInvalidRefreshToken: boolean;
  userId: string | null;
};

export type StoredAuthSession = {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
};

const INVALID_REFRESH_TOKEN_CODES = new Set([
  "refresh_token_already_used",
  "refresh_token_not_found",
  "refresh_token_reuse_detected"
]);

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    INVALID_REFRESH_TOKEN_CODES.has(code) ||
    /invalid refresh token|refresh token (?:is )?not valid|refresh token not found|refresh token.*already used/i.test(message)
  );
}

export function isSupabaseAuthCookie(name: string) {
  return /^sb-.+-auth-token(?:\.\d+)?$/.test(name);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function readStoredAuthSession(cookies: Array<{ name: string; value: string }>): StoredAuthSession | null {
  const sessionCookies = cookies.filter((cookie) => isSupabaseAuthCookie(cookie.name));
  if (sessionCookies.length === 0) return null;

  const baseName = sessionCookies[0]?.name.replace(/\.\d+$/, "");
  if (!baseName) return null;

  const exactCookie = sessionCookies.find((cookie) => cookie.name === baseName);
  const encoded = exactCookie?.value ?? sessionCookies
    .filter((cookie) => cookie.name.startsWith(`${baseName}.`))
    .sort((left, right) => {
      const leftIndex = Number(left.name.slice(baseName.length + 1));
      const rightIndex = Number(right.name.slice(baseName.length + 1));
      return leftIndex - rightIndex;
    })
    .map((cookie) => cookie.value)
    .join("");
  if (!encoded) return null;

  try {
    const decoded = encoded.startsWith("base64-")
      ? decodeBase64Url(encoded.slice("base64-".length))
      : encoded;
    const session = JSON.parse(decoded) as Record<string, unknown>;
    const accessToken = session.access_token;
    const refreshToken = session.refresh_token;
    const expiresAt = session.expires_at;

    if (
      typeof accessToken !== "string" ||
      typeof refreshToken !== "string" ||
      typeof expiresAt !== "number"
    ) {
      return null;
    }

    return { accessToken, refreshToken, expiresAt };
  } catch {
    return null;
  }
}

export async function getVerifiedSession(client: ClaimsClient, accessToken?: string): Promise<VerifiedSession> {
  try {
    const { data, error } = await client.auth.getClaims(accessToken);
    if (error) {
      return {
        hasInvalidRefreshToken: isInvalidRefreshTokenError(error),
        userId: null
      };
    }

    const subject = data?.claims?.sub;
    return {
      hasInvalidRefreshToken: false,
      userId: typeof subject === "string" && subject.length > 0 ? subject : null
    };
  } catch (error) {
    return {
      hasInvalidRefreshToken: isInvalidRefreshTokenError(error),
      userId: null
    };
  }
}
