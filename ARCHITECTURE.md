# 기능·데이터·구조 계획

기존 `seoul-workstudent-manager`는 정적 프론트엔드와 Apps Script API를 분리하고, 현재 근무·주간표·근태·학기 관리를 한 운영 화면에 모은 점을 재사용했습니다. 학생지원팀 버전은 근무지 전환 대신 세 파트를 동시에 보여주며, 담당업무 검색과 직원 내선 연결 구조를 핵심으로 확장했습니다.

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

- 첫 화면: 세 파트 현재·다음 근무자 + 오늘 전체 일정 + 업무 검색
- 데이터: 사람 이름 대신 ID 관계키 사용, 학기·파트 모두 설정 데이터
- 보안: 운영 데이터는 학교 계정 소유 Sheet에만 저장, GitHub에는 더미 데이터만 포함
- 이관: Apps Script URL은 `runtime-config.js`, 활성 학기와 관리자는 Settings에서 한 번만 관리
