import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import {
    computeAccuracyPercent,
    SOPEP_CONTAINMENT_PHASES,
    SOPEP_CONTAINMENT_TRAY_ITEM_IDS,
    SOPEP_DOCUMENTATION_CHECKLIST,
    SOPEP_DOCUMENT_CARDS,
    SOPEP_EQUIPMENT_ITEMS,
    SOPEP_IDENTIFICATION_FIELDS,
    SOPEP_IDENTIFY_HOTSPOTS,
    SOPEP_MISSION_SCENARIO,
    SOPEP_MISSION_TARGETS,
    SOPEP_PROGRESS_LABELS,
    SOPEP_REPORT_FIELDS,
    SopepContainmentPhase,
    SopepHotspot,
    SopepMissionResult,
} from "./SopepSimulatorData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const RED = 0xc0392b;
const RED_HEX = "#c0392b";
const AMBER = 0xe0792e;
const AMBER_HEX = "#b5651d";
const SKY = 0xeaf3ff;

const HEADER_Y = 32;
const HEADER_HEIGHT = 56;
const MISSION_Y = 108;
const MISSION_HEIGHT = 84;
const PROGRESS_Y = MISSION_Y + MISSION_HEIGHT + 14;
const PROGRESS_HEIGHT = 36;
const BOARD_X = 32;
const BOARD_WIDTH = DESIGN_WIDTH - BOARD_X * 2;
const FOOTER_MARGIN = 32;
const BOARD_Y_WITH_PROGRESS = PROGRESS_Y + PROGRESS_HEIGHT + 14;
const BOARD_Y_PLAIN = MISSION_Y + MISSION_HEIGHT + 20;

type Stage = "BRIEFING" | "INCIDENT" | "IDENTIFY" | "REPORT" | "EQUIPMENT" | "CONTAINMENT" | "DOCUMENTATION";

const STEP_STAGE_ORDER: Stage[] = ["IDENTIFY", "REPORT", "EQUIPMENT", "CONTAINMENT", "DOCUMENTATION"];

interface DropZoneState {
    phaseIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    graphics: GameObjects.Graphics;
    innerText: GameObjects.Text;
    captionText: GameObjects.Text;
    completed: boolean;
}

/**
 * SOPEP Emergency Response Simulator — a single linear mission (briefing ->
 * incident -> 5 numbered steps -> result) reached after SopepMateri finishes.
 * Replaces the old 3-case randomized engine: one mission, one scoring model
 * (SopepMissionResult), handed off to SopepHasilUmpanBalik on completion.
 */
