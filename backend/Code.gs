/**
 * 한양대학교 ERICA 학생지원팀 근로관리 API V3
 * 운영 데이터와 인증 해시의 원본은 Google Spreadsheet다.
 * 기존 행은 삭제하지 않고 initializeDatabase()가 누락 열/시트만 추가한다.
 */
const TIMEZONE = 'Asia/Seoul';
const SESSION_TTL_SECONDS = 21600;

const TABLES = {
  Parts: ['partId', 'partName', 'displayOrder', 'color', 'active'],
  Students: ['studentId', 'name', 'studentNumber', 'partId', 'workerType', 'startDate', 'endDate', 'taskSummary', 'workMemo', 'contactMemo', 'specialNote', 'substituteTasks', 'active', 'loginId', 'passwordHash', 'passwordSalt', 'role', 'lastPasswordChangedAt'],
  Schedules: ['scheduleId', 'studentId', 'dayOfWeek', 'startTime', 'endTime', 'semesterId', 'active', 'updatedAt', 'updatedBy'],
  WorkLogs: ['logId', 'studentId', 'date', 'clockIn', 'clockOut', 'minutes', 'status', 'note', 'scheduleId', 'partId', 'reason', 'editedBy', 'editedAt', 'createdBy', 'createdAt', 'flagCode'],
  Tasks: ['taskId', 'taskName', 'description', 'partId', 'studentId', 'employeeId', 'keywords', 'active', 'updatedAt', 'updatedBy'],
  Employees: ['employeeId', 'name', 'partId', 'extension', 'tasks', 'active'],
  Semesters: ['semesterId', 'semesterName', 'startDate', 'endDate', 'active', 'createdAt', 'createdBy'],
  Settings: ['key', 'value'],
  Substitutions: ['substitutionId', 'scheduleId', 'date', 'requesterStudentId', 'substituteStudentId', 'partId', 'status', 'reason', 'createdAt', 'updatedAt', 'approvedBy'],
  MigrationLog: ['migrationId', 'appliedAt', 'version', 'description', 'beforeStudents', 'afterStudents', 'beforeSchedules', 'afterSchedules'],
  Admins: ['adminId', 'name', 'loginId', 'passwordHash', 'passwordSalt', 'active', 'lastPasswordChangedAt', 'createdAt', 'createdBy'],
};

