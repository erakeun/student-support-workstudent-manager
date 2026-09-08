# 기능·데이터·구조 계획

`seoul-workstudent-manager`의 운영 우선 대시보드와 공유메모 흐름, 기존 ERICA 포털의 관리자 편집·학기 구조를 읽기 전용으로 비교했습니다. 학생지원팀 버전은 지원팀·예비군연대를 한 사무실 현황으로 통합하고, 소속과 근로유형을 분리해 예산을 계산합니다.

```text
GitHub Pages / Sites 정적 프론트엔드
            │
            │ HTTPS JSON
            ▼
Google Apps Script 웹앱
            │
            ▼
Google Spreadsheet (실제 개인정보·시간표·근무기록)
```

- 첫 화면: 오늘 근무 → 주간 → 월간 → 공유메모 → 확인 필요 근태·예산
- 데이터: 사람 이름 대신 ID 관계키 사용, 학기·파트 모두 설정 데이터
- 보안: 운영 데이터는 학교 계정 소유 Sheet에만 저장, GitHub에는 더미 데이터만 포함
- 이관: Apps Script URL은 `runtime-config.js`, 활성 학기와 관리자는 Settings에서 한 번만 관리
