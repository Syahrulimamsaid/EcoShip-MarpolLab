import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { createStepDots } from "../../../component/StepDots/StepDots";
import { startQuizBgm, stopQuizBgm } from "../../BgmManager";
import { EventBus } from "../../EventBus";
import { shuffleQuestions } from "../../QuizShuffle";
import { getOwsModuleProgress, setQuizResult } from "../../OwsModuleState";
import { NILAI_BAIK_THRESHOLD, SFX_KEYS, playSfx, playVoiceSfx } from "../../SfxManager";
import { OWS_QUIZ_QUESTIONS } from "./OwsQuizData";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;
const TOTAL_QUESTIONS = OWS_QUIZ_QUESTIONS.length;

const CARD_WIDTH = 900;
const CARD_Y = 290;
// A floor, not a fixed height — the card is redrawn to fit whatever content
// (pembahasan panel, result checklist, the optional CTA) is actually on
// screen each render, so a button can never end up hanging outside it.
const MIN_CARD_HEIGHT = 520;
const MAX_CARD_BOTTOM = DESIGN_HEIGHT - 40;
const CARD_X = (DESIGN_WIDTH - CARD_WIDTH) / 2;
const CONTENT_X = CARD_X + 40;
const CONTENT_WIDTH = CARD_WIDTH - 80;

const GREEN_HEX = "#1f8d52";
const RED_HEX = "#c0392b";

/**
 * Kuis MARPOL Annex I — a dedicated quiz scene (structurally a twin of
 * StabilitasQuiz, not the generic QuizScene): picking an option immediately
 * reveals correct/incorrect plus a pembahasan panel, and the result screen
 * has a per-question review checklist plus a cross-link to whichever OWS
 * activity isn't done yet.
 */
