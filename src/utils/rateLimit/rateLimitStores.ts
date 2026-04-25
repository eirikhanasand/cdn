import type { CounterWindow } from './types.ts'

export const requestCounters = new Map<string, CounterWindow>()
export const missCounters = new Map<string, CounterWindow>()
