import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const STORAGE_KEY = "respraResults";
const NICKNAME_STORAGE_KEY = "respraNickname";
const PLAYER_ID_STORAGE_KEY = "respraPlayerId";
const MAX_HISTORY = 5;
const RANKING_LIMIT = 10;

const firebaseConfig = {
  apiKey: "AIzaSyCqjHOMd2pzvpAgg4M2Gdh1BNE-2zNIktU",
  authDomain: "respra-432b1.firebaseapp.com",
  projectId: "respra-432b1",
  storageBucket: "respra-432b1.firebasestorage.app",
  messagingSenderId: "242153972337",
  appId: "1:242153972337:web:75912dbc593340db8171d0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const targetNumber = document.getElementById("targetNumber");
const entryDisplay = document.getElementById("entryDisplay");
const entryBar = document.getElementById("entryBar");
const clearButton = document.getElementById("clearButton");
const backButton = document.getElementById("backButton");
const goButton = document.getElementById("goButton");
const submitButton = document.getElementById("submitButton");
const nextButton = document.getElementById("nextButton");
const message = document.getElementById("message");
const timer = document.getElementById("timer");
const bestTime = document.getElementById("bestTime");
const historyList = document.getElementById("history");
const confirmScreen = document.getElementById("confirmScreen");
const confirmNumber = document.getElementById("confirmNumber");
const firstDigit = document.getElementById("firstDigit");
const blurredEntry = document.getElementById("blurredEntry");
const numberKeys = document.querySelectorAll("[data-key]");
const nicknameModal = document.getElementById("nicknameModal");
const nicknameInput = document.getElementById("nicknameInput");
const nicknameMessage = document.getElementById("nicknameMessage");
const saveNicknameButton = document.getElementById("saveNicknameButton");
const resultModal = document.getElementById("resultModal");
const resultTime = document.getElementById("resultTime");
const rankingStatus = document.getElementById("rankingStatus");
const rankingList = document.getElementById("rankingList");
const resultNextButton = document.getElementById("resultNextButton");

let answer = "";
let entry = "";
let startTime = 0;
let timerId = 0;
let completed = false;
let results = loadResults();
let nickname = sanitizeNickname(localStorage.getItem(NICKNAME_STORAGE_KEY) || "");
let playerId = getOrCreatePlayerId();

function formatNumber(value) {
  if (!value) {
    return "入力してください";
  }

  return value.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function sanitizeNickname(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 12);
}

function getOrCreatePlayerId() {
  const savedId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);

  if (savedId) {
    return savedId;
  }

  const nextId = crypto.randomUUID
    ? crypto.randomUUID()
    : `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(PLAYER_ID_STORAGE_KEY, nextId);
  return nextId;
}

function isNicknameOpen() {
  return nicknameModal.classList.contains("open");
}

function isResultOpen() {
  return resultModal.classList.contains("open");
}

function generateAnswer() {
  let value = "";

  while (value.length < 9) {
    value += Math.floor(Math.random() * 10);
  }

  return value;
}

function startPractice() {
  answer = generateAnswer();
  entry = "";
  completed = false;
  startTime = performance.now();

  targetNumber.textContent = formatNumber(answer);
  message.textContent = "";
  message.classList.remove("success");
  closeConfirm();
  closeResult();
  updateEntry();
  updateStats();
  renderHistory();

  clearInterval(timerId);
  timerId = window.setInterval(updateTimer, 30);
  updateTimer();
}

function updateEntry() {
  entryDisplay.textContent = formatNumber(entry);
  entryDisplay.classList.toggle("empty", entry.length === 0);
  goButton.classList.toggle("ready", entry.length === 9);
}

function updateTimer() {
  if (completed) {
    return;
  }

  const elapsed = (performance.now() - startTime) / 1000;
  timer.textContent = elapsed.toFixed(2);
}

function pressNumber(value) {
  if (
    completed ||
    confirmScreen.classList.contains("open") ||
    isNicknameOpen() ||
    isResultOpen() ||
    entry.length >= 9
  ) {
    return false;
  }

  entry += value;
  message.textContent = "";
  message.classList.remove("success");
  updateEntry();
  return true;
}

function flashKey(button) {
  button.classList.remove("flash");
  void button.offsetWidth;
  button.classList.add("flash");
}

function deleteOne() {
  if (completed || confirmScreen.classList.contains("open") || isNicknameOpen() || isResultOpen()) {
    return;
  }

  entry = entry.slice(0, -1);
  message.textContent = "";
  updateEntry();
}

function clearEntry() {
  if (completed || confirmScreen.classList.contains("open") || isNicknameOpen() || isResultOpen()) {
    return;
  }

  entry = "";
  message.textContent = "";
  updateEntry();
}

function showError(text) {
  message.textContent = text;
  message.classList.remove("success");
  entryBar.classList.remove("shake");
  void entryBar.offsetWidth;
  entryBar.classList.add("shake");
}

function tryGo() {
  if (completed || confirmScreen.classList.contains("open")) {
    return;
  }

  if (entry.length < 9) {
    showError("9桁入力してください");
    return;
  }

  if (entry !== answer) {
    showError("番号が違います");
    return;
  }

  confirmNumber.textContent = formatNumber(entry);
  firstDigit.textContent = entry.charAt(0);
  blurredEntry.textContent = formatNumber(entry);
  confirmScreen.classList.add("open");
  confirmScreen.setAttribute("aria-hidden", "false");
  submitButton.focus({ preventScroll: true });
}

function closeConfirm() {
  confirmScreen.classList.remove("open");
  confirmScreen.setAttribute("aria-hidden", "true");
}

function submitPractice() {
  if (completed) {
    return;
  }

  completed = true;
  clearInterval(timerId);

  const finalTime = (performance.now() - startTime) / 1000;
  const result = {
    time: Number(finalTime.toFixed(2)),
    number: answer,
    date: new Date().toISOString(),
  };

  results.unshift(result);
  results = results.slice(0, MAX_HISTORY);
  saveResults();
  closeConfirm();

  timer.textContent = result.time.toFixed(2);
  message.textContent = `提出完了 ${result.time.toFixed(2)}秒`;
  message.classList.add("success");
  renderHistory();
  updateStats();
  showResult(result);
  void syncOnlineResult(result);
}

function loadResults() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveResults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function updateStats() {
  if (results.length === 0) {
    bestTime.textContent = "--";
    return;
  }

  const best = Math.min(...results.map((result) => result.time));
  bestTime.textContent = best.toFixed(2);
}

function renderHistory() {
  historyList.innerHTML = "";

  results.forEach((result) => {
    const item = document.createElement("li");
    item.textContent = `${result.time.toFixed(2)}s`;
    historyList.appendChild(item);
  });
}

function showNicknameModal() {
  nicknameInput.value = nickname;
  nicknameMessage.textContent = "ニックネームはランキングに表示されます";
  nicknameMessage.classList.remove("error");
  nicknameModal.classList.add("open");
  nicknameModal.setAttribute("aria-hidden", "false");
  nicknameInput.focus({ preventScroll: true });
}

function closeNicknameModal() {
  nicknameModal.classList.remove("open");
  nicknameModal.setAttribute("aria-hidden", "true");
}

function saveNickname() {
  const nextNickname = sanitizeNickname(nicknameInput.value);

  if (!nextNickname) {
    nicknameMessage.textContent = "ニックネームを入力してください";
    nicknameMessage.classList.add("error");
    return;
  }

  nickname = nextNickname;
  localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
  closeNicknameModal();
  startPractice();
}

function showResult(result) {
  resultTime.textContent = `${result.time.toFixed(2)}秒`;
  rankingStatus.textContent = "ランキング送信中";
  rankingStatus.classList.remove("error");
  renderRankingMessage("読み込み中");
  resultModal.classList.add("open");
  resultModal.setAttribute("aria-hidden", "false");
  resultNextButton.focus({ preventScroll: true });
}

function closeResult() {
  resultModal.classList.remove("open");
  resultModal.setAttribute("aria-hidden", "true");
}

function renderRankingMessage(text) {
  rankingList.innerHTML = "";
  const item = document.createElement("li");
  item.className = "ranking-message";
  item.textContent = text;
  rankingList.appendChild(item);
}

function renderRanking(rows) {
  rankingList.innerHTML = "";

  if (rows.length === 0) {
    renderRankingMessage("まだ記録がありません");
    return;
  }

  rows.forEach((row, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    const name = document.createElement("strong");
    const time = document.createElement("span");

    rank.className = "ranking-rank";
    name.className = "ranking-name";
    time.className = "ranking-time";

    rank.textContent = `${index + 1}`;
    name.textContent = row.nickname || "NO NAME";
    time.textContent = `${Number(row.bestTimeSec).toFixed(2)}s`;

    item.append(rank, name, time);
    rankingList.appendChild(item);
  });
}

async function syncOnlineResult(result) {
  try {
    const timeMs = Math.round(result.time * 1000);
    const scoreRef = doc(db, "scores", playerId);
    const currentScore = await getDoc(scoreRef);
    const previousBestMs = currentScore.exists() ? currentScore.data().bestTimeMs : null;
    const shouldUpdate = previousBestMs === null || timeMs < previousBestMs;

    if (shouldUpdate) {
      await setDoc(scoreRef, {
        nickname,
        bestTimeMs: timeMs,
        bestTimeSec: Number((timeMs / 1000).toFixed(2)),
        updatedAt: serverTimestamp(),
      });
      rankingStatus.textContent = "自己ベスト更新";
    } else {
      rankingStatus.textContent = "";
    }

    await loadRanking();
  } catch (error) {
    console.error(error);
    rankingStatus.textContent = "オンラインランキングを取得できません";
    rankingStatus.classList.add("error");
    renderRankingMessage("通信に失敗しました");
  }
}

async function loadRanking() {
  const rankingQuery = query(
    collection(db, "scores"),
    orderBy("bestTimeMs", "asc"),
    limit(RANKING_LIMIT)
  );
  const rankingSnapshot = await getDocs(rankingQuery);
  const rows = rankingSnapshot.docs.map((rankingDoc) => rankingDoc.data());
  renderRanking(rows);
}

numberKeys.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }

    if (pressNumber(button.dataset.key)) {
      flashKey(button);
    }
  });
});

clearButton.addEventListener("click", clearEntry);
backButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  deleteOne();
});
goButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  tryGo();
});
submitButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  submitPractice();
});
nextButton.addEventListener("click", startPractice);
saveNicknameButton.addEventListener("click", saveNickname);
resultNextButton.addEventListener("click", startPractice);
nicknameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveNickname();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) {
    return;
  }

  if (event.key >= "0" && event.key <= "9") {
    pressNumber(event.key);
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    deleteOne();
    return;
  }

  if (event.key === "Escape") {
    closeConfirm();
    return;
  }

  if (event.key === "Enter") {
    if (isResultOpen()) {
      startPractice();
      return;
    }

    if (confirmScreen.classList.contains("open")) {
      submitPractice();
      return;
    }

    tryGo();
  }
});

if (nickname) {
  startPractice();
} else {
  showNicknameModal();
}
