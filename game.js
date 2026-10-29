
"use strict";

const TOTAL_ROUNDS = 10;
const LANGUAGE_STORAGE_KEY = "language";
const SUPPORTED_LANGUAGES = ["en", "pt-BR"];

let language = getSavedLanguage();
let translations = {};

function getSavedLanguage() {
    try {
        const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        return SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : "en";
    } catch (error) {
        return "en";
    }
}

function setLanguage(nextLanguage) {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) {
        return;
    }

    language = nextLanguage;
    document.documentElement.lang = language;

    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
        // The game can still be used when storage is unavailable.
    }

    document.querySelectorAll(".language-selector button").forEach(button => {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.lang === language)
        );
    });
}

function translate(key, parameters = {}) {
    let text = translations[key] || key;

    Object.entries(parameters).forEach(([name, value]) => {
        text = text.replace(`{${name}}`, value);
    });

    return text;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(element => {
        const parameters = element.dataset.i18nParams
            ? JSON.parse(element.dataset.i18nParams)
            : {};
        element.textContent = translate(element.dataset.i18n, parameters);
    });

    document.title = translate("gameTitle");
    document.querySelector(".language-selector").setAttribute(
        "aria-label",
        translate("languageLabel")
    );
}

async function loadTranslations() {
    const response = await fetch(`locales/${language}.json`);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    translations = await response.json();
    applyTranslations();
}

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

function getLocalizedText(value) {
    if (typeof value === "string") {
        return value;
    }

    return value[language] || value.en || Object.values(value)[0];
}

async function loadQuestions() {
    idfButton.disabled = true;
    telenovelaButton.disabled = true;
    questionName.textContent = translate("loadingQuestions");

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
            question.name && typeof question.name === "object" &&
            ["IDF", "Telenovela"].includes(question.answer) &&
            question.description && typeof question.description === "object" &&
            typeof question.image === "string"
        );

        if (!validQuestions) {
            throw new Error("The question data has an invalid format.");
        }

        allQuestions = questions;
        startGame();
    } catch (error) {
        questionName.textContent = translate("loadingError");

        const message = document.createElement("p");
        message.textContent = translate("loadingErrorHelp");

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
        translate("roundLabel", {
            current: currentRound + 1,
            total: TOTAL_ROUNDS
        });

    scoreLabel.textContent = translate("scoreLabel", { score });
    progressBar.style.width =
        `${(currentRound / TOTAL_ROUNDS) * 100}%`;

    questionName.textContent = getLocalizedText(question.name);

    revealPanel.hidden = true;

    revealImage.hidden = true;
    revealImage.removeAttribute("src");

    resultHeading.textContent = "";
    revealDescription.textContent = "";

    answerButtons.forEach(button => {
        button.disabled = false;
        button.classList.remove("correct", "incorrect");
    });

    nextButton.textContent = translate(
        currentRound === TOTAL_ROUNDS - 1 ? "seeFinalScore" : "nextQuestion"
    );
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

    scoreLabel.textContent = translate("scoreLabel", { score });

    answerButtons.forEach(button => {
        button.disabled = true;
    });

    resultHeading.textContent = isCorrect
        ? translate("correct")
        : translate("incorrect", {
            answer: translate(
                question.answer === "IDF" ? "answerIdf" : "answerTelenovela"
            )
        });

    revealDescription.textContent = getLocalizedText(question.description);

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

    finalScore.textContent = translate("finalScore", {
        score,
        total: TOTAL_ROUNDS
    });

    if (score === TOTAL_ROUNDS) {
        finalMessage.textContent = translate("perfectScore");
    } else if (score >= 7) {
        finalMessage.textContent = translate("goodScore");
    } else if (score >= 4) {
        finalMessage.textContent = translate("averageScore");
    } else {
        finalMessage.textContent = translate("lowScore");
    }
}

idfButton.addEventListener("click", () => submitAnswer("IDF"));

telenovelaButton.addEventListener("click", () =>
    submitAnswer("Telenovela")
);

nextButton.addEventListener("click", nextQuestion);
restartButton.addEventListener("click", startGame);

document.querySelectorAll(".language-selector button").forEach(button => {
    button.addEventListener("click", async () => {
        setLanguage(button.dataset.lang);

        try {
            await loadTranslations();
        } catch (error) {
            console.error(error);
        }
    });
});

setLanguage(language);
loadTranslations()
    .catch(error => console.error(error))
    .finally(loadQuestions);
