# 한양대학교 ERICA 학생지원팀 근로관리

학생지원·예비군/병무·중국학생 근로를 하나의 운영 DB에서 관리하는 권한 분리 포털입니다. 실제 데이터의 원본은 Google Spreadsheet이며, GitHub에는 학생 개인정보나 비밀번호가 저장되지 않습니다.

## 권한별 기능

- 학생: ID/학번 로그인, 본인 시간표, 출·퇴근, 월/학기 누적시간, 본인 기록, 근로 위키, 동일 파트 대체근무.
- 관리자: 세 파트 통합 대시보드, 학생/계정 CRUD, 시간표, 근무기록 추가·보정, 이상 기록, 담당업무, 학기, 파트, 대체근무, 설정.
- 서버: 역할 검사, 비활성 로그인 차단, salted SHA-256 해시, 동일 `partId` 강제, `SHORT_TERM` 기간 검사, 학생별 응답 필터.

## 운영 주소

- Sites Production: <https://hanyang-erica-workstudent-portal.hyungkeun.chatgpt.site>
- GitHub Pages: <https://erakeun.github.io/student-support-workstudent-manager/>
- Google Spreadsheet: <https://docs.google.com/spreadsheets/d/1MsTB8E186vC_m_B-Xbb2whPNU_ocPxis6UCTxuNfI2I/edit>

## 주요 파일

- `backend/Code.gs`: Apps Script V2 API·인증·migration
- `components/login-screen.tsx`: 최초 로그인
- `components/student-portal.tsx`: 모바일 우선 학생 포털
- `components/admin-portal.tsx`: PC 우선 관리자 포털
- `DATA_STRUCTURE.md`: 시트 스키마와 보안 경계
- `HANDOVER.md`: 행정 담당자 운영·이관 절차
- `FEATURE_PARITY.md`: 두 레퍼런스와의 기능 비교

## 검증

```bash
npm ci
npm test
npm run lint
npm run build
```

2026-09-08 V2 migration은 기존 학생 8명과 시간표 41구간을 그대로 보존했습니다. E2E에 사용한 `TEST-20260908-*` 학생·일정·기록·업무·학기·대체근무는 검증 후 모두 제거했습니다.
