import crypto from 'crypto'
import {
  createGetIronSession,
  createGetServerActionIronSession,
  createSealData,
  createUnsealData,
} from './core.js'

export * from './core.js'
export const sealData = createSealData(crypto.webcrypto as Crypto)
export const unsealData = createUnsealData(crypto.webcrypto as Crypto)
export const getIronSession = createGetIronSession(sealData, unsealData)
export const getServerActionIronSession = createGetServerActionIronSession(sealData, unsealData)
