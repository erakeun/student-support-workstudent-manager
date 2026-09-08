import type { PortalData } from './portal-types';

type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    WORK_PORTAL_CONFIG?: { API_URL?: string; AUTH_URL?: string };
  }
}

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzTUixfpnPdm55NS6gUI717QCnqH39Yd3tXpCTCldQ7Db_KJATjntE37sCQpI2OTSiUPg/exec';
const DEFAULT_AUTH_URL = 'https://script.google.com/a/macros/hanyang.ac.kr/s/AKfycbxZkSjIyEFWqoMwwP_q6cY4hz0_GhB0SVbAiwCWFVTQOcPk2RT2zZWSQIircaWD0XBx_Q/exec';

export function getApiUrl() {
  if (typeof window === 'undefined') return '';
  return window.WORK_PORTAL_CONFIG?.API_URL?.trim() || DEFAULT_API_URL;
}

export function getPortalToken() {
  if (typeof window === 'undefined') return '';
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const issuedToken = hash.get('portalToken');
  if (issuedToken) {
    window.sessionStorage.setItem('workPortalToken', issuedToken);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return issuedToken || window.sessionStorage.getItem('workPortalToken') || '';
}

export function getAuthUrl() {
  if (typeof window === 'undefined') return '';
  const authUrl = window.WORK_PORTAL_CONFIG?.AUTH_URL?.trim() || DEFAULT_AUTH_URL;
  if (!authUrl) return '';
  const returnUrl = window.location.origin + window.location.pathname;
  return `${authUrl}?action=authorize&returnUrl=${encodeURIComponent(returnUrl)}`;
}

async function requestPortal(action: string, payload: Record<string, unknown> = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('Apps Script URL이 설정되지 않았습니다.');
  const token = getPortalToken();
  if (!token) throw new Error('한양대학교 계정 연결이 필요합니다.');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, ...payload }),
    redirect: 'follow',
  });
  return response.json() as Promise<ApiResult>;
}

export async function loadPortalData(): Promise<PortalData | null> {
  if (!getApiUrl() || !getPortalToken()) return null;
  const result = await requestPortal('bootstrap') as ApiResult<PortalData>;
  if (!result.ok) throw new Error(result.error || '운영 데이터를 불러오지 못했습니다.');
  if (!result.data) throw new Error('운영 데이터가 비어 있습니다.');
  return result.data;
}

export async function postPortalAction(action: string, payload: Record<string, unknown>) {
  const result = await requestPortal(action, payload);
  if (!result.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  return result;
}
