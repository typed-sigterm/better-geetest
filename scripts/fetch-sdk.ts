import { Buffer } from 'node:buffer';
import { hash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('..', import.meta.url));

async function download(url: string, dest: string) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await mkdir(dirname(join(__dirname, dest)), { recursive: true });
  await writeFile(join(__dirname, dest), buf);

  console.log(`${dest} ← ${url}`);
  console.log(`  Size: ${buf.length} bytes`);
  console.log(`  SHA256: ${hash('sha256', buf)}\n`);
}

download('https://static.geetest.com/v4/gt4.js', 'packages/gt4-client/original-sdk/gt4.js');
download('https://static.geetest.com/v4/bypass.js', 'packages/gt4-client/original-sdk/bypass.js');
