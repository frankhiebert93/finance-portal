// Signed, expiring session tokens backed by HMAC-SHA256.
//
// The token format is `${expiresAt}.${base64url(hmac)}`. Because the signature
// requires APP_SESSION_SECRET, a client cannot forge or tamper with it — unlike
// the previous static "unlocked" cookie value, which anyone could send verbatim.
//
// Uses the Web Crypto API so the same code runs in both the Edge middleware and
// Node server actions.

export const SESSION_COOKIE = 'app-vault-lock'

// How long an unlock lasts before the PIN is required again.
export const SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

function getSecret(): string {
    const secret = process.env.APP_SESSION_SECRET
    if (!secret || secret.length < 16) {
        // Fail closed: without a strong secret we cannot issue trustworthy tokens.
        throw new Error(
            'APP_SESSION_SECRET is missing or too short. Set a random 32+ char value in your environment.'
        )
    }
    return secret
}

function toBase64Url(bytes: ArrayBuffer): string {
    const view = new Uint8Array(bytes)
    let binary = ''
    for (let i = 0; i < view.length; i++) {
        binary += String.fromCharCode(view[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(payload: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(getSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    return toBase64Url(signature)
}

// Constant-time string comparison to avoid leaking match progress via timing.
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let mismatch = 0
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return mismatch === 0
}

export async function createSessionToken(): Promise<string> {
    const expiresAt = Date.now() + SESSION_TTL_MS
    const payload = String(expiresAt)
    const signature = await sign(payload)
    return `${payload}.${signature}`
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
    if (!token) return false
    const dot = token.indexOf('.')
    if (dot <= 0) return false

    const payload = token.slice(0, dot)
    const signature = token.slice(dot + 1)

    const expiresAt = Number(payload)
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false

    let expected: string
    try {
        expected = await sign(payload)
    } catch {
        return false
    }
    return timingSafeEqual(signature, expected)
}

export { timingSafeEqual }
