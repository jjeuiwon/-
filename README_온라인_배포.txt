원들의 결투 — 실제 온라인 매칭 배포 안내

이 프로젝트는 Node.js + Express + Socket.IO 서버를 사용합니다.
배포하면 온라인 매칭 서버와 게임 페이지를 하나의 주소에서 제공합니다.

[1] GitHub에 파일 올리기
1. https://github.com 에 로그인하고 새 저장소(repository)를 만듭니다.
2. 저장소 이름 예: circle-duel-online
3. 저장소를 만든 뒤 Add file > Upload files를 누릅니다.
4. 이 ZIP을 먼저 기기에서 압축 해제합니다.
5. 압축 해제된 파일 4개(circle_duel.html, server.js, package.json, render.yaml)를 저장소 최상위에 업로드하고 Commit changes를 누릅니다.
   - 폴더 안에 폴더째로 중첩 업로드하지 말고, 파일들이 저장소 첫 화면에 보여야 합니다.

[2] Render에 배포하기
1. https://render.com 에 로그인합니다.
2. Dashboard에서 New > Web Service를 선택합니다.
3. GitHub 저장소 circle-duel-online을 연결합니다.
4. 설정:
   - Runtime/Language: Node
   - Build Command: npm install
   - Start Command: npm start
   - Instance Type: Free (시험용)
5. Create Web Service를 누르고 배포가 완료될 때까지 기다립니다.
6. Render가 제공하는 https://....onrender.com 주소를 엽니다. 이 주소를 다른 사람에게 공유하면 같은 서버에 접속할 수 있습니다.

[3] 실제 매칭 테스트
1. 서로 다른 기기 또는 서로 다른 브라우저에서 배포된 주소를 엽니다.
2. 각 기기에서 계정으로 로그인하고, 온라인 매칭을 누릅니다.
3. 두 기기 모두 보유 원이 2개 이상이어야 매칭됩니다.
4. 매칭은 두 명이 동시에 대기할 때 성사됩니다.

중요한 제한
- Render 무료 서비스는 일정 시간 사용하지 않으면 잠들 수 있어 첫 접속/매칭 때 기다림이 발생할 수 있습니다.
- 계정, 비밀번호, 트로피, 보유 원은 아직 브라우저 localStorage에 저장됩니다. 서로 다른 기기 사이에서 계정 진행 상황이 공유되지는 않습니다.
- 현재 온라인 전투는 브라우저 양쪽에서 시뮬레이션하는 프로토타입입니다. 공개 서비스로 운영하기 전에는 서버 권한형 전투 판정, 계정 인증, 치트 방지, 연결 끊김 및 트로피 동기화를 추가해야 합니다.
- 비밀번호나 비밀 키를 코드나 채팅에 올리지 마세요.
