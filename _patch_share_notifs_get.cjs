const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/api/maps/share-notifs/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the .is("read_at", null) filter from GET
content = content.replace(
  '    .eq("shared_with", userId)\n    .is("read_at", null)\n    .order("created_at", { ascending: false })',
  '    .eq("shared_with", userId)\n    .order("created_at", { ascending: false })'
);

// Add read_at: null to fallback items
content = content.replace(
  '      created_at: x.created_at,\n    }));\n    return NextResponse.json({ items });',
  '      created_at: x.created_at,\n      read_at: null,\n    }));\n    return NextResponse.json({ items });'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ share-notifs GET patched to return all notifications');
