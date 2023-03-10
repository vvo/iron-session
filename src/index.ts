import { createGetIronSession, createSealData, createUnsealData } from './core.js'

export type { IronSession, IronSessionOptions } from './core.js'
export const sealData = createSealData()
export const unsealData = createUnsealData()
export const getIronSession = createGetIronSession(sealData, unsealData)
