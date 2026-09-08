import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('런타임 설정에는 API·인증 배포 URL만 있고 실제 학생 개인정보는 없다', () => {
  const config = read('public/runtime-config.js');
  const demo = read('lib/demo-data.ts');
  assert.match(config, /API_URL:\s*'https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec'/);
  assert.match(config, /AUTH_URL:\s*'https:\/\/script\.google\.com\/a\/macros\/hanyang\.ac\.kr\/s\/[A-Za-z0-9_-]+\/exec'/);
  assert.match(demo, /학생 A/);
  assert.doesNotMatch(demo, /stu-2026-/);
});

test('Apps Script는 핵심 운영 테이블과 한양대 도메인 제한을 정의한다', () => {
  const backend = read('backend/Code.gs');
  for (const table of ['Parts', 'Students', 'Schedules', 'WorkLogs', 'Tasks', 'Employees', 'Semesters', 'Settings']) {
    assert.match(backend, new RegExp(`${table}:`));
  }
  assert.match(backend, /ALLOWED_DOMAIN = 'hanyang\.ac\.kr'/);
  assert.match(backend, /bootstrap: \(\) => \{ requirePortalUser_\(request\.token\)/);
  assert.match(backend, /CacheService\.getScriptCache\(\)\.get\('portal-session:' \+ String\(token\)\)/);
  assert.match(backend, /throw new Error\('한양대학교 계정 연결이 필요합니다\.'\)/);
  assert.doesNotMatch(backend, /function requirePortalUser_[\s\S]*?return requireHanyangUser_\(\)/);
  assert.match(backend, /\['startTime', 'endTime'\]\.includes\(header\).*?'HH:mm'/s);
  assert.match(backend, /\['semesterId', 'value'\]\.includes\(header\).*?'yyyy-M'/s);
});

test('포털은 URL fragment의 단기 토큰을 세션 저장소로 옮겨 API 호출에 사용한다', () => {
  const api = read('lib/api.ts');
  assert.match(api, /hash\.get\('portalToken'\)/);
  assert.match(api, /sessionStorage\.setItem\('workPortalToken'/);
  assert.match(api, /JSON\.stringify\(\{ action, token, \.\.\.payload \}\)/);
  assert.match(api, /returnUrl=\$\{encodeURIComponent\(returnUrl\)\}/);
});

test('GitHub Pages와 Sites 정적 배포 설정이 준비되어 있다', () => {
  const workflow = read('.github/workflows/pages.yml');
  const hosting = JSON.parse(read('.openai/hosting.json'));
  assert.match(workflow, /BASE_PATH:\s*\/student-support-workstudent-manager/);
  assert.equal(hosting.static.directory, 'dist/client');
});

test('관리자 변경은 운영 연결 시 Apps Script 저장 API를 호출한다', () => {
  const portal = read('components/portal-app.tsx');
  assert.match(portal, /postPortalAction\('upsertEntity'/);
  assert.match(portal, /postPortalAction\('deleteEntity'/);
  assert.match(portal, /postPortalAction\(mode/);
});
