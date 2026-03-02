import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const rootDir = process.cwd();
const webDir = join(rootDir, 'www');
const entriesToCopy = ['index.html', 'css', 'js', 'asset'];

async function buildWebDir() {
  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });

  for (const entry of entriesToCopy) {
    await cp(join(rootDir, entry), join(webDir, entry), { recursive: true });
  }
}

buildWebDir()
  .then(() => {
    console.log('Web assets copied to ./www');
  })
  .catch((error) => {
    console.error('Error building ./www:', error);
    process.exitCode = 1;
  });
