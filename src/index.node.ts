import crypto from "crypto";
import {
  createGetIronSession,
  createGetServerActionIronSession,
  createSealData,
  createUnsealData,
} from "./core.js";

export * from "./core.js";
// We still need this (src/index.node.ts) extra file and `node` export in package.json because
// globalThis.crypto (= Web Crypto, = crypto.webcrypto), which we use in core.ts
// is only available starting with Node.js 19
export const sealData = createSealData(crypto.webcrypto as Crypto);
export const unsealData = createUnsealData(crypto.webcrypto as Crypto);
export const getIronSession = createGetIronSession(sealData, unsealData);
export const getServerActionIronSession = createGetServerActionIronSession(
  sealData,
  unsealData,
);
