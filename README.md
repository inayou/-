# 추모 공간 (Memorial Site)

백엔드 서버를 직접 운영하지 않고 **Firebase(BaaS)** 로 동작하는 추모 사이트입니다.
누구나 추모의 글을 작성하고, 사진을 첨부하고, **글별 비밀번호**로 삭제할 수 있습니다.

- **프론트엔드**: 순수 HTML / CSS / JavaScript (빌드 과정 없음)
- **데이터/이미지 저장**: Firebase Firestore + Firebase Storage
- **호스팅**: GitHub Pages (또는 Firebase Hosting / Vercel)

---

## 1. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 **프로젝트 만들기**.
2. **빌드 → Firestore Database → 데이터베이스 만들기** (위치: `asia-northeast3` 서울 권장).
3. **빌드 → Storage → 시작하기** 로 스토리지 활성화.
4. 좌측 상단 **프로젝트 설정(⚙️) → 내 앱 → 웹 앱(</>) 추가** 후, 표시되는 `firebaseConfig` 값을
   [`firebase-config.js`](firebase-config.js) 에 붙여넣습니다.

```js
export const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…",
};
```

> `apiKey`는 브라우저에 노출되어도 되는 값입니다(비밀키 아님). 실제 보안은 아래 **보안 규칙**으로 합니다.

### 보안 규칙

**Firestore 규칙** (Firestore Database → 규칙):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tributes/{doc} {
      // 누구나 읽기/작성 가능, 수정 불가, 삭제 허용(비밀번호 확인은 클라이언트에서)
      allow read, create, delete: if true;
      allow update: if false;
    }
  }
}
```

**Storage 규칙** (Storage → 규칙):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tributes/{file} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow delete: if true;
    }
  }
}
```

> ⚠️ **삭제 비밀번호는 클라이언트에서 검증**합니다(로그인 시스템이 없으므로). 편의성은 높지만,
> 기술에 밝은 사람이 브라우저 콘솔로 우회 삭제할 여지는 있습니다. 더 강한 보안이 필요하면
> Firebase Authentication(익명/구글 로그인)이나 Cloud Functions로 확장할 수 있습니다.

### 승인된 도메인 등록

Firebase 콘솔 → **Authentication → 설정 → 승인된 도메인** 에 배포할 도메인
(`inayou.github.io`, 그리고 커스텀 도메인)을 추가하세요.

---

## 2. 로컬에서 실행

ES module을 쓰기 때문에 `file://` 로 직접 열면 안 되고, 간단한 로컬 서버가 필요합니다.

```bash
# 예: Python
python -m http.server 5500
# → http://localhost:5500 접속
```

---

## 3. GitHub Pages 배포

1. 이 저장소에 코드를 push 합니다.
2. GitHub 저장소 → **Settings → Pages**.
3. **Source: Deploy from a branch** → 브랜치 `main`, 폴더 `/ (root)` 선택 → Save.
4. 몇 분 뒤 `https://inayou.github.io/저장소이름/` 에서 접속됩니다.

> 순수 정적 파일이라 빌드 설정이 필요 없습니다. push만 하면 자동 반영됩니다.

---

## 4. Porkbun 커스텀 도메인 연결

도메인은 **따로 구매(Porkbun 등)해서 DNS만 GitHub Pages로 연결**하면 됩니다.

### GitHub 쪽
- Settings → Pages → **Custom domain** 에 도메인 입력 (예: `example.com`) → Save.
  - 이렇게 하면 저장소 루트에 `CNAME` 파일이 자동 생성됩니다.
- **Enforce HTTPS** 체크 (인증서 발급까지 몇 분~수십 분 소요).

### Porkbun DNS 설정 (Porkbun → 도메인 → **DNS Records**)

**apex 도메인(`example.com`)을 쓸 경우** — A 레코드 4개:

| Type | Host | Answer |
|------|------|--------|
| A | (비움) | 185.199.108.153 |
| A | (비움) | 185.199.109.153 |
| A | (비움) | 185.199.110.153 |
| A | (비움) | 185.199.111.153 |

그리고 `www` 서브도메인용 CNAME:

| Type | Host | Answer |
|------|------|--------|
| CNAME | www | inayou.github.io |

**서브도메인(`www.example.com`)만 쓸 경우** — CNAME 하나면 됩니다:

| Type | Host | Answer |
|------|------|--------|
| CNAME | www | inayou.github.io |

> DNS 전파는 보통 수 분~수 시간 걸립니다. 연결 후 Firebase **승인된 도메인**에도 커스텀 도메인을 꼭 추가하세요.

---

## 파일 구조

```
.
├── index.html          # 페이지 구조
├── styles.css          # 스타일
├── app.js              # Firebase 연동 · 글쓰기/삭제/이미지 업로드 로직
├── firebase-config.js  # Firebase 설정 (본인 값으로 교체)
└── README.md
```

## 향후 확장 아이디어
- 관리자 로그인(Firebase Auth)으로 삭제 권한 강화
- 고인의 프로필/연혁 섹션, 헌화(꽃 남기기) 기능
- 신고/블라인드 처리, 페이지네이션