const COLUMN_WIDTHS = {
  Parts: [150, 120, 90, 90, 70], Students: [135, 90, 110, 130, 120, 100, 100, 180, 180, 180, 220, 180, 70, 120, 110, 110, 80, 160],
  Schedules: [135, 125, 90, 90, 90, 100, 70, 160, 170], WorkLogs: [135, 125, 100, 165, 165, 85, 105, 180, 135, 125, 180, 170, 165, 170, 165, 180],
  Tasks: [135, 150, 220, 125, 125, 125, 180, 70, 160, 170], Employees: [135, 90, 125, 90, 220, 70],
  Semesters: [110, 150, 100, 100, 70, 160, 170], Settings: [230, 430], Substitutions: [145, 135, 100, 150, 150, 125, 100, 200, 165, 165, 170], MigrationLog: [140, 165, 90, 280, 100, 100, 110, 110],
  Admins: [140, 120, 150, 120, 120, 80, 170, 170, 150],
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
      health: () => ({ ok: true, service: 'student-support-workstudent-manager-v3', time: new Date().toISOString() }),
      adminLogin: () => adminLogin_(request.loginId, request.password),
      studentLogin: () => studentLogin_(request.loginId, request.password),
      session: () => sessionInfo_(request.token),
      logout: () => { endSession_(request.token); return { ok: true }; },
      adminBootstrap: () => ({ ok: true, data: readAdminData_(requireRole_(request.token, 'ADMIN')) }),
      studentBootstrap: () => ({ ok: true, data: readStudentData_(requireRole_(request.token, 'STUDENT')) }),
      initializeDatabase: () => { const user = requireRole_(request.token, 'ADMIN'); return { ok: true, message: initializeDatabase(actorId_(user)) }; },
      adminUpsertStudent: () => ({ ok: true, record: adminUpsertStudent_(requireRole_(request.token, 'ADMIN'), request.record, request.initialPassword) }),
      adminResetPassword: () => ({ ok: true, record: adminResetPassword_(requireRole_(request.token, 'ADMIN'), request.studentId, request.newPassword) }),
      adminUpsertSchedule: () => ({ ok: true, record: adminUpsertSchedule_(requireRole_(request.token, 'ADMIN'), request.record) }),
      adminDeactivateSchedule: () => ({ ok: true, record: setActive_('Schedules', 'scheduleId', request.scheduleId, false, requireRole_(request.token, 'ADMIN')) }),
      adminUpsertWorkLog: () => ({ ok: true, record: adminUpsertWorkLog_(requireRole_(request.token, 'ADMIN'), request.record) }),
      adminUpsertTask: () => ({ ok: true, record: adminUpsertTask_(requireRole_(request.token, 'ADMIN'), request.record) }),
      adminDeactivateTask: () => ({ ok: true, record: setActive_('Tasks', 'taskId', request.taskId, false, requireRole_(request.token, 'ADMIN')) }),
      adminUpsertPart: () => ({ ok: true, record: adminUpsertPart_(requireRole_(request.token, 'ADMIN'), request.record) }),
      adminCreateSemester: () => ({ ok: true, record: adminCreateSemester_(requireRole_(request.token, 'ADMIN'), request.record) }),
      adminActivateSemester: () => ({ ok: true, semesterId: adminActivateSemester_(requireRole_(request.token, 'ADMIN'), request.semesterId) }),
      adminSaveSettings: () => ({ ok: true, settings: adminSaveSettings_(requireRole_(request.token, 'ADMIN'), request.settings) }),
      adminReviewSubstitution: () => ({ ok: true, record: adminReviewSubstitution_(requireRole_(request.token, 'ADMIN'), request.substitutionId, request.status) }),
      clockIn: () => ({ ok: true, record: clockIn_(requireRole_(request.token, 'STUDENT')) }),
      clockOut: () => ({ ok: true, record: clockOut_(requireRole_(request.token, 'STUDENT')) }),
      studentCreateSubstitution: () => ({ ok: true, record: studentCreateSubstitution_(requireRole_(request.token, 'STUDENT'), request.scheduleId, request.date, request.reason) }),
      studentApplySubstitution: () => ({ ok: true, record: studentApplySubstitution_(requireRole_(request.token, 'STUDENT'), request.substitutionId) }),
    };
    if (!actions[request.action]) throw new Error('지원하지 않는 요청입니다.');
    return actions[request.action]();
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
  const user = { role: 'ADMIN', adminId: admin.adminId, loginId: admin.loginId, name: admin.name || admin.loginId };
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
  const token = createSession_({ role: 'STUDENT', studentId: student.studentId, name: student.name, partId: student.partId });
  return { ok: true, token: token, user: { role: 'STUDENT', studentId: student.studentId, name: student.name, partId: student.partId } };
}

