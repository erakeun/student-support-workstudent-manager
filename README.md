# 한양대학교 ERICA 학생지원팀 근로관리

학생지원팀, 예비군·병무, 중국학생 근로를 한 화면에서 확인하는 내부 운영 포털입니다. 오늘 근무 현황, 주간 통합표, 담당업무 위키, 학생 상세정보, 출퇴근 기록과 관리자 기능을 제공합니다.

## 운영 원칙

- 실제 학번, 연락처, 개인 메모와 근무기록은 Google Sheet에만 저장합니다.
- 이 저장소에는 예제 학생 A~H만 포함합니다.
- 파트와 학기는 데이터로 관리하여 코드 수정 없이 추가할 수 있습니다.
- `public/runtime-config.js` 한 곳에서 Apps Script URL을 관리합니다.

## 구성

- `app`, `components`, `lib`: 반응형 포털 화면과 API 연결
- `backend/Code.gs`: Google Apps Script API
- `backend/appsscript.json`: Apps Script 설정 참고본
- `.github/workflows/pages.yml`: GitHub Pages 개발 배포
- `SETUP.md`: 처음 설치하는 방법
- `HANDOVER.md`: 담당자 이관 방법
- `DATA_STRUCTURE.md`: Google Sheet 표 구조

## 확인 명령

```bash
npm ci
npm run build
npm run lint
```

Google Sheet가 연결되지 않은 상태에서는 개인정보 없는 미리보기 데이터로 모든 주요 화면을 확인할 수 있습니다.
