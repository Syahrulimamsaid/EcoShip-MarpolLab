import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import {
    BODY_TEXT,
    BORDER_BLUE,
    DARK_NAVY,
    PRIMARY_BLUE,
    PRIMARY_BLUE_HEX,
    createHeaderBarCard,
} from "../../../component/ModulePanel/ModulePanel";
import { EnterStyleName, playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { BadgeId, unlockBadge } from "../../BadgeState";
import { startQuizBgm, stopQuizBgm } from "../../BgmManager";
import { EventBus } from "../../EventBus";
import { ModuleId, isFinalModule, resetModuleProgress, unlockNextModuleAfter } from "../../ModuleProgress";
import { shuffleQuestions } from "../../QuizShuffle";
import { NILAI_BAIK_THRESHOLD, SFX_KEYS, playSfx, playVoiceSfx } from "../../SfxManager";

export interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
}

export interface QuizConfig {
    title: string;
    questions: QuizQuestion[];
    passScore: number;
    badgeId: BadgeId;
    badgeName: string;
    /** Extra congratulatory popup shown on top of the pass screen once the
     * student passes — used for the cumulative final-evaluation quiz's
     * "you've finished the whole module" moment. */
    perfectScoreMessage?: string;
}

export interface QuizSceneData {
    config: QuizConfig;
    /** Scene key to return to once the quiz has been completed (pass or fail). */
    returnScene: string;
    /** The module this quiz belongs to — finishing the quiz (reaching the
     * result screen, pass or fail) unlocks whatever module comes next. */
    moduleId?: ModuleId;
}

/** Randomizes both question order and each question's option order (so the
 * correct answer isn't always e.g. option A) — a fresh shuffle every time a
 * quiz starts, so memorizing "the 2nd question" or "the 1st option" never
 * pays off across attempts. */
function shuffleQuizConfig(config: QuizConfig): QuizConfig {
    return { ...config, questions: shuffleQuestions(config.questions) };
}

// Authored at a fixed reference resolution and uniformly scaled to fit the
// window, same approach as the other module scenes.
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const CARD_WIDTH = 860;
const CARD_HEIGHT = 640;
const HEADER_HEIGHT = 64;
const CARD_X = DESIGN_WIDTH / 2 - CARD_WIDTH / 2;
const CARD_Y = DESIGN_HEIGHT / 2 - CARD_HEIGHT / 2;
const CONTENT_X = CARD_X + 40;
const CONTENT_WIDTH = CARD_WIDTH - 80;
const BODY_TOP = CARD_Y + HEADER_HEIGHT;

/**
 * A dedicated full-screen quiz scene — deliberately *not* a dismissible
 * modal: while questions are in progress there is no back/close control
 * anywhere on screen, so a student can't skip past the SOP quiz. A way out
 * (retry or return) only appears once every question has been answered.
 */
