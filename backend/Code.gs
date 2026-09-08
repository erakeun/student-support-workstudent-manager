/**
 * 한양대학교 ERICA 학생지원팀 근로관리 API
 * Google Spreadsheet에 바인딩된 Apps Script에서 사용합니다.
 * 실제 개인정보는 이 파일이 아니라 운영 Spreadsheet에만 저장합니다.
 */
const TIMEZONE = 'Asia/Seoul';
const ALLOWED_DOMAIN = 'hanyang.ac.kr';
const SESSION_TTL_SECONDS = 21600;
const ALLOWED_PORTAL_URLS = [
  'https://erakeun.github.io/student-support-workstudent-manager/',
  'https://hanyang-erica-workstudent-portal.hyungkeun.chatgpt.site/',
  'http://localhost:3000/',
];
const TABLES = {
  Parts: ['partId', 'partName', 'displayOrder', 'color', 'active'],
  Students: ['studentId', 'name', 'studentNumber', 'partId', 'workerType', 'startDate', 'endDate', 'taskSummary', 'workMemo', 'contactMemo', 'specialNote', 'substituteTasks', 'active'],
  Schedules: ['scheduleId', 'studentId', 'dayOfWeek', 'startTime', 'endTime', 'semesterId', 'active'],
  WorkLogs: ['logId', 'studentId', 'date', 'clockIn', 'clockOut', 'minutes', 'status', 'note'],
  Tasks: ['taskId', 'taskName', 'description', 'partId', 'studentId', 'employeeId', 'keywords', 'active'],
  Employees: ['employeeId', 'name', 'partId', 'extension', 'tasks', 'active'],
  Semesters: ['semesterId', 'semesterName', 'startDate', 'endDate', 'active'],
  Settings: ['key', 'value'],
};
const COLUMN_WIDTHS = {
  Parts: [150, 110, 90, 90, 70],
  Students: [135, 85, 105, 125, 115, 95, 95, 180, 180, 180, 220, 180, 70],
  Schedules: [135, 125, 90, 90, 90, 95, 70],
  WorkLogs: [135, 125, 100, 150, 150, 85, 95, 180],
  Tasks: [135, 150, 220, 125, 125, 125, 180, 70],
  Employees: [135, 90, 125, 90, 220, 70],
  Semesters: [110, 150, 100, 100, 70],
  Settings: [230, 430],
};

function doGet(e) {
  const request = Object.assign({}, (e && e.parameter) || {});
  request.action = request.action || 'health';
  if (request.action === 'authorize') return authorizePortal_(request.returnUrl);
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
      health: () => ({ ok: true, service: 'student-support-workstudent-manager', time: new Date().toISOString() }),
      bootstrap: () => { requirePortalUser_(request.token); return { ok: true, data: readPortalData_() }; },
      initializeDatabase: () => { requireAdmin_(request.token); return { ok: true, message: initializeDatabase() }; },
      upsertEntity: () => { requireAdmin_(request.token); return { ok: true, record: upsertEntity_(request.table, request.record) }; },
      deleteEntity: () => { requireAdmin_(request.token); deleteEntity_(request.table, request.id); return { ok: true }; },
      clockIn: () => { requirePortalUser_(request.token); return { ok: true, record: clockIn_(request.studentId, request.date) }; },
      clockOut: () => { requirePortalUser_(request.token); return { ok: true, record: clockOut_(request.studentId, request.date) }; },
    };
    if (!actions[request.action]) throw new Error('지원하지 않는 요청입니다.');
    return actions[request.action]();
  } catch (error) {
    return { ok: false, error: error.message || '서버 처리 중 오류가 발생했습니다.' };
  }
}

function authorizePortal_(returnUrl) {
  const email = requireHanyangUser_();
  const target = String(returnUrl || '');
  const targetWithoutHash = target.split('#')[0];
  const targetPath = targetWithoutHash.split('?')[0];
  if (!ALLOWED_PORTAL_URLS.includes(targetPath)) {
    return HtmlService.createHtmlOutput('허용되지 않은 포털 주소입니다.');
  }
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('portal-session:' + token, email, SESSION_TTL_SECONDS);
  const redirectUrl = target.split('#')[0] + '#portalToken=' + encodeURIComponent(token);
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><title>한양대 계정 연결</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<main style="font-family:Arial,sans-serif;max-width:520px;margin:64px auto;padding:28px;border:1px solid #d9e1e8;border-radius:12px">' +
    '<h1 style="font-size:22px">한양대학교 계정 인증 완료</h1>' +
    '<p>아래 버튼을 눌러 학생지원팀 근로관리 포털로 돌아가세요.</p>' +
    '<a target="_top" href="' + redirectUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" ' +
    'style="display:inline-block;margin-top:12px;padding:11px 18px;border-radius:8px;background:#075b9b;color:white;text-decoration:none;font-weight:bold">포털로 돌아가기</a></main>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  const configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (configuredId) return SpreadsheetApp.openById(configuredId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('SPREADSHEET_ID를 설정하거나 Spreadsheet에 스크립트를 연결하세요.');
  return active;
}

