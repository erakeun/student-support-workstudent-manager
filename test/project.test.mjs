import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const backend = () => read('backend/Code.gs');

test('런타임 설정에는 API·인증 배포 URL만 있고 실제 학생 개인정보는 없다', () => {
  const config = read('public/runtime-config.js');
  const demo = read('lib/demo-data.ts');
  assert.match(
    config,
    /API_URL:\s*'https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec'/,
  );
  assert.match(
    config,
    /AUTH_URL:\s*'https:\/\/script\.google\.com\/a\/macros\/hanyang\.ac\.kr\/s\/[A-Za-z0-9_-]+\/exec'/,
  );
  assert.match(demo, /학생 A/);
  assert.doesNotMatch(demo, /stu-2026-/);
});

test('V2 Apps Script는 기존 8개 시트와 추가 관리 테이블을 비파괴적으로 보장한다', () => {
  const source = backend();
  for (const table of [
    'Parts',
    'Students',
    'Schedules',
    'WorkLogs',
    'Tasks',
    'Employees',
    'Semesters',
    'Settings',
    'Substitutions',
    'MigrationLog',
  ]) {
    assert.match(source, new RegExp(`${table}:`));
  }
  assert.match(source, /initializeDatabase/);
  assert.match(source, /beforeStudents/);
  assert.match(
    source,
    /beforeStudents !== afterStudents \|\| beforeSchedules !== afterSchedules/,
  );
  assert.match(source, /기존 행 수가 변경되어 중단/);
  assert.doesNotMatch(source, /\.clear\s*\(/);
  assert.doesNotMatch(source, /deleteSheet\s*\(/);
});

test('관리자와 학생은 서버 세션·역할·필터로 분리된다', () => {
  const source = backend();
  assert.match(source, /ALLOWED_DOMAIN = 'hanyang\.ac\.kr'/);
  assert.ok(source.includes("requireRole_(request.token, 'ADMIN')"));
  assert.ok(source.includes("requireRole_(request.token, 'STUDENT')"));
  assert.match(source, /studentLogin_/);
  assert.match(source, /adminLogin_/);
  assert.match(source, /readStudentData_/);
  assert.match(
    source,
    /\.filter\(row => String\(row\.studentId\) === String\(student\.studentId\)/,
  );
  assert.match(source, /delete copy\.passwordHash/);
});

test('학생 비밀번호는 평문이 아닌 salt SHA-256 해시로 저장한다', () => {
  const source = backend();
  assert.match(
    source,
    /Utilities\.computeDigest\(Utilities\.DigestAlgorithm\.SHA_256/,
  );
  assert.match(source, /passwordSalt/);
  assert.match(source, /passwordHash/);
  assert.match(
    source,
    /record\.passwordHash = hashPassword_\(password, salt\)/,
  );
});

test('대체근무는 신청과 승인 두 단계에서 같은 파트만 허용한다', () => {
  const source = backend();
  assert.match(source, /studentApplySubstitution_/);
  assert.match(source, /adminReviewSubstitution_/);
  assert.match(source, /request\.partId !== student\.partId/);
  assert.match(
    source,
    /requester\.partId !== substitute\.partId \|\| requester\.partId !== request\.partId/,
  );
});

test('출퇴근·보정·이상 탐지와 SHORT_TERM 기간 제한을 서버가 강제한다', () => {
  const source = backend();
  for (const marker of [
    'clockIn_',
    'clockOut_',
    'adminUpsertWorkLog_',
    'MISSING_CLOCK_OUT',
    'INVALID_TIME',
    'DUPLICATE_DAY',
    'SCHEDULE_MISMATCH',
    'SHORT_TERM',
  ]) {
    assert.match(source, new RegExp(marker));
  }
});

test('프론트엔드는 단기 Hanyang 토큰을 앱 세션으로 교환하고 역할별 데이터를 요청한다', () => {
  const api = read('lib/api.ts');
  assert.match(api, /hash\.get\('portalToken'\)/);
  assert.match(api, /workPortalHanyangToken/);
  assert.match(api, /workPortalAppSession/);
  assert.match(api, /adminLogin/);
  assert.match(api, /studentLogin/);
  assert.match(
    api,
    /role === 'ADMIN' \? 'adminBootstrap' : 'studentBootstrap'/,
  );
});

test('로그인 후 학생·관리자 전용 포털과 운영 CRUD가 연결된다', () => {
  const controller = read('components/portal-app.tsx');
  const student = read('components/student-portal.tsx');
  const admin = read('components/admin-portal.tsx');
  assert.match(controller, /LoginScreen/);
  assert.match(controller, /StudentPortal/);
  assert.match(controller, /AdminPortal/);
  assert.match(student, /clockIn/);
  assert.match(student, /studentCreateSubstitution/);
  for (const action of [
    'adminUpsertStudent',
    'adminResetPassword',
    'adminUpsertSchedule',
    'adminUpsertWorkLog',
    'adminUpsertTask',
    'adminCreateSemester',
    'adminUpsertPart',
  ]) {
    assert.match(admin, new RegExp(action));
  }
});

test('GitHub Pages와 Sites 정적 배포 설정을 계속 사용한다', () => {
  const workflow = read('.github/workflows/pages.yml');
  const hosting = JSON.parse(read('.openai/hosting.json'));
  assert.match(workflow, /BASE_PATH:\s*\/student-support-workstudent-manager/);
  assert.equal(hosting.static.directory, 'dist/client');
});
