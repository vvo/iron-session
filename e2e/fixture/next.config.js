/** @type {import('next').NextConfig} */
export default {
  // The fixture is served over plain http in CI, and our cookies default to
  // `secure: true`, which a browser will not store over http. The session
  // options set `secure` from this instead of us weakening the library default.
  env: { E2E: "1" },
};
