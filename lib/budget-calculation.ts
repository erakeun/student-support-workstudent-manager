import type { PortalData, Student } from './portal-types';

// Calendar arithmetic must not change with the operator's browser time zone.
export function scheduledMinutesForMonth(data: PortalData, student: Student, month: string) {
  if (student.active === false || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return 0;
  const term = data.semesters.find(row => String(row.semesterId) === String(data.settings.activeSemester));
  const [year, number] = month.split('-').map(Number);
  let total = 0;
  for (let day = 1; day <= new Date(Date.UTC(year, number, 0)).getUTCDate(); day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday < 1 || weekday > 5) continue;
    if ((term?.startDate && date < term.startDate) || (term?.endDate && date > term.endDate) || (student.startDate && date < student.startDate) || (student.endDate && date > student.endDate)) continue;
    for (const row of data.schedules) {
      if (row.active === false || row.studentId !== student.studentId || String(row.semesterId) !== String(data.settings.activeSemester)) continue;
      if (row.date ? row.date !== date : Number(row.dayOfWeek) !== weekday) continue;
      const toMinutes = (value: string) => { const [h,m] = value.split(':').map(Number); return h * 60 + m; };
      total += Math.max(0, toMinutes(row.endTime) - toMinutes(row.startTime));
    }
  }
  return total;
}

export function monthlyBudgetRows(data: PortalData, month: string) {
  return data.students.map(student => {
    const individual = Number(student.hourlyWage || 0);
    const wage = individual > 0 ? individual : Number(data.settings.defaultHourlyWage || 10320);
    const scheduledMinutes = scheduledMinutesForMonth(data, student, month);
    // Deactivation ends future planning, never removes already completed work.
    const actualMinutes = data.workLogs.filter(log => log.studentId === student.studentId && log.status === 'COMPLETE' && log.date.slice(0,7) === month).reduce((sum,log) => sum + Number(log.minutes || 0), 0);
    return {student, scheduledMinutes, actualMinutes, wage, wageSource: individual > 0 ? '개별' : '기본 시급', scheduledCost: Math.round(scheduledMinutes / 60 * wage), actualCost: Math.round(actualMinutes / 60 * wage)};
  }).filter(row => row.student.active !== false || row.actualMinutes > 0);
}
