import crypto from 'crypto'
import { createGetIronSession, createSealData, createUnsealData } from './core.js'

export const sealData = createSealData(crypto.webcrypto as Crypto)
export const unsealData = createUnsealData(crypto.webcrypto as Crypto)
export const getIronSession = createGetIronSession(sealData, unsealData)