export class OwsQuiz extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private bodyContainer!: GameObjects.Container;
    private cardBg!: GameObjects.Graphics;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private stepLabelText!: GameObjects.Text;
    private stepDotsGroup!: GameObjects.Container;

    private questions = OWS_QUIZ_QUESTIONS;
    private questionIndex = 0;
    private selectedIndex: number | null = null;
    private checked = false;
    private answers: number[] = [];
    private correctFlags: boolean[] = [];

    constructor() {
        super("OwsQuiz");
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        this.questions = shuffleQuestions(OWS_QUIZ_QUESTIONS);
        this.questionIndex = 0;
        this.selectedIndex = null;
        this.checked = false;
        this.answers = [];
        this.correctFlags = [];

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildStepIndicator());
        trackGroup(this.root, groups, () => this.buildCardChrome());

        this.bodyContainer = this.add.container(0, 0);
        this.root.add(this.bodyContainer);
        groups.push([this.bodyContainer]);
        this.transitionGroups = groups;

        this.renderQuestion();

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

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    // ---- Header / chrome ------------------------------------------------------

    private buildHeader() {
        const header = new ModuleHeader(this, {
            x: MARGIN,
            badgeLabel: "MODUL SIMULATOR OWS",
            breadcrumbLabel: "Kuis MARPOL Annex I",
            heading: "KUIS MARPOL ANNEX I",
            subtitle: "Jawab 5 soal untuk menguji pemahamanmu tentang pencegahan pencemaran minyak dari kapal.",
            onBack: () => this.goTo("PilihAktivitasOws"),
        });
        this.root.add(header.view);
    }

    private buildStepIndicator() {
        this.stepLabelText = this.add.text(MARGIN, 262, `SOAL 1 / ${TOTAL_QUESTIONS}`, {
            fontFamily: "Arial Black",
            fontSize: 15,
            color: PRIMARY_BLUE_HEX,
        });
        this.stepDotsGroup = this.add.container(0, 0);
        this.root.add([this.stepLabelText, this.stepDotsGroup]);
    }

    private updateStepIndicator() {
        const onResult = this.questionIndex >= TOTAL_QUESTIONS;
        this.stepLabelText.setVisible(!onResult);
        this.stepDotsGroup.setVisible(!onResult);
        if (onResult) return;

        this.stepLabelText.setText(`SOAL ${this.questionIndex + 1} / ${TOTAL_QUESTIONS}`);
        this.stepDotsGroup.removeAll(true);
        this.stepDotsGroup.add(createStepDots(this, MARGIN + 130, 269, TOTAL_QUESTIONS, this.questionIndex + 1));
    }

    private buildCardChrome() {
        // Left empty — redrawCard() fills it in once each render knows its
        // own content height.
        this.cardBg = this.add.graphics();
        this.root.add(this.cardBg);
        this.redrawCard(CARD_Y + MIN_CARD_HEIGHT);
    }

    /** Redraws the card background so its bottom edge sits just past
     * `contentBottom` — called at the end of every render once the actual
     * height of that render's content (pembahasan panel, result checklist,
     * optional CTA, ...) is known, so nothing ever hangs outside the card. */
    private redrawCard(contentBottom: number) {
        const bottom = Math.min(Math.max(contentBottom + 30, CARD_Y + MIN_CARD_HEIGHT), MAX_CARD_BOTTOM);
        const height = bottom - CARD_Y;

        this.cardBg.clear();
        this.cardBg.fillStyle(0xffffff, 1);
        this.cardBg.fillRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, height, 20);
        this.cardBg.lineStyle(2, BORDER_BLUE, 1);
        this.cardBg.strokeRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, height, 20);
    }

    // ---- Question -----------------------------------------------------------------

    private renderQuestion() {
        this.bodyContainer.removeAll(true);
        this.updateStepIndicator();

        const question = this.questions[this.questionIndex];
        const top = CARD_Y + 30;

        const questionText = this.add.text(CONTENT_X, top, question.question, {
            fontFamily: "Arial Black",
            fontSize: 17,
            color: DARK_NAVY,
            lineSpacing: 5,
            wordWrap: { width: CONTENT_WIDTH },
        });
        this.bodyContainer.add(questionText);

        const optionsTop = questionText.y + questionText.height + 22;
        const rowHeight = 48;
        const rowGap = 12;

        question.options.forEach((option, index) => {
            const rowY = optionsTop + index * (rowHeight + rowGap);
            const isPicked = index === this.selectedIndex;
            const isCorrectRow = index === question.correctIndex;

            // Picking a row both selects and checks it in the same click
            // (see selectAndCheck), so "picked" and "checked" are always in
            // sync — there's no separate selected-but-unconfirmed look.
            let fillColor = 0xffffff;
            let borderColor = BORDER_BLUE;
            let accentColor = PRIMARY_BLUE;
            if (this.checked && isCorrectRow) {
                fillColor = 0xe3f7ec;
                borderColor = 0x1f8d52;
                accentColor = 0x1f8d52;
            } else if (this.checked && isPicked) {
                fillColor = 0xfceaea;
                borderColor = 0xc0392b;
                accentColor = 0xc0392b;
            }

            const rowBg = this.add
                .rectangle(CONTENT_X, rowY, CONTENT_WIDTH, rowHeight, fillColor, 1)
                .setOrigin(0, 0)
                .setStrokeStyle(2, borderColor, 1);

            const highlight = isPicked || (this.checked && isCorrectRow);
            const letterBg = this.add
                .circle(CONTENT_X + 28, rowY + rowHeight / 2, 15, accentColor, highlight ? 1 : 0.1)
                .setStrokeStyle(1.5, accentColor, 1);
            const letterText = this.add
                .text(CONTENT_X + 28, rowY + rowHeight / 2, String.fromCharCode(65 + index), {
                    fontFamily: "Arial Black",
                    fontSize: 13,
                    color: highlight ? "#ffffff" : PRIMARY_BLUE_HEX,
                })
                .setOrigin(0.5);
            const optionText = this.add
                .text(CONTENT_X + 56, rowY + rowHeight / 2, option, {
                    fontFamily: "Arial",
                    fontSize: 14,
                    color: DARK_NAVY,
                    wordWrap: { width: CONTENT_WIDTH - 76 },
                })
                .setOrigin(0, 0.5);

            if (!this.checked) {
                rowBg.setInteractive({ useHandCursor: true });
                rowBg.on("pointerdown", () => this.selectAndCheck(index));
            }

            this.bodyContainer.add([rowBg, letterBg, letterText, optionText]);
        });

        const optionsBottom = optionsTop + question.options.length * (rowHeight + rowGap) - rowGap;

        if (!this.checked) {
            this.redrawCard(optionsBottom);
            return;
        }

        const isCorrect = this.selectedIndex === question.correctIndex;
        const bannerY = optionsBottom + 18;
        const banner = this.add.text(CONTENT_X, bannerY, isCorrect ? "✓ JAWABAN TEPAT" : "✕ JAWABAN BELUM TEPAT", {
            fontFamily: "Arial Black",
            fontSize: 15,
            color: isCorrect ? GREEN_HEX : RED_HEX,
        });
        this.bodyContainer.add(banner);

        const panelY = banner.y + banner.height + 12;
        const panelHeader = this.add.text(CONTENT_X + 16, panelY + 12, "PEMBAHASAN", {
            fontFamily: "Arial Black",
            fontSize: 12,
            color: PRIMARY_BLUE_HEX,
        });
        const panelBody = this.add.text(CONTENT_X + 16, panelHeader.y + panelHeader.height + 6, question.pembahasan, {
            fontFamily: "Arial",
            fontSize: 12,
            color: BODY_TEXT,
            lineSpacing: 4,
            wordWrap: { width: CONTENT_WIDTH - 32 },
        });
        const panelHeight = panelBody.y + panelBody.height - panelY + 14;

        const panelBg = this.add.graphics();
        panelBg.fillStyle(0xf3f7fe, 1);
        panelBg.fillRoundedRect(CONTENT_X, panelY, CONTENT_WIDTH, panelHeight, 10);
        panelBg.lineStyle(1.5, BORDER_BLUE, 1);
        panelBg.strokeRoundedRect(CONTENT_X, panelY, CONTENT_WIDTH, panelHeight, 10);
        this.bodyContainer.add(panelBg);
        this.bodyContainer.add([panelHeader, panelBody]);

        const feedbackBottom = panelY + panelHeight;
        const buttonBottom = this.buildActionButton(feedbackBottom + 26);
        this.redrawCard(buttonBottom);
    }

    private buildActionButton(y: number): number {
        const isLast = this.questionIndex === TOTAL_QUESTIONS - 1;

        const buttonWidth = 240;
        const buttonHeight = 48;
        const buttonX = CARD_X + CARD_WIDTH - 36 - buttonWidth;

        const button = new Button(this, {
            x: buttonX + buttonWidth / 2,
            y: y + buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            text: isLast ? "LIHAT HASIL →" : "SOAL BERIKUTNYA →",
            fontSize: 14,
            borderRadius: 12,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        button.on("pointerdown", () => this.nextQuestion());
        this.bodyContainer.add(button.view);

        return y + buttonHeight;
    }

    /** Picking an option immediately reveals correct/incorrect — there's no
     * separate confirm step. */
    private selectAndCheck(index: number) {
        if (this.checked) return;
        this.selectedIndex = index;
        this.checked = true;

        const question = this.questions[this.questionIndex];
        const isCorrect = index === question.correctIndex;
        this.answers[this.questionIndex] = index;
        this.correctFlags[this.questionIndex] = isCorrect;
        playSfx(this, isCorrect ? SFX_KEYS.quizCorrect : SFX_KEYS.quizWrong);
        this.renderQuestion();
    }

    private nextQuestion() {
        playSfx(this, SFX_KEYS.click);
        if (this.questionIndex < TOTAL_QUESTIONS - 1) {
            this.questionIndex += 1;
            this.selectedIndex = null;
            this.checked = false;
            this.renderQuestion();
        } else {
            this.renderResult();
        }
    }

    private retryQuiz() {
        playSfx(this, SFX_KEYS.click);
        this.questions = shuffleQuestions(OWS_QUIZ_QUESTIONS);
        this.questionIndex = 0;
        this.selectedIndex = null;
        this.checked = false;
        this.answers = [];
        this.correctFlags = [];
        this.renderQuestion();
    }

    // ---- Result ---------------------------------------------------------------

    private renderResult() {
        this.bodyContainer.removeAll(true);
        this.updateStepIndicator();

        const correctCount = this.correctFlags.filter(Boolean).length;
        const score = correctCount * 20;
        setQuizResult(correctCount, [...this.correctFlags]);
        playVoiceSfx(this, score >= NILAI_BAIK_THRESHOLD ? SFX_KEYS.nilaiBaik : SFX_KEYS.nilaiKurang);

        const centerX = CARD_X + CARD_WIDTH / 2;
        const scoreText = this.add
            .text(centerX, CARD_Y + 50, `${score} / 100`, { fontFamily: "Arial Black", fontSize: 40, color: PRIMARY_BLUE_HEX })
            .setOrigin(0.5);
        const correctText = this.add
            .text(centerX, CARD_Y + 100, `${correctCount} / ${TOTAL_QUESTIONS} JAWABAN BENAR`, {
                fontFamily: "Arial Black",
                fontSize: 15,
                color: DARK_NAVY,
            })
            .setOrigin(0.5);
        this.bodyContainer.add([scoreText, correctText]);

        const listTop = CARD_Y + 150;
        const rowHeight = 30;
        this.correctFlags.forEach((isCorrect, index) => {
            const rowY = listTop + index * rowHeight;
            const mark = this.add.text(centerX - 120, rowY, isCorrect ? "✓" : "✕", {
                fontFamily: "Arial Black",
                fontSize: 14,
                color: isCorrect ? GREEN_HEX : RED_HEX,
            });
            const label = this.add.text(centerX - 90, rowY, `Soal ${index + 1}`, {
                fontFamily: "Arial",
                fontSize: 14,
                color: DARK_NAVY,
            });
            this.bodyContainer.add([mark, label]);
        });

        const progress = getOwsModuleProgress();
        const needsSimulatorCta = !progress.simulatorCompleted;

        let contentBottom = listTop + TOTAL_QUESTIONS * rowHeight;

        // Mission-complete flavor: only shown once BOTH the simulator's
        // target and this quiz have actually been cleared — mirrors the
        // reference brief's "correct answer unlocks the discharge valve"
        // beat as a closing line rather than a separate success scene.
        if (!needsSimulatorCta && score >= NILAI_BAIK_THRESHOLD) {
            const successY = contentBottom + 20;
            const successBanner = this.add
                .text(centerX, successY, "🔓 Katup buang otomatis terbuka — air terbuang dengan aman ke laut.", {
                    fontFamily: "Arial Black",
                    fontSize: 13,
                    color: GREEN_HEX,
                    align: "center",
                    wordWrap: { width: CONTENT_WIDTH },
                })
                .setOrigin(0.5);
            this.bodyContainer.add(successBanner);
            contentBottom = successBanner.y + successBanner.height;
        }

        const buttonWidth = 220;
        const buttonHeight = 48;
        const buttonsTop = contentBottom + 30;
        const gap = 16;
        // The two-button row spans [centerX - buttonWidth - gap/2, centerX + buttonWidth + gap/2]
        // — the CTA below is sized to that exact same span so its edges line up precisely.
        const rowSpan = buttonWidth * 2 + gap;

        const retryButton = new Button(this, {
            x: centerX - buttonWidth / 2 - gap / 2,
            y: buttonsTop + buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            text: "ULANGI KUIS",
            fontSize: 14,
            borderRadius: 12,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        retryButton.on("pointerdown", () => this.retryQuiz());

        const returnButton = new Button(this, {
            x: centerX + buttonWidth / 2 + gap / 2,
            y: buttonsTop + buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            text: "KEMBALI KE PILIH AKTIVITAS",
            fontSize: 12,
            borderRadius: 12,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
            wordWrapWidth: buttonWidth - 24,
        });
        returnButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("PilihAktivitasOws");
        });

        this.bodyContainer.add([retryButton.view, returnButton.view]);

        let bottomY = buttonsTop + buttonHeight;

        if (needsSimulatorCta) {
            const ctaY = buttonsTop + buttonHeight + 16;
            const ctaButton = new Button(this, {
                x: centerX,
                y: ctaY + buttonHeight / 2,
                width: rowSpan,
                height: buttonHeight,
                text: "LANJUT KE SIMULATOR →",
                fontSize: 14,
                borderRadius: 12,
                fillColor: 0x1f8d52,
                strokeAlpha: 0,
                textColor: "#ffffff",
            });
            ctaButton.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("SimulatorOws");
            });
            this.bodyContainer.add(ctaButton.view);
            bottomY = ctaY + buttonHeight;
        }

        this.redrawCard(bottomY);
    }

    // ---- Layout -------------------------------------------------------------------

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        const rootX = (width - DESIGN_WIDTH * scale) / 2;
        const rootY = (height - DESIGN_HEIGHT * scale) / 2;
        this.root.setPosition(rootX, rootY);
    }
}
