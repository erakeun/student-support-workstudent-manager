# Google Sheet 데이터 구조

모든 관계는 이름이 아닌 ID로 연결합니다. 첫 행 컬럼명은 Apps Script 계약이므로 변경하지 않습니다.

| 시트 | 역할 | 주요 규칙 |
|---|---|---|
| Parts | 조직 | 기본 `SUPPORT`·`RESERVE`, 새 조직 UI 추가 가능 |
| Students | 학생·로그인·근로유형 | 연락처·개별 시급, 인증 해시와 관리자 메모는 학생 API에서 제외 |
| Schedules | 학기별 정규·특정일 예정 | 월=1∼금=5, 30분 단위, 선택적 `date` |
| WorkLogs | 실제 출·퇴근 | 누적시간의 기준, 수정자·수정시각 보존 |
| Tasks | 담당업무·근로 위키 | 학생에게는 본인 파트/공통 항목만 반환 |
| Employees | 직원 담당업무·내선 | 근로 위키의 담당자 참조 |
| Semesters | 학기·기간·활성 상태 | 전환 시 과거 데이터 보존 |
| Settings | 활성 학기·시간대·관리자 | `key`/`value` |
| Substitutions | 대체근무 요청·신청·승인 | 요청자·대체자·요청의 `partId` 일치 필수 |
| MigrationLog | 비파괴 마이그레이션 증거 | 전·후 학생·시간표 행 수 기록 |
| Admins | 일반 관리자 계정 | 로그인 ID와 salt 해시, 활성 상태 |
| Budgets | 월·근로유형별 예산 | 전체·국가근로·교내근로·단기근로 예산과 감사 필드 |
| Handovers | 학생·관리자 공유메모 | 공개범위·상태·중요도·고정·확인, 소프트 삭제 |

## 컬럼

- `Parts`: partId, partName, displayOrder, color, active, defaultHourlyWage, note
- `Students`: studentId, name, studentNumber, partId, workerType, startDate, endDate, taskSummary, workMemo, contactMemo, specialNote, substituteTasks, active, loginId, passwordHash, passwordSalt, role, lastPasswordChangedAt, email, phone, hourlyWage
- `Schedules`: scheduleId, studentId, dayOfWeek, startTime, endTime, semesterId, active, updatedAt, updatedBy, date
- `WorkLogs`: logId, studentId, date, clockIn, clockOut, minutes, status, note, scheduleId, partId, reason, editedBy, editedAt, createdBy, createdAt, flagCode
- `Tasks`: taskId, taskName, description, partId, studentId, employeeId, keywords, active, updatedAt, updatedBy
- `Employees`: employeeId, name, partId, extension, tasks, active
- `Semesters`: semesterId, semesterName, startDate, endDate, active, createdAt, createdBy
- `Settings`: key, value
- `Substitutions`: substitutionId, scheduleId, date, requesterStudentId, substituteStudentId, partId, status, reason, createdAt, updatedAt, approvedBy
- `MigrationLog`: migrationId, appliedAt, version, description, beforeStudents, afterStudents, beforeSchedules, afterSchedules
- `Admins`: adminId, name, loginId, passwordHash, passwordSalt, active, lastPasswordChangedAt, createdAt, createdBy
- `Budgets`: month, totalBudget, supportBudget, reserveBudget, shortTermBudget, note, updatedAt, updatedBy, nationalBudget, internalBudget. `supportBudget`·`reserveBudget`은 V4 호환용 보존 열이며 V5 계산에는 사용하지 않습니다.
- `Handovers`: handoverId, date, partId, authorStudentId, title, content, status, priority, targetStudentId, createdAt, updatedAt, completedAt, visibility, active, deletedAt, deletedBy, pinned, acknowledgedBy

## 상태·유형

- `workerType`: 기존 값을 유지합니다. `NATIONAL_WORK`=국가근로, `SHORT_TERM`=단기근로, `OTHER`/`INTERNAL_WORK`=교내근로 집계입니다.
- `WorkLogs.status`: `WORKING`, `COMPLETE`, `CANCELLED`
- `Substitutions.status`: `OPEN`, `APPLIED`, `APPROVED`, `REJECTED`, `CANCELLED`
- `flagCode`: `MISSING_CLOCK_OUT`, `INVALID_TIME`, `DUPLICATE_DAY`, `INACTIVE_STUDENT`, `SCHEDULE_MISMATCH`, `OUTSIDE_SCHEDULE`
- `Handovers.status`: `OPEN`, `IN_PROGRESS`, `DONE`; `priority`: `NORMAL`, `IMPORTANT`

## 보안 경계

- 관리자는 `Admins` 행의 일반 ID/PW 해시 검증 후 앱 세션을 발급받습니다. Google OAuth나 한양대 조직 인증에 의존하지 않습니다.
- 학생 세션은 활성 `Students` 행의 해시 검증 후만 발급됩니다.
- 학생 bootstrap은 본인 `Students`, `Schedules`, `WorkLogs`와 본인 파트 위키·대체근무만 반환합니다.
- `passwordHash`, `passwordSalt`, 개별 시급, 관리자 메모, 다른 학생 기록은 학생 응답에 포함되지 않습니다. 학생 본인에게만 본인 학번·이메일·전화번호를 반환합니다.
- `Schedules`는 예정이고 `WorkLogs`는 실적입니다. 시간표 수정은 과거 `WorkLogs`를 바꾸지 않습니다.
- 월 예산은 해당 월의 실제 평일 날짜와 학기·학생 근무기간·`Schedules`를 교차해 예정 시간을 계산하며, 완료된 `WorkLogs`로 실제 비용을 계산합니다. 소속 `partId`가 아니라 기존 `workerType`으로 국가/교내/단기를 분리합니다. 학생 개별 시급이 없으면 `defaultHourlyWage=10320`을 적용합니다.