function sessionInfo_(token) {
  const user = requireSession_(token);
  if (user.role === 'STUDENT') {
    const student = findById_('Students', 'studentId', user.studentId);
    if (!student || !isActive_(student.active)) throw new Error('비활성화된 계정입니다.');
  } else if (user.role === 'ADMIN') {
    const admin = findById_('Admins', 'adminId', user.adminId);
    if (!admin || !isActive_(admin.active) || String(admin.loginId) !== String(user.loginId)) throw new Error('관리자 권한이 해제되었습니다.');
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
function requireRole_(token, role) { const user = requireSession_(token); if (user.role !== role) throw new Error('권한이 없습니다.'); return user; }

function initializeDatabase(actorEmail) {
  const beforeStudents = countRows_('Students');
  const beforeSchedules = countRows_('Schedules');
  Object.keys(TABLES).forEach(ensureTable_);
  seedIfEmpty_('Parts', [['student-support', '학생지원', 1, '#0b72b9', true], ['reserve-affairs', '예비군·병무', 2, '#2f7f76', true], ['chinese-support', '중국학생', 3, '#d4872b', true]]);
  seedIfEmpty_('Semesters', [['2026-2', '2026학년도 2학기', '', '', true, new Date(), actorEmail || 'migration']]);
  seedIfEmpty_('Settings', [['activeSemester', '2026-2'], ['timezone', TIMEZONE], ['ADMIN_EMAILS', 'keun0810@hanyang.ac.kr']]);
  migrateStudentDefaults_();
  const afterStudents = countRows_('Students');
  const afterSchedules = countRows_('Schedules');
  if (beforeStudents !== afterStudents || beforeSchedules !== afterSchedules) throw new Error('마이그레이션 중 기존 행 수가 변경되어 중단했습니다.');
  const version = 'V3-AUTH-2026-09-08';
  if (!readTable_('MigrationLog').some(row => row.version === version)) upsertRecord_('MigrationLog', { migrationId: Utilities.getUuid(), appliedAt: new Date(), version: version, description: '일반 관리자 ID/PW 인증 테이블 비파괴 추가', beforeStudents: beforeStudents, afterStudents: afterStudents, beforeSchedules: beforeSchedules, afterSchedules: afterSchedules });
  return '기존 학생 ' + afterStudents + '명과 일정 ' + afterSchedules + '구간을 보존한 채 V3 인증 구조를 확인했습니다.';
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
  applyPassword_(record, initialPassword);
  upsertRecord_('Admins', record);
  return { adminId: record.adminId, loginId: record.loginId, name: record.name, active: record.active };
}

function ensureTable_(name) {
  const sheet = spreadsheet_().getSheetByName(name) || spreadsheet_().insertSheet(name);
  const expected = TABLES[name];
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  else {
    const current = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
    const missing = expected.filter(header => current.indexOf(header) < 0);
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
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
    if (changed) upsertRecord_('Students', patch);
  });
}

function readAdminData_(user) {
  const students = readTable_('Students').map(sanitizeStudentForAdmin_);
  const schedules = readTable_('Schedules');
  const workLogs = withWorkLogFlags_(readTable_('WorkLogs'), students, schedules);
  return baseData_({ students: students, schedules: schedules, workLogs: workLogs, substitutions: readTable_('Substitutions') });
}

function readStudentData_(user) {
  const allStudents = readTable_('Students');
  const student = allStudents.find(row => String(row.studentId) === String(user.studentId));
  if (!student || !isActive_(student.active)) throw new Error('활성 학생을 찾을 수 없습니다.');
  const semesterId = activeSemesterId_();
  const schedules = readTable_('Schedules').filter(row => String(row.studentId) === String(student.studentId) && String(row.semesterId) === semesterId && isActive_(row.active));
  const workLogs = withWorkLogFlags_(readTable_('WorkLogs').filter(row => String(row.studentId) === String(student.studentId)), [student], schedules);
  const samePartStudents = allStudents.filter(row => row.partId === student.partId && isActive_(row.active)).map(row => ({ studentId: row.studentId, name: row.name, partId: row.partId }));
  const substitutions = readTable_('Substitutions').filter(row => row.partId === student.partId && (row.requesterStudentId === student.studentId || row.status === 'OPEN' || row.substituteStudentId === student.studentId));
  const data = baseData_({ students: [sanitizeStudentForSelf_(student)], schedules: schedules, workLogs: workLogs, tasks: readTable_('Tasks').filter(row => isActive_(row.active) && (row.partId === student.partId || !row.partId)), substitutions: substitutions, substitutionCandidates: samePartStudents });
  data.currentUser = { role: 'STUDENT', studentId: student.studentId, name: student.name, partId: student.partId };
  return data;
}

function baseData_(overrides) { return Object.assign({ parts: readTable_('Parts').filter(row => isActive_(row.active)), students: [], schedules: [], workLogs: [], tasks: readTable_('Tasks'), employees: readTable_('Employees'), semesters: readTable_('Semesters'), settings: settingsObject_(), substitutions: [], substitutionCandidates: [] }, overrides || {}); }
function sanitizeStudentForAdmin_(student) { const copy = Object.assign({}, student); delete copy.passwordHash; delete copy.passwordSalt; copy.hasPassword = Boolean(student.passwordHash && student.passwordSalt); return copy; }
function sanitizeStudentForSelf_(student) { return { studentId: student.studentId, name: student.name, partId: student.partId, workerType: student.workerType, startDate: student.startDate, endDate: student.endDate, taskSummary: student.taskSummary, substituteTasks: student.substituteTasks, active: student.active }; }

function adminUpsertStudent_(user, input, initialPassword) {
  const record = Object.assign({}, input || {});
  if (!record.name || !record.partId) throw new Error('이름과 파트를 입력하세요.');
  if (!['NATIONAL_WORK', 'SHORT_TERM', 'OTHER'].includes(String(record.workerType))) throw new Error('근로유형을 확인하세요.');
  if (record.workerType === 'SHORT_TERM' && (!record.startDate || !record.endDate)) throw new Error('단기근로자는 시작일과 종료일이 필요합니다.');
  if (record.startDate && record.endDate && record.startDate > record.endDate) throw new Error('근무 종료일은 시작일 이후여야 합니다.');
  record.studentId = record.studentId || Utilities.getUuid(); record.role = 'STUDENT'; record.active = record.active !== false;
  const duplicate = readTable_('Students').find(row => row.studentId !== record.studentId && record.loginId && String(row.loginId) === String(record.loginId));
  if (duplicate) throw new Error('이미 사용 중인 로그인 ID입니다.');
  if (initialPassword) applyPassword_(record, initialPassword);
  return sanitizeStudentForAdmin_(upsertRecord_('Students', record));
}

function adminResetPassword_(user, studentId, newPassword) { validatePassword_(newPassword); const student = findById_('Students', 'studentId', studentId); if (!student) throw new Error('학생을 찾을 수 없습니다.'); applyPassword_(student, newPassword); return sanitizeStudentForAdmin_(upsertRecord_('Students', student)); }

function adminUpsertSchedule_(user, input) {
  const record = Object.assign({}, input || {}); const student = findById_('Students', 'studentId', record.studentId);
  if (!student) throw new Error('학생을 찾을 수 없습니다.');
  if (![1, 2, 3, 4, 5].includes(Number(record.dayOfWeek))) throw new Error('요일을 확인하세요.');
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

function adminUpsertTask_(user, input) { const record = Object.assign({}, input || {}); if (!record.taskName) throw new Error('업무명을 입력하세요.'); record.taskId = record.taskId || Utilities.getUuid(); record.active = record.active !== false; record.updatedAt = new Date(); record.updatedBy = actorId_(user); return upsertRecord_('Tasks', record); }
function adminUpsertPart_(user, input) { const record = Object.assign({}, input || {}); if (!record.partId || !record.partName) throw new Error('파트 ID와 이름을 입력하세요.'); record.active = record.active !== false; return upsertRecord_('Parts', record); }
function adminCreateSemester_(user, input) { const record = Object.assign({}, input || {}); if (!record.semesterId || !record.semesterName || !record.startDate || !record.endDate) throw new Error('학기 정보를 모두 입력하세요.'); if (record.startDate > record.endDate) throw new Error('학기 종료일을 확인하세요.'); if (findById_('Semesters', 'semesterId', record.semesterId)) throw new Error('이미 존재하는 학기입니다.'); record.active = false; record.createdAt = new Date(); record.createdBy = actorId_(user); return upsertRecord_('Semesters', record); }
function adminActivateSemester_(user, semesterId) { if (!findById_('Semesters', 'semesterId', semesterId)) throw new Error('학기를 찾을 수 없습니다.'); readTable_('Semesters').forEach(row => upsertRecord_('Semesters', { semesterId: row.semesterId, active: row.semesterId === semesterId })); setSetting_('activeSemester', semesterId); return semesterId; }
function adminSaveSettings_(user, values) { Object.keys(values || {}).forEach(key => { if (key !== 'ADMIN_EMAILS') setSetting_(key, values[key]); }); return settingsObject_(); }

function clockIn_(user) {
  const student = findById_('Students', 'studentId', user.studentId); validateStudentPeriod_(student); const today = today_();
  if (readTable_('WorkLogs').some(row => row.studentId === student.studentId && row.status === 'WORKING')) throw new Error('이미 진행 중인 출근 기록이 있습니다.');
  const schedules = todaySchedules_(student.studentId, today); const now = new Date(); const flag = schedules.length ? '' : 'OUTSIDE_SCHEDULE';
  return upsertRecord_('WorkLogs', { logId: Utilities.getUuid(), studentId: student.studentId, date: today, clockIn: now, clockOut: '', minutes: 0, status: 'WORKING', note: '', scheduleId: nearestScheduleId_(schedules), partId: student.partId, reason: '', editedBy: '', editedAt: '', createdBy: student.studentId, createdAt: now, flagCode: flag });
}

function clockOut_(user) {
  const record = readTable_('WorkLogs').find(row => row.studentId === user.studentId && row.status === 'WORKING');
  if (!record) throw new Error('진행 중인 출근 기록을 찾을 수 없습니다.');
  const end = new Date(); const start = new Date(record.clockIn); record.clockOut = end; record.minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)); record.status = 'COMPLETE'; record.flagCode = computeLogFlag_(record, findById_('Students', 'studentId', user.studentId), readTable_('Schedules'), readTable_('WorkLogs').filter(row => row.logId !== record.logId));
  return upsertRecord_('WorkLogs', record);
}

