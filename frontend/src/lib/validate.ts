// Lightweight server-side validation. Server Actions are public HTTP endpoints,
// so every value coming from a client must be checked before it touches the DB.

export class ValidationError extends Error {}

// Parse a money/number field. Strips thousands separators, rejects NaN/Infinity,
// and clamps to a sane range so a client can't store garbage or absurd values.
export function parseAmount(
    value: unknown,
    { min = -1_000_000_000, max = 1_000_000_000, field = 'amount' } = {}
): number {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim())
    if (!Number.isFinite(n)) throw new ValidationError(`Invalid ${field}.`)
    if (n < min || n > max) throw new ValidationError(`${field} is out of range.`)
    return n
}

// Trim and length-check a free-text field.
export function parseString(
    value: unknown,
    { maxLength = 200, required = false, field = 'value' } = {}
): string {
    const s = String(value ?? '').trim()
    if (required && s.length === 0) throw new ValidationError(`${field} is required.`)
    if (s.length > maxLength) throw new ValidationError(`${field} is too long.`)
    return s
}

// Ensure a value is one of an allowed set.
export function parseEnum<T extends string>(value: unknown, allowed: readonly T[], field = 'value'): T {
    const s = String(value ?? '')
    if (!allowed.includes(s as T)) throw new ValidationError(`Invalid ${field}.`)
    return s as T
}

// UUIDs are what Supabase uses for ids; reject anything that isn't one.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function parseId(value: unknown, field = 'id'): string {
    const s = String(value ?? '').trim()
    if (!UUID_RE.test(s)) throw new ValidationError(`Invalid ${field}.`)
    return s
}
