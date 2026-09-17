import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { shuffled } from "../../QuizShuffle";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import {
    SOPEP_CASE_SLOTS,
    SOPEP_CHECKLIST_LABELS,
    SOPEP_KIT_ITEMS,
    SopepCaseScore,
    SopepCaseSlot,
    SopepCaseVariant,
    SopepSourceId,
    SopepStopAction,
    STOP_ACTION_LABEL,
} from "./SopepSimulatorData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const RED = 0xc0392b;
const RED_HEX = "#c0392b";
const SKY = 0xeaf3ff;

const HEADER_Y = 32;
const HEADER_HEIGHT = 56;
const MISSION_Y = 108;
const MISSION_HEIGHT = 96;
const BOARD_Y = MISSION_Y + MISSION_HEIGHT + 16;
const FOOTER_MARGIN = 32;
const BOARD_HEIGHT = DESIGN_HEIGHT - BOARD_Y - FOOTER_MARGIN;
const CHECKLIST_WIDTH = 260;
const BOARD_X = 32;
const BOARD_WIDTH = DESIGN_WIDTH - BOARD_X - CHECKLIST_WIDTH - 24 - 32;
const CHECKLIST_X = BOARD_X + BOARD_WIDTH + 24;

type Stage =
    | "INTRO"
    | "IDENTIFY_SOURCE"
    | "STOP_SOURCE"
    | "PROTECT_SCUPPER"
    | "CONTAIN_SPILL"
    | "CLEAN_SPILL"
    | "REPORT"
    | "CASE_COMPLETE";

interface EnvSpot {
    id: SopepSourceId | "pump";
    x: number;
    y: number;
    icon: string;
    label: string;
}

/**
 * SOPEP Emergency Response Simulator — a click/select/drag activity reached
 * after SopepMateri finishes. One reusable engine drives all 3 cases (no
 * per-case scene/logic duplication): each case picks a random predefined
 * variant from SopepSimulatorData, then walks the same state machine.
 */