function studentCreateSubstitution_(user, scheduleId, date, reason) {
  const schedule = findById_('Schedules', 'scheduleId', scheduleId);
  if (!schedule || schedule.studentId !== user.studentId || !isActive_(schedule.active)) throw new Error('본인의 활성 시간표만 대체 요청할 수 있습니다.');
  if (!date) throw new Error('대체근무 날짜를 입력하세요.');
  const student = findById_('Students', 'studentId', user.studentId);
  if (readTable_('Substitutions').some(row => row.scheduleId === scheduleId && row.date === date && !['REJECTED', 'CANCELLED'].includes(row.status))) throw new Error('이미 등록된 대체근무 요청입니다.');
  return upsertRecord_('Substitutions', { substitutionId: Utilities.getUuid(), scheduleId: scheduleId, date: date, requesterStudentId: user.studentId, substituteStudentId: '', partId: student.partId, status: 'OPEN', reason: String(reason || ''), createdAt: new Date(), updatedAt: new Date(), approvedBy: '' });
}

function studentApplySubstitution_(user, substitutionId) {
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

function withWorkLogFlags_(logs, students, schedules) { return logs.map(log => { const copy = Object.assign({}, log); const student = students.find(row => row.studentId === log.studentId); copy.flagCode = computeLogFlag_(copy, student, schedules, logs.filter(row => row.logId !== log.logId)); return copy; }); }
function computeLogFlag_(log, student, schedules, peers) {
  const flags = [];
  if (!log.clockOut && log.status === 'WORKING') flags.push('MISSING_CLOCK_OUT');
  if (log.clockIn && log.clockOut && new Date(log.clockOut).getTime() < new Date(log.clockIn).getTime()) flags.push('INVALID_TIME');
  if (peers.some(row => row.studentId === log.studentId && row.date === log.date && row.status !== 'CANCELLED')) flags.push('DUPLICATE_DAY');
  if (student && !isActive_(student.active)) flags.push('INACTIVE_STUDENT');
  const date = new Date(String(log.date) + 'T12:00:00+09:00'); const weekday = date.getDay(); const planned = schedules.filter(row => row.studentId === log.studentId && Number(row.dayOfWeek) === weekday && isActive_(row.active));
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
    if (!header) return record; const value = row[index];
    if (!(value instanceof Date)) record[header] = value;
    else if (['startTime', 'endTime'].includes(header)) record[header] = Utilities.formatDate(value, TIMEZONE, 'HH:mm');
    else if (['semesterId', 'value'].includes(header)) record[header] = Utilities.formatDate(value, TIMEZONE, 'yyyy-M');
    else if (header.toLowerCase().includes('date')) record[header] = Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
    else record[header] = Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    return record;
  }, {}));
}

