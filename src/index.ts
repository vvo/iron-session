import {
  createGetIronSession,
  createSealData,
  createUnsealData,
} from "./core.js";

import * as crypto from "uncrypto";

export type { IronSession, SessionOptions } from "./core.js";
export const sealData = createSealData(crypto);
export const unsealData = createUnsealData(crypto);
export const getIronSession = createGetIronSession(sealData, unsealData);
