'use server'

import { cookies } from 'next/headers'

export async function unlockApp(pin: string) {
    // This looks for your secret PIN in Vercel. If testing locally, it defaults to 1234
    const validPin = process.env.APP_PIN || '1234'

    if (pin === validPin) {
        const cookieStore = await cookies()
        cookieStore.set('app-vault-lock', 'unlocked', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            // Cookie expires in 1 hour, forcing a re-login/Face ID scan if you leave the app
            maxAge: 60 * 60
        })
        return { success: true }
    }
    return { success: false }
}