export class SopepSimulator extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private missionContainer!: GameObjects.Container;
    private boardContainer!: GameObjects.Container;
    private checklistContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private caseIndex = 0;
    private slot!: SopepCaseSlot;
    private variant!: SopepCaseVariant;
    private stage: Stage = "INTRO";
    private kitStepIndex = 0;
    private identifyMistakeMade = false;
    private stopMistakeMade = false;
    private kitMistakeMade = false;
    private caseScores: SopepCaseScore[] = [];
    private envSpots: EnvSpot[] = [];
    private currentScale = 1;
    private currentRootX = 0;
    private currentRootY = 0;

    constructor() {
        super("SopepSimulator");
    }

    create() {
        this.background = this.add.image(0, 0, "pilah_sampah.background");
        this.root = this.add.container(0, 0);
        this.caseIndex = 0;
        this.caseScores = [];

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());

        this.missionContainer = this.add.container(0, 0);
        this.root.add(this.missionContainer);
        groups.push([this.missionContainer]);

        this.boardContainer = this.add.container(0, 0);
        this.root.add(this.boardContainer);
        groups.push([this.boardContainer]);

        this.checklistContainer = this.add.container(0, 0);
        this.root.add(this.checklistContainer);
        groups.push([this.checklistContainer]);

        this.transitionGroups = groups;

        this.startCase(0);

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string, data?: object) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey, data));
    }

    // ---- Header ---------------------------------------------------------------------

    private buildHeader() {
        const homeWidth = 150;
        const homeBg = this.add.graphics();
        homeBg.fillStyle(0xffffff, 1);
        homeBg.fillRoundedRect(32, HEADER_Y, homeWidth, HEADER_HEIGHT, HEADER_HEIGHT / 2);
        homeBg.lineStyle(2, BORDER_BLUE, 1);
        homeBg.strokeRoundedRect(32, HEADER_Y, homeWidth, HEADER_HEIGHT, HEADER_HEIGHT / 2);
        const homeIcon = this.add.text(32 + 26, HEADER_Y + HEADER_HEIGHT / 2, "🏠", { fontFamily: FONT, fontSize: 18 }).setOrigin(0.5);
        const homeLabel = this.add
            .text(32 + 48, HEADER_Y + HEADER_HEIGHT / 2, "Beranda", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: PRIMARY_BLUE_HEX })
            .setOrigin(0, 0.5);
        const homeHit = this.add.rectangle(32 + homeWidth / 2, HEADER_Y + HEADER_HEIGHT / 2, homeWidth, HEADER_HEIGHT, 0xffffff, 0).setInteractive({ useHandCursor: true });
        homeHit.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        const crumbX = 32 + homeWidth + 16;
        const centerY = HEADER_Y + HEADER_HEIGHT / 2;
        const badgeText = this.add.text(0, 0, "MODUL SOPEP", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: "#ffffff" });
        const blueWidth = badgeText.width + 44;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Simulasi Penanganan Tumpahan", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 20 + chevron.width + 10 + label.width + 24;

        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, HEADER_Y, blueWidth + whiteWidth, HEADER_HEIGHT, HEADER_HEIGHT / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, HEADER_Y, blueWidth, HEADER_HEIGHT, { tl: HEADER_HEIGHT / 2, bl: HEADER_HEIGHT / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, HEADER_Y, blueWidth + whiteWidth, HEADER_HEIGHT, HEADER_HEIGHT / 2);

        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 20, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        const caseText = this.add.text(0, 0, `KASUS ${this.caseIndex + 1} / ${SOPEP_CASE_SLOTS.length}`, {
            fontFamily: FONT, fontStyle: "700", fontSize: 15, color: "#ffffff",
        });
        const caseWidth = caseText.width + 40;
        const caseBg = this.add.graphics();
        caseBg.fillStyle(PRIMARY_BLUE, 1);
        caseBg.fillRoundedRect(DESIGN_WIDTH - 32 - caseWidth, HEADER_Y, caseWidth, HEADER_HEIGHT, HEADER_HEIGHT / 2);
        caseText.setPosition(DESIGN_WIDTH - 32 - caseWidth / 2, centerY).setOrigin(0.5);
        this.caseBadgeText = caseText;
        this.caseBadgeBg = caseBg;

        this.root.add([homeBg, homeIcon, homeLabel, homeHit, breadcrumb, badgeText, chevron, label, caseBg, caseText]);
    }

    private caseBadgeText!: GameObjects.Text;
    private caseBadgeBg!: GameObjects.Graphics;

    private refreshCaseBadge() {
        this.caseBadgeText.setText(`KASUS ${this.caseIndex + 1} / ${SOPEP_CASE_SLOTS.length}`);
        const caseWidth = this.caseBadgeText.width + 40;
        this.caseBadgeBg.clear();
        this.caseBadgeBg.fillStyle(PRIMARY_BLUE, 1);
        this.caseBadgeBg.fillRoundedRect(DESIGN_WIDTH - 32 - caseWidth, HEADER_Y, caseWidth, HEADER_HEIGHT, HEADER_HEIGHT / 2);
        this.caseBadgeText.setPosition(DESIGN_WIDTH - 32 - caseWidth / 2, HEADER_Y + HEADER_HEIGHT / 2);
    }

    // ---- Case lifecycle ------------------------------------------------------------------

    private startCase(index: number) {
        this.caseIndex = index;
        this.slot = SOPEP_CASE_SLOTS[index];
        this.variant = shuffled(this.slot.variants)[0];
        this.identifyMistakeMade = false;
        this.stopMistakeMade = false;
        this.kitMistakeMade = false;
        this.kitStepIndex = 0;
        this.stage = "INTRO";
        if (this.caseBadgeText) this.refreshCaseBadge();
        this.renderStage();
    }

    private setStage(stage: Stage) {
        this.stage = stage;
        this.renderStage();
    }

    private stepNumberFor(stage: Stage): number {
        switch (stage) {
            case "IDENTIFY_SOURCE": return 1;
            case "STOP_SOURCE": return 2;
            case "PROTECT_SCUPPER": return 3;
            case "CONTAIN_SPILL":
            case "CLEAN_SPILL": return 4;
            case "REPORT": return 5;
            default: return 0;
        }
    }

    // ---- Mission panel ---------------------------------------------------------------

    private buildMissionPanel(instruction: string) {
        this.missionContainer.removeAll(true);

        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.95);
        panel.fillRoundedRect(BOARD_X, MISSION_Y, DESIGN_WIDTH - BOARD_X - 32, MISSION_HEIGHT, 18);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(BOARD_X, MISSION_Y, DESIGN_WIDTH - BOARD_X - 32, MISSION_HEIGHT, 18);
        this.missionContainer.add(panel);

        const title = this.add.text(BOARD_X + 24, MISSION_Y + 14, "SOPEP EMERGENCY RESPONSE", {
            fontFamily: FONT, fontStyle: "800", fontSize: 16, color: PRIMARY_BLUE_HEX,
        });
        const instructionText = this.add.text(BOARD_X + 24, MISSION_Y + 40, instruction, {
            fontFamily: FONT, fontStyle: "600", fontSize: 15, color: DARK_NAVY,
            wordWrap: { width: DESIGN_WIDTH - BOARD_X - 32 - 320 },
        });
        this.missionContainer.add([title, instructionText]);

        const stepNumber = this.stepNumberFor(this.stage);
        if (stepNumber > 0) {
            const stepLabel = this.add
                .text(DESIGN_WIDTH - 32 - 24, MISSION_Y + 20, `STEP ${stepNumber} / 5`, {
                    fontFamily: FONT, fontStyle: "800", fontSize: 15, color: PRIMARY_BLUE_HEX,
                })
                .setOrigin(1, 0);
            const dotsY = MISSION_Y + 48;
            const dotGap = 18;
            const dots = Array.from({ length: 5 }, (_, i) =>
                this.add.circle(DESIGN_WIDTH - 32 - 24 - (4 - i) * dotGap, dotsY, 5, i < stepNumber ? PRIMARY_BLUE : 0xdce6f5, 1),
            );
            this.missionContainer.add([stepLabel, ...dots]);
        }
    }

    private setFeedback(container: GameObjects.Container, x: number, y: number, width: number, message: string, color: string) {
        const bg = this.add.graphics();
        const text = this.add.text(0, 0, message, {
            fontFamily: FONT, fontStyle: "700", fontSize: 14, color, align: "center", wordWrap: { width: width - 40 },
        }).setOrigin(0.5);
        const boxWidth = Math.min(width, text.width + 48);
        const boxHeight = text.height + 24;
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, boxHeight / 2);
        bg.lineStyle(2, color === GREEN_HEX ? GREEN : RED, 1);
        bg.strokeRoundedRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, boxHeight / 2);
        text.setPosition(x, y);
        container.add([bg, text]);
    }

    // ---- Whiteboard chrome -------------------------------------------------------------

    private addWhiteboardChrome() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.92);
        card.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, 20);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, 20);
        this.boardContainer.add(card);
    }

    private computeEnvSpots(): EnvSpot[] {
        const cy = BOARD_Y + BOARD_HEIGHT * 0.4;
        return [
            { id: "drum", x: BOARD_X + BOARD_WIDTH * 0.16, y: cy, icon: "🛢️", label: "Drum Minyak" },
            { id: "valve", x: BOARD_X + BOARD_WIDTH * 0.38, y: cy - 20, icon: "🚰", label: "Valve" },
            { id: "pipe", x: BOARD_X + BOARD_WIDTH * 0.6, y: cy - 10, icon: "➖", label: "Transfer Pipe" },
            { id: "pump", x: BOARD_X + BOARD_WIDTH * 0.82, y: cy, icon: "⚙️", label: "Oil Pump" },
        ];
    }

    private drawScupperAndPuddle(puddleScale = 1) {
        const scupperX = BOARD_X + BOARD_WIDTH * 0.5;
        const scupperY = BOARD_Y + BOARD_HEIGHT * 0.78;

        if (puddleScale > 0) {
            const puddle = this.add.ellipse(BOARD_X + BOARD_WIDTH * 0.5, BOARD_Y + BOARD_HEIGHT * 0.58, 420 * puddleScale, 140 * puddleScale, 0x2b2b2b, 0.55);
            this.boardContainer.add(puddle);
        }

        const scupper = this.add.circle(scupperX, scupperY, 30, 0x5b6577, 1);
        scupper.setStrokeStyle(3, 0x2f3947, 1);
        const grate = this.add.text(scupperX, scupperY, "▦", { fontFamily: FONT, fontSize: 26, color: "#b8c2d0" }).setOrigin(0.5);
        const scupperLabel = this.add.text(scupperX, scupperY + 40, "SCUPPER", { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: DARK_NAVY }).setOrigin(0.5, 0);
        this.boardContainer.add([scupper, grate, scupperLabel]);
        return { x: scupperX, y: scupperY };
    }

    private drawEnvSpots(spots: EnvSpot[]) {
        spots.forEach((spot) => {
            const circle = this.add.circle(spot.x, spot.y, 44, 0xffffff, 1);
            circle.setStrokeStyle(3, PRIMARY_BLUE, 0.5);
            const icon = this.add.text(spot.x, spot.y, spot.icon, { fontFamily: FONT, fontSize: 34 }).setOrigin(0.5);
            const label = this.add.text(spot.x, spot.y + 54, spot.label, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: DARK_NAVY, align: "center" }).setOrigin(0.5, 0);
            circle.setData("spotId", spot.id);
            circle.setData("icon", icon);
            this.boardContainer.add([circle, icon, label]);
        });
    }

    private renderStage() {
        this.boardContainer.removeAll(true);
        this.checklistContainer.removeAll(true);
        this.buildChecklist();

        switch (this.stage) {
            case "INTRO":
                this.renderIntro();
                break;
            case "IDENTIFY_SOURCE":
                this.renderIdentify();
                break;
            case "STOP_SOURCE":
                this.renderStop();
                break;
            case "PROTECT_SCUPPER":
                this.renderProtectScupper();
                break;
            case "CONTAIN_SPILL":
            case "CLEAN_SPILL":
                this.renderKit();
                break;
            case "REPORT":
                this.renderReport();
                break;
            default:
                this.renderCaseComplete();
                break;
        }
    }

    // ---- Checklist sidebar -------------------------------------------------------------

    private checklistDoneCount(): number {
        const order: Stage[] = ["IDENTIFY_SOURCE", "STOP_SOURCE", "PROTECT_SCUPPER", "CLEAN_SPILL", "REPORT"];
        const currentIndex = order.indexOf(this.stage === "CONTAIN_SPILL" ? "PROTECT_SCUPPER" : this.stage);
        if (this.stage === "CASE_COMPLETE") return 5;
        if (currentIndex === -1) return 0;
        return currentIndex;
    }

    private buildChecklist() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.95);
        card.fillRoundedRect(CHECKLIST_X, BOARD_Y, CHECKLIST_WIDTH, BOARD_HEIGHT, 18);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(CHECKLIST_X, BOARD_Y, CHECKLIST_WIDTH, BOARD_HEIGHT, 18);
        this.checklistContainer.add(card);

        const title = this.add.text(CHECKLIST_X + 20, BOARD_Y + 20, "SOPEP RESPONSE\nCHECKLIST", {
            fontFamily: FONT, fontStyle: "800", fontSize: 14, color: PRIMARY_BLUE_HEX, lineSpacing: 4,
        });
        this.checklistContainer.add(title);

        const done = this.checklistDoneCount();
        let itemY = title.y + title.height + 20;
        SOPEP_CHECKLIST_LABELS.forEach((label, index) => {
            const isDone = index < done;
            const mark = this.add.text(CHECKLIST_X + 20, itemY, isDone ? "✓" : "○", {
                fontFamily: FONT, fontStyle: "700", fontSize: 15, color: isDone ? GREEN_HEX : "#94a3b8",
            });
            const text = this.add.text(CHECKLIST_X + 44, itemY, label, {
                fontFamily: FONT, fontStyle: "600", fontSize: 12, color: isDone ? DARK_NAVY : BODY_TEXT,
                wordWrap: { width: CHECKLIST_WIDTH - 60 },
            });
            this.checklistContainer.add([mark, text]);
            itemY += Math.max(30, text.height + 12);
        });

        const progressText = this.add.text(CHECKLIST_X + 20, BOARD_Y + BOARD_HEIGHT - 36, `${done} / 5`, {
            fontFamily: FONT, fontStyle: "800", fontSize: 16, color: DARK_NAVY,
        });
        this.checklistContainer.add(progressText);
    }

    // ---- INTRO -------------------------------------------------------------------------

    private renderIntro() {
        this.buildMissionPanel(`Tumpahan minyak terdeteksi di ${this.variant.position}. Lakukan tindakan penanganan sesuai prosedur.`);
        this.addWhiteboardChrome();

        const centerX = BOARD_X + BOARD_WIDTH / 2;
        const centerY = BOARD_Y + BOARD_HEIGHT / 2;
        const badge = this.add.text(centerX, centerY - 90, "⚠️", { fontFamily: FONT, fontSize: 56 }).setOrigin(0.5);
        const title = this.add
            .text(centerX, centerY - 20, `KASUS ${this.slot.id}: ${this.slot.title}`, { fontFamily: FONT, fontStyle: "800", fontSize: 26, color: DARK_NAVY, align: "center" })
            .setOrigin(0.5);
        const level = this.add
            .text(centerX, title.y + 40, `Level: ${this.slot.level}`, { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: PRIMARY_BLUE_HEX })
            .setOrigin(0.5);
        const desc = this.add
            .text(centerX, level.y + 34, this.slot.incidentType, { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: BODY_TEXT, align: "center", wordWrap: { width: 640 } })
            .setOrigin(0.5, 0);
        this.boardContainer.add([badge, title, level, desc]);

        const startButton = new Button(this, {
            x: centerX,
            y: desc.y + desc.height + 50,
            width: 260,
            height: 56,
            text: "Mulai Kasus →",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 16,
            borderRadius: 28,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        startButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.setStage("IDENTIFY_SOURCE");
        });
        this.boardContainer.add(startButton.view);
    }

    // ---- STEP 1: IDENTIFY_SOURCE --------------------------------------------------------

    private renderIdentify() {
        this.buildMissionPanel("Identifikasi sumber tumpahan minyak.");
        this.addWhiteboardChrome();
        this.drawScupperAndPuddle(0.9);
        this.envSpots = this.computeEnvSpots();
        this.drawEnvSpots(this.envSpots);

        this.boardContainer.list.forEach((child) => {
            if (child instanceof GameObjects.Arc && child.getData("spotId")) {
                child.setInteractive({ useHandCursor: true });
                child.on("pointerdown", () => this.handleIdentifyClick(child));
            }
        });
    }

    private handleIdentifyClick(circle: GameObjects.Arc) {
        const spotId = circle.getData("spotId") as SopepSourceId | "pump";
        const isCorrect = spotId === this.variant.sourceId;
        playSfx(this, SFX_KEYS.click);

        if (isCorrect) {
            circle.setStrokeStyle(4, GREEN, 1);
            this.setFeedback(this.boardContainer, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT - 60, BOARD_WIDTH - 80, "✓ Sumber tumpahan berhasil diidentifikasi.", GREEN_HEX);
            this.time.delayedCall(700, () => this.setStage("STOP_SOURCE"));
        } else {
            this.identifyMistakeMade = true;
            circle.setStrokeStyle(4, RED, 1);
            this.setFeedback(this.boardContainer, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT - 60, BOARD_WIDTH - 80, "Periksa kembali sumber keluarnya minyak.", RED_HEX);
            this.time.delayedCall(500, () => circle.setStrokeStyle(3, PRIMARY_BLUE, 0.5));
        }
    }

    // ---- STEP 2: STOP_SOURCE -------------------------------------------------------------

    private renderStop() {
        this.buildMissionPanel("Hentikan sumber tumpahan sebelum minyak menyebar.");
        this.addWhiteboardChrome();
        this.drawScupperAndPuddle(0.9);
        const spots = this.computeEnvSpots();
        this.drawEnvSpots(spots);
        this.sourceSpotCircle = this.boardContainer.list.find(
            (child) => child instanceof GameObjects.Arc && child.getData("spotId") === this.variant.sourceId,
        ) as GameObjects.Arc | undefined;

        const actions: { action: SopepStopAction; label: string }[] = [
            { action: "TUTUP_VALVE", label: "TUTUP VALVE" },
            { action: "MATIKAN_POMPA", label: "MATIKAN POMPA" },
            { action: "AMANKAN_AREA", label: "AMANKAN AREA" },
        ];
        const cardWidth = 220;
        const cardGap = 20;
        const startX = BOARD_X + BOARD_WIDTH / 2 - (cardWidth * 3 + cardGap * 2) / 2 + cardWidth / 2;
        const y = BOARD_Y + BOARD_HEIGHT - 90;

        actions.forEach((entry, index) => {
            const btn = new Button(this, {
                x: startX + index * (cardWidth + cardGap),
                y,
                width: cardWidth,
                height: 64,
                text: entry.label,
                fontFamily: FONT,
                fontStyle: "700",
                fontSize: 15,
                borderRadius: 14,
                fillColor: 0xffffff,
                strokeColor: PRIMARY_BLUE,
                strokeAlpha: 1,
                textColor: PRIMARY_BLUE_HEX,
            });
            btn.on("pointerdown", () => this.handleStopAction(entry.action));
            this.boardContainer.add(btn.view);
        });
    }

    private sourceSpotCircle?: GameObjects.Arc;

    private handleStopAction(action: SopepStopAction) {
        playSfx(this, SFX_KEYS.click);
        const isCorrect = action === this.variant.correctStopAction;

        if (isCorrect) {
            if (this.sourceSpotCircle) {
                if (action === "TUTUP_VALVE") {
                    this.tweens.add({ targets: this.sourceSpotCircle.getData("icon"), angle: 90, duration: 400 });
                } else {
                    this.tweens.add({ targets: this.sourceSpotCircle, alpha: 0.4, duration: 400 });
                }
            }
            this.setFeedback(this.boardContainer, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT - 150, BOARD_WIDTH - 80, "✓ Sumber tumpahan berhasil dihentikan.", GREEN_HEX);
            this.time.delayedCall(700, () => this.setStage("PROTECT_SCUPPER"));
        } else {
            this.stopMistakeMade = true;
            this.setFeedback(this.boardContainer, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT - 150, BOARD_WIDTH - 80, "Tindakan belum tepat, sumber masih mengalir.", RED_HEX);
        }
    }

    // ---- STEP 3: PROTECT_SCUPPER ---------------------------------------------------------

    private renderProtectScupper() {
        this.buildMissionPanel("Cegah minyak mencapai sistem drainase dan laut.");
        this.addWhiteboardChrome();
        const { x: scupperX, y: scupperY } = this.drawScupperAndPuddle(0.7);

        const invX = BOARD_X + 100;
        const invY = BOARD_Y + BOARD_HEIGHT - 120;
        const invBg = this.add.circle(invX, invY, 44, 0xffffff, 1);
        invBg.setStrokeStyle(2, PRIMARY_BLUE, 0.5);
        const plug = this.add.text(invX, invY, "🧱", { fontFamily: FONT, fontSize: 34 }).setOrigin(0.5).setInteractive({ useHandCursor: true, draggable: true });
        const invLabel = this.add.text(invX, invY + 52, "SCUPPER PLUG", { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: DARK_NAVY }).setOrigin(0.5, 0);
        this.boardContainer.add([invBg, plug, invLabel]);

        const originX = invX;
        const originY = invY;
        plug.on("dragstart", (pointer: Phaser.Input.Pointer) => {
            this.boardContainer.bringToTop(plug);
            plug.setData("offsetX", this.toDesignX(pointer.worldX) - plug.x);
            plug.setData("offsetY", this.toDesignY(pointer.worldY) - plug.y);
        });
        plug.on("drag", (pointer: Phaser.Input.Pointer) => {
            plug.setPosition(
                this.toDesignX(pointer.worldX) - plug.getData("offsetX"),
                this.toDesignY(pointer.worldY) - plug.getData("offsetY"),
            );
        });
        plug.on("dragend", () => {
            const distance = Math.hypot(plug.x - scupperX, plug.y - scupperY);
            if (distance < 60) {
                plug.disableInteractive();
                this.tweens.add({ targets: plug, x: scupperX, y: scupperY, duration: 180 });
                this.setFeedback(this.boardContainer, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT - 40, BOARD_WIDTH - 80, "✓ Scupper berhasil diamankan.", GREEN_HEX);
                this.time.delayedCall(700, () => this.setStage("CONTAIN_SPILL"));
            } else {
                this.tweens.add({ targets: plug, x: originX, y: originY, duration: 220, ease: "Back.Out" });
            }
        });
    }

    // ---- STEP 4: CONTAIN_SPILL + CLEAN_SPILL (SOPEP KIT, in order) -----------------------

    private renderKit() {
        const remainingLabel = SOPEP_KIT_ITEMS[this.kitStepIndex]?.label ?? "";
        this.buildMissionPanel(
            this.stage === "CONTAIN_SPILL"
                ? "Gunakan Absorbent Boom untuk membatasi area tumpahan."
                : `Lanjutkan penanganan dengan ${remainingLabel}.`,
        );
        this.addWhiteboardChrome();
        const puddleScale = 0.9 - this.kitStepIndex * 0.2;
        const puddleZone = { x: BOARD_X + BOARD_WIDTH * 0.5, y: BOARD_Y + BOARD_HEIGHT * 0.5 };
        this.drawScupperAndPuddle(Math.max(puddleScale, 0));

        const trayY = BOARD_Y + BOARD_HEIGHT - 110;
        const gap = 160;
        const startX = BOARD_X + BOARD_WIDTH / 2 - (gap * (SOPEP_KIT_ITEMS.length - 1)) / 2;

        SOPEP_KIT_ITEMS.forEach((item, index) => {
            if (index < this.kitStepIndex) return;
            const x = startX + index * gap;
            const bg = this.add.circle(x, trayY, 40, 0xffffff, 1);
            bg.setStrokeStyle(2, index === this.kitStepIndex ? PRIMARY_BLUE : 0xdce6f5, index === this.kitStepIndex ? 1 : 0.7);
            const icon = this.add
                .text(x, trayY, item.icon, { fontFamily: FONT, fontSize: 30 })
                .setOrigin(0.5);
            const label = this.add.text(x, trayY + 50, item.label, { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: DARK_NAVY, align: "center" }).setOrigin(0.5, 0);
            this.boardContainer.add([bg, icon, label]);

            if (index === this.kitStepIndex) {
                icon.setInteractive({ useHandCursor: true, draggable: true });
                const originX = x;
                const originY = trayY;
                icon.on("dragstart", (pointer: Phaser.Input.Pointer) => {
                    this.boardContainer.bringToTop(icon);
                    icon.setData("offsetX", this.toDesignX(pointer.worldX) - icon.x);
                    icon.setData("offsetY", this.toDesignY(pointer.worldY) - icon.y);
                });
                icon.on("drag", (pointer: Phaser.Input.Pointer) => {
                    icon.setPosition(
                        this.toDesignX(pointer.worldX) - icon.getData("offsetX"),
                        this.toDesignY(pointer.worldY) - icon.getData("offsetY"),
                    );
                });
                icon.on("dragend", () => {
                    const distance = Math.hypot(icon.x - puddleZone.x, icon.y - puddleZone.y);
                    if (distance < 220) {
                        this.handleKitItemPlaced(item.id);
                    } else {
                        this.tweens.add({ targets: icon, x: originX, y: originY, duration: 220, ease: "Back.Out" });
                    }
                });
            }
        });
    }

    private handleKitItemPlaced(itemId: string) {
        playSfx(this, SFX_KEYS.click);
        this.kitStepIndex++;
        const isLast = this.kitStepIndex >= SOPEP_KIT_ITEMS.length;
        this.setFeedback(
            this.boardContainer,
            BOARD_X + BOARD_WIDTH / 2,
            BOARD_Y + BOARD_HEIGHT - 40,
            BOARD_WIDTH - 80,
            isLast ? "✓ Tumpahan berhasil dikendalikan dan dibersihkan." : `✓ ${itemId.toUpperCase()} digunakan dengan tepat.`,
            GREEN_HEX,
        );
        if (isLast) {
            this.time.delayedCall(700, () => this.setStage("REPORT"));
        } else {
            this.time.delayedCall(500, () => this.setStage("CLEAN_SPILL"));
        }
    }

    // ---- STEP 5: REPORT -------------------------------------------------------------------

    private renderReport() {
        this.buildMissionPanel("Lengkapi laporan kejadian sebelum kasus dinyatakan selesai.");
        this.addWhiteboardChrome();

        const panelWidth = 760;
        const panelX = BOARD_X + BOARD_WIDTH / 2 - panelWidth / 2;
        const panelY = BOARD_Y + 30;
        const panelHeight = BOARD_HEIGHT - 130;
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 1);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
        panel.lineStyle(2, PRIMARY_BLUE, 0.5);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
        const heading = this.add.text(panelX + 24, panelY + 18, "LAPORAN KEJADIAN SOPEP", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: DARK_NAVY });
        this.boardContainer.add([panel, heading]);

        const fields: [string, string][] = [
            ["Waktu Kejadian", new Date().toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"],
            ["Posisi / Lokasi", this.variant.position],
            ["Jenis Kejadian", this.slot.incidentType],
            ["Perkiraan Jumlah Tumpahan", `${this.variant.spillAmountLiters} Liter`],
            ["Tindakan yang Dilakukan", `${STOP_ACTION_LABEL[this.variant.correctStopAction]} & Penanganan SOPEP Kit`],
            ["Bantuan yang Dibutuhkan", "Tidak ada"],
        ];
        let fieldY = heading.y + heading.height + 20;
        const colWidth = (panelWidth - 48) / 2;
        fields.forEach(([label, value], index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = panelX + 24 + col * colWidth;
            const y = fieldY + row * 74;
            const labelText = this.add.text(x, y, label, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: PRIMARY_BLUE_HEX });
            const valueBg = this.add.rectangle(x, y + 24, colWidth - 24, 34, SKY, 1).setOrigin(0, 0);
            const valueText = this.add.text(x + 10, y + 24 + 17, value, {
                fontFamily: FONT, fontStyle: "600", fontSize: 13, color: DARK_NAVY, wordWrap: { width: colWidth - 44 },
            }).setOrigin(0, 0.5);
            this.boardContainer.add([labelText, valueBg, valueText]);
        });

        const statusY = fieldY + Math.ceil(fields.length / 2) * 74;
        const statusLabel = this.add.text(panelX + 24, statusY, "Status", { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: PRIMARY_BLUE_HEX });
        const statusBadge = this.add.graphics();
        statusBadge.fillStyle(GREEN, 1);
        statusBadge.fillRoundedRect(panelX + 24, statusY + 22, 150, 34, 17);
        const statusText = this.add.text(panelX + 24 + 75, statusY + 39, "TERKENDALI", { fontFamily: FONT, fontStyle: "800", fontSize: 13, color: "#ffffff" }).setOrigin(0.5);
        this.boardContainer.add([statusLabel, statusBadge, statusText]);

        const sendButton = new Button(this, {
            x: panelX + panelWidth - 130,
            y: statusY + 39,
            width: 220,
            height: 52,
            text: "KIRIM LAPORAN",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 14,
            borderRadius: 26,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        sendButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            sendButton.view.disableInteractive();
            this.setFeedback(this.boardContainer, BOARD_X + BOARD_WIDTH / 2, panelY + panelHeight + 40, BOARD_WIDTH - 80, "✓ Laporan kejadian berhasil dicatat.", GREEN_HEX);
            this.caseScores.push({
                identifyFirstTry: !this.identifyMistakeMade,
                stopFirstTry: !this.stopMistakeMade,
                kitOrderCorrect: !this.kitMistakeMade,
                reportSubmitted: true,
            });
            this.time.delayedCall(900, () => this.setStage("CASE_COMPLETE"));
        });
        this.boardContainer.add(sendButton.view);
    }

    // ---- CASE_COMPLETE ---------------------------------------------------------------------

    private renderCaseComplete() {
        this.buildMissionPanel(`Kasus ${this.slot.id} selesai ditangani.`);
        this.addWhiteboardChrome();

        const centerX = BOARD_X + BOARD_WIDTH / 2;
        const centerY = BOARD_Y + BOARD_HEIGHT / 2;
        const badge = this.add.circle(centerX, centerY - 90, 44, GREEN, 1);
        const badgeIcon = this.add.text(centerX, centerY - 90, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 40, color: "#ffffff" }).setOrigin(0.5);
        const title = this.add.text(centerX, centerY - 20, `KASUS ${this.slot.id} SELESAI`, { fontFamily: FONT, fontStyle: "800", fontSize: 24, color: DARK_NAVY }).setOrigin(0.5);
        this.boardContainer.add([badge, badgeIcon, title]);

        const isLastCase = this.caseIndex >= SOPEP_CASE_SLOTS.length - 1;
        const nextButton = new Button(this, {
            x: centerX,
            y: title.y + 70,
            width: 320,
            height: 56,
            text: isLastCase ? "Lihat Hasil & Umpan Balik →" : "Lanjut ke Kasus Berikutnya →",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: 28,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        nextButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            if (isLastCase) {
                this.goTo("SopepHasilUmpanBalik", { caseScores: this.caseScores });
            } else {
                this.startCase(this.caseIndex + 1);
            }
        });
        this.boardContainer.add(nextButton.view);
    }

    // ---- Layout -------------------------------------------------------------------------

    private toDesignX(screenX: number) {
        return (screenX - this.currentRootX) / this.currentScale;
    }

    private toDesignY(screenY: number) {
        return (screenY - this.currentRootY) / this.currentScale;
    }

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        this.currentScale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.currentRootX = (width - DESIGN_WIDTH * this.currentScale) / 2;
        this.currentRootY = (height - DESIGN_HEIGHT * this.currentScale) / 2;
        this.root.setScale(this.currentScale);
        this.root.setPosition(this.currentRootX, this.currentRootY);
    }
}
