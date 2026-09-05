// Supabase connection.
// The anon/publishable key is PUBLIC by design — data is protected by
// Row Level Security, not by hiding this key. Env vars override the
// baked-in defaults, so you can move these to Vercel env settings later.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fljkudrjvvkukngnsrwy.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsamt1ZHJqdnZrdWtuZ25zcnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODE2OTcsImV4cCI6MjEwNDE1NzY5N30.NICvAkmmUC5PmG1T15W-q_BkS-qkBnrH5Vo-NZAmD7I";
