'use server'

import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, timingSafeEqual } from '@/lib/session'

// Simple in-memory brute-force throttle. For a single-user personal app this is
// sufficient; on a multi-instance/serverless deployment each instance throttles
// independently (move to a shared store like Supabase/Redis if that matters).
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes
let failedAttempts = 0
let lockedUntil = 0

export async function unlockApp(pin: string): Promise<{ success: boolean; error?: string }> {
    const now = Date.now()

    if (now < lockedUntil) {
        const minutes = Math.ceil((lockedUntil - now) / 60000)
        return { success: false, error: `Too many attempts. Try again in ${minutes} min.` }
    }

    const validPin = process.env.APP_PIN
    if (!validPin) {
        // Fail closed rather than falling back to a guessable default like "1234".
        return { success: false, error: 'App PIN is not configured on the server.' }
    }

    const candidate = String(pin ?? '')
    const ok = timingSafeEqual(candidate, validPin)

    if (!ok) {
        failedAttempts += 1
        if (failedAttempts >= MAX_ATTEMPTS) {
            lockedUntil = now + LOCKOUT_MS
            failedAttempts = 0
        }
        return { success: false, error: 'Incorrect PIN' }
    }

    failedAttempts = 0
    lockedUntil = 0

    const token = await createSessionToken()
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
    })
    return { success: true }
}

export async function lockApp(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
}
