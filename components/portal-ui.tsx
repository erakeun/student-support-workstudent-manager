import type { PortalData, Schedule, Student } from '@/lib/portal-types';

export const DAYS = ['', '월', '화', '수', '목', '금'];
export const PART_TONES: Record<string, string> = {
  SUPPORT: 'border-sky-200 bg-sky-50 text-sky-800',
  RESERVE: 'border-teal-200 bg-teal-50 text-teal-800',
  'student-support': 'border-sky-200 bg-sky-50 text-sky-800',
  'reserve-affairs': 'border-teal-200 bg-teal-50 text-teal-800',
  'chinese-support': 'border-amber-200 bg-amber-50 text-amber-800',
};

export function seoulNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
  );
}
export function isoDate(date = seoulNow()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function monthKey(date = seoulNow()) {
  return isoDate(date).slice(0, 7);
}
export function minutes(value = '00:00') {
  const [h, m] = value.slice(0, 5).split(':').map(Number);
  return h * 60 + (m || 0);
}
export function hoursText(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}시간${m ? ` ${m}분` : ''}`;
}
export function clockText(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 5)
    : date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      });
}
export function activeSemester(data: PortalData) {
  return (
    data.semesters.find((s) => s.semesterId === data.settings.activeSemester) ||
    data.semesters.find((s) => s.active) ||
    data.semesters[0]
  );
}
export function studentName(data: PortalData, id: string) {
  return data.students.find((s) => s.studentId === id)?.name || '확인 필요';
}
export function partName(data: PortalData, id: string) {
  return data.parts.find((p) => p.partId === id)?.partName || '확인 필요';
}
export function workerTypeKey(value?: string) {
  if (value === 'NATIONAL_WORK') return 'NATIONAL_WORK';
  if (value === 'SHORT_TERM') return 'SHORT_TERM';
  return 'INTERNAL_WORK';
}
export function workerTypeName(value?: string) {
  const key = workerTypeKey(value);
  return key === 'NATIONAL_WORK'
    ? '국가근로'
    : key === 'SHORT_TERM'
      ? '단기근로'
      : '교내근로';
}
export function activeSchedules(data: PortalData, studentId?: string) {
  return data.schedules.filter(
    (s) =>
      s.active !== false &&
      String(s.semesterId) === String(data.settings.activeSemester) &&
      data.students.some(student => student.studentId === s.studentId && student.active !== false) &&
      (!studentId || s.studentId === studentId),
  );
}
export function scheduleOnDate(data: PortalData, schedule: Schedule, date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const term = activeSemester(data);
  const student = data.students.find(row => row.studentId === schedule.studentId);
  return day >= 1 && day <= 5 && schedule.active !== false && student?.active !== false &&
    String(schedule.semesterId) === String(data.settings.activeSemester) &&
    (!term?.startDate || date >= term.startDate) && (!term?.endDate || date <= term.endDate) &&
    (!student?.startDate || date >= student.startDate) && (!student?.endDate || date <= student.endDate) &&
    (schedule.date ? schedule.date === date : Number(schedule.dayOfWeek) === day);
}
export function todaySchedules(data: PortalData, studentId?: string) {
  const today = isoDate();
  return activeSchedules(data, studentId)
    .filter((s) => scheduleOnDate(data, s, today))
    .sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
}
export function scheduleState(schedule: Schedule) {
  const now = seoulNow();
  const current = now.getHours() * 60 + now.getMinutes();
  return current < minutes(schedule.startTime)
    ? '예정'
    : current >= minutes(schedule.endTime)
      ? '종료'
      : '근무중';
}
export function shortTermState(student: Student) {
  if (student.workerType !== 'SHORT_TERM' || !student.endDate) return '';
  const end = new Date(`${student.endDate}T23:59:59+09:00`);
  if (end.getTime() < Date.now()) return '기간 종료';
  const diff = Math.ceil(
    (end.getTime() - Date.now()) / 86400000,
  );
  return diff <= 14 ? `${diff}일 후 종료` : '';
}
export function flagLabel(code?: string) {
  if (!code) return '';
  const labels: Record<string, string> = {
    MISSING_CLOCK_OUT: '퇴근 누락',
    INVALID_TIME: '시간 오류',
    DUPLICATE_DAY: '중복 기록',
    INACTIVE_STUDENT: '비활성 학생',
    SCHEDULE_MISMATCH: '시간표 불일치',
    OUTSIDE_SCHEDULE: '시간표 외 출근',
  };
  return code
    .split(',')
    .map((item) => labels[item] || item)
    .join(' · ');
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div>
        <p className="mb-1 text-xs font-black tracking-[.12em] text-[#075b9b]">
          {eyebrow}
        </p>
        <h2 className="text-[27px] font-black tracking-[-.045em] text-slate-950">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-28 place-items-center rounded-xl border border-dashed bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
