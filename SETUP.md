# 처음 설치하기

## 1. 운영용 Google Sheet 준비

1. `keun0810@hanyang.ac.kr` 계정으로 Google Drive를 엽니다.
2. 제공된 운영용 스프레드시트를 내 드라이브에 보관합니다.
3. `Students`, `Schedules` 등 시트 이름을 바꾸지 않습니다.

## 2. Apps Script 연결

1. 스프레드시트 상단에서 **확장 프로그램 → Apps Script**를 누릅니다.
2. `backend/Code.gs`의 내용을 `Code.gs`에 넣습니다.
3. 프로젝트 설정에서 시간대를 **Asia/Seoul**로 확인합니다.
4. 편집기 상단 함수 목록에서 `initializeDatabase`를 선택하고 한 번 실행합니다.
5. 권한 요청이 나오면 학교 계정으로 승인합니다.

## 3. 웹앱 배포

1. Apps Script 오른쪽 위 **배포 → 새 배포**를 누릅니다.
2. 유형은 **웹 앱**을 선택합니다.
3. 실행 사용자는 **웹 앱에 액세스하는 사용자**, 액세스 권한은 학교 조직 내부로 설정합니다.
4. 배포 후 표시되는 `/exec` 주소를 복사합니다.
5. `public/runtime-config.js`의 `API_URL`에 붙여 넣습니다.

## 4. 사이트 확인

1. GitHub 저장소의 **Actions**에서 Pages 배포가 끝났는지 확인합니다.
2. 사이트를 열어 왼쪽 아래에 **운영 데이터 연결됨**이 표시되는지 확인합니다.
3. 주간표와 학생 상세정보를 확인합니다.
4. 테스트 학생으로 출근과 퇴근을 한 번 기록한 뒤 `WorkLogs` 시트에서 확인합니다.

## 문제가 생기면

- 데이터가 안 보임: `runtime-config.js`의 Apps Script URL과 배포 권한 확인
- 권한 오류: 학교 계정 로그인 여부와 `Settings` 시트의 `ADMIN_EMAILS` 확인
- 새 학기 자료가 안 보임: `Settings`의 `activeSemester`와 `Schedules.semesterId` 확인
