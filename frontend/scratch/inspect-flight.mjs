import fs from 'node:fs';

const html = fs.readFileSync('../public/index.html', 'utf8');
const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
let match;
while ((match = regex.exec(html)) !== null) {
  try {
    const unescaped = JSON.parse('"' + match[1] + '"');
    console.log('--- FLIGHT PAYLOAD ---');
    console.log(unescaped);
  } catch (e) {
    console.error('Failed to parse:', e.message);
  }
}
