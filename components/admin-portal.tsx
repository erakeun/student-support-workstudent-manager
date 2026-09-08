'use client';
/* oxlint-disable jsx-a11y/label-has-associated-control jsx-a11y/prefer-tag-over-role typescript/no-deprecated typescript/no-base-to-string typescript/no-floating-promises */

import { FormEvent, useState } from 'react';
import { monthlyBudgetRows } from '@/lib/budget-calculation';
import {
  BookOpenText,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Repeat2,
  Settings2,
  ShieldCheck,
  UsersRound,
  WalletCards,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PortalData, Schedule, SessionUser } from '@/lib/portal-types';
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
  minutes,
  monthKey,
  partName,
  scheduleState,
  shortTermState,
  studentName,
  todaySchedules,
  workerTypeKey,
  workerTypeName,
  scheduleOnDate,
} from './portal-ui';

type AdminView =
  | 'dashboard'
  | 'today'
  | 'week'
  | 'students'
  | 'schedules'
  | 'logs'
  | 'tasks'
  | 'semesters'
  | 'parts'
  | 'substitutions'
  | 'handovers'
  | 'budget'
  | 'settings';
type Editor = {
  kind:
    | 'student'
    | 'password'
    | 'schedule'
    | 'log'
    | 'task'
    | 'semester'
    | 'part'
    | 'budget'
    | 'handover';
  record?: Record<string, unknown>;
} | null;
const NAV: Array<{
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'today', label: '오늘 근무', icon: Clock3 },
  { id: 'week', label: '주간 시간표', icon: CalendarDays },
  { id: 'students', label: '근로학생 관리', icon: UsersRound },
  { id: 'schedules', label: '시간표 편집', icon: CalendarDays },
  { id: 'logs', label: '근무기록 관리', icon: ClipboardCheck },
  { id: 'substitutions', label: '대체근무', icon: Repeat2 },
  { id: 'handovers', label: '공유메모', icon: BookOpenText },
  { id: 'tasks', label: '담당업무', icon: BookOpenText },
  { id: 'budget', label: '예산', icon: WalletCards },
  { id: 'semesters', label: '학기 관리', icon: Database },
  { id: 'parts', label: '파트 관리', icon: ShieldCheck },
  { id: 'settings', label: '설정', icon: Settings2 },
];

