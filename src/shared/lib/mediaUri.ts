import type {ImageSourcePropType} from 'react-native';

import {API_URL, WEB_URL} from '../config';

export function uriFromSource(source?: ImageSourcePropType | null): string | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  if (!('uri' in source) || typeof source.uri !== 'string') {
    return null;
  }
  return source.uri || null;
}

export function isSvgUri(uri?: string | null): boolean {
  if (!uri) {
    return false;
  }
  const lower = uri.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower.startsWith('data:image/svg')) {
    return true;
  }
  if (lower.includes('image/svg+xml')) {
    return true;
  }
  const path = lower.split('?')[0].split('#')[0];
  return path.endsWith('.svg');
}

export function htmlContainsSvg(html?: string | null): boolean {
  if (!html) {
    return false;
  }
  return (
    /<svg[\s>/]/i.test(html) ||
    /data:image\/svg/i.test(html) ||
    /image\/svg\+xml/i.test(html) ||
    /\.svg(?:\?|#|"|'|$)/i.test(html)
  );
}

export function resolveMediaUri(
  raw?: string | null,
  baseUrl: string = WEB_URL,
): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  const trimmed = raw.trim();
  if (!trimmed || /^about:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return '';
  }
  if (/^data:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (
    /^file:\/\//i.test(trimmed) ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://')
  ) {
    return trimmed;
  }
  if (
    trimmed.includes('/_next/') ||
    trimmed.startsWith('/grammar') ||
    trimmed.startsWith('/assets')
  ) {
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    }
  }
  if (trimmed.includes('608dfa18-3eae-4574-a997-0a7441c16d33.selstorage.ru')) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  const apiBase = API_URL.replace(/\/api$/, '');
  return `${apiBase}/${trimmed.replace(/^\//, '')}`;
}
