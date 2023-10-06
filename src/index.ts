import {
  createGetIronSession,
  createGetServerActionIronSession,
  createSealData,
  createUnsealData,
} from "./core.js";

export * from "./core.js";
export const sealData = createSealData();
export const unsealData = createUnsealData();
export const getIronSession = createGetIronSession(sealData, unsealData);
export const getServerActionIronSession = createGetServerActionIronSession(
  sealData,
  unsealData,
);
