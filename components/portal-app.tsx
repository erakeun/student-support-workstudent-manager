'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPortal } from '@/components/admin-portal';
import { LoginScreen } from '@/components/login-screen';
import { StudentPortal } from '@/components/student-portal';
import {
  loadRoleData,
  loginAdmin,
  loginStudent,
  logoutPortal,
  postPortalAction,
  restoreSession,
} from '@/lib/api';
import type { PortalData, SessionUser } from '@/lib/portal-types';

export function PortalApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const refresh = useCallback(
    async (role?: SessionUser['role']) => {
      const target = role || user?.role;
      if (!target) return;
      setData(await loadRoleData(target));
    },
    [user?.role],
  );
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await restoreSession();
        if (session && active) {
          setUser(session);
          setData(await loadRoleData(session.role));
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.',
          );
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const enter = async (next: SessionUser) => {
    setUser(next);
    setData(await loadRoleData(next.role));
  };
  const studentSignIn = async (loginId: string, password: string) => {
    setBusy(true);
    setError('');
    try {
      await enter(await loginStudent(loginId, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };
  const adminSignIn = async (loginId: string, password: string) => {
    setBusy(true);
    setError('');
    try {
      await enter(await loginAdmin(loginId, password));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '관리자 로그인에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };
  const action = async (
    actionName: string,
    payload: Record<string, unknown> = {},
  ) => {
    setBusy(true);
    setMessage('');
    try {
      await postPortalAction(actionName, payload);
      await refresh();
      setMessage(successMessage(actionName));
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : '요청을 처리하지 못했습니다.',
      );
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    await logoutPortal();
    setUser(null);
    setData(null);
    setBusy(false);
  };
  if (!user || !data)
    return (
      <LoginScreen
        busy={busy}
        error={error}
        onStudent={studentSignIn}
        onAdmin={adminSignIn}
      />
    );
  const props = {
    user,
    data,
    busy,
    message,
    onAction: action,
    onRefresh: () => refresh(),
    onLogout: logout,
  };
  return user.role === 'STUDENT' ? <StudentPortal {...props} /> : <AdminPortal {...props} />;
}

function successMessage(action: string) {
  const labels: Record<string, string> = {
    clockIn: '출근을 기록했습니다.',
    clockOut: '퇴근과 인정시간을 반영했습니다.',
    adminUpsertStudent: '학생 정보를 저장했습니다.',
    adminResetPassword: '비밀번호를 안전하게 초기화했습니다.',
    adminUpsertSchedule: '시간표를 저장했습니다.',
    adminDeactivateSchedule: '시간표를 비활성화했습니다.',
    adminUpsertWorkLog: '근무기록과 수정 이력을 저장했습니다.',
    adminCancelWorkLog: '근무기록을 삭제 처리하고 이력을 보존했습니다.',
    adminUpsertTask: '담당업무를 저장했습니다.',
    adminDeactivateTask: '담당업무를 비활성화했습니다.',
    adminCreateSemester: '새 학기를 생성했습니다.',
    adminUpsertSemester: '학기 정보를 저장했습니다.',
    adminActivateSemester: '활성 학기를 전환했습니다.',
    adminUpsertPart: '파트 정보를 저장했습니다.',
    adminDeactivatePart: '조직을 비활성화했습니다.',
    adminSaveSettings: '설정을 저장했습니다.',
    studentCreateSubstitution: '대체근무 요청을 등록했습니다.',
    studentApplySubstitution: '같은 파트 대체근무에 신청했습니다.',
    adminReviewSubstitution: '대체근무 요청을 처리했습니다.',
    adminCancelSubstitution: '대체근무 요청을 취소했습니다.',
    adminUpsertBudget: '월 예산을 저장했습니다.',
    adminUpsertHandover: '인수인계를 저장했습니다.',
    adminDeleteHandover: '인수인계를 삭제 처리했습니다.',
    studentUpsertHandover: '인수인계를 저장했습니다.',
    changeOwnPassword: '비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 사용하세요.',
    adminUpsertAdmin: '관리자 계정을 저장했습니다.',
    adminResetAdminPassword: '관리자 비밀번호를 초기화했습니다.',
    adminDeactivateAdmin: '관리자 계정을 비활성화했습니다.',
    adminUpsertAbsence: '결근 기록과 수정 이력을 저장했습니다.',
    adminCancelAbsence: '결근 처리를 취소했습니다.',
    adminUpsertNotice: '공지사항을 저장했습니다.',
    adminDeleteNotice: '공지사항을 삭제 처리했습니다.',
    adminUpsertAssembly: '소집을 저장했습니다.',
    adminAssignAssembly: '소집 참여자를 배정했습니다.',
    adminCancelAssemblyParticipant: '소집 참여를 취소했습니다.',
    studentApplyAssembly: '소집에 신청했습니다.',
    studentCancelAssembly: '소집 신청을 취소했습니다.',
    adminConfirmAssemblyAttendance: '소집 참석을 확인하고 근무기록에 반영했습니다.',
  };
  return labels[action] || '저장했습니다.';
}
