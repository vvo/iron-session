/**
 * Where the example passwords come from.
 *
 * Every example used to hardcode the same literal
 * `"complex_password_at_least_32_characters_long"`, which meant the demo taught
 * people to ship a publicly known key, and a seal made for one example was a
 * valid cookie for all the others.
 *
 * A cookie is only as private as this value, so read it from the environment.
 * See `.env.example` for local development.
 */
function required(name: string): string {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `Missing or too short ${name}. Copy .env.example to .env.local, or generate one with \`openssl rand -base64 32\`.`,
    );
  }

  return value;
}

/** Encrypts the session cookies. */
export const sessionPassword = (): string => required("SESSION_PASSWORD");

/**
 * Encrypts magic-link tokens, and is deliberately not the session password.
 *
 * The magic-links example used one password for both, so a link token unsealed
 * as a session and a session unsealed as a link token. A leaked link in an email
 * or a referrer header was then a full session.
 */
export const magicLinkPassword = (): string => required("MAGIC_LINK_PASSWORD");
