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
  UserRound,
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
  scheduleOnDate,
} from './portal-ui';

type StudentView =
  | 'home'
  | 'attendance'
  | 'schedule'
  | 'logs'
  | 'handovers'
  | 'substitutions'
  | 'wiki'
  | 'profile';
const NAV: Array<{ id: StudentView; label: string; icon: typeof Home }> = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'attendance', label: '출퇴근', icon: Clock3 },
  { id: 'schedule', label: '내 시간표', icon: CalendarDays },
  { id: 'logs', label: '내 근무기록', icon: ScrollText },
  { id: 'handovers', label: '공유메모', icon: BookOpenText },
  { id: 'substitutions', label: '대체근무', icon: Repeat2 },
  { id: 'wiki', label: '담당업무', icon: BookOpenText },
  { id: 'profile', label: '내 정보', icon: UserRound },
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
  const semesterPeriodKnown = Boolean(semester?.startDate && semester?.endDate);
  const semesterMinutes = complete
    .filter(
      (log) =>
        !semester ||
        (log.date >= semester.startDate && log.date <= semester.endDate),
    )
    .reduce((sum, log) => sum + Number(log.minutes || 0), 0);
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
                : complete.some((log) => log.date === isoDate())
                  ? '퇴근 기록 있음'
                  : today.some((s) => scheduleState(s) === '종료') ? '출퇴근 기록 없음' : '근무 전'
            }
          />
          <Summary label="이번 달 누적" value={hoursText(monthlyMinutes)} />
          <Summary label="이번 학기 누적" value={semesterPeriodKnown ? hoursText(semesterMinutes) : '학기 기간 확인 필요'} />
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
              <div className="space-y-3"><p className="text-sm text-slate-500">오늘 정규 근무가 없습니다. 시간표 밖 기록은 관리자 확인 대상으로 표시됩니다.</p><Button className="h-12 w-full" disabled={busy} variant={working ? 'destructive' : 'default'} onClick={() => void onAction(working ? 'clockOut' : 'clockIn').catch(() => undefined)}>{working ? '퇴근하기' : '출근하기'}</Button></div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>이번 주 근무표</CardTitle>
            <CardDescription>월–금 개인 일정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">{[1,2,3,4,5].map((day) => { const rows=data.schedules.filter(s => !s.date && s.active !== false && Number(s.dayOfWeek)===day); return <button key={day} onClick={() => setView('schedule')} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm"><b>{DAYS[day]}</b><span className="font-mono text-xs text-slate-500">{rows.length ? rows.map(row => `${row.startTime}–${row.endTime}`).join(', ') : '근무 없음'}</span></button>; })}</div>
          </CardContent>
        </Card>
      </section>
      <Card className="mt-5 shadow-none"><CardHeader><CardTitle>근무 공유메모</CardTitle><CardDescription>다음 근무자에게 전달된 최근 미처리 내용입니다.</CardDescription></CardHeader><CardContent className="space-y-2">{(data.handovers || []).filter(row => row.status !== 'DONE').sort((a,b) => Number(Boolean(b.pinned))-Number(Boolean(a.pinned))).slice(0,3).map(row => <button key={row.handoverId} onClick={() => setView('handovers')} className="block w-full rounded-lg border bg-slate-50 p-3 text-left"><span className="text-xs text-slate-500">{row.pinned ? '고정 · ' : ''}{row.priority === 'IMPORTANT' ? '중요 · ' : ''}{partName(data,row.partId)} · {row.date}</span><b className="mt-1 block text-sm">{row.title}</b></button>)}{!(data.handovers || []).some(row => row.status !== 'DONE') && <Empty>최근 공유메모가 없습니다.</Empty>}</CardContent></Card>
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
        {view === 'attendance' && (
          <AttendanceView
            data={data}
            busy={busy}
            onAction={onAction}
          />
        )}
        {view === 'schedule' && <ScheduleView data={data} />}{' '}
        {view === 'logs' && (
          <LogsView data={data} month={month} setMonth={setMonth} />
        )}{' '}
        {view === 'handovers' && <HandoversView data={data} busy={busy} onAction={onAction} />}{' '}
        {view === 'wiki' && <WikiView data={data} />}{' '}
        {view === 'substitutions' && (
          <SubstitutionView data={data} busy={busy} onAction={onAction} />
        )}
        {view === 'profile' && (
          <ProfileView data={data} busy={busy} onAction={onAction} />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t bg-white px-1 py-1.5 sm:hidden">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex min-h-14 min-w-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${view === id ? 'bg-sky-50 text-[#075b9b]' : 'text-slate-500'}`}
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
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [month, setMonth] = useState(monthKey());
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDate = new Date(year, monthNumber, 0).getDate();
  const calendarRows = Array.from({ length: lastDate }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return {
      date,
      day,
      schedules: data.schedules.filter(
        (s) => scheduleOnDate(data, s, date),
      ),
    };
  }).filter((row) => row.day >= 1 && row.day <= 5);
  const leading = calendarRows.length ? Math.max(0, calendarRows[0].day - 1) : 0;
  return (
    <>
      <PageTitle
        eyebrow="MY SCHEDULE"
        title="내 시간표"
        description="현재 활성 학기의 본인 정규 근무를 주간·월간으로 확인합니다."
        action={
          <div className="flex gap-2">
            <Button variant={mode === 'week' ? 'default' : 'outline'} onClick={() => setMode('week')}>주간</Button>
            <Button variant={mode === 'month' ? 'default' : 'outline'} onClick={() => setMode('month')}>월간</Button>
          </div>
        }
      />
      {mode === 'month' && <Input className="mb-4 w-44 bg-white" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />}
      {mode === 'week' ? <div className="grid gap-3 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((day) => (
          <Card key={day} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{DAYS[day]}요일</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.schedules
                .filter(
                  (s) => !s.date && Number(s.dayOfWeek) === day && s.active !== false,
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
                (s) => !s.date && Number(s.dayOfWeek) === day && s.active !== false,
              ) && <span className="text-sm text-slate-400">근무 없음</span>}
            </CardContent>
          </Card>
        ))}
      </div> : <Card className="overflow-auto shadow-none"><CardContent className="min-w-[650px] p-4"><div className="grid grid-cols-5 border-l border-t bg-white">{['월','화','수','목','금'].map((day) => <div key={day} className="border-b border-r bg-slate-50 p-2 text-center text-xs font-black text-slate-500">{day}</div>)}{Array.from({length:leading}).map((_,index) => <div key={`blank-${index}`} className="min-h-24 border-b border-r bg-slate-50/60" />)}{calendarRows.map((row) => <div key={row.date} className="min-h-24 border-b border-r p-2"><b className="text-xs text-slate-600">{Number(row.date.slice(-2))}일 {DAYS[row.day]}</b><div className="mt-2 space-y-1">{row.schedules.slice().sort((a,b) => a.startTime.localeCompare(b.startTime)).map((schedule) => <div key={schedule.scheduleId} className="rounded border bg-sky-50 px-2 py-1 font-mono text-xs font-bold text-sky-900">{schedule.startTime}–{schedule.endTime}</div>)}{!row.schedules.length && <span className="text-xs text-slate-300">근무 없음</span>}</div></div>)}</div></CardContent></Card>}
    </>
  );
}

