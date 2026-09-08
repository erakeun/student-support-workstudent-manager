# 한양대학교 ERICA 학생지원팀 근로관리

지원팀·예비군연대를 하나의 운영 DB에서 함께 관리하고, 기존 학생별 `workerType`으로 국가근로·교내근로·단기근로 예산을 분리하는 권한형 포털입니다. 실제 데이터의 원본은 Google Spreadsheet이며, GitHub에는 학생 개인정보나 비밀번호가 저장되지 않습니다.

## 권한별 기능

- 학생: 학번 ID/PW 로그인, 즉시 출·퇴근, 본인 주·월간 시간표, 근무기록, 공유메모 작성·확인·본인 글 수정/삭제/완료, 담당업무, 동일 조직 대체근무, 연락처 수정.
- 관리자: 일반 ID/PW 로그인, 통합 운영 상황판, 학생/계정 CRUD, 평일 주·월간 시간표, 근무기록 추가·보정·취소, 공유메모 고정·중요·완료·삭제, 월별 전체/국가/교내/단기 예산, 담당업무, 학기, 조직, 운영 옵션 설정.
- 서버: 역할 검사, 비활성·근무기간 종료 로그인 차단, salted SHA-256 해시, 동일 `partId` 강제, 학생별 응답 필터.

## 운영 주소

- Sites Production: <https://hanyang-erica-workstudent-portal.hyungkeun.chatgpt.site>
- GitHub Pages: <https://erakeun.github.io/student-support-workstudent-manager/>
- Google Spreadsheet: <https://docs.google.com/spreadsheets/d/1MsTB8E186vC_m_B-Xbb2whPNU_ocPxis6UCTxuNfI2I/edit>

## 주요 파일

- `backend/Code.gs`: Apps Script V5 API·인증·비파괴 migration
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

2026-09-08 V5 migration은 기존 학생 8명·시간표 41구간·근태·인증정보를 그대로 보존하고 `Budgets`에 `nationalBudget`·`internalBudget`, `Handovers`에 고정·확인 필드만 추가합니다. 과거 소속별 예산 열은 호환용으로 보존하며 새 계산에는 사용하지 않습니다. 기본 시급은 10,320원이고 학생 개별 시급이 우선합니다.
