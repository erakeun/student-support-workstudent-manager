'use client';

/* oxlint-disable react/react-compiler, jsx-a11y/label-has-associated-control, typescript/no-base-to-string, typescript/no-deprecated */

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenText, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock3,
  Database, LayoutDashboard, ListChecks, LogIn, LogOut, Pencil, Plus, Search,
  Settings2, ShieldCheck, Trash2, UserRound, UsersRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEMO_DATA } from '@/lib/demo-data';
import { getApiUrl, loadPortalData, postPortalAction } from '@/lib/api';
import type { Part, PortalData, Schedule, Student, WorkTask } from '@/lib/portal-types';

type View = 'dashboard' | 'today' | 'week' | 'tasks' | 'students' | 'logs' | 'admin';
type ShiftRow = Schedule & { student: Student; part: Part };
type ManageKind = 'student' | 'part' | 'schedule' | 'task' | 'semester' | null;

const NAV: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'today', label: '오늘 근무', icon: Clock3 },
  { id: 'week', label: '주간 시간표', icon: CalendarDays },
  { id: 'tasks', label: '담당업무', icon: BookOpenText },
  { id: 'students', label: '근로학생', icon: UsersRound },
  { id: 'logs', label: '근무기록', icon: ClipboardCheck },
  { id: 'admin', label: '관리자', icon: Settings2 },
];

const DAY_LABELS = ['', '월', '화', '수', '목', '금'];
const PART_CLASSES: Record<string, { dot: string; wash: string; text: string; border: string }> = {
  'student-support': { dot: 'bg-[#0b72b9]', wash: 'bg-[#eaf5fb]', text: 'text-[#075e9a]', border: 'border-l-[#0b72b9]' },
  'reserve-affairs': { dot: 'bg-[#2f7f76]', wash: 'bg-[#eaf5f1]', text: 'text-[#246a62]', border: 'border-l-[#2f7f76]' },
  'chinese-support': { dot: 'bg-[#d4872b]', wash: 'bg-[#fff5e7]', text: 'text-[#a85c0b]', border: 'border-l-[#d4872b]' },
};

