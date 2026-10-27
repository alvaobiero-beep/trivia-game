const QUESTION_TIME = 15;
const GAME_TIME = 90;
const WARNING_AT = 5;

const questions = [
  {
    question: "Which keyword declares a block-scoped variable that can be reassigned?",
    choices: ["var", "let", "const", "static"],
    answer: 1,
  },
  {
    question: "What does Array.prototype.map() return?",
    choices: ["The first match", "A boolean", "A new array", "The original array"],
    answer: 2,
  },
  {
    question: "What is the result of typeof null in JavaScript?",
    choices: ["null", "undefined", "object", "number"],
    answer: 2,
  },
  {
    question: "Which function runs code once after a delay?",
    choices: ["setInterval", "setTimeout", "setImmediate", "requestDelay"],
    answer: 1,
  },
  {
    question: "Which operator checks both value AND type equality?",
    choices: ["==", "=", "===", "!="],
    answer: 2,
  },
  {
    question: "What does JSON.parse() do?",
    choices: [
      "Converts an object to a string",
      "Converts a JSON string to an object",
      "Sorts an array",
      "Validates a URL",
    ],
    answer: 1,
  },
  {
    question: "Which array method keeps only the items that pass a test?",
    choices: ["filter", "reduce", "forEach", "concat"],
    answer: 0,
  },
  {
    question: "What does 'NaN' stand for?",
    choices: ["No add Number", "Not a Number", "New array Node", "Null and None"],
    answer: 1,
  },
];

const byId = (id) => document.getElementById(id);

const els = {
  start: byId("start-screen"),
  quiz: byId("quiz-screen"),
  result: byId("result-screen"),
  startBtn: byId("start-btn"),
  nextBtn: byId("next-btn"),
  restartBtn: byId("restart-btn"),
  progress: byId("progress"),
  questionTimer: byId("question-timer"),
  gameTimer: byId("game-timer"),
  timerBar: byId("timer-bar"),
  questionText: byId("question-text"),
  choices: byId("choices"),
  feedback: byId("feedback"),
  score: byId("score"),
  summary: byId("summary"),
  rating: byId("rating"),
  review: byId("review"),
};

let state = createState();

function createState() {
  return {
    index: 0,
    results: [],
    questionLeft: QUESTION_TIME,
    gameLeft: GAME_TIME,
    intervalId: null,
    locked: false,
  };
}

const labelFor = (index) => String.fromCharCode(65 + index);

function showScreen(target) {
  [els.start, els.quiz, els.result].forEach((screen) => {
    screen.classList.toggle("hidden", screen !== target);
  });
}

function startGame() {
  stopTimer();
  state = createState();
  showScreen(els.quiz);
  renderQuestion();
  startTimer();
}

function renderQuestion() {
  const item = questions[state.index];
  state.questionLeft = Math.min(QUESTION_TIME, state.gameLeft);
  state.locked = false;

  els.progress.textContent = `Question ${state.index + 1} of ${questions.length}`;
  els.questionText.textContent = item.question;
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.nextBtn.classList.add("hidden");

  const buttons = item.choices.map((choice, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";

    const label = document.createElement("span");
    label.className = "choice-label";
    label.textContent = labelFor(i);

    const text = document.createElement("span");
    text.textContent = choice;

    button.append(label, text);
    button.addEventListener("click", () => handleAnswer(i));
    return button;
  });

  els.choices.replaceChildren(...buttons);
  updateTimers();
}

function startTimer() {
  stopTimer();
  state.intervalId = setInterval(tick, 1000);
}

function stopTimer() {
  clearInterval(state.intervalId);
  state.intervalId = null;
}

function tick() {
  state.questionLeft -= 1;
  state.gameLeft -= 1;
  updateTimers();

  if (state.questionLeft <= 0 || state.gameLeft <= 0) {
    handleAnswer(null);
  }
}

function updateTimers() {
  const questionLeft = Math.max(state.questionLeft, 0);
  els.questionTimer.textContent = `${questionLeft}s`;
  els.gameTimer.textContent = `${Math.max(state.gameLeft, 0)}s`;
  els.timerBar.style.width = `${(questionLeft / QUESTION_TIME) * 100}%`;
  els.timerBar.classList.toggle("urgent", questionLeft <= WARNING_AT);
}

