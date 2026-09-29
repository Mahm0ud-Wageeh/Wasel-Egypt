import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const isWin = process.platform === 'win32';

let phpBin = 'php';
if (isWin && existsSync('C:\\xampp\\php\\php.exe')) {
  phpBin = 'C:\\xampp\\php\\php.exe';
}

console.log('==================================================');
console.log('   Starting Wasel Egypt (Backend + Frontend)...   ');
console.log('==================================================');

const backend = spawn(phpBin, ['artisan', 'serve', '--port=8000'], {
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn('npm', ['--prefix', 'frontend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

console.log('\n   Frontend : http://localhost:3000');
console.log('   Backend  : http://127.0.0.1:8000\n');

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);

function cleanup() {
  console.log('\nStopping servers...');
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
