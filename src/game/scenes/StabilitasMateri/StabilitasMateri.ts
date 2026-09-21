import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { createStepDots } from "../../../component/StepDots/StepDots";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx, playVoiceSfx } from "../../SfxManager";
import { setMaterialCompleted } from "../../StabilityModuleState";
import { ShipFrontView } from "../SimulatorStabilitas/ShipFrontView";
import {
    EQUILIBRIUM_CARDS,
    EquilibriumCardInfo,
    FREE_SURFACE_SUMMARY,
    MATERIAL_COMPLETION_CHECKLIST,
    STABILITY_POINTS,
    StabilityPointInfo,
} from "./StabilitasMateriData";

// Authored at a fixed reference resolution and uniformly scaled to fit the
// window, same approach as the other module scenes.
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;
const TOTAL_STEPS = 6;

const CARD_X = MARGIN;
const CARD_Y = 300;
const CARD_WIDTH = DESIGN_WIDTH - MARGIN * 2;
const CARD_HEIGHT = 560;

const CONTENT_X = CARD_X + 40;
const CONTENT_TOP = CARD_Y + 36;
const CONTENT_WIDTH = CARD_WIDTH - 80;
const CONTENT_BOTTOM = CARD_Y + CARD_HEIGHT - 36;

const TEXT_COL_WIDTH = 560;
const ILLU_COL_X = CONTENT_X + TEXT_COL_WIDTH + 40;
const ILLU_COL_WIDTH = CONTENT_WIDTH - TEXT_COL_WIDTH - 40;
const ILLU_COL_CENTER_X = ILLU_COL_X + ILLU_COL_WIDTH / 2;

const GREEN_HEX = "#1f8d52";
const RED_HEX = "#c0392b";

/**
 * The 6-step "Materi Stabilitas" slideshow reached from MainMenu before the
 * existing SimulatorStabilitas scene — pure reading/interaction material,
 * no gameplay of its own. Step 7 (internal only) is the completion summary.
 */
