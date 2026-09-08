# 한양대학교 ERICA 학생지원팀 근로관리

지원팀·예비군연대를 하나의 운영 DB에서 함께 관리하고, 기존 학생별 `workerType`으로 국가근로·교내근로·단기근로 예산을 분리하는 권한형 포털입니다. 실제 데이터의 원본은 Google Spreadsheet이며, GitHub에는 학생 개인정보나 비밀번호가 저장되지 않습니다.

## 권한별 기능

- 학생: 학번 ID/PW 로그인, 본인 비밀번호 변경, 즉시 출·퇴근, 본인 시간표·근무기록, 공지 조회, 소집 신청/취소, 공유메모, 담당업무, 동일 조직 대체근무, 연락처 수정.
- MANAGER: 통합 운영 상황판, 오늘 근무·결근, 시간표·근무기록·예산·업무·공유메모·공지·소집의 일상 운영 관리.
- SUPER_ADMIN: MANAGER 권한에 더해 관리자 발급·권한변경·비활성화, 학생 생성·비활성화, 학기·파트·핵심 설정 관리. `support-admin`은 SUPER_ADMIN으로 유지됩니다.
- 서버: 매 요청 역할·활성 상태 재검증, salted SHA-256 해시, 마지막 SUPER_ADMIN 보호, 학생별 응답 필터, 소집 중복시간 차단.

## 운영 주소

- Sites Production: <https://hanyang-erica-workstudent-portal.hyungkeun.chatgpt.site>
- GitHub Pages: <https://erakeun.github.io/student-support-workstudent-manager/>
- Google Spreadsheet: <https://docs.google.com/spreadsheets/d/1MsTB8E186vC_m_B-Xbb2whPNU_ocPxis6UCTxuNfI2I/edit>

## 주요 파일

- `backend/Code.gs`: Apps Script V6 API·3단계 권한·비파괴 migration
- `components/operations-features.tsx`: 오늘 근무·결근·공지·소집·계정·비밀번호 UI
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

2026-09-08 V6 migration은 기존 학생 8명·시간표 41구간·근태·인증정보를 그대로 보존하고 `Absences`, `Notices`, `Assemblies`, `AssemblyParticipants` 및 필요한 신규 열만 추가합니다. 과거 소속별 예산 열은 호환용으로 보존하며 새 계산에는 사용하지 않습니다. 기본 시급은 10,320원이고 학생 개별 시급이 우선합니다. 운영 E2E 후 TEST 행과 일회성 정리 코드는 모두 제거했습니다.
