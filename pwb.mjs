import fs from 'fs';
fs.writeFileSync('src/lib/supabase/browser.ts',
"import { createBrowserClient } from '@supabase/ssr';\n\nlet _client = null;\n\nexport function createSupabaseBrowser() {\n  if (_client) return _client;\n  _client = createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,\n  );\n  return _client;\n}\n",
'utf8');
console.log('browser.ts ok');
