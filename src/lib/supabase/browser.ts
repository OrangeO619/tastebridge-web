import { createBrowserClient } from '@supabase/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

export function createSupabaseBrowser() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}
