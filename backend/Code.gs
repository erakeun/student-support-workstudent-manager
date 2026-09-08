/**
 * 한양대학교 ERICA 학생지원팀 근로관리 API V6
 * 운영 데이터와 인증 해시의 원본은 Google Spreadsheet다.
 * 기존 행은 삭제하지 않고 initializeDatabase()가 누락 열/시트만 추가한다.
 */
const TIMEZONE = 'Asia/Seoul';
const SESSION_TTL_SECONDS = 21600;
let requestSpreadsheet = null;

const TABLES = {
  Parts: ['partId', 'partName', 'displayOrder', 'color', 'active', 'defaultHourlyWage', 'note'],
  Students: ['studentId', 'name', 'studentNumber', 'partId', 'workerType', 'startDate', 'endDate', 'taskSummary', 'workMemo', 'contactMemo', 'specialNote', 'substituteTasks', 'active', 'loginId', 'passwordHash', 'passwordSalt', 'role', 'lastPasswordChangedAt', 'email', 'phone', 'hourlyWage', 'displayColor'],
  Schedules: ['scheduleId', 'studentId', 'dayOfWeek', 'startTime', 'endTime', 'semesterId', 'active', 'updatedAt', 'updatedBy', 'date', 'period'],
  WorkLogs: ['logId', 'studentId', 'date', 'clockIn', 'clockOut', 'minutes', 'status', 'note', 'scheduleId', 'partId', 'reason', 'editedBy', 'editedAt', 'createdBy', 'createdAt', 'flagCode', 'sourceType', 'assemblyId'],
  Tasks: ['taskId', 'taskName', 'description', 'partId', 'studentId', 'employeeId', 'keywords', 'active', 'updatedAt', 'updatedBy'],
  Employees: ['employeeId', 'name', 'partId', 'extension', 'tasks', 'active'],
  Semesters: ['semesterId', 'semesterName', 'startDate', 'endDate', 'active', 'createdAt', 'createdBy', 'vacationStartDate', 'vacationStartedAt', 'vacationStartedBy'],
  Settings: ['key', 'value'],
  Substitutions: ['substitutionId', 'scheduleId', 'date', 'requesterStudentId', 'substituteStudentId', 'partId', 'status', 'reason', 'createdAt', 'updatedAt', 'approvedBy'],
  MigrationLog: ['migrationId', 'appliedAt', 'version', 'description', 'beforeStudents', 'afterStudents', 'beforeSchedules', 'afterSchedules'],
  Admins: ['adminId', 'name', 'loginId', 'passwordHash', 'passwordSalt', 'active', 'lastPasswordChangedAt', 'createdAt', 'createdBy', 'role', 'note', 'lastLoginAt', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy'],
  Budgets: ['month', 'totalBudget', 'supportBudget', 'reserveBudget', 'shortTermBudget', 'note', 'updatedAt', 'updatedBy', 'nationalBudget', 'internalBudget'],
  Handovers: ['handoverId', 'date', 'partId', 'authorStudentId', 'title', 'content', 'status', 'priority', 'targetStudentId', 'createdAt', 'updatedAt', 'completedAt', 'visibility', 'active', 'deletedAt', 'deletedBy', 'pinned', 'acknowledgedBy'],
  Absences: ['absenceId', 'studentId', 'date', 'scheduleId', 'scheduledStart', 'scheduledEnd', 'type', 'reason', 'note', 'status', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'cancelledAt', 'cancelledBy'],
  Notices: ['noticeId', 'title', 'content', 'authorId', 'authorName', 'authorRole', 'createdAt', 'updatedAt', 'startDate', 'endDate', 'pinned', 'target', 'targetValue', 'active', 'deletedAt', 'deletedBy'],
  Assemblies: ['assemblyId', 'title', 'content', 'date', 'startTime', 'endTime', 'capacity', 'target', 'targetValue', 'place', 'creditHours', 'mode', 'status', 'managerId', 'note', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
  AssemblyParticipants: ['participantId', 'assemblyId', 'studentId', 'status', 'source', 'appliedAt', 'assignedAt', 'updatedAt', 'updatedBy', 'workLogId', 'attendanceConfirmedAt'],
};

const COLUMN_WIDTHS = {
  Parts: [150, 120, 90, 90, 70, 120, 220], Students: [135, 90, 110, 130, 120, 100, 100, 180, 180, 180, 220, 180, 70, 120, 110, 110, 80, 160, 190, 130, 110],
  Schedules: [135, 125, 90, 90, 90, 100, 70, 160, 170, 100], WorkLogs: [135, 125, 100, 165, 165, 85, 105, 180, 135, 125, 180, 170, 165, 170, 165, 180],
  Tasks: [135, 150, 220, 125, 125, 125, 180, 70, 160, 170], Employees: [135, 90, 125, 90, 220, 70],
  Semesters: [110, 150, 100, 100, 70, 160, 170], Settings: [230, 430], Substitutions: [145, 135, 100, 150, 150, 125, 100, 200, 165, 165, 170], MigrationLog: [140, 165, 90, 280, 100, 100, 110, 110],
  Admins: [140, 120, 150, 120, 120, 80, 170, 170, 150],
  Budgets: [100, 130, 130, 130, 130, 240, 170, 160, 140, 140],
  Handovers: [145, 100, 120, 145, 220, 420, 110, 110, 145, 170, 170, 170, 100, 70, 170, 160, 80, 220],
  Absences: [145, 130, 100, 145, 100, 100, 100, 220, 220, 90, 170, 150, 170, 150, 170, 150],
  Notices: [145, 220, 420, 150, 120, 110, 170, 170, 100, 100, 80, 110, 160, 80, 170, 150],
  Assemblies: [145, 220, 420, 100, 90, 90, 90, 120, 180, 160, 90, 100, 110, 150, 220, 170, 150, 170, 150],
  AssemblyParticipants: [150, 145, 130, 100, 100, 170, 170, 170, 150, 145, 170],
};

function doGet(e) {
  const request = Object.assign({}, (e && e.parameter) || {});
  request.action = request.action || 'health';
  return json_(route_(request));
}

function doPost(e) {
  let request = {};
  try { request = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (_) { return json_({ ok: false, error: '요청 본문이 올바른 JSON이 아닙니다.' }); }
  return json_(route_(request));
}

function route_(request) {
  try {
    const actions = {
      health: () => ({ ok: true, service: 'student-support-workstudent-manager-v6', auditRevision: '2026-09-08.6', time: new Date().toISOString() }),
      adminLogin: () => adminLogin_(request.loginId, request.password),
      studentLogin: () => studentLogin_(request.loginId, request.password),
      session: () => sessionInfo_(request.token),
      logout: () => { endSession_(request.token); return { ok: true }; },
      adminBootstrap: () => ({ ok: true, data: readAdminData_(requireAdmin_(request.token)) }),
      studentBootstrap: () => ({ ok: true, data: readStudentData_(requireRole_(request.token, 'STUDENT')) }),
      initializeDatabase: () => { const user = requireSuperAdmin_(request.token); return { ok: true, message: initializeDatabase(actorId_(user)) }; },
      adminUpsertStudent: () => ({ ok: true, record: adminUpsertStudent_(requireAdmin_(request.token), request.record, request.initialPassword) }),
      adminResetPassword: () => ({ ok: true, record: adminResetPassword_(requireAdmin_(request.token), request.studentId, request.newPassword) }),
      adminResetPasswordToStudentNumber: () => ({ ok: true, record: adminResetPasswordToStudentNumber_(requireAdmin_(request.token), request.studentId) }),
      adminUpsertSchedule: () => ({ ok: true, record: adminUpsertSchedule_(requireAdmin_(request.token), request.record) }),
      adminDeactivateSchedule: () => ({ ok: true, record: setActive_('Schedules', 'scheduleId', request.scheduleId, false, requireAdmin_(request.token)) }),
      adminUpsertWorkLog: () => ({ ok: true, record: adminUpsertWorkLog_(requireAdmin_(request.token), request.record) }),
      adminCancelWorkLog: () => ({ ok: true, record: adminCancelWorkLog_(requireAdmin_(request.token), request.logId, request.reason) }),
      adminUpsertTask: () => ({ ok: true, record: adminUpsertTask_(requireAdmin_(request.token), request.record) }),
      adminDeactivateTask: () => ({ ok: true, record: setActive_('Tasks', 'taskId', request.taskId, false, requireAdmin_(request.token)) }),
      adminUpsertPart: () => ({ ok: true, record: adminUpsertPart_(requireSuperAdmin_(request.token), request.record) }),
      adminDeactivatePart: () => ({ ok: true, record: setActive_('Parts', 'partId', request.partId, false, requireSuperAdmin_(request.token)) }),
      adminCreateSemester: () => ({ ok: true, record: adminCreateSemester_(requireSuperAdmin_(request.token), request.record) }),
      adminUpsertSemester: () => ({ ok: true, record: adminUpsertSemester_(requireSuperAdmin_(request.token), request.record) }),
      adminStartVacation: () => ({ ok: true, record: adminStartVacation_(requireSuperAdmin_(request.token), request.semesterId) }),
      adminActivateSemester: () => ({ ok: true, semesterId: adminActivateSemester_(requireSuperAdmin_(request.token), request.semesterId) }),
      adminSaveSettings: () => ({ ok: true, settings: adminSaveSettings_(requireSuperAdmin_(request.token), request.settings) }),
      adminReviewSubstitution: () => ({ ok: true, record: adminReviewSubstitution_(requireAdmin_(request.token), request.substitutionId, request.status) }),
      adminCancelSubstitution: () => ({ ok: true, record: adminCancelSubstitution_(requireAdmin_(request.token), request.substitutionId) }),
      adminUpsertBudget: () => ({ ok: true, record: adminUpsertBudget_(requireAdmin_(request.token), request.record) }),
      adminUpsertHandover: () => ({ ok: true, record: adminUpsertHandover_(requireAdmin_(request.token), request.record) }),
      adminDeleteHandover: () => ({ ok: true, record: adminDeleteHandover_(requireAdmin_(request.token), request.handoverId) }),
      adminUpsertAdmin: () => ({ ok: true, record: adminUpsertAdmin_(requireSuperAdmin_(request.token), request.record, request.initialPassword) }),
      adminResetAdminPassword: () => ({ ok: true, record: adminResetAdminPassword_(requireSuperAdmin_(request.token), request.adminId, request.newPassword) }),
      adminDeactivateAdmin: () => ({ ok: true, record: adminDeactivateAdmin_(requireSuperAdmin_(request.token), request.adminId) }),
      adminDeleteAdmin: () => ({ ok: true, record: adminDeleteAdmin_(requireSuperAdmin_(request.token), request.adminId) }),
      changeOwnPassword: () => ({ ok: true, changed: changeOwnPassword_(requireSessionUser_(request.token), request.currentPassword, request.newPassword) }),
      adminUpsertAbsence: () => ({ ok: true, record: adminUpsertAbsence_(requireAdmin_(request.token), request.record) }),
      adminCancelAbsence: () => ({ ok: true, record: adminCancelAbsence_(requireAdmin_(request.token), request.absenceId) }),
      adminUpsertNotice: () => ({ ok: true, record: adminUpsertNotice_(requireAdmin_(request.token), request.record) }),
      adminDeleteNotice: () => ({ ok: true, record: adminDeleteNotice_(requireAdmin_(request.token), request.noticeId) }),
      adminUpsertAssembly: () => ({ ok: true, record: adminUpsertAssembly_(requireAdmin_(request.token), request.record) }),
      adminAssignAssembly: () => ({ ok: true, record: adminAssignAssembly_(requireAdmin_(request.token), request.assemblyId, request.studentId) }),
      adminCancelAssemblyParticipant: () => ({ ok: true, record: cancelAssemblyParticipant_(requireAdmin_(request.token), request.assemblyId, request.studentId) }),
      adminConfirmAssemblyAttendance: () => ({ ok: true, record: adminConfirmAssemblyAttendance_(requireAdmin_(request.token), request.assemblyId, request.studentId) }),
      studentApplyAssembly: () => ({ ok: true, record: studentApplyAssembly_(requireRole_(request.token, 'STUDENT'), request.assemblyId) }),
      studentCancelAssembly: () => ({ ok: true, record: cancelAssemblyParticipant_(requireRole_(request.token, 'STUDENT'), request.assemblyId, null) }),
      clockIn: () => ({ ok: true, record: clockIn_(requireRole_(request.token, 'STUDENT'), request.assemblyId) }),
      clockOut: () => ({ ok: true, record: clockOut_(requireRole_(request.token, 'STUDENT')) }),
      studentCreateSubstitution: () => ({ ok: true, record: studentCreateSubstitution_(requireRole_(request.token, 'STUDENT'), request.scheduleId, request.date, request.reason) }),
      studentApplySubstitution: () => ({ ok: true, record: studentApplySubstitution_(requireRole_(request.token, 'STUDENT'), request.substitutionId) }),
      studentUpdateContact: () => ({ ok: true, record: studentUpdateContact_(requireRole_(request.token, 'STUDENT'), request.email, request.phone) }),
      studentUpsertHandover: () => ({ ok: true, record: studentUpsertHandover_(requireRole_(request.token, 'STUDENT'), request.record) }),
      studentDeleteHandover: () => ({ ok: true, record: studentDeleteHandover_(requireRole_(request.token, 'STUDENT'), request.handoverId) }),
      studentAcknowledgeHandover: () => ({ ok: true, record: studentAcknowledgeHandover_(requireRole_(request.token, 'STUDENT'), request.handoverId) }),
    };
    if (!actions[request.action]) throw new Error('지원하지 않는 요청입니다.');
    if (['health', 'adminLogin', 'studentLogin', 'session', 'logout', 'adminBootstrap', 'studentBootstrap'].includes(request.action)) return actions[request.action]();
    // Keep duplicate clock-ins and simultaneous read/modify/write requests atomic.
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('다른 저장 요청을 처리 중입니다. 잠시 후 다시 시도하세요.');
    try { return actions[request.action](); } finally { lock.releaseLock(); }
  } catch (error) {
    return { ok: false, error: error.message || '서버 처리 중 오류가 발생했습니다.' };
  }
}

function adminLogin_(loginId, password) {
  const id = String(loginId || '').trim();
  const pw = String(password || '');
  if (!id || !pw) throw new Error('관리자 ID와 비밀번호를 입력하세요.');
  const admin = readTable_('Admins').find(row => String(row.loginId || '').trim() === id);
  if (!admin || !isActive_(admin.active) || !admin.passwordHash || !admin.passwordSalt || hashPassword_(pw, admin.passwordSalt) !== String(admin.passwordHash)) throw new Error('관리자 ID 또는 비밀번호를 확인하세요.');
  const role = normalizeAdminRole_(admin);
  const user = { role: role, adminId: admin.adminId, loginId: admin.loginId, name: admin.name || admin.loginId };
  admin.lastLoginAt = new Date();
  upsertRecord_('Admins', admin);
  const token = createSession_(user);
  return { ok: true, token: token, user: user };
}

function studentLogin_(loginId, password) {
  const id = String(loginId || '').trim();
  const pw = String(password || '');
  if (!id || !pw) throw new Error('아이디와 비밀번호를 입력하세요.');
  const student = readTable_('Students').find(row => String(row.loginId || '').trim() === id || String(row.studentNumber || '').trim() === id);
  if (!student || !isActive_(student.active)) throw new Error('아이디 또는 비밀번호를 확인하세요.');
  if (!student.passwordHash || !student.passwordSalt || hashPassword_(pw, student.passwordSalt) !== String(student.passwordHash)) throw new Error('아이디 또는 비밀번호를 확인하세요.');
  validateStudentPeriod_(student);
  const token = createSession_({ role: 'STUDENT', studentId: student.studentId, name: student.name, partId: student.partId });
  return { ok: true, token: token, user: { role: 'STUDENT', studentId: student.studentId, name: student.name, partId: student.partId } };
}

function sessionInfo_(token) {
  const user = requireSession_(token);
  if (user.role === 'STUDENT') {
    const student = findById_('Students', 'studentId', user.studentId);
    validateStudentPeriod_(student);
  } else if (isAdminRole_(user.role)) {
    const admin = findById_('Admins', 'adminId', user.adminId);
    if (!admin || !isActive_(admin.active) || String(admin.loginId) !== String(user.loginId) || normalizeAdminRole_(admin) !== user.role) throw new Error('관리자 권한이 변경되었거나 해제되었습니다. 다시 로그인하세요.');
  }
  return { ok: true, user: user };
}

function createSession_(user) {
  const token = randomToken_();
  CacheService.getScriptCache().put('app-session:' + token, JSON.stringify(user), SESSION_TTL_SECONDS);
  return token;
}
function endSession_(token) { if (token) CacheService.getScriptCache().remove('app-session:' + String(token)); }
function requireSession_(token) { const raw = token && CacheService.getScriptCache().get('app-session:' + String(token)); if (!raw) throw new Error('로그인이 만료되었습니다. 다시 로그인하세요.'); return JSON.parse(raw); }
function requireRole_(token, role) { const user = sessionInfo_(token).user; if (user.role !== role) throw new Error('권한이 없습니다.'); return user; }
function requireSessionUser_(token) { return sessionInfo_(token).user; }
function isAdminRole_(role) { return role === 'SUPER_ADMIN' || role === 'MANAGER'; }
function requireAdmin_(token) { const user = sessionInfo_(token).user; if (!isAdminRole_(user.role)) throw new Error('관리자 권한이 필요합니다.'); return user; }
function requireSuperAdmin_(token) { const user = sessionInfo_(token).user; if (user.role !== 'SUPER_ADMIN') throw new Error('총괄관리자만 수행할 수 있습니다.'); return user; }
function normalizeAdminRole_(admin) {
  const role = String((admin || {}).role || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') return role;
  return String((admin || {}).loginId || '') === 'support-admin' ? 'SUPER_ADMIN' : 'MANAGER';
}

function initializeDatabase(actorEmail) {
  const beforeStudents = countRows_('Students');
  const beforeSchedules = countRows_('Schedules');
  Object.keys(TABLES).forEach(name => ensureTable_(name));
  seedIfEmpty_('Parts', [['SUPPORT', '지원팀', 1, '#0b72b9', true, '', '학생지원·단기근로 운영'], ['RESERVE', '예비군연대', 2, '#2f7f76', true, '', '예비군·병무 운영']]);
  seedIfEmpty_('Semesters', [['2026-2', '2026학년도 2학기', '', '', true, new Date(), actorEmail || 'migration']]);
  seedIfEmpty_('Settings', [['activeSemester', '2026-2'], ['timezone', TIMEZONE], ['ADMIN_EMAILS', 'keun0810@hanyang.ac.kr']]);
  ensureSettingDefault_('defaultHourlyWage', '10320');
  ensureSettingDefault_('defaultWorkStartTime', '09:00');
  ensureSettingDefault_('defaultWorkEndTime', '17:00');
  ensureSettingDefault_('attendanceEnabled', 'true');
  ensureSettingDefault_('substitutionEnabled', 'true');
  ensureSettingDefault_('handoverEnabled', 'true');
  ensureSettingDefault_('nationalWorkDefaultHourlyWage', '10320');
  ensureSettingDefault_('internalWorkDefaultHourlyWage', '10320');
  ensureSettingDefault_('shortTermDefaultHourlyWage', '10320');
  ensureSettingDefault_('otherDefaultHourlyWage', '10320');
  ensureSettingDefault_('assemblyOverbookEnabled', 'false');
  migrateStudentDefaults_();
  migrateAdminRolesAndStudentColorsV6_();
  const version = 'V6-ROLES-ABSENCES-NOTICES-ASSEMBLIES-2026-09-08';
  const migrationApplied = readTable_('MigrationLog').some(row => row.version === version);
  if (!migrationApplied) migrateWorkerTypeBudgetsV5_(actorEmail);
  const afterStudents = countRows_('Students');
  const afterSchedules = countRows_('Schedules');
  if (beforeStudents !== afterStudents || beforeSchedules !== afterSchedules) throw new Error('마이그레이션 중 기존 행 수가 변경되어 중단했습니다.');
  if (!migrationApplied) upsertRecord_('MigrationLog', { migrationId: Utilities.getUuid(), appliedAt: new Date(), version: version, description: '3단계 권한·학생 고유색·결근·공지·소집 시트를 기존 행 삭제 없이 추가', beforeStudents: beforeStudents, afterStudents: afterStudents, beforeSchedules: beforeSchedules, afterSchedules: afterSchedules });
  return '기존 학생 ' + afterStudents + '명과 일정 ' + afterSchedules + '구간을 보존한 채 V6 운영 구조를 추가했습니다.';
}

function migrateAdminRolesAndStudentColorsV6_() {
  const palette = ['#2563EB', '#DC2626', '#059669', '#7C3AED', '#D97706', '#0891B2', '#DB2777', '#4F46E5', '#65A30D', '#9333EA'];
  readTable_('Students').forEach((student, index) => {
    if (!/^#[0-9A-F]{6}$/i.test(String(student.displayColor || ''))) upsertRecord_('Students', { studentId: student.studentId, displayColor: palette[index % palette.length] });
  });
  readTable_('Admins').forEach(admin => {
    const patch = { adminId: admin.adminId };
    let changed = false;
    if (!admin.role) { patch.role = normalizeAdminRole_(admin); changed = true; }
    if (admin.note === undefined) { patch.note = ''; changed = true; }
    if (changed) upsertRecord_('Admins', patch);
  });
}

function migrateWorkerTypeBudgetsV5_(actorEmail) {
  // ensureTable_가 기존 열과 행을 유지한 채 신규 열만 오른쪽에 추가한다.
  // 소속별 supportBudget/reserveBudget은 과거 호환용으로 남기고 근로유형 예산으로 복사하지 않는다.
  ensureSettingDefault_('budgetMigrationNote', 'V5 workerType budgets · ' + String(actorEmail || 'migration'));
}

function migrateOrganizationV4_(actorEmail) {
  const canonical = [
    { partId: 'SUPPORT', partName: '지원팀', displayOrder: 1, color: '#0b72b9', active: true, note: '학생지원·단기근로 운영' },
    { partId: 'RESERVE', partName: '예비군연대', displayOrder: 2, color: '#2f7f76', active: true, note: '예비군·병무 운영' },
  ];
  canonical.forEach(row => upsertRecord_('Parts', row));
  const map = { 'student-support': 'SUPPORT', 'chinese-support': 'SUPPORT', 'reserve-affairs': 'RESERVE' };
  ['Students', 'WorkLogs', 'Tasks', 'Employees', 'Substitutions'].forEach(table => {
    readTable_(table).forEach(row => {
      const next = map[String(row.partId || '')];
      if (next) { row.partId = next; upsertRecord_(table, row); }
    });
  });
  Object.keys(map).forEach(partId => {
    const legacy = findById_('Parts', 'partId', partId);
    if (legacy) upsertRecord_('Parts', { partId: partId, active: false, note: 'V4에서 ' + map[partId] + '로 비파괴 통합됨 · ' + String(actorEmail || 'migration') });
  });
}

function createInitialAdminAccount(loginId, initialPassword, name) {
  initializeDatabase('admin-bootstrap');
  const id = String(loginId || '').trim();
  if (!id) throw new Error('관리자 ID가 필요합니다.');
  validatePassword_(initialPassword);
  const existing = readTable_('Admins').find(row => String(row.loginId || '').trim() === id);
  const record = existing || { adminId: Utilities.getUuid(), loginId: id, createdAt: new Date(), createdBy: 'admin-bootstrap' };
  record.name = String(name || '학생지원팀 관리자');
  record.active = true;
  record.role = id === 'support-admin' ? 'SUPER_ADMIN' : 'MANAGER';
  applyPassword_(record, initialPassword);
  upsertRecord_('Admins', record);
  return { adminId: record.adminId, loginId: record.loginId, name: record.name, active: record.active };
}

function ensureTable_(name, schemaOnly) {
  const sheet = spreadsheet_().getSheetByName(name) || spreadsheet_().insertSheet(name);
  const expected = TABLES[name];
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  else {
    const current = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
    const missing = expected.filter(header => current.indexOf(header) < 0);
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  // Normal record writes must not reformat the entire operational sheet.
  // Explicit initialization retains the original layout/migration behavior.
  if (schemaOnly) return;
  sheet.setFrozenRows(1);
  const width = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, width).setBackground('#e9eef3').setFontColor('#1f2937').setFontWeight('bold').setWrap(true);
  sheet.getDataRange().setVerticalAlignment('middle').setWrap(true);
  (COLUMN_WIDTHS[name] || []).forEach((columnWidth, index) => { if (index < width) sheet.setColumnWidth(index + 1, columnWidth); });
  if (sheet.getLastRow() > 1 && ['Students', 'Schedules', 'WorkLogs', 'Tasks', 'Employees', 'Substitutions', 'Admins'].includes(name) && !sheet.getFilter()) sheet.getRange(1, 1, sheet.getLastRow(), width).createFilter();
}

function migrateStudentDefaults_() {
  readTable_('Students').forEach(student => {
    const patch = { studentId: student.studentId }; let changed = false;
    if (!student.loginId && student.studentNumber) { patch.loginId = String(student.studentNumber); changed = true; }
    if (!student.role) { patch.role = 'STUDENT'; changed = true; }
    if (student.active === '') { patch.active = true; changed = true; }
    if (!student.passwordHash && !student.passwordSalt && student.studentNumber) { applyPassword_(patch, String(student.studentNumber)); changed = true; }
    if (changed) upsertRecord_('Students', patch);
  });
}

function readAdminData_(user) {
  const students = readTable_('Students').map(sanitizeStudentForAdmin_);
  const schedules = readTable_('Schedules');
  const workLogs = withWorkLogFlags_(readTable_('WorkLogs'), students, schedules);
  const data = baseData_({ students: students, schedules: schedules, workLogs: workLogs, substitutions: readTable_('Substitutions'), budgets: readTable_('Budgets'), handovers: readTable_('Handovers').filter(row => isActive_(row.active)), absences: readTable_('Absences'), notices: readTable_('Notices').filter(row => isActive_(row.active)), assemblies: readTable_('Assemblies'), assemblyParticipants: readTable_('AssemblyParticipants') });
  data.currentUser = user;
  data.admins = user.role === 'SUPER_ADMIN' ? readTable_('Admins').filter(row => !row.deletedAt).map(sanitizeAdmin_) : [];
  return data;
}

function readStudentData_(user) {
  const allStudents = readTable_('Students');
  const student = allStudents.find(row => String(row.studentId) === String(user.studentId));
  validateStudentPeriod_(student);
  const semesterId = activeSemesterId_();
  const schedules = readTable_('Schedules').filter(row => String(row.studentId) === String(student.studentId) && String(row.semesterId) === semesterId && isActive_(row.active));
  const workLogs = withWorkLogFlags_(readTable_('WorkLogs').filter(row => String(row.studentId) === String(student.studentId)), [student], schedules);
  const samePartStudents = allStudents.filter(row => row.partId === student.partId && isActive_(row.active)).map(row => ({ studentId: row.studentId, name: row.name, partId: row.partId }));
  const substitutions = readTable_('Substitutions').filter(row => row.partId === student.partId && (row.requesterStudentId === student.studentId || row.status === 'OPEN' || row.substituteStudentId === student.studentId));
  const handovers = readTable_('Handovers').filter(row => isActive_(row.active) && (row.visibility === 'PUBLIC' || row.partId === student.partId || row.authorStudentId === student.studentId || row.targetStudentId === student.studentId));
  const notices = readTable_('Notices').filter(row => noticeVisibleToStudent_(row, student));
  const assemblies = readTable_('Assemblies').filter(row => assemblyVisibleToStudent_(row, student));
  const assemblyIds = assemblies.map(row => String(row.assemblyId));
  const participants = readTable_('AssemblyParticipants').filter(row => String(row.studentId) === String(student.studentId) && assemblyIds.indexOf(String(row.assemblyId)) >= 0);
  // 지원팀과 예비군연대가 같은 사무실의 업무 정보를 함께 확인한다.
  // 대체근무 후보는 기존 정책대로 같은 파트에만 제한한다.
  const data = baseData_({ students: [sanitizeStudentForSelf_(student)], schedules: schedules, workLogs: workLogs, tasks: readTable_('Tasks').filter(row => isActive_(row.active)), substitutions: substitutions, substitutionCandidates: samePartStudents, handovers: handovers, absences: readTable_('Absences').filter(row => String(row.studentId) === String(student.studentId)), notices: notices, assemblies: assemblies, assemblyParticipants: participants });
  data.budgets = [];
  const studentSettings = {};
  ['activeSemester', 'timezone', 'attendanceEnabled', 'substitutionEnabled', 'handoverEnabled', 'defaultWorkStartTime', 'defaultWorkEndTime'].forEach(key => { if (key in data.settings) studentSettings[key] = data.settings[key]; });
  data.settings = studentSettings;
  data.currentUser = { role: 'STUDENT', studentId: student.studentId, name: student.name, partId: student.partId };
  return data;
}

function baseData_(overrides) { return Object.assign({ parts: readTable_('Parts').filter(row => isActive_(row.active)), students: [], schedules: [], workLogs: [], tasks: readTable_('Tasks'), employees: readTable_('Employees'), semesters: readTable_('Semesters'), settings: settingsObject_(), substitutions: [], substitutionCandidates: [], budgets: readTable_('Budgets'), handovers: [], admins: [], absences: [], notices: [], assemblies: [], assemblyParticipants: [] }, overrides || {}); }
function sanitizeStudentForAdmin_(student) { const copy = Object.assign({}, student); delete copy.passwordHash; delete copy.passwordSalt; copy.hasPassword = Boolean(student.passwordHash && student.passwordSalt); return copy; }
function sanitizeStudentForSelf_(student) { return { studentId: student.studentId, name: student.name, studentNumber: student.studentNumber, partId: student.partId, workerType: student.workerType, startDate: student.startDate, endDate: student.endDate, taskSummary: student.taskSummary, substituteTasks: student.substituteTasks, active: student.active, email: student.email, phone: student.phone, displayColor: student.displayColor }; }
function sanitizeAdmin_(admin) { const copy = Object.assign({}, admin); delete copy.passwordHash; delete copy.passwordSalt; copy.role = normalizeAdminRole_(admin); copy.hasPassword = Boolean(admin.passwordHash && admin.passwordSalt); return copy; }

function adminUpsertStudent_(user, input, initialPassword) {
  const incoming = Object.assign({}, input || {}); const existing = incoming.studentId && findById_('Students', 'studentId', incoming.studentId); const record = Object.assign({}, existing || {}, incoming);
  if (user.role !== 'SUPER_ADMIN' && !existing) throw new Error('학생 계정 생성은 총괄관리자만 가능합니다.');
  if (user.role !== 'SUPER_ADMIN' && existing && Boolean(record.active) !== Boolean(existing.active)) throw new Error('학생 계정 활성 상태 변경은 총괄관리자만 가능합니다.');
  if (!record.name || !record.studentNumber || !record.partId) throw new Error('이름, 학번, 파트를 입력하세요.');
  if (!['NATIONAL_WORK', 'INTERNAL_WORK', 'SHORT_TERM', 'OTHER'].includes(String(record.workerType))) throw new Error('근로유형을 확인하세요.');
  if (record.workerType === 'SHORT_TERM' && (!record.startDate || !record.endDate)) throw new Error('단기근로자는 시작일과 종료일이 필요합니다.');
  if (record.startDate && record.endDate && record.startDate > record.endDate) throw new Error('근무 종료일은 시작일 이후여야 합니다.');
  record.studentId = record.studentId || Utilities.getUuid(); record.loginId = record.loginId || String(record.studentNumber); record.role = 'STUDENT'; record.active = record.active !== false;
  if (record.displayColor && !/^#[0-9A-F]{6}$/i.test(String(record.displayColor))) throw new Error('학생 색상은 HEX 형식이어야 합니다.');
  const duplicate = readTable_('Students').find(row => row.studentId !== record.studentId && (String(row.loginId || '') === String(record.loginId || '') || String(row.studentNumber || '') === String(record.studentNumber || '')));
  if (duplicate) throw new Error('이미 사용 중인 학번 또는 로그인 ID입니다.');
  if (initialPassword) applyPassword_(record, initialPassword);
  else if (!record.passwordHash && !findById_('Students', 'studentId', record.studentId)) applyPassword_(record, String(record.studentNumber));
  return sanitizeStudentForAdmin_(upsertRecord_('Students', record));
}

function adminResetPassword_(user, studentId, newPassword) { validatePassword_(newPassword); const student = findById_('Students', 'studentId', studentId); if (!student) throw new Error('학생을 찾을 수 없습니다.'); applyPassword_(student, newPassword); return sanitizeStudentForAdmin_(upsertRecord_('Students', student)); }
function adminResetPasswordToStudentNumber_(user, studentId) { const student = findById_('Students', 'studentId', studentId); if (!student || !student.studentNumber) throw new Error('학번을 확인하세요.'); applyPassword_(student, String(student.studentNumber)); return sanitizeStudentForAdmin_(upsertRecord_('Students', student)); }
function studentUpdateContact_(user, email, phone) { const student = findById_('Students', 'studentId', user.studentId); validateStudentPeriod_(student); student.email = String(email || '').trim(); student.phone = String(phone || '').trim(); return sanitizeStudentForSelf_(upsertRecord_('Students', student)); }

function adminUpsertAdmin_(user, input, initialPassword) {
  const incoming = Object.assign({}, input || {});
  const existing = incoming.adminId && findById_('Admins', 'adminId', incoming.adminId);
  const record = Object.assign({}, existing || {}, incoming);
  if (!record.name || !record.loginId) throw new Error('이름과 로그인 ID를 입력하세요.');
  record.role = String(record.role || 'MANAGER').toUpperCase();
  if (!['SUPER_ADMIN', 'MANAGER'].includes(record.role)) throw new Error('관리자 권한을 확인하세요.');
  record.adminId = record.adminId || Utilities.getUuid();
  record.active = record.active !== false;
  record.note = safeText_(record.note, 500);
  const duplicate = readTable_('Admins').find(row => String(row.adminId) !== String(record.adminId) && String(row.loginId || '').trim() === String(record.loginId).trim());
  if (duplicate) throw new Error('이미 사용 중인 관리자 ID입니다.');
  if (!existing && !initialPassword) throw new Error('초기 비밀번호를 입력하세요.');
  if (initialPassword) applyPassword_(record, initialPassword);
  record.createdAt = existing ? existing.createdAt : new Date();
  record.createdBy = existing ? existing.createdBy : actorId_(user);
  record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  if (existing && normalizeAdminRole_(existing) === 'SUPER_ADMIN' && record.role !== 'SUPER_ADMIN') assertSuperAdminRemains_(existing.adminId);
  return sanitizeAdmin_(upsertRecord_('Admins', record));
}

function adminResetAdminPassword_(user, adminId, newPassword) {
  const record = findById_('Admins', 'adminId', adminId);
  if (!record) throw new Error('관리자 계정을 찾을 수 없습니다.');
  applyPassword_(record, newPassword); record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return sanitizeAdmin_(upsertRecord_('Admins', record));
}

function adminDeactivateAdmin_(user, adminId) {
  const record = findById_('Admins', 'adminId', adminId);
  if (!record) throw new Error('관리자 계정을 찾을 수 없습니다.');
  if (String(record.adminId) === String(user.adminId)) throw new Error('현재 로그인한 본인 계정은 비활성화할 수 없습니다.');
  if (normalizeAdminRole_(record) === 'SUPER_ADMIN') assertSuperAdminRemains_(record.adminId);
  record.active = false; record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return sanitizeAdmin_(upsertRecord_('Admins', record));
}

function adminDeleteAdmin_(user, adminId) {
  const record = findById_('Admins', 'adminId', adminId);
  if (!record || record.deletedAt) throw new Error('삭제할 관리자 계정을 찾을 수 없습니다.');
  if (String(record.adminId) === String(user.adminId)) throw new Error('현재 로그인한 본인 계정은 삭제할 수 없습니다.');
  if (normalizeAdminRole_(record) === 'SUPER_ADMIN') assertSuperAdminRemains_(record.adminId);
  record.active = false; record.deletedAt = new Date(); record.deletedBy = actorId_(user); record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return sanitizeAdmin_(upsertRecord_('Admins', record));
}

function assertSuperAdminRemains_(excludedAdminId) {
  const remaining = readTable_('Admins').filter(row => String(row.adminId) !== String(excludedAdminId) && isActive_(row.active) && normalizeAdminRole_(row) === 'SUPER_ADMIN');
  if (!remaining.length) throw new Error('마지막 총괄관리자 계정은 권한 변경 또는 비활성화할 수 없습니다.');
}

function changeOwnPassword_(user, currentPassword, newPassword) {
  validatePassword_(newPassword);
  const table = user.role === 'STUDENT' ? 'Students' : 'Admins';
  const idKey = user.role === 'STUDENT' ? 'studentId' : 'adminId';
  const id = user[idKey];
  const record = findById_(table, idKey, id);
  if (!record || hashPassword_(String(currentPassword || ''), record.passwordSalt) !== String(record.passwordHash || '')) throw new Error('현재 비밀번호가 일치하지 않습니다.');
  if (String(currentPassword) === String(newPassword)) throw new Error('새 비밀번호는 현재 비밀번호와 다르게 입력하세요.');
  applyPassword_(record, newPassword);
  if (table === 'Admins') { record.updatedAt = new Date(); record.updatedBy = actorId_(user); }
  upsertRecord_(table, record);
  return true;
}

function adminUpsertSchedule_(user, input) {
  const record = Object.assign({}, input || {}); const student = findById_('Students', 'studentId', record.studentId);
  if (!student) throw new Error('학생을 찾을 수 없습니다.');
  if (record.date) {
    const date = new Date(String(record.date) + 'T12:00:00+09:00');
    if (Number.isNaN(date.getTime()) || date.getDay() < 1 || date.getDay() > 5) throw new Error('평일 날짜를 확인하세요.');
    record.dayOfWeek = date.getDay();
  }
  if (![1, 2, 3, 4, 5].includes(Number(record.dayOfWeek))) throw new Error('요일을 확인하세요.');
  record.period = record.period || 'TERM';
  if (!['TERM', 'VACATION'].includes(record.period)) throw new Error('학기 중/방학 구분을 확인하세요.');
  validateHalfHour_(record.startTime); validateHalfHour_(record.endTime);
  if (timeMinutes_(record.startTime) >= timeMinutes_(record.endTime)) throw new Error('종료시간은 시작시간보다 늦어야 합니다.');
  record.scheduleId = record.scheduleId || Utilities.getUuid(); record.semesterId = record.semesterId || activeSemesterId_(); record.active = record.active !== false; record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return upsertRecord_('Schedules', record);
}

function adminUpsertWorkLog_(user, input) {
  const record = Object.assign({}, input || {}); const student = findById_('Students', 'studentId', record.studentId);
  if (!student) throw new Error('학생을 찾을 수 없습니다.');
  if (!record.date || !record.clockIn) throw new Error('학생, 날짜, 출근시각은 필수입니다.');
  const start = parseDateTime_(record.date, record.clockIn); const end = record.clockOut ? parseDateTime_(record.date, record.clockOut) : null;
  if (end && end.getTime() < start.getTime()) throw new Error('퇴근시각은 출근시각보다 늦어야 합니다.');
  const existing = record.logId && findById_('WorkLogs', 'logId', record.logId);
  record.logId = record.logId || Utilities.getUuid(); record.clockIn = start; record.clockOut = end || ''; record.minutes = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : 0; record.status = end ? 'COMPLETE' : 'WORKING'; record.partId = student.partId; record.editedBy = actorId_(user); record.editedAt = new Date(); record.createdBy = existing ? existing.createdBy : actorId_(user); record.createdAt = existing ? existing.createdAt : new Date(); record.flagCode = computeLogFlag_(record, student, readTable_('Schedules'), readTable_('WorkLogs').filter(row => row.logId !== record.logId));
  return upsertRecord_('WorkLogs', record);
}

function adminCancelWorkLog_(user, logId, reason) {
  const record = findById_('WorkLogs', 'logId', logId);
  if (!record) throw new Error('근무기록을 찾을 수 없습니다.');
  record.status = 'CANCELLED'; record.reason = String(reason || '관리자 삭제 처리'); record.editedBy = actorId_(user); record.editedAt = new Date();
  return upsertRecord_('WorkLogs', record);
}

function adminUpsertTask_(user, input) { const record = Object.assign({}, input || {}); if (!record.taskName) throw new Error('업무명을 입력하세요.'); record.taskId = record.taskId || Utilities.getUuid(); record.active = record.active !== false; record.updatedAt = new Date(); record.updatedBy = actorId_(user); return upsertRecord_('Tasks', record); }
function adminUpsertPart_(user, input) { const record = Object.assign({}, input || {}); if (!record.partId || !record.partName) throw new Error('파트 ID와 이름을 입력하세요.'); if (!/^[A-Z0-9_-]+$/.test(String(record.partId))) throw new Error('파트 ID는 영문 대문자·숫자·_-만 사용할 수 있습니다.'); record.active = record.active !== false; return upsertRecord_('Parts', record); }
function adminCreateSemester_(user, input) { const record = Object.assign({}, input || {}); if (!record.semesterId || !record.semesterName || !record.startDate || !record.endDate) throw new Error('학기 정보를 모두 입력하세요.'); if (record.startDate > record.endDate) throw new Error('학기 종료일을 확인하세요.'); if (findById_('Semesters', 'semesterId', record.semesterId)) throw new Error('이미 존재하는 학기입니다.'); record.active = false; record.createdAt = new Date(); record.createdBy = actorId_(user); return upsertRecord_('Semesters', record); }
function adminUpsertSemester_(user, input) {
  const record = Object.assign({}, input || {});
  if (!record.semesterId || !record.semesterName || !record.startDate || !record.endDate) throw new Error('학기 정보를 모두 입력하세요.');
  if (record.startDate > record.endDate) throw new Error('학기 종료일을 확인하세요.');
  const existing = findById_('Semesters', 'semesterId', record.semesterId);
  ['vacationStartDate', 'vacationStartedAt', 'vacationStartedBy'].forEach(key => { record[key] = existing ? existing[key] || '' : ''; });
  if (record.vacationStartDate && (record.vacationStartDate < record.startDate || record.vacationStartDate > record.endDate)) throw new Error('방학 시작일을 포함한 근로 운영기간을 설정하세요.');
  record.active = existing ? existing.active : false; record.createdAt = existing ? existing.createdAt : new Date(); record.createdBy = existing ? existing.createdBy : actorId_(user);
  return upsertRecord_('Semesters', record);
}
function adminActivateSemester_(user, semesterId) { if (!findById_('Semesters', 'semesterId', semesterId)) throw new Error('학기를 찾을 수 없습니다.'); readTable_('Semesters').forEach(row => upsertRecord_('Semesters', { semesterId: row.semesterId, active: row.semesterId === semesterId })); setSetting_('activeSemester', semesterId); return semesterId; }

// Class end is an explicit admin event, not the end of the work contract.
function adminStartVacation_(user, semesterId) {
  if (String(semesterId) !== String(activeSemesterId_())) throw new Error('현재 운영 학기만 방학으로 전환할 수 있습니다.');
  const term = findById_('Semesters', 'semesterId', semesterId);
  if (!term) throw new Error('학기를 찾을 수 없습니다.');
  if (term.vacationStartDate) return term;
  const today = today_();
  if (!term.startDate || !term.endDate || today < term.startDate || today > term.endDate) throw new Error('근로 운영기간을 먼저 확인하세요.');
  return upsertRecord_('Semesters', Object.assign({}, term, { vacationStartDate: today, vacationStartedAt: new Date(), vacationStartedBy: actorId_(user) }));
}
function scheduleMatchesPeriod_(schedule, term, date) {
  return (schedule.period || 'TERM') === (term && term.vacationStartDate && date >= term.vacationStartDate ? 'VACATION' : 'TERM');
}
function adminSaveSettings_(user, values) { const wage = Number((values || {}).defaultHourlyWage || settingsObject_().defaultHourlyWage || 0); if (wage <= 0) throw new Error('기본 시급은 0보다 커야 합니다.'); Object.keys(values || {}).forEach(key => { if (key !== 'ADMIN_EMAILS') setSetting_(key, values[key]); }); return settingsObject_(); }

function adminUpsertBudget_(user, input) {
  const record = Object.assign({}, input || {});
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(record.month || ''))) throw new Error('예산 월을 확인하세요.');
  ['totalBudget', 'nationalBudget', 'internalBudget', 'shortTermBudget'].forEach(key => { record[key] = optionalBudget_(record[key]); });
  record.note = safeText_(record.note, 500); record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return upsertRecord_('Budgets', record);
}

function optionalBudget_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('예산은 0원 이상으로 입력하세요.');
  return Math.round(amount);
}

function adminUpsertAbsence_(user, input) {
  const incoming = Object.assign({}, input || {});
  const existing = incoming.absenceId && findById_('Absences', 'absenceId', incoming.absenceId);
  const record = Object.assign({}, existing || {}, incoming);
  if (!record.studentId || !record.date || !record.scheduledStart || !record.scheduledEnd) throw new Error('학생, 날짜, 예정 근무시간을 입력하세요.');
  if (!findById_('Students', 'studentId', record.studentId)) throw new Error('학생을 찾을 수 없습니다.');
  if (!['ABSENT', 'SICK', 'EXCUSED', 'OTHER'].includes(String(record.type))) throw new Error('결근 유형을 확인하세요.');
  validateHalfHour_(record.scheduledStart); validateHalfHour_(record.scheduledEnd);
  if (timeMinutes_(record.scheduledStart) >= timeMinutes_(record.scheduledEnd)) throw new Error('예정 종료시간을 확인하세요.');
  if (readTable_('WorkLogs').some(row => String(row.studentId) === String(record.studentId) && row.date === record.date && ['WORKING', 'COMPLETE'].includes(String(row.status)))) throw new Error('실제 근무기록이 있는 날짜는 먼저 근무기록을 확인하세요.');
  record.absenceId = record.absenceId || Utilities.getUuid();
  record.reason = safeText_(record.reason, 500); record.note = safeText_(record.note, 1000);
  record.status = 'ACTIVE'; record.createdAt = existing ? existing.createdAt : new Date(); record.createdBy = existing ? existing.createdBy : actorId_(user); record.updatedAt = new Date(); record.updatedBy = actorId_(user); record.cancelledAt = ''; record.cancelledBy = '';
  return upsertRecord_('Absences', record);
}

function adminCancelAbsence_(user, absenceId) {
  const record = findById_('Absences', 'absenceId', absenceId);
  if (!record || record.status === 'CANCELLED') throw new Error('취소할 결근 기록을 찾을 수 없습니다.');
  record.status = 'CANCELLED'; record.cancelledAt = new Date(); record.cancelledBy = actorId_(user); record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return upsertRecord_('Absences', record);
}

function adminUpsertNotice_(user, input) {
  const incoming = Object.assign({}, input || {});
  const existing = incoming.noticeId && findById_('Notices', 'noticeId', incoming.noticeId);
  if (existing && user.role !== 'SUPER_ADMIN' && String(existing.authorId) !== String(user.adminId)) throw new Error('본인이 작성한 공지만 수정할 수 있습니다.');
  const record = Object.assign({}, existing || {}, incoming);
  if (!record.title || !record.content) throw new Error('공지 제목과 내용을 입력하세요.');
  if (!['ALL', 'STUDENT', 'MANAGER', 'PART'].includes(String(record.target || 'ALL'))) throw new Error('공지 대상을 확인하세요.');
  if (record.target === 'PART' && !record.targetValue) throw new Error('공지 대상 파트를 선택하세요.');
  if (record.startDate && record.endDate && record.startDate > record.endDate) throw new Error('공지 종료일을 확인하세요.');
  record.noticeId = record.noticeId || Utilities.getUuid(); record.title = safeText_(record.title, 160); record.content = safeText_(record.content, 4000); record.target = record.target || 'ALL'; record.pinned = Boolean(record.pinned === true || String(record.pinned).toUpperCase() === 'TRUE'); record.active = record.active !== false;
  record.authorId = existing ? existing.authorId : user.adminId; record.authorName = existing ? existing.authorName : user.name; record.authorRole = existing ? existing.authorRole : user.role; record.createdAt = existing ? existing.createdAt : new Date(); record.updatedAt = new Date();
  return upsertRecord_('Notices', record);
}

function adminDeleteNotice_(user, noticeId) {
  const record = findById_('Notices', 'noticeId', noticeId);
  if (!record || !isActive_(record.active)) throw new Error('공지를 찾을 수 없습니다.');
  if (user.role !== 'SUPER_ADMIN' && String(record.authorId) !== String(user.adminId)) throw new Error('본인이 작성한 공지만 삭제할 수 있습니다.');
  record.active = false; record.deletedAt = new Date(); record.deletedBy = actorId_(user); record.updatedAt = new Date();
  return upsertRecord_('Notices', record);
}

function noticeVisibleToStudent_(notice, student) {
  if (!isActive_(notice.active)) return false;
  const today = today_();
  if (notice.startDate && today < notice.startDate) return false;
  if (notice.endDate && today > notice.endDate) return false;
  if (notice.target === 'MANAGER') return false;
  if (notice.target === 'PART') return String(notice.targetValue) === String(student.partId);
  return notice.target === 'ALL' || notice.target === 'STUDENT' || !notice.target;
}

function adminUpsertAssembly_(user, input) {
  const incoming = Object.assign({}, input || {});
  const existing = incoming.assemblyId && findById_('Assemblies', 'assemblyId', incoming.assemblyId);
  const record = Object.assign({}, existing || {}, incoming);
  if (!record.title || !record.date || !record.startTime || !record.endTime || !record.place) throw new Error('제목, 날짜, 시간, 장소를 입력하세요.');
  validateHalfHour_(record.startTime); validateHalfHour_(record.endTime);
  if (timeMinutes_(record.startTime) >= timeMinutes_(record.endTime)) throw new Error('소집 종료시간을 확인하세요.');
  record.capacity = Math.max(1, Math.floor(Number(record.capacity || 0)));
  if (!Number.isFinite(record.capacity)) throw new Error('필요 인원을 확인하세요.');
  if (!['ALL', 'PART', 'WORKER_TYPE', 'STUDENT'].includes(String(record.target || 'ALL'))) throw new Error('소집 대상을 확인하세요.');
  if (record.target !== 'ALL' && !record.targetValue) throw new Error('소집 대상 값을 선택하세요.');
  record.mode = record.mode === 'ASSIGNED' ? 'ASSIGNED' : 'SELF';
  record.status = existing ? String(record.status || existing.status) : 'OPEN';
  if (!['OPEN', 'FULL', 'CLOSED', 'COMPLETED', 'CANCELLED'].includes(record.status)) throw new Error('소집 상태를 확인하세요.');
  record.assemblyId = record.assemblyId || Utilities.getUuid(); record.title = safeText_(record.title, 160); record.content = safeText_(record.content, 4000); record.place = safeText_(record.place, 300); record.note = safeText_(record.note, 1000); record.creditHours = Boolean(record.creditHours === true || String(record.creditHours).toUpperCase() === 'TRUE'); record.managerId = record.managerId || user.adminId; record.createdAt = existing ? existing.createdAt : new Date(); record.createdBy = existing ? existing.createdBy : actorId_(user); record.updatedAt = new Date(); record.updatedBy = actorId_(user);
  return upsertRecord_('Assemblies', record);
}

function assemblyVisibleToStudent_(assembly, student) {
  if (!assembly || assembly.status === 'CANCELLED') return false;
  if (assembly.target === 'ALL' || !assembly.target) return true;
  if (assembly.target === 'PART') return String(assembly.targetValue) === String(student.partId);
  if (assembly.target === 'WORKER_TYPE') return String(assembly.targetValue) === String(student.workerType);
  if (assembly.target === 'STUDENT') return String(assembly.targetValue).split(',').map(String).indexOf(String(student.studentId)) >= 0;
  return false;
}

function activeAssemblyParticipants_(assemblyId) { return readTable_('AssemblyParticipants').filter(row => String(row.assemblyId) === String(assemblyId) && row.status !== 'CANCELLED'); }
function updateAssemblyCapacityStatus_(assembly) {
  if (!assembly || !['OPEN', 'FULL'].includes(String(assembly.status))) return assembly;
  const full = activeAssemblyParticipants_(assembly.assemblyId).length >= Number(assembly.capacity || 0);
  assembly.status = full ? 'FULL' : 'OPEN'; assembly.updatedAt = new Date();
  return upsertRecord_('Assemblies', assembly);
}

function studentApplyAssembly_(user, assemblyId) {
  const assembly = findById_('Assemblies', 'assemblyId', assemblyId); const student = findById_('Students', 'studentId', user.studentId); validateStudentPeriod_(student);
  if (!assembly || assembly.mode !== 'SELF' || !['OPEN', 'FULL'].includes(String(assembly.status)) || !assemblyVisibleToStudent_(assembly, student)) throw new Error('신청 가능한 소집이 아닙니다.');
  const existing = readTable_('AssemblyParticipants').find(row => String(row.assemblyId) === String(assemblyId) && String(row.studentId) === String(user.studentId));
  if (existing && existing.status !== 'CANCELLED') throw new Error('이미 신청 또는 배정된 소집입니다.');
  const overbook = settingEnabled_('assemblyOverbookEnabled');
  if (!overbook && activeAssemblyParticipants_(assemblyId).length >= Number(assembly.capacity || 0)) throw new Error('모집 인원이 마감되었습니다.');
  const record = Object.assign({}, existing || {}, { participantId: existing ? existing.participantId : Utilities.getUuid(), assemblyId: assemblyId, studentId: user.studentId, status: 'APPLIED', source: 'SELF', appliedAt: new Date(), assignedAt: '', updatedAt: new Date(), updatedBy: user.studentId, workLogId: '', attendanceConfirmedAt: '' });
  const saved = upsertRecord_('AssemblyParticipants', record); updateAssemblyCapacityStatus_(assembly); return saved;
}

function adminAssignAssembly_(user, assemblyId, studentId) {
  const assembly = findById_('Assemblies', 'assemblyId', assemblyId); const student = findById_('Students', 'studentId', studentId);
  if (!assembly || !student || !assemblyVisibleToStudent_(assembly, student) || ['COMPLETED', 'CANCELLED'].includes(String(assembly.status))) throw new Error('배정 가능한 소집 또는 학생이 아닙니다.');
  const existing = readTable_('AssemblyParticipants').find(row => String(row.assemblyId) === String(assemblyId) && String(row.studentId) === String(studentId));
  if (existing && existing.status !== 'CANCELLED') throw new Error('이미 신청 또는 배정된 학생입니다.');
  if (!settingEnabled_('assemblyOverbookEnabled') && activeAssemblyParticipants_(assemblyId).length >= Number(assembly.capacity || 0)) throw new Error('필요 인원을 초과할 수 없습니다.');
  const record = Object.assign({}, existing || {}, { participantId: existing ? existing.participantId : Utilities.getUuid(), assemblyId: assemblyId, studentId: studentId, status: 'CONFIRMED', source: 'ASSIGNED', appliedAt: '', assignedAt: new Date(), updatedAt: new Date(), updatedBy: actorId_(user), workLogId: '', attendanceConfirmedAt: '' });
  const saved = upsertRecord_('AssemblyParticipants', record); updateAssemblyCapacityStatus_(assembly); return saved;
}

function cancelAssemblyParticipant_(user, assemblyId, requestedStudentId) {
  const studentId = user.role === 'STUDENT' ? user.studentId : requestedStudentId;
  const participant = readTable_('AssemblyParticipants').find(row => String(row.assemblyId) === String(assemblyId) && String(row.studentId) === String(studentId));
  if (!participant || participant.status === 'CANCELLED' || participant.status === 'COMPLETED') throw new Error('취소할 신청 또는 배정을 찾을 수 없습니다.');
  if (user.role === 'STUDENT' && participant.source !== 'SELF') throw new Error('관리자 지정 소집은 학생이 취소할 수 없습니다.');
  participant.status = 'CANCELLED'; participant.updatedAt = new Date(); participant.updatedBy = actorId_(user); const saved = upsertRecord_('AssemblyParticipants', participant); updateAssemblyCapacityStatus_(findById_('Assemblies', 'assemblyId', assemblyId)); return saved;
}

function adminConfirmAssemblyAttendance_(user, assemblyId, studentId) {
  const assembly = findById_('Assemblies', 'assemblyId', assemblyId); const student = findById_('Students', 'studentId', studentId);
  const participant = readTable_('AssemblyParticipants').find(row => String(row.assemblyId) === String(assemblyId) && String(row.studentId) === String(studentId) && row.status !== 'CANCELLED');
  if (!assembly || !student || !participant) throw new Error('소집 참여 기록을 확인하세요.');
  if (!(assembly.creditHours === true || String(assembly.creditHours).toUpperCase() === 'TRUE')) throw new Error('근로시간 미인정 소집입니다.');
  if (participant.workLogId) return participant;
  const start = parseDateTime_(assembly.date, assembly.startTime); const end = parseDateTime_(assembly.date, assembly.endTime);
  const overlap = readTable_('WorkLogs').some(row => String(row.studentId) === String(studentId) && row.status !== 'CANCELLED' && row.clockIn && row.clockOut && start.getTime() < new Date(row.clockOut).getTime() && end.getTime() > new Date(row.clockIn).getTime());
  if (overlap) throw new Error('같은 시간대의 기존 근무기록과 중복됩니다.');
  const log = upsertRecord_('WorkLogs', { logId: Utilities.getUuid(), studentId: studentId, date: assembly.date, clockIn: start, clockOut: end, minutes: Math.round((end.getTime() - start.getTime()) / 60000), status: 'COMPLETE', note: '소집 참석 관리자 확인: ' + assembly.title, scheduleId: '', partId: student.partId, reason: '소집 근무 확인', editedBy: actorId_(user), editedAt: new Date(), createdBy: actorId_(user), createdAt: new Date(), flagCode: '', sourceType: 'ASSEMBLY', assemblyId: assemblyId });
  participant.status = 'COMPLETED'; participant.workLogId = log.logId; participant.attendanceConfirmedAt = new Date(); participant.updatedAt = new Date(); participant.updatedBy = actorId_(user);
  return upsertRecord_('AssemblyParticipants', participant);
}

function validateHandover_(record) {
  if (!record.date || !record.partId || !record.title || !record.content) throw new Error('날짜, 조직, 제목, 내용을 입력하세요.');
  if (!['OPEN', 'IN_PROGRESS', 'DONE'].includes(String(record.status))) throw new Error('인수인계 상태를 확인하세요.');
  if (!['NORMAL', 'IMPORTANT'].includes(String(record.priority))) throw new Error('인수인계 중요도를 확인하세요.');
  record.title = safeText_(record.title, 120); record.content = safeText_(record.content, 2000); record.visibility = record.visibility === 'PART' ? 'PART' : 'PUBLIC'; record.active = record.active !== false;
  record.completedAt = record.status === 'DONE' ? (record.completedAt || new Date()) : '';
}

function adminUpsertHandover_(user, input) {
  const incoming = Object.assign({}, input || {}); const existing = incoming.handoverId && findById_('Handovers', 'handoverId', incoming.handoverId); const record = Object.assign({}, existing || {}, incoming);
  record.handoverId = record.handoverId || Utilities.getUuid(); record.createdAt = existing ? existing.createdAt : new Date(); record.updatedAt = new Date();
  record.pinned = record.pinned === true || String(record.pinned).toUpperCase() === 'TRUE';
  if (record.authorStudentId && !findById_('Students', 'studentId', record.authorStudentId)) throw new Error('작성 학생을 찾을 수 없습니다.');
  validateHandover_(record); return upsertRecord_('Handovers', record);
}

function adminDeleteHandover_(user, handoverId) {
  const record = findById_('Handovers', 'handoverId', handoverId); if (!record) throw new Error('인수인계를 찾을 수 없습니다.');
  record.active = false; record.deletedAt = new Date(); record.deletedBy = actorId_(user); record.updatedAt = new Date(); return upsertRecord_('Handovers', record);
}

function studentUpsertHandover_(user, input) {
  if (!settingEnabled_('handoverEnabled')) throw new Error('현재 인수인계 작성이 중지되어 있습니다.');
  const student = findById_('Students', 'studentId', user.studentId); validateStudentPeriod_(student);
  const incoming = Object.assign({}, input || {}); const existing = incoming.handoverId && findById_('Handovers', 'handoverId', incoming.handoverId); const record = Object.assign({}, existing || {}, incoming);
  if (existing && existing.authorStudentId !== user.studentId) throw new Error('본인이 작성한 인수인계만 수정할 수 있습니다.');
  record.handoverId = record.handoverId || Utilities.getUuid(); record.partId = student.partId; record.authorStudentId = user.studentId; record.priority = existing ? existing.priority : 'NORMAL'; record.pinned = existing ? existing.pinned : false; record.acknowledgedBy = existing ? existing.acknowledgedBy : ''; record.createdAt = existing ? existing.createdAt : new Date(); record.updatedAt = new Date();
  validateHandover_(record); return upsertRecord_('Handovers', record);
}

function studentDeleteHandover_(user, handoverId) {
  const record = findById_('Handovers', 'handoverId', handoverId);
  if (!record || !isActive_(record.active)) throw new Error('공유메모를 찾을 수 없습니다.');
  if (String(record.authorStudentId) !== String(user.studentId)) throw new Error('본인이 작성한 공유메모만 삭제할 수 있습니다.');
  record.active = false; record.deletedAt = new Date(); record.deletedBy = user.studentId; record.updatedAt = new Date();
  return upsertRecord_('Handovers', record);
}

function studentAcknowledgeHandover_(user, handoverId) {
  const record = findById_('Handovers', 'handoverId', handoverId);
  const student = findById_('Students', 'studentId', user.studentId); validateStudentPeriod_(student);
  if (!record || !isActive_(record.active) || (record.visibility !== 'PUBLIC' && record.partId !== student.partId)) throw new Error('확인할 수 있는 공유메모가 아닙니다.');
  const ids = String(record.acknowledgedBy || '').split(',').map(value => value.trim()).filter(Boolean);
  if (ids.indexOf(user.studentId) < 0) ids.push(user.studentId);
  record.acknowledgedBy = ids.join(','); record.updatedAt = new Date();
  return upsertRecord_('Handovers', record);
}

function clockIn_(user, assemblyId) {
  if (!settingEnabled_('attendanceEnabled')) throw new Error('현재 출퇴근 기록이 중지되어 있습니다.');
  const student = findById_('Students', 'studentId', user.studentId); validateStudentPeriod_(student); const today = today_();
  if (readTable_('WorkLogs').some(row => row.studentId === student.studentId && row.status === 'WORKING')) throw new Error('이미 진행 중인 출근 기록이 있습니다.');
  let assembly = null;
  if (assemblyId) {
    assembly = findById_('Assemblies', 'assemblyId', assemblyId);
    const participant = readTable_('AssemblyParticipants').find(row => String(row.assemblyId) === String(assemblyId) && String(row.studentId) === String(student.studentId) && row.status !== 'CANCELLED');
    const creditHours = assembly && (assembly.creditHours === true || String(assembly.creditHours).toUpperCase() === 'TRUE');
    if (!assembly || !participant || assembly.date !== today || !creditHours || ['CANCELLED', 'COMPLETED'].includes(String(assembly.status))) throw new Error('출근 가능한 소집이 아닙니다.');
  }
  if (!assembly && readTable_('Absences').some(row => String(row.studentId) === String(student.studentId) && row.date === today && row.status === 'ACTIVE')) throw new Error('오늘 결근 처리되어 있습니다. 관리자에게 결근 취소를 요청하세요.');
  const schedules = assembly ? [] : todaySchedules_(student.studentId, today); const now = new Date(); const flag = assembly || schedules.length ? '' : 'OUTSIDE_SCHEDULE';
  return upsertRecord_('WorkLogs', { logId: Utilities.getUuid(), studentId: student.studentId, date: today, clockIn: now, clockOut: '', minutes: 0, status: 'WORKING', note: assembly ? '소집 근무: ' + assembly.title : '', scheduleId: assembly ? '' : nearestScheduleId_(schedules), partId: student.partId, reason: '', editedBy: '', editedAt: '', createdBy: student.studentId, createdAt: now, flagCode: flag, sourceType: assembly ? 'ASSEMBLY' : 'REGULAR', assemblyId: assembly ? assembly.assemblyId : '' });
}

function clockOut_(user) {
  if (!settingEnabled_('attendanceEnabled')) throw new Error('현재 출퇴근 기록이 중지되어 있습니다.');
  const record = readTable_('WorkLogs').find(row => row.studentId === user.studentId && row.status === 'WORKING');
  if (!record) throw new Error('진행 중인 출근 기록을 찾을 수 없습니다.');
  const end = new Date(); const start = new Date(record.clockIn); record.clockOut = end; record.minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)); record.status = 'COMPLETE'; record.flagCode = computeLogFlag_(record, findById_('Students', 'studentId', user.studentId), readTable_('Schedules'), readTable_('WorkLogs').filter(row => row.logId !== record.logId));
  const saved = upsertRecord_('WorkLogs', record);
  if (record.assemblyId) {
    const participant = readTable_('AssemblyParticipants').find(row => String(row.assemblyId) === String(record.assemblyId) && String(row.studentId) === String(user.studentId) && row.status !== 'CANCELLED');
    if (participant) { participant.status = 'COMPLETED'; participant.workLogId = saved.logId; participant.attendanceConfirmedAt = new Date(); participant.updatedAt = new Date(); participant.updatedBy = user.studentId; upsertRecord_('AssemblyParticipants', participant); }
  }
  return saved;
}

function studentCreateSubstitution_(user, scheduleId, date, reason) {
  if (!settingEnabled_('substitutionEnabled')) throw new Error('현재 대체근무 요청이 중지되어 있습니다.');
  const schedule = findById_('Schedules', 'scheduleId', scheduleId);
  if (!schedule || schedule.studentId !== user.studentId || !isActive_(schedule.active)) throw new Error('본인의 활성 시간표만 대체 요청할 수 있습니다.');
  if (!date) throw new Error('대체근무 날짜를 입력하세요.');
  const student = findById_('Students', 'studentId', user.studentId);
  if (readTable_('Substitutions').some(row => row.scheduleId === scheduleId && row.date === date && !['REJECTED', 'CANCELLED'].includes(row.status))) throw new Error('이미 등록된 대체근무 요청입니다.');
  return upsertRecord_('Substitutions', { substitutionId: Utilities.getUuid(), scheduleId: scheduleId, date: date, requesterStudentId: user.studentId, substituteStudentId: '', partId: student.partId, status: 'OPEN', reason: String(reason || ''), createdAt: new Date(), updatedAt: new Date(), approvedBy: '' });
}

function studentApplySubstitution_(user, substitutionId) {
  if (!settingEnabled_('substitutionEnabled')) throw new Error('현재 대체근무 신청이 중지되어 있습니다.');
  const request = findById_('Substitutions', 'substitutionId', substitutionId); const student = findById_('Students', 'studentId', user.studentId);
  if (!request || request.status !== 'OPEN') throw new Error('신청 가능한 대체근무가 아닙니다.');
  if (request.requesterStudentId === user.studentId) throw new Error('본인의 요청에는 신청할 수 없습니다.');
  if (request.partId !== student.partId) throw new Error('다른 파트의 대체근무에는 신청할 수 없습니다.');
  request.substituteStudentId = user.studentId; request.status = 'APPLIED'; request.updatedAt = new Date(); return upsertRecord_('Substitutions', request);
}

function adminReviewSubstitution_(user, substitutionId, status) {
  const request = findById_('Substitutions', 'substitutionId', substitutionId);
  if (!request || !['APPROVED', 'REJECTED'].includes(String(status))) throw new Error('대체근무 처리값을 확인하세요.');
  if (status === 'APPROVED') { const requester = findById_('Students', 'studentId', request.requesterStudentId); const substitute = findById_('Students', 'studentId', request.substituteStudentId); if (!requester || !substitute || requester.partId !== substitute.partId || requester.partId !== request.partId) throw new Error('같은 파트 학생끼리만 대체근무를 승인할 수 있습니다.'); }
  request.status = status; request.updatedAt = new Date(); request.approvedBy = actorId_(user); return upsertRecord_('Substitutions', request);
}

function adminCancelSubstitution_(user, substitutionId) {
  const request = findById_('Substitutions', 'substitutionId', substitutionId);
  if (!request || ['APPROVED', 'CANCELLED'].includes(String(request.status))) throw new Error('취소할 수 있는 대체근무가 아닙니다.');
  request.status = 'CANCELLED'; request.updatedAt = new Date(); request.approvedBy = actorId_(user); return upsertRecord_('Substitutions', request);
}

function withWorkLogFlags_(logs, students, schedules) { const semesters = logs.length ? readTable_('Semesters') : []; return logs.map(log => { const copy = Object.assign({}, log); const student = students.find(row => row.studentId === log.studentId); copy.flagCode = computeLogFlag_(copy, student, schedules, logs.filter(row => row.logId !== log.logId), semesters); return copy; }); }
function computeLogFlag_(log, student, schedules, peers, semesters) {
  const flags = [];
  if (!log.clockOut && log.status === 'WORKING') flags.push('MISSING_CLOCK_OUT');
  if (log.clockIn && log.clockOut && new Date(log.clockOut).getTime() < new Date(log.clockIn).getTime()) flags.push('INVALID_TIME');
  if (peers.some(row => row.studentId === log.studentId && row.date === log.date && row.status !== 'CANCELLED')) flags.push('DUPLICATE_DAY');
  if (student && !isActive_(student.active)) flags.push('INACTIVE_STUDENT');
  const date = new Date(String(log.date) + 'T12:00:00+09:00'); const weekday = date.getDay(); const terms = semesters || readTable_('Semesters'); const planned = schedules.filter(row => { const term = terms.find(item => String(item.semesterId) === String(row.semesterId)); return row.studentId === log.studentId && (row.date ? row.date === log.date : Number(row.dayOfWeek) === weekday) && isActive_(row.active) && (!term || ((!term.startDate || log.date >= term.startDate) && (!term.endDate || log.date <= term.endDate))) && scheduleMatchesPeriod_(row, term, log.date); });
  if (log.clockIn && log.clockOut && planned.length) { const actualStart = Utilities.formatDate(new Date(log.clockIn), TIMEZONE, 'HH:mm'); const actualEnd = Utilities.formatDate(new Date(log.clockOut), TIMEZONE, 'HH:mm'); if (!planned.some(row => Math.abs(timeMinutes_(actualStart) - timeMinutes_(row.startTime)) <= 60 && Math.abs(timeMinutes_(actualEnd) - timeMinutes_(row.endTime)) <= 60)) flags.push('SCHEDULE_MISMATCH'); }
  return flags.join(',');
}

function setActive_(table, idKey, id, active, user) { const record = findById_(table, idKey, id); if (!record) throw new Error('대상을 찾을 수 없습니다.'); record.active = active; if ('updatedAt' in record) record.updatedAt = new Date(); if ('updatedBy' in record) record.updatedBy = actorId_(user); return upsertRecord_(table, record); }
function applyPassword_(record, password) { validatePassword_(password); const salt = Utilities.getUuid().replace(/-/g, ''); record.passwordSalt = salt; record.passwordHash = hashPassword_(password, salt); record.lastPasswordChangedAt = new Date(); }
function validatePassword_(password) { if (String(password || '').length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.'); }
function hashPassword_(password, salt) { const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ':' + String(password), Utilities.Charset.UTF_8); return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join(''); }
function randomToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }

function readTable_(name) {
  const sheet = spreadsheet_().getSheetByName(name); if (!sheet || sheet.getLastRow() < 2) return [];
  const liveHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, liveHeaders.length).getValues().filter(row => row.some(value => value !== '')).map(row => liveHeaders.reduce((record, header, index) => {
    if (!header) return record;
    // Sheets stores time-only settings as Date cells too. Do not decode them as semester IDs.
    const settingKey = name === 'Settings' ? String(row[liveHeaders.indexOf('key')] || '') : '';
    const valueHeader = header === 'value' && ['defaultWorkStartTime', 'defaultWorkEndTime'].includes(settingKey) ? 'startTime' : header;
    record[header] = normalizeCell_(valueHeader, row[index]);
    return record;
  }, {}));
}

