# 데이터 구조

모든 관계는 이름이 아니라 ID로 연결합니다. 첫 행의 컬럼명은 Apps Script가 사용하므로 바꾸지 않습니다.

| 시트 | 용도 | 주요 연결 |
|---|---|---|
| Parts | 파트 목록과 색상·순서 | `partId` |
| Students | 학생 기본정보와 메모 | `partId` → Parts |
| Schedules | 학기별 반복 근무시간 | `studentId` → Students, `semesterId` → Semesters |
| WorkLogs | 실제 출퇴근 기록 | `studentId` → Students |
| Tasks | 근로 위키·담당업무 | `partId`, `studentId`, `employeeId` |
| Employees | 직원 담당업무와 내선 | `partId` → Parts |
| Semesters | 학기 기간과 활성 여부 | `semesterId` |
| Settings | 활성 학기·관리자 이메일 | `key`, `value` |

## 필드

- `Students`: studentId, name, studentNumber, partId, workerType, startDate, endDate, taskSummary, workMemo, contactMemo, specialNote, substituteTasks, active
- `Parts`: partId, partName, displayOrder, color, active
- `Schedules`: scheduleId, studentId, dayOfWeek(월=1~금=5), startTime, endTime, semesterId, active
- `WorkLogs`: logId, studentId, date, clockIn, clockOut, minutes, status, note
- `Tasks`: taskId, taskName, description, partId, studentId, employeeId, keywords, active
- `Employees`: employeeId, name, partId, extension, tasks, active
- `Semesters`: semesterId, semesterName, startDate, endDate, active
- `Settings`: key, value

`workerType`은 `NATIONAL_WORK`, `SHORT_TERM`, `OTHER` 중 하나를 사용합니다.
