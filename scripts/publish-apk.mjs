import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const rootDir = process.cwd();
const packageJsonPath = join(rootDir, 'package.json');
const sourceApkPath = join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const downloadsDir = join(rootDir, 'asset', 'downloads');
const apkFileName = 'finanzas-mobile-debug.apk';
const targetApkPath = join(downloadsDir, apkFileName);
const latestMetadataPath = join(downloadsDir, 'latest.json');

async function publishApk() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const version = packageJson.version || '1.0.0';

  await mkdir(downloadsDir, { recursive: true });
  await copyFile(sourceApkPath, targetApkPath);

  const metadata = {
    version,
    apk: apkFileName,
    updatedAt: new Date().toISOString()
  };

  await writeFile(latestMetadataPath, JSON.stringify(metadata, null, 2));
  console.log(`APK published to asset/downloads/${apkFileName} (v${version})`);
}

publishApk().catch((error) => {
  console.error('Error publishing APK:', error);
  process.exitCode = 1;
});
