'use client';
/* oxlint-disable jsx-a11y/label-has-associated-control typescript/no-deprecated typescript/no-base-to-string typescript/no-floating-promises */

import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginScreen({
  busy,
  error,
  onStudent,
  onAdmin,
}: {
  busy: boolean;
  error: string;
  onStudent: (loginId: string, password: string) => Promise<void>;
  onAdmin: (loginId: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'student' | 'admin'>('student');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onStudent(
      String(form.get('loginId') || ''),
      String(form.get('password') || ''),
    );
  };
  const submitAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onAdmin(
      String(form.get('loginId') || ''),
      String(form.get('password') || ''),
    );
  };
  return (
    <main className="login-shell min-h-screen bg-[#eef3f7] p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[24px] border bg-white shadow-[0_25px_80px_rgba(20,45,65,.14)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="login-brand relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#063f6c] p-7 text-white sm:p-12">
          <div className="login-orbit" />
          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-white text-sm font-black text-[#075b9b]">
                HY
              </span>
              <div>
                <p className="font-black">한양대학교 ERICA</p>
                <p className="text-sm text-sky-100">학생지원팀 근로관리</p>
              </div>
            </div>
            <p className="text-xs font-black tracking-[.18em] text-sky-200">
              WORK STUDENT PORTAL
            </p>
            <h1 className="mt-3 max-w-lg text-4xl font-black leading-[1.18] tracking-[-.055em] sm:text-5xl">
              근무의 시작부터
              <br />
              기록까지 한곳에서
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-sky-100">
              학생지원·예비군·병무·중국학생 근로를 한 시스템에서 안전하게
              운영합니다.
            </p>
          </div>
          <div className="relative z-10 grid gap-3 text-sm sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4" />
              출퇴근 기록
            </span>
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              개인 시간표
            </span>
            <span className="flex items-center gap-2">
              <BookOpenText className="size-4" />
              근로 위키
            </span>
          </div>
        </section>
        <section className="flex items-center p-6 sm:p-12">
          <div className="w-full">
            <p className="text-xs font-black tracking-[.14em] text-[#075b9b]">
              SIGN IN
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.045em]">
              근로관리 로그인
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              권한에 맞는 화면으로 연결합니다.
            </p>
            <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                className={`rounded-lg px-4 py-3 text-sm font-bold ${mode === 'student' ? 'bg-white text-[#075b9b] shadow-sm' : 'text-slate-500'}`}
                onClick={() => setMode('student')}
              >
                근로학생
              </button>
              <button
                className={`rounded-lg px-4 py-3 text-sm font-bold ${mode === 'admin' ? 'bg-white text-[#075b9b] shadow-sm' : 'text-slate-500'}`}
                onClick={() => setMode('admin')}
              >
                관리자
              </button>
            </div>
            {mode === 'student' ? (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="field-label">
                  ID 또는 학번
                  <Input
                    name="loginId"
                    autoComplete="username"
                    required
                    placeholder="관리자가 안내한 로그인 ID"
                    className="h-12"
                  />
                </label>
                <label className="field-label">
                  비밀번호
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="h-12"
                  />
                </label>
            <Button type="submit" disabled={busy} className="h-12 w-full text-base">
                  {busy ? '확인 중…' : '학생 로그인'} <ArrowRight />
                </Button>
              </form>
            ) : (
              <form onSubmit={submitAdmin} className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-black text-[#075b9b]">
                  <ShieldCheck className="size-5" /> 관리자 로그인
                </div>
                <label className="field-label">
                  관리자 ID
                  <Input
                    name="loginId"
                    autoComplete="username"
                    required
                    className="h-12"
                  />
                </label>
                <label className="field-label">
                  비밀번호
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="h-12"
                  />
                </label>
                <Button type="submit" disabled={busy} className="h-12 w-full text-base">
                  {busy ? '확인 중…' : '관리자 로그인'} <ArrowRight />
                </Button>
              </form>
            )}
            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
              >
                {error}
              </div>
            )}
            <p className="mt-6 text-xs leading-5 text-slate-400">
              계정이나 비밀번호 관련 문의는 학생지원팀으로 연락하세요.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