function upsertRecord_(tableName, patch) {
  if (!TABLES[tableName] || !patch || typeof patch !== 'object') throw new Error('저장할 데이터가 없습니다.'); ensureTable_(tableName);
  const sheet = spreadsheet_().getSheetByName(tableName); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String); const idKey = TABLES[tableName][0]; patch[idKey] = String(patch[idKey] || Utilities.getUuid());
  const existing = readTable_(tableName).find(row => String(row[idKey]) === String(patch[idKey])) || {}; const record = Object.assign({}, existing, patch); const idColumn = headers.indexOf(idKey) + 1; const ids = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getValues(); const index = ids.findIndex(row => String(row[0]) === String(record[idKey])); const values = headers.map(header => record[header] === undefined ? '' : record[header]);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, headers.length).setValues([values]); else sheet.appendRow(values); return record;
}

function findById_(table, idKey, id) { return readTable_(table).find(row => String(row[idKey]) === String(id)); }
function countRows_(table) { const sheet = spreadsheet_().getSheetByName(table); return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0; }
function seedIfEmpty_(name, rows) { const sheet = spreadsheet_().getSheetByName(name); if (sheet.getLastRow() === 1 && rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows); }
function settingsObject_() { const settings = {}; readTable_('Settings').forEach(row => { settings[row.key] = String(row.value || ''); }); return settings; }
function setSetting_(key, value) { return upsertRecord_('Settings', { key: key, value: value }); }
function activeSemesterId_() { return settingsObject_().activeSemester || String((readTable_('Semesters').find(row => isActive_(row.active)) || {}).semesterId || ''); }
function actorId_(user) { return String((user && (user.loginId || user.email || user.studentId)) || 'system'); }
function today_() { return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'); }
function todaySchedules_(studentId, date) { const day = new Date(date + 'T12:00:00+09:00').getDay(); return readTable_('Schedules').filter(row => row.studentId === studentId && Number(row.dayOfWeek) === day && String(row.semesterId) === activeSemesterId_() && isActive_(row.active)); }
function nearestScheduleId_(schedules) { if (!schedules.length) return ''; const now = Number(Utilities.formatDate(new Date(), TIMEZONE, 'H')) * 60 + Number(Utilities.formatDate(new Date(), TIMEZONE, 'm')); return schedules.slice().sort((a, b) => Math.abs(timeMinutes_(a.startTime) - now) - Math.abs(timeMinutes_(b.startTime) - now))[0].scheduleId; }
function validateStudentPeriod_(student) { if (!student || !isActive_(student.active)) throw new Error('활성 학생을 찾을 수 없습니다.'); const today = today_(); if (student.startDate && today < student.startDate) throw new Error('근무 시작일 전입니다.'); if (student.endDate && today > student.endDate) throw new Error('근무 종료일이 지났습니다. 관리자에게 문의하세요.'); }
function validateHalfHour_(value) { if (!/^([01]\d|2[0-3]):(00|30)$/.test(String(value || ''))) throw new Error('시간은 30분 단위로 입력하세요.'); }
function timeMinutes_(value) { const parts = String(value || '00:00').split(':').map(Number); return parts[0] * 60 + parts[1]; }
function parseDateTime_(date, time) { const value = new Date(String(date) + 'T' + String(time).slice(0, 5) + ':00+09:00'); if (Number.isNaN(value.getTime())) throw new Error('날짜와 시간을 확인하세요.'); return value; }
function isActive_(value) { return !(value === false || String(value).toUpperCase() === 'FALSE' || String(value).toUpperCase() === 'N' || String(value) === '0'); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function spreadsheet_() { const configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'); if (configuredId) return SpreadsheetApp.openById(configuredId); const active = SpreadsheetApp.getActiveSpreadsheet(); if (!active) throw new Error('SPREADSHEET_ID를 설정하거나 Spreadsheet에 스크립트를 연결하세요.'); return active; }