function handleAnswer(choiceIndex) {
  if (state.locked) return;
  state.locked = true;
  stopTimer();

  const item = questions[state.index];
  const timedOut = choiceIndex === null;
  const correct = choiceIndex === item.answer;

  state.results.push({
    question: item.question,
    correct,
    status: timedOut ? "timeout" : "answered",
  });

  const buttons = Array.from(els.choices.children);
  buttons.forEach((button, i) => {
    button.disabled = true;
    if (i === item.answer) button.classList.add("correct");
    if (i === choiceIndex && !correct) button.classList.add("wrong");
  });

  const correctText = `${labelFor(item.answer)}) ${item.choices[item.answer]}`;
  if (timedOut) {
    els.feedback.textContent = `Time's up! The correct answer was ${correctText}`;
    els.feedback.classList.add("bad");
  } else if (correct) {
    els.feedback.textContent = "Correct!";
    els.feedback.classList.add("good");
  } else {
    els.feedback.textContent = `Incorrect. The correct answer was ${correctText}`;
    els.feedback.classList.add("bad");
  }

  const isLast = state.index === questions.length - 1 || state.gameLeft <= 0;
  els.nextBtn.textContent = isLast ? "See results" : "Next question";
  els.nextBtn.classList.remove("hidden");
  els.nextBtn.focus();
}

function goNext() {
  const isLast = state.index === questions.length - 1 || state.gameLeft <= 0;
  if (isLast) {
    finishGame();
    return;
  }
  state.index += 1;
  renderQuestion();
  startTimer();
}

function getRating(percent) {
  if (percent === 100) return "Perfect score! You're a JavaScript pro.";
  if (percent >= 70) return "Great job! Solid JavaScript knowledge.";
  if (percent >= 40) return "Not bad. A bit more practice and you'll nail it.";
  return "Keep practicing, you'll get there!";
}

function finishGame() {
  stopTimer();

  const correctCount = state.results.filter((r) => r.correct).length;
  const timedOutCount = state.results.reduce(
    (sum, r) => sum + (r.status === "timeout" ? 1 : 0),
    0
  );
  const notReached = questions.length - state.results.length;
  const percent = Math.round((correctCount / questions.length) * 100);
  const secondsUsed = GAME_TIME - Math.max(state.gameLeft, 0);

  els.score.textContent = `${correctCount} / ${questions.length} (${percent}%)`;

  const details = [`Time used: ${secondsUsed} seconds`];
  if (timedOutCount > 0) details.push(`Timed out on ${timedOutCount} question(s)`);
  if (notReached > 0) details.push(`${notReached} question(s) not reached`);
  els.summary.textContent = details.join(" | ");
  els.rating.textContent = getRating(percent);

  const items = state.results.map((result, i) => {
    const li = document.createElement("li");

    const mark = document.createElement("span");
    mark.className = `mark ${result.correct ? "right" : "missed"}`;
    mark.textContent = result.correct ? "\u2713" : "\u2717";

    const text = document.createElement("span");
    text.textContent = `${i + 1}. ${result.question}`;

    li.append(mark, text);
    return li;
  });
  els.review.replaceChildren(...items);

  showScreen(els.result);
}

document.addEventListener("keydown", (event) => {
  if (els.quiz.classList.contains("hidden") || state.locked) return;
  const key = event.key.toLowerCase();
  const item = questions[state.index];
  const fromLetter = key.charCodeAt(0) - 97;
  const fromNumber = Number(key) - 1;
  const choice = key.length === 1 && fromLetter >= 0 && fromLetter < item.choices.length
    ? fromLetter
    : fromNumber;
  if (Number.isInteger(choice) && choice >= 0 && choice < item.choices.length) {
    handleAnswer(choice);
  }
});

els.startBtn.addEventListener("click", startGame);
els.nextBtn.addEventListener("click", goNext);
els.restartBtn.addEventListener("click", startGame);