export class QuizScene extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private bodyContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private quizData!: QuizSceneData;
    private questionIndex = 0;
    private selectedIndex: number | null = null;
    private answered = false;
    private correctCount = 0;

    constructor() {
        super("QuizScene");
    }

    init(data: QuizSceneData) {
        this.quizData = { ...data, config: shuffleQuizConfig(data.config) };
        this.questionIndex = 0;
        this.selectedIndex = null;
        this.answered = false;
        this.correctCount = 0;
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => {
            const chrome = createHeaderBarCard(
                this,
                CARD_X,
                CARD_Y,
                CARD_WIDTH,
                CARD_HEIGHT,
                this.quizData.config.title,
                HEADER_HEIGHT,
            );
            this.root.add(chrome);
        });

        this.bodyContainer = this.add.container(0, 0);
        this.root.add(this.bodyContainer);
        // One group wrapping the container itself (not its contents) — its
        // children change over time (countdown, then each question, then
        // the result screen), but whatever's inside animates in/out
        // together automatically since it's all riding on this one object.
        groups.push([this.bodyContainer]);
        this.transitionGroups = groups;

        this.playCountdown(() => this.renderQuestion());

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);
        startQuizBgm(this);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
            stopQuizBgm();
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private returnToModule() {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(this.quizData.returnScene));
    }

    /** A 3-2-1 countdown shown once, right when the quiz starts, before the
     * first question appears. Lives in bodyContainer so renderQuestion()'s
     * own removeAll() clears it away automatically once the countdown ends. */
    private playCountdown(onComplete: () => void) {
        const centerX = CARD_X + CARD_WIDTH / 2;
        const centerY = BODY_TOP + (CARD_HEIGHT - HEADER_HEIGHT) / 2;
        const STEP_DURATION = 1000;

        const countdownText = this.add
            .text(centerX, centerY - 20, "3", {
                fontFamily: "Arial Black",
                fontSize: 130,
                color: PRIMARY_BLUE_HEX,
            })
            .setOrigin(0.5);
        const hint = this.add
            .text(centerX, centerY + 90, "Kuis akan segera dimulai...", {
                fontFamily: "Arial",
                fontSize: 15,
                color: BODY_TEXT,
            })
            .setOrigin(0.5);
        this.bodyContainer.add([countdownText, hint]);

        let remaining = 3;

        const showNumber = () => {
            countdownText.setText(String(remaining));
            countdownText.setScale(0.3);
            countdownText.setAlpha(0);

            this.tweens.add({
                targets: countdownText,
                scale: 1,
                alpha: 1,
                duration: 240,
                ease: "Back.Out",
            });

            this.time.delayedCall(STEP_DURATION, () => {
                remaining -= 1;
                if (remaining > 0) {
                    showNumber();
                } else {
                    onComplete();
                }
            });
        };

        showNumber();
    }

    /** `animate=false` for the instant same-question recolor when an answer
     * is picked (no entrance tween, just an immediate rebuild) — the
     * component entrance animation is reserved for actually arriving on a
     * question (first load or advancing from the previous one). */
    private renderQuestion(animate = true) {
        const config = this.quizData.config;
        this.bodyContainer.removeAll(true);

        const total = config.questions.length;
        const question = config.questions[this.questionIndex];

        const localGroups: GameObjects.GameObject[][] = [];
        const localStyles: (EnterStyleName | undefined)[] = [];

        let questionText!: GameObjects.Text;
        trackGroup(this.bodyContainer, localGroups, () => {
            const progress = this.add.text(
                CONTENT_X,
                BODY_TOP + 28,
                `SOAL ${this.questionIndex + 1} DARI ${total}`,
                {
                    fontFamily: "Arial Black",
                    fontSize: 13,
                    color: PRIMARY_BLUE_HEX,
                },
            );

            questionText = this.add.text(CONTENT_X, BODY_TOP + 54, question.question, {
                fontFamily: "Arial Black",
                fontSize: 19,
                color: DARK_NAVY,
                wordWrap: { width: CONTENT_WIDTH },
                lineSpacing: 5,
            });

            this.bodyContainer.add([progress, questionText]);
        });
        localStyles.push("down");

        const optionsTop = BODY_TOP + 54 + questionText.height + 30;
        const rowHeight = 52;
        const gap = 14;

        trackGroup(this.bodyContainer, localGroups, () => {
            question.options.forEach((option, index) => {
                const rowY = optionsTop + index * (rowHeight + gap);
                const isCorrectRow = index === question.correctIndex;
                const isPickedRow = index === this.selectedIndex;

                // Feedback is immediate: once answered, the correct option is
                // always shown green, and a wrong pick is shown red right next
                // to it — no need to wait for a "confirm" step to find out.
                let fillColor = 0xffffff;
                let borderColor = BORDER_BLUE;
                let accentColor = PRIMARY_BLUE;
                if (this.answered && isCorrectRow) {
                    fillColor = 0xe3f7ec;
                    borderColor = 0x1f8d52;
                    accentColor = 0x1f8d52;
                } else if (this.answered && isPickedRow) {
                    fillColor = 0xfceaea;
                    borderColor = 0xc0392b;
                    accentColor = 0xc0392b;
                }

                const rowBg = this.add
                    .rectangle(CONTENT_X, rowY, CONTENT_WIDTH, rowHeight, fillColor, 1)
                    .setOrigin(0, 0)
                    .setStrokeStyle(2, borderColor, 1);

                const letterBg = this.add
                    .circle(CONTENT_X + 30, rowY + rowHeight / 2, 16, accentColor, this.answered && (isCorrectRow || isPickedRow) ? 1 : 0.1)
                    .setStrokeStyle(1.5, accentColor, 1);

                const letterText = this.add
                    .text(CONTENT_X + 30, rowY + rowHeight / 2, String.fromCharCode(65 + index), {
                        fontFamily: "Arial Black",
                        fontSize: 14,
                        color: this.answered && (isCorrectRow || isPickedRow) ? "#ffffff" : PRIMARY_BLUE_HEX,
                    })
                    .setOrigin(0.5);

                const optionText = this.add
                    .text(CONTENT_X + 60, rowY + rowHeight / 2, option, {
                        fontFamily: "Arial",
                        fontSize: 15,
                        color: DARK_NAVY,
                        wordWrap: { width: CONTENT_WIDTH - 80 },
                    })
                    .setOrigin(0, 0.5);

                if (!this.answered) {
                    rowBg.setInteractive({ useHandCursor: true });
                    rowBg.on("pointerdown", () => {
                        this.selectedIndex = index;
                        this.answered = true;
                        if (index === question.correctIndex) {
                            this.correctCount += 1;
                            playSfx(this, SFX_KEYS.quizCorrect);
                        } else {
                            playSfx(this, SFX_KEYS.quizWrong);
                        }
                        this.renderQuestion(false);
                    });
                }

                this.bodyContainer.add([rowBg, letterBg, letterText, optionText]);
            });
        });
        localStyles.push("up");

        const isLast = this.questionIndex === total - 1;
        const buttonWidth = 160;
        const buttonHeight = 46;
        const buttonX = CARD_X + CARD_WIDTH - 36 - buttonWidth;
        // Anchored to the actual options bottom (not a fixed offset from the
        // card's bottom edge) so a longer, wrapped question never pushes the
        // option rows down into the button.
        const optionsBottom = optionsTop + question.options.length * (rowHeight + gap) - gap;
        const buttonY = optionsBottom + 28;
        const isEnabled = this.answered;

        trackGroup(this.bodyContainer, localGroups, () => {
            const nextButton = new Button(this, {
                x: buttonX + buttonWidth / 2,
                y: buttonY + buttonHeight / 2,
                width: buttonWidth,
                height: buttonHeight,
                text: isLast ? "Selesai" : "Berikutnya",
                fontSize: 15,
                borderRadius: 12,
                disabled: !isEnabled,
                fillColor: isEnabled ? PRIMARY_BLUE : 0xe2e8f0,
                strokeAlpha: 0,
                textColor: isEnabled ? "#ffffff" : "#94a3b8",
            });
            nextButton.on("pointerdown", () => this.confirmAnswer());

            this.bodyContainer.add(nextButton.view);
        });
        localStyles.push("right");

        if (animate) {
            playSceneEnter(this, localGroups, localStyles);
        }
    }

    /** Fades + slides the current bodyContainer content out before handing
     * off to `build` (a new question or the result screen) — used only for
     * genuine page-to-page moves, not the instant recolor when an answer is
     * picked, which stays snappy. */
    private transitionBody(build: () => void) {
        const outgoing = [...this.bodyContainer.list] as GameObjects.GameObject[];
        if (outgoing.length === 0) {
            build();
            return;
        }

        this.tweens.add({
            targets: outgoing,
            alpha: 0,
            y: "+=18",
            duration: 160,
            ease: "Quad.In",
            onComplete: () => {
                this.bodyContainer.removeAll(true);
                build();
            },
        });
    }

    private confirmAnswer() {
        // Scoring already happened the moment the option was picked (see
        // renderQuestion) so the correct/wrong colors can appear instantly —
        // this just advances once the student has seen that feedback.
        if (!this.answered) {
            return;
        }

        const config = this.quizData.config;
        if (this.questionIndex < config.questions.length - 1) {
            this.questionIndex += 1;
            this.selectedIndex = null;
            this.answered = false;
            this.transitionBody(() => this.renderQuestion());
        } else {
            this.transitionBody(() => this.renderResult());
        }
    }

    private renderResult() {
        const config = this.quizData.config;
        this.bodyContainer.removeAll(true);

        const total = config.questions.length;
        const passed = this.correctCount >= config.passScore;
        const scoreValue = Math.round((this.correctCount / total) * 100);
        const centerX = CARD_X + CARD_WIDTH / 2;

        playVoiceSfx(this, scoreValue >= NILAI_BAIK_THRESHOLD ? SFX_KEYS.nilaiBaik : SFX_KEYS.nilaiKurang);

        // Only a full pass unlocks the next module — getting even one
        // question wrong must not open it (e.g. Simulator Stabilitas stays
        // locked unless every SOP question is answered correctly).
        if (this.quizData.moduleId && passed) {
            if (isFinalModule(this.quizData.moduleId)) {
                // Finishing the very last module resets the unlock cookie
                // back to its initial state — the next page refresh starts
                // the whole module chain over from scratch.
                resetModuleProgress();
            } else {
                unlockNextModuleAfter(this.quizData.moduleId);
            }
        }

        if (passed) {
            unlockBadge(config.badgeId);
        }

        // A perfect score on a quiz with perfectScoreMessage set (currently
        // just the cumulative final-evaluation quiz) gets its own single
        // dedicated screen instead of layering a "you passed" screen and a
        // celebratory popup on top of each other.
        if (passed && config.perfectScoreMessage) {
            this.renderPerfectScoreResult(config.perfectScoreMessage);
            return;
        }

        const localGroups: GameObjects.GameObject[][] = [];
        const localStyles: (EnterStyleName | undefined)[] = [];

        trackGroup(this.bodyContainer, localGroups, () => {
            const scoreNumber = this.add
                .text(centerX, BODY_TOP + 30, `${scoreValue} / 100`, {
                    fontFamily: "Arial Black",
                    fontSize: 32,
                    color: PRIMARY_BLUE_HEX,
                })
                .setOrigin(0.5);
            this.bodyContainer.add(scoreNumber);
        });
        localStyles.push("down");

        trackGroup(this.bodyContainer, localGroups, () => {
            const icon = this.add
                .text(centerX, BODY_TOP + 90, passed ? "✅" : "⚠️", {
                    fontFamily: "Arial",
                    fontSize: 40,
                })
                .setOrigin(0.5);
            this.bodyContainer.add(icon);
        });
        localStyles.push("bounce");

        trackGroup(this.bodyContainer, localGroups, () => {
            const title = this.add
                .text(centerX, BODY_TOP + 158, passed ? "Selamat!" : "Belum Berhasil", {
                    fontFamily: "Arial Black",
                    fontSize: 24,
                    color: passed ? "#1f8d52" : "#c0392b",
                })
                .setOrigin(0.5);

            const scoreText = this.add
                .text(centerX, BODY_TOP + 198, `Anda menjawab ${this.correctCount} dari ${total} soal dengan benar.`, {
                    fontFamily: "Arial",
                    fontSize: 15,
                    color: BODY_TEXT,
                    align: "center",
                    wordWrap: { width: CONTENT_WIDTH },
                })
                .setOrigin(0.5, 0);

            this.bodyContainer.add([title, scoreText]);
        });
        localStyles.push("up");

        const buttonWidth = 220;
        const buttonHeight = 48;
        const buttonY = BODY_TOP + 276;

        if (passed) {
            trackGroup(this.bodyContainer, localGroups, () => {
                const badgeLine = this.add
                    .text(centerX, BODY_TOP + 238, `Lencana "${config.badgeName}" berhasil diklaim!`, {
                        fontFamily: "Arial Black",
                        fontSize: 15,
                        color: PRIMARY_BLUE_HEX,
                        align: "center",
                        wordWrap: { width: CONTENT_WIDTH },
                    })
                    .setOrigin(0.5, 0);
                this.bodyContainer.add(badgeLine);
            });
            localStyles.push("left");

            trackGroup(this.bodyContainer, localGroups, () => {
                const returnButton = new Button(this, {
                    x: centerX,
                    y: buttonY + buttonHeight / 2,
                    width: buttonWidth,
                    height: buttonHeight,
                    text: "Kembali ke Modul",
                    fontSize: 15,
                    borderRadius: 12,
                    fillColor: PRIMARY_BLUE,
                    strokeAlpha: 0,
                    textColor: "#ffffff",
                });
                returnButton.on("pointerdown", () => this.returnToModule());
                this.bodyContainer.add(returnButton.view);
            });
            localStyles.push("right");
        } else {
            trackGroup(this.bodyContainer, localGroups, () => {
                const hint = this.add
                    .text(
                        centerX,
                        BODY_TOP + 238,
                        `Diperlukan minimal ${config.passScore} dari ${total} jawaban benar untuk klaim lencana.`,
                        {
                            fontFamily: "Arial",
                            fontSize: 14,
                            color: BODY_TEXT,
                            align: "center",
                            wordWrap: { width: CONTENT_WIDTH },
                        },
                    )
                    .setOrigin(0.5, 0);
                this.bodyContainer.add(hint);
            });
            localStyles.push("left");

            trackGroup(this.bodyContainer, localGroups, () => {
                const gap = 12;
                const retryButton = new Button(this, {
                    x: centerX - buttonWidth / 2 - gap / 2,
                    y: buttonY + buttonHeight / 2,
                    width: buttonWidth,
                    height: buttonHeight,
                    text: "Coba Lagi",
                    fontSize: 15,
                    borderRadius: 12,
                    fillColor: PRIMARY_BLUE,
                    strokeAlpha: 0,
                    textColor: "#ffffff",
                });
                retryButton.on("pointerdown", () => {
                    this.transitionBody(() => {
                        this.questionIndex = 0;
                        this.selectedIndex = null;
                        this.answered = false;
                        this.correctCount = 0;
                        this.renderQuestion();
                    });
                });

                const returnButton = new Button(this, {
                    x: centerX + buttonWidth / 2 + gap / 2,
                    y: buttonY + buttonHeight / 2,
                    width: buttonWidth,
                    height: buttonHeight,
                    text: "Kembali ke Modul",
                    fontSize: 14,
                    borderRadius: 12,
                    fillColor: 0xffffff,
                    strokeColor: PRIMARY_BLUE,
                    strokeAlpha: 1,
                    textColor: PRIMARY_BLUE_HEX,
                });
                returnButton.on("pointerdown", () => this.returnToModule());

                this.bodyContainer.add([retryButton.view, returnButton.view]);
            });
            localStyles.push("right");
        }

        playSceneEnter(this, localGroups, localStyles);
    }

    /** The perfect-score result screen for a quiz with perfectScoreMessage
     * set — one dedicated page (trophy, congratulatory message, badge line,
     * single "Selesai" button) rather than the normal pass screen with a
     * popup stacked on top of it. */
    private renderPerfectScoreResult(message: string) {
        const config = this.quizData.config;
        const centerX = CARD_X + CARD_WIDTH / 2;
        const centerY = BODY_TOP + (CARD_HEIGHT - HEADER_HEIGHT) / 2;

        const localGroups: GameObjects.GameObject[][] = [];
        const localStyles: (EnterStyleName | undefined)[] = [];

        trackGroup(this.bodyContainer, localGroups, () => {
            const icon = this.add
                .text(centerX, centerY - 150, "🏆", { fontFamily: "Arial", fontSize: 64 })
                .setOrigin(0.5);
            this.bodyContainer.add(icon);
        });
        localStyles.push("bounce");

        trackGroup(this.bodyContainer, localGroups, () => {
            const text = this.add
                .text(centerX, centerY - 60, message, {
                    fontFamily: "Arial Black",
                    fontSize: 22,
                    color: "#1f8d52",
                    align: "center",
                    lineSpacing: 10,
                    wordWrap: { width: CONTENT_WIDTH },
                })
                .setOrigin(0.5);

            const badgeLine = this.add
                .text(centerX, centerY + 30, `Lencana "${config.badgeName}" berhasil diklaim!`, {
                    fontFamily: "Arial Black",
                    fontSize: 15,
                    color: PRIMARY_BLUE_HEX,
                    align: "center",
                    wordWrap: { width: CONTENT_WIDTH },
                })
                .setOrigin(0.5);

            this.bodyContainer.add([text, badgeLine]);
        });
        localStyles.push("down");

        trackGroup(this.bodyContainer, localGroups, () => {
            const buttonWidth = 240;
            const buttonHeight = 52;
            const buttonY = centerY + 110;

            const button = new Button(this, {
                x: centerX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: "Selesai",
                fontSize: 16,
                borderRadius: 14,
                fillColor: PRIMARY_BLUE,
                strokeAlpha: 0,
                textColor: "#ffffff",
            });
            button.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.returnToModule();
            });

            this.bodyContainer.add(button.view);
        });
        localStyles.push("up");

        playSceneEnter(this, localGroups, localStyles);
    }

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        this.root.setPosition(
            (width - DESIGN_WIDTH * scale) / 2,
            (height - DESIGN_HEIGHT * scale) / 2,
        );
    }
}
