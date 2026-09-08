import type { PortalData, SessionUser } from './portal-types';

type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  token?: string;
  user?: SessionUser;
  [key: string]: unknown;
};

declare global {
  interface Window {
    WORK_PORTAL_CONFIG?: { API_URL?: string };
  }
}

const DEFAULT_API_URL =
  'https://script.google.com/macros/s/AKfycbzTUixfpnPdm55NS6gUI717QCnqH39Yd3tXpCTCldQ7Db_KJATjntE37sCQpI2OTSiUPg/exec';
const APP_SESSION_KEY = 'workPortalAppSession';
const REQUEST_TIMEOUT_MS = 20_000;

export function getApiUrl() {
  if (typeof window === 'undefined') return '';
  return window.WORK_PORTAL_CONFIG?.API_URL?.trim() || DEFAULT_API_URL;
}

export function getAppSessionToken() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(APP_SESSION_KEY) || '';
}

function storeAppSession(token: string) {
  window.sessionStorage.setItem(APP_SESSION_KEY, token);
}

async function request(action: string, payload: Record<string, unknown> = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('Apps Script URL이 설정되지 않았습니다.');
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const result = (await response.json()) as ApiResult;
    if (!result.ok)
      throw new Error(result.error || '요청을 처리하지 못했습니다.');
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw new Error('서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loginStudent(loginId: string, password: string) {
  const result = await request('studentLogin', { loginId, password });
  if (!result.token || !result.user)
    throw new Error('로그인 응답이 올바르지 않습니다.');
  storeAppSession(result.token);
  return result.user;
}

export async function loginAdmin(loginId: string, password: string) {
  const result = await request('adminLogin', { loginId, password });
  if (!result.token || !result.user)
    throw new Error('관리자 로그인 응답이 올바르지 않습니다.');
  storeAppSession(result.token);
  return result.user;
}

export async function restoreSession() {
  const token = getAppSessionToken();
  if (!token) return null;
  try {
    const result = await request('session', { token });
    return result.user || null;
  } catch {
    window.sessionStorage.removeItem(APP_SESSION_KEY);
    return null;
  }
}

export async function loadRoleData(
  role: SessionUser['role'],
): Promise<PortalData> {
  const token = getAppSessionToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const action = role === 'ADMIN' ? 'adminBootstrap' : 'studentBootstrap';
  const result = (await request(action, { token })) as ApiResult<PortalData>;
  if (!result.data) throw new Error('운영 데이터가 비어 있습니다.');
  return result.data;
}

export async function postPortalAction(
  action: string,
  payload: Record<string, unknown> = {},
) {
  const token = getAppSessionToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  return request(action, { token, ...payload });
}

export async function logoutPortal() {
  const token = getAppSessionToken();
  if (token) await request('logout', { token }).catch(() => undefined);
  window.sessionStorage.removeItem(APP_SESSION_KEY);
}
