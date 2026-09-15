import {readStorage, removeStorage, writeStorage} from './storage';

const INDEX_KEY = 'svg-cache-index-v1';
const ENTRY_PREFIX = 'svg-cache-v1:';
const MAX_DISK_ENTRY = 400_000;
const MAX_DISK_TOTAL = 6_000_000;
const MAX_DISK_ITEMS = 40;

const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

type IndexItem = {key: string; bytes: number};

function hashUri(uri: string): string {
  let hash = 0;
  for (let i = 0; i < uri.length; i += 1) {
    hash = (Math.imul(31, hash) + uri.charCodeAt(i)) | 0;
  }
  return `${ENTRY_PREFIX}${(hash >>> 0).toString(16)}:${uri.length}`;
}

function decodeBase64(value: string): string {
  const atobFn = (globalThis as {atob?: (data: string) => string}).atob;
  if (typeof atobFn === 'function') {
    return atobFn(value);
  }
  throw new Error('base64');
}

export function peekSvgMarkup(uri: string): string | null {
  return memory.get(uri) ?? null;
}

export function getSvgMarkup(uri: string): Promise<string> {
  const cached = memory.get(uri);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = inflight.get(uri);
  if (pending) {
    return pending;
  }
  const promise = loadSvgMarkup(uri).finally(() => {
    inflight.delete(uri);
  });
  inflight.set(uri, promise);
  return promise;
}

async function loadSvgMarkup(uri: string): Promise<string> {
  const fromData = svgFromDataUri(uri);
  if (fromData) {
    memory.set(uri, fromData);
    return fromData;
  }

  const diskKey = hashUri(uri);
  const fromDisk = await readStorage(diskKey);
  if (fromDisk) {
    try {
      const parsed = JSON.parse(fromDisk) as {uri?: string; svg?: string};
      if (parsed?.uri === uri && parsed.svg) {
        memory.set(uri, parsed.svg);
        void touchIndex(diskKey, parsed.svg.length);
        return parsed.svg;
      }
    } catch {
      // ignore corrupt cache
    }
  }

  const svg = await fetchSvgMarkup(uri);
  memory.set(uri, svg);
  void persistSvg(diskKey, uri, svg);
  return svg;
}

function svgFromDataUri(uri: string): string | null {
  const match = uri.match(
    /^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/i,
  );
  if (!match) {
    return null;
  }
  const payload = match[2] || '';
  try {
    const decoded = match[1]
      ? decodeBase64(payload)
      : decodeURIComponent(payload);
    return decoded.includes('<svg') ? decoded : null;
  } catch {
    return null;
  }
}

async function fetchSvgMarkup(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`svg fetch ${response.status}`);
  }
  const text = await response.text();
  if (!/<svg\b/i.test(text)) {
    throw new Error('not svg');
  }
  return text;
}

async function persistSvg(
  diskKey: string,
  uri: string,
  svg: string,
): Promise<void> {
  if (svg.length > MAX_DISK_ENTRY) {
    return;
  }
  try {
    const index = await readIndex();
    const next = index.filter(item => item.key !== diskKey);
    next.push({key: diskKey, bytes: svg.length});
    let total = next.reduce((sum, item) => sum + item.bytes, 0);
    while (
      next.length > MAX_DISK_ITEMS ||
      total > MAX_DISK_TOTAL
    ) {
      const evicted = next.shift();
      if (!evicted) {
        break;
      }
      total -= evicted.bytes;
      await removeStorage(evicted.key);
    }
    await writeStorage(diskKey, JSON.stringify({uri, svg}));
    await writeStorage(INDEX_KEY, JSON.stringify(next));
  } catch {
    // cache is optional
  }
}

async function touchIndex(diskKey: string, bytes: number): Promise<void> {
  try {
    const index = await readIndex();
    const next = index.filter(item => item.key !== diskKey);
    next.push({key: diskKey, bytes});
    await writeStorage(INDEX_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

async function readIndex(): Promise<IndexItem[]> {
  const raw = await readStorage(INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as IndexItem[];
    return Array.isArray(parsed) ? parsed.filter(item => item?.key) : [];
  } catch {
    return [];
  }
}

export function prepareSvgMarkup(
  raw: string,
  objectFit: 'contain' | 'cover',
): string {
  const match = raw.match(/<svg\b[\s\S]*<\/svg>/i);
  if (!match) {
    return '';
  }
  let svg = match[0].replace(/<script\b[\s\S]*?<\/script>/gi, '');
  if (!/viewBox\s*=/i.test(svg)) {
    const width = svg.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1];
    const height = svg.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1];
    if (width && height) {
      svg = svg.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`);
    }
  }
  const aspect = objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
  svg = svg.replace(/<svg\b([^>]*)>/i, (_all, attrs: string) => {
    let next = String(attrs || '').replace(
      /\s(?:width|height|preserveAspectRatio)\s*=\s*(["']).*?\1/gi,
      '',
    );
    if (!/\bxmlns\s*=/i.test(next)) {
      next += ' xmlns="http://www.w3.org/2000/svg"';
    }
    return `<svg${next} width="100%" height="100%" preserveAspectRatio="${aspect}">`;
  });
  return svg;
}
