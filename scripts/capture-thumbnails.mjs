#!/usr/bin/env node
// Renders a WebP thumbnail per catalogue product and per base van into public/thumbnails/.
//
//   node scripts/capture-thumbnails.mjs [--url http://localhost:5173] [--only id1,id2] [--size 384]
//
// Without --url it starts its own Vite dev server on port 5190. Chromium runs headless
// (/snap/bin/chromium or $CHROMIUM) with SwiftShader WebGL and is driven over the DevTools protocol.
// Each page `/?thumbnail=<id>` (src/components/layout/thumbnail/ThumbnailStage.tsx) draws a single
// prop on a transparent background and sets window.__thumbnailReady when the camera has settled.
// Output: <catalogId>.webp, van-<vanId>.webp and manifest.json (ids the UI may request).
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'thumbnails');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, index, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[index + 1]]] : pairs), []),
);
const SIZE = Number(args.size ?? 384);
const CDP_PORT = Number(args['cdp-port'] ?? 9361);
const VITE_PORT = 5190;
const CHROMIUM = process.env.CHROMIUM ?? '/snap/bin/chromium';
const READY_TIMEOUT_MS = 90_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await check()) return;
    } catch {
      // not ready yet
    }
    await sleep(300);
  }
  throw new Error(`Timeout: ${label}`);
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, fail) => {
    ws.onopen = ok;
    ws.onerror = fail;
  });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const waiter = msg.id && pending.get(msg.id);
    if (!waiter) return;
    pending.delete(msg.id);
    msg.error ? waiter.reject(new Error(msg.error.message)) : waiter.resolve(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolveSend, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve: resolveSend, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value;
  return { ws, send, evaluate };
}

async function main() {
  const children = [];
  const cleanup = () => children.forEach((child) => child.kill('SIGTERM'));
  process.on('exit', cleanup);
  process.on('SIGINT', () => process.exit(130));

  let baseUrl = args.url;
  if (!baseUrl) {
    baseUrl = `http://localhost:${VITE_PORT}`;
    const vite = spawn('npx', ['vite', '--port', String(VITE_PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
    children.push(vite);
    await waitFor(async () => (await fetch(baseUrl)).ok, 60_000, 'servidor Vite');
  }

  const profile = mkdtempSync(join(tmpdir(), 'camper-thumbs-'));
  const chromium = spawn(
    CHROMIUM,
    ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: 'ignore' },
  );
  children.push(chromium);
  await waitFor(async () => (await fetch(`http://localhost:${CDP_PORT}/json/version`)).ok, 30_000, 'Chromium');

  const target = await (await fetch(`http://localhost:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const page = await connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  // Products are square; vans are 16:10 (vehicle cards of the new-project dialog)
  const setViewport = (isVan) =>
    page.send('Emulation.setDeviceMetricsOverride', { width: isVan ? Math.round(SIZE * 1.6) : SIZE, height: SIZE, deviceScaleFactor: 1, mobile: false });
  await setViewport(false);
  // Transparent page background so the WebP keeps its alpha channel
  await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });

  const open = async (subject) => {
    await page.send('Page.navigate', { url: `${baseUrl}/?thumbnail=${encodeURIComponent(subject)}` });
    await sleep(300);
  };

  await open('__list');
  await waitFor(async () => Array.isArray(await page.evaluate('window.__thumbnailIds')), 60_000, 'lista de ids');
  let subjects = await page.evaluate('window.__thumbnailIds');
  if (args.only) subjects = subjects.filter((id) => args.only.split(',').includes(id));

  mkdirSync(OUT_DIR, { recursive: true });
  const written = [];
  for (const subject of subjects) {
    const fileId = subject.startsWith('van:') ? `van-${subject.slice(4)}` : subject;
    try {
      await setViewport(subject.startsWith('van:'));
      await open(subject);
      await waitFor(async () => (await page.evaluate('window.__thumbnailReady')) === true, READY_TIMEOUT_MS, subject);
      await sleep(250);
      const { data } = await page.send('Page.captureScreenshot', { format: 'webp', quality: 86 });
      writeFileSync(join(OUT_DIR, `${fileId}.webp`), Buffer.from(data, 'base64'));
      written.push(fileId);
      console.log(`ok   ${fileId}`);
    } catch (error) {
      console.error(`FAIL ${fileId}: ${error.message}`);
    }
  }

  // The manifest lists every image present after this run (partial runs keep earlier ids)
  const manifestPath = join(OUT_DIR, 'manifest.json');
  let previous = [];
  try {
    previous = JSON.parse((await import('node:fs')).readFileSync(manifestPath, 'utf8')).ids ?? [];
  } catch {
    // first run
  }
  const ids = [...new Set([...(args.only ? previous : []), ...written])].sort();
  writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), size: SIZE, ids }, null, 2)}\n`);
  console.log(`${written.length}/${subjects.length} miniaturas en public/thumbnails`);

  page.ws.close();
  cleanup();
  rmSync(profile, { recursive: true, force: true });
  process.exit(written.length === subjects.length ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
