import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check if they have our custom 4-digit PIN unlock cookie
    const authCookie = request.cookies.get('app-vault-lock')
    const isAuthPage = request.nextUrl.pathname === '/'

    // If trying to access the dashboard without the cookie, kick them to login
    if (!authCookie?.value && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // If they are already unlocked and go to the login page, send them to the dashboard
    if (authCookie?.value === 'unlocked' && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard/personal', request.url))
    }

    return NextResponse.next()
}

export const config = {
    // Only run this check on the homepage and dashboard routes
    matcher: ['/', '/dashboard/:path*'],
}