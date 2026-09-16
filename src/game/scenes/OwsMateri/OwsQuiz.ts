import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { startQuizBgm, stopQuizBgm } from "../../BgmManager";
import { EventBus } from "../../EventBus";
import { shuffleQuestions } from "../../QuizShuffle";
import { getOwsModuleProgress, setQuizResult } from "../../OwsModuleState";
import { NILAI_BAIK_THRESHOLD, SFX_KEYS, playSfx, playVoiceSfx } from "../../SfxManager";
import { OWS_QUIZ_QUESTIONS } from "./OwsQuizData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const MARGIN = 32;
const TOTAL_QUESTIONS = OWS_QUIZ_QUESTIONS.length;

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

// Scales the card and everything inside it (options, buttons, text, icons)
// up uniformly — the reference sizing felt cramped next to the rest of the
// OWS module's chrome.
const QUIZ_SCALE = 1.15;

const CARD_WIDTH = 1100 * QUIZ_SCALE;
const CARD_Y = 120;
const CARD_HEADER_HEIGHT = 76 * QUIZ_SCALE;
const CARD_RADIUS = 20;
// A floor, not a fixed height — the body is redrawn to fit whatever content
// (pembahasan panel, result checklist, the optional CTA) is actually on
// screen each render, so a button can never end up hanging outside it.
const MIN_BODY_HEIGHT = 480 * QUIZ_SCALE;
const MAX_CARD_BOTTOM = DESIGN_HEIGHT - 40;
const CARD_X = (DESIGN_WIDTH - CARD_WIDTH) / 2;
const CONTENT_X = CARD_X + 40 * QUIZ_SCALE;
const CONTENT_WIDTH = CARD_WIDTH - 80 * QUIZ_SCALE;

const GREEN_HEX = "#1f8d52";
const RED_HEX = "#c0392b";

/**
 * Kuis MARPOL Annex I — a dedicated quiz scene (structurally a twin of
 * StabilitasQuiz, not the generic QuizScene): picking an option immediately
 * reveals correct/incorrect plus a pembahasan panel, and the result screen
 * has a per-question review checklist plus a cross-link to whichever OWS
 * activity isn't done yet. Chrome matches the rest of the OWS module: a
 * compact Kembali pill + breadcrumb row above a card whose own header bar
 * carries the quiz title and "Soal n/5" progress.
 */
