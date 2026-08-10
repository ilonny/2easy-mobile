import {API_URL} from '../config';
import {readStorage} from '../lib/storage';
import {STORAGE_KEYS} from '../config';

const SERVER_UNAVAILABLE_MESSAGE =
  'Сервер временно недоступен. Попробуйте позже';
const INVALID_RESPONSE_MESSAGE = 'Некорректный ответ сервера';

type RequestParams = {
  path: string;
  data?: unknown;
  isSecure?: boolean;
};

export type ApiResult<T = Record<string, unknown>> = T & {
  success?: boolean;
  ok?: boolean;
  status?: number;
  message?: string;
  code?: string;
  token?: string;
};

function defaultMessageForStatus(status: number): string {
  if (status >= 500) {
    return SERVER_UNAVAILABLE_MESSAGE;
  }
  if (status === 401) {
    return 'Ошибка авторизации, пожалуйста, авторизуйтесь заново';
  }
  return 'Что-то пошло не так';
}

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  const text = await response.text();
  let parsed: Record<string, unknown> | null = null;
  let parseFailed = false;

  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parseFailed = true;
      parsed = null;
    }
  } else {
    parsed = {};
  }

  if (parseFailed) {
    return {
      success: false,
      status: response.status,
      message:
        response.status >= 500
          ? SERVER_UNAVAILABLE_MESSAGE
          : INVALID_RESPONSE_MESSAGE,
    } as ApiResult<T>;
  }

  if (!response.ok) {
    const base =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    return {
      ...base,
      success: false,
      status: (base.status as number | undefined) ?? response.status,
      message:
        (base.message as string | undefined) ||
        defaultMessageForStatus(response.status),
    } as ApiResult<T>;
  }

  return (parsed ?? {}) as ApiResult<T>;
}

async function requestJson<T>(
  method: 'GET' | 'POST',
  params: RequestParams,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (params.isSecure) {
    const token = await readStorage(STORAGE_KEYS.token);
    headers.Authorization = `Bearer ${token || ''}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${params.path}`, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(params.data ?? {}) : undefined,
    });
  } catch {
    return {
      success: false,
      status: 0,
      message: SERVER_UNAVAILABLE_MESSAGE,
    } as ApiResult<T>;
  }

  return parseResponse<T>(response);
}

export async function postJson<T = Record<string, unknown>>(
  params: RequestParams,
): Promise<ApiResult<T>> {
  return requestJson<T>('POST', params);
}

export async function getJson<T = Record<string, unknown>>(
  params: Omit<RequestParams, 'data'>,
): Promise<ApiResult<T>> {
  return requestJson<T>('GET', params);
}

type MultipartParams = {
  path: string;
  formData: FormData;
  isSecure?: boolean;
};

export async function postMultipart<T = Record<string, unknown>>(
  params: MultipartParams,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};

  if (params.isSecure) {
    const token = await readStorage(STORAGE_KEYS.token);
    headers.Authorization = `Bearer ${token || ''}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${params.path}`, {
      method: 'POST',
      headers,
      body: params.formData,
    });
  } catch {
    return {
      success: false,
      status: 0,
      message: SERVER_UNAVAILABLE_MESSAGE,
    } as ApiResult<T>;
  }

  return parseResponse<T>(response);
}
