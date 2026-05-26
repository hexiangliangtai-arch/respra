const STORAGE_KEY = "respraResults";
const MAX_HISTORY = 5;

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

let answer = "";
let entry = "";
let startTime = 0;
let timerId = 0;
let completed = false;
let results = loadResults();

function formatNumber(value) {
  if (!value) {
    return "入力してください";
  }

  return value.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
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
}

function updateTimer() {
  if (completed) {
    return;
  }

  const elapsed = (performance.now() - startTime) / 1000;
  timer.textContent = elapsed.toFixed(2);
}

function pressNumber(value) {
  if (completed || confirmScreen.classList.contains("open") || entry.length >= 9) {
    return;
  }

  entry += value;
  message.textContent = "";
  message.classList.remove("success");
  updateEntry();
}

function deleteOne() {
  if (completed || confirmScreen.classList.contains("open")) {
    return;
  }

  entry = entry.slice(0, -1);
  message.textContent = "";
  updateEntry();
}

function clearEntry() {
  if (completed || confirmScreen.classList.contains("open")) {
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

numberKeys.forEach((button) => {
  button.addEventListener("click", () => pressNumber(button.dataset.key));
});

clearButton.addEventListener("click", clearEntry);
backButton.addEventListener("click", deleteOne);
goButton.addEventListener("click", tryGo);
submitButton.addEventListener("click", submitPractice);
nextButton.addEventListener("click", startPractice);

document.addEventListener("keydown", (event) => {
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
    if (confirmScreen.classList.contains("open")) {
      submitPractice();
      return;
    }

    tryGo();
  }
});

startPractice();