function initializeDatabase() {
  const spreadsheet = spreadsheet_();
  Object.keys(TABLES).forEach(name => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    const headers = TABLES[name];
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#e9eef3').setFontColor('#1f2937').setFontWeight('bold').setWrap(true);
    sheet.getDataRange().setVerticalAlignment('middle').setWrap(true);
    COLUMN_WIDTHS[name].forEach((width, index) => sheet.setColumnWidth(index + 1, width));
    if (sheet.getLastRow() > 1 && ['Students', 'Schedules', 'WorkLogs', 'Tasks', 'Employees'].includes(name) && !sheet.getFilter()) {
      sheet.getRange(1, 1, sheet.getLastRow(), headers.length).createFilter();
    }
  });
  seedIfEmpty_('Parts', [
    ['student-support', '학생지원', 1, '#0b72b9', true],
    ['reserve-affairs', '예비군·병무', 2, '#2f7f76', true],
    ['chinese-support', '중국학생', 3, '#d4872b', true],
  ]);
  seedIfEmpty_('Semesters', [['2026-2', '2026학년도 2학기', '', '', true]]);
  seedIfEmpty_('Settings', [
    ['activeSemester', '2026-2'],
    ['timezone', TIMEZONE],
    ['ADMIN_EMAILS', 'keun0810@hanyang.ac.kr'],
  ]);
  return '시트 구조와 기본 설정을 확인했습니다.';
}

function seedIfEmpty_(name, rows) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (sheet.getLastRow() === 1 && rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function readPortalData_() {
  const settingsRows = readTable_('Settings');
  const settings = {};
  settingsRows.forEach(row => { settings[row.key] = String(row.value || ''); });
  return {
    parts: readTable_('Parts'), students: readTable_('Students'), schedules: readTable_('Schedules'),
    workLogs: readTable_('WorkLogs'), tasks: readTable_('Tasks'), employees: readTable_('Employees'),
    semesters: readTable_('Semesters'), settings,
  };
}

function readTable_(name) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = TABLES[name];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .filter(row => row.some(value => value !== ''))
    .map(row => headers.reduce((record, header, index) => {
      const value = row[index];
      if (!(value instanceof Date)) record[header] = value;
      else if (['startTime', 'endTime'].includes(header)) record[header] = Utilities.formatDate(value, TIMEZONE, 'HH:mm');
      else if (['semesterId', 'value'].includes(header)) record[header] = Utilities.formatDate(value, TIMEZONE, 'yyyy-M');
      else if (header.toLowerCase().includes('date')) record[header] = Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
      else record[header] = Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
      return record;
    }, {}));
}

function upsertEntity_(tableName, record) {
  if (!TABLES[tableName] || tableName === 'Settings') throw new Error('수정할 수 없는 테이블입니다.');
  if (!record || typeof record !== 'object') throw new Error('저장할 데이터가 없습니다.');
  const headers = TABLES[tableName];
  const idKey = headers[0];
  record[idKey] = String(record[idKey] || Utilities.getUuid());
  const sheet = spreadsheet_().getSheetByName(tableName);
  const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const index = rows.findIndex(row => String(row[0]) === String(record[idKey]));
  const values = headers.map(header => record[header] === undefined ? '' : record[header]);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, headers.length).setValues([values]);
  else sheet.appendRow(values);
  return record;
}

function deleteEntity_(tableName, id) {
  if (!TABLES[tableName] || ['Settings', 'Parts'].includes(tableName)) throw new Error('삭제할 수 없는 테이블입니다.');
  const sheet = spreadsheet_().getSheetByName(tableName);
  const values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const index = values.findIndex(row => String(row[0]) === String(id));
  if (index < 0) throw new Error('삭제할 항목을 찾을 수 없습니다.');
  sheet.deleteRow(index + 2);
}

function clockIn_(studentId, date) {
  validateStudent_(studentId);
  const workDate = date || Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const existing = readTable_('WorkLogs').find(row => String(row.studentId) === String(studentId) && String(row.date) === workDate && row.status === 'WORKING');
  if (existing) throw new Error('이미 출근 처리되어 있습니다.');
  return upsertEntity_('WorkLogs', { logId: Utilities.getUuid(), studentId, date: workDate, clockIn: new Date(), clockOut: '', minutes: 0, status: 'WORKING', note: '' });
}

function clockOut_(studentId, date) {
  validateStudent_(studentId);
  const workDate = date || Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const rows = readTable_('WorkLogs');
  const record = rows.find(row => String(row.studentId) === String(studentId) && String(row.date) === workDate && row.status === 'WORKING');
  if (!record) throw new Error('오늘 출근 기록을 찾을 수 없습니다.');
  const end = new Date();
  record.clockOut = end;
  record.minutes = Math.max(0, Math.round((end.getTime() - new Date(record.clockIn).getTime()) / 60000));
  record.status = 'COMPLETE';
  return upsertEntity_('WorkLogs', record);
}

function validateStudent_(studentId) {
  if (!readTable_('Students').some(student => String(student.studentId) === String(studentId) && student.active !== false)) throw new Error('활성 학생을 찾을 수 없습니다.');
}

function requireHanyangUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || !email.endsWith('@' + ALLOWED_DOMAIN)) throw new Error('한양대학교 계정 로그인이 필요합니다.');
  return email;
}

function requirePortalUser_(token) {
  const cachedEmail = token && CacheService.getScriptCache().get('portal-session:' + String(token));
  if (cachedEmail && cachedEmail.endsWith('@' + ALLOWED_DOMAIN)) return cachedEmail;
  throw new Error('한양대학교 계정 연결이 필요합니다.');
}

function requireAdmin_(token) {
  const email = requirePortalUser_(token);
  const row = readTable_('Settings').find(item => item.key === 'ADMIN_EMAILS');
  const admins = String((row && row.value) || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
  if (!admins.includes(email)) throw new Error('관리자 권한이 필요합니다.');
  return email;
}
