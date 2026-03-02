import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const rootDir = process.cwd();
const sourceDir = join(rootDir, 'asset', 'media', 'favicon');
const androidResDir = join(rootDir, 'android', 'app', 'src', 'main', 'res');

const densityMap = [
  { source: 'android-icon-48x48.png', target: 'mipmap-mdpi' },
  { source: 'android-icon-72x72.png', target: 'mipmap-hdpi' },
  { source: 'android-icon-96x96.png', target: 'mipmap-xhdpi' },
  { source: 'android-icon-144x144.png', target: 'mipmap-xxhdpi' },
  { source: 'android-icon-192x192.png', target: 'mipmap-xxxhdpi' }
];

async function syncIcons() {
  for (const { source, target } of densityMap) {
    const sourcePath = join(sourceDir, source);
    await copyFile(sourcePath, join(androidResDir, target, 'ic_launcher.png'));
    await copyFile(sourcePath, join(androidResDir, target, 'ic_launcher_round.png'));
    await copyFile(sourcePath, join(androidResDir, target, 'ic_launcher_foreground.png'));
  }

  console.log('Android icons synced from favicon assets.');
}

syncIcons().catch((error) => {
  console.error('Error syncing Android icons:', error);
  process.exitCode = 1;
});
