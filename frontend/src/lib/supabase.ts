import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// SECURITY MODEL
// --------------
// This app has no Supabase Auth users — the PIN (see proxy.ts / actions/auth.ts)
// is the only authentication, enforced server-side. So we connect with the
// service-role key and rely on Row Level Security being ENABLED with no policies
// for the anon/authenticated roles (see ../../../supabase/migrations). That means:
//
//   * The database denies all access to the public anon key.
//   * Legitimate access happens only here, in server code, behind the PIN gate.
//   * The service-role key bypasses RLS but is never sent to the browser.
//
// The `server-only` import above makes the build fail if this module is ever
// imported into a Client Component, guaranteeing the key cannot leak to the client.
export function createClient() {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variable.')
    }

    return createSupabaseClient(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
