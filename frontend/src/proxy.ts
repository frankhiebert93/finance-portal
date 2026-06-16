import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

export async function proxy(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const isUnlocked = await verifySessionToken(token)
    const isAuthPage = request.nextUrl.pathname === '/'

    // Block the dashboard unless a valid, unexpired, signed session is present.
    if (!isUnlocked && request.nextUrl.pathname.startsWith('/dashboard')) {
        const response = NextResponse.redirect(new URL('/', request.url))
        // Clear any stale/forged cookie so it stops being re-sent.
        if (token) response.cookies.delete(SESSION_COOKIE)
        return response
    }

    // If already unlocked, skip the lock screen.
    if (isUnlocked && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard/personal', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', '/dashboard/:path*'],
}
