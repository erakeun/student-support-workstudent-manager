import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const backend = () => read('backend/Code.gs');

test('런타임 설정에는 공개 API URL만 있고 인증정보와 실제 학생 개인정보는 없다', () => {
  const config = read('public/runtime-config.js');
  const demo = read('lib/demo-data.ts');
  assert.match(
    config,
    /API_URL:\s*'https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec'/,
  );
  assert.doesNotMatch(config, /AUTH_URL|hanyangToken|passwordHash/);
  assert.match(demo, /학생 A/);
  assert.doesNotMatch(demo, /stu-2026-/);
});

test('V6 Apps Script는 기존 테이블과 신규 운영 시트를 비파괴적으로 보장한다', () => {
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
    'Admins',
    'Budgets',
    'Handovers',
    'Absences',
    'Notices',
    'Assemblies',
    'AssemblyParticipants',
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
  assert.doesNotMatch(source, /authorizePortal_|requireHanyangUser_|requirePortalUser_/);
  assert.ok(source.includes('requireAdmin_(request.token)'));
  assert.ok(source.includes('requireSuperAdmin_(request.token)'));
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
  assert.match(source, /applyPassword_\(patch, String\(student\.studentNumber\)\)/);
  assert.match(source, /adminResetPasswordToStudentNumber_/);
});

test('학생 연락처·개별시급과 파트·근로유형 기본 시급 구조를 제공한다', () => {
  const source = backend();
  for (const marker of ['email', 'phone', 'hourlyWage', 'defaultHourlyWage', 'nationalWorkDefaultHourlyWage', 'shortTermDefaultHourlyWage', 'studentUpdateContact_']) assert.match(source, new RegExp(marker));
  assert.match(source, /delete copy\.passwordHash/);
});

test('V5 조직·기본 시급·근로유형 예산·공유메모 구조를 제공한다', () => {
  const source = backend();
  for (const marker of ['SUPPORT', 'RESERVE', 'defaultHourlyWage', '10320', 'nationalBudget', 'internalBudget', 'adminUpsertBudget_', 'studentUpsertHandover_', 'studentDeleteHandover_', 'studentAcknowledgeHandover_', 'adminDeleteHandover_', 'migrateWorkerTypeBudgetsV5_']) assert.match(source, new RegExp(marker));
  assert.match(source, /'student-support': 'SUPPORT'/);
  assert.match(source, /'chinese-support': 'SUPPORT'/);
  assert.match(source, /'reserve-affairs': 'RESERVE'/);
  assert.match(source, /본인이 작성한 공유메모만 삭제/);
  assert.doesNotMatch(source, /record\[key\] = Math\.max\(0, Number\(record\[key\] \|\| 0\)\)/);
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

test('프론트엔드는 관리자·학생 ID/PW를 앱 세션으로 교환하고 역할별 데이터를 요청한다', () => {
  const api = read('lib/api.ts');
  assert.match(api, /workPortalAppSession/);
  assert.match(api, /adminLogin/);
  assert.match(api, /studentLogin/);
  assert.doesNotMatch(api, /Hanyang|hanyangToken|AUTH_URL/);
  assert.match(api, /REQUEST_TIMEOUT_MS = 60_000/);
  assert.match(api, /controller\.abort\(\)/);
  assert.match(
    api,
    /role === 'STUDENT' \? 'studentBootstrap' : 'adminBootstrap'/,
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
  assert.match(student, /studentUpdateContact/);
  assert.match(student, /출퇴근/);
  assert.match(student, /내 정보/);
  assert.match(admin, /월별 근로유형 예산/);
  assert.match(admin, /actualCost/);
  assert.match(admin, /monthlyBudgetRows/);
  for (const action of [
    'adminUpsertStudent',
    'adminResetPassword',
    'adminUpsertSchedule',
    'adminUpsertWorkLog',
    'adminUpsertTask',
    'adminUpsertSemester',
    'adminUpsertPart',
    'adminResetPasswordToStudentNumber',
    'adminUpsertBudget',
    'adminUpsertHandover',
  ]) {
    assert.match(admin, new RegExp(action));
  }
});

test('관리자와 학생 화면에 인수인계·예산 설정·월간 달력 편집이 연결된다', () => {
  const student = read('components/student-portal.tsx');
  const admin = read('components/admin-portal.tsx');
  assert.match(student, /studentUpsertHandover/);
  assert.match(student, /studentDeleteHandover/);
  assert.match(student, /studentAcknowledgeHandover/);
  assert.match(student, /인수인계/);
  assert.match(admin, /MonthCalendar/);
  assert.match(admin, /국가근로 설정 예산/);
  assert.match(admin, /교내근로 설정 예산/);
  assert.match(admin, /예산 미설정/);
  assert.match(admin, /adminCancelWorkLog/);
  assert.match(admin, /전체 근로유형/);
  assert.match(admin, /grid-cols-5/);
  assert.doesNotMatch(admin, /\{\['일','월','화','수','목','금','토'\]/);
});

test('V6 권한·비밀번호·색상·결근·공지·소집을 서버와 역할별 UI에 연결한다', () => {
  const source = backend();
  const admin = read('components/admin-portal.tsx');
  const student = read('components/student-portal.tsx');
  const operations = read('components/operations-features.tsx');
  for (const marker of [
    'SUPER_ADMIN', 'MANAGER', 'normalizeAdminRole_', 'assertSuperAdminRemains_',
    'changeOwnPassword_', 'displayColor', 'adminUpsertAbsence_', 'adminCancelAbsence_',
    'adminUpsertNotice_', 'adminDeleteNotice_', 'adminUpsertAssembly_',
    'studentApplyAssembly_', 'cancelAssemblyParticipant_', 'adminConfirmAssemblyAttendance_',
  ]) assert.match(source, new RegExp(marker));
  assert.match(source, /학생 계정 생성은 총괄관리자만/);
  assert.match(source, /본인이 작성한 공지만 삭제/);
  assert.match(source, /같은 시간대의 기존 근무기록과 중복/);
  assert.match(admin, /TodayOperations/);
  assert.match(admin, /AccountsPanel/);
  assert.match(student, /NoticesPanel/);
  assert.match(student, /AssembliesPanel/);
  assert.match(operations, /현재 근무중/);
  assert.match(operations, /다음 근무/);
  assert.match(operations, /미출근/);
  assert.match(operations, /결근 처리/);
  assert.match(operations, /비밀번호 변경/);
});

test('GitHub Pages와 Sites 정적 배포 설정을 계속 사용한다', () => {
  const workflow = read('.github/workflows/pages.yml');
  const hosting = JSON.parse(read('.openai/hosting.json'));
  assert.match(workflow, /BASE_PATH:\s*\/student-support-workstudent-manager/);
  assert.match(workflow, /mv dist\/client\/student-support-workstudent-manager\/_next dist\/client\/_next/);
  assert.match(workflow, /touch dist\/client\/\.nojekyll/);
  assert.equal(hosting.static.directory, 'dist/client');
});