function AttendanceView({ data, busy, onAction }: { data: PortalData; busy: boolean; onAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const working = data.workLogs.find((log) => log.status === 'WORKING');
  const today = todaySchedules(data, data.students[0]?.studentId);
  return <>
    <PageTitle eyebrow="CLOCK IN · OUT" title="출퇴근" description="모바일에서 바로 출근·퇴근을 기록합니다. 정규 시간표 밖 기록은 관리자 확인 대상으로 표시됩니다." />
    <Card className="mx-auto max-w-xl shadow-none"><CardHeader><CardTitle>{working ? '현재 근무 중입니다' : '출근 준비가 완료되었습니다'}</CardTitle><CardDescription>{today.length ? today.map((schedule) => `${schedule.startTime}–${schedule.endTime}`).join(', ') : '오늘 정규 일정 없음'}</CardDescription></CardHeader><CardContent>
      <Button className="h-16 w-full text-lg" variant={working ? 'destructive' : 'default'} disabled={busy} onClick={() => void onAction(working ? 'clockOut' : 'clockIn').catch(() => undefined)}>{working ? <LogOut /> : <LogIn />}{working ? '퇴근하기' : '출근하기'}</Button>
    </CardContent></Card>
  </>;
}

function ProfileView({ data, busy, onAction }: { data: PortalData; busy: boolean; onAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const student = data.students[0];
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onAction('studentUpdateContact', { email: form.get('email'), phone: form.get('phone') });
  };
  return <>
    <PageTitle eyebrow="MY PROFILE" title="내 정보" description="이름·학번·파트는 관리자만 변경할 수 있습니다. 이메일과 전화번호는 직접 수정할 수 있습니다." />
    <Card className="mx-auto max-w-2xl shadow-none"><CardContent className="p-6"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="field-label">이름<Input value={student.name} disabled /></label>
      <label className="field-label">학번<Input value={student.studentNumber || '확인 필요'} disabled /></label>
      <label className="field-label sm:col-span-2">파트<Input value={partName(data, student.partId)} disabled /></label>
      <label className="field-label">이메일<Input name="email" type="email" defaultValue={student.email || ''} /></label>
      <label className="field-label">전화번호<Input name="phone" type="tel" defaultValue={student.phone || ''} /></label>
      <Button className="sm:col-span-2" type="submit" disabled={busy}>연락처 저장</Button>
    </form></CardContent></Card>
  </>;
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

function HandoversView({ data, busy, onAction }: { data: PortalData; busy: boolean; onAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const student = data.students[0];
  const [editing, setEditing] = useState('');
  const selected = (data.handovers || []).find(row => row.handoverId === editing);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const f = Object.fromEntries(new FormData(form));
    await onAction('studentUpsertHandover',{record:{...selected,...f,status:selected?.status || 'OPEN',priority:selected?.priority || 'NORMAL',visibility:f.visibility || 'PUBLIC'}}); setEditing(''); form.reset();
  };
  const rows = (data.handovers || []).slice().sort((a,b) => Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
  return <><PageTitle eyebrow="SHARED NOTES" title="근무 공유메모·인수인계" description="다음 근무자에게 진행상황을 남기고, 공개 메모를 확인합니다." />
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><Card className="shadow-none"><CardHeader><CardTitle>{selected ? '내 인수인계 수정' : '새 인수인계 작성'}</CardTitle></CardHeader><CardContent><form key={selected?.handoverId || 'new'} onSubmit={submit} className="space-y-3"><label className="field-label">날짜<Input name="date" type="date" defaultValue={selected?.date || isoDate()} required /></label><label className="field-label">제목<Input name="title" maxLength={120} defaultValue={selected?.title || ''} required /></label><label className="field-label">내용<Input name="content" maxLength={2000} defaultValue={selected?.content || ''} required /></label><label className="field-label">공개범위<NativeSelect name="visibility" defaultValue={selected?.visibility || 'PUBLIC'}><NativeSelectOption value="PUBLIC">전체 공개</NativeSelectOption><NativeSelectOption value="PART">같은 조직</NativeSelectOption></NativeSelect></label><div className="flex gap-2"><Button type="submit" disabled={busy} className="flex-1">{selected ? '수정 저장' : '작성'}</Button>{selected && <Button type="button" variant="outline" onClick={() => setEditing('')}>취소</Button>}</div></form></CardContent></Card>
    <div className="space-y-3">{rows.map(row => { const mine = row.authorStudentId === student.studentId; const acknowledged = String(row.acknowledgedBy || '').split(',').includes(student.studentId); return <Card key={row.handoverId} className={row.priority === 'IMPORTANT' ? 'border-amber-300 bg-amber-50/40 shadow-none' : 'shadow-none'}><CardHeader><div className="flex flex-wrap gap-2">{row.pinned && <Badge>공지 고정</Badge>}{row.priority === 'IMPORTANT' && <Badge variant="destructive">중요</Badge>}<Badge variant="outline">{row.status}</Badge>{acknowledged && <Badge variant="secondary">확인함</Badge>}</div><CardTitle className="text-base">{row.title}</CardTitle><CardDescription>{row.date} · {partName(data,row.partId)}</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-slate-600">{row.content}</p><div className="mt-4 flex flex-wrap gap-2">{!acknowledged && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onAction('studentAcknowledgeHandover',{handoverId:row.handoverId}).catch(() => undefined)}>확인</Button>}{mine && <><Button size="sm" variant="outline" onClick={() => setEditing(row.handoverId)}>수정</Button>{row.status !== 'DONE' && <Button size="sm" onClick={() => void onAction('studentUpsertHandover',{record:{...row,status:'DONE'}}).catch(() => undefined)}>완료 표시</Button>}<Button size="sm" variant="destructive" onClick={() => void onAction('studentDeleteHandover',{handoverId:row.handoverId}).catch(() => undefined)}>삭제</Button></>}</div></CardContent></Card>; })}{!rows.length && <Empty>공개된 인수인계가 없습니다.</Empty>}</div></div></>;
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
