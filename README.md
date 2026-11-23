# RN 2026 Winter Gallery v2

## 실행
`python3 -m http.server 8080` 실행 후 `http://localhost:8080/rn2026-gallery-v2/` 접속 (서버 루트가 상위 폴더일 때). 폴더 안에서 서버를 실행했다면 `/`로 접속합니다.

## 조작
- WASD: 이동
- 마우스: 포인터 잠금 중 시점 회전. Esc로 잠금을 해제하고 화면을 클릭해 다시 잠급니다.
- Tab 또는 메뉴 버튼: 빠른 메뉴 열기 / 닫기
- V 또는 빠른 메뉴의 시점 버튼: 1인칭 / 3인칭(후방 추적)
- E: 작품 보기 (상세 화면에서 좌우 방향키로 화면 전환, Esc로 닫기)
- C: 박수
- R: 입장 위치와 시점으로 돌아가기

## 참고
앱/스토어 주소는 index.html의 APPS에서 변경하세요. 실시간 접속은 config.js의 Supabase 설정이 필요합니다. 예시 앱 이미지는 데모 화면입니다.


## v2.1 전시 벽면 수정
- 양쪽 벽의 앱을 동일한 z 좌표(-7, 0, 7)에 마주보도록 배치
- 기둥과 몰딩을 전시 화면 사이의 빈 구간으로 이동, 화면을 가로지르는 수평 몰딩 제거
- iPhone 스타일의 라운드 메탈 프레임, 라운드 스크린, 다이내믹 아일랜드, 측면 버튼
- `APPS` 배열의 `screens`, `ios`, `android` 값에 실제 정보 입력


## v2.2 wall clearance fix
- Removed the 4m-spaced structural columns that crossed the exhibit phones.
- All pilasters and decorative strips now share the four bay boundaries at z=-10.5,-3.5,3.5,10.5.
- Pilasters are embedded toward the side walls, behind the phones.
- Kept the three symmetric phone exhibits on each wall.

## 익명 방명록
각 작품의 상세 화면에서 방명록을 작성할 수 있습니다. Supabase 설정이 비어 있으면 메시지는 해당 브라우저에만 저장됩니다. 여러 관람객이 함께 보려면 Supabase 프로젝트에서 `guestbook.sql`을 실행하고 `config.js`에 프로젝트 URL과 anon key를 입력하세요. 공유 방명록 메시지는 익명으로 공개됩니다.

로컬 접속(`localhost`, `127.0.0.1`, `::1` 또는 파일 직접 열기)에서는 빠른 메뉴에 가상 관람객 버튼이 표시됩니다. 일반 배포 도메인에서는 표시되지 않습니다.

## 투표와 전시 종료
입장하면 브라우저에 고유한 투표 용지 1장이 발급됩니다. 작품 상세에서 한 작품을 선택해 투표할 수 있으며 제출 후에는 변경할 수 없습니다. `config.js`의 `exhibitionStartsAt`과 `exhibitionEndsAt`에 시간대를 포함한 ISO 8601 시각을 입력하면 시작 전 입장을 막고 해당 시각에 전시와 투표가 종료되고 결과 화면으로 전환됩니다. 각 설정을 비워 두면 해당 시작 또는 종료 제한은 적용되지 않습니다. 로컬 접속에서는 시작 전에도 입장할 수 있지만 투표는 시작 시각부터 가능합니다. 종료 제한은 로컬에도 적용됩니다. 현재 기간은 한국 시간으로 2026년 12월 16일 0시부터 2027년 1월 1일 0시까지입니다.

현재 투표는 브라우저에만 저장되며 종료 후 결과도 해당 브라우저의 투표만 집계합니다. Supabase 설정을 입력해도 투표는 아직 서버에 저장되지 않습니다. 전체 결과, 서버 기준 종료 시각 및 투표 검증은 추후 별도의 서버 연동이 필요합니다. 브라우저 데이터를 삭제하거나 다른 브라우저 또는 기기를 사용하면 다시 투표할 수 있습니다.
