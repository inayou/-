// ============================================================
//  Firebase 설정 (leesunghyun 프로젝트)
//  apiKey 등은 클라이언트에 노출되어도 되는 값입니다(비밀키 아님).
//  실제 보안은 Firestore/Storage 보안 규칙으로 합니다.
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBNhkjyOJ9-27PVrJG1zDxdL2rg2DBIH5U",
  authDomain: "leesunghyun.firebaseapp.com",
  projectId: "leesunghyun",
  storageBucket: "leesunghyun.firebasestorage.app",
  messagingSenderId: "513419702985",
  appId: "1:513419702985:web:16808c91340e29baa01318",
  measurementId: "G-1J4LXEB5BK",
};

// 관리자 삭제용 비밀번호 (선택).
// 이 값을 알면 어떤 글이든 삭제할 수 있습니다. 원치 않으면 빈 문자열("")로 두세요.
export const ADMIN_PASSWORD = "";