function normalizeCell_(header, value) {
  if (!(value instanceof Date)) return value;
  if (['startTime', 'endTime', 'scheduledStart', 'scheduledEnd'].includes(header)) return Utilities.formatDate(value, TIMEZONE, 'HH:mm');
  if (header === 'month') return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM');
  if (['semesterId', 'value'].includes(header)) return Utilities.formatDate(value, TIMEZONE, 'yyyy-M');
  if (['date', 'startDate', 'endDate', 'vacationStartDate'].includes(header)) return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
  return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function upsertRecord_(tableName, patch) {
  if (!TABLES[tableName] || !patch || typeof patch !== 'object') throw new Error('저장할 데이터가 없습니다.'); ensureTable_(tableName, true);
  const sheet = spreadsheet_().getSheetByName(tableName); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String); const idKey = TABLES[tableName][0]; patch[idKey] = String(patch[idKey] || Utilities.getUuid());
  const existing = readTable_(tableName).find(row => String(row[idKey]) === String(patch[idKey])) || {}; const record = Object.assign({}, existing, patch); const idColumn = headers.indexOf(idKey) + 1; const ids = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getValues(); const index = ids.findIndex(row => String(normalizeCell_(idKey, row[0])) === String(record[idKey])); const values = headers.map(header => record[header] === undefined ? '' : record[header]);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, headers.length).setValues([values]); else sheet.appendRow(values); return record;
}