export function AdminPortal({
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
  const [view, setView] = useState<AdminView>('dashboard');
  const [menu, setMenu] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const render = {
    dashboard: <Dashboard data={data} setView={setView} />,
    today: <Today data={data} />,
    week: <Week data={data} edit={setEditor} />,
    students: <Students data={data} edit={setEditor} onAction={onAction} />,
    schedules: <Schedules data={data} edit={setEditor} onAction={onAction} />,
    logs: <Logs data={data} edit={setEditor} onAction={onAction} />,
    tasks: <Tasks data={data} edit={setEditor} onAction={onAction} />,
    semesters: <Semesters data={data} edit={setEditor} onAction={onAction} />,
    parts: <Parts data={data} edit={setEditor} onAction={onAction} />,
    substitutions: <Substitutions data={data} onAction={onAction} />,
    handovers: <Handovers data={data} edit={setEditor} onAction={onAction} />,
    budget: <Budget data={data} edit={setEditor} />,
    settings: <Settings data={data} busy={busy} onAction={onAction} />,
  }[view];
  return (
    <div className="min-h-screen bg-[#f3f6f8]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r bg-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-17 items-center gap-3 border-b px-5">
          <span className="grid size-10 place-items-center rounded-xl bg-[#075b9b] text-xs font-black text-white">
            HY
          </span>
          <div>
            <b className="block">학생지원팀 근로관리</b>
            <span className="text-xs text-slate-500">
              ERICA · {data.settings.activeSemester}
            </span>
          </div>
        </div>
        <nav className="h-[calc(100vh-8.5rem)] space-y-1 overflow-auto p-3">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setMenu(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold ${view === id ? 'bg-[#e7f2f9] text-[#075b9b]' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t p-4">
          <p className="truncate text-xs font-bold">{user.name || user.loginId}</p>
          <p className="truncate text-[11px] text-slate-400">{user.loginId}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={onLogout}
          >
            <LogOut />
            로그아웃
          </Button>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-17 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            <div>
              <p className="text-xs font-bold text-slate-500">
                관리자 · {activeSemester(data)?.semesterName}
              </p>
              <h1 className="font-black">
                {NAV.find((n) => n.id === view)?.label}
              </h1>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw />
            새로고침
          </Button>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-7">{render}</main>
      </section>
      <EditorDialog
        editor={editor}
        data={data}
        busy={busy}
        close={() => setEditor(null)}
        onAction={onAction}
      />
      {message && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl"
        >
          {message}
        </div>
      )}
    </div>
  );
}

function Dashboard({
  data,
  setView,
}: {
  data: PortalData;
  setView: (v: AdminView) => void;
}) {
  const today = todaySchedules(data);
  const todayLogs = data.workLogs.filter((l) => l.date === isoDate());
  const working = todayLogs.filter((l) => l.status === 'WORKING');
  const completed = todayLogs.filter((l) => l.status === 'COMPLETE');
  const notCheckedIn = today.filter(
    (schedule) =>
      scheduleState(schedule) !== '종료' &&
      !todayLogs.some((log) => log.studentId === schedule.studentId),
  );
  const warnings = data.workLogs.filter((l) => l.flagCode);
  const expiring = data.students.filter((s) => Boolean(shortTermState(s)));
  const openHandovers = (data.handovers || []).filter(row => row.status !== 'DONE');
  const dashboardBudget = (data.budgets || []).find(row => row.month === monthKey());
  const budgetLabels = [
    ['전체', dashboardBudget?.totalBudget],
    ['국가근로', dashboardBudget?.nationalBudget],
    ['교내근로', dashboardBudget?.internalBudget],
    ['단기근로', dashboardBudget?.shortTermBudget],
  ] as const;
  return (
    <>
      <PageTitle
        eyebrow="LIVE OPERATIONS"
        title="지원팀·예비군연대 운영 대시보드"
        description="현재·다음 근무와 확인 필요한 기록을 한 화면에서 봅니다."
      />
      <Card className="mb-4 shadow-none">
        <CardHeader>
          <CardTitle>오늘 근무 현황</CardTitle>
          <CardDescription>통합 사무실 전체 일정과 출퇴근 상태</CardDescription>
        </CardHeader>
        <CardContent>
          <ShiftTable data={data} rows={today} />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="오늘 예정" value={`${today.length}건`} />
        <Metric label="현재 근무중" value={`${working.length}명`} tone="blue" />
        <Metric label="미출근 예정" value={`${notCheckedIn.length}명`} tone={notCheckedIn.length ? 'amber' : ''} />
        <Metric label="퇴근 완료" value={`${completed.length}명`} />
        <Metric
          label="확인 필요"
          value={`${warnings.length}건`}
          tone={warnings.length ? 'red' : ''}
        />
        <Metric
          label="단기근로 종료"
          value={`${expiring.length}명`}
          tone={expiring.length ? 'amber' : ''}
        />
        <Metric label="미완료 인수인계" value={`${openHandovers.length}건`} tone={openHandovers.length ? 'amber' : ''} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>파트별 현재·다음 근무</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {data.parts.map((part) => {
              const rows = today.filter(
                (s) =>
                  data.students.find((st) => st.studentId === s.studentId)
                    ?.partId === part.partId,
              );
              const current = rows.filter((s) => scheduleState(s) === '근무중');
              const next = rows.find((s) => scheduleState(s) === '예정');
              return (
                <div
                  key={part.partId}
                  className={`rounded-xl border p-4 ${PART_TONES[part.partId] || ''}`}
                >
                  <b>{part.partName}</b>
                  <p className="mt-3 text-xs font-bold">
                    {current.length ? '현재 근무중' : '다음 근무'}
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {current.length
                      ? current
                          .map((s) => studentName(data, s.studentId))
                          .join(', ')
                      : next
                        ? studentName(data, next.studentId)
                        : '일정 없음'}
                  </p>
                  <p className="mt-1 text-xs">
                    {current.length
                      ? current
                          .map((s) => `${s.startTime}–${s.endTime}`)
                          .join(', ')
                      : next
                        ? `${next.startTime}–${next.endTime}`
                        : '-'}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>운영 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Quick
              label="근무기록 확인"
              value={warnings.length}
              onClick={() => setView('logs')}
            />
            <Quick
              label="단기근로 종료"
              value={expiring.length}
              onClick={() => setView('students')}
            />
            <Quick
              label="대체근무 처리"
              value={
                (data.substitutions || []).filter((s) => s.status === 'APPLIED')
                  .length
              }
              onClick={() => setView('substitutions')}
            />
            <Quick label="인수인계 확인" value={openHandovers.length} onClick={() => setView('handovers')} />
            <button className="w-full rounded-lg border p-3 text-left text-sm font-bold hover:bg-slate-50" onClick={() => setView('budget')}>예산 설정 바로가기</button>
            <button className="w-full rounded-lg border p-3 text-left text-sm font-bold hover:bg-slate-50" onClick={() => setView('schedules')}>시간표 수정 바로가기</button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card className="shadow-none"><CardHeader><CardTitle>이번 주 스케줄</CardTitle><CardDescription>월–금 정규 일정 요약</CardDescription></CardHeader><CardContent className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map(day => <button key={day} onClick={() => setView('week')} className="rounded-lg border bg-slate-50 p-3 text-center"><b className="text-sm">{DAYS[day]}</b><span className="mt-1 block text-lg font-black">{data.schedules.filter(row => row.active !== false && !row.date && Number(row.dayOfWeek) === day).length}</span><small className="text-slate-400">구간</small></button>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle>이번 달 스케줄</CardTitle><CardDescription>{monthKey()} 실제 달력 기준</CardDescription></CardHeader><CardContent><p className="text-3xl font-black">{monthlyScheduleCount(data, monthKey())}건</p><p className="mt-2 text-sm text-slate-500">날짜 지정 일정과 정규 반복 일정을 함께 집계합니다.</p><Button variant="outline" className="mt-4" onClick={() => setView('week')}>월간 시간표 열기</Button></CardContent></Card></div>
      <Card className="mt-4 shadow-none"><CardHeader><CardTitle>공유메모·인수인계</CardTitle><CardDescription>고정·중요·미처리 순으로 최근 내용을 확인합니다.</CardDescription></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{openHandovers.slice().sort((a,b) => Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || Number(b.priority === 'IMPORTANT')-Number(a.priority === 'IMPORTANT')).slice(0,4).map(row => <button key={row.handoverId} className="rounded-lg border bg-slate-50 p-3 text-left" onClick={() => setView('handovers')}><span className="text-xs text-slate-500">{row.pinned ? '고정 · ' : ''}{row.priority === 'IMPORTANT' ? '중요 · ' : ''}{partName(data,row.partId)} · {studentName(data,row.authorStudentId)}</span><b className="mt-1 block text-sm">{row.title}</b></button>)}{!openHandovers.length && <Empty>미완료 공유메모가 없습니다.</Empty>}</CardContent></Card>
      <Card className="mt-4 shadow-none"><CardHeader><CardTitle>확인 필요 근태·예산</CardTitle><CardDescription>{monthKey()} 운영 점검</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{budgetLabels.map(([label,value]) => { const configured=value !== '' && value !== undefined && value !== null; return <button key={label} onClick={() => setView('budget')} className="rounded-lg border p-3 text-left"><span className="text-xs text-slate-500">{label} 예산</span><b className="mt-1 block text-sm">{configured ? `${Number(value).toLocaleString()}원` : '예산 미설정'}</b></button>; })}<button onClick={() => setView('logs')} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left"><span className="text-xs text-amber-700">근태 확인 필요</span><b className="mt-1 block text-sm">{warnings.length}건</b></button></CardContent></Card>
      <TaskSearch data={data} />
    </>
  );
}
function monthlyScheduleCount(data: PortalData, month: string) {
  const [year, monthNumber] = month.split('-').map(Number); const last = new Date(year, monthNumber, 0).getDate(); let total = 0;
  for (let dateNumber = 1; dateNumber <= last; dateNumber += 1) { const date = `${month}-${String(dateNumber).padStart(2,'0')}`; const day = new Date(`${date}T12:00:00+09:00`).getDay(); total += data.schedules.filter(row => row.active !== false && (row.date ? row.date === date : Number(row.dayOfWeek) === day)).length; }
  return total;
}
function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const c =
    tone === 'red'
      ? 'border-red-200 bg-red-50'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50'
        : tone === 'blue'
          ? 'border-sky-200 bg-sky-50'
          : 'bg-white';
  return (
    <Card className={`shadow-none ${c}`}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
function Quick({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border p-3 text-sm font-bold hover:bg-slate-50"
    >
      <span>{label}</span>
      <Badge variant={value ? 'destructive' : 'outline'}>{value}건</Badge>
    </button>
  );
}

function TaskSearch({ data }: { data: PortalData }) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? data.tasks.filter((task) =>
        [task.taskName, task.description, task.keywords, partName(data, task.partId)]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    : [];
  return (
    <Card className="mt-4 shadow-none">
      <CardHeader>
        <CardTitle>담당업무 빠른 찾기</CardTitle>
        <CardDescription>업무명·설명·키워드·파트로 검색합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 학적, 비자, 예비군"
        />
        {normalized && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {results.map((task) => (
              <div key={task.taskId} className="rounded-lg border bg-slate-50 p-3">
                <b className="text-sm">{task.taskName}</b>
                <p className="mt-1 text-xs text-slate-500">
                  {partName(data, task.partId)} · {studentName(data, task.studentId)}
                </p>
                <p className="mt-2 text-sm text-slate-600">{task.description}</p>
              </div>
            ))}
            {!results.length && <Empty>검색 결과가 없습니다.</Empty>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Today({ data }: { data: PortalData }) {
  return (
    <>
      <PageTitle
        eyebrow="TODAY"
        title="오늘 근무"
        description="파트별 정규 일정과 실제 출퇴근 상태를 함께 확인합니다."
      />
      <Card className="shadow-none">
        <CardContent className="p-5">
          <ShiftTable data={data} rows={todaySchedules(data)} />
        </CardContent>
      </Card>
    </>
  );
}
function ShiftTable({ data, rows }: { data: PortalData; rows: Schedule[] }) {
  if (!rows.length) return <Empty>오늘 일정이 없습니다.</Empty>;
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>시간</TableHead>
            <TableHead>학생</TableHead>
            <TableHead>파트</TableHead>
            <TableHead>예정 상태</TableHead>
            <TableHead>출퇴근</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => {
            const log = data.workLogs.find(
              (l) => l.date === isoDate() && l.studentId === s.studentId,
            );
            const st = data.students.find((x) => x.studentId === s.studentId);
            return (
              <TableRow key={s.scheduleId}>
                <TableCell className="font-mono">
                  {s.startTime}–{s.endTime}
                </TableCell>
                <TableCell className="font-bold">{st?.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={PART_TONES[st?.partId || '']}
                  >
                    {partName(data, st?.partId || '')}
                  </Badge>
                </TableCell>
                <TableCell>{scheduleState(s)}</TableCell>
                <TableCell>
                  {log
                    ? `${clockText(log.clockIn)}–${clockText(log.clockOut)} · ${log.status}`
                    : '기록 없음'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Week({ data, edit }: { data: PortalData; edit: (e: Editor) => void }) {
  const [part, setPart] = useState('all');
  const [workerType, setWorkerType] = useState('all');
  const [student, setStudent] = useState('all');
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [month, setMonth] = useState(monthKey());
  const rows = data.schedules.filter(
    (s) =>
      s.active !== false &&
      String(s.semesterId) === String(data.settings.activeSemester) &&
      data.students.some(
        (st) =>
          st.studentId === s.studentId &&
          st.active !== false &&
          (part === 'all' || st.partId === part) &&
          (workerType === 'all' || workerTypeKey(st.workerType) === workerType) &&
          (student === 'all' || st.studentId === student),
      ),
  );
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDate = new Date(year, monthNumber, 0).getDate();
  const monthly = Array.from({ length: lastDate }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return { date, day, rows: rows.filter((schedule) => scheduleOnDate(data, schedule, date)) };
  }).filter((item) => item.day >= 1 && item.day <= 5);
  return (
    <>
      <PageTitle
        eyebrow="WEEKLY SCHEDULE"
        title="통합 시간표"
        description="파트·학생을 필터링하고 주간 또는 실제 날짜가 적용된 월간 일정으로 봅니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant={mode === 'week' ? 'default' : 'outline'} onClick={() => setMode('week')}>주간</Button>
            <Button variant={mode === 'month' ? 'default' : 'outline'} onClick={() => setMode('month')}>월간</Button>
            <NativeSelect value={part} onChange={(e) => setPart(e.target.value)} className="w-44 bg-white"><NativeSelectOption value="all">전체 파트</NativeSelectOption>{data.parts.map((p) => <NativeSelectOption key={p.partId} value={p.partId}>{p.partName}</NativeSelectOption>)}</NativeSelect>
            <NativeSelect value={workerType} onChange={(e) => setWorkerType(e.target.value)} className="w-44 bg-white"><NativeSelectOption value="all">전체 근로유형</NativeSelectOption><NativeSelectOption value="NATIONAL_WORK">국가근로</NativeSelectOption><NativeSelectOption value="INTERNAL_WORK">교내근로</NativeSelectOption><NativeSelectOption value="SHORT_TERM">단기근로</NativeSelectOption></NativeSelect>
            <NativeSelect value={student} onChange={(e) => setStudent(e.target.value)} className="w-44 bg-white"><NativeSelectOption value="all">전체 학생</NativeSelectOption>{data.students.filter((item) => part === 'all' || item.partId === part).map((item) => <NativeSelectOption key={item.studentId} value={item.studentId}>{item.name}</NativeSelectOption>)}</NativeSelect>
          </div>
        }
      />
      {mode === 'month' && <Input className="mb-4 w-44 bg-white" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />}
      {mode === 'week' ? <Card className="overflow-auto shadow-none">
        <CardContent className="min-w-[900px] p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">시간</TableHead>
                {[1, 2, 3, 4, 5].map((d) => (
                  <TableHead key={d}>{DAYS[d]}요일</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 16 }, (_, i) => 540 + i * 30).map(
                (start) => (
                  <TableRow key={start}>
                    <TableCell className="font-mono text-xs">
                      {String(Math.floor(start / 60)).padStart(2, '0')}:
                      {String(start % 60).padStart(2, '0')}
                    </TableCell>
                    {[1, 2, 3, 4, 5].map((day) => (
                      <TableCell key={day} className="align-top">
                        {rows
                          .filter(
                            (s) =>
                              !s.date &&
                              Number(s.dayOfWeek) === day &&
                              minutes(s.startTime) <= start &&
                              minutes(s.endTime) > start,
                          )
                          .map((s) => {
                            const st = data.students.find(
                              (x) => x.studentId === s.studentId,
                            );
                            return (
                              <button
                                key={s.scheduleId}
                                className={`mr-1 inline-block rounded-md border px-2 py-1 text-xs font-bold ${PART_TONES[st?.partId || '']}`}
                                onClick={() => edit({ kind: 'schedule', record: s as unknown as Record<string, unknown> })}
                              >
                                {st?.name}
                              </button>
                            );
                          })}
                      </TableCell>
                    ))}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card> : <MonthCalendar data={data} items={monthly} edit={edit} />}
    </>
  );
}

function MonthCalendar({ data, items, edit }: { data: PortalData; items: Array<{ date: string; day: number; rows: Schedule[] }>; edit: (e: Editor) => void }) {
  const leading = items.length ? Math.max(0, items[0].day - 1) : 0;
  return <Card className="overflow-auto shadow-none"><CardContent className="min-w-[760px] p-4"><div className="grid grid-cols-5 border-l border-t bg-white">{['월','화','수','목','금'].map(day => <div key={day} className="border-b border-r bg-slate-50 p-2 text-center text-xs font-black text-slate-500">{day}</div>)}{Array.from({length: leading}).map((_, index) => <div key={`blank-${index}`} className="min-h-28 border-b border-r bg-slate-50/60" />)}{items.map(item => { const groups = item.rows.slice().sort((a,b) => minutes(a.startTime)-minutes(b.startTime)).reduce<Record<string, Schedule[]>>((acc,row) => { (acc[row.startTime] ||= []).push(row); return acc; }, {}); return <div key={item.date} className="min-h-28 border-b border-r p-2"><b className="text-xs text-slate-600">{Number(item.date.slice(-2))}일 {DAYS[item.day]}</b><div className="mt-2 space-y-1.5">{Object.entries(groups).map(([time, schedules]) => <div key={time} className="flex items-start gap-1.5 text-xs"><span className="w-10 shrink-0 font-mono font-bold text-slate-500">{time}</span><div className="flex flex-wrap gap-1">{schedules.map(schedule => { const student = data.students.find(row => row.studentId === schedule.studentId); return <button key={`${item.date}-${schedule.scheduleId}`} onClick={() => edit({kind:'schedule', record: schedule as unknown as Record<string, unknown>})} className={`rounded border px-1.5 py-0.5 font-bold ${PART_TONES[student?.partId || '']}`} title={`${partName(data, student?.partId || '')} · ${workerTypeName(student?.workerType)} · ${schedule.startTime}–${schedule.endTime}`}>{student?.name}</button>; })}</div></div>)}</div></div>; })}</div></CardContent></Card>;
}

function Students({
  data,
  edit,
  onAction,
}: {
  data: PortalData;
  edit: (e: Editor) => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <>
      <PageTitle
        eyebrow="STUDENTS"
        title="근로학생 관리"
        description="학생 정보, 계정, 근로유형과 기간을 웹에서 관리합니다."
        action={
          <Button onClick={() => edit({ kind: 'student' })}>
            <Plus />
            학생 추가
          </Button>
        }
      />
      <Card className="overflow-auto shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름/ID</TableHead>
              <TableHead>학번</TableHead>
              <TableHead>파트</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>시급</TableHead>
              <TableHead>유형·기간</TableHead>
              <TableHead>계정</TableHead>
              <TableHead>상태</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.map((s) => (
              <TableRow key={s.studentId}>
                <TableCell>
                  <b>{s.name}</b>
                  <small className="block text-slate-400">
                    {s.loginId || '로그인 ID 미설정'}
                  </small>
                </TableCell>
                <TableCell>{s.studentNumber || '확인 필요'}</TableCell>
                <TableCell>{partName(data, s.partId)}</TableCell>
                <TableCell>
                  <span className="block text-sm">{s.email || '확인 필요'}</span>
                  <small className="text-slate-400">{s.phone || '확인 필요'}</small>
                </TableCell>
                <TableCell className={!Number(s.hourlyWage || 0) ? 'bg-amber-50 font-bold text-amber-700' : ''}>
                  {Number(s.hourlyWage || 0) ? `${Number(s.hourlyWage).toLocaleString()}원` : '미입력'}
                </TableCell>
                <TableCell>
                  {workerTypeName(s.workerType)}
                  {shortTermState(s) && (
                    <Badge variant="destructive" className="ml-2">
                      {shortTermState(s)}
                    </Badge>
                  )}
                  <small className="block text-slate-400">
                    {s.startDate || '-'} ~ {s.endDate || '-'}
                  </small>
                </TableCell>
                <TableCell>
                  {s.hasPassword ? '발급됨' : '초기화 필요'}
                </TableCell>
                <TableCell>
                  <Badge variant={s.active ? 'outline' : 'secondary'}>
                    {s.active ? '활성' : '비활성'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        edit({
                          kind: 'student',
                          record: s as unknown as Record<string, unknown>,
                        })
                      }
                    >
                      수정
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { void onAction('adminResetPasswordToStudentNumber', { studentId: s.studentId }).catch(() => undefined); }}>학번으로 초기화</Button>
                    {s.active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          void onAction('adminUpsertStudent', {
                            record: {
                              studentId: s.studentId,
                              active: false,
                              name: s.name,
                              partId: s.partId,
                              workerType: s.workerType,
                            },
                          }).catch(() => undefined);
                        }}
                      >
                        비활성화
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function Schedules({
  data,
  edit,
  onAction,
}: {
  data: PortalData;
  edit: (e: Editor) => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  const active = data.settings.activeSemester;
  const rows = data.schedules.filter(
    (s) => String(s.semesterId) === String(active),
  );
  return (
    <>
      <PageTitle
        eyebrow="SCHEDULE EDITOR"
        title="시간표 편집"
        description="현재 학기의 월~금 정규 근무를 30분 단위로 관리합니다."
        action={
          <Button onClick={() => edit({ kind: 'schedule' })}>
            <Plus />
            시간 추가
          </Button>
        }
      />
      <Card className="overflow-auto shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학생</TableHead>
              <TableHead>요일</TableHead>
              <TableHead>시간</TableHead>
              <TableHead>상태</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.scheduleId}>
                <TableCell>{studentName(data, s.studentId)}</TableCell>
                <TableCell>{DAYS[Number(s.dayOfWeek)]}</TableCell>
                <TableCell className="font-mono">
                  {s.startTime}–{s.endTime}
                </TableCell>
                <TableCell>{s.active === false ? '비활성' : '활성'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      edit({
                        kind: 'schedule',
                        record: s as unknown as Record<string, unknown>,
                      })
                    }
                  >
                    수정
                  </Button>
                  {s.active !== false && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="ml-2"
                      onClick={() => {
                        void onAction('adminDeactivateSchedule', {
                          scheduleId: s.scheduleId,
                        }).catch(() => undefined);
                      }}
                    >
                      삭제
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function Logs({ data, edit, onAction }: { data: PortalData; edit: (e: Editor) => void; onAction: (a: string, p?: Record<string, unknown>) => Promise<void> }) {
  const [semester, setSemester] = useState('all');
  const [month, setMonth] = useState(monthKey());
  const [part, setPart] = useState('all');
  const [student, setStudent] = useState('all');
  const [status, setStatus] = useState('all');
  const rows = data.workLogs.filter(
    (l) => {
      const term = data.semesters.find((item) => String(item.semesterId) === semester);
      return (
      (!term || (l.date >= term.startDate && l.date <= term.endDate)) &&
      (!month || l.date.startsWith(month)) &&
      (part === 'all' ||
        data.students.find((s) => s.studentId === l.studentId)?.partId ===
          part) &&
      (student === 'all' || l.studentId === student) &&
      (status === 'all' || l.status === status)
      );
    },
  );
  return (
    <>
      <PageTitle
        eyebrow="WORK LOGS"
        title="근무기록 관리"
        description="실제 출퇴근 기록을 필터링하고 보정하거나 직접 추가합니다."
        action={
          <Button onClick={() => edit({ kind: 'log' })}>
            <Plus />
            근무기록 직접 추가
          </Button>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        <NativeSelect value={semester} onChange={(e) => setSemester(e.target.value)}>
          <NativeSelectOption value="all">전체 학기</NativeSelectOption>
          {data.semesters.map((item) => (
            <NativeSelectOption key={item.semesterId} value={item.semesterId}>
              {item.semesterName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-white"
        />
        <NativeSelect value={part} onChange={(e) => setPart(e.target.value)}>
          <NativeSelectOption value="all">전체 파트</NativeSelectOption>
          {data.parts.map((p) => (
            <NativeSelectOption key={p.partId} value={p.partId}>
              {p.partName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={student}
          onChange={(e) => setStudent(e.target.value)}
        >
          <NativeSelectOption value="all">전체 학생</NativeSelectOption>
          {data.students.map((s) => (
            <NativeSelectOption key={s.studentId} value={s.studentId}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <NativeSelectOption value="all">전체 상태</NativeSelectOption>
          <NativeSelectOption value="WORKING">근무중</NativeSelectOption>
          <NativeSelectOption value="COMPLETE">완료</NativeSelectOption>
          <NativeSelectOption value="CANCELLED">삭제 처리</NativeSelectOption>
        </NativeSelect>
      </div>
      <Card className="overflow-auto shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학생</TableHead>
              <TableHead>날짜</TableHead>
              <TableHead>출근–퇴근</TableHead>
              <TableHead>인정</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>감사</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow
                key={l.logId}
                className={l.flagCode ? 'bg-red-50/60' : ''}
              >
                <TableCell>{studentName(data, l.studentId)}</TableCell>
                <TableCell>{l.date}</TableCell>
                <TableCell>
                  {clockText(l.clockIn)}–{clockText(l.clockOut)}
                </TableCell>
                <TableCell>{hoursText(Number(l.minutes || 0))}</TableCell>
                <TableCell>{l.status}</TableCell>
                <TableCell>
                  {l.flagCode ? (
                    <Badge variant="destructive">{flagLabel(l.flagCode)}</Badge>
                  ) : (
                    <Badge variant="outline">정상</Badge>
                  )}
                  <small className="block text-slate-400">
                    {l.editedBy
                      ? `${l.editedBy} · ${clockText(l.editedAt)}`
                      : ''}
                  </small>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      edit({
                        kind: 'log',
                        record: l as unknown as Record<string, unknown>,
                      })
                    }
                  >
                    수정
                  </Button>
                  {l.status !== 'CANCELLED' && <Button size="sm" variant="destructive" className="ml-2" onClick={() => void onAction('adminCancelWorkLog', { logId: l.logId, reason: '관리자 삭제 처리' }).catch(() => undefined)}>삭제</Button>}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Empty>조건에 맞는 근무기록이 없습니다.</Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function Tasks({
  data,
  edit,
  onAction,
}: {
  data: PortalData;
  edit: (e: Editor) => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const rows = data.tasks.filter((task) => {
    const assignee = studentName(data, task.studentId);
    return !normalized || [task.taskName, task.description, task.keywords, partName(data, task.partId), assignee].some((value) => String(value || '').toLowerCase().includes(normalized));
  });
  return (
    <>
      <PageTitle
        eyebrow="WORK WIKI"
        title="담당업무 관리"
        description="학생이 볼 수 있는 업무 위키를 관리합니다. 관리자 메모는 노출하지 않습니다."
        action={
          <Button onClick={() => edit({ kind: 'task' })}>
            <Plus />
            업무 추가
          </Button>
        }
      />
      <Input className="mb-4 max-w-md bg-white" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="업무명·설명·키워드·파트·학생명 검색" />
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((t) => (
          <Card key={t.taskId} className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t.taskName}</CardTitle>
              <CardDescription>
                {partName(data, t.partId)} · {studentName(data, t.studentId)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{t.description}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    edit({
                      kind: 'task',
                      record: t as unknown as Record<string, unknown>,
                    })
                  }
                >
                  수정
                </Button>
                {t.active !== false && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      void onAction('adminDeactivateTask', {
                        taskId: t.taskId,
                      }).catch(() => undefined);
                    }}
                  >
                    비활성화
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!rows.length && <Empty>검색 결과가 없습니다.</Empty>}
      </div>
    </>
  );
}
function Semesters({
  data,
  edit,
  onAction,
}: {
  data: PortalData;
  edit: (e: Editor) => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <>
      <PageTitle
        eyebrow="SEMESTERS"
        title="학기 관리"
        description="새 학기는 독립적으로 만들며 과거 학생과 근무기록을 삭제하지 않습니다."
        action={
          <Button onClick={() => edit({ kind: 'semester' })}>
            <Plus />새 학기
          </Button>
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.semesters.map((s) => (
          <Card key={s.semesterId} className="shadow-none">
            <CardHeader>
              <CardTitle>{s.semesterName}</CardTitle>
              <CardDescription>
                {s.startDate} ~ {s.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <Badge
                variant={
                  String(data.settings.activeSemester) === String(s.semesterId)
                    ? 'default'
                    : 'outline'
                }
              >
                {String(data.settings.activeSemester) === String(s.semesterId)
                  ? '현재 운영'
                  : '보관'}
              </Badge>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => edit({ kind: 'semester', record: s as unknown as Record<string, unknown> })}>수정</Button>{String(data.settings.activeSemester) !==
                String(s.semesterId) && (
                <Button
                  size="sm"
                  onClick={() => {
                    void onAction('adminActivateSemester', {
                      semesterId: s.semesterId,
                    }).catch(() => undefined);
                  }}
                >
                  활성화
                </Button>
              )}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
function Parts({
  data,
  edit,
  onAction,
}: {
  data: PortalData;
  edit: (e: Editor) => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <>
      <PageTitle
        eyebrow="PARTS"
        title="파트 관리"
        description="지원팀·예비군연대를 기본으로 하며 새 조직도 코드 수정 없이 추가할 수 있습니다."
        action={<Button onClick={() => edit({ kind: 'part' })}><Plus />조직 추가</Button>}
      />
      <div className="grid gap-3 md:grid-cols-3">
        {data.parts.map((p) => (
          <Card key={p.partId} className="shadow-none">
            <CardHeader>
              <CardTitle>{p.partName}</CardTitle>
              <CardDescription>{p.partId}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="mb-4 h-2 rounded-full"
                style={{ background: p.color }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  edit({
                    kind: 'part',
                    record: p as unknown as Record<string, unknown>,
                  })
                }
              >
                수정
              </Button>
              {!data.students.some(student => student.active !== false && student.partId === p.partId) && <Button size="sm" variant="destructive" className="ml-2" onClick={() => void onAction('adminDeactivatePart', {partId: p.partId}).catch(() => undefined)}>비활성화</Button>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
function Substitutions({
  data,
  onAction,
}: {
  data: PortalData;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  const rows = data.substitutions || [];
  return (
    <>
      <PageTitle
        eyebrow="SUBSTITUTION"
        title="대체근무 관리"
        description="같은 파트 신청만 승인할 수 있으며 서버에서 교차 파트를 차단합니다."
      />
      <Card className="overflow-auto shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>원근무자</TableHead>
              <TableHead>대체학생</TableHead>
              <TableHead>파트</TableHead>
              <TableHead>상태</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.substitutionId}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{studentName(data, r.requesterStudentId)}</TableCell>
                <TableCell>
                  {r.substituteStudentId
                    ? studentName(data, r.substituteStudentId)
                    : '모집 중'}
                </TableCell>
                <TableCell>{partName(data, r.partId)}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>
                  {r.status === 'APPLIED' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          void onAction('adminReviewSubstitution', {
                            substitutionId: r.substitutionId,
                            status: 'APPROVED',
                          }).catch(() => undefined);
                        }}
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          void onAction('adminReviewSubstitution', {
                            substitutionId: r.substitutionId,
                            status: 'REJECTED',
                          }).catch(() => undefined);
                        }}
                      >
                        반려
                      </Button>
                    </div>
                  )}
                  {!['APPROVED','CANCELLED'].includes(r.status) && <Button size="sm" variant="outline" className="ml-2" onClick={() => void onAction('adminCancelSubstitution',{substitutionId:r.substitutionId}).catch(() => undefined)}>취소</Button>}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Empty>대체근무 요청이 없습니다.</Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function Handovers({ data, edit, onAction }: { data: PortalData; edit: (e: Editor) => void; onAction: (a: string, p?: Record<string, unknown>) => Promise<void> }) {
  const [status, setStatus] = useState('all');
  const rows = (data.handovers || []).filter(row => status === 'all' || row.status === status).sort((a, b) => Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || Number(b.priority === 'IMPORTANT')-Number(a.priority === 'IMPORTANT') || String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
  return <><PageTitle eyebrow="SHARED NOTES" title="근무 공유메모·인수인계 관리" description="담당업무와 분리된 시점별 진행상황입니다. 학생 메모와 관리자 공지를 함께 관리합니다." action={<Button onClick={() => edit({kind:'handover'})}><Plus />공유메모 등록</Button>} />
    <NativeSelect value={status} onChange={event => setStatus(event.target.value)} className="mb-4 w-44 bg-white"><NativeSelectOption value="all">전체 상태</NativeSelectOption><NativeSelectOption value="OPEN">미처리</NativeSelectOption><NativeSelectOption value="IN_PROGRESS">처리중</NativeSelectOption><NativeSelectOption value="DONE">완료</NativeSelectOption></NativeSelect>
    <div className="grid gap-3 lg:grid-cols-2">{rows.map(row => <Card key={row.handoverId} className={row.priority === 'IMPORTANT' ? 'border-amber-300 bg-amber-50/40 shadow-none' : 'shadow-none'}><CardHeader><div className="flex flex-wrap items-center gap-2">{row.pinned && <Badge>공지 고정</Badge>}{row.priority === 'IMPORTANT' && <Badge variant="destructive">중요</Badge>}<Badge variant="outline">{row.status}</Badge></div><CardTitle className="text-base">{row.title}</CardTitle><CardDescription>{row.date} · {partName(data,row.partId)} · {row.authorStudentId ? studentName(data,row.authorStudentId) : '관리자 공지'} · 확인 {String(row.acknowledgedBy || '').split(',').filter(Boolean).length}명</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-slate-600">{row.content}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => edit({kind:'handover',record:row as unknown as Record<string, unknown>})}>수정</Button>{row.status !== 'DONE' && <Button size="sm" onClick={() => void onAction('adminUpsertHandover',{record:{...row,status:'DONE'}}).catch(() => undefined)}>완료</Button>}<Button size="sm" variant="destructive" onClick={() => void onAction('adminDeleteHandover',{handoverId:row.handoverId}).catch(() => undefined)}>삭제</Button></div></CardContent></Card>)}{!rows.length && <Empty>공유메모가 없습니다.</Empty>}</div></>;
}

function Budget({ data, edit }: { data: PortalData; edit: (e: Editor) => void }) {
  const [month, setMonth] = useState(monthKey());
  const rows = monthlyBudgetRows(data, month);
  const total = rows.reduce((sum, row) => ({ scheduledMinutes: sum.scheduledMinutes + row.scheduledMinutes, actualMinutes: sum.actualMinutes + row.actualMinutes, scheduledCost: sum.scheduledCost + row.scheduledCost, actualCost: sum.actualCost + row.actualCost }), { scheduledMinutes: 0, actualMinutes: 0, scheduledCost: 0, actualCost: 0 });
  const saved = (data.budgets || []).find(item => item.month === month) || {month,totalBudget:'',nationalBudget:'',internalBudget:'',shortTermBudget:'',note:''};
  const cards = [
    {id:'TOTAL',name:'전체',budget:saved.totalBudget,items:rows},
    {id:'NATIONAL_WORK',name:'국가근로',budget:saved.nationalBudget,items:rows.filter(row=>workerTypeKey(row.student.workerType)==='NATIONAL_WORK')},
    {id:'INTERNAL_WORK',name:'교내근로',budget:saved.internalBudget,items:rows.filter(row=>workerTypeKey(row.student.workerType)==='INTERNAL_WORK')},
    {id:'SHORT_TERM',name:'단기근로',budget:saved.shortTermBudget,items:rows.filter(row=>workerTypeKey(row.student.workerType)==='SHORT_TERM')},
  ];
  const isConfigured = (value: number | string | undefined) => value !== '' && value !== undefined && value !== null;
  return <>
    <PageTitle eyebrow="BUDGET" title="월별 근로유형 예산" description="소속과 분리된 기존 근로유형으로 국가근로·교내근로 비용을 집계합니다." action={<div className="flex flex-wrap gap-2"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-44 bg-white" /><Button onClick={() => edit({kind:'budget',record:saved as unknown as Record<string, unknown>})}>예산 입력·수정</Button></div>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="예정 근로시간" value={hoursText(total.scheduledMinutes)} />
      <Metric label="예정 인건비" value={`${total.scheduledCost.toLocaleString()}원`} />
      <Metric label="실제 완료시간" value={hoursText(total.actualMinutes)} />
      <Metric label="실제 인건비" value={`${total.actualCost.toLocaleString()}원`} />
    </div>
    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cards.map(card => { const planned=card.items.reduce((sum,row)=>sum+row.scheduledCost,0); const actual=card.items.reduce((sum,row)=>sum+row.actualCost,0); const configured=isConfigured(card.budget); const amount=Number(card.budget || 0); return <Card key={card.id} className="shadow-none"><CardHeader className="pb-2"><CardTitle className="text-base">{card.name}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm"><p className="col-span-2">설정 예산<br/>{configured ? <b className="text-lg">{amount.toLocaleString()}원</b> : <Badge variant="secondary" className="mt-1">예산 미설정</Badge>}</p><p>예정 인건비<br/><b>{planned.toLocaleString()}원</b></p><p>실제 인건비<br/><b>{actual.toLocaleString()}원</b></p><p>예정 잔여<br/><b>{configured ? `${(amount-planned).toLocaleString()}원` : '—'}</b></p><p>실제 잔여<br/><b>{configured ? `${(amount-actual).toLocaleString()}원` : '—'}</b></p></CardContent></Card>; })}</div>
    {saved.note && <p className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">예산 메모 · {saved.note}</p>}
    <Card className="overflow-auto shadow-none"><Table><TableHeader><TableRow><TableHead>학생</TableHead><TableHead>소속</TableHead><TableHead>근로유형</TableHead><TableHead>적용 시급</TableHead><TableHead>예정 시간/비용</TableHead><TableHead>실제 시간/비용</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.student.studentId} className={!row.wage ? 'bg-amber-50' : ''}><TableCell className="font-bold">{row.student.name}</TableCell><TableCell>{partName(data, row.student.partId)}</TableCell><TableCell>{workerTypeName(row.student.workerType)}</TableCell><TableCell>{row.wage ? `${row.wage.toLocaleString()}원 · ${row.wageSource}` : <Badge variant="destructive">시급 확인 필요</Badge>}</TableCell><TableCell>{hoursText(row.scheduledMinutes)} · {row.scheduledCost.toLocaleString()}원</TableCell><TableCell>{hoursText(row.actualMinutes)} · {row.actualCost.toLocaleString()}원</TableCell></TableRow>)}</TableBody></Table></Card>
  </>;
}

function Settings({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    return onAction('adminSaveSettings', {
      settings: {
        timezone: f.get('timezone'),
        wikiTitle: f.get('wikiTitle'),
        defaultHourlyWage: f.get('defaultHourlyWage'),
        defaultWorkStartTime: f.get('defaultWorkStartTime'),
        defaultWorkEndTime: f.get('defaultWorkEndTime'),
        attendanceEnabled: f.get('attendanceEnabled'),
        substitutionEnabled: f.get('substitutionEnabled'),
        handoverEnabled: f.get('handoverEnabled'),
      },
    });
  };
  return (
    <>
      <PageTitle
        eyebrow="SETTINGS"
        title="운영 설정"
        description="활성 학기는 학기 관리에서 변경합니다."
      />
      <Card className="max-w-2xl shadow-none">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <label className="field-label">
              시간대
              <Input
                name="timezone"
                defaultValue={data.settings.timezone || 'Asia/Seoul'}
              />
            </label>
            <label className="field-label">
              근로 위키 제목
              <Input
                name="wikiTitle"
                defaultValue={data.settings.wikiTitle || '담당업무·근로 위키'}
              />
            </label>
            <label className="field-label">기본 시급<Input name="defaultHourlyWage" type="number" min="1" step="10" defaultValue={data.settings.defaultHourlyWage || '10320'} /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="field-label">기본 시작시간<Input name="defaultWorkStartTime" type="time" step="1800" defaultValue={data.settings.defaultWorkStartTime || '09:00'} /></label><label className="field-label">기본 종료시간<Input name="defaultWorkEndTime" type="time" step="1800" defaultValue={data.settings.defaultWorkEndTime || '17:00'} /></label></div>
            <div className="grid gap-3 sm:grid-cols-3"><label className="field-label">출퇴근<NativeSelect name="attendanceEnabled" defaultValue={data.settings.attendanceEnabled || 'true'}><NativeSelectOption value="true">허용</NativeSelectOption><NativeSelectOption value="false">중지</NativeSelectOption></NativeSelect></label><label className="field-label">대체근무<NativeSelect name="substitutionEnabled" defaultValue={data.settings.substitutionEnabled || 'true'}><NativeSelectOption value="true">허용</NativeSelectOption><NativeSelectOption value="false">중지</NativeSelectOption></NativeSelect></label><label className="field-label">인수인계<NativeSelect name="handoverEnabled" defaultValue={data.settings.handoverEnabled || 'true'}><NativeSelectOption value="true">허용</NativeSelectOption><NativeSelectOption value="false">중지</NativeSelectOption></NativeSelect></label></div>
            <Button type="submit" disabled={busy}>설정 저장</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function EditorDialog({
  editor,
  data,
  busy,
  close,
  onAction,
}: {
  editor: Editor;
  data: PortalData;
  busy: boolean;
  close: () => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  if (!editor) return null;
  const r = editor.record || {};
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    let action = '';
    let payload: Record<string, unknown> = {};
    if (editor.kind === 'password') {
      action = 'adminResetPassword';
      payload = { studentId: r.studentId, newPassword: f.newPassword };
    } else if (editor.kind === 'student') {
      action = 'adminUpsertStudent';
      payload = {
        record: { ...r, ...f, active: f.active === 'true' },
        initialPassword: f.initialPassword,
      };
    } else if (editor.kind === 'schedule') {
      action = 'adminUpsertSchedule';
      payload = {
        record: {
          ...r,
          ...f,
          dayOfWeek: Number(f.dayOfWeek),
          active: true,
          semesterId: data.settings.activeSemester,
        },
      };
    } else if (editor.kind === 'log') {
      action = 'adminUpsertWorkLog';
      payload = { record: { ...r, ...f } };
    } else if (editor.kind === 'task') {
      action = 'adminUpsertTask';
      payload = { record: { ...r, ...f, active: true } };
    } else if (editor.kind === 'semester') {
      action = 'adminUpsertSemester';
      payload = { record: { ...r, ...f } };
    } else if (editor.kind === 'part') {
      action = 'adminUpsertPart';
      payload = {
        record: {
          ...r,
          ...f,
          displayOrder: Number(f.displayOrder),
          active: true,
        },
      };
    } else if (editor.kind === 'budget') {
      action = 'adminUpsertBudget';
      payload = { record: { ...r, ...f } };
    } else if (editor.kind === 'handover') {
      action = 'adminUpsertHandover';
      payload = { record: { ...r, ...f, authorStudentId: f.authorStudentId || '' } };
    }
    await onAction(action, payload);
    close();
  };
  const title = {
    student: r.studentId ? '학생 수정' : '학생 추가',
    password: '비밀번호 초기화',
    schedule: r.scheduleId ? '시간표 수정' : '시간표 추가',
    log: r.logId ? '근무기록 수정' : '근무기록 직접 추가',
    task: r.taskId ? '담당업무 수정' : '담당업무 추가',
    semester: r.semesterId ? '학기 수정' : '새 학기 생성',
    part: r.partId ? '파트 수정' : '조직 추가',
    budget: '월 예산 설정',
    handover: r.handoverId ? '인수인계 수정' : '인수인계 등록',
  }[editor.kind];
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            저장 내용은 운영 Google Sheet에 즉시 반영됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {editor.kind === 'student' && <StudentFields data={data} r={r} />}{' '}
          {editor.kind === 'password' && (
            <>
              <label className="field-label sm:col-span-2">
                대상
                <Input value={String(r.name || '')} disabled />
              </label>
              <label className="field-label sm:col-span-2">
                새 비밀번호
                <Input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </label>
            </>
          )}{' '}
          {editor.kind === 'schedule' && <ScheduleFields data={data} r={r} />}{' '}
          {editor.kind === 'log' && <LogFields data={data} r={r} />}{' '}
          {editor.kind === 'task' && <TaskFields data={data} r={r} />}{' '}
          {editor.kind === 'semester' && (
            <>
              <label className="field-label">
                학기 ID
                <Input name="semesterId" defaultValue={String(r.semesterId || '')} placeholder="2027-1" readOnly={Boolean(r.semesterId)} required />
              </label>
              <label className="field-label">
                학기명
                <Input
                  name="semesterName"
                  defaultValue={String(r.semesterName || '')} placeholder="2027학년도 1학기"
                  required
                />
              </label>
              <label className="field-label">
                시작일
                <Input name="startDate" type="date" defaultValue={String(r.startDate || '')} required />
              </label>
              <label className="field-label">
                종료일
                <Input name="endDate" type="date" defaultValue={String(r.endDate || '')} required />
              </label>
            </>
          )}{' '}
          {editor.kind === 'part' && (
            <>
              <label className="field-label">
                파트 ID
                <Input
                  name="partId"
                  defaultValue={String(r.partId || '')}
                  readOnly={Boolean(r.partId)}
                  placeholder="NEW_PART"
                />
              </label>
              <label className="field-label">
                파트명
                <Input
                  name="partName"
                  defaultValue={String(r.partName || '')}
                  required
                />
              </label>
              <label className="field-label">
                표시순서
                <Input
                  name="displayOrder"
                  type="number"
                  defaultValue={String(r.displayOrder || 1)}
                  required
                />
              </label>
              <label className="field-label">
                색상
                <Input
                  name="color"
                  type="color"
                  defaultValue={String(r.color || '#075b9b')}
                />
              </label>
              <label className="field-label">
                파트 기본 시급
                <Input name="defaultHourlyWage" type="number" min="0" step="10" defaultValue={String(r.defaultHourlyWage || '')} placeholder="선택 입력" />
              </label>
              <label className="field-label sm:col-span-2">설명<Input name="note" defaultValue={String(r.note || '')} /></label>
            </>
          )}
          {editor.kind === 'budget' && <BudgetFields r={r} />}
          {editor.kind === 'handover' && <HandoverFields data={data} r={r} />}
          <div className="mt-3 flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={close}>
              취소
            </Button>
            <Button type="submit" disabled={busy}>저장</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function StudentFields({
  data,
  r,
}: {
  data: PortalData;
  r: Record<string, unknown>;
}) {
  return (
    <>
      <label className="field-label">
        이름
        <Input name="name" defaultValue={String(r.name || '')} required />
      </label>
      <label className="field-label">
        학번
        <Input
          name="studentNumber"
          defaultValue={String(r.studentNumber || '')}
        />
      </label>
      <label className="field-label">로그인 ID<Input name="loginId" defaultValue={String(r.loginId || r.studentNumber || '')} /></label>
      <label className="field-label">
        파트
        <NativeSelect
          name="partId"
          defaultValue={String(r.partId || data.parts[0]?.partId)}
        >
          {data.parts.map((p) => (
            <NativeSelectOption key={p.partId} value={p.partId}>
              {p.partName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="field-label">
        근로유형
        <NativeSelect
          name="workerType"
          defaultValue={String(r.workerType || 'NATIONAL_WORK')}
        >
          <NativeSelectOption value="NATIONAL_WORK">
            국가근로
          </NativeSelectOption>
          <NativeSelectOption value={r.workerType === 'INTERNAL_WORK' ? 'INTERNAL_WORK' : 'OTHER'}>교내근로</NativeSelectOption>
          <NativeSelectOption value="SHORT_TERM">단기근로</NativeSelectOption>
        </NativeSelect>
      </label>
      <label className="field-label">
        상태
        <NativeSelect
          name="active"
          defaultValue={String(r.active === false ? false : true)}
        >
          <NativeSelectOption value="true">활성</NativeSelectOption>
          <NativeSelectOption value="false">비활성</NativeSelectOption>
        </NativeSelect>
      </label>
      <label className="field-label">
        근무 시작일
        <Input
          name="startDate"
          type="date"
          defaultValue={String(r.startDate || '')}
        />
      </label>
      <label className="field-label">
        근무 종료일
        <Input
          name="endDate"
          type="date"
          defaultValue={String(r.endDate || '')}
        />
      </label>
      <label className="field-label">
        이메일
        <Input name="email" type="email" defaultValue={String(r.email || '')} />
      </label>
      <label className="field-label">
        전화번호
        <Input name="phone" type="tel" defaultValue={String(r.phone || '')} />
      </label>
      <label className="field-label sm:col-span-2">
        개별 시급
        <Input name="hourlyWage" type="number" min="0" step="10" defaultValue={String(r.hourlyWage || '')} placeholder="미입력 시 파트·근로유형 기본 시급 적용" />
      </label>
      <label className="field-label sm:col-span-2">
        담당업무
        <Input name="taskSummary" defaultValue={String(r.taskSummary || '')} />
      </label>
      <label className="field-label sm:col-span-2">
        관리자 메모
        <Input name="workMemo" defaultValue={String(r.workMemo || '')} />
      </label>
      <label className="field-label sm:col-span-2">연락 메모<Input name="contactMemo" defaultValue={String(r.contactMemo || '')} /></label>
      <label className="field-label sm:col-span-2">특이사항<Input name="specialNote" defaultValue={String(r.specialNote || '')} /></label>
      <label className="field-label sm:col-span-2">대체 가능 업무<Input name="substituteTasks" defaultValue={String(r.substituteTasks || '')} /></label>
      {!r.studentId && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 sm:col-span-2">초기 ID와 비밀번호는 모두 학번으로 자동 생성됩니다.</p>}
    </>
  );
}
function ScheduleFields({
  data,
  r,
}: {
  data: PortalData;
  r: Record<string, unknown>;
}) {
  return (
    <>
      <label className="field-label sm:col-span-2">
        학생
        <NativeSelect
          name="studentId"
          defaultValue={String(r.studentId || data.students[0]?.studentId)}
        >
          {data.students
            .filter((s) => s.active)
            .map((s) => (
              <NativeSelectOption key={s.studentId} value={s.studentId}>
                {s.name} · {partName(data, s.partId)}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </label>
      <label className="field-label">
        요일
        <NativeSelect name="dayOfWeek" defaultValue={String(r.dayOfWeek || 1)}>
          {[1, 2, 3, 4, 5].map((d) => (
            <NativeSelectOption key={d} value={String(d)}>
              {DAYS[d]}요일
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="field-label">특정 날짜(선택)<Input name="date" type="date" defaultValue={String(r.date || '')} /><small className="text-slate-400">입력 시 해당 날짜 1회 일정</small></label>
      <label className="field-label">
        시작
        <Input
          name="startTime"
          type="time"
          step="1800"
          defaultValue={String(r.startTime || '09:00')}
          required
        />
      </label>
      <label className="field-label">
        종료
        <Input
          name="endTime"
          type="time"
          step="1800"
          defaultValue={String(r.endTime || '12:00')}
          required
        />
      </label>
    </>
  );
}
function LogFields({
  data,
  r,
}: {
  data: PortalData;
  r: Record<string, unknown>;
}) {
  const time = (v: unknown) => (v ? clockText(String(v)) : '');
  return (
    <>
      <label className="field-label sm:col-span-2">
        학생
        <NativeSelect
          name="studentId"
          defaultValue={String(r.studentId || data.students[0]?.studentId)}
        >
          {data.students.map((s) => (
            <NativeSelectOption key={s.studentId} value={s.studentId}>
              {s.name} · {partName(data, s.partId)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="field-label">
        날짜
        <Input
          name="date"
          type="date"
          defaultValue={String(r.date || isoDate())}
          required
        />
      </label>
      <label className="field-label">
        사유
        <Input
          name="reason"
          defaultValue={String(r.reason || '관리자 직접 입력')}
          required
        />
      </label>
      <label className="field-label">
        출근
        <Input
          name="clockIn"
          type="time"
          defaultValue={time(r.clockIn)}
          required
        />
      </label>
      <label className="field-label">
        퇴근
        <Input name="clockOut" type="time" defaultValue={time(r.clockOut)} />
      </label>
      <label className="field-label sm:col-span-2">
        메모
        <Input name="note" defaultValue={String(r.note || '')} />
      </label>
    </>
  );
}
function TaskFields({
  data,
  r,
}: {
  data: PortalData;
  r: Record<string, unknown>;
}) {
  return (
    <>
      <label className="field-label">
        업무명
        <Input
          name="taskName"
          defaultValue={String(r.taskName || '')}
          required
        />
      </label>
      <label className="field-label">
        파트
        <NativeSelect
          name="partId"
          defaultValue={String(r.partId || data.parts[0]?.partId)}
        >
          {data.parts.map((p) => (
            <NativeSelectOption key={p.partId} value={p.partId}>
              {p.partName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="field-label sm:col-span-2">
        설명
        <Input
          name="description"
          defaultValue={String(r.description || '')}
          required
        />
      </label>
      <label className="field-label">
        담당 학생
        <NativeSelect name="studentId" defaultValue={String(r.studentId || '')}>
          <NativeSelectOption value="">미지정</NativeSelectOption>
          {data.students.map((s) => (
            <NativeSelectOption key={s.studentId} value={s.studentId}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="field-label">
        검색 키워드
        <Input name="keywords" defaultValue={String(r.keywords || '')} />
      </label>
    </>
  );
}

function BudgetFields({ r }: { r: Record<string, unknown> }) {
  return <><label className="field-label">월<Input name="month" type="month" defaultValue={String(r.month || monthKey())} required /></label><span/><label className="field-label">전체 설정 예산<Input name="totalBudget" type="number" min="0" step="1000" defaultValue={String(r.totalBudget ?? '')} placeholder="미입력 시 미설정" /></label><label className="field-label">국가근로 설정 예산<Input name="nationalBudget" type="number" min="0" step="1000" defaultValue={String(r.nationalBudget ?? '')} placeholder="미입력 시 미설정" /></label><label className="field-label">교내근로 설정 예산<Input name="internalBudget" type="number" min="0" step="1000" defaultValue={String(r.internalBudget ?? '')} placeholder="미입력 시 미설정" /></label><label className="field-label">단기근로 예산(선택)<Input name="shortTermBudget" type="number" min="0" step="1000" defaultValue={String(r.shortTermBudget ?? '')} placeholder="미입력 시 미설정" /></label><label className="field-label sm:col-span-2">메모<Input name="note" defaultValue={String(r.note || '')} /></label></>;
}

function HandoverFields({ data, r }: { data: PortalData; r: Record<string, unknown> }) {
  return <><label className="field-label">날짜<Input name="date" type="date" defaultValue={String(r.date || isoDate())} required /></label><label className="field-label">조직<NativeSelect name="partId" defaultValue={String(r.partId || data.parts[0]?.partId)}>{data.parts.map(part => <NativeSelectOption key={part.partId} value={part.partId}>{part.partName}</NativeSelectOption>)}</NativeSelect></label><label className="field-label">작성 학생<NativeSelect name="authorStudentId" defaultValue={String(r.authorStudentId || '')}><NativeSelectOption value="">관리자 공지</NativeSelectOption>{data.students.map(student => <NativeSelectOption key={student.studentId} value={student.studentId}>{student.name}</NativeSelectOption>)}</NativeSelect></label><label className="field-label">대상 학생<NativeSelect name="targetStudentId" defaultValue={String(r.targetStudentId || '')}><NativeSelectOption value="">전체</NativeSelectOption>{data.students.filter(student => !r.partId || student.partId === r.partId).map(student => <NativeSelectOption key={student.studentId} value={student.studentId}>{student.name}</NativeSelectOption>)}</NativeSelect></label><label className="field-label sm:col-span-2">제목<Input name="title" maxLength={120} defaultValue={String(r.title || '')} required /></label><label className="field-label sm:col-span-2">내용<Input name="content" maxLength={2000} defaultValue={String(r.content || '')} required /></label><label className="field-label">상태<NativeSelect name="status" defaultValue={String(r.status || 'OPEN')}><NativeSelectOption value="OPEN">미처리</NativeSelectOption><NativeSelectOption value="IN_PROGRESS">처리중</NativeSelectOption><NativeSelectOption value="DONE">완료</NativeSelectOption></NativeSelect></label><label className="field-label">중요도<NativeSelect name="priority" defaultValue={String(r.priority || 'NORMAL')}><NativeSelectOption value="NORMAL">일반</NativeSelectOption><NativeSelectOption value="IMPORTANT">중요</NativeSelectOption></NativeSelect></label><label className="field-label">공지 고정<NativeSelect name="pinned" defaultValue={String(r.pinned === true || String(r.pinned).toUpperCase() === 'TRUE')}><NativeSelectOption value="false">고정 안 함</NativeSelectOption><NativeSelectOption value="true">상단 고정</NativeSelectOption></NativeSelect></label><label className="field-label">공개범위<NativeSelect name="visibility" defaultValue={String(r.visibility || 'PUBLIC')}><NativeSelectOption value="PUBLIC">전체 공개</NativeSelectOption><NativeSelectOption value="PART">같은 조직</NativeSelectOption></NativeSelect></label></>;
}