export class OwsQuiz extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private bodyContainer!: GameObjects.Container;
    private cardBodyBg!: GameObjects.Graphics;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private stepIndicatorGroup!: GameObjects.Container;

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
        this.background = this.add.image(0, 0, "ows.background");
        this.root = this.add.container(0, 0);

        this.questions = shuffleQuestions(OWS_QUIZ_QUESTIONS);
        this.questionIndex = 0;
        this.selectedIndex = null;
        this.checked = false;
        this.answers = [];
        this.correctFlags = [];

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
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

    // ---- Header (Kembali pill + breadcrumb row) ----------------------------------------

    private buildHeader() {
        const backWidth = 165;
        const backHeight = backWidth * (558 / 1780);
        const backY = MARGIN + backHeight / 2;
        const backButton = this.add
            .image(MARGIN + backWidth / 2, backY, "ows.btnKembali")
            .setDisplaySize(backWidth, backHeight)
            .setInteractive({ useHandCursor: true });
        backButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        // A single seamless pill beside the Kembali button, sized to match
        // its height: a solid-blue "MODUL SIMULATOR OWS" segment (rounded
        // left / flat right) fused onto a white "› Kuis MARPOL Annex I"
        // segment (flat left / rounded right) inside one shared outer
        // stroke, rather than a floating badge + bare text.
        const crumbHeight = backHeight;
        const crumbGap = 20;
        const crumbX = MARGIN + backWidth + crumbGap;
        const crumbY = MARGIN;
        const crumbCenterY = crumbY + crumbHeight / 2;

        const badgeText = this.add.text(0, 0, "MODUL SIMULATOR OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const bluePad = 24;
        const blueWidth = badgeText.width + bluePad * 2;

        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const crumbLabel = this.add.text(0, 0, "Kuis MARPOL Annex I", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
        const whitePadLeft = 22;
        const whiteGap = 10;
        const whitePadRight = 26;
        const whiteWidth = whitePadLeft + chevron.width + whiteGap + crumbLabel.width + whitePadRight;

        const totalWidth = blueWidth + whiteWidth;

        const pillBg = this.add.graphics();
        pillBg.fillStyle(0xffffff, 1);
        pillBg.fillRoundedRect(crumbX, crumbY, totalWidth, crumbHeight, crumbHeight / 2);
        pillBg.fillStyle(PRIMARY_BLUE, 1);
        pillBg.fillRoundedRect(crumbX, crumbY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        pillBg.lineStyle(2, PRIMARY_BLUE, 1);
        pillBg.strokeRoundedRect(crumbX, crumbY, totalWidth, crumbHeight, crumbHeight / 2);

        badgeText.setPosition(crumbX + blueWidth / 2, crumbCenterY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + whitePadLeft, crumbCenterY).setOrigin(0, 0.5);
        crumbLabel.setPosition(chevron.x + chevron.width + whiteGap, crumbCenterY).setOrigin(0, 0.5);

        this.root.add([backButton, pillBg, badgeText, chevron, crumbLabel]);
    }

    // ---- Card chrome (blue header bar + white body) --------------------------------------

    private buildCardChrome() {
        const headerBg = this.add.graphics();
        headerBg.fillStyle(PRIMARY_BLUE, 1);
        headerBg.fillRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEADER_HEIGHT, { tl: CARD_RADIUS, tr: CARD_RADIUS, bl: 0, br: 0 });

        const iconSize = 44 * QUIZ_SCALE;
        const iconX = CARD_X + 28 * QUIZ_SCALE;
        const iconY = CARD_Y + CARD_HEADER_HEIGHT / 2;
        const iconBg = this.add.graphics();
        iconBg.fillStyle(0xffffff, 0.18);
        iconBg.fillRoundedRect(iconX, iconY - iconSize / 2, iconSize, iconSize, 12 * QUIZ_SCALE);
        const icon = this.add.text(iconX + iconSize / 2, iconY, "📋", { fontFamily: FONT, fontStyle: "600", fontSize: 22 * QUIZ_SCALE }).setOrigin(0.5);

        const title = this.add
            .text(iconX + iconSize + 16 * QUIZ_SCALE, iconY, "KUIS MARPOL ANNEX I", { fontFamily: FONT, fontStyle: "600", fontSize: 20 * QUIZ_SCALE, color: "#ffffff" })
            .setOrigin(0, 0.5);

        this.cardBodyBg = this.add.graphics();

        this.stepIndicatorGroup = this.add.container(0, 0);

        this.root.add([this.cardBodyBg, headerBg, iconBg, icon, title, this.stepIndicatorGroup]);
        this.updateStepIndicator();
        this.redrawCard(CARD_Y + CARD_HEADER_HEIGHT + MIN_BODY_HEIGHT);
    }

    private updateStepIndicator() {
        this.stepIndicatorGroup.removeAll(true);

        const onResult = this.questionIndex >= TOTAL_QUESTIONS;
        if (onResult) return;

        const rightEdge = CARD_X + CARD_WIDTH - 28 * QUIZ_SCALE;
        const headerCenterY = CARD_Y + CARD_HEADER_HEIGHT / 2;

        const soalText = this.add
            .text(rightEdge, headerCenterY - 12 * QUIZ_SCALE, `Soal ${this.questionIndex + 1} / ${TOTAL_QUESTIONS}`, {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 14 * QUIZ_SCALE,
                color: "#ffffff",
            })
            .setOrigin(1, 0.5);

        const dotRadius = 5 * QUIZ_SCALE;
        const dotGap = 16 * QUIZ_SCALE;
        const dotsY = headerCenterY + 12 * QUIZ_SCALE;
        const items: GameObjects.GameObject[] = [soalText];
        for (let i = 0; i < TOTAL_QUESTIONS; i++) {
            const dotX = rightEdge - (TOTAL_QUESTIONS - 1 - i) * dotGap;
            const filled = i <= this.questionIndex;
            items.push(this.add.circle(dotX, dotsY, dotRadius, 0xffffff, filled ? 1 : 0.35));
        }

        this.stepIndicatorGroup.add(items);
    }

    /** Redraws the card BODY (below the fixed-height header bar) so its
     * bottom edge sits just past `contentBottom` — called at the end of
     * every render once the actual height of that render's content
     * (pembahasan panel, result checklist, optional CTA, ...) is known, so
     * nothing ever hangs outside the card. */
    private redrawCard(contentBottom: number) {
        const minBottom = CARD_Y + CARD_HEADER_HEIGHT + MIN_BODY_HEIGHT;
        const bottom = Math.min(Math.max(contentBottom + 30 * QUIZ_SCALE, minBottom), MAX_CARD_BOTTOM);
        const bodyTop = CARD_Y + CARD_HEADER_HEIGHT;
        const bodyHeight = bottom - bodyTop;

        this.cardBodyBg.clear();
        this.cardBodyBg.fillStyle(0xffffff, 1);
        this.cardBodyBg.fillRoundedRect(CARD_X, bodyTop, CARD_WIDTH, bodyHeight, { tl: 0, tr: 0, bl: CARD_RADIUS, br: CARD_RADIUS });
        this.cardBodyBg.lineStyle(2, BORDER_BLUE, 1);
        this.cardBodyBg.strokeRoundedRect(CARD_X, bodyTop, CARD_WIDTH, bodyHeight, { tl: 0, tr: 0, bl: CARD_RADIUS, br: CARD_RADIUS });
    }

    // ---- Question -----------------------------------------------------------------

    private renderQuestion() {
        this.bodyContainer.removeAll(true);
        this.updateStepIndicator();

        const question = this.questions[this.questionIndex];
        const top = CARD_Y + CARD_HEADER_HEIGHT + 32 * QUIZ_SCALE;

        const questionText = this.add.text(CONTENT_X, top, question.question, {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 19 * QUIZ_SCALE,
            color: DARK_NAVY,
            lineSpacing: 6 * QUIZ_SCALE,
            wordWrap: { width: CONTENT_WIDTH },
        });
        this.bodyContainer.add(questionText);

        const optionsTop = questionText.y + questionText.height + 24 * QUIZ_SCALE;
        const rowHeight = 54 * QUIZ_SCALE;
        const rowGap = 14 * QUIZ_SCALE;

        question.options.forEach((option, index) => {
            const rowY = optionsTop + index * (rowHeight + rowGap);
            const isPicked = index === this.selectedIndex;
            const isCorrectRow = index === question.correctIndex;

            // Picking a row both selects and checks it in the same click
            // (see selectAndCheck), so "picked" and "checked" are always in
            // sync — there's no separate selected-but-unconfirmed look.
            // Letter badges are solid blue from the start (not outline-only
            // until picked), matching the reference design.
            let fillColor = 0xf7faff;
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

            const letterBg = this.add.circle(CONTENT_X + 30 * QUIZ_SCALE, rowY + rowHeight / 2, 16 * QUIZ_SCALE, accentColor, 1);
            const letterText = this.add
                .text(CONTENT_X + 30 * QUIZ_SCALE, rowY + rowHeight / 2, String.fromCharCode(65 + index), {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 14 * QUIZ_SCALE,
                    color: "#ffffff",
                })
                .setOrigin(0.5);
            const optionText = this.add
                .text(CONTENT_X + 62 * QUIZ_SCALE, rowY + rowHeight / 2, option, {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 15 * QUIZ_SCALE,
                    color: DARK_NAVY,
                    wordWrap: { width: CONTENT_WIDTH - 82 * QUIZ_SCALE },
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
        const bannerY = optionsBottom + 18 * QUIZ_SCALE;
        const banner = this.add.text(CONTENT_X, bannerY, isCorrect ? "✓ JAWABAN TEPAT" : "✕ JAWABAN BELUM TEPAT", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 15 * QUIZ_SCALE,
            color: isCorrect ? GREEN_HEX : RED_HEX,
        });
        this.bodyContainer.add(banner);

        const panelY = banner.y + banner.height + 12 * QUIZ_SCALE;
        const panelHeader = this.add.text(CONTENT_X + 16 * QUIZ_SCALE, panelY + 12 * QUIZ_SCALE, "PEMBAHASAN", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 12 * QUIZ_SCALE,
            color: PRIMARY_BLUE_HEX,
        });
        const panelBody = this.add.text(CONTENT_X + 16 * QUIZ_SCALE, panelHeader.y + panelHeader.height + 6 * QUIZ_SCALE, question.pembahasan, {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 12 * QUIZ_SCALE,
            color: BODY_TEXT,
            lineSpacing: 4 * QUIZ_SCALE,
            wordWrap: { width: CONTENT_WIDTH - 32 * QUIZ_SCALE },
        });
        const panelHeight = panelBody.y + panelBody.height - panelY + 14 * QUIZ_SCALE;

        const panelBg = this.add.graphics();
        panelBg.fillStyle(0xf3f7fe, 1);
        panelBg.fillRoundedRect(CONTENT_X, panelY, CONTENT_WIDTH, panelHeight, 10);
        panelBg.lineStyle(1.5, BORDER_BLUE, 1);
        panelBg.strokeRoundedRect(CONTENT_X, panelY, CONTENT_WIDTH, panelHeight, 10);
        this.bodyContainer.add(panelBg);
        this.bodyContainer.add([panelHeader, panelBody]);

        const feedbackBottom = panelY + panelHeight;
        const buttonBottom = this.buildActionButton(feedbackBottom + 26 * QUIZ_SCALE);
        this.redrawCard(buttonBottom);
    }

    private buildActionButton(y: number): number {
        const isLast = this.questionIndex === TOTAL_QUESTIONS - 1;

        const buttonWidth = 220 * QUIZ_SCALE;
        const buttonHeight = 52 * QUIZ_SCALE;
        const buttonX = CARD_X + CARD_WIDTH - 36 * QUIZ_SCALE - buttonWidth;

        const button = new Button(this, {
            x: buttonX + buttonWidth / 2,
            y: y + buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            text: isLast ? "Lihat Hasil ›" : "Selanjutnya ›",
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 15 * QUIZ_SCALE,
            borderRadius: buttonHeight / 2,
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
        const top = CARD_Y + CARD_HEADER_HEIGHT + 30 * QUIZ_SCALE;
        const scoreText = this.add
            .text(centerX, top + 20 * QUIZ_SCALE, `${score} / 100`, { fontFamily: FONT, fontStyle: "600", fontSize: 40 * QUIZ_SCALE, color: PRIMARY_BLUE_HEX })
            .setOrigin(0.5);
        const correctText = this.add
            .text(centerX, top + 70 * QUIZ_SCALE, `${correctCount} / ${TOTAL_QUESTIONS} JAWABAN BENAR`, {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 15 * QUIZ_SCALE,
                color: DARK_NAVY,
            })
            .setOrigin(0.5);
        this.bodyContainer.add([scoreText, correctText]);

        const listTop = top + 120 * QUIZ_SCALE;
        const rowHeight = 30 * QUIZ_SCALE;
        this.correctFlags.forEach((isCorrect, index) => {
            const rowY = listTop + index * rowHeight;
            const mark = this.add.text(centerX - 120 * QUIZ_SCALE, rowY, isCorrect ? "✓" : "✕", {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 14 * QUIZ_SCALE,
                color: isCorrect ? GREEN_HEX : RED_HEX,
            });
            const label = this.add.text(centerX - 90 * QUIZ_SCALE, rowY, `Soal ${index + 1}`, {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 14 * QUIZ_SCALE,
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
            const successY = contentBottom + 20 * QUIZ_SCALE;
            const successBanner = this.add
                .text(centerX, successY, "🔓 Katup buang otomatis terbuka — air terbuang dengan aman ke laut.", {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 13 * QUIZ_SCALE,
                    color: GREEN_HEX,
                    align: "center",
                    wordWrap: { width: CONTENT_WIDTH },
                })
                .setOrigin(0.5);
            this.bodyContainer.add(successBanner);
            contentBottom = successBanner.y + successBanner.height;
        }

        const buttonWidth = 220 * QUIZ_SCALE;
        const buttonHeight = 52 * QUIZ_SCALE;
        const buttonsTop = contentBottom + 30 * QUIZ_SCALE;
        const gap = 16 * QUIZ_SCALE;
        // The two-button row spans [centerX - buttonWidth - gap/2, centerX + buttonWidth + gap/2]
        // — the CTA below is sized to that exact same span so its edges line up precisely.
        const rowSpan = buttonWidth * 2 + gap;

        const retryButton = new Button(this, {
            x: centerX - buttonWidth / 2 - gap / 2,
            y: buttonsTop + buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            text: "Ulangi Kuis",
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 14 * QUIZ_SCALE,
            borderRadius: buttonHeight / 2,
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
            text: "Kembali ke Beranda",
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 12 * QUIZ_SCALE,
            borderRadius: buttonHeight / 2,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
            wordWrapWidth: buttonWidth - 24,
        });
        returnButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        this.bodyContainer.add([retryButton.view, returnButton.view]);

        let bottomY = buttonsTop + buttonHeight;

        if (needsSimulatorCta) {
            const ctaY = buttonsTop + buttonHeight + 16 * QUIZ_SCALE;
            const ctaButton = new Button(this, {
                x: centerX,
                y: ctaY + buttonHeight / 2,
                width: rowSpan,
                height: buttonHeight,
                text: "Lanjut ke Simulator ›",
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 14 * QUIZ_SCALE,
                borderRadius: buttonHeight / 2,
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
