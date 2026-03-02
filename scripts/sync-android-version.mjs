import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const rootDir = process.cwd();
const packageJsonPath = join(rootDir, 'package.json');
const androidGradlePath = join(rootDir, 'android', 'app', 'build.gradle');

function toVersionCode(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map((part) => Number(part));
  return major * 10000 + minor * 100 + patch;
}

async function syncVersion() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const version = packageJson.version || '1.0.0';
  const versionCode = toVersionCode(version);

  let gradleContent = await readFile(androidGradlePath, 'utf8');
  gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  await writeFile(androidGradlePath, gradleContent);

  console.log(`Android version synced: versionName=${version}, versionCode=${versionCode}`);
}

syncVersion().catch((error) => {
  console.error('Error syncing Android version:', error);
  process.exitCode = 1;
});
