'use client';
/* oxlint-disable jsx-a11y/label-has-associated-control jsx-a11y/prefer-tag-over-role typescript/no-deprecated typescript/no-floating-promises */

import { FormEvent, useState } from 'react';
import {
  BookOpenText,
  CalendarDays,
  Clock3,
  Home,
  LogIn,
  LogOut,
  RefreshCw,
  Repeat2,
  ScrollText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type { PortalData, SessionUser } from '@/lib/portal-types';
import {
  DAYS,
  Empty,
  PART_TONES,
  PageTitle,
  activeSemester,
  clockText,
  flagLabel,
  hoursText,
  isoDate,
  monthKey,
  partName,
  scheduleState,
  todaySchedules,
} from './portal-ui';

type StudentView = 'home' | 'schedule' | 'logs' | 'wiki' | 'substitutions';
const NAV: Array<{ id: StudentView; label: string; icon: typeof Home }> = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'schedule', label: '내 시간표', icon: CalendarDays },
  { id: 'logs', label: '내 기록', icon: ScrollText },
  { id: 'wiki', label: '근로 위키', icon: BookOpenText },
  { id: 'substitutions', label: '대체근무', icon: Repeat2 },
];

export function StudentPortal({
  user,
  data,
  busy,
  message,
  onAction,
  onRefresh,
  onLogout,
}: {
  user: SessionUser;
  data: PortalData;
  busy: boolean;
  message: string;
  onAction: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [view, setView] = useState<StudentView>('home');
  const [month, setMonth] = useState(monthKey());
  const student = data.students[0];
  const today = todaySchedules(data, student?.studentId);
  const working = data.workLogs.find((log) => log.status === 'WORKING');
  const complete = data.workLogs.filter((log) => log.status === 'COMPLETE');
  const monthlyMinutes = complete
    .filter((log) => log.date.startsWith(monthKey()))
    .reduce((sum, log) => sum + Number(log.minutes || 0), 0);
  const semester = activeSemester(data);
  const semesterMinutes = complete
    .filter(
      (log) =>
        !semester ||
        (log.date >= semester.startDate && log.date <= semester.endDate),
    )
    .reduce((sum, log) => sum + Number(log.minutes || 0), 0);
  const next = data.schedules
    .filter((s) => s.active !== false)
    .sort((a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek))[0];

  const home = (
    <>
      <section className="student-hero rounded-[20px] bg-[#075b9b] p-6 text-white sm:p-8">
        <p className="text-sm font-bold text-sky-100">
          {partName(data, student.partId)} ·{' '}
          {semester?.semesterName || data.settings.activeSemester}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-[-.045em]">
          안녕하세요, {student.name}님.
        </h2>
        <p className="mt-2 text-sm text-sky-100">
          오늘{' '}
          {today.length
            ? today.map((s) => `${s.startTime}–${s.endTime}`).join(', ')
            : '예정된 근무가 없습니다'}
          .
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Summary
            label="현재 상태"
            value={
              working
                ? '근무중'
                : today.some((s) => scheduleState(s) === '종료')
                  ? '근무 완료'
                  : '근무 전'
            }
          />
          <Summary label="이번 달 누적" value={hoursText(monthlyMinutes)} />
          <Summary label="이번 학기 누적" value={hoursText(semesterMinutes)} />
        </div>
      </section>
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-[#075b9b]" />
              오늘 근무·출퇴근
            </CardTitle>
            <CardDescription>
              출근과 퇴근은 본인 계정으로만 기록됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {today.length ? (
              <div className="space-y-3">
                {today.map((schedule) => (
                  <div
                    key={schedule.scheduleId}
                    className="flex flex-col gap-3 rounded-xl border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <b>
                        {schedule.startTime}–{schedule.endTime}
                      </b>
                      <p className="mt-1 text-xs text-slate-500">
                        정규근무 · {scheduleState(schedule)}
                      </p>
                    </div>
                    {working ? (
                      <Button
                        disabled={busy}
                        variant="destructive"
                        onClick={() => {
                          void onAction('clockOut').catch(() => undefined);
                        }}
                      >
                        <LogOut />
                        퇴근하기
                      </Button>
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void onAction('clockIn').catch(() => undefined);
                        }}
                      >
                        <LogIn />
                        출근하기
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>오늘 정규 근무가 없습니다.</Empty>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>다음 근무</CardTitle>
            <CardDescription>현재 활성 학기 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {next ? (
              <>
                <p className="text-2xl font-black">
                  {DAYS[Number(next.dayOfWeek)]}요일
                </p>
                <p className="mt-1 font-mono text-sm">
                  {next.startTime}–{next.endTime}
                </p>
                <Button
                  className="mt-5 w-full"
                  variant="outline"
                  onClick={() => setView('schedule')}
                >
                  전체 시간표 보기
                </Button>
              </>
            ) : (
              <Empty>등록된 시간표가 없습니다.</Empty>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f3f6f8]">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[#075b9b] text-xs font-black text-white">
              HY
            </span>
            <div>
              <b className="block text-sm">나의 근로 포털</b>
              <span className="text-xs text-slate-500">
                {user.name} · {partName(data, student.partId)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              <RefreshCw />
            </Button>
            <Button size="sm" variant="outline" onClick={onLogout}>
              로그아웃
            </Button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 sm:flex">
          {NAV.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={view === id ? 'secondary' : 'ghost'}
              onClick={() => setView(id)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 pb-24 sm:p-7 sm:pb-8">
        {view === 'home' && home}
        {view === 'schedule' && <ScheduleView data={data} />}{' '}
        {view === 'logs' && (
          <LogsView data={data} month={month} setMonth={setMonth} />
        )}{' '}
        {view === 'wiki' && <WikiView data={data} />}{' '}
        {view === 'substitutions' && (
          <SubstitutionView data={data} busy={busy} onAction={onAction} />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-white px-1 py-1.5 sm:hidden">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${view === id ? 'bg-sky-50 text-[#075b9b]' : 'text-slate-500'}`}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <div
          role="status"
          className="fixed bottom-20 right-4 z-40 max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl sm:bottom-5"
        >
          {message}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/12 p-4 backdrop-blur">
      <p className="text-xs font-bold text-sky-100">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function ScheduleView({ data }: { data: PortalData }) {
  return (
    <>
      <PageTitle
        eyebrow="MY SCHEDULE"
        title="내 시간표"
        description="현재 활성 학기의 본인 정규 근무입니다."
      />
      <div className="grid gap-3 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((day) => (
          <Card key={day} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{DAYS[day]}요일</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.schedules
                .filter(
                  (s) => Number(s.dayOfWeek) === day && s.active !== false,
                )
                .map((s) => (
                  <div
                    key={s.scheduleId}
                    className="rounded-lg border bg-slate-50 p-3 font-mono text-sm font-bold"
                  >
                    {s.startTime}
                    <br />– {s.endTime}
                  </div>
                ))}
              {!data.schedules.some(
                (s) => Number(s.dayOfWeek) === day && s.active !== false,
              ) && <span className="text-sm text-slate-400">근무 없음</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function LogsView({
  data,
  month,
  setMonth,
}: {
  data: PortalData;
  month: string;
  setMonth: (value: string) => void;
}) {
  const logs = data.workLogs
    .filter((l) => l.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = logs
    .filter((l) => l.status === 'COMPLETE')
    .reduce((sum, l) => sum + Number(l.minutes || 0), 0);
  return (
    <>
      <PageTitle
        eyebrow="MY RECORDS"
        title="내 근무기록"
        description="완료된 실제 출퇴근 기록을 기준으로 누적시간을 계산합니다."
        action={
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44 bg-white"
          />
        }
      />
      <Card className="mb-4 shadow-none">
        <CardContent className="flex items-center justify-between p-5">
          <span className="text-sm font-bold text-slate-500">선택 월 누적</span>
          <b className="text-2xl">{hoursText(total)}</b>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.logId} className="shadow-none">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[120px_1fr_auto]">
              <b>{log.date}</b>
              <span className="text-sm">
                {clockText(log.clockIn)} – {clockText(log.clockOut)} ·{' '}
                {hoursText(Number(log.minutes || 0))}
              </span>
              <div className="flex gap-2">
                <Badge variant="outline">{log.status}</Badge>
                {log.flagCode && (
                  <Badge variant="destructive">{flagLabel(log.flagCode)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!logs.length && <Empty>선택한 달의 근무기록이 없습니다.</Empty>}
      </div>
    </>
  );
}

function WikiView({ data }: { data: PortalData }) {
  return (
    <>
      <PageTitle
        eyebrow="WORK WIKI"
        title="담당업무·근로 위키"
        description="업무가 막힐 때 담당 내용과 인수인계 정보를 확인하세요."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.tasks
          .filter((t) => t.active !== false)
          .map((task) => (
            <Card key={task.taskId} className="shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{task.taskName}</CardTitle>
                  <Badge variant="outline" className={PART_TONES[task.partId]}>
                    {partName(data, task.partId)}
                  </Badge>
                </div>
                <CardDescription>
                  {task.keywords?.split(',').join(' · ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">
                {task.description}
              </CardContent>
            </Card>
          ))}
        {!data.tasks.length && <Empty>등록된 근로 위키가 없습니다.</Empty>}
      </div>
    </>
  );
}

function SubstitutionView({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
}) {
  const student = data.students[0];
  const own =
    data.substitutions?.filter(
      (s) =>
        s.requesterStudentId === student.studentId ||
        s.substituteStudentId === student.studentId,
    ) || [];
  const open =
    data.substitutions?.filter(
      (s) => s.status === 'OPEN' && s.requesterStudentId !== student.studentId,
    ) || [];
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await onAction('studentCreateSubstitution', {
      scheduleId: f.get('scheduleId'),
      date: f.get('date'),
      reason: f.get('reason'),
    });
    form.reset();
  };
  return (
    <>
      <PageTitle
        eyebrow="SUBSTITUTION"
        title="대체근무"
        description="같은 파트 학생끼리만 신청할 수 있고 관리자가 최종 승인합니다."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>내 일정 대체 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <label className="field-label">
                정규 시간표
                <NativeSelect name="scheduleId" required>
                  {data.schedules
                    .filter((s) => s.active !== false)
                    .map((s) => (
                      <NativeSelectOption
                        key={s.scheduleId}
                        value={s.scheduleId}
                      >
                        {DAYS[Number(s.dayOfWeek)]} {s.startTime}–{s.endTime}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </label>
              <label className="field-label">
                날짜
                <Input name="date" type="date" min={isoDate()} required />
              </label>
              <label className="field-label">
                사유
                <Input name="reason" required />
              </label>
              <Button type="submit" disabled={busy} className="w-full">
                요청 등록
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>같은 파트 모집</CardTitle>
            <CardDescription>
              다른 파트 요청은 서버 응답에도 포함되지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {open.map((item) => (
              <div key={item.substitutionId} className="rounded-xl border p-4">
                <b>{item.date}</b>
                <p className="mt-1 text-sm text-slate-500">
                  {item.reason || '사유 없음'}
                </p>
                <Button
                  disabled={busy}
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    void onAction('studentApplySubstitution', {
                      substitutionId: item.substitutionId,
                    }).catch(() => undefined);
                  }}
                >
                  대체 신청
                </Button>
              </div>
            ))}
            {!open.length && (
              <Empty>신청 가능한 같은 파트 요청이 없습니다.</Empty>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>내 요청·신청 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {own.map((item) => (
            <div
              key={item.substitutionId}
              className="flex justify-between rounded-lg border p-3 text-sm"
            >
              <span>
                {item.date} · {item.reason}
              </span>
              <Badge variant="outline">{item.status}</Badge>
            </div>
          ))}
          {!own.length && <Empty>대체근무 기록이 없습니다.</Empty>}
        </CardContent>
      </Card>
    </>
  );
}
