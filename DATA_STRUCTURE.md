# Google Sheet 데이터 구조

모든 관계는 이름이 아닌 ID로 연결합니다. 첫 행 컬럼명은 Apps Script 계약이므로 변경하지 않습니다.

| 시트 | 역할 | 주요 규칙 |
|---|---|---|
| Parts | 근무 그룹 | `partId`로 학생·일정·업무 연결 |
| Students | 학생·로그인·근로유형 | 인증 해시와 관리자 메모는 학생 API에서 제외 |
| Schedules | 학기별 정규 예정 | 월=1∼금=5, 30분 단위 |
| WorkLogs | 실제 출·퇴근 | 누적시간의 기준, 수정자·수정시각 보존 |
| Tasks | 담당업무·근로 위키 | 학생에게는 본인 파트/공통 항목만 반환 |
| Employees | 직원 담당업무·내선 | 근로 위키의 담당자 참조 |
| Semesters | 학기·기간·활성 상태 | 전환 시 과거 데이터 보존 |
| Settings | 활성 학기·시간대·관리자 | `key`/`value` |
| Substitutions | 대체근무 요청·신청·승인 | 요청자·대체자·요청의 `partId` 일치 필수 |
| MigrationLog | 비파괴 마이그레이션 증거 | 전·후 학생·시간표 행 수 기록 |

## 컬럼

- `Parts`: partId, partName, displayOrder, color, active
- `Students`: studentId, name, studentNumber, partId, workerType, startDate, endDate, taskSummary, workMemo, contactMemo, specialNote, substituteTasks, active, loginId, passwordHash, passwordSalt, role, lastPasswordChangedAt
- `Schedules`: scheduleId, studentId, dayOfWeek, startTime, endTime, semesterId, active, updatedAt, updatedBy
- `WorkLogs`: logId, studentId, date, clockIn, clockOut, minutes, status, note, scheduleId, partId, reason, editedBy, editedAt, createdBy, createdAt, flagCode
- `Tasks`: taskId, taskName, description, partId, studentId, employeeId, keywords, active, updatedAt, updatedBy
- `Employees`: employeeId, name, partId, extension, tasks, active
- `Semesters`: semesterId, semesterName, startDate, endDate, active, createdAt, createdBy
- `Settings`: key, value
- `Substitutions`: substitutionId, scheduleId, date, requesterStudentId, substituteStudentId, partId, status, reason, createdAt, updatedAt, approvedBy
- `MigrationLog`: migrationId, appliedAt, version, description, beforeStudents, afterStudents, beforeSchedules, afterSchedules

## 상태·유형

- `workerType`: `NATIONAL_WORK`, `SHORT_TERM`, `OTHER`
- `WorkLogs.status`: `WORKING`, `COMPLETE`
- `Substitutions.status`: `OPEN`, `APPLIED`, `APPROVED`, `REJECTED`, `CANCELLED`
- `flagCode`: `MISSING_CLOCK_OUT`, `INVALID_TIME`, `DUPLICATE_DAY`, `INACTIVE_STUDENT`, `SCHEDULE_MISMATCH`, `OUTSIDE_SCHEDULE`

## 보안 경계

- 관리자는 한양대 조직 인증 토큰을 앱 세션으로 교환하며 `Settings.ADMIN_EMAILS`를 통과해야 합니다.
- 학생 세션은 활성 `Students` 행의 해시 검증 후만 발급됩니다.
- 학생 bootstrap은 본인 `Students`, `Schedules`, `WorkLogs`와 본인 파트 위키·대체근무만 반환합니다.
- `passwordHash`, `passwordSalt`, 학번, 관리자 메모, 다른 학생 기록은 학생 응답에 포함되지 않습니다.
- `Schedules`는 예정이고 `WorkLogs`는 실적입니다. 시간표 수정은 과거 `WorkLogs`를 바꾸지 않습니다.
