import type { PortalData } from './portal-types';

type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    WORK_PORTAL_CONFIG?: { API_URL?: string };
  }
}

export function getApiUrl() {
  if (typeof window === 'undefined') return '';
  return window.WORK_PORTAL_CONFIG?.API_URL?.trim() || '';
}

export async function loadPortalData(): Promise<PortalData | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;
  const response = await fetch(`${apiUrl}?action=bootstrap`, { redirect: 'follow' });
  const result = await response.json() as ApiResult<PortalData>;
  if (!result.ok) throw new Error(result.error || '운영 데이터를 불러오지 못했습니다.');
  if (!result.data) throw new Error('운영 데이터가 비어 있습니다.');
  return result.data;
}

export async function postPortalAction(action: string, payload: Record<string, unknown>) {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('Apps Script URL이 설정되지 않았습니다.');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
    redirect: 'follow',
  });
  const result = await response.json() as ApiResult;
  if (!result.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  return result;
}
