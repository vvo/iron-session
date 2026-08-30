/** @type {import('next').NextConfig} */
export default {
  // The fixture is served over plain http in CI, and our cookies default to
  // `secure: true`, which a browser will not store over http. The session
  // options set `secure` from this instead of us weakening the library default.
  env: { E2E: "1" },
  // Partial Prerendering. Every page here reads a session, so this is what
  // proves iron-session behaves when the session is a dynamic hole in an
  // otherwise prerendered page, which is the Next 16 default shape.
  cacheComponents: true,
};