export class StabilitasMateri extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private bodyContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private step = 1;
    private activeTimers: Phaser.Time.TimerEvent[] = [];
    private activeShipViews: ShipFrontView[] = [];

    private stepLabelText!: GameObjects.Text;
    private stepDotsGroup!: GameObjects.Container;

    private materiSelectedPoint: StabilityPointInfo["key"] | null = null;
    private step2Dots: { key: string; dot: GameObjects.Arc; label: GameObjects.Text }[] = [];
    private step2DescTitle?: GameObjects.Text;
    private step2DescBody?: GameObjects.Text;

    private step4Ship: ShipFrontView | null = null;

    private step6State: "tegak" | "kiri" | "kanan" = "tegak";
    private step6TankGraphics?: GameObjects.Graphics;
    private step6ArrowGraphics?: GameObjects.Graphics;
    private step6TankBounds = { x: 0, y: 0, width: 0, height: 0 };

    constructor() {
        super("StabilitasMateri");
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildStepIndicator());
        trackGroup(this.root, groups, () => this.buildCardChrome());

        this.bodyContainer = this.add.container(0, 0);
        this.root.add(this.bodyContainer);
        groups.push([this.bodyContainer]);
        this.transitionGroups = groups;

        this.step = 1;
        this.renderStep();

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);
        playVoiceSfx(this, SFX_KEYS.keteranganStabilitas);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
            this.clearStepTimers();
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
            badgeLabel: "MODUL SIMULATOR STABILITAS",
            breadcrumbLabel: "Materi Dasar Stabilitas Kapal",
            heading: "DASAR STABILITAS KAPAL",
            subtitle: "Pelajari konsep dasar stabilitas sebelum melakukan simulasi distribusi muatan.",
            onHome: () => this.goTo("MainMenu"),
        });
        this.root.add(header.view);
    }

    private buildStepIndicator() {
        this.stepLabelText = this.add.text(MARGIN, 262, "MATERI 1 / 6", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 15,
            color: PRIMARY_BLUE_HEX,
        });
        this.stepDotsGroup = this.add.container(0, 0);
        this.root.add([this.stepLabelText, this.stepDotsGroup]);
    }

    private updateStepIndicator() {
        const visible = this.step <= TOTAL_STEPS;
        this.stepLabelText.setVisible(visible);
        this.stepDotsGroup.setVisible(visible);
        if (!visible) return;

        this.stepLabelText.setText(`MATERI ${this.step} / ${TOTAL_STEPS}`);
        this.stepDotsGroup.removeAll(true);
        this.stepDotsGroup.add(createStepDots(this, MARGIN + 150, 269, TOTAL_STEPS, this.step));
    }

    private buildCardChrome() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 20);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 20);
        this.root.add(card);
    }

    /** Rebuilt every renderStep() (added to bodyContainer, which is fully
     * cleared each time) so the disabled/enabled look and label always
     * match the current step without needing separate enable/disable
     * bookkeeping on persistent objects. */
    private buildNavButtonsForStep() {
        const buttonHeight = 50;
        const navY = CARD_Y + CARD_HEIGHT + 40;
        const atFirst = this.step <= 1;
        const isCompletion = this.step > TOTAL_STEPS;

        const prevWidth = 190;
        const prevButton = new Button(this, {
            x: CARD_X + prevWidth / 2,
            y: navY + buttonHeight / 2,
            width: prevWidth,
            height: buttonHeight,
            text: "← SEBELUMNYA",
            fontSize: 14,
            borderRadius: 12,
            disabled: atFirst,
            fillColor: atFirst ? 0xe2e8f0 : 0xffffff,
            strokeColor: atFirst ? 0xe2e8f0 : PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: atFirst ? "#94a3b8" : PRIMARY_BLUE_HEX,
        });
        prevButton.on("pointerdown", () => this.goPrev());
        this.bodyContainer.add(prevButton.view);

        if (!isCompletion) {
            const nextWidth = 190;
            const nextButton = new Button(this, {
                x: CARD_X + CARD_WIDTH - nextWidth / 2,
                y: navY + buttonHeight / 2,
                width: nextWidth,
                height: buttonHeight,
                text: this.step === TOTAL_STEPS ? "LIHAT RINGKASAN →" : "SELANJUTNYA →",
                fontSize: 14,
                borderRadius: 12,
                fillColor: PRIMARY_BLUE,
                strokeAlpha: 0,
                textColor: "#ffffff",
            });
            nextButton.on("pointerdown", () => this.goNext());
            this.bodyContainer.add(nextButton.view);
        }
    }

    private goPrev() {
        if (this.step <= 1) return;
        playSfx(this, SFX_KEYS.click);
        this.step -= 1;
        this.renderStep();
    }

    private goNext() {
        if (this.step > TOTAL_STEPS) return;
        playSfx(this, SFX_KEYS.click);
        this.step += 1;
        this.renderStep();
    }

    // ---- Step rendering ---------------------------------------------------------

    private renderStep() {
        this.clearStepTimers();
        this.bodyContainer.removeAll(true);
        this.updateStepIndicator();

        switch (this.step) {
            case 1:
                this.buildStep1();
                break;
            case 2:
                this.buildStep2();
                break;
            case 3:
                this.buildStep3();
                break;
            case 4:
                this.buildStep4();
                break;
            case 5:
                this.buildStep5();
                break;
            case 6:
                this.buildStep6();
                break;
            default:
                this.buildCompletion();
                break;
        }

        this.buildNavButtonsForStep();
    }

    private clearStepTimers() {
        this.activeTimers.forEach((timer) => timer.remove(false));
        this.activeTimers = [];
        this.activeShipViews.forEach((view) => view.destroy());
        this.activeShipViews = [];
        this.step4Ship = null;
    }

    private addStepTitle(text: string): GameObjects.Text {
        const title = this.add.text(CONTENT_X, CONTENT_TOP, text, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 22,
            color: DARK_NAVY,
        });
        this.bodyContainer.add(title);
        return title;
    }

    /** Plays a sequence of heel angles on `ship`, one per `stepDuration`ms,
     * optionally looping — used by steps 1, 4 and 5's ship demonstrations.
     * Timers are tracked so renderStep() can cancel them on step change. */
    private playHeelSequence(ship: ShipFrontView, angles: number[], stepDuration: number, loop = false) {
        let i = 0;
        const step = () => {
            if (i >= angles.length) {
                if (loop) {
                    i = 0;
                } else {
                    return;
                }
            }
            ship.setHeel(angles[i], stepDuration * 0.8);
            i += 1;
            const timer = this.time.delayedCall(stepDuration, step);
            this.activeTimers.push(timer);
        };
        step();
    }

    private drawDashedLine(g: GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, dash: number) {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.floor(length / dash));
        for (let i = 0; i < steps; i += 2) {
            const t0 = i / steps;
            const t1 = Math.min(1, (i + 1) / steps);
            g.lineBetween(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
        }
    }

    // ---- Step 1: Pengertian ----------------------------------------------------

    private buildStep1() {
        const title = this.addStepTitle("PENGERTIAN STABILITAS KAPAL");

        const body = this.add.text(
            CONTENT_X,
            title.y + title.height + 20,
            "Stabilitas kapal adalah kemampuan kapal untuk kembali ke posisi tegak setelah miring akibat gaya dari luar seperti angin dan gelombang maupun dari dalam seperti pergeseran muatan.",
            {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 15,
                color: BODY_TEXT,
                lineSpacing: 6,
                wordWrap: { width: TEXT_COL_WIDTH },
            },
        );
        this.bodyContainer.add(body);

        const calloutY = body.y + body.height + 24;
        const calloutHeight = 90;
        const callout = this.add.graphics();
        callout.fillStyle(0xeaf1fd, 1);
        callout.fillRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        callout.lineStyle(2, PRIMARY_BLUE, 0.5);
        callout.strokeRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        const calloutTitle = this.add.text(CONTENT_X + 18, calloutY + 16, "Tujuan stabilitas:", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: PRIMARY_BLUE_HEX,
        });
        const calloutBody = this.add.text(CONTENT_X + 18, calloutY + 38, "Kapal mampu kembali menuju posisi keseimbangannya.", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: DARK_NAVY,
            wordWrap: { width: TEXT_COL_WIDTH - 36 },
        });
        this.bodyContainer.add([callout, calloutTitle, calloutBody]);

        const anchorX = ILLU_COL_CENTER_X;
        const anchorY = CARD_Y + CARD_HEIGHT - 140;
        const ship = new ShipFrontView(this, anchorX, anchorY, [], () => {}, ILLU_COL_WIDTH - 60);
        this.bodyContainer.add(ship.view);
        this.activeShipViews.push(ship);

        this.playHeelSequence(ship, [-7, 0, 7, 0], 700, true);
    }

    // ---- Step 2: K, B, G, M -----------------------------------------------------

    private buildStep2() {
        const title = this.addStepTitle("EMPAT TITIK UTAMA STABILITAS");

        const instruction = this.add.text(CONTENT_X, title.y + title.height + 18, "Klik salah satu titik pada diagram untuk melihat penjelasannya.", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: BODY_TEXT,
            wordWrap: { width: TEXT_COL_WIDTH },
        });
        this.bodyContainer.add(instruction);

        const descTop = instruction.y + instruction.height + 24;
        this.step2DescTitle = this.add.text(CONTENT_X, descTop, "", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
        this.step2DescBody = this.add.text(CONTENT_X, descTop + 30, "", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: DARK_NAVY,
            lineSpacing: 5,
            wordWrap: { width: TEXT_COL_WIDTH },
        });
        this.bodyContainer.add([this.step2DescTitle, this.step2DescBody]);

        const anchorX = ILLU_COL_CENTER_X;
        const anchorY = CARD_Y + CARD_HEIGHT - 130;
        const ship = new ShipFrontView(this, anchorX, anchorY, [], () => {}, ILLU_COL_WIDTH - 60);
        this.bodyContainer.add(ship.view);
        this.activeShipViews.push(ship);

        const pointY: Record<string, number> = { K: anchorY - 8, B: anchorY - 55, G: anchorY - 112, M: anchorY - 175 };
        const pointColor: Record<string, number> = { K: 0x8ea7cf, B: 0x22b8d8, G: 0xc0392b, M: 0x1659a7 };

        this.step2Dots = STABILITY_POINTS.map((point) => {
            const y = pointY[point.key];
            const dot = this.add
                .circle(anchorX, y, 9, pointColor[point.key], 1)
                .setStrokeStyle(2, 0xffffff, 1)
                .setInteractive({ useHandCursor: true });
            const label = this.add
                .text(anchorX + 20, y, point.key, { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 14, color: DARK_NAVY })
                .setOrigin(0, 0.5);
            dot.on("pointerdown", () => this.selectStabilityPoint(point.key));
            this.bodyContainer.add([dot, label]);
            return { key: point.key, dot, label };
        });

        this.refreshStep2Selection();
    }

    private selectStabilityPoint(key: StabilityPointInfo["key"]) {
        playSfx(this, SFX_KEYS.click);
        this.materiSelectedPoint = key;
        this.refreshStep2Selection();
    }

    private refreshStep2Selection() {
        const selected = this.materiSelectedPoint;
        this.step2Dots.forEach(({ key, dot, label }) => {
            const isSelected = key === selected;
            const dim = selected !== null && !isSelected;
            dot.setAlpha(dim ? 0.4 : 1);
            label.setAlpha(dim ? 0.4 : 1);
            dot.setScale(isSelected ? 1.3 : 1);
        });

        const info = STABILITY_POINTS.find((point) => point.key === selected);
        if (!this.step2DescTitle || !this.step2DescBody) return;
        this.step2DescTitle.setText(info ? `${info.key} — ${info.label}` : "");
        this.step2DescBody.setText(info ? info.description : "");
    }

    // ---- Step 3: GM & GZ ---------------------------------------------------------

    private buildFormulaCardBg(x: number, y: number, width: number, height: number) {
        const card = this.add.graphics();
        card.fillStyle(0xf7faff, 1);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        this.bodyContainer.add(card);
    }

    private buildStep3() {
        const title = this.addStepTitle("RUMUS DASAR STABILITAS");

        const gap = 32;
        const cardWidth = (CONTENT_WIDTH - gap) / 2;
        const cardsTop = title.y + title.height + 24;
        const cardsHeight = CONTENT_BOTTOM - cardsTop;
        const leftX = CONTENT_X;
        const rightX = CONTENT_X + cardWidth + gap;

        this.buildFormulaCardBg(leftX, cardsTop, cardWidth, cardsHeight);
        this.buildFormulaCardBg(rightX, cardsTop, cardWidth, cardsHeight);

        // GM card
        const gmHeader = this.add.text(leftX + 20, cardsTop + 18, "TINGGI METASENTRIS — GM", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: PRIMARY_BLUE_HEX,
            wordWrap: { width: cardWidth - 40 },
        });
        const gmFormula1 = this.add.text(leftX + 20, gmHeader.y + gmHeader.height + 14, "GM = KM − KG", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 20,
            color: DARK_NAVY,
        });
        const gmFormula2 = this.add.text(leftX + 20, gmFormula1.y + gmFormula1.height + 8, "KM = KB + BM", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 16,
            color: DARK_NAVY,
        });
        const gmDesc = this.add.text(leftX + 20, gmFormula2.y + gmFormula2.height + 14, "GM adalah jarak vertikal antara titik G dan titik M.", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: BODY_TEXT,
            lineSpacing: 5,
            wordWrap: { width: cardWidth - 40 },
        });

        const calcY = gmDesc.y + gmDesc.height + 22;
        const calcLines = ["KM = 7,80 m", "KG = 6,50 m", "GM = KM − KG", "GM = 7,80 − 6,50", "GM = 1,30 m"];
        const calcText = this.add.text(leftX + 20, calcY, calcLines.join("\n"), {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: DARK_NAVY,
            lineSpacing: 6,
        });

        const badgeY = calcText.y + calcText.height + 16;
        const badgeWidth = cardWidth - 40;
        const badgeHeight = 44;
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0xe3f7ec, 1);
        badgeBg.fillRoundedRect(leftX + 20, badgeY, badgeWidth, badgeHeight, 10);
        badgeBg.lineStyle(2, 0x1f8d52, 1);
        badgeBg.strokeRoundedRect(leftX + 20, badgeY, badgeWidth, badgeHeight, 10);
        const badgeText = this.add
            .text(leftX + 20 + badgeWidth / 2, badgeY + badgeHeight / 2, "✓ GM > 0  —  STABILITAS POSITIF", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 13,
                color: GREEN_HEX,
            })
            .setOrigin(0.5);

        this.bodyContainer.add([gmHeader, gmFormula1, gmFormula2, gmDesc, calcText, badgeBg, badgeText]);

        // GZ card
        const gzHeader = this.add.text(rightX + 20, cardsTop + 18, "LENGAN PENEGAK — GZ", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: PRIMARY_BLUE_HEX,
            wordWrap: { width: cardWidth - 40 },
        });
        const gzFormula = this.add.text(rightX + 20, gzHeader.y + gzHeader.height + 14, "GZ = GM × sin θ", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 20,
            color: DARK_NAVY,
        });
        const gzNote = this.add.text(rightX + 20, gzFormula.y + gzFormula.height + 10, "θ = sudut kemiringan kapal.", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: BODY_TEXT,
        });
        const gzDesc = this.add.text(
            rightX + 20,
            gzNote.y + gzNote.height + 12,
            "GZ adalah jarak horizontal antara garis kerja gaya berat dan gaya apung saat kapal miring.",
            {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 13,
                color: BODY_TEXT,
                lineSpacing: 5,
                wordWrap: { width: cardWidth - 40 },
            },
        );

        this.bodyContainer.add([gzHeader, gzFormula, gzNote, gzDesc]);

        const diagramTop = gzDesc.y + gzDesc.height + 20;
        this.buildHeelingDiagram(rightX + cardWidth / 2, diagramTop, cardsTop + cardsHeight - diagramTop - 10);
    }

    private buildHeelingDiagram(centerX: number, top: number, availableHeight: number) {
        const length = Math.min(availableHeight - 30, 130);
        const thetaDeg = 20;
        const thetaRad = (thetaDeg * Math.PI) / 180;
        const topY = top + 10;
        const mX = centerX - 20;
        const mY = topY;
        const gX = mX;
        const gY = topY + length;
        const tiltEndX = mX + length * Math.sin(thetaRad);
        const tiltEndY = mY + length * Math.cos(thetaRad);

        const g = this.add.graphics();
        g.lineStyle(2, PRIMARY_BLUE, 0.8);
        this.drawDashedLine(g, mX, mY, gX, gY, 6);
        g.lineStyle(2.5, 0x123b70, 0.9);
        g.lineBetween(mX, mY, tiltEndX, tiltEndY);
        g.lineStyle(2, 0xc0392b, 0.9);
        this.drawDashedLine(g, gX, gY, tiltEndX, gY, 5);
        g.lineStyle(1.5, 0x143a84, 0.6);
        g.beginPath();
        g.arc(mX, mY, 24, Math.PI / 2, Math.PI / 2 + thetaRad, false);
        g.strokePath();

        const mDot = this.add.circle(mX, mY, 6, 0x1659a7, 1);
        const gDot = this.add.circle(gX, gY, 6, 0xc0392b, 1);
        const bDot = this.add.circle(tiltEndX, tiltEndY, 5, 0x22b8d8, 1);

        const mLabel = this.add.text(mX - 24, mY - 7, "M", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 13, color: "#1659a7" });
        const gLabel = this.add.text(gX - 24, gY - 7, "G", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 13, color: RED_HEX });
        const bLabel = this.add.text(tiltEndX + 8, tiltEndY - 7, "B", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 13, color: "#22b8d8" });
        const gzLabel = this.add
            .text((gX + tiltEndX) / 2, gY + 8, "GZ", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 12, color: RED_HEX })
            .setOrigin(0.5, 0);
        const thetaLabel = this.add.text(mX + 14, mY + 22, "θ", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 13, color: DARK_NAVY });

        this.bodyContainer.add([g, mDot, gDot, bDot, mLabel, gLabel, bLabel, gzLabel, thetaLabel]);
    }

    // ---- Step 4: Tiga keadaan keseimbangan ---------------------------------------

    private buildStep4() {
        const title = this.addStepTitle("TIGA KEADAAN KESEIMBANGAN KAPAL");

        const hint = this.add.text(CONTENT_X, title.y + title.height + 14, "Klik salah satu kartu untuk melihat demonstrasi kemiringan kapal.", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 12,
            color: BODY_TEXT,
            wordWrap: { width: TEXT_COL_WIDTH },
        });
        this.bodyContainer.add(hint);

        // Three status cards stacked in the left (text) column; the demo
        // ship lives in the right (illustration) column, matching the same
        // two-column convention steps 1/2 use.
        const cardsTop = hint.y + hint.height + 16;
        const cardGap = 14;
        const cardHeight = (CONTENT_BOTTOM - cardsTop - cardGap * 2) / 3;

        EQUILIBRIUM_CARDS.forEach((info, index) => {
            const y = cardsTop + index * (cardHeight + cardGap);
            this.buildEquilibriumCard(info, CONTENT_X, y, TEXT_COL_WIDTH, cardHeight);
        });

        const anchorX = ILLU_COL_CENTER_X;
        const anchorY = CARD_Y + CARD_HEIGHT - 140;
        const ship = new ShipFrontView(this, anchorX, anchorY, [], () => {}, ILLU_COL_WIDTH - 60);
        this.bodyContainer.add(ship.view);
        this.activeShipViews.push(ship);
        this.step4Ship = ship;
    }

    /** A short, wide card (text on the left ~60%, a small M/G dot diagram
     * on the right ~40%, vertically centered) — the three cards stack in
     * the left column, so each only gets a slice of the card's height. */
    private buildEquilibriumCard(info: EquilibriumCardInfo, x: number, y: number, width: number, height: number) {
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xffffff, 1);
        cardBg.fillRoundedRect(x, y, width, height, 14);
        cardBg.lineStyle(2, info.accent, 0.8);
        cardBg.strokeRoundedRect(x, y, width, height, 14);

        const hit = this.add
            .rectangle(x + width / 2, y + height / 2, width, height, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => this.playEquilibriumDemo(info));

        const paddingX = 16;
        const textWidth = width * 0.6 - paddingX * 2;
        const diagCenterX = x + width * 0.6 + (width * 0.4) / 2;
        const diagCenterY = y + height / 2;

        const cardTitle = this.add.text(x + paddingX, y + 10, info.title, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 12,
            color: info.accentHex,
            wordWrap: { width: textWidth },
        });
        const gmLabel = this.add.text(x + paddingX, cardTitle.y + cardTitle.height + 3, info.gmLabel, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: DARK_NAVY,
        });
        const statusLabel = this.add.text(x + paddingX, gmLabel.y + gmLabel.height + 3, info.statusLabel, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 11,
            color: info.accentHex,
        });
        const bodyText = this.add.text(x + paddingX, statusLabel.y + statusLabel.height + 3, info.body, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 10,
            color: BODY_TEXT,
            lineSpacing: 3,
            wordWrap: { width: textWidth },
        });

        const dotGap = 20;
        const diagram: GameObjects.GameObject[] = [];
        if (info.id === "netral") {
            const dot = this.add.circle(diagCenterX, diagCenterY, 7, 0x6c4fd1, 1);
            const label = this.add
                .text(diagCenterX, diagCenterY + 16, "M/G", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 11, color: DARK_NAVY })
                .setOrigin(0.5, 0);
            diagram.push(dot, label);
        } else {
            const [topKey, bottomKey] = info.order as [string, string];
            const topY = diagCenterY - dotGap / 2;
            const bottomY = diagCenterY + dotGap / 2;
            const line = this.add.graphics();
            line.lineStyle(2, 0x9fb3d1, 1);
            line.lineBetween(diagCenterX, topY, diagCenterX, bottomY);
            const topDot = this.add.circle(diagCenterX, topY, 6, topKey === "M" ? 0x1659a7 : 0xc0392b, 1);
            const bottomDot = this.add.circle(diagCenterX, bottomY, 6, bottomKey === "M" ? 0x1659a7 : 0xc0392b, 1);
            const topLabel = this.add
                .text(diagCenterX + 12, topY, topKey, { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 11, color: DARK_NAVY })
                .setOrigin(0, 0.5);
            const bottomLabel = this.add
                .text(diagCenterX + 12, bottomY, bottomKey, { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 11, color: DARK_NAVY })
                .setOrigin(0, 0.5);
            diagram.push(line, topDot, bottomDot, topLabel, bottomLabel);
        }

        this.bodyContainer.add([cardBg, hit, cardTitle, gmLabel, statusLabel, bodyText, ...diagram]);
    }

    private playEquilibriumDemo(info: EquilibriumCardInfo) {
        if (!this.step4Ship) return;
        playSfx(this, SFX_KEYS.click);
        this.playHeelSequence(this.step4Ship, [0, ...info.heelSequence], 550, false);
    }

    // ---- Step 5: Stiff vs Tender -------------------------------------------------

    private buildStep5() {
        const title = this.addStepTitle("KARAKTER OLENG KAPAL");

        const colGap = 40;
        const colWidth = (CONTENT_WIDTH - colGap) / 2;
        const leftX = CONTENT_X;
        const rightX = CONTENT_X + colWidth + colGap;
        const colTop = title.y + title.height + 20;

        const leftBottom = this.buildOlengColumnText(leftX, colTop, colWidth, {
            heading: "KAPAL KAKU",
            subheading: "STIFF VESSEL",
            body: "Muatan berat yang menumpuk di bawah menurunkan titik G dan menghasilkan GM yang besar.",
            oleng: "CEPAT & MENYENTAK",
            accentHex: PRIMARY_BLUE_HEX,
        });
        const rightBottom = this.buildOlengColumnText(rightX, colTop, colWidth, {
            heading: "KAPAL LANGSAR",
            subheading: "TENDER VESSEL",
            body: "Muatan berat yang menumpuk di atas menaikkan titik G dan menghasilkan GM yang lebih kecil.",
            oleng: "LAMBAT / PELAN",
            accentHex: "#e0792e",
        });
        const textBottom = Math.max(leftBottom, rightBottom);

        // The conclusion sits right below the text blocks (not at the very
        // bottom of the card) so there's guaranteed room left for the ship
        // illustrations underneath it without the two colliding.
        const conclusion = this.add.text(
            CONTENT_X,
            textBottom + 14,
            "GM yang terlalu besar maupun terlalu kecil dapat menghasilkan karakter oleng yang kurang baik.",
            {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 13,
                color: BODY_TEXT,
                wordWrap: { width: CONTENT_WIDTH },
            },
        );
        this.bodyContainer.add(conclusion);

        // ShipFrontView's G/M indicator line extends ~230px above the
        // anchor and the water ~60px below it — anchorY is clamped so both
        // ends stay inside the card regardless of how tall the text above
        // it ended up being.
        const shipTop = conclusion.y + conclusion.height + 20;
        const shipBottomLimit = CONTENT_BOTTOM - 10;
        const anchorY = Math.min(shipTop + 230, shipBottomLimit - 60);

        this.buildOlengShip(leftX + colWidth / 2, anchorY, colWidth, [-6, 6, -6, 6], 260);
        this.buildOlengShip(rightX + colWidth / 2, anchorY, colWidth, [-6, 6, -6], 620);
    }

    private buildOlengColumnText(
        x: number,
        y: number,
        width: number,
        cfg: { heading: string; subheading: string; body: string; oleng: string; accentHex: string },
    ): number {
        const heading = this.add.text(x, y, cfg.heading, { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 16, color: DARK_NAVY });
        const subheading = this.add.text(x, heading.y + heading.height + 2, cfg.subheading, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 11,
            color: BODY_TEXT,
        });
        const body = this.add.text(x, subheading.y + subheading.height + 10, cfg.body, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 12,
            color: BODY_TEXT,
            lineSpacing: 4,
            wordWrap: { width: width - 20 },
        });
        const olengLabel = this.add.text(x, body.y + body.height + 10, `Karakter oleng: ${cfg.oleng}`, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 12,
            color: cfg.accentHex,
            wordWrap: { width: width - 20 },
        });
        this.bodyContainer.add([heading, subheading, body, olengLabel]);

        return olengLabel.y + olengLabel.height;
    }

    private buildOlengShip(anchorX: number, anchorY: number, width: number, angles: number[], stepDuration: number) {
        const ship = new ShipFrontView(this, anchorX, anchorY, [], () => {}, width - 40);
        this.bodyContainer.add(ship.view);
        this.activeShipViews.push(ship);
        this.playHeelSequence(ship, angles, stepDuration, true);
    }

    // ---- Step 6: Free Surface Effect ---------------------------------------------

    private buildStep6() {
        const title = this.addStepTitle("EFEK PERMUKAAN BEBAS");
        const subtitle = this.add.text(CONTENT_X, title.y + title.height + 4, "Free Surface Effect", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: BODY_TEXT,
        });
        this.bodyContainer.add(subtitle);

        const textTop = subtitle.y + subtitle.height + 20;
        const explanation1 = this.add.text(
            CONTENT_X,
            textTop,
            "Pada tangki yang terisi sebagian (slack tank), cairan dapat berpindah ketika kapal miring.",
            { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 13, color: BODY_TEXT, lineSpacing: 5, wordWrap: { width: TEXT_COL_WIDTH } },
        );
        const explanation2 = this.add.text(
            CONTENT_X,
            explanation1.y + explanation1.height + 12,
            "Pergerakan cairan menyebabkan kenaikan semu titik G menjadi G₁.",
            { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 13, color: BODY_TEXT, lineSpacing: 5, wordWrap: { width: TEXT_COL_WIDTH } },
        );
        const impactLabel = this.add.text(CONTENT_X, explanation2.y + explanation2.height + 16, "Akibat:  G ↑   GM ↓   STABILITAS ↓", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: RED_HEX,
            wordWrap: { width: TEXT_COL_WIDTH },
        });
        this.bodyContainer.add([explanation1, explanation2, impactLabel]);

        this.buildFlowSummary(CONTENT_X, impactLabel.y + impactLabel.height + 22, TEXT_COL_WIDTH);

        const tankWidth = ILLU_COL_WIDTH - 60;
        const tankHeight = 130;
        const tankX = ILLU_COL_X + 30;
        const tankY = CARD_Y + 150;
        this.step6TankBounds = { x: tankX, y: tankY, width: tankWidth, height: tankHeight };

        const tankOutline = this.add.graphics();
        tankOutline.lineStyle(3, 0x123b70, 1);
        tankOutline.strokeRoundedRect(tankX, tankY, tankWidth, tankHeight, 8);
        this.bodyContainer.add(tankOutline);

        this.step6TankGraphics = this.add.graphics();
        this.step6ArrowGraphics = this.add.graphics();
        this.bodyContainer.add([this.step6TankGraphics, this.step6ArrowGraphics]);

        const gLabel = this.add.text(tankX + tankWidth + 16, tankY + tankHeight / 2 - 20, "G", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: RED_HEX,
        });
        const g1Label = this.add.text(tankX + tankWidth + 16, tankY + tankHeight / 2 + 12, "G₁", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: "#e0792e",
        });
        this.bodyContainer.add([gLabel, g1Label]);

        const caption = this.add.text(tankX, tankY + tankHeight + 16, "Penampang tangki cairan terisi sebagian", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 11,
            color: BODY_TEXT,
            wordWrap: { width: tankWidth },
        });
        this.bodyContainer.add(caption);

        this.step6State = "tegak";
        this.drawTankState();
        this.cycleStep6();
    }

    private buildFlowSummary(x: number, y: number, width: number) {
        const rowHeight = 34;
        const gap = 10;
        const items = ["FREE SURFACE EFFECT", ...FREE_SURFACE_SUMMARY];

        items.forEach((item, index) => {
            const rowY = y + index * (rowHeight + gap);
            const isHeader = index === 0;
            const bg = this.add.graphics();
            bg.fillStyle(isHeader ? PRIMARY_BLUE : 0xeaf1fd, 1);
            bg.fillRoundedRect(x, rowY, width, rowHeight, 8);
            const text = this.add
                .text(x + width / 2, rowY + rowHeight / 2, item, {
                    fontFamily: "Plus Jakarta Sans",
                    fontStyle: "600",
                    fontSize: 12,
                    color: isHeader ? "#ffffff" : PRIMARY_BLUE_HEX,
                })
                .setOrigin(0.5);
            this.bodyContainer.add([bg, text]);
        });
    }

    private drawTankState() {
        if (!this.step6TankGraphics || !this.step6ArrowGraphics) return;
        const { x, y, width, height } = this.step6TankBounds;
        const tilt = this.step6State === "kiri" ? -10 : this.step6State === "kanan" ? 10 : 0;
        const tiltRad = (tilt * Math.PI) / 180;
        const liquidLevel = y + height * 0.45;
        const halfW = width / 2;
        const offset = Math.tan(tiltRad) * halfW;

        const g = this.step6TankGraphics;
        g.clear();
        const leftY = liquidLevel - offset;
        const rightY = liquidLevel + offset;
        g.fillStyle(0xbfe0f5, 0.9);
        g.beginPath();
        g.moveTo(x, leftY);
        g.lineTo(x + width, rightY);
        g.lineTo(x + width, y + height);
        g.lineTo(x, y + height);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0x3f8fd1, 1);
        g.lineBetween(x, leftY, x + width, rightY);

        const arrow = this.step6ArrowGraphics;
        arrow.clear();
        if (this.step6State !== "tegak") {
            const arrowX = x + width + 6;
            const arrowTopY = y + height / 2 - 18;
            const arrowBottomY = y + height / 2 + 14;
            arrow.lineStyle(2.5, 0xe0792e, 1);
            arrow.lineBetween(arrowX, arrowTopY, arrowX, arrowBottomY);
            arrow.fillStyle(0xe0792e, 1);
            arrow.beginPath();
            arrow.moveTo(arrowX - 5, arrowBottomY - 6);
            arrow.lineTo(arrowX + 5, arrowBottomY - 6);
            arrow.lineTo(arrowX, arrowBottomY);
            arrow.closePath();
            arrow.fillPath();
        }
    }

    private cycleStep6() {
        const order: Array<"tegak" | "kiri" | "kanan"> = ["kiri", "tegak", "kanan", "tegak"];
        let i = 0;
        const step = () => {
            this.step6State = order[i % order.length];
            this.drawTankState();
            i += 1;
            const timer = this.time.delayedCall(1400, step);
            this.activeTimers.push(timer);
        };
        const timer = this.time.delayedCall(1400, step);
        this.activeTimers.push(timer);
    }

    // ---- Completion ---------------------------------------------------------------

    private buildCompletion() {
        const centerX = CARD_X + CARD_WIDTH / 2;
        const icon = this.add.text(centerX, CARD_Y + 60, "✓", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 52, color: GREEN_HEX }).setOrigin(0.5);
        const title = this.add
            .text(centerX, CARD_Y + 130, "MATERI SELESAI", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 26, color: GREEN_HEX })
            .setOrigin(0.5);
        const subtitle = this.add
            .text(centerX, CARD_Y + 168, "Anda telah mempelajari konsep dasar stabilitas kapal.", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 14,
                color: BODY_TEXT,
            })
            .setOrigin(0.5);
        this.bodyContainer.add([icon, title, subtitle]);

        const listTop = CARD_Y + 210;
        const rowHeight = 30;
        MATERIAL_COMPLETION_CHECKLIST.forEach((item, index) => {
            const rowY = listTop + index * rowHeight;
            const check = this.add.text(centerX - 170, rowY, "✓", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 14, color: GREEN_HEX });
            const label = this.add.text(centerX - 140, rowY, item, { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 14, color: DARK_NAVY });
            this.bodyContainer.add([check, label]);
        });

        const buttonWidth = 260;
        const buttonHeight = 52;
        const buttonY = listTop + MATERIAL_COMPLETION_CHECKLIST.length * rowHeight + 26;
        const button = new Button(this, {
            x: centerX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            text: "PILIH AKTIVITAS →",
            fontSize: 15,
            borderRadius: 14,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        button.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            setMaterialCompleted();
            this.goTo("PilihAktivitasStabilitas");
        });
        this.bodyContainer.add(button.view);
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