function mins(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function seoulDate(date: Date) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

function isoDate(date: Date) {
  const local = seoulDate(date);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftState(shift: ShiftRow, now: Date) {
  const local = seoulDate(now);
  const current = local.getHours() * 60 + local.getMinutes();
  if (current < mins(shift.startTime)) return '예정';
  if (current >= mins(shift.endTime)) return '종료';
  return '근무중';
}

function duration(schedules: Schedule[]) {
  const total = schedules.reduce((sum, item) => sum + mins(item.endTime) - mins(item.startTime), 0);
  return `${Math.floor(total / 60)}시간${total % 60 ? ` ${total % 60}분` : ''}`;
}

function useWebMcp(viewSetter: (view: View) => void, searchSetter: (query: string) => void, clock: (studentId: string, mode: 'clockIn' | 'clockOut') => Promise<string>) {
  useEffect(() => {
    type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: Record<string, unknown>) => unknown };
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options?: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    void register({
      name: 'open_portal_view', title: '근로관리 화면 열기', description: '근로관리 포털의 지정된 업무 화면으로 이동합니다.',
      inputSchema: { type: 'object', properties: { view: { type: 'string', enum: NAV.map((item) => item.id) } }, required: ['view'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) { const value = String(input.view) as View; if (!NAV.some((item) => item.id === value)) throw new Error('올바른 화면이 아닙니다.'); viewSetter(value); return { view: value, opened: true }; },
    });
    void register({
      name: 'search_duty_owner', title: '담당업무 검색', description: '업무 키워드로 담당 학생 또는 직원을 검색하고 담당업무 화면을 엽니다.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 1 } }, required: ['query'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) { const query = String(input.query || '').trim(); if (!query) throw new Error('검색어를 입력하세요.'); searchSetter(query); viewSetter('tasks'); return { query, opened: true }; },
    });
    void register({
      name: 'record_attendance', title: '출퇴근 기록', description: '지정 학생의 출근 또는 퇴근을 기록합니다. 화면의 출퇴근 버튼과 동일한 작업입니다.',
      inputSchema: { type: 'object', properties: { studentId: { type: 'string', minLength: 1 }, type: { type: 'string', enum: ['clockIn', 'clockOut'] } }, required: ['studentId', 'type'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) { const studentId = String(input.studentId || ''); const type = input.type === 'clockOut' ? 'clockOut' : 'clockIn'; return { studentId, type, message: await clock(studentId, type) }; },
    });
    return () => lifecycle.abort();
  }, [clock, searchSetter, viewSetter]);
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <section className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end"><div><p className="mb-1 text-xs font-bold tracking-[.08em] text-[#075b9b]">{eyebrow}</p><h2 className="text-[27px] font-black tracking-[-.045em] text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</section>;
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-32 place-items-center rounded-[10px] border border-dashed bg-[#f8fafb] p-6 text-center text-sm text-slate-500">{children}</div>;
}

function PartStatus({ part, shifts, now }: { part: Part; shifts: ShiftRow[]; now: Date }) {
  const current = shifts.filter((shift) => shiftState(shift, now) === '근무중');
  const next = shifts.find((shift) => shiftState(shift, now) === '예정');
  const style = PART_CLASSES[part.partId] || { dot: 'bg-slate-500', wash: 'bg-slate-100', text: 'text-slate-700', border: 'border-l-slate-500' };
  return <Card className="status-card gap-0 rounded-[14px] py-0 shadow-none"><CardHeader className="border-b px-5 py-4"><CardTitle className="flex items-center gap-2 text-[15px] font-bold"><span className={`size-2 rounded-full ${style.dot}`} />{part.partName}</CardTitle><CardAction><Badge variant="outline" className="rounded-md font-medium text-muted-foreground">{shifts.length}건</Badge></CardAction></CardHeader><CardContent className="px-5 py-5">{current.length ? <><p className={`mb-2 text-xs font-bold ${style.text}`}>● 현재 근무중</p><p className="text-xl font-extrabold tracking-[-.03em]">{current.map((item) => item.student.name).join(', ')}</p><p className="mt-1 text-sm font-medium text-slate-500">{current.map((item) => `${item.startTime}–${item.endTime}`).join(' · ')}</p></> : next ? <><p className="mb-2 text-xs font-bold text-slate-500">다음 근무</p><p className="text-xl font-extrabold tracking-[-.03em]">{next.student.name}</p><p className="mt-1 text-sm font-medium text-slate-500">{next.startTime}–{next.endTime}</p></> : <div className="py-2 text-sm font-semibold text-slate-500">오늘 근무가 종료되었습니다.</div>}</CardContent></Card>;
}

function ShiftList({ shifts, now, onStudent, clock, showClock = false }: { shifts: ShiftRow[]; now: Date; onStudent: (student: Student) => void; clock: (studentId: string, mode: 'clockIn' | 'clockOut') => void; showClock?: boolean }) {
  if (!shifts.length) return <EmptyBlock>오늘 등록된 근무가 없습니다.</EmptyBlock>;
  return <div className="divide-y divide-[#e7ebef]">{shifts.map((shift) => { const state = shiftState(shift, now); const style = PART_CLASSES[shift.part.partId] || { wash: 'bg-slate-100', text: 'text-slate-700' }; return <article key={shift.scheduleId} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[95px_110px_minmax(0,1fr)_auto]"><p className="font-mono text-sm font-bold tabular-nums">{shift.startTime}</p><Badge className={`hidden w-fit rounded-md border-0 ${style.wash} ${style.text} sm:inline-flex`}>{shift.part.partName}</Badge><button onClick={() => onStudent(shift.student)} className="min-w-0 text-left"><p className="truncate text-sm font-extrabold hover:text-[#075b9b]">{shift.student.name}</p><p className="truncate text-xs text-slate-500">{shift.student.taskSummary} · {shift.startTime}–{shift.endTime}</p></button><div className="flex items-center gap-2"><Badge variant="outline" className={state === '근무중' ? 'border-[#8bc0df] bg-[#edf7fc] text-[#075e9a]' : 'text-slate-500'}>{state}</Badge>{showClock && state !== '종료' && <Button size="sm" variant={state === '근무중' ? 'outline' : 'default'} onClick={() => clock(shift.studentId, state === '근무중' ? 'clockOut' : 'clockIn')}>{state === '근무중' ? <><LogOut /> 퇴근</> : <><LogIn /> 출근</>}</Button>}</div></article>; })}</div>;
}

function WeekGrid({ data, partFilter }: { data: PortalData; partFilter: string }) {
  const rows = useMemo(() => data.schedules.filter((s) => s.active).map((schedule) => { const student = data.students.find((item) => item.studentId === schedule.studentId)!; const part = data.parts.find((item) => item.partId === student?.partId)!; return { ...schedule, student, part }; }).filter((row) => row.student && row.part && (partFilter === 'all' || row.part.partId === partFilter)), [data, partFilter]);
  const times = Array.from({ length: 17 }, (_, index) => { const value = 540 + index * 30; return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; });
  const partIndex = (partId: string) => partFilter === 'all' ? Math.max(0, data.parts.findIndex((part) => part.partId === partId)) : 0;
  const width = partFilter === 'all' ? 100 / Math.max(1, data.parts.length) : 100;
  return <Card className="gap-0 overflow-auto rounded-[14px] py-0 shadow-none"><div className="min-w-[900px]"><div className="grid grid-cols-[74px_repeat(5,minmax(150px,1fr))] border-b bg-[#f8fafb]"><div className="p-4 text-center text-xs font-bold text-slate-400">시간</div>{DAY_LABELS.slice(1).map((day) => <div key={day} className="border-l p-4 text-center text-sm font-extrabold">{day}요일</div>)}</div><div className="grid grid-cols-[74px_repeat(5,minmax(150px,1fr))]"><div className="relative h-[544px] border-r">{times.map((time, index) => <span key={time} className="absolute right-3 -translate-y-1/2 font-mono text-[11px] text-slate-400" style={{ top: `${index * 6.25}%` }}>{time}</span>)}</div>{DAY_LABELS.slice(1).map((_, dayIndex) => <div key={dayIndex} className="schedule-day relative h-[544px] border-r last:border-r-0">{rows.filter((row) => row.dayOfWeek === dayIndex + 1).map((row) => { const style = PART_CLASSES[row.part.partId] || { border: 'border-l-slate-500' }; return <div key={row.scheduleId} className={`absolute overflow-hidden rounded-[7px] border border-l-4 bg-white px-2 py-1.5 shadow-sm ${style.border}`} style={{ top: `${((mins(row.startTime) - 540) / 480) * 100}%`, height: `${((mins(row.endTime) - mins(row.startTime)) / 480) * 100}%`, left: `calc(${partIndex(row.part.partId) * width}% + 3px)`, width: `calc(${width}% - 6px)` }}><b className="block truncate text-xs">{row.student.name}</b><span className="block truncate text-[10px] text-slate-500">{row.startTime}–{row.endTime}</span></div>; })}</div>)}</div></div></Card>;
}

function StudentDialog({ student, data, onClose }: { student: Student | null; data: PortalData; onClose: () => void }) {
  if (!student) return null;
  const part = data.parts.find((item) => item.partId === student.partId);
  const schedules = data.schedules.filter((item) => item.studentId === student.studentId && item.active);
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="text-xl font-black">{student.name}</DialogTitle><DialogDescription>{part?.partName} · {student.workerType === 'SHORT_TERM' ? '단기근로' : '국가근로'}</DialogDescription></DialogHeader><dl className="grid gap-3 sm:grid-cols-2">{[['학번', student.studentNumber], ['이번 학기 근무시간', duration(schedules)], ['근무기간', `${student.startDate} ~ ${student.endDate}`], ['담당업무', student.taskSummary], ['업무메모', student.workMemo || '등록된 메모 없음'], ['연락 관련 메모', student.contactMemo || '등록된 메모 없음'], ['특이사항', student.specialNote || '등록된 내용 없음'], ['대체 가능한 업무', student.substituteTasks || '등록된 내용 없음']].map(([label, value]) => <div key={label} className="rounded-[9px] border bg-[#fafbfc] p-3.5"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl><div><p className="mb-2 text-sm font-extrabold">주간 근무</p><div className="flex flex-wrap gap-2">{schedules.sort((a,b) => a.dayOfWeek-b.dayOfWeek || mins(a.startTime)-mins(b.startTime)).map((item) => <Badge key={item.scheduleId} variant="outline">{DAY_LABELS[item.dayOfWeek]} {item.startTime}–{item.endTime}</Badge>)}</div></div></DialogContent></Dialog>;
}

function TasksView({ data, query, setQuery, onStudent }: { data: PortalData; query: string; setQuery: (value: string) => void; onStudent: (student: Student) => void }) {
  const normalized = query.trim().toLowerCase();
  const tasks = data.tasks.filter((task) => !normalized || [task.taskName, task.description, task.keywords].some((value) => value.toLowerCase().includes(normalized)));
  return <><PageTitle eyebrow="WORK WIKI" title="담당업무 찾기" description="업무명이나 키워드를 검색해 바로 담당자를 찾습니다." action={<div className="relative w-full lg:w-[390px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 예비군, 장학, 중국어" className="h-10 bg-white pl-9"/></div>} /><div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><div className="grid gap-3">{tasks.length ? tasks.map((task) => { const student = data.students.find((item) => item.studentId === task.studentId); const part = data.parts.find((item) => item.partId === task.partId); const style = PART_CLASSES[task.partId] || { wash: 'bg-slate-100', text: 'text-slate-700' }; return <Card key={task.taskId} className="gap-0 rounded-[12px] py-0 shadow-none"><CardContent className="flex items-start justify-between gap-4 p-5"><div><div className="mb-2 flex items-center gap-2"><Badge className={`border-0 ${style.wash} ${style.text}`}>{part?.partName}</Badge><span className="text-xs text-slate-400">{task.keywords.split(',').join(' · ')}</span></div><h3 className="font-extrabold">{task.taskName}</h3><p className="mt-1 text-sm text-slate-500">{task.description}</p></div>{student && <Button variant="outline" onClick={() => onStudent(student)}><UserRound /> {student.name}</Button>}</CardContent></Card>; }) : <EmptyBlock>검색 결과가 없습니다.</EmptyBlock>}</div><Card className="gap-0 rounded-[12px] py-0 shadow-none"><CardHeader className="border-b"><CardTitle className="text-base font-extrabold">직원 담당업무</CardTitle><CardDescription>내선 연결용 정보</CardDescription></CardHeader><CardContent className="p-5">{data.employees.length ? data.employees.map((employee) => <div key={employee.employeeId}>{employee.name}</div>) : <EmptyBlock>실제 직원 정보는 아직 제공되지 않아 빈 구조로 두었습니다.<br/>관리자가 이름, 내선, 담당업무를 등록할 수 있습니다.</EmptyBlock>}</CardContent></Card></div></>;
}

function StudentsView({ data, onStudent }: { data: PortalData; onStudent: (student: Student) => void }) {
  return <><PageTitle eyebrow="PEOPLE" title="근로학생" description="파트, 근로유형, 담당업무와 주간 시간을 확인합니다." /><Card className="gap-0 overflow-auto rounded-[14px] py-0 shadow-none"><Table><TableHeader><TableRow><TableHead>이름</TableHead><TableHead>파트</TableHead><TableHead>근로유형</TableHead><TableHead>주간시간</TableHead><TableHead>담당업무</TableHead><TableHead className="text-right">상태</TableHead></TableRow></TableHeader><TableBody>{data.students.map((student) => { const part = data.parts.find((item) => item.partId === student.partId); return <TableRow key={student.studentId} className="cursor-pointer" onClick={() => onStudent(student)}><TableCell className="font-extrabold text-[#075b9b]">{student.name}</TableCell><TableCell>{part?.partName}</TableCell><TableCell>{student.workerType === 'SHORT_TERM' ? '단기근로' : '국가근로'}</TableCell><TableCell>{duration(data.schedules.filter((item) => item.studentId === student.studentId && item.active))}</TableCell><TableCell className="max-w-[320px] truncate">{student.taskSummary}</TableCell><TableCell className="text-right"><Badge variant="outline" className={student.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>{student.active ? '활성' : '비활성'}</Badge></TableCell></TableRow>; })}</TableBody></Table></Card></>;
}

function AdminDialog({ kind, data, onClose, onSave }: { kind: ManageKind; data: PortalData; onClose: () => void; onSave: (kind: Exclude<ManageKind, null>, form: FormData) => void }) {
  if (!kind) return null;
  const labels = { student: '학생', part: '파트', schedule: '시간표', task: '담당업무', semester: '학기' };
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-lg"><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(kind, new FormData(event.currentTarget)); }}><DialogHeader><DialogTitle>{labels[kind]} 추가</DialogTitle><DialogDescription>필수 정보만 먼저 등록하고 이후 상세내용을 수정할 수 있습니다.</DialogDescription></DialogHeader><div className="my-5 grid gap-3">{kind === 'student' && <><label className="field-label">이름<Input name="name" required/></label><label className="field-label">학번<Input name="studentNumber" required/></label><label className="field-label">파트<NativeSelect name="partId" className="w-full">{data.parts.map((part) => <NativeSelectOption key={part.partId} value={part.partId}>{part.partName}</NativeSelectOption>)}</NativeSelect></label></>}{kind === 'part' && <label className="field-label">파트명<Input name="partName" required/></label>}{kind === 'task' && <><label className="field-label">업무명<Input name="taskName" required/></label><label className="field-label">키워드<Input name="keywords" placeholder="쉼표로 구분"/></label><label className="field-label">담당학생<NativeSelect name="studentId" className="w-full">{data.students.map((student) => <NativeSelectOption key={student.studentId} value={student.studentId}>{student.name}</NativeSelectOption>)}</NativeSelect></label></>}{kind === 'schedule' && <><label className="field-label">학생<NativeSelect name="studentId" className="w-full">{data.students.map((student) => <NativeSelectOption key={student.studentId} value={student.studentId}>{student.name}</NativeSelectOption>)}</NativeSelect></label><div className="grid grid-cols-3 gap-2"><label className="field-label">요일<NativeSelect name="dayOfWeek" className="w-full">{DAY_LABELS.slice(1).map((day,index) => <NativeSelectOption key={day} value={index+1}>{day}</NativeSelectOption>)}</NativeSelect></label><label className="field-label">시작<Input type="time" name="startTime" defaultValue="09:00"/></label><label className="field-label">종료<Input type="time" name="endTime" defaultValue="12:00"/></label></div></>}{kind === 'semester' && <><label className="field-label">학기 ID<Input name="semesterId" placeholder="2027-1" required/></label><label className="field-label">표시 이름<Input name="semesterName" placeholder="2027학년도 1학기" required/></label><div className="grid grid-cols-2 gap-2"><label className="field-label">시작일<Input type="date" name="startDate" required/></label><label className="field-label">종료일<Input type="date" name="endDate" required/></label></div></>}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="submit">저장</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ManageCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <Card className="gap-0 overflow-auto rounded-[14px] py-0 shadow-none"><CardHeader className="border-b"><CardTitle className="font-extrabold">{title}</CardTitle>{action && <CardAction>{action}</CardAction>}</CardHeader><CardContent className="px-0">{children}</CardContent></Card>; }

function AdminView({ data, onAdd, onToggle, onDelete }: { data: PortalData; onAdd: (kind: Exclude<ManageKind, null>) => void; onToggle: (entity: string, id: string, active: boolean) => void; onDelete: (entity: string, id: string) => void }) {
  const action = (kind: Exclude<ManageKind, null>) => <Button onClick={() => onAdd(kind)}><Plus /> 추가</Button>;
  return <><PageTitle eyebrow="ADMIN" title="관리자" description="운영 데이터와 활성 학기를 관리합니다."/><Tabs defaultValue="students" className="gap-4"><TabsList variant="line" className="max-w-full justify-start overflow-auto"><TabsTrigger value="students">학생</TabsTrigger><TabsTrigger value="parts">파트</TabsTrigger><TabsTrigger value="schedules">시간표</TabsTrigger><TabsTrigger value="tasks">담당업무</TabsTrigger><TabsTrigger value="logs">근무기록</TabsTrigger><TabsTrigger value="semesters">학기</TabsTrigger><TabsTrigger value="settings">설정</TabsTrigger></TabsList>
    <TabsContent value="students"><ManageCard title="학생 관리" action={action('student')}><Table><TableHeader><TableRow><TableHead>이름</TableHead><TableHead>파트</TableHead><TableHead>근로유형</TableHead><TableHead>활성</TableHead><TableHead/></TableRow></TableHeader><TableBody>{data.students.map((student) => <TableRow key={student.studentId}><TableCell className="font-bold">{student.name}</TableCell><TableCell>{data.parts.find((part) => part.partId === student.partId)?.partName}</TableCell><TableCell>{student.workerType}</TableCell><TableCell><Switch checked={student.active} onCheckedChange={(checked) => onToggle('students',student.studentId,checked)}/></TableCell><TableCell className="text-right"><Button size="icon-sm" variant="ghost" aria-label="수정"><Pencil/></Button><Button size="icon-sm" variant="destructive" aria-label="삭제" onClick={() => onDelete('students',student.studentId)}><Trash2/></Button></TableCell></TableRow>)}</TableBody></Table></ManageCard></TabsContent>
    <TabsContent value="parts"><ManageCard title="파트 관리" action={action('part')}><Table><TableHeader><TableRow><TableHead>순서</TableHead><TableHead>파트명</TableHead><TableHead>학생 수</TableHead><TableHead>활성</TableHead></TableRow></TableHeader><TableBody>{data.parts.map((part) => <TableRow key={part.partId}><TableCell>{part.displayOrder}</TableCell><TableCell className="font-bold">{part.partName}</TableCell><TableCell>{data.students.filter((student) => student.partId === part.partId).length}명</TableCell><TableCell><Switch checked={part.active} onCheckedChange={(checked) => onToggle('parts',part.partId,checked)}/></TableCell></TableRow>)}</TableBody></Table></ManageCard></TabsContent>
    <TabsContent value="schedules"><ManageCard title="근무시간표 관리" action={action('schedule')}><Table><TableHeader><TableRow><TableHead>학생</TableHead><TableHead>요일</TableHead><TableHead>시간</TableHead><TableHead>학기</TableHead><TableHead/></TableRow></TableHeader><TableBody>{data.schedules.slice(0,18).map((item) => <TableRow key={item.scheduleId}><TableCell>{data.students.find((student) => student.studentId===item.studentId)?.name}</TableCell><TableCell>{DAY_LABELS[item.dayOfWeek]}</TableCell><TableCell>{item.startTime}–{item.endTime}</TableCell><TableCell>{item.semesterId}</TableCell><TableCell className="text-right"><Button size="icon-sm" variant="destructive" onClick={() => onDelete('schedules',item.scheduleId)}><Trash2/></Button></TableCell></TableRow>)}</TableBody></Table></ManageCard></TabsContent>
    <TabsContent value="tasks"><ManageCard title="담당업무 관리" action={action('task')}><Table><TableHeader><TableRow><TableHead>업무명</TableHead><TableHead>파트</TableHead><TableHead>담당학생</TableHead><TableHead>키워드</TableHead></TableRow></TableHeader><TableBody>{data.tasks.map((task) => <TableRow key={task.taskId}><TableCell className="font-bold">{task.taskName}</TableCell><TableCell>{data.parts.find((part) => part.partId===task.partId)?.partName}</TableCell><TableCell>{data.students.find((student) => student.studentId===task.studentId)?.name}</TableCell><TableCell>{task.keywords}</TableCell></TableRow>)}</TableBody></Table></ManageCard></TabsContent>
    <TabsContent value="logs"><ManageCard title="근무기록 관리" action={<Button onClick={() => onAdd('schedule')}><Plus/> 직접 추가</Button>}>{data.workLogs.length ? <div className="p-5">기록 {data.workLogs.length}건</div> : <EmptyBlock>아직 생성된 근무기록이 없습니다.</EmptyBlock>}</ManageCard></TabsContent>
    <TabsContent value="semesters"><ManageCard title="학기 관리" action={action('semester')}>{data.semesters.map((semester) => <div key={semester.semesterId} className="flex items-center justify-between border-b p-4 last:border-0"><div><b>{semester.semesterName}</b><p className="text-xs text-slate-500">{semester.startDate} ~ {semester.endDate}</p></div><Badge className={semester.active ? 'bg-[#075b9b]' : ''}>{semester.active ? '현재 학기' : '보관'}</Badge></div>)}</ManageCard></TabsContent>
    <TabsContent value="settings"><ManageCard title="연결 설정"><div className="grid gap-3 p-5 sm:grid-cols-2"><div className="rounded-[10px] border p-4"><b className="flex items-center gap-2"><Database className="size-4 text-[#075b9b]"/>Google Sheet</b><p className="mt-2 text-sm text-slate-500">Apps Script의 Script Properties에서 SPREADSHEET_ID를 관리합니다.</p></div><div className="rounded-[10px] border p-4"><b className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#075b9b]"/>관리자 계정</b><p className="mt-2 text-sm text-slate-500">Settings 시트의 ADMIN_EMAILS에서 학교 계정을 관리합니다.</p></div></div></ManageCard></TabsContent>
  </Tabs></>;
}

export function PortalApp() {
  const [data, setData] = useState<PortalData>(DEMO_DATA);
  const [view, setView] = useState<View>('dashboard');
  const [now, setNow] = useState(() => new Date('2026-09-08T01:00:00.000Z'));
  const [query, setQuery] = useState('');
  const [partFilter, setPartFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [manageKind, setManageKind] = useState<ManageKind>(null);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => { setNow(new Date()); const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!getApiUrl()) return; loadPortalData().then((remote) => { if (remote) { setData(remote); setConnected(true); } }).catch((error: Error) => setMessage(error.message)); }, []);

  const shiftRows = useMemo(() => data.schedules.filter((item) => item.active).map((schedule) => { const student = data.students.find((item) => item.studentId === schedule.studentId)!; const part = data.parts.find((item) => item.partId === student?.partId)!; return { ...schedule, student, part }; }).filter((row) => row.student && row.part), [data]);
  const todayRows = useMemo(() => shiftRows.filter((item) => item.dayOfWeek === seoulDate(now).getDay()).sort((a,b) => mins(a.startTime)-mins(b.startTime)), [shiftRows, now]);

  const clock = useCallback(async (studentId: string, mode: 'clockIn' | 'clockOut') => {
    const student = data.students.find((item) => item.studentId === studentId); if (!student) throw new Error('학생을 찾을 수 없습니다.');
    const stamp = new Date(); const date = isoDate(stamp); let resultMessage = '';
    if (connected) { await postPortalAction(mode, { studentId, date }); resultMessage = `${student.name} ${mode === 'clockIn' ? '출근' : '퇴근'}이 기록되었습니다.`; }
    else setData((current) => { const existing = current.workLogs.find((log) => log.studentId === studentId && log.date === date); if (mode === 'clockIn' && !existing) return { ...current, workLogs: [...current.workLogs, { logId: `demo-log-${Date.now()}`, studentId, date, clockIn: stamp.toISOString(), clockOut: '', minutes: 0, status: 'WORKING', note: '미리보기 기록' }] }; if (mode === 'clockOut' && existing) return { ...current, workLogs: current.workLogs.map((log) => log.logId === existing.logId ? { ...log, clockOut: stamp.toISOString(), minutes: Math.max(0, Math.round((stamp.getTime()-new Date(log.clockIn).getTime())/60000)), status: 'COMPLETE' } : log) }; return current; });
    resultMessage ||= `${student.name} ${mode === 'clockIn' ? '출근' : '퇴근'}을 미리보기 기록에 반영했습니다.`; setMessage(resultMessage); return resultMessage;
  }, [connected, data.students]);

  useWebMcp(setView, setQuery, clock);

  const entityMeta: Record<string, { table: string; idKey: string }> = {
    students: { table: 'Students', idKey: 'studentId' }, parts: { table: 'Parts', idKey: 'partId' },
    schedules: { table: 'Schedules', idKey: 'scheduleId' }, tasks: { table: 'Tasks', idKey: 'taskId' },
    workLogs: { table: 'WorkLogs', idKey: 'logId' }, semesters: { table: 'Semesters', idKey: 'semesterId' },
  };
  const toggleEntity = (entity: string, id: string, active: boolean) => {
    const meta = entityMeta[entity];
    const collection = data[entity as keyof PortalData] as Array<Record<string, unknown>>;
    const currentRecord = collection.find((item) => String(item[meta.idKey]) === id);
    if (!currentRecord) return;
    const record = { ...currentRecord, active };
    setData((current) => ({ ...current, [entity]: (current[entity as keyof PortalData] as Array<Record<string, unknown>>).map((item) => String(item[meta.idKey]) === id ? record : item) } as PortalData));
    if (connected) void postPortalAction('upsertEntity', { table: meta.table, record }).then(() => setMessage('활성 상태를 Google Sheet에 저장했습니다.')).catch((error: Error) => setMessage(error.message));
  };
  const deleteEntity = (entity: string, id: string) => {
    const meta = entityMeta[entity];
    setData((current) => ({ ...current, [entity]: (current[entity as keyof PortalData] as Array<Record<string, unknown>>).filter((item) => String(item[meta.idKey]) !== id) } as PortalData));
    if (connected) void postPortalAction('deleteEntity', { table: meta.table, id }).then(() => setMessage('Google Sheet에서 삭제했습니다.')).catch((error: Error) => setMessage(error.message));
    else setMessage('미리보기 데이터에서 삭제했습니다.');
  };
  const saveManaged = (kind: Exclude<ManageKind, null>, form: FormData) => {
    const values = Object.fromEntries(form.entries()); const id = `${kind}-${Date.now()}`;
    let entity = 'semesters'; let table = 'Semesters'; let record: Record<string, unknown>;
    if (kind === 'student') { entity = 'students'; table = 'Students'; record = { studentId:id,name:String(values.name),studentNumber:String(values.studentNumber),partId:String(values.partId),workerType:'NATIONAL_WORK',startDate:'',endDate:'',taskSummary:'',workMemo:'',contactMemo:'',specialNote:'',substituteTasks:'',active:true } satisfies Student; }
    else if (kind === 'part') { entity = 'parts'; table = 'Parts'; record = { partId:id,partName:String(values.partName),displayOrder:data.parts.length+1,color:'#64748b',active:true } satisfies Part; }
    else if (kind === 'schedule') { entity = 'schedules'; table = 'Schedules'; record = { scheduleId:id,studentId:String(values.studentId),dayOfWeek:Number(values.dayOfWeek),startTime:String(values.startTime),endTime:String(values.endTime),semesterId:data.settings.activeSemester||'2026-2',active:true } satisfies Schedule; }
    else if (kind === 'task') { const student = data.students.find((item) => item.studentId===String(values.studentId)); entity = 'tasks'; table = 'Tasks'; record = { taskId:id,taskName:String(values.taskName),description:'',partId:student?.partId||'',studentId:String(values.studentId),employeeId:'',keywords:String(values.keywords||''),active:true } satisfies WorkTask; }
    else record = { semesterId:String(values.semesterId),semesterName:String(values.semesterName),startDate:String(values.startDate),endDate:String(values.endDate),active:false };
    setData((current) => ({ ...current, [entity]: [...(current[entity as keyof PortalData] as Array<Record<string, unknown>>), record] } as PortalData));
    if (connected) void postPortalAction('upsertEntity', { table, record }).then(() => setMessage('새 항목을 Google Sheet에 저장했습니다.')).catch((error: Error) => setMessage(error.message));
    else setMessage('새 항목을 미리보기 데이터에 추가했습니다.');
    setManageKind(null);
  };

  const dateLabel = new Intl.DateTimeFormat('ko-KR', { year:'numeric',month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul' }).format(now);
  const timeLabel = new Intl.DateTimeFormat('ko-KR', { hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul' }).format(now);
  const title = NAV.find((item) => item.id === view)?.label || '대시보드';

  const dashboard = <><PageTitle eyebrow="LIVE OPERATIONS" title="지금, 누가 근무하고 있나요?" description="세 파트의 현재 근무자와 다음 일정을 한 화면에서 확인합니다." action={<div className="relative w-full lg:w-[340px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 파트, 담당업무 검색" className="h-10 bg-white pl-9"/></div>} /><section className="grid gap-3 md:grid-cols-3">{data.parts.filter((part) => part.active).map((part) => <PartStatus key={part.partId} part={part} shifts={todayRows.filter((row) => row.part.partId===part.partId)} now={now}/>)}</section><section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)]"><ManageCard title="오늘 전체 일정" action={<Button variant="ghost" size="sm" className="text-[#075b9b]" onClick={() => setView('week')}>주간표 보기 <ChevronRight/></Button>}><ShiftList shifts={todayRows.filter((row) => !query || [row.student.name,row.part.partName,row.student.taskSummary].join(' ').includes(query))} now={now} onStudent={setSelectedStudent} clock={clock}/></ManageCard><ManageCard title="담당업무 빠른 찾기" action={<Button variant="ghost" size="sm" onClick={() => setView('tasks')}>전체 <ChevronRight/></Button>}><div className="space-y-3 p-5">{data.tasks.slice(0,4).map((task) => { const student=data.students.find((item)=>item.studentId===task.studentId);return <button key={task.taskId} onClick={()=>{setQuery(task.taskName);setView('tasks')}} className="group flex w-full items-center justify-between rounded-[10px] border p-3.5 text-left hover:border-[#a9cce2] hover:bg-[#f7fbfd]"><span><strong className="block text-sm">{task.taskName}</strong><span className="mt-1 block text-xs text-slate-500">{student?.name || '담당자 미정'}</span></span><ChevronRight className="size-4 text-slate-400"/></button>})}<div className="rounded-[10px] border border-dashed bg-[#f7f9fa] p-4"><p className="flex items-center gap-2 text-xs font-bold"><ListChecks className="size-4 text-[#075b9b]"/>직원 담당업무</p><p className="mt-1.5 text-xs leading-5 text-slate-500">직원 정보는 아직 제공되지 않아 빈 구조로 유지합니다.</p></div></div></ManageCard></section></>;

  return <SidebarProvider><Sidebar collapsible="offcanvas" className="border-r border-[#d9e1e8]"><SidebarHeader className="border-b border-[#d9e1e8] px-5 py-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-[10px] bg-[#075b9b] text-sm font-black text-white">HY</div><div><p className="text-[15px] font-extrabold tracking-[-.03em]">학생지원팀 근로관리</p><p className="mt-0.5 text-xs font-medium text-slate-500">ERICA · {data.settings.activeSemester || '학기 미설정'}</p></div></div></SidebarHeader><SidebarContent className="px-3 py-4"><SidebarGroup className="p-0"><SidebarGroupLabel className="px-2 text-[11px] font-bold tracking-[.08em] text-slate-400">운영 메뉴</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-1">{NAV.map(({id,label,icon:Icon}) => <SidebarMenuItem key={id}><SidebarMenuButton isActive={view===id} onClick={() => setView(id)} className="h-10 rounded-[8px] px-3 font-semibold data-active:bg-[#e7f2f9] data-active:text-[#075b9b]"><Icon/><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter className="border-t p-4"><div className="flex items-center gap-3 rounded-[9px] bg-[#f4f7f9] p-3"><ShieldCheck className="size-5 text-[#075b9b]"/><div><p className="text-xs font-bold">{connected ? '운영 데이터 연결됨' : '안전한 미리보기 모드'}</p><p className="mt-.5 text-[11px] text-slate-500">{connected ? 'Google Sheet 실시간 연동' : '개인정보 없는 예제 데이터'}</p></div></div></SidebarFooter></Sidebar><SidebarInset className="min-w-0 bg-[#f4f6f8]"><header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b bg-white px-4 md:px-7"><div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="md:hidden"/><div><p className="text-xs font-bold text-slate-500">{dateLabel}</p><h1 className="truncate text-[17px] font-extrabold tracking-[-.03em]">{title}</h1></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="font-mono text-base font-bold tabular-nums">{timeLabel}</p><p className="text-[11px] text-slate-500">30초마다 자동 갱신</p></div><Button onClick={()=>setView('admin')} className="h-9 bg-[#075b9b] hover:bg-[#064c82]">관리자</Button></div></header><main className="mx-auto w-full max-w-[1500px] p-4 md:p-7">{view==='dashboard' && dashboard}{view==='today' && <><PageTitle eyebrow="TODAY" title="오늘 근무" description="출퇴근 기록과 파트별 근무 흐름을 확인합니다."/><ManageCard title={`${dateLabel} 전체 일정`}><ShiftList shifts={todayRows} now={now} onStudent={setSelectedStudent} clock={clock} showClock/></ManageCard></>}{view==='week' && <><PageTitle eyebrow="WEEKLY SCHEDULE" title="주간 통합 근무표" description="월~금 09:00~17:00 · 30분 단위" action={<NativeSelect value={partFilter} onChange={(e)=>setPartFilter(e.target.value)} className="w-full bg-white lg:w-52"><NativeSelectOption value="all">전체 파트</NativeSelectOption>{data.parts.map((part)=><NativeSelectOption key={part.partId} value={part.partId}>{part.partName}</NativeSelectOption>)}</NativeSelect>}/><WeekGrid data={data} partFilter={partFilter}/><div className="mt-3 flex flex-wrap gap-4">{data.parts.map((part)=><span key={part.partId} className="flex items-center gap-2 text-xs font-bold text-slate-600"><i className={`size-2 rounded-full ${PART_CLASSES[part.partId]?.dot||'bg-slate-500'}`}/>{part.partName}</span>)}</div></>}{view==='tasks' && <TasksView data={data} query={query} setQuery={setQuery} onStudent={setSelectedStudent}/>} {view==='students' && <StudentsView data={data} onStudent={setSelectedStudent}/>} {view==='logs' && <><PageTitle eyebrow="ATTENDANCE" title="근무기록" description="출퇴근 시간과 인정 근무시간을 확인합니다."/><div className="grid gap-4 md:grid-cols-3"><Card className="shadow-none"><CardHeader><CardDescription>오늘 기록</CardDescription><CardTitle className="text-3xl font-black">{data.workLogs.filter((log)=>log.date===isoDate(now)).length}<small className="ml-1 text-sm">건</small></CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>근무중</CardDescription><CardTitle className="text-3xl font-black">{data.workLogs.filter((log)=>log.status==='WORKING').length}<small className="ml-1 text-sm">명</small></CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>월 누적</CardDescription><CardTitle className="text-3xl font-black">{Math.round(data.workLogs.reduce((sum,log)=>sum+log.minutes,0)/60*10)/10}<small className="ml-1 text-sm">시간</small></CardTitle></CardHeader></Card></div><div className="mt-4"><ManageCard title="근무기록 목록">{data.workLogs.length?<Table><TableHeader><TableRow><TableHead>학생</TableHead><TableHead>날짜</TableHead><TableHead>출근</TableHead><TableHead>퇴근</TableHead><TableHead>인정시간</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{data.workLogs.map((log)=><TableRow key={log.logId}><TableCell>{data.students.find((student)=>student.studentId===log.studentId)?.name}</TableCell><TableCell>{log.date}</TableCell><TableCell>{log.clockIn?new Date(log.clockIn).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'-'}</TableCell><TableCell>{log.clockOut?new Date(log.clockOut).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'-'}</TableCell><TableCell>{log.minutes}분</TableCell><TableCell><Badge variant="outline">{log.status}</Badge></TableCell></TableRow>)}</TableBody></Table>:<EmptyBlock>아직 근무기록이 없습니다. ‘오늘 근무’에서 출근을 기록해보세요.</EmptyBlock>}</ManageCard></div></>}{view==='admin' && <AdminView data={data} onAdd={setManageKind} onToggle={toggleEntity} onDelete={deleteEntity}/>}</main>{message && <button onClick={()=>setMessage('')} className="fixed bottom-5 right-5 z-30 flex max-w-md items-center gap-2 rounded-[10px] bg-[#123b58] px-4 py-3 text-left text-sm font-semibold text-white shadow-xl"><CheckCircle2 className="size-4"/>{message}</button>}</SidebarInset><StudentDialog student={selectedStudent} data={data} onClose={()=>setSelectedStudent(null)}/><AdminDialog kind={manageKind} data={data} onClose={()=>setManageKind(null)} onSave={saveManaged}/></SidebarProvider>;
}
