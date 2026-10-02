import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('[Prepare-Server] Verifying server dependencies...');

  const searchLocations = [
    path.join(rootDir, 'node_modules', '@agegr', 'pi-web'),
    '/home/juzipi/.local/lib/node_modules/@agegr/pi-web',
  ];

  let piWebDir = null;
  for (const loc of searchLocations) {
    if (fs.existsSync(loc) && fs.existsSync(path.join(loc, '.next'))) {
      piWebDir = loc;
      break;
    }
  }

  if (!piWebDir) {
    console.warn('[Prepare-Server] @agegr/pi-web not found in node_modules yet.');
    console.warn('Run "npm install" to install @agegr/pi-web.');
    return;
  }

  console.log(`[Prepare-Server] Found Pi Web build at: ${piWebDir}`);
  const nextDir = path.join(piWebDir, '.next');
  if (fs.existsSync(nextDir)) {
    console.log('[Prepare-Server] Next.js build artifacts verified.');
  } else {
    console.error('[Prepare-Server] Missing .next build artifacts! Server might not start properly.');
  }
}

main().catch(err => {
  console.error('[Prepare-Server] Error:', err);
  process.exit(1);
});
