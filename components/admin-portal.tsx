'use client';
/* oxlint-disable jsx-a11y/label-has-associated-control jsx-a11y/prefer-tag-over-role typescript/no-deprecated typescript/no-base-to-string typescript/no-floating-promises */

import { FormEvent, useState } from 'react';
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
  | 'settings';
type Editor = {
  kind:
    | 'student'
    | 'password'
    | 'schedule'
    | 'log'
    | 'task'
    | 'semester'
    | 'part';
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
  { id: 'tasks', label: '담당업무', icon: BookOpenText },
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
    week: <Week data={data} />,
    students: <Students data={data} edit={setEditor} onAction={onAction} />,
    schedules: <Schedules data={data} edit={setEditor} onAction={onAction} />,
    logs: <Logs data={data} edit={setEditor} />,
    tasks: <Tasks data={data} edit={setEditor} onAction={onAction} />,
    semesters: <Semesters data={data} edit={setEditor} onAction={onAction} />,
    parts: <Parts data={data} edit={setEditor} />,
    substitutions: <Substitutions data={data} onAction={onAction} />,
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
          <p className="truncate text-xs font-bold">{user.email}</p>
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
  return (
    <>
      <PageTitle
        eyebrow="LIVE OPERATIONS"
        title="세 파트 운영 대시보드"
        description="현재·다음 근무와 확인 필요한 기록을 한 화면에서 봅니다."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
              label="SHORT_TERM 종료"
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
          </CardContent>
        </Card>
      </div>
      <TaskSearch data={data} />
      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>오늘 전체 일정</CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftTable data={data} rows={today} />
        </CardContent>
      </Card>
    </>
  );
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

function Week({ data }: { data: PortalData }) {
  const [part, setPart] = useState('all');
  const rows = data.schedules.filter(
    (s) =>
      s.active !== false &&
      data.students.some(
        (st) =>
          st.studentId === s.studentId &&
          (part === 'all' || st.partId === part),
      ),
  );
  return (
    <>
      <PageTitle
        eyebrow="WEEKLY SCHEDULE"
        title="주간 통합 시간표"
        description="월~금, 30분 단위 정규 근무표입니다."
        action={
          <NativeSelect
            value={part}
            onChange={(e) => setPart(e.target.value)}
            className="w-52 bg-white"
          >
            <NativeSelectOption value="all">전체 파트</NativeSelectOption>
            {data.parts.map((p) => (
              <NativeSelectOption key={p.partId} value={p.partId}>
                {p.partName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        }
      />
      <Card className="overflow-auto shadow-none">
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
                              Number(s.dayOfWeek) === day &&
                              minutes(s.startTime) <= start &&
                              minutes(s.endTime) > start,
                          )
                          .map((s) => {
                            const st = data.students.find(
                              (x) => x.studentId === s.studentId,
                            );
                            return (
                              <span
                                key={s.scheduleId}
                                className={`mr-1 inline-block rounded-md border px-2 py-1 text-xs font-bold ${PART_TONES[st?.partId || '']}`}
                              >
                                {st?.name}
                              </span>
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
      </Card>
    </>
  );
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
                  {s.workerType}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        edit({
                          kind: 'password',
                          record: s as unknown as Record<string, unknown>,
                        })
                      }
                    >
                      비밀번호
                    </Button>
                    {s.active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          onAction('adminUpsertStudent', {
                            record: {
                              studentId: s.studentId,
                              active: false,
                              name: s.name,
                              partId: s.partId,
                              workerType: s.workerType,
                            },
                          })
                        }
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
                      onClick={() =>
                        onAction('adminDeactivateSchedule', {
                          scheduleId: s.scheduleId,
                        })
                      }
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

function Logs({ data, edit }: { data: PortalData; edit: (e: Editor) => void }) {
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
      <div className="grid gap-3 md:grid-cols-2">
        {data.tasks.map((t) => (
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
                    onClick={() =>
                      onAction('adminDeactivateTask', { taskId: t.taskId })
                    }
                  >
                    비활성화
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
            <CardContent className="flex items-center justify-between">
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
              {String(data.settings.activeSemester) !==
                String(s.semesterId) && (
                <Button
                  size="sm"
                  onClick={() =>
                    onAction('adminActivateSemester', {
                      semesterId: s.semesterId,
                    })
                  }
                >
                  활성화
                </Button>
              )}
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
}: {
  data: PortalData;
  edit: (e: Editor) => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="PARTS"
        title="파트 관리"
        description="학생지원·예비군/병무·중국학생의 운영 구분입니다."
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
                        onClick={() =>
                          onAction('adminReviewSubstitution', {
                            substitutionId: r.substitutionId,
                            status: 'APPROVED',
                          })
                        }
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          onAction('adminReviewSubstitution', {
                            substitutionId: r.substitutionId,
                            status: 'REJECTED',
                          })
                        }
                      >
                        반려
                      </Button>
                    </div>
                  )}
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
      settings: { timezone: f.get('timezone'), wikiTitle: f.get('wikiTitle') },
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
      action = 'adminCreateSemester';
      payload = { record: f };
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
    semester: '새 학기 생성',
    part: '파트 수정',
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
                <Input name="semesterId" placeholder="2027-1" required />
              </label>
              <label className="field-label">
                학기명
                <Input
                  name="semesterName"
                  placeholder="2027학년도 1학기"
                  required
                />
              </label>
              <label className="field-label">
                시작일
                <Input name="startDate" type="date" required />
              </label>
              <label className="field-label">
                종료일
                <Input name="endDate" type="date" required />
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
                  readOnly
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
            </>
          )}
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
      <label className="field-label">
        로그인 ID
        <Input
          name="loginId"
          defaultValue={String(r.loginId || r.studentNumber || '')}
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
      <label className="field-label">
        근로유형
        <NativeSelect
          name="workerType"
          defaultValue={String(r.workerType || 'NATIONAL_WORK')}
        >
          <NativeSelectOption value="NATIONAL_WORK">
            국가근로
          </NativeSelectOption>
          <NativeSelectOption value="SHORT_TERM">단기근로</NativeSelectOption>
          <NativeSelectOption value="OTHER">기타</NativeSelectOption>
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
      <label className="field-label sm:col-span-2">
        담당업무
        <Input name="taskSummary" defaultValue={String(r.taskSummary || '')} />
      </label>
      <label className="field-label sm:col-span-2">
        관리자 메모
        <Input name="workMemo" defaultValue={String(r.workMemo || '')} />
      </label>
      {!r.studentId && (
        <label className="field-label sm:col-span-2">
          초기 비밀번호
          <Input
            name="initialPassword"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
      )}
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
      <span />
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
