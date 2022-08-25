import { createGetIronSession, createSealData, createUnsealData } from "./core";
import { Crypto } from "@peculiar/webcrypto";

const _crypto = new Crypto();

export * from "./core";
export const unsealData = createUnsealData(_crypto);
export const sealData = createSealData(_crypto);
export const getIronSession = createGetIronSession(
  _crypto,
  unsealData,
  sealData,
);