function findById_(table, idKey, id) { return readTable_(table).find(row => String(row[idKey]) === String(id)); }
function countRows_(table) { const sheet = spreadsheet_().getSheetByName(table); return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0; }
function seedIfEmpty_(name, rows) { const sheet = spreadsheet_().getSheetByName(name); if (sheet.getLastRow() === 1 && rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows); }
function settingsObject_() { const settings = {}; readTable_('Settings').forEach(row => { settings[row.key] = String(row.value || ''); }); return settings; }
function setSetting_(key, value) { return upsertRecord_('Settings', { key: key, value: value }); }
function ensureSettingDefault_(key, value) { if (!readTable_('Settings').some(row => String(row.key) === String(key))) setSetting_(key, value); }
function settingEnabled_(key) { const value = settingsObject_()[key]; return value === undefined || value === '' || String(value).toLowerCase() === 'true'; }
function activeSemesterId_() { return settingsObject_().activeSemester || String((readTable_('Semesters').find(row => isActive_(row.active)) || {}).semesterId || ''); }
function actorId_(user) { return String((user && (user.loginId || user.email || user.studentId)) || 'system'); }
function today_() { return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'); }
function todaySchedules_(studentId, date) { const day = new Date(date + 'T12:00:00+09:00').getDay(); return readTable_('Schedules').filter(row => row.studentId === studentId && (row.date ? row.date === date : Number(row.dayOfWeek) === day) && String(row.semesterId) === activeSemesterId_() && scheduleMatchesPeriod_(row, findById_('Semesters', 'semesterId', row.semesterId), date) && isActive_(row.active)); }
function nearestScheduleId_(schedules) { if (!schedules.length) return ''; const now = Number(Utilities.formatDate(new Date(), TIMEZONE, 'H')) * 60 + Number(Utilities.formatDate(new Date(), TIMEZONE, 'm')); return schedules.slice().sort((a, b) => Math.abs(timeMinutes_(a.startTime) - now) - Math.abs(timeMinutes_(b.startTime) - now))[0].scheduleId; }
function validateStudentPeriod_(student) { if (!student || !isActive_(student.active)) throw new Error('활성 학생을 찾을 수 없습니다.'); const today = today_(); if (student.startDate && today < student.startDate) throw new Error('근무 시작일 전입니다.'); if (student.endDate && today > student.endDate) throw new Error('근무 종료일이 지났습니다. 관리자에게 문의하세요.'); }
function validateHalfHour_(value) { if (!/^([01]\d|2[0-3]):(00|30)$/.test(String(value || ''))) throw new Error('시간은 30분 단위로 입력하세요.'); }
function timeMinutes_(value) { const parts = String(value || '00:00').split(':').map(Number); return parts[0] * 60 + parts[1]; }
function parseDateTime_(date, time) { const value = new Date(String(date) + 'T' + String(time).slice(0, 5) + ':00+09:00'); if (Number.isNaN(value.getTime())) throw new Error('날짜와 시간을 확인하세요.'); return value; }
function isActive_(value) { return !(value === false || String(value).toUpperCase() === 'FALSE' || String(value).toUpperCase() === 'N' || String(value) === '0'); }
function safeText_(value, maxLength) { return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function spreadsheet_() { if (requestSpreadsheet) return requestSpreadsheet; const configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'); const active = configuredId ? SpreadsheetApp.openById(configuredId) : SpreadsheetApp.getActiveSpreadsheet(); if (!active) throw new Error('SPREADSHEET_ID를 설정하거나 Spreadsheet에 스크립트를 연결하세요.'); requestSpreadsheet = active; return active; }
