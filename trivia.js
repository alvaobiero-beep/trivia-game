#!/usr/bin/env node

const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const QUESTION_TIME_LIMIT_MS = 15_000;
const GAME_TIME_LIMIT_MS = 90_000;
const WARNING_BEFORE_MS = 5_000;
const TIMED_OUT = Symbol("timed-out");

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

const toSeconds = (ms) => Math.ceil(ms / 1000);

const labelFor = (index) => String.fromCharCode(65 + index);

function parseChoice(raw, choiceCount) {
  const text = raw.trim().toLowerCase();
  const fromLetter = text.charCodeAt(0) - 97;
  const fromNumber = Number(text) - 1;

  if (text.length === 1 && fromLetter >= 0 && fromLetter < choiceCount) return fromLetter;
  if (Number.isInteger(fromNumber) && fromNumber >= 0 && fromNumber < choiceCount) return fromNumber;
  return null;
}

function displayQuestion(item, position, total) {
  console.log(`\nQuestion ${position} of ${total}`);
  console.log(item.question);
  const lines = item.choices.map((choice, i) => `   ${labelFor(i)}) ${choice}`);
  console.log(lines.join("\n"));
}

async function askQuestion(rl, item, timeLimitMs) {
  const controller = new AbortController();
  const limitTimer = setTimeout(() => controller.abort(), timeLimitMs);
  const warningTimer =
    timeLimitMs > WARNING_BEFORE_MS
      ? setTimeout(
          () => console.log(`\n   ! ${toSeconds(WARNING_BEFORE_MS)} seconds left!`),
          timeLimitMs - WARNING_BEFORE_MS
        )
      : null;

  try {
    console.log(`   (You have ${toSeconds(timeLimitMs)} seconds)`);
    while (true) {
      const raw = await rl.question("Your answer: ", { signal: controller.signal });
      const choice = parseChoice(raw, item.choices.length);
      if (choice !== null) return choice;
      console.log(`   Please enter a letter A-${labelFor(item.choices.length - 1)} or a number 1-${item.choices.length}.`);
    }
  } catch (error) {
    if (error.name === "AbortError") return TIMED_OUT;
    throw error;
  } finally {
    clearTimeout(limitTimer);
    if (warningTimer) clearTimeout(warningTimer);
  }
}

function giveFeedback(item, choice) {
  const correctText = `${labelFor(item.answer)}) ${item.choices[item.answer]}`;
  if (choice === TIMED_OUT) {
    console.log(`\n   Time's up! The correct answer was ${correctText}`);
    return false;
  }
  if (choice === item.answer) {
    console.log("\n   Correct!");
    return true;
  }
  console.log(`\n   Incorrect. The correct answer was ${correctText}`);
  return false;
}

function getRating(percent) {
  if (percent === 100) return "Perfect score! You're a JavaScript pro.";
  if (percent >= 70) return "Great job! Solid JavaScript knowledge.";
  if (percent >= 40) return "Not bad. A bit more practice and you'll nail it.";
  return "Keep practicing, you'll get there!";
}

function showSummary(results, totalQuestions, elapsedMs) {
  const correctCount = results.filter((r) => r.correct).length;
  const timedOutCount = results.reduce((sum, r) => sum + (r.status === "timeout" ? 1 : 0), 0);
  const unanswered = totalQuestions - results.length;
  const percent = Math.round((correctCount / totalQuestions) * 100);

  console.log("\n==============================");
  console.log("          GAME OVER");
  console.log("==============================");
  console.log(`Score:        ${correctCount} / ${totalQuestions} (${percent}%)`);
  console.log(`Time taken:   ${toSeconds(elapsedMs)} seconds`);
  if (timedOutCount > 0) console.log(`Timed out on: ${timedOutCount} question(s)`);
  if (unanswered > 0) console.log(`Not reached:  ${unanswered} question(s) (game time ran out)`);
  console.log(getRating(percent));

  console.log("\nReview:");
  results.forEach((r, i) => {
    const mark = r.correct ? "[x]" : "[ ]";
    console.log(` ${mark} ${i + 1}. ${r.question}`);
  });
}

async function playGame(rl) {
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < questions.length; i++) {
    const remainingMs = GAME_TIME_LIMIT_MS - (Date.now() - startTime);
    if (remainingMs <= 0) {
      console.log("\nThe overall game time has run out!");
      break;
    }

    const item = questions[i];
    displayQuestion(item, i + 1, questions.length);

    const timeLimitMs = Math.min(QUESTION_TIME_LIMIT_MS, remainingMs);
    const choice = await askQuestion(rl, item, timeLimitMs);
    const correct = giveFeedback(item, choice);

    results.push({
      question: item.question,
      correct,
      status: choice === TIMED_OUT ? "timeout" : "answered",
    });
  }

  showSummary(results, questions.length, Date.now() - startTime);
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  rl.on("close", () => {
    console.log("\nThanks for playing. Goodbye!");
    process.exit(0);
  });

  console.log("==============================");
  console.log("   JAVASCRIPT TRIVIA CHALLENGE");
  console.log("==============================");
  console.log(`${questions.length} questions | ${toSeconds(QUESTION_TIME_LIMIT_MS)}s per question | ${toSeconds(GAME_TIME_LIMIT_MS)}s total`);
  console.log("Answer with a letter (A-D) or a number (1-4).");

  let playing = true;
  while (playing) {
    await rl.question("\nPress Enter to start...");
    await playGame(rl);
    const again = await rl.question("\nPlay again? (y/n): ");
    playing = again.trim().toLowerCase().startsWith("y");
  }

  rl.close();
}

main().catch((error) => {
  console.error("Something went wrong:", error.message);
  process.exit(1);
});
