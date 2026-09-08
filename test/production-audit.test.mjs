import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../backend/Code.gs', import.meta.url), 'utf8');
function backend() {
  const sandbox = { Date, console, CacheService: { getScriptCache: () => ({ get: () => JSON.stringify({ role: 'STUDENT', studentId: 'TEST_A', partId:'SUPPORT' }) }) } };
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return sandbox;
}
const budgetModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/budget-calculation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:budgetModule.exports,Date});
const { monthlyBudgetRows, scheduledMinutesForMonth } = budgetModule.exports;

test('종강 전후 실제 날짜에 학기 중·방학 시간표를 분리 적용하며 원본을 보존한다',()=>{
  const d=data(); d.semesters[0].endDate='2027-02-28';
  d.schedules.push({...d.schedules[0],period:'VACATION',startTime:'13:00',endTime:'15:00'});
  assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),300);
  d.semesters[0].vacationStartDate='2026-09-15';
  const original=JSON.stringify(d);
  assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),480);
  assert.equal(scheduledMinutesForMonth(d,d.students[0],'2027-02'),480);
  assert.equal(scheduledMinutesForMonth(d,d.students[0],'2027-03'),0);
  assert.equal(JSON.stringify(d),original);
  d.schedules.pop(); assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),120);
});
test('종강 전환은 서버 날짜·관리자 권한으로 한 번만 기록하고 로그를 건드리지 않는다',()=>{
  const b=backend(); let writes=0;
  const term={semesterId:'TEST_TERM',startDate:'2026-09-01',endDate:'2027-02-28'};
  b.today_=()=> '2026-12-21'; b.activeSemesterId_=()=> 'TEST_TERM'; b.findById_=()=>term;
  b.upsertRecord_=(table,record)=>{assert.equal(table,'Semesters');writes++;Object.assign(term,record);return record;};
  assert.throws(()=>b.adminStartVacation_({loginId:'TEST_ADMIN'},'OTHER'),/현재 운영/);
  b.adminStartVacation_({loginId:'TEST_ADMIN'},'TEST_TERM');
  assert.equal(term.vacationStartDate,'2026-12-21');assert.equal(term.vacationStartedBy,'TEST_ADMIN');
  b.today_=()=> '2026-12-22';b.adminStartVacation_({loginId:'TEST_ADMIN'},'TEST_TERM');assert.equal(writes,1);
  assert.equal(b.scheduleMatchesPeriod_({},term,'2026-12-20'),true);
  assert.equal(b.scheduleMatchesPeriod_({},term,'2026-12-21'),false);
  assert.equal(b.scheduleMatchesPeriod_({period:'VACATION'},term,'2026-12-21'),true);
  b.requireRole_=()=>{throw new Error('권한 없음');};b.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
  assert.equal(b.route_({action:'adminStartVacation',semesterId:'TEST_TERM'}).ok,false);assert.equal(writes,1);
});
test('학기 일반 수정으로 방학 전환을 위조하거나 누적기간에서 제외할 수 없다',()=>{
  const b=backend();const term={semesterId:'TEST_TERM',semesterName:'TEST',startDate:'2026-09-01',endDate:'2027-02-28',vacationStartDate:'2026-12-21',active:true};
  b.findById_=()=>term;b.upsertRecord_=(_,row)=>row;
  const result=b.adminUpsertSemester_({}, {...term,vacationStartDate:''});assert.equal(result.vacationStartDate,'2026-12-21');
  assert.throws(()=>b.adminUpsertSemester_({}, {...term,endDate:'2026-12-20'}),/방학 시작일/);
});
const student = {studentId:'TEST_A',name:'TEST A',workerType:'NATIONAL_WORK',active:true,hourlyWage:'',startDate:'',endDate:''};
function data() { return {students:[{...student}],semesters:[{semesterId:'TEST_TERM',startDate:'2026-09-01',endDate:'2026-12-31'}],settings:{activeSemester:'TEST_TERM',defaultHourlyWage:'10320'},schedules:[{studentId:'TEST_A',active:true,semesterId:'TEST_TERM',dayOfWeek:2,startTime:'09:00',endTime:'10:00'}],workLogs:[]}; }

