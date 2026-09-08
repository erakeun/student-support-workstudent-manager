import type { PortalData, Schedule } from './portal-types';

const makeSchedules = (
  studentId: string,
  ranges: Array<[number, string, string]>,
): Schedule[] => ranges.map(([dayOfWeek, startTime, endTime], index) => ({
  scheduleId: `schedule-${studentId}-${index + 1}`,
  studentId,
  dayOfWeek,
  startTime,
  endTime,
  semesterId: '2026-2',
  active: true,
}));

export const DEMO_DATA: PortalData = {
  parts: [
    { partId: 'SUPPORT', partName: '지원팀', displayOrder: 1, color: '#0b72b9', active: true },
    { partId: 'RESERVE', partName: '예비군연대', displayOrder: 2, color: '#2f7f76', active: true },
  ],
  students: [
    { studentId: 'student-a', name: '학생 A', studentNumber: '2026000001', partId: 'SUPPORT', workerType: 'NATIONAL_WORK', startDate: '2026-09-01', endDate: '2027-02-28', taskSummary: '장학 민원 및 서류 정리', workMemo: '공용 문서함 확인', contactMemo: '', specialNote: '', substituteTasks: '민원 서류 전달', active: true },
    { studentId: 'student-b', name: '학생 B', studentNumber: '2026000002', partId: 'SUPPORT', workerType: 'NATIONAL_WORK', startDate: '2026-09-01', endDate: '2027-02-28', taskSummary: '학생지원 창구 보조', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '장학 서류 정리', active: true },
    { studentId: 'student-c', name: '학생 C', studentNumber: '2026000003', partId: 'SUPPORT', workerType: 'NATIONAL_WORK', startDate: '2026-09-01', endDate: '2027-02-28', taskSummary: '학생증 및 민원 안내', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '민원 안내', active: true },
    { studentId: 'student-d', name: '학생 D', studentNumber: '2026000004', partId: 'RESERVE', workerType: 'NATIONAL_WORK', startDate: '2026-09-01', endDate: '2027-02-28', taskSummary: '예비군 문의 1차 응대', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '예비군 서류 분류', active: true },
    { studentId: 'student-e', name: '학생 E', studentNumber: '2026000005', partId: 'RESERVE', workerType: 'NATIONAL_WORK', startDate: '2026-09-01', endDate: '2027-02-28', taskSummary: '병무 관련 서류 정리', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '예비군 전화 응대', active: true },
    { studentId: 'student-f', name: '학생 F', studentNumber: '2026000006', partId: 'RESERVE', workerType: 'NATIONAL_WORK', startDate: '2026-09-01', endDate: '2027-02-28', taskSummary: '훈련 일정 및 민원 안내', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '병무 서류 정리', active: true },
    { studentId: 'student-g', name: '학생 G', studentNumber: '2026000007', partId: 'SUPPORT', workerType: 'SHORT_TERM', startDate: '2026-09-01', endDate: '2026-12-31', taskSummary: '중국 유학생 안내 보조', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '번역 및 안내', active: true },
    { studentId: 'student-h', name: '학생 H', studentNumber: '2026000008', partId: 'SUPPORT', workerType: 'SHORT_TERM', startDate: '2026-09-01', endDate: '2026-12-31', taskSummary: '중국어 민원 및 번역 보조', workMemo: '', contactMemo: '', specialNote: '', substituteTasks: '중국 유학생 안내', active: true },
  ],
  schedules: [
    ...makeSchedules('student-a', [[1,'09:00','12:00'],[1,'13:00','17:00'],[4,'09:00','12:00'],[4,'13:00','14:30'],[5,'09:00','12:00']]),
    ...makeSchedules('student-b', [[3,'09:00','12:00'],[3,'13:00','15:00'],[5,'13:00','17:00']]),
    ...makeSchedules('student-c', [[2,'09:00','12:00'],[2,'13:00','17:00'],[4,'14:30','17:00']]),
    ...makeSchedules('student-d', [[1,'09:00','12:00'],[2,'09:00','12:00'],[4,'09:00','12:00'],[4,'13:00','15:00']]),
    ...makeSchedules('student-e', [[2,'13:00','15:00'],[4,'15:00','17:00'],[5,'09:00','12:00'],[5,'13:00','17:00']]),
    ...makeSchedules('student-f', [[1,'13:00','17:00'],[2,'15:00','17:00'],[3,'09:00','12:00'],[3,'13:00','17:00']]),
    ...makeSchedules('student-g', [[1,'09:00','12:00'],[1,'13:00','17:00'],[2,'09:00','10:00'],[2,'14:30','17:00'],[4,'09:00','12:00'],[4,'14:30','17:00'],[5,'09:00','09:30'],[5,'10:00','12:00'],[5,'13:00','17:00']]),
    ...makeSchedules('student-h', [[1,'09:00','12:00'],[2,'09:00','10:00'],[2,'13:00','17:00'],[3,'09:00','12:00'],[3,'13:00','17:00'],[4,'09:00','12:00'],[4,'13:00','15:00'],[5,'09:00','10:00'],[5,'14:30','17:00']]),
  ],
  tasks: [
    { taskId: 'task-1', taskName: '장학 민원', description: '장학 관련 기본 문의와 제출 서류 안내', partId: 'SUPPORT', studentId: 'student-a', employeeId: '', keywords: '장학,서류,민원', active: true },
    { taskId: 'task-2', taskName: '예비군 전화 응대', description: '예비군 문의 접수 및 담당자 연결', partId: 'RESERVE', studentId: 'student-d', employeeId: '', keywords: '예비군,훈련,전화', active: true },
    { taskId: 'task-3', taskName: '병무 서류 분류', description: '병무 관련 수신 서류 분류와 전달', partId: 'RESERVE', studentId: 'student-e', employeeId: '', keywords: '병무,서류', active: true },
    { taskId: 'task-4', taskName: '중국 유학생 안내', description: '중국어 문의 응대 및 안내 보조', partId: 'SUPPORT', studentId: 'student-h', employeeId: '', keywords: '중국어,유학생,번역', active: true },
  ],
  employees: [],
  workLogs: [],
  semesters: [
    { semesterId: '2026-2', semesterName: '2026학년도 2학기', startDate: '2026-09-01', endDate: '2027-02-28', active: true },
  ],
  settings: { activeSemester: '2026-2', timezone: 'Asia/Seoul', defaultHourlyWage: '10320' },
  budgets: [],
  handovers: [],
};
