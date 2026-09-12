// In-memory progress tracking for the Materi/Pilih Aktivitas/Kuis/Simulator
// flow, shared across those scenes for the lifetime of the page (module-level
// singleton, same pattern as BadgeState.ts). Resets on a full reload — no
// save/localStorage layer yet, intentionally session-only.
import { unlockModule } from "./ModuleProgress";

/** Kuis Stabilitas must be passed with at least this score (Simulator
 * Stabilitas has no separate threshold — each case can only be advanced
 * past once it's actually solved correctly, so "simulatorCompleted" already
 * means every case was right). Both are required before "Hasil & Umpan
 * Balik" unlocks. */
const QUIZ_PASS_THRESHOLD = 70;

export interface StabilityModuleProgress {
    materialCompleted: boolean;
    quizCompleted: boolean;
    quizScore: number;
    quizCorrectAnswers: number;
    quizAnswerResults: boolean[];
    simulatorCompleted: boolean;
    simulatorCasesCompleted: number;
}

const progress: StabilityModuleProgress = {
    materialCompleted: false,
    quizCompleted: false,
    quizScore: 0,
    quizCorrectAnswers: 0,
    quizAnswerResults: [],
    simulatorCompleted: false,
    simulatorCasesCompleted: 0,
};

export function getStabilityModuleProgress(): StabilityModuleProgress {
    return progress;
}

export function setMaterialCompleted() {
    progress.materialCompleted = true;
}

export function setQuizResult(correctAnswers: number, answerResults: boolean[]) {
    progress.quizCompleted = true;
    progress.quizCorrectAnswers = correctAnswers;
    progress.quizScore = correctAnswers * 20;
    progress.quizAnswerResults = answerResults;
    checkFullCompletion();
}

export function setSimulatorProgress(casesCompleted: number) {
    progress.simulatorCasesCompleted = casesCompleted;
    if (casesCompleted >= 3) {
        progress.simulatorCompleted = true;
    }
    checkFullCompletion();
}

/** "Hasil & Umpan Balik" only unlocks once both activities are done — Kuis
 * Stabilitas passed at >=70 AND Simulator Stabilitas fully solved. Checked
 * after either one finishes, so whichever the student does second is what
 * actually triggers the unlock. */
function checkFullCompletion() {
    if (progress.quizCompleted && progress.quizScore >= QUIZ_PASS_THRESHOLD && progress.simulatorCompleted) {
        unlockModule("hasil-umpan-balik");
    }
}
