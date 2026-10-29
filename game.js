
"use strict";

const TOTAL_ROUNDS = 10;

const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("end-screen");

const roundLabel = document.getElementById("round-label");
const scoreLabel = document.getElementById("score-label");
const progressBar = document.getElementById("progress-bar");
const questionName = document.getElementById("question-name");

const idfButton = document.getElementById("idf-button");
const telenovelaButton = document.getElementById("telenovela-button");
const answerButtons = [idfButton, telenovelaButton];

const revealPanel = document.getElementById("reveal-panel");
const resultHeading = document.getElementById("result-heading");
const revealImage = document.getElementById("reveal-image");
const revealDescription = document.getElementById("reveal-description");
const nextButton = document.getElementById("next-button");

const finalScore = document.getElementById("final-score");
const finalMessage = document.getElementById("final-message");
const restartButton = document.getElementById("restart-button");

let allQuestions = [];
let gameQuestions = [];
let currentRound = 0;
let score = 0;
let answered = false;

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

async function loadQuestions() {
    idfButton.disabled = true;
    telenovelaButton.disabled = true;
    questionName.textContent = "Loading questions...";

    try {
        const response = await fetch("questions.json");

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const questions = await response.json();

        if (!Array.isArray(questions) ||
            questions.length < TOTAL_ROUNDS) {
            throw new Error("Not enough questions to start the game.");
        }

        const validQuestions = questions.every(question =>
            typeof question.name === "string" &&
            ["IDF", "Telenovela"].includes(question.answer) &&
            typeof question.description === "string" &&
            typeof question.image === "string"
        );

        if (!validQuestions) {
            throw new Error("The question data has an invalid format.");
        }

        allQuestions = questions;
        startGame();
    } catch (error) {
        questionName.textContent = "Unable to load questions.";

        const message = document.createElement("p");
        message.textContent =
            "Please run the game through a local web server or GitHub Pages, " +
            "and check that questions.json is available.";

        gameScreen.appendChild(message);
        console.error(error);
    }
}

function startGame() {
    // Shuffle once and take the first 10 unique entries.
    gameQuestions = shuffle(allQuestions).slice(0, TOTAL_ROUNDS);

    currentRound = 0;
    score = 0;
    answered = false;

    endScreen.hidden = true;
    gameScreen.hidden = false;

    showQuestion();
}

function showQuestion() {
    const question = gameQuestions[currentRound];

    answered = false;

    roundLabel.textContent =
        `Round ${currentRound + 1} of ${TOTAL_ROUNDS}`;

    scoreLabel.textContent = `Score: ${score}`;
    progressBar.style.width =
        `${(currentRound / TOTAL_ROUNDS) * 100}%`;

    questionName.textContent = question.name;

    revealPanel.hidden = true;

    revealImage.hidden = true;
    revealImage.removeAttribute("src");

    resultHeading.textContent = "";
    revealDescription.textContent = "";

    answerButtons.forEach(button => {
        button.disabled = false;
        button.classList.remove("correct", "incorrect");
    });

    nextButton.textContent =
        currentRound === TOTAL_ROUNDS - 1
            ? "See final score"
            : "Next question";
}

function submitAnswer(answer) {
    if (answered) {
        return;
    }

    answered = true;

    const question = gameQuestions[currentRound];
    const isCorrect = answer === question.answer;

    if (isCorrect) {
        score++;
    }

    scoreLabel.textContent = `Score: ${score}`;

    answerButtons.forEach(button => {
        button.disabled = true;
    });

    resultHeading.textContent = isCorrect
        ? "Correct!"
        : `Not quite! The answer is ${question.answer}.`;

    revealDescription.textContent = question.description;

    // Reveal the image, using a fallback if the file is missing.
    revealImage.onerror = () => {
        revealImage.onerror = null;
        revealImage.hidden = true;
        revealImage.removeAttribute("src");
    };

    revealImage.onload = () => {
        revealImage.hidden = false;
    };

    revealImage.src = question.image;

    // If the image is cached, its load event may fire quickly.
    revealPanel.hidden = false;
    progressBar.style.width =
        `${((currentRound + 1) / TOTAL_ROUNDS) * 100}%`;
}

function nextQuestion() {
    if (!answered) {
        return;
    }

    currentRound++;

    if (currentRound >= TOTAL_ROUNDS) {
        showFinalScore();
    } else {
        showQuestion();
    }
}

function showFinalScore() {
    gameScreen.hidden = true;
    endScreen.hidden = false;

    finalScore.textContent = `${score} / ${TOTAL_ROUNDS}`;

    if (score === TOTAL_ROUNDS) {
        finalMessage.textContent =
            "Perfect score! You can distinguish military names from TV drama.";
    } else if (score >= 7) {
        finalMessage.textContent =
            "Impressive! You know your military names and telenovelas.";
    } else if (score >= 4) {
        finalMessage.textContent =
            "Not bad! Some of those names are surprisingly convincing.";
    } else {
        finalMessage.textContent =
            "Plot twist! Better luck next time.";
    }
}

idfButton.addEventListener("click", () => submitAnswer("IDF"));

telenovelaButton.addEventListener("click", () =>
    submitAnswer("Telenovela")
);

nextButton.addEventListener("click", nextQuestion);
restartButton.addEventListener("click", startGame);

loadQuestions();
