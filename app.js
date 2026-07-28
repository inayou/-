// ============================================================
//  추모 공간 — 애플리케이션 로직 (Firebase, 백엔드 코드 없음)
// ============================================================
import { firebaseConfig, ADMIN_PASSWORD } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- 초기화 ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const tributesCol = collection(db, "tributes");

// --- DOM ---
const form = document.getElementById("tribute-form");
const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");
const imageInput = document.getElementById("image");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const listEl = document.getElementById("tributes");
const countEl = document.getElementById("count");
const loadingEl = document.getElementById("loading");
const previewWrap = document.getElementById("image-preview");
const previewImg = document.getElementById("preview-img");
const removeImageBtn = document.getElementById("remove-image");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// --- 유틸 ---
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}
function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

// --- 이미지 미리보기 ---
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) {
    previewWrap.hidden = true;
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showError("이미지는 5MB 이하만 첨부할 수 있습니다.");
    imageInput.value = "";
    previewWrap.hidden = true;
    return;
  }
  clearError();
  previewImg.src = URL.createObjectURL(file);
  previewWrap.hidden = false;
});

removeImageBtn.addEventListener("click", () => {
  imageInput.value = "";
  previewWrap.hidden = true;
});

// --- 글 작성 ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  const password = passwordInput.value;
  const file = imageInput.files[0];

  if (!name || !message || !password) {
    showError("이름, 추모의 글, 비밀번호를 모두 입력해 주세요.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "등록 중…";

  try {
    let imageUrl = "";
    let imagePath = "";

    if (file) {
      imagePath = `tributes/${Date.now()}_${Math.floor(performance.now())}_${file.name}`;
      const sRef = storageRef(storage, imagePath);
      await uploadBytes(sRef, file);
      imageUrl = await getDownloadURL(sRef);
    }

    await addDoc(tributesCol, {
      name,
      message,
      imageUrl,
      imagePath,
      passwordHash: await sha256(password),
      createdAt: serverTimestamp(),
    });

    form.reset();
    previewWrap.hidden = true;
  } catch (err) {
    console.error(err);
    showError("등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "추모글 남기기";
  }
});

// --- 글 삭제 ---
async function handleDelete(id, data) {
  const input = prompt("이 글의 삭제용 비밀번호를 입력하세요.");
  if (input === null) return; // 취소

  const inputHash = await sha256(input);
  const isOwner = inputHash === data.passwordHash;
  const isAdmin = ADMIN_PASSWORD && input === ADMIN_PASSWORD;

  if (!isOwner && !isAdmin) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  try {
    if (data.imagePath) {
      await deleteObject(storageRef(storage, data.imagePath)).catch(() => {});
    }
    await deleteDoc(doc(db, "tributes", id));
  } catch (err) {
    console.error(err);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// --- 목록 렌더링 (실시간) ---
function renderTribute(id, data) {
  const el = document.createElement("article");
  el.className = "tribute";
  el.dataset.id = id;

  const imageHtml = data.imageUrl
    ? `<img class="tribute-image" src="${escapeHtml(data.imageUrl)}" alt="첨부 사진" loading="lazy" />`
    : "";

  el.innerHTML = `
    <div class="tribute-top">
      <span class="tribute-name">${escapeHtml(data.name)}</span>
      <span class="tribute-date">${formatDate(data.createdAt)}</span>
    </div>
    <p class="tribute-message">${escapeHtml(data.message)}</p>
    ${imageHtml}
    <div class="tribute-actions">
      <button type="button" class="delete-btn">삭제</button>
    </div>
  `;

  el.querySelector(".delete-btn").addEventListener("click", () => handleDelete(id, data));
  return el;
}

const q = query(tributesCol, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  listEl.innerHTML = "";
  if (snapshot.empty) {
    listEl.innerHTML = `<p class="empty-state">아직 남겨진 추모의 글이 없습니다.<br>첫 번째 글을 남겨 주세요.</p>`;
    countEl.textContent = "0";
    return;
  }
  countEl.textContent = String(snapshot.size);
  snapshot.forEach((docSnap) => {
    listEl.appendChild(renderTribute(docSnap.id, docSnap.data()));
  });
}, (err) => {
  console.error(err);
  listEl.innerHTML = `<p class="empty-state">글을 불러오지 못했습니다. Firebase 설정을 확인해 주세요.</p>`;
});

if (loadingEl) loadingEl.remove();
