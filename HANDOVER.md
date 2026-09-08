# 담당자 이관 안내

개발자가 아닌 학생지원팀 담당자가 그대로 따라 할 수 있도록 작성했습니다.

## 1. GitHub 저장소 넘기기

1. GitHub에서 `student-support-workstudent-manager` 저장소를 엽니다.
2. **Settings → Collaborators and teams**를 엽니다.
3. 새 담당자의 GitHub 계정을 추가합니다.
4. 완전한 소유권 이전이 필요하면 **Settings → General → Transfer ownership**를 사용합니다.

## 2. Google Spreadsheet 넘기기

1. Google Drive에서 운영 스프레드시트를 엽니다.
2. 오른쪽 위 **공유**를 누릅니다.
3. 새 담당자의 한양대학교 이메일을 **편집자**로 추가합니다.
4. 학교 정책에서 허용하면 소유권을 이전하고, 허용하지 않으면 기존 부서 계정을 공동 관리자로 유지합니다.

## 3. Apps Script 넘기기

스프레드시트에 연결된 Apps Script는 스프레드시트 공유 권한을 따릅니다. 새 담당자가 **확장 프로그램 → Apps Script**를 열 수 있는지 확인합니다.

## 4. 웹앱 다시 배포하기

1. Apps Script를 엽니다.
2. **배포 → 배포 관리**를 누릅니다.
3. 연필 모양 **수정**을 누릅니다.
4. 버전을 **새 버전**으로 바꾸고 **배포**를 누릅니다.
5. `/exec` 주소가 바뀌면 `public/runtime-config.js` 한 곳만 수정합니다.

## 5. 담당자가 바뀌었을 때

1. `Settings` 시트의 `ADMIN_EMAILS`에 새 담당자 학교 이메일을 추가합니다.
2. 이전 담당자 접근권한이 더 이상 필요 없으면 공유 목록과 `ADMIN_EMAILS`에서 제거합니다.
3. 사이트에서 관리자 메뉴가 열리는지 확인합니다.

## 6. 학기가 바뀌었을 때

1. `Semesters` 시트에 새 학기를 추가합니다.
2. 새 시간표를 `Schedules`에 입력합니다.
3. `Settings` 시트의 `activeSemester` 값을 새 학기 ID로 바꿉니다.
4. 과거 학기 행은 삭제하지 않습니다.

## 7. 학생 추가·중지

관리자 화면 또는 `Students` 시트를 사용합니다. 학생이 그만둔 경우 행을 삭제하지 말고 `active`를 `FALSE`로 바꿉니다.

## 8. 장애가 발생하면

1. GitHub Actions의 Pages 배포 상태
2. `public/runtime-config.js`의 API 주소
3. Apps Script의 **실행** 기록과 오류 메시지
4. Google Sheet의 시트 이름과 첫 행 컬럼명
5. 학교 계정 로그인 및 공유 권한

순서로 확인합니다. 운영 데이터를 수정하기 전에는 스프레드시트 사본을 만들어 보관합니다.
