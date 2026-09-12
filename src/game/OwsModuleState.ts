// In-memory progress tracking for the Materi/Pilih Aktivitas/Simulator/Kuis
// flow, shared across those scenes for the lifetime of the page — same
// module-level-singleton pattern as StabilityModuleState.ts. Resets on a
// full reload — no save/localStorage layer, intentionally session-only.
import { unlockNextModuleAfter } from "./ModuleProgress";

/** Kuis MARPOL Annex I must be passed with at least this score before the
 * next module unlocks (Simulator OWS itself has no separate threshold —
 * reaching the simulator's own target IS what "simulatorCompleted" means). */
const QUIZ_PASS_THRESHOLD = 70;

export interface OwsModuleProgress {
    materialCompleted: boolean;
    quizCompleted: boolean;
    quizScore: number;
    quizCorrectAnswers: number;
    quizAnswerResults: boolean[];
    simulatorCompleted: boolean;
}

const progress: OwsModuleProgress = {
    materialCompleted: false,
    quizCompleted: false,
    quizScore: 0,
    quizCorrectAnswers: 0,
    quizAnswerResults: [],
    simulatorCompleted: false,
};

export function getOwsModuleProgress(): OwsModuleProgress {
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

export function setSimulatorProgress(completed: boolean) {
    progress.simulatorCompleted = completed;
    checkFullCompletion();
}

/** The next module only unlocks once both activities are done — Kuis MARPOL
 * Annex I passed at >=70 AND Simulator OWS successfully brought the OCM
 * reading below the discharge limit. Checked after either one finishes, so
 * whichever the student does second is what actually triggers the unlock. */
function checkFullCompletion() {
    if (progress.quizCompleted && progress.quizScore >= QUIZ_PASS_THRESHOLD && progress.simulatorCompleted) {
        unlockNextModuleAfter("simulator-ows");
    }
}
