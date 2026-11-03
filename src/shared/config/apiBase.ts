const PRIMARY_API_BASE_URL = 'https://api.2easyeng.com';
const FALLBACK_API_BASE_URL = 'https://api.2easyeng.ru';
const HEALTHCHECK_TIMEOUT_MS = 5000;

let resolvedBase: string | null = null;
let pending: Promise<string> | null = null;

async function apiResponds(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveApiBase(): Promise<string> {
  const primaryOk = await apiResponds(PRIMARY_API_BASE_URL);
  resolvedBase = primaryOk ? PRIMARY_API_BASE_URL : FALLBACK_API_BASE_URL;
  return resolvedBase;
}

/** Picks the working API host once per app launch. */
export function ensureApiBase(): Promise<string> {
  if (resolvedBase) {
    return Promise.resolve(resolvedBase);
  }
  if (!pending) {
    pending = resolveApiBase().catch(() => {
      resolvedBase = FALLBACK_API_BASE_URL;
      return resolvedBase;
    });
  }
  return pending;
}

export function getApiBaseUrl(): string {
  return resolvedBase ?? PRIMARY_API_BASE_URL;
}

export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api`;
}

const COM_JITSI_DOMAIN = 'meet.2easyeng.com';
const RU_JITSI_DOMAIN = 'meet.2easyeng.ru';
const COM_WEB_URL = 'https://2easyeng.com';
const RU_WEB_URL = 'https://2easyeng.ru';

function usesRuHosts(): boolean {
  return getApiBaseUrl() === FALLBACK_API_BASE_URL;
}

/** Same host choice as the API healthcheck: .ru API means .ru calls. */
export function getJitsiDomain(): string {
  return usesRuHosts() ? RU_JITSI_DOMAIN : COM_JITSI_DOMAIN;
}

export function getWebUrl(): string {
  return usesRuHosts() ? RU_WEB_URL : COM_WEB_URL;
}

/** Rewrite 2easyeng.com hosts to .ru after the .com healthcheck failed. */
export function rewriteSiteUrl(value: string): string {
  if (!value || !usesRuHosts()) {
    return value;
  }
  return value.replace(
    /(^|\/\/)((?:[a-z0-9-]+\.)*)2easyeng\.com\b/gi,
    '$1$22easyeng.ru',
  );
}
