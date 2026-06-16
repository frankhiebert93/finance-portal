/** @type {import('next').NextConfig} */
const securityHeaders = [
    // Disallow framing to prevent clickjacking of the finance dashboard.
    { key: 'X-Frame-Options', value: 'DENY' },
    // Don't let browsers MIME-sniff responses.
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Don't leak full URLs (which may carry the ?month= filter) to other origins.
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Lock down powerful browser features this app does not use.
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    // Force HTTPS once served over TLS.
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    // Conservative CSP. 'unsafe-inline'/'unsafe-eval' are required by Next.js dev
    // and inline styles; tighten with nonces if you later need stricter rules.
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self' https://*.supabase.co",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    },
]

const nextConfig = {
    // Pin the workspace root to this app dir (there are sibling lockfiles in the repo).
    turbopack: { root: import.meta.dirname },
    async headers() {
        return [{ source: '/:path*', headers: securityHeaders }]
    },
}

export default nextConfig