test('예산은 9월의 실제 화요일 5회를 계산하고 시급 override가 우선한다',()=>{
  const d=data();assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),300);
  assert.equal(monthlyBudgetRows(d,'2026-09')[0].scheduledCost,51600);
  d.students[0].hourlyWage=12000;assert.equal(monthlyBudgetRows(d,'2026-09')[0].scheduledCost,60000);
  d.students[0].startDate='2026-09-08';d.students[0].endDate='2026-09-15';assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),120);
});
test('비활성 학생의 완료 인건비는 남고 예정 인건비만 제외된다',()=>{
  const d=data();d.students[0].active=false;d.workLogs=[{studentId:'TEST_A',date:'2026-09-08',status:'COMPLETE',minutes:60},{studentId:'TEST_A',date:'2026-09-09',status:'CANCELLED',minutes:60}];
  const raw=JSON.stringify(d.workLogs);const row=monthlyBudgetRows(d,'2026-09')[0];assert.equal(row.actualCost,10320);assert.equal(row.scheduledCost,0);
  d.students[0].hourlyWage=12000;monthlyBudgetRows(d,'2026-09');assert.equal(JSON.stringify(d.workLogs),raw);
});
test('날짜 지정·과거 학기·주말 일정의 비용 혼입을 차단한다',()=>{
  const d=data();d.schedules.push({studentId:'TEST_A',active:true,semesterId:'OLD',dayOfWeek:2,startTime:'09:00',endTime:'10:00'},{studentId:'TEST_A',active:true,semesterId:'TEST_TERM',date:'2026-09-12',dayOfWeek:6,startTime:'09:00',endTime:'10:00'});
  assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),300);
  d.schedules[0].date='2026-09-08';assert.equal(scheduledMinutesForMonth(d,d.students[0],'2026-09'),60);
});
test('매 API 호출은 비활성·기간 종료 학생 및 해제된 관리자 세션을 거부한다',()=>{
  const b=backend();b.findById_=()=>({active:false});assert.throws(()=>b.requireRole_('TEST','STUDENT'),/활성 학생/);
  b.findById_=()=>({active:true,endDate:'2026-01-01'});b.today_=()=> '2026-09-08';assert.throws(()=>b.requireRole_('TEST','STUDENT'),/종료일/);
  b.CacheService.getScriptCache=()=>({get:()=>JSON.stringify({role:'ADMIN',adminId:'TEST_ADMIN',loginId:'TEST'})});b.findById_=()=>({active:false,loginId:'TEST'});assert.throws(()=>b.requireRole_('TEST','ADMIN'),/해제/);
});
test('다른 학생 공유메모 수정·삭제는 서버에서 거부한다',()=>{
  const b=backend();b.settingEnabled_=()=>true;b.validateStudentPeriod_=()=>{};b.findById_=(table)=>table==='Students'?{studentId:'TEST_A',partId:'SUPPORT'}:{handoverId:'TEST_NOTE_B',authorStudentId:'TEST_B',active:true};
  assert.throws(()=>b.studentDeleteHandover_({studentId:'TEST_A'},'TEST_NOTE_B'),/본인이/);
  assert.throws(()=>b.studentUpsertHandover_({studentId:'TEST_A'},{handoverId:'TEST_NOTE_B',title:'TEST'}),/본인이/);
});
test('학생 서버 응답은 본인 정보·기록만 포함하고 관리자 예산·설정을 제외한다',()=>{
  const b=backend();const rows={Students:[{...student,partId:'SUPPORT',studentNumber:'TEST_NUMBER_A',passwordHash:'SECRET_HASH',passwordSalt:'SECRET_SALT',workMemo:'ADMIN_ONLY'},{studentId:'TEST_B',partId:'SUPPORT',name:'TEST B',active:true,studentNumber:'PRIVATE_NUMBER_B',email:'private@example.test',phone:'PRIVATE_PHONE'}],Schedules:[],WorkLogs:[{studentId:'TEST_B',date:'2026-09-08',minutes:60}],Tasks:[],Substitutions:[],Handovers:[],Parts:[],Employees:[],Semesters:[],Budgets:[{note:'ADMIN_BUDGET_MEMO'}],Settings:[{key:'activeSemester',value:'TEST_TERM'},{key:'ADMIN_EMAILS',value:'admin@example.test'}]};
  b.readTable_=name=>rows[name]||[];b.validateStudentPeriod_=()=>{};b.withWorkLogFlags_=x=>x;
  const output=b.readStudentData_({studentId:'TEST_A'});assert.equal(output.students.length,1);assert.equal(output.workLogs.length,0);assert.equal(output.budgets.length,0);
  assert.doesNotMatch(JSON.stringify(output),/SECRET_|PRIVATE_|ADMIN_ONLY|ADMIN_BUDGET_MEMO|admin@example/);
});
test('월 예산 미설정·0원·음수 입력은 구분한다',()=>{
  const b=backend();assert.equal(b.optionalBudget_(''),'');assert.equal(b.optionalBudget_(undefined),'');assert.equal(b.optionalBudget_(0),0);assert.throws(()=>b.optionalBudget_(-1),/0원/);
});
test('저장 요청은 잠금 실패 시 쓰지 않고 오류 발생 후에도 잠금을 해제한다',()=>{
  const b=backend();let acquired=false,released=0,writes=0;
  b.LockService={getScriptLock:()=>({tryLock:()=>acquired,releaseLock:()=>released++})};
  b.requireRole_=()=>({role:'ADMIN'});b.adminUpsertBudget_=()=>{writes++;throw new Error('TEST_FAILURE');};
  assert.equal(b.route_({action:'adminUpsertBudget'}).ok,false);assert.equal(writes,0);assert.equal(released,0);
  acquired=true;assert.equal(b.route_({action:'adminUpsertBudget'}).error,'TEST_FAILURE');assert.equal(writes,1);assert.equal(released,1);
});
test('Google Sheet 날짜형 월 ID 수정은 기존 행을 찾아 중복 생성하지 않는다',()=>{
  const b=backend();const rows=[['month','totalBudget','note'],[new Date('2026-09-01T00:00:00+09:00'),100,'ORIGINAL']];
  const sheet={getLastRow:()=>rows.length,getLastColumn:()=>3,getRange:(r,c,n=1,m=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m)),setValues:values=>{values.forEach((v,i)=>v.forEach((x,j)=>rows[r-1+i][c-1+j]=x));}}),appendRow:v=>rows.push(v)};
  b.spreadsheet_=()=>({getSheetByName:()=>sheet});b.ensureTable_=()=>{};b.Utilities={getUuid:()=> 'TEST_UUID',formatDate:(_d,_tz,format)=>format==='yyyy-MM'?'2026-09':'2026-9'};
  b.upsertRecord_('Budgets',{month:'2026-09',totalBudget:200});assert.equal(rows.length,2);assert.equal(rows[1][1],200);assert.equal(rows[1][2],'ORIGINAL');
});
test('일반 저장의 스키마 확인은 기존 시트 전체 서식을 다시 적용하지 않는다',()=>{
  const b=backend();let formatting=0;
  const headers=['month','totalBudget','supportBudget','reserveBudget','shortTermBudget','note','updatedAt','updatedBy','nationalBudget','internalBudget'];
  const sheet={getLastRow:()=>2,getLastColumn:()=>headers.length,getRange:()=>({getValues:()=>[headers]}),setFrozenRows:()=>{formatting++;throw new Error('Unexpected formatting');}};
  b.spreadsheet_=()=>({getSheetByName:()=>sheet});
  b.ensureTable_('Budgets',true);assert.equal(formatting,0);
});
