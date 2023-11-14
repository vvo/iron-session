import {
  createGetIronSession,
  createGetServerActionIronSession,
  createSealData,
  createUnsealData,
} from "./core.js";

import * as crypto from "uncrypto";

export * from "./core.js";
export const sealData = createSealData(crypto);
export const unsealData = createUnsealData(crypto);
export const getIronSession = createGetIronSession(sealData, unsealData);
export const getServerActionIronSession = createGetServerActionIronSession(
  sealData,
  unsealData,
);