export class SopepSimulator extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private missionContainer!: GameObjects.Container;
    private progressContainer!: GameObjects.Container;
    private boardContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private stage: Stage = "BRIEFING";
    private mistakeCount = 0;

    private identifyFound = new Set<string>();
    private activeHotspotId: string | null = null;
    private hotspotActiveId: string | null = null;
    private identifySelections: Record<string, string> = {};
    private identifyOpenFieldId: string | null = null;
    private identifyWarningFields = new Set<string>();
    private identifyFeedback: { message: string; tone: "warning" | "error" | "success" } | null = null;
    private identificationComplete = false;
    private identifyFormVisible = false;

    private reportSelections: Record<string, number> = {};

    private equipmentSelected = new Set<string>();

    private containmentPhaseIndex = 0;
    private dropZones: DropZoneState[] = [];
    private spillVisual?: GameObjects.Ellipse;

    private documentsSelected = new Set<string>();

    private currentScale = 1;
    private currentRootX = 0;
    private currentRootY = 0;

    constructor() {
        super("SopepSimulator");
    }

    create() {
        this.background = this.add.image(0, 0, "soped.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());

        this.missionContainer = this.add.container(0, 0);
        this.root.add(this.missionContainer);
        groups.push([this.missionContainer]);

        this.progressContainer = this.add.container(0, 0);
        this.root.add(this.progressContainer);
        groups.push([this.progressContainer]);

        this.boardContainer = this.add.container(0, 0);
        this.root.add(this.boardContainer);
        groups.push([this.boardContainer]);

        this.transitionGroups = groups;

        this.restartMission();

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
        const navButtons = new HomeBackButtons(this, {
            x: 32,
            y: HEADER_Y,
            size: HEADER_HEIGHT,
            onHome: () => this.goTo("MainMenu"),
            onBack: () => this.goTo("SopepMateri"),
        });

        const crumbX = 32 + navButtons.width + 16;
        const centerY = HEADER_Y + HEADER_HEIGHT / 2;
        const badgeText = this.add.text(0, 0, "MODUL SOPEP", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 44;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Simulasi Administrasi SOPEP", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
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

        this.root.add([navButtons.view, breadcrumb, badgeText, chevron, label]);
    }

    // ---- Mission lifecycle -----------------------------------------------------------

    private restartMission() {
        this.mistakeCount = 0;
        this.identifyFound.clear();
        this.activeHotspotId = null;
        this.hotspotActiveId = null;
        this.identifySelections = {};
        this.identifyOpenFieldId = null;
        this.identifyWarningFields.clear();
        this.identifyFeedback = null;
        this.identificationComplete = false;
        this.identifyFormVisible = false;
        this.reportSelections = {};
        this.equipmentSelected.clear();
        this.containmentPhaseIndex = 0;
        this.dropZones = [];
        this.spillVisual = undefined;
        this.documentsSelected.clear();
        this.setStage("INCIDENT");
    }

    private setStage(stage: Stage) {
        this.stage = stage;
        this.renderStage();
    }

    private boardTop(): number {
        return STEP_STAGE_ORDER.includes(this.stage) ? BOARD_Y_WITH_PROGRESS : BOARD_Y_PLAIN;
    }

    private boardHeight(): number {
        return DESIGN_HEIGHT - this.boardTop() - FOOTER_MARGIN;
    }

    private renderStage() {
        this.missionContainer.removeAll(true);
        this.progressContainer.removeAll(true);
        this.boardContainer.removeAll(true);
        this.dropZones = [];
        this.spillVisual = undefined;

        switch (this.stage) {
            case "BRIEFING":
                this.createMissionBriefing();
                break;
            case "INCIDENT":
                this.createIncidentScene();
                break;
            case "IDENTIFY":
                this.createIdentificationStepV2();
                break;
            case "REPORT":
                this.createReportingStep();
                break;
            case "EQUIPMENT":
                this.createEquipmentSelectionStep();
                break;
            case "CONTAINMENT":
                this.createContainmentStep();
                break;
            case "DOCUMENTATION":
                this.createDocumentationStep();
                break;
        }
    }

    // ---- Shared chrome ----------------------------------------------------------------

    private buildMissionPanel(title: string, instruction: string) {
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.95);
        panel.fillRoundedRect(BOARD_X, MISSION_Y, BOARD_WIDTH, MISSION_HEIGHT, 18);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(BOARD_X, MISSION_Y, BOARD_WIDTH, MISSION_HEIGHT, 18);
        this.missionContainer.add(panel);

        const titleText = this.add.text(BOARD_X + 24, MISSION_Y + 14, title, {
            fontFamily: FONT, fontStyle: "800", fontSize: 17, color: PRIMARY_BLUE_HEX,
        });
        const instructionText = this.add.text(BOARD_X + 24, MISSION_Y + 42, instruction, {
            fontFamily: FONT, fontStyle: "600", fontSize: 14, color: DARK_NAVY, wordWrap: { width: BOARD_WIDTH - 48 },
        });
        this.missionContainer.add([titleText, instructionText]);
    }

    private updateMissionProgress() {
        const activeIndex = STEP_STAGE_ORDER.indexOf(this.stage);
        if (activeIndex === -1) return;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.95);
        card.fillRoundedRect(BOARD_X, PROGRESS_Y - 12, BOARD_WIDTH, PROGRESS_HEIGHT + 24, 16);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(BOARD_X, PROGRESS_Y - 12, BOARD_WIDTH, PROGRESS_HEIGHT + 24, 16);
        this.progressContainer.add(card);

        const padX = 24;
        const title = this.add.text(BOARD_X + padX, PROGRESS_Y, "PENANGANAN TUMPAHAN", {
            fontFamily: FONT, fontStyle: "700", fontSize: 12, color: BODY_TEXT,
        });
        this.progressContainer.add(title);

        const rowY = PROGRESS_Y + 20;
        const gap = 240;
        const startX = BOARD_X + padX;
        SOPEP_PROGRESS_LABELS.forEach((label, index) => {
            const mark = index < activeIndex ? "✓" : index === activeIndex ? "●" : "○";
            const color = index < activeIndex ? GREEN_HEX : index === activeIndex ? PRIMARY_BLUE_HEX : "#94a3b8";
            const x = startX + index * gap;
            const markText = this.add.text(x, rowY, mark, { fontFamily: FONT, fontStyle: "700", fontSize: 15, color });
            const labelText = this.add.text(x + 22, rowY, label, {
                fontFamily: FONT, fontStyle: index === activeIndex ? "700" : "600", fontSize: 13, color: index === activeIndex ? DARK_NAVY : BODY_TEXT,
            });
            this.progressContainer.add([markText, labelText]);

            const completed = index < activeIndex || (this.stage === "IDENTIFY" && this.identificationComplete && index === 0);
            if (completed) {
                const check = this.add.text(x, rowY, "✓", { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: GREEN_HEX });
                this.progressContainer.add(check);
            }
            if (index < SOPEP_PROGRESS_LABELS.length - 1) {
                const connector = this.add.graphics();
                connector.lineStyle(3, completed ? GREEN : BORDER_BLUE, 1);
                connector.lineBetween(x + 18, rowY + 8, x + gap - 8, rowY + 8);
                this.progressContainer.add(connector);
            }
        });
    }

    private addWhiteboardChrome() {
        const top = this.boardTop();
        const height = this.boardHeight();
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.92);
        card.fillRoundedRect(BOARD_X, top, BOARD_WIDTH, height, 20);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(BOARD_X, top, BOARD_WIDTH, height, 20);
        this.boardContainer.add(card);
    }

    private showCorrectFeedback(message: string) {
        this.setFeedback(`✓ ${message}`, GREEN_HEX, GREEN);
    }

    private showWrongFeedback(message: string) {
        this.setFeedback(message, RED_HEX, RED);
    }

    private showCautionFeedback(message: string) {
        this.setFeedback(message, AMBER_HEX, AMBER);
    }

    private setFeedback(message: string, colorHex: string, colorNum: number) {
        const top = this.boardTop();
        const height = this.boardHeight();
        const x = BOARD_X + BOARD_WIDTH / 2;
        const y = top + height - 34;
        const width = BOARD_WIDTH - 100;

        const text = this.add.text(0, 0, message, {
            fontFamily: FONT, fontStyle: "700", fontSize: 14, color: colorHex, align: "center", wordWrap: { width: width - 40 },
        }).setOrigin(0.5);
        const boxWidth = Math.min(width, text.width + 48);
        const boxHeight = text.height + 22;
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, boxHeight / 2);
        bg.lineStyle(2, colorNum, 1);
        bg.strokeRoundedRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, boxHeight / 2);
        text.setPosition(x, y);
        this.boardContainer.add([bg, text]);
    }

    private completeStep(nextStage: Stage, delay = 800) {
        this.time.delayedCall(delay, () => this.setStage(nextStage));
    }

    // ---- Placeholder + drop-zone helpers (Sections O & P) ------------------------------

    /** Empty bordered slot for equipment/document PNGs the user will supply
     * later — falls back to a generic placeholder glyph when `assetKey`
     * isn't loaded yet. Label is always rendered BELOW the box. Returns the
     * total height consumed (box + gap + label) for stacking layouts. */
    private createAssetPlaceholder(x: number, y: number, width: number, height: number, label: string, assetKey?: string): number {
        const radius = 14;

        if (assetKey && this.textures.exists(assetKey)) {
            const image = this.add.image(x + width / 2, y + height / 2, assetKey);
            const scale = Math.min(width / image.width, height / image.height);
            image.setScale(scale);
            this.boardContainer.add(image);
        } else {
            const box = this.add.graphics();
            box.fillStyle(0xffffff, 0.5);
            box.fillRoundedRect(x, y, width, height, radius);
            box.lineStyle(2, BORDER_BLUE, 0.6);
            box.strokeRoundedRect(x, y, width, height, radius);

            const cx = x + width / 2;
            const cy = y + height / 2;
            const glyphSize = Math.min(width, height) * 0.28;
            const glyph = this.add.graphics();
            glyph.lineStyle(2, PRIMARY_BLUE, 0.45);
            glyph.strokeRoundedRect(cx - glyphSize / 2, cy - glyphSize / 2, glyphSize, glyphSize, 4);
            const plusSize = glyphSize * 0.42;
            glyph.beginPath();
            glyph.moveTo(cx - plusSize / 2, cy);
            glyph.lineTo(cx + plusSize / 2, cy);
            glyph.moveTo(cx, cy - plusSize / 2);
            glyph.lineTo(cx, cy + plusSize / 2);
            glyph.strokePath();

            this.boardContainer.add([box, glyph]);
        }

        const labelText = this.add
            .text(x + width / 2, y + height + 10, label.toUpperCase(), {
                fontFamily: FONT, fontStyle: "600", fontSize: 12, color: DARK_NAVY, align: "center", wordWrap: { width },
            })
            .setOrigin(0.5, 0);
        this.boardContainer.add(labelText);

        return height + 10 + labelText.height;
    }

    /** Draggable equivalent of createAssetPlaceholder — used by Step 4's
     * tray, where the box itself must be the interactive/draggable object.
     * The label is drawn once at the tray's resting position and does not
     * move with the icon (matching the app's existing drag-item convention). */
    private createDraggableAssetIcon(x: number, y: number, size: number, assetKey?: string): GameObjects.Container {
        const container = this.add.container(x, y);
        const box = this.add.graphics();
        box.fillStyle(0xffffff, 0.7);
        box.fillRoundedRect(-size / 2, -size / 2, size, size, 12);
        box.lineStyle(2, PRIMARY_BLUE, 0.6);
        box.strokeRoundedRect(-size / 2, -size / 2, size, size, 12);
        container.add(box);

        if (assetKey && this.textures.exists(assetKey)) {
            const image = this.add.image(0, 0, assetKey);
            const scale = Math.min((size - 16) / image.width, (size - 16) / image.height);
            image.setScale(scale);
            container.add(image);
        } else {
            const glyphSize = size * 0.32;
            const glyph = this.add.graphics();
            glyph.lineStyle(2, PRIMARY_BLUE, 0.5);
            glyph.strokeRoundedRect(-glyphSize / 2, -glyphSize / 2, glyphSize, glyphSize, 4);
            container.add(glyph);
        }

        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true, draggable: true });
        this.boardContainer.add(container);
        return container;
    }

    /** Empty dashed-look drop target — visually distinct from
     * createAssetPlaceholder (used for the source asset tray), with an
     * inner "LETAKKAN KOMPONEN DI SINI" prompt and a caption naming the
     * area below. Returns the Graphics so callers can re-draw it in the
     * green/red hover states during drag. */
    private createDropZone(x: number, y: number, width: number, height: number, caption: string): DropZoneState {
        const graphics = this.add.graphics();
        const innerText = this.add
            .text(x + width / 2, y + height / 2, "LETAKKAN KOMPONEN\nDI SINI", {
                fontFamily: FONT, fontStyle: "600", fontSize: 12, color: BODY_TEXT, align: "center", lineSpacing: 2,
            })
            .setOrigin(0.5);
        const captionText = this.add
            .text(x + width / 2, y + height + 10, caption, { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: DARK_NAVY, align: "center" })
            .setOrigin(0.5, 0);
        this.boardContainer.add([graphics, innerText, captionText]);

        const zone: DropZoneState = { phaseIndex: -1, x, y, width, height, graphics, innerText, captionText, completed: false };
        this.drawDropZoneState(zone, "neutral");
        return zone;
    }

    private drawDropZoneState(zone: DropZoneState, state: "neutral" | "valid" | "invalid") {
        const strokeColor = state === "valid" ? GREEN : state === "invalid" ? RED : PRIMARY_BLUE;
        const strokeAlpha = state === "neutral" ? 0.45 : 0.9;
        zone.graphics.clear();
        zone.graphics.fillStyle(0xffffff, 0.35);
        zone.graphics.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 14);
        zone.graphics.lineStyle(2, strokeColor, strokeAlpha);
        zone.graphics.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 14);
    }

    // ---- BRIEFING (Section B) ----------------------------------------------------------

    private createMissionBriefing() {
        this.buildMissionPanel("SIMULASI SOPEP", "PENANGANAN INSIDEN TUMPAHAN MINYAK");
        this.addWhiteboardChrome();

        const top = this.boardTop();
        const contentX = BOARD_X + 60;
        const contentWidth = BOARD_WIDTH - 120;

        const scenarioTitle = this.add.text(contentX, top + 40, "SKENARIO MISI", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: PRIMARY_BLUE_HEX });
        const scenarioBody = this.add.text(contentX, scenarioTitle.y + scenarioTitle.height + 12, SOPEP_MISSION_SCENARIO, {
            fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: contentWidth },
        });
        this.boardContainer.add([scenarioTitle, scenarioBody]);

        const targetTitleY = scenarioBody.y + scenarioBody.height + 30;
        const targetTitle = this.add.text(contentX, targetTitleY, "TARGET MISI", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: PRIMARY_BLUE_HEX });
        this.boardContainer.add(targetTitle);

        let itemY = targetTitle.y + targetTitle.height + 14;
        SOPEP_MISSION_TARGETS.forEach((target) => {
            const mark = this.add.text(contentX, itemY, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: GREEN_HEX });
            const label = this.add.text(contentX + 26, itemY, target.label, { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: DARK_NAVY });
            this.boardContainer.add([mark, label]);
            itemY += 34;
        });

        const startButton = new Button(this, {
            x: BOARD_X + BOARD_WIDTH / 2,
            y: this.boardTop() + this.boardHeight() - 60,
            width: 280,
            height: 58,
            text: "MULAI SIMULASI",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 16,
            borderRadius: 29,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        startButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.setStage("INCIDENT");
        });
        this.boardContainer.add(startButton.view);
    }

    // ---- INCIDENT (Section C) ------------------------------------------------------------

    private createIncidentScene() {
        this.buildMissionPanel("STEP 1 — IDENTIFIKASI INSIDEN", "Periksa kondisi kejadian dan identifikasi informasi awal sebelum melakukan tindakan penanganan.");
        this.addWhiteboardChrome();

        const top = this.boardTop();
        const illustX = BOARD_X + 60;
        const illustY = top + 40;
        const illustW = Math.round(BOARD_WIDTH * 0.56);
        const illustH = this.boardHeight() - 160;
        this.createIncidentDeck(illustX, illustY, illustW, illustH, false);

        const panelX = illustX + illustW + 50;
        const panelW = BOARD_X + BOARD_WIDTH - 60 - panelX;
        const panelY = illustY;
        const panel = this.add.graphics();
        panel.fillStyle(SKY, 1);
        panel.fillRoundedRect(panelX, panelY, panelW, 240, 16);
        panel.lineStyle(2, PRIMARY_BLUE, 0.5);
        panel.strokeRoundedRect(panelX, panelY, panelW, 240, 16);
        const panelTitle = this.add.text(panelX + 22, panelY + 18, "MULAI PEMERIKSAAN", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: PRIMARY_BLUE_HEX });
        this.boardContainer.add([panel, panelTitle]);

        const rows: [string, string][] = [
            ["1", "Amati area kejadian"],
            ["2", "Identifikasi sumber dan pencemar"],
            ["3", "Catat kondisi awal tumpahan"],
        ];
        let rowY = panelTitle.y + panelTitle.height + 18;
        rows.forEach(([label, value]) => {
            const labelText = this.add.text(panelX + 22, rowY, label, { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: PRIMARY_BLUE_HEX });
            const valueText = this.add.text(panelX + 52, rowY, value, { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: DARK_NAVY });
            this.boardContainer.add([labelText, valueText]);
            rowY += 34;
        });

        const noteText = this.add.text(panelX + 22, rowY + 8, "Belum ada tindakan penanganan pada tahap ini.", {
            fontFamily: FONT, fontStyle: "500", fontSize: 13, color: BODY_TEXT, wordWrap: { width: panelW - 44 }, lineSpacing: 4,
        });
        this.boardContainer.add(noteText);

        const startButton = new Button(this, {
            x: panelX + panelW / 2,
            y: panelY + 240 + 70,
            width: panelW,
            height: 56,
            text: "MULAI IDENTIFIKASI →",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: 28,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        startButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.setStage("IDENTIFY");
        });
        this.boardContainer.add(startButton.view);
    }

    // ---- STEP 1: IDENTIFY (Section D) ----------------------------------------------------

    // ---- STEP 1: identification form (current learning flow) -----------------------------

    private createIdentificationStepV2() {
        this.buildMissionPanel(
            "STEP 1 — IDENTIFIKASI INSIDEN",
            "Periksa kondisi kejadian dan identifikasi informasi awal sebelum melakukan tindakan penanganan.",
        );
        this.updateMissionProgress();
        this.addWhiteboardChrome();

        if (!this.identifyFormVisible) {
            this.createStepOneInspectionScreen();
            return;
        }

        const top = this.boardTop();
        const pad = 28;
        const visualX = BOARD_X + pad;
        const visualY = top + pad;
        const visualW = Math.round((BOARD_WIDTH - pad * 3) * 0.6);
        const visualH = 520;
        const formX = visualX + visualW + pad;
        const formW = BOARD_X + BOARD_WIDTH - pad - formX;

        this.createIncidentDeck(visualX, visualY, visualW, visualH, true);
        this.createInspectionChecklist(visualX, visualY + visualH + 16, visualW);
        this.createIdentificationForm(formX, visualY, formW, 680);
    }

    /** The first visible state follows the reference layout: a large deck
     * inspection scene, labelled visual prompts, and one compact status
     * panel. The form appears only after all visual checks are completed. */
    private createStepOneInspectionScreen() {
        const top = this.boardTop();
        const pad = 28;
        const panelW = 450;
        const visualX = BOARD_X + pad;
        const visualY = top + pad;
        const visualW = BOARD_WIDTH - panelW - pad * 3;
        const visualH = this.boardHeight() - pad * 2;
        const panelX = visualX + visualW + pad;

        this.createIncidentDeck(visualX, visualY, visualW, visualH, true, true);
        this.createEmergencyInspectionPanel(panelX, visualY, panelW, visualH);
    }

    /** Composes the deck from keyed assets so another incident can replace
     * individual environment objects without changing its interaction logic. */
    private createIncidentDeck(x: number, y: number, width: number, height: number, showHotspots: boolean, showCallouts = false) {
        const frame = this.add.graphics();
        frame.fillStyle(0xffffff, 1);
        frame.fillRoundedRect(x, y, width, height, 18);
        frame.lineStyle(2, BORDER_BLUE, 1);
        frame.strokeRoundedRect(x, y, width, height, 18);
        this.boardContainer.add(frame);

        const inset = 14;
        const assetX = x + inset;
        const assetY = y + inset;
        const assetW = width - inset * 2;
        const assetH = height - inset * 2;
        this.addIncidentAsset("sopep.bg.mainDeck", assetX, assetY, assetW, assetH);
        this.addIncidentAsset("sopep.env.pipeLeak", assetX + assetW * 0.68, assetY + assetH * 0.35, assetW * 0.2, assetH * 0.19);
        this.addIncidentAsset("sopep.spill.medium", assetX + assetW * 0.43, assetY + assetH * 0.57, assetW * 0.22, assetH * 0.14);
        this.addIncidentAsset("sopep.env.scupper", assetX + assetW * 0.12, assetY + assetH * 0.7, assetW * 0.13, assetH * 0.12);
        this.addIncidentAsset("sopep.env.fuelDrum", assetX + assetW * 0.08, assetY + assetH * 0.38, assetW * 0.12, assetH * 0.27);
        this.addIncidentAsset("sopep.env.lifebuoy", assetX + assetW * 0.88, assetY + assetH * 0.68, assetW * 0.11, assetH * 0.2);

        if (!showHotspots) return;
        SOPEP_IDENTIFY_HOTSPOTS.forEach((hotspot) => {
            this.createInspectionHotspot(hotspot, assetX + hotspot.xFrac * assetW, assetY + hotspot.yFrac * assetH);
        });
        if (showCallouts) {
            this.createInspectionCallouts(assetX, assetY, assetW, assetH);
        } else {
            this.createObservationCard(x + 22, y + height - 132, Math.min(width - 44, 560), 110);
        }
    }

    private createInspectionCallouts(x: number, y: number, width: number, height: number) {
        const offsets: Record<string, { x: number; y: number }> = {
            pollutant: { x: 80, y: -130 },
            source: { x: 72, y: -132 },
            condition: { x: -92, y: -132 },
            scupper: { x: -36, y: -126 },
            location: { x: -278, y: -134 },
        };
        const calloutW = 232;
        const calloutH = 82;

        SOPEP_IDENTIFY_HOTSPOTS.forEach((hotspot) => {
            const targetX = x + hotspot.xFrac * width;
            const targetY = y + hotspot.yFrac * height;
            const offset = offsets[hotspot.id];
            if (!offset) return;
            const calloutX = Phaser.Math.Clamp(targetX + offset.x, x + 10, x + width - calloutW - 10);
            const calloutY = Phaser.Math.Clamp(targetY + offset.y, y + 10, y + height - calloutH - 10);
            const checked = this.identifyFound.has(hotspot.id);
            const isActive = this.activeHotspotId === hotspot.id;

            const connector = this.add.graphics();
            connector.lineStyle(2, checked ? GREEN : PRIMARY_BLUE, 0.8);
            connector.beginPath();
            connector.moveTo(targetX, targetY);
            connector.lineTo(calloutX + calloutW / 2, calloutY + calloutH);
            connector.strokePath();

            const card = this.add.graphics();
            card.fillStyle(0xffffff, 0.96);
            card.fillRoundedRect(calloutX, calloutY, calloutW, calloutH, 12);
            card.lineStyle(2, checked ? GREEN : PRIMARY_BLUE, 0.65);
            card.strokeRoundedRect(calloutX, calloutY, calloutW, calloutH, 12);
            const icon = this.add.circle(calloutX + 28, calloutY + 28, 19, checked ? GREEN : PRIMARY_BLUE, 1);
            const iconMark = this.add.text(calloutX + 28, calloutY + 28, checked ? "✓" : "•", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0.5);
            const title = this.add.text(calloutX + 56, calloutY + 16, hotspot.title, { fontFamily: FONT, fontStyle: "800", fontSize: 12, color: DARK_NAVY });
            const detail = isActive
                ? hotspot.detail
                : checked
                    ? "Titik sudah diperiksa."
                    : "Klik untuk memeriksa informasi awal.";
            const body = this.add.text(calloutX + 56, calloutY + 37, detail, { fontFamily: FONT, fontStyle: "500", fontSize: 10, color: BODY_TEXT, wordWrap: { width: calloutW - 70 }, lineSpacing: 2 });
            const hit = this.add.rectangle(calloutX + calloutW / 2, calloutY + calloutH / 2, calloutW, calloutH, 0xffffff, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => this.handleIdentificationHotspotClick(hotspot));
            this.boardContainer.add([connector, card, icon, iconMark, title, body, hit]);
        });
    }

    private createEmergencyInspectionPanel(x: number, y: number, width: number, height: number) {
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.98);
        panel.fillRoundedRect(x, y, width, height, 18);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(x, y, width, height, 18);
        panel.fillStyle(PRIMARY_BLUE, 1);
        panel.fillRoundedRect(x, y, width, 54, { tl: 18, tr: 18, bl: 0, br: 0 });
        const title = this.add.text(x + 20, y + 27, "KONDISI DARURAT", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0, 0.5);
        this.boardContainer.add([panel, title]);

        const incidentRows = [
            ["sopep.ui.badgeLokasi", "Lokasi", "Main Deck", DARK_NAVY],
            ["sopep.ui.badgeInsiden", "Insiden", "Oil Spill", DARK_NAVY],
            ["sopep.ui.badgeStatus", "Status", "BELUM DITANGANI", RED_HEX],
        ];
        incidentRows.forEach(([asset, label, value, color], index) => {
            const rowY = y + 78 + index * 67;
            const icon = this.add.image(x + 42, rowY + 20, asset).setDisplaySize(35, 35);
            const labelText = this.add.text(x + 78, rowY + 4, label, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: BODY_TEXT });
            const valueText = this.add.text(x + 78, rowY + 24, value, { fontFamily: FONT, fontStyle: "800", fontSize: 14, color });
            const divider = this.add.rectangle(x + 20, rowY + 57, width - 40, 1, BORDER_BLUE, 0.75);
            this.boardContainer.add([icon, labelText, valueText, divider]);
        });

        const checklistY = y + 286;
        const checklistHeader = this.add.graphics();
        checklistHeader.fillStyle(PRIMARY_BLUE, 1);
        checklistHeader.fillRoundedRect(x + 18, checklistY, width - 36, 36, 8);
        const checklistTitle = this.add.text(x + width / 2, checklistY + 18, "INFORMASI YANG HARUS DIIDENTIFIKASI", { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: "#ffffff" }).setOrigin(0.5);
        this.boardContainer.add([checklistHeader, checklistTitle]);

        const checks = [
            ["location", "Lokasi kejadian"],
            ["source", "Sumber tumpahan"],
            ["pollutant", "Jenis pencemar"],
            ["condition", "Kondisi tumpahan"],
            ["scupper", "Saluran pembuangan (scupper)"],
        ];
        checks.forEach(([id, label], index) => {
            const rowY = checklistY + 44 + index * 48;
            const done = this.identifyFound.has(id);
            const row = this.add.graphics();
            row.fillStyle(done ? 0xebf8ef : SKY, 1);
            row.fillRoundedRect(x + 18, rowY, width - 36, 42, 8);
            row.lineStyle(1, done ? GREEN : BORDER_BLUE, 0.8);
            row.strokeRoundedRect(x + 18, rowY, width - 36, 42, 8);
            const status = this.add.image(x + 41, rowY + 21, done ? "sopep.ui.statusChecked" : "sopep.ui.statusUnchecked").setDisplaySize(22, 22);
            const text = this.add.text(x + 70, rowY + 21, label, { fontFamily: FONT, fontStyle: done ? "700" : "600", fontSize: 12, color: done ? GREEN_HEX : DARK_NAVY }).setOrigin(0, 0.5);
            this.boardContainer.add([row, status, text]);
        });

        const ready = SOPEP_IDENTIFY_HOTSPOTS.every((hotspot) => this.identifyFound.has(hotspot.id));
        const next = new Button(this, {
            x: x + width / 2,
            y: y + height - 64,
            width: width - 44,
            height: 56,
            text: "LANJUT  →",
            fontFamily: FONT,
            fontStyle: "800",
            fontSize: 16,
            borderRadius: 28,
            fillColor: ready ? PRIMARY_BLUE : 0xaab4c6,
            strokeAlpha: 0,
            disabled: !ready,
        });
        if (ready) {
            next.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.identifyFormVisible = true;
                this.renderStage();
            });
        }
        this.boardContainer.add(next.view);
    }

    private addIncidentAsset(key: string, x: number, y: number, width: number, height: number) {
        if (!this.textures.exists(key)) {
            this.createAssetPlaceholder(x, y, width, height, key);
            return;
        }
        const image = this.add.image(x + width / 2, y + height / 2, key).setDisplaySize(width, height);
        this.boardContainer.add(image);
    }

    private createInspectionHotspot(hotspot: SopepHotspot, x: number, y: number) {
        const checked = this.identifyFound.has(hotspot.id);
        const active = hotspot.id === this.hotspotActiveId;
        const container = this.add.container(x, y);
        const marker = this.add.image(0, 0, checked ? "sopep.ui.hotspotChecked" : active ? "sopep.ui.hotspotActive" : "sopep.ui.hotspot").setDisplaySize(52, 52);
        container.add(marker);
        if (!checked && !active) {
            const pulse = this.add.image(0, 0, "sopep.ui.hotspotPulse").setDisplaySize(64, 64).setAlpha(0.72);
            container.addAt(pulse, 0);
            this.tweens.add({ targets: pulse, scaleX: 1.22, scaleY: 1.22, alpha: 0.18, duration: 900, ease: "Sine.InOut", yoyo: true, repeat: -1 });
        }
        if (checked && !active) container.add(this.add.text(0, 0, "✓", { fontFamily: FONT, fontStyle: "800", fontSize: 19, color: GREEN_HEX }).setOrigin(0.5));
        const hit = this.add.rectangle(0, 0, 58, 58, 0xffffff, 0).setInteractive({ useHandCursor: true });
        container.add(hit);
        hit.on("pointerover", () => this.tweens.add({ targets: container, scaleX: 1.12, scaleY: 1.12, duration: 120, ease: "Back.Out" }));
        hit.on("pointerout", () => this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: "Quad.Out" }));
        hit.on("pointerdown", () => this.handleIdentificationHotspotClick(hotspot));
        this.boardContainer.add(container);
    }

    private handleIdentificationHotspotClick(hotspot: SopepHotspot) {
        playSfx(this, SFX_KEYS.click);
        this.identifyFound.add(hotspot.id);
        this.activeHotspotId = hotspot.id;
        this.hotspotActiveId = hotspot.id;
        this.identifyFeedback = null;
        this.renderStage();
        this.time.delayedCall(220, () => {
            if (this.stage !== "IDENTIFY" || this.hotspotActiveId !== hotspot.id) return;
            this.hotspotActiveId = null;
            this.renderStage();
        });
    }

    private createObservationCard(x: number, y: number, width: number, height: number) {
        const active = SOPEP_IDENTIFY_HOTSPOTS.find((hotspot) => hotspot.id === this.activeHotspotId);
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.96);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, active ? PRIMARY_BLUE : BORDER_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        this.boardContainer.add(card);
        if (!active) {
            this.boardContainer.add(this.add.text(x + 20, y + height / 2, "Klik titik inspeksi untuk mencatat hasil pengamatan.", { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: BODY_TEXT }).setOrigin(0, 0.5));
            return;
        }
        const info = this.add.image(x + 66, y + height / 2, active.infoTextureKey).setDisplaySize(92, 34);
        const title = this.add.text(x + 124, y + 18, active.title, { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: PRIMARY_BLUE_HEX });
        const detail = this.add.text(x + 124, title.y + title.height + 6, active.detail, { fontFamily: FONT, fontStyle: "500", fontSize: 13, color: DARK_NAVY, wordWrap: { width: width - 144 }, lineSpacing: 3 });
        this.boardContainer.add([info, title, detail]);
        this.tweens.add({ targets: [card, info, title, detail], alpha: { from: 0, to: 1 }, duration: 180, ease: "Sine.Out" });
    }

    private createInspectionChecklist(x: number, y: number, width: number) {
        const height = 150;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.96);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        const title = this.add.text(x + 18, y + 16, "PEMERIKSAAN AWAL", { fontFamily: FONT, fontStyle: "800", fontSize: 13, color: PRIMARY_BLUE_HEX });
        this.boardContainer.add([card, title]);
        const items = [["location", "Lokasi kejadian diperiksa"], ["pollutant", "Jenis pencemar diperiksa"], ["source", "Sumber tumpahan diperiksa"], ["condition", "Kondisi tumpahan diperiksa"], ["scupper", "Scupper diperiksa"]];
        items.forEach(([id, label], index) => {
            const itemX = x + 20 + (index % 2) * (width / 2);
            const itemY = y + 50 + Math.floor(index / 2) * 30;
            const done = this.identifyFound.has(id);
            const status = this.add.image(itemX + 10, itemY + 8, done ? "sopep.ui.statusChecked" : "sopep.ui.statusUnchecked").setDisplaySize(18, 18);
            const text = this.add.text(itemX + 26, itemY + 8, label, { fontFamily: FONT, fontStyle: done ? "700" : "500", fontSize: 12, color: done ? GREEN_HEX : BODY_TEXT }).setOrigin(0, 0.5);
            this.boardContainer.add([status, text]);
            if (done) this.tweens.add({ targets: status, scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 180, ease: "Back.Out" });
        });
    }

    private createIdentificationForm(x: number, y: number, width: number, height: number) {
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 1);
        panel.fillRoundedRect(x, y, width, height, 18);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(x, y, width, height, 18);
        panel.fillStyle(PRIMARY_BLUE, 1);
        panel.fillRoundedRect(x, y, width, 50, { tl: 18, tr: 18, bl: 0, br: 0 });
        this.boardContainer.add([panel, this.add.text(x + 20, y + 25, "FORM IDENTIFIKASI AWAL", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0, 0.5)]);
        const fieldX = x + 22;
        const fieldW = width - 44;
        const fieldY = y + 72;
        const fieldGap = 92;
        SOPEP_IDENTIFICATION_FIELDS.forEach((field, index) => this.createIdentificationField(field, index, fieldX, fieldY, fieldW, fieldGap));
        if (this.identifyOpenFieldId) this.createIdentificationOptions(fieldX, fieldY, fieldW, fieldGap);
        if (this.identificationComplete) {
            this.boardContainer.add(this.add.text(x + width / 2, y + 558, "✓  IDENTIFIKASI SELESAI", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: GREEN_HEX }).setOrigin(0.5));
            this.boardContainer.add(this.add.text(x + width / 2, y + 585, "Informasi awal kejadian telah dicatat dan siap digunakan untuk menentukan tindakan selanjutnya.", { fontFamily: FONT, fontStyle: "500", fontSize: 12, color: DARK_NAVY, wordWrap: { width: width - 54 }, align: "center" }).setOrigin(0.5, 0));
            const next = new Button(this, { x: x + width / 2, y: y + 646, width: width - 44, height: 48, text: "LANJUT KE TINDAKAN AWAL →", fontFamily: FONT, fontStyle: "700", fontSize: 14, borderRadius: 24, fillColor: PRIMARY_BLUE, strokeAlpha: 0 });
            next.on("pointerdown", () => { playSfx(this, SFX_KEYS.click); this.setStage("REPORT"); });
            this.boardContainer.add(next.view);
            return;
        }
        const confirm = new Button(this, { x: x + width / 2, y: y + 556, width: width - 44, height: 48, text: "KONFIRMASI IDENTIFIKASI", fontFamily: FONT, fontStyle: "700", fontSize: 14, borderRadius: 24, fillColor: PRIMARY_BLUE, strokeAlpha: 0 });
        confirm.on("pointerdown", () => this.handleIdentificationConfirm());
        this.boardContainer.add(confirm.view);
        if (this.identifyFeedback) this.createIdentificationFeedback(x + 22, y + 590, width - 44, this.identifyFeedback);
    }

    private createIdentificationField(field: typeof SOPEP_IDENTIFICATION_FIELDS[number], index: number, x: number, firstY: number, width: number, gap: number) {
        const y = firstY + index * gap;
        const unlocked = this.isIdentifyFieldUnlocked(field.unlockAfter);
        const selected = this.identifySelections[field.id];
        const warning = this.identifyWarningFields.has(field.id);
        const border = this.identificationComplete ? GREEN : warning ? AMBER : unlocked ? PRIMARY_BLUE : BORDER_BLUE;
        const input = this.add.graphics();
        input.fillStyle(unlocked ? 0xffffff : 0xf1f5f9, 1);
        input.fillRoundedRect(x, y + 20, width, 46, 10);
        input.lineStyle(2, border, warning ? 0.95 : 0.65);
        input.strokeRoundedRect(x, y + 20, width, 46, 10);
        const label = this.add.text(x, y, field.label, { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: unlocked ? PRIMARY_BLUE_HEX : BODY_TEXT });
        const value = unlocked ? selected ?? "Pilih hasil inspeksi" : "Terkunci — periksa hotspot terkait";
        const valueText = this.add.text(x + 14, y + 43, value, { fontFamily: FONT, fontStyle: selected ? "700" : "500", fontSize: 12, color: selected ? DARK_NAVY : BODY_TEXT }).setOrigin(0, 0.5);
        const arrow = this.add.text(x + width - 18, y + 43, unlocked ? "⌄" : "•", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: unlocked ? PRIMARY_BLUE_HEX : BODY_TEXT }).setOrigin(0.5);
        this.boardContainer.add([label, input, valueText, arrow]);
        if (!unlocked || this.identificationComplete) return;
        const hit = this.add.rectangle(x + width / 2, y + 43, width, 46, 0xffffff, 0).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => { playSfx(this, SFX_KEYS.click); this.identifyOpenFieldId = this.identifyOpenFieldId === field.id ? null : field.id; this.renderStage(); });
        this.boardContainer.add(hit);
    }

    private createIdentificationOptions(x: number, firstY: number, width: number, gap: number) {
        const index = SOPEP_IDENTIFICATION_FIELDS.findIndex((field) => field.id === this.identifyOpenFieldId);
        const field = SOPEP_IDENTIFICATION_FIELDS[index];
        if (!field || index < 0) return;
        const menuY = firstY + index * gap + 70;
        const menuH = field.options.length * 34 + 10;
        const menu = this.add.graphics();
        menu.fillStyle(0xffffff, 1);
        menu.fillRoundedRect(x, menuY, width, menuH, 10);
        menu.lineStyle(2, PRIMARY_BLUE, 0.8);
        menu.strokeRoundedRect(x, menuY, width, menuH, 10);
        this.boardContainer.add(menu);
        field.options.forEach((option, optionIndex) => {
            const optionY = menuY + 5 + optionIndex * 34;
            const selected = this.identifySelections[field.id] === option;
            const bg = this.add.rectangle(x + width / 2, optionY + 14, width - 10, 28, selected ? SKY : 0xffffff, 1);
            const text = this.add.text(x + 14, optionY + 14, option, { fontFamily: FONT, fontStyle: selected ? "700" : "500", fontSize: 12, color: DARK_NAVY }).setOrigin(0, 0.5);
            const hit = this.add.rectangle(x + width / 2, optionY + 14, width - 10, 28, 0xffffff, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => { playSfx(this, SFX_KEYS.click); this.identifySelections[field.id] = option; this.identifyWarningFields.delete(field.id); this.identifyOpenFieldId = null; this.identifyFeedback = null; this.renderStage(); });
            this.boardContainer.add([bg, text, hit]);
        });
    }

    private createIdentificationFeedback(x: number, y: number, width: number, feedback: { message: string; tone: "warning" | "error" | "success" }) {
        const color = feedback.tone === "success" ? GREEN : feedback.tone === "warning" ? AMBER : RED;
        const hex = feedback.tone === "success" ? GREEN_HEX : feedback.tone === "warning" ? AMBER_HEX : RED_HEX;
        const box = this.add.graphics();
        box.fillStyle(0xffffff, 1);
        box.fillRoundedRect(x, y, width, 68, 12);
        box.lineStyle(2, color, 0.8);
        box.strokeRoundedRect(x, y, width, 68, 12);
        const text = this.add.text(x + 16, y + 14, feedback.message, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: hex, wordWrap: { width: width - 32 }, lineSpacing: 3 });
        this.boardContainer.add([box, text]);
    }

    private isIdentifyFieldUnlocked(requiredHotspots: string[]) {
        return requiredHotspots.every((hotspotId) => this.identifyFound.has(hotspotId));
    }

    private handleIdentificationConfirm() {
        playSfx(this, SFX_KEYS.click);
        if (SOPEP_IDENTIFY_HOTSPOTS.some((hotspot) => !this.identifyFound.has(hotspot.id))) {
            this.identifyWarningFields.clear();
            this.identifyFeedback = { message: "Identifikasi belum lengkap.\nPeriksa seluruh titik penting sebelum mengonfirmasi laporan.", tone: "warning" };
            this.renderStage();
            return;
        }
        const incorrect = SOPEP_IDENTIFICATION_FIELDS.filter((field) => this.identifySelections[field.id] !== field.correctOption);
        if (incorrect.length > 0) {
            this.identifyWarningFields = new Set(incorrect.map((field) => field.id));
            this.identifyFeedback = { message: "Data identifikasi belum sesuai dengan hasil pengamatan. Periksa kembali area kejadian.", tone: "warning" };
            this.renderStage();
            return;
        }
        this.identifyWarningFields.clear();
        this.identifyFeedback = { message: "IDENTIFIKASI SELESAI", tone: "success" };
        this.identificationComplete = true;
        this.renderStage();
    }

    // ---- STEP 2: REPORT (Section E) ------------------------------------------------------

    private createReportingStep() {
        this.buildMissionPanel("STEP 2 / LAPORKAN INSIDEN", "Lengkapi informasi awal kejadian untuk melakukan pelaporan.");
        this.updateMissionProgress();
        this.addWhiteboardChrome();

        const top = this.boardTop();
        const panelX = BOARD_X + 60;
        const panelW = BOARD_WIDTH - 120;
        const heading = this.add.text(panelX, top + 26, "OIL POLLUTION REPORT", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: DARK_NAVY });
        this.boardContainer.add(heading);

        const colWidth = (panelW - 40) / 2;
        let rowY = heading.y + heading.height + 20;
        const rowHeight = 78;

        const selectableFields = SOPEP_REPORT_FIELDS.filter((f) => !f.auto);
        const autoField = SOPEP_REPORT_FIELDS.find((f) => f.auto);

        if (autoField) {
            const labelText = this.add.text(panelX, rowY, autoField.label, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: PRIMARY_BLUE_HEX });
            const now = new Date().toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
            const valueBg = this.add.rectangle(panelX, rowY + 22, colWidth, 34, SKY, 1).setOrigin(0, 0);
            const valueText = this.add.text(panelX + 12, rowY + 39, `${now} WIB (otomatis)`, { fontFamily: FONT, fontStyle: "600", fontSize: 13, color: DARK_NAVY }).setOrigin(0, 0.5);
            this.boardContainer.add([labelText, valueBg, valueText]);
        }

        selectableFields.forEach((field, index) => {
            const col = (index + 1) % 2;
            const row = Math.floor((index + 1) / 2);
            const x = panelX + col * (colWidth + 40);
            const y = rowY + row * rowHeight;
            const labelText = this.add.text(x, y, field.label, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: PRIMARY_BLUE_HEX });
            this.boardContainer.add(labelText);

            const options = field.options ?? [];
            const chipGap = 8;
            const chipHeight = 32;
            let chipX = x;
            const chipY = y + 22;
            options.forEach((option, optionIndex) => {
                const selected = this.reportSelections[field.id] === optionIndex;
                const chipLabel = this.add.text(0, 0, option, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: selected ? "#ffffff" : DARK_NAVY });
                const chipWidth = chipLabel.width + 22;
                const chipBg = this.add.graphics();
                chipBg.fillStyle(selected ? PRIMARY_BLUE : 0xffffff, 1);
                chipBg.fillRoundedRect(chipX, chipY, chipWidth, chipHeight, chipHeight / 2);
                chipBg.lineStyle(2, PRIMARY_BLUE, selected ? 1 : 0.4);
                chipBg.strokeRoundedRect(chipX, chipY, chipWidth, chipHeight, chipHeight / 2);
                chipLabel.setPosition(chipX + chipWidth / 2, chipY + chipHeight / 2).setOrigin(0.5);
                const hit = this.add.rectangle(chipX + chipWidth / 2, chipY + chipHeight / 2, chipWidth, chipHeight, 0xffffff, 0).setInteractive({ useHandCursor: true });
                hit.on("pointerdown", () => {
                    playSfx(this, SFX_KEYS.click);
                    this.reportSelections[field.id] = optionIndex;
                    this.renderStage();
                });
                this.boardContainer.add([chipBg, chipLabel, hit]);
                chipX += chipWidth + chipGap;
            });
        });

        const totalRows = Math.ceil((selectableFields.length + 1) / 2);
        const allFilled = selectableFields.every((f) => this.reportSelections[f.id] !== undefined);

        const sendButton = new Button(this, {
            x: panelX + panelW / 2,
            y: rowY + totalRows * rowHeight + 20,
            width: 260,
            height: 56,
            text: "KIRIM LAPORAN",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: 28,
            fillColor: allFilled ? PRIMARY_BLUE : 0xc7d3e6,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        sendButton.on("pointerdown", () => {
            if (!allFilled) {
                this.showCautionFeedback("Lengkapi seluruh pilihan sebelum mengirim laporan.");
                return;
            }
            playSfx(this, SFX_KEYS.click);
            sendButton.view.disableInteractive();
            this.showCorrectFeedback("LAPORAN BERHASIL DIBUAT");
            this.completeStep("EQUIPMENT", 900);
        });
        this.boardContainer.add(sendButton.view);
    }

    // ---- STEP 3: EQUIPMENT (Section F) ---------------------------------------------------

    private createEquipmentSelectionStep() {
        this.buildMissionPanel("STEP 3 / PILIH PERALATAN PENANGANAN", "Pilih peralatan yang diperlukan untuk menangani tumpahan minyak.");
        this.updateMissionProgress();
        this.addWhiteboardChrome();

        const top = this.boardTop();
        const cols = 5;
        const slotW = 150;
        const slotH = 110;
        const gapX = 24;
        const gapY = 56;
        const startY = top + 40;

        SOPEP_EQUIPMENT_ITEMS.forEach((item, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const itemsInRow = Math.min(cols, SOPEP_EQUIPMENT_ITEMS.length - row * cols);
            const rowWidth = itemsInRow * slotW + (itemsInRow - 1) * gapX;
            const rowStartX = BOARD_X + BOARD_WIDTH / 2 - rowWidth / 2;
            const x = rowStartX + col * (slotW + gapX);
            const y = startY + row * (slotH + gapY);

            this.createAssetPlaceholder(x, y, slotW, slotH, item.label, item.textureKey);

            const selected = this.equipmentSelected.has(item.id);
            const ring = this.add.graphics();
            if (selected) {
                ring.lineStyle(3, PRIMARY_BLUE, 1);
                ring.strokeRoundedRect(x - 4, y - 4, slotW + 8, slotH + 8, 16);
                const badge = this.add.circle(x + slotW - 6, y + 6, 12, PRIMARY_BLUE, 1);
                const badgeMark = this.add.text(x + slotW - 6, y + 6, "✓", { fontFamily: FONT, fontStyle: "800", fontSize: 13, color: "#ffffff" }).setOrigin(0.5);
                this.boardContainer.add([ring, badge, badgeMark]);
            } else {
                this.boardContainer.add(ring);
            }

            const hit = this.add.rectangle(x + slotW / 2, y + slotH / 2, slotW, slotH, 0xffffff, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                if (this.equipmentSelected.has(item.id)) {
                    this.equipmentSelected.delete(item.id);
                } else {
                    this.equipmentSelected.add(item.id);
                }
                this.renderStage();
            });
            this.boardContainer.add(hit);
        });

        const rows = Math.ceil(SOPEP_EQUIPMENT_ITEMS.length / cols);
        const confirmY = startY + rows * (slotH + gapY) + 30;

        const confirmButton = new Button(this, {
            x: BOARD_X + BOARD_WIDTH / 2,
            y: confirmY,
            width: 300,
            height: 56,
            text: "KONFIRMASI PERALATAN",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: 28,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        confirmButton.on("pointerdown", () => this.handleEquipmentConfirm(confirmButton));
        this.boardContainer.add(confirmButton.view);
    }

    private handleEquipmentConfirm(confirmButton: Button) {
        playSfx(this, SFX_KEYS.click);
        const correctItems = SOPEP_EQUIPMENT_ITEMS.filter((i) => i.correct);
        const correctSelectedCount = correctItems.filter((i) => this.equipmentSelected.has(i.id)).length;
        const distractorSelectedCount = SOPEP_EQUIPMENT_ITEMS.filter((i) => !i.correct && this.equipmentSelected.has(i.id)).length;

        if (correctSelectedCount < correctItems.length) {
            this.showCautionFeedback("Pilih seluruh peralatan yang sesuai untuk penanganan tumpahan minyak.");
            return;
        }

        confirmButton.view.disableInteractive();
        if (distractorSelectedCount > 0) {
            this.mistakeCount += distractorSelectedCount;
            this.showWrongFeedback("Beberapa peralatan yang dipilih tidak relevan untuk tumpahan minyak.");
        } else {
            this.showCorrectFeedback("PERALATAN DIPILIH DENGAN TEPAT");
        }
        this.completeStep("CONTAINMENT", 900);
    }

    // ---- STEP 4: CONTAINMENT (Section H) -------------------------------------------------

    private createContainmentStep() {
        const phase = SOPEP_CONTAINMENT_PHASES[this.containmentPhaseIndex];
        this.buildMissionPanel("STEP 4 / KENDALIKAN TUMPAHAN", phase ? phase.instruction : "Seluruh tahapan penanganan tumpahan telah selesai.");
        this.updateMissionProgress();
        this.addWhiteboardChrome();

        const top = this.boardTop();
        const centerX = BOARD_X + BOARD_WIDTH / 2;
        const spillY = top + 130;
        this.spillVisual = this.add.ellipse(centerX, spillY, 300, 190, 0x2b2b2b, 0.55);
        this.boardContainer.add(this.spillVisual);
        const spillLabel = this.add.text(centerX, spillY, "AREA TUMPAHAN\nMINYAK", { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: "#ffffff", align: "center" }).setOrigin(0.5);
        this.boardContainer.add(spillLabel);

        const zoneY = top + 260;
        const zoneW = 400;
        const zoneH = 130;
        const zoneGap = 24;
        const zoneRowWidth = zoneW * 4 + zoneGap * 3;
        const zoneStartX = BOARD_X + BOARD_WIDTH / 2 - zoneRowWidth / 2;

        this.dropZones = SOPEP_CONTAINMENT_PHASES.map((p: SopepContainmentPhase, index: number) => {
            const x = zoneStartX + index * (zoneW + zoneGap);
            const zone = this.createDropZone(x, zoneY, zoneW, zoneH, p.dropZoneLabel);
            zone.phaseIndex = index;
            if (index < this.containmentPhaseIndex) {
                zone.completed = true;
                this.drawDropZoneState(zone, "valid");
                zone.captionText.setText(`✓ ${p.dropZoneLabel}`);
                zone.captionText.setColor(GREEN_HEX);
                zone.innerText.setText("KOMPONEN TERPASANG");
            }
            return zone;
        });

        const trayLabel = this.add.text(centerX, top + this.boardHeight() - 190, "PERALATAN SOPEP", { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: PRIMARY_BLUE_HEX }).setOrigin(0.5);
        this.boardContainer.add(trayLabel);

        const trayItems = SOPEP_CONTAINMENT_TRAY_ITEM_IDS.map((id) => SOPEP_EQUIPMENT_ITEMS.find((eq) => eq.id === id)).filter((i): i is (typeof SOPEP_EQUIPMENT_ITEMS)[number] => !!i);
        const iconSize = 110;
        const traySlotGap = 60;
        const trayRowWidth = trayItems.length * iconSize + (trayItems.length - 1) * traySlotGap;
        const trayStartX = centerX - trayRowWidth / 2 + iconSize / 2;
        const trayY = top + this.boardHeight() - 100;

        trayItems.forEach((item, index) => {
            const usedPhaseIndex = SOPEP_CONTAINMENT_PHASES.findIndex((p) => p.correctItemId === item.id);
            const alreadyPlaced = usedPhaseIndex !== -1 && usedPhaseIndex < this.containmentPhaseIndex;
            const x = trayStartX + index * (iconSize + traySlotGap);
            const label = this.add.text(x, trayY + iconSize / 2 + 12, item.label, { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: DARK_NAVY, align: "center" }).setOrigin(0.5, 0);
            this.boardContainer.add(label);

            if (alreadyPlaced) return;

            const icon = this.createDraggableAssetIcon(x, trayY, iconSize, item.textureKey);
            const originX = x;
            const originY = trayY;

            icon.on("dragstart", () => {
                this.boardContainer.bringToTop(icon);
            });
            icon.on("drag", (pointer: Phaser.Input.Pointer) => {
                icon.setPosition(this.toDesignX(pointer.worldX), this.toDesignY(pointer.worldY));
                this.dropZones.forEach((zone) => {
                    if (zone.completed) return;
                    const over = this.pointInZone(icon.x, icon.y, zone);
                    if (!over) {
                        this.drawDropZoneState(zone, "neutral");
                        return;
                    }
                    const isCurrentPhase = zone.phaseIndex === this.containmentPhaseIndex;
                    const phaseForZone = SOPEP_CONTAINMENT_PHASES[zone.phaseIndex];
                    const isCorrectItem = phaseForZone.correctItemId === item.id;
                    this.drawDropZoneState(zone, isCurrentPhase && isCorrectItem ? "valid" : "invalid");
                });
            });
            icon.on("dragend", () => {
                const zone = this.dropZones.find((z) => !z.completed && this.pointInZone(icon.x, icon.y, z));
                this.dropZones.forEach((z) => {
                    if (!z.completed) this.drawDropZoneState(z, "neutral");
                });
                if (!zone) {
                    this.tweens.add({ targets: icon, x: originX, y: originY, duration: 220, ease: "Back.Out" });
                    return;
                }
                this.validateContainmentAction(zone, item.id, icon, originX, originY);
            });
        });
    }

    private pointInZone(x: number, y: number, zone: DropZoneState): boolean {
        return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height;
    }

    private validateContainmentAction(zone: DropZoneState, itemId: string, icon: GameObjects.Container, originX: number, originY: number) {
        const phase = SOPEP_CONTAINMENT_PHASES[zone.phaseIndex];

        if (zone.phaseIndex > this.containmentPhaseIndex) {
            this.mistakeCount++;
            playSfx(this, SFX_KEYS.quizWrong);
            this.showWrongFeedback(phase.wrongFeedback.early ?? phase.wrongFeedback.default);
            this.tweens.add({ targets: icon, x: originX, y: originY, duration: 220, ease: "Back.Out" });
            return;
        }

        if (itemId !== phase.correctItemId) {
            this.mistakeCount++;
            playSfx(this, SFX_KEYS.quizWrong);
            this.showWrongFeedback(phase.wrongFeedback[itemId] ?? phase.wrongFeedback.default);
            this.tweens.add({ targets: icon, x: originX, y: originY, duration: 220, ease: "Back.Out" });
            return;
        }

        playSfx(this, SFX_KEYS.quizCorrect);
        zone.completed = true;
        this.drawDropZoneState(zone, "valid");
        zone.captionText.setText(`✓ ${phase.dropZoneLabel}`);
        zone.captionText.setColor(GREEN_HEX);
        zone.innerText.setText("KOMPONEN TERPASANG");
        icon.disableInteractive();
        this.tweens.add({ targets: icon, x: zone.x + zone.width / 2, y: zone.y + zone.height / 2, duration: 220 });

        this.showCorrectFeedback(this.containmentPhaseFeedback(phase.id));
        if (phase.id === "absorb") this.animateSpillShrink();

        this.containmentPhaseIndex++;
        if (this.containmentPhaseIndex >= SOPEP_CONTAINMENT_PHASES.length) {
            this.completeStep("DOCUMENTATION", 900);
        }
    }

    private containmentPhaseFeedback(phaseId: string): string {
        switch (phaseId) {
            case "boom":
                return "PENYEBARAN DIKENDALIKAN";
            case "scupper":
                return "SALURAN PEMBUANGAN DIAMANKAN";
            case "absorb":
                return "TUMPAHAN BERHASIL DISERAP";
            case "collect":
                return "LIMBAH TERKUMPUL";
            default:
                return "TINDAKAN BERHASIL";
        }
    }

    private animateSpillShrink() {
        const target = this.spillVisual;
        if (!target) return;
        const steps = [0.7, 0.4, 0.1];
        let delay = 150;
        steps.forEach((scale) => {
            this.time.delayedCall(delay, () => {
                if (!target.active) return;
                this.tweens.add({ targets: target, scaleX: scale, scaleY: scale, alpha: 0.25 + scale * 0.4, duration: 260 });
            });
            delay += 260;
        });
    }

    // ---- STEP 5: DOCUMENTATION (Section M) -----------------------------------------------

    private createDocumentationStep() {
        this.buildMissionPanel("STEP 5 / CATAT & DOKUMENTASIKAN", "Pilih dokumen yang perlu diperbarui setelah penanganan insiden.");
        this.updateMissionProgress();
        this.addWhiteboardChrome();

        const top = this.boardTop();
        const cardW = 220;
        const cardH = 160;
        const gap = 40;
        const rowWidth = SOPEP_DOCUMENT_CARDS.length * cardW + (SOPEP_DOCUMENT_CARDS.length - 1) * gap;
        const startX = BOARD_X + BOARD_WIDTH / 2 - rowWidth / 2;
        const cardY = top + 40;

        SOPEP_DOCUMENT_CARDS.forEach((doc, index) => {
            const x = startX + index * (cardW + gap);
            this.createAssetPlaceholder(x, cardY, cardW, cardH, doc.label, doc.textureKey);

            const selected = this.documentsSelected.has(doc.id);
            if (selected) {
                const ring = this.add.graphics();
                ring.lineStyle(3, PRIMARY_BLUE, 1);
                ring.strokeRoundedRect(x - 4, cardY - 4, cardW + 8, cardH + 8, 18);
                const badge = this.add.circle(x + cardW - 8, cardY + 8, 13, PRIMARY_BLUE, 1);
                const badgeMark = this.add.text(x + cardW - 8, cardY + 8, "✓", { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: "#ffffff" }).setOrigin(0.5);
                this.boardContainer.add([ring, badge, badgeMark]);
            }

            const hit = this.add.rectangle(x + cardW / 2, cardY + cardH / 2, cardW, cardH, 0xffffff, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                if (this.documentsSelected.has(doc.id)) {
                    this.documentsSelected.delete(doc.id);
                } else {
                    this.documentsSelected.add(doc.id);
                }
                this.renderStage();
            });
            this.boardContainer.add(hit);
        });

        const checklistY = cardY + cardH + 50;
        if (this.documentsSelected.size > 0) {
            const checklistTitle = this.add.text(BOARD_X + 60, checklistY, "CHECKLIST DOKUMENTASI", { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: PRIMARY_BLUE_HEX });
            this.boardContainer.add(checklistTitle);

            const colWidth = (BOARD_WIDTH - 120) / 2;
            SOPEP_DOCUMENTATION_CHECKLIST.forEach((label, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                const x = BOARD_X + 60 + col * colWidth;
                const y = checklistTitle.y + checklistTitle.height + 12 + row * 30;
                const mark = this.add.text(x, y, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: GREEN_HEX });
                const text = this.add.text(x + 22, y, label, { fontFamily: FONT, fontStyle: "600", fontSize: 13, color: DARK_NAVY });
                this.boardContainer.add([mark, text]);
            });
        } else {
            const hint = this.add.text(BOARD_X + 60, checklistY, "Pilih minimal satu dokumen untuk melihat checklist pembaruan.", {
                fontFamily: FONT, fontStyle: "500", fontSize: 14, color: BODY_TEXT,
            });
            this.boardContainer.add(hint);
        }

        const saveButton = new Button(this, {
            x: BOARD_X + BOARD_WIDTH / 2,
            y: top + this.boardHeight() - 50,
            width: 260,
            height: 56,
            text: "SIMPAN CATATAN",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: 28,
            fillColor: this.documentsSelected.size > 0 ? PRIMARY_BLUE : 0xc7d3e6,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        saveButton.on("pointerdown", () => {
            if (this.documentsSelected.size === 0) {
                this.showCautionFeedback("Pilih minimal satu dokumen sebelum menyimpan catatan.");
                return;
            }
            playSfx(this, SFX_KEYS.click);
            saveButton.view.disableInteractive();
            this.completeMission();
        });
        this.boardContainer.add(saveButton.view);
    }

    // ---- RESULT hand-off -------------------------------------------------------------------

    private completeMission() {
        const result: SopepMissionResult = {
            mistakeCount: this.mistakeCount,
            stepsCompleted: STEP_STAGE_ORDER.length,
            totalSteps: STEP_STAGE_ORDER.length,
            accuracyPercent: computeAccuracyPercent(this.mistakeCount),
        };
        this.showMissionResult(result);
    }

    private showMissionResult(result: SopepMissionResult) {
        this.goTo("SopepHasilUmpanBalik", result);
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
