import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('공개 저장소의 런타임 설정에는 API URL이나 실제 학생 개인정보가 포함되지 않는다', () => {
  const config = read('public/runtime-config.js');
  const demo = read('lib/demo-data.ts');
  assert.match(config, /API_URL:\s*''/);
  assert.match(demo, /학생 A/);
  assert.doesNotMatch(demo, /stu-2026-/);
});

test('Apps Script는 핵심 운영 테이블과 한양대 도메인 제한을 정의한다', () => {
  const backend = read('backend/Code.gs');
  for (const table of ['Parts', 'Students', 'Schedules', 'WorkLogs', 'Tasks', 'Employees', 'Semesters', 'Settings']) {
    assert.match(backend, new RegExp(`${table}:`));
  }
  assert.match(backend, /ALLOWED_DOMAIN = 'hanyang\.ac\.kr'/);
});

test('GitHub Pages와 Sites 정적 배포 설정이 준비되어 있다', () => {
  const workflow = read('.github/workflows/pages.yml');
  const hosting = JSON.parse(read('.openai/hosting.json'));
  assert.match(workflow, /BASE_PATH:\s*\/student-support-workstudent-manager/);
  assert.equal(hosting.static.directory, 'dist/client');
});
