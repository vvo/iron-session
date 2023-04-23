import { createGetIronSession, createSealData, createUnsealData } from './core.js'

export * from './core.js'
export const sealData = createSealData()
export const unsealData = createUnsealData()
export const getIronSession = createGetIronSession(sealData, unsealData)
