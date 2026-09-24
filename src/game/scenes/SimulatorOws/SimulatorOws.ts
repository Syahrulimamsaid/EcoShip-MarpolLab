import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { setSimulatorProgress } from "../../OwsModuleState";
import { SFX_KEYS, playSfx } from "../../SfxManager";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const MARGIN = 32;

const START_PPM = 45;
const TARGET_FLOOR_PPM = 8;

// Fill the available area while keeping space below the diagram for instructions.
const CARD_SCALE = 1;
const DIAGRAM_SCALE = 0.9;

const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const YELLOW_HEX = "#b7930a";
const AMBER_HEX = "#b5651d";
const RED_HEX = "#c0392b";
const BODY_TEXT_HEX = "#4a5b78";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const OPEN_THRESHOLD = 0.8;
const CLOSED_THRESHOLD = 0.2;

type SimulatorStep =
    | "READY"
    | "INLET_OPEN"
    | "PUMP_RUNNING"
    | "SEPARATING"
    | "SAFE_TO_DISCHARGE"
    | "DISCHARGING"
    | "SHUTDOWN_CLOSE_OVERBOARD"
    | "SHUTDOWN_STOP_PUMP"
    | "SHUTDOWN_CLOSE_VALVES"
    | "COMPLETE";

/** The full operating procedure, in order. Index = "Langkah n" - 1. */
const PROCEDURE_STEPS = [
    "Buka Valve A (Inlet)",
    "Nyalakan Bilge Pump",
    "Buka Valve B (Top)",
    "Tunggu OCM ≤ 15 ppm",
    "Buka Valve D (Overboard)",
    "Tutup Valve D",
    "Matikan Bilge Pump",
    "Tutup Valve A dan B",
];

/** Which PROCEDURE_STEPS index is currently expected for each simulator state. */
const STEP_INDEX: Record<SimulatorStep, number> = {
    READY: 0,
    INLET_OPEN: 1,
    PUMP_RUNNING: 2,
    SEPARATING: 3,
    SAFE_TO_DISCHARGE: 4,
    DISCHARGING: 5,
    SHUTDOWN_CLOSE_OVERBOARD: 5,
    SHUTDOWN_STOP_PUMP: 6,
    SHUTDOWN_CLOSE_VALVES: 7,
    COMPLETE: 8,
};

interface HintPointer {
    view: GameObjects.Container;
    bg: GameObjects.Graphics;
    text: GameObjects.Text;
    tween: Phaser.Tweens.Tween | null;
}

interface ValveWidget {
    knob: GameObjects.Arc;
    trackTopY: number;
    trackBottomY: number;
    /** 0 = fully closed (Tutup), 1 = fully open (Buka) — continuously
    * adjustable, not a binary toggle. */
    openness: number;
    card: GameObjects.Graphics;
    cardX: number;
    cardTopY: number;
    cardWidth: number;
    cardHeight: number;
    scale: number;
}

interface FlowIndicator {
    arrow: GameObjects.Text;
    segment: "inlet" | "processing" | "outlet";
}

/**
 * "Area Simulasi OWS" — a flat diagram-card simulator: the machinery is the
 * single pre-composed `component_ows.png` illustration, with label+slider
 * widgets overlaid at each valve's position. Each slider is dragged to any
 * position between Tutup/Buka (not just clicked open/closed), and the OCM
 * reading responds live to however far Valve A (inlet) and Valve B (top)
 * are open — matching this diagram's pipe routing (inlet → A → tank → up
 * through B → across → OCM → D → outlet). There's no run/reset button or
 * modal: the simulation is entirely the student dragging the valves.
 */
export class SimulatorOws extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private valveA!: ValveWidget;
    private valveB!: ValveWidget;
    private valveD!: ValveWidget;
    private draggingValve: ValveWidget | null = null;

    private ppm = START_PPM;
    private simulatorStep: SimulatorStep = "READY";
    private pumpOn = false;
    private operationErrors = 0;
    private unsafeDischargeAttempts = 0;
    private simulationStartedAt = 0;
    private separationTimer: Phaser.Time.TimerEvent | null = null;
    private dischargeTimer: Phaser.Time.TimerEvent | null = null;
    private dischargeTicks = 0;
    private ocmValueText!: GameObjects.Text;
    private flowIndicators: FlowIndicator[] = [];
    private feedbackInfo!: GameObjects.Container;
    private feedbackBackground!: GameObjects.Graphics;
    private feedbackTitle!: GameObjects.Text;
    private feedbackBody!: GameObjects.Text;
    private feedbackSummary!: GameObjects.Text;
    private quizButton!: Button;
    private pumpStatusBackground!: GameObjects.Graphics;
    private pumpStatusText!: GameObjects.Text;
    private pumpHighlight!: GameObjects.Arc;
    private trackerGraphics: GameObjects.Graphics | null = null;
    private trackerMarks: GameObjects.Text[] = [];
    private trackerLabels: GameObjects.Text[] = [];
    private trackerRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    private hintPointers: HintPointer[] = [];

    private currentScale = 1;
    private currentRootY = 0;

    constructor() {
        super("SimulatorOws");
    }

    create() {
        this.background = this.add.image(0, 0, "ows.background");
        this.root = this.add.container(0, 0);

        this.ppm = START_PPM;
        this.simulatorStep = "READY";
        this.pumpOn = false;
        this.operationErrors = 0;
        this.unsafeDischargeAttempts = 0;
        this.simulationStartedAt = 0;
        this.dischargeTicks = 0;
        this.flowIndicators = [];
        this.draggingValve = null;
        this.trackerGraphics = null;
        this.trackerMarks = [];
        this.trackerLabels = [];
        this.trackerRects = [];
        this.hintPointers = [];

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildMainCard());
        // Outside the tracked group: the enter transition would otherwise reset the pointers' y.
        this.buildHintPointers();
        this.transitionGroups = groups;

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        this.refreshOcmDisplay(false);
        this.updateSimulatorUi();

        this.input.on("pointermove", this.handlePointerMove, this);
        this.input.on("pointerup", this.handlePointerUp, this);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.stopSeparation();
            this.stopDischargeTimer();
            this.tweens.killTweensOf(this.ocmValueText);
            this.hintPointers.forEach((pointer) => pointer.tween?.stop());
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
            this.input.off("pointermove", this.handlePointerMove, this);
            this.input.off("pointerup", this.handlePointerUp, this);
            this.draggingValve = null;
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    // ---- Header -------------------------------------------------------------------------

    private buildHeader() {
        const headerY = 32;
        const navButtons = new HomeBackButtons(this, {
            x: MARGIN,
            y: headerY,
            onHome: () => this.goTo("MainMenu"),
            onBack: () => this.goTo("OwsMateri"),
        });
        // Give the simulator the same contextual description as the quiz.
        const crumbX = MARGIN + navButtons.width + 20;
        const crumbY = headerY + 6;
        const crumbHeight = navButtons.height - 10;
        const centerY = crumbY + crumbHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL SIMULATOR OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 48;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Simulator OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 18, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 22 + chevron.width + 10 + label.width + 26;
        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 22, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        this.root.add([navButtons.view, breadcrumb, badgeText, chevron, label]);
    }

    // ---- Main card ---------------------------------------------------------------------

    private buildMainCard() {
        const availableX = MARGIN;
        // Leave a clear gap below the back button and module breadcrumb.
        const availableY = 116;
        const availableWidth = DESIGN_WIDTH - MARGIN * 2;
        const availableHeight = DESIGN_HEIGHT - availableY - MARGIN;

        const cardWidth = availableWidth * CARD_SCALE;
        const cardHeight = availableHeight * CARD_SCALE;
        const cardX = availableX + (availableWidth - cardWidth) / 2;
        const cardY = availableY + (availableHeight - cardHeight) / 2;

        const shadow = this.add.graphics();
        shadow.fillStyle(0x0a1a33, 0.06);
        shadow.fillRoundedRect(cardX, cardY + 4, cardWidth, cardHeight, 24);
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 24);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 24);
        this.root.add([shadow, card]);

        const contentX = cardX + 32 * CARD_SCALE;
        const contentTop = cardY + 28 * CARD_SCALE;

        const title = this.add.text(contentX, contentTop, "AREA SIMULASI OWS", { fontFamily: FONT, fontStyle: "800", fontSize: 24 * CARD_SCALE, color: DARK_NAVY });
        const subtitle = this.add.text(contentX, title.y + title.height + 6, "Atur posisi katup dan amati arah aliran serta nilai kandungan minyak pada OCM.", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 14 * CARD_SCALE,
            color: BODY_TEXT,
        });
        this.root.add([title, subtitle]);

        const legendWidth = 380 * CARD_SCALE;
        this.buildLegend(cardX + cardWidth - 32 * CARD_SCALE - legendWidth, contentTop, legendWidth);
        const diagramBottom = this.buildDiagram(cardX, cardWidth, contentTop + 60 * CARD_SCALE, DIAGRAM_SCALE);

        // Keep the enlarged instructions at the bottom left, below the diagram.
        const bottomLimit = cardY + cardHeight - 32 * CARD_SCALE;
        const instructionsGap = 16 * CARD_SCALE;
        const instructionsMaxHeight = Math.max(0, bottomLimit - diagramBottom - instructionsGap);
        const instructionsWidth = Math.min(720 * CARD_SCALE, instructionsMaxHeight * (2172 / 724));
        const instructionsHeight = instructionsWidth * (724 / 2172);
        const instructionsX = contentX;
        this.buildInstructions(instructionsX, bottomLimit - instructionsHeight, instructionsWidth);
        this.buildSuccessInfo(cardX + cardWidth - 32 * CARD_SCALE, bottomLimit);

        // Numbered procedure tracker in the free space between the instructions and the feedback panel.
        const trackerX = instructionsX + instructionsWidth + 24;
        const trackerWidth = cardX + cardWidth - 32 * CARD_SCALE - 520 - 24 - trackerX;
        if (trackerWidth >= 320) this.buildProcedureTracker(trackerX, bottomLimit - 270, trackerWidth, 270);
    }

    // ---- Procedure tracker: every step, in order, with the current one marked -----------------

    private buildProcedureTracker(x: number, y: number, width: number, height: number) {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(x, y, width, height, 20);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, 20);
        const title = this.add.text(x + 22, y + 18, "URUTAN PROSEDUR", { fontFamily: FONT, fontStyle: "800", fontSize: 17, color: DARK_NAVY });
        const note = this.add.text(x + 22, y + 42, "Ikuti langkah secara berurutan", { fontFamily: FONT, fontStyle: "500", fontSize: 12, color: BODY_TEXT });
        this.trackerGraphics = this.add.graphics();
        this.root.add([card, title, note, this.trackerGraphics]);

        const columnWidth = (width - 44 - 12) / 2;
        PROCEDURE_STEPS.forEach((label, index) => {
            const column = Math.floor(index / 4);
            const row = index % 4;
            const rowX = x + 22 + column * (columnWidth + 12);
            const rowY = y + 70 + row * 48;
            this.trackerRects.push({ x: rowX, y: rowY, width: columnWidth, height: 42 });
            const mark = this.add.text(rowX + 22, rowY + 21, String(index + 1), { fontFamily: FONT, fontStyle: "800", fontSize: 13, color: "#ffffff" }).setOrigin(0.5);
            const text = this.add.text(rowX + 44, rowY + 21, label, { fontFamily: FONT, fontStyle: "600", fontSize: 13, color: BODY_TEXT, wordWrap: { width: columnWidth - 52 } }).setOrigin(0, 0.5);
            this.trackerMarks.push(mark);
            this.trackerLabels.push(text);
            this.root.add([mark, text]);
        });
    }

    private updateProcedureTracker() {
        const graphics = this.trackerGraphics;
        if (!graphics) return;
        const current = STEP_INDEX[this.simulatorStep];
        graphics.clear();
        this.trackerRects.forEach((rect, index) => {
            const done = index < current;
            const active = index === current;
            graphics.fillStyle(active ? 0xeaf3ff : done ? 0xebf8ef : 0xf7faff, 1);
            graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 10);
            if (active) { graphics.lineStyle(2, PRIMARY_BLUE, 1); graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 10); }
            graphics.fillStyle(done ? GREEN : active ? PRIMARY_BLUE : 0xb8c6dc, 1);
            graphics.fillCircle(rect.x + 22, rect.y + 21, 13);
            this.trackerMarks[index].setText(done ? "✓" : String(index + 1));
            this.trackerLabels[index].setColor(done ? GREEN_HEX : active ? DARK_NAVY : BODY_TEXT_HEX).setFontStyle(active ? "800" : "600");
        });
    }

    // ---- Floating "do this here" pointers over the control to use next ------------------------

    private buildHintPointers() {
        for (let i = 0; i < 2; i++) {
            const bg = this.add.graphics();
            const text = this.add.text(0, 0, "", { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: "#ffffff" }).setOrigin(0.5);
            const view = this.add.container(0, 0, [bg, text]).setVisible(false).setDepth(50);
            this.root.add(view);
            this.hintPointers.push({ view, bg, text, tween: null });
        }
    }

    private showHint(slot: number, x: number, y: number, label: string) {
        const pointer = this.hintPointers[slot];
        if (!pointer) return;
        pointer.text.setText(label);
        const width = pointer.text.width + 28;
        pointer.bg.clear();
        pointer.bg.fillStyle(PRIMARY_BLUE, 1);
        pointer.bg.fillRoundedRect(-width / 2, -30, width, 30, 15);
        pointer.bg.fillTriangle(-8, 0, 8, 0, 0, 10);
        pointer.text.setPosition(0, -15);
        pointer.tween?.stop();
        // y is the point being indicated; the bubble floats just above it.
        pointer.view.setPosition(x, Math.max(y, 164)).setVisible(true);
        const baseY = pointer.view.y;
        pointer.tween = this.tweens.add({ targets: pointer.view, y: baseY + 6, duration: 520, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }

    private hideHints() {
        this.hintPointers.forEach((pointer) => { pointer.tween?.stop(); pointer.tween = null; pointer.view.setVisible(false); });
    }

    private updateHintPointers() {
        this.hideHints();
        const valveTop = (valve: ValveWidget) => ({ x: valve.cardX + valve.cardWidth / 2, y: valve.cardTopY - 4 });
        const openHint = "Geser ke atas (Buka 100%)";
        const closeHint = "Geser ke bawah (Tutup 0%)";
        switch (this.simulatorStep) {
            case "READY": this.showHint(0, valveTop(this.valveA).x, valveTop(this.valveA).y, openHint); break;
            case "INLET_OPEN": this.showHint(0, this.pumpHighlight.x, this.pumpHighlight.y - 66 * this.valveA.scale, "Klik pompa: ON"); break;
            case "PUMP_RUNNING": this.showHint(0, valveTop(this.valveB).x, valveTop(this.valveB).y, openHint); break;
            case "SEPARATING": this.showHint(0, this.ocmValueText.x, this.ocmValueText.y - 34, "Tunggu OCM ≤ 15 ppm"); break;
            case "SAFE_TO_DISCHARGE": this.showHint(0, valveTop(this.valveD).x, valveTop(this.valveD).y, openHint); break;
            case "SHUTDOWN_CLOSE_OVERBOARD": this.showHint(0, valveTop(this.valveD).x, valveTop(this.valveD).y, closeHint); break;
            case "SHUTDOWN_STOP_PUMP": this.showHint(0, this.pumpHighlight.x, this.pumpHighlight.y - 66 * this.valveA.scale, "Klik pompa: OFF"); break;
            case "SHUTDOWN_CLOSE_VALVES":
                this.showHint(0, valveTop(this.valveA).x, valveTop(this.valveA).y, closeHint);
                this.showHint(1, valveTop(this.valveB).x, valveTop(this.valveB).y, closeHint);
                break;
            default: break;
        }
    }

    // ---- Legend (card_indikator_simulasi.png) --------------------------------------------

    private buildLegend(x: number, y: number, width: number): number {
        const height = width * (942 / 1670);
        const card = this.add.image(x + width / 2, y + height / 2, "ows.cardIndikator").setDisplaySize(width, height);
        this.root.add(card);
        return height;
    }

    // ---- Diagram (component_ows.png + overlaid valve/label widgets) -------------------------

    private buildDiagram(cardX: number, cardWidth: number, diagramTop: number, scale: number): number {
        const compWidth = 900 * 1.1 * scale;
        const compHeight = compWidth * (941 / 1671);
        const compLeft = cardX + cardWidth / 2 - compWidth / 2;
        const compTop = diagramTop + 80 * scale;

        const component = this.add.image(compLeft + compWidth / 2, compTop + compHeight / 2, "ows.component").setDisplaySize(compWidth, compHeight);
        this.root.add(component);

        // Fractional positions of each valve/the OCM screen within the
        // component artwork itself (eyeballed against the illustration).
        const valveAPos = { x: compLeft + compWidth * 0.24, y: compTop + compHeight * 0.5 };
        const valveBPos = { x: compLeft + compWidth * 0.47, y: compTop + compHeight * 0.18 };
        const ocmPos = { x: compLeft + compWidth * 0.666, y: compTop + compHeight * 0.605 };
        const valveDPos = { x: compLeft + compWidth * 0.835, y: compTop + compHeight * 0.735 };
        const pumpPos = { x: compLeft + compWidth * 0.19, y: compTop + compHeight * 0.79 };

        // Inlet / outlet tags either side of the diagram.
        const inletTag = this.buildFlowTag(compLeft - 150 * scale, valveAPos.y, "Inlet\n(From Bilge)", scale);
        const outletTag = this.buildFlowTag(compLeft + compWidth + 150 * scale, valveDPos.y, "Outlet\n(To Sea)", scale);
        this.root.add([inletTag, outletTag]);

        this.flowIndicators.push(
            { arrow: this.buildFlowArrow(compLeft - 70 * scale, valveAPos.y, scale), segment: "inlet" },
            { arrow: this.buildFlowArrow(ocmPos.x - 150 * scale, ocmPos.y, scale), segment: "processing" },
            { arrow: this.buildFlowArrow(compLeft + compWidth + 70 * scale, valveDPos.y, scale), segment: "outlet" },
        );

        this.valveA = this.buildValveWidget(valveAPos.x, valveAPos.y, "Valve A", "(Inlet)", scale);
        this.valveB = this.buildValveWidget(valveBPos.x, valveBPos.y, "Valve B", "(Top)", scale);
        // Valve D (overboard) sits downstream of the OCM in this diagram, so
        // it doesn't feed back into the PPM reading — it's still a fully
        // interactive slider, just not wired to the ppm calculation.
        this.valveD = this.buildValveWidget(valveDPos.x, valveDPos.y, "Valve D", "(Overboard)", scale);
        this.buildPumpInteraction(pumpPos.x, pumpPos.y, scale);

        this.buildOcmReadout(ocmPos.x, ocmPos.y, scale);

        return compTop + compHeight;
    }

    private buildPumpInteraction(x: number, y: number, scale: number) {
        this.pumpHighlight = this.add.circle(x, y, 62 * scale, 0xcfe1ff, 0.7).setStrokeStyle(3 * scale, PRIMARY_BLUE, 0.4);
        const hit = this.add.rectangle(x, y, 170 * scale, 110 * scale, 0xffffff, 0).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => this.handlePumpInteraction());

        const statusWidth = 104 * scale;
        const statusHeight = 30 * scale;
        const statusY = y + 72 * scale;
        this.pumpStatusBackground = this.add.graphics();
        this.pumpStatusBackground.setData("x", x);
        this.pumpStatusBackground.setData("y", statusY);
        this.pumpStatusBackground.setData("width", statusWidth);
        this.pumpStatusBackground.setData("height", statusHeight);
        this.pumpStatusText = this.add.text(x, statusY, "PUMP OFF", { fontFamily: FONT, fontStyle: "700", fontSize: 12 * scale, color: BODY_TEXT_HEX }).setOrigin(0.5);
        this.root.add([this.pumpHighlight, hit, this.pumpStatusBackground, this.pumpStatusText]);
    }

    private buildFlowTag(x: number, y: number, label: string, scale: number): GameObjects.GameObject {
        const width = 140 * scale;
        const height = 56 * scale;
        const bg = this.add.graphics();
        bg.fillStyle(0x0f2138, 1);
        bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 14 * scale);
        const text = this.add
            .text(x - width / 2 + 14 * scale, y, label, { fontFamily: FONT, fontStyle: "600", fontSize: 13 * scale, color: "#ffffff", align: "left", lineSpacing: 3 })
            .setOrigin(0, 0.5);
        return this.add.container(0, 0, [bg, text]);
    }

    private buildFlowArrow(x: number, y: number, scale: number): GameObjects.Text {
        const arrow = this.add.text(x, y, "→", { fontFamily: FONT, fontStyle: "600", fontSize: 26 * scale, color: BODY_TEXT_HEX }).setOrigin(0.5).setAlpha(0.3);
        this.root.add(arrow);
        return arrow;
    }

    /** A label card (title + sub-label) with a continuously-draggable
     * vertical Buka/Tutup slider, floating above the real valve on the
     * component artwork and joined to it by a thin connector line. */
    private buildValveWidget(x: number, valveY: number, title: string, sublabel: string, scale: number): ValveWidget {
        const cardWidth = 176 * scale;
        const cardHeight = 220 * scale;
        const cardGap = 24 * scale;
        const cardTopY = valveY - cardGap - cardHeight;
        const connectorBottomY = valveY - 12 * scale;
        const cardX = x - cardWidth / 2;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardTopY, cardWidth, cardHeight, 14 * scale);
        card.fillStyle(0xeaf3ff, 1);
        card.fillRoundedRect(cardX + 2 * scale, cardTopY + 2 * scale, cardWidth - 4 * scale, 58 * scale, { tl: 12 * scale, tr: 12 * scale, bl: 0, br: 0 });
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(cardX, cardTopY, cardWidth, cardHeight, 14 * scale);

        const titleText = this.add.text(x, cardTopY + 10 * scale, title, { fontFamily: FONT, fontStyle: "700", fontSize: 16 * scale, color: DARK_NAVY }).setOrigin(0.5, 0);
        const subText = this.add.text(x, cardTopY + 32 * scale, sublabel, { fontFamily: FONT, fontStyle: "600", fontSize: 11 * scale, color: BODY_TEXT }).setOrigin(0.5, 0);

        const actionPills = this.add.graphics();
        const actionPillWidth = 94 * scale;
        const actionPillHeight = 24 * scale;
        actionPills.fillStyle(0xeaf3ff, 1);
        actionPills.fillRoundedRect(x - actionPillWidth / 2, cardTopY + 68 * scale, actionPillWidth, actionPillHeight, actionPillHeight / 2);
        actionPills.fillRoundedRect(x - actionPillWidth / 2, cardTopY + cardHeight - 31 * scale, actionPillWidth, actionPillHeight, actionPillHeight / 2);
        const openLabel = this.add.text(x, cardTopY + 80 * scale, "Buka", { fontFamily: FONT, fontStyle: "700", fontSize: 13 * scale, color: DARK_NAVY }).setOrigin(0.5);

        // A thick pill-shaped track (not a thin line) with a large solid
        // knob riding on it — Buka/Tutup labels sit above and below rather
        // than beside it, matching the reference control's look.
        const trackWidth = 28 * scale;
        const trackTopY = cardTopY + 102 * scale;
        const trackBottomY = cardTopY + cardHeight - 48 * scale;
        const track = this.add.graphics();
        track.fillStyle(0xd8e3f7, 1);
        track.fillRoundedRect(x - trackWidth / 2, trackTopY, trackWidth, trackBottomY - trackTopY, trackWidth / 2);
        const tickX = x + 26 * scale;
        [trackTopY, (trackTopY + trackBottomY) / 2, trackBottomY].forEach((tickY) => track.fillRoundedRect(tickX, tickY - 2 * scale, 16 * scale, 4 * scale, 2 * scale));
        const tickStyle = { fontFamily: FONT, fontStyle: "600", fontSize: 10 * scale, color: BODY_TEXT };
        const fullLabel = this.add.text(tickX + 21 * scale, trackTopY, "100%", tickStyle).setOrigin(0, 0.5);
        const midLabel = this.add.text(tickX + 21 * scale, (trackTopY + trackBottomY) / 2, "50%", tickStyle).setOrigin(0, 0.5);
        const zeroLabel = this.add.text(tickX + 21 * scale, trackBottomY, "0%", tickStyle).setOrigin(0, 0.5);

        const closedLabel = this.add.text(x, cardTopY + cardHeight - 19 * scale, "Tutup", { fontFamily: FONT, fontStyle: "700", fontSize: 12 * scale, color: BODY_TEXT }).setOrigin(0.5);

        const knob = this.add.circle(x, trackBottomY, 16 * scale, PRIMARY_BLUE, 1);
        knob.setStrokeStyle(3 * scale, 0xffffff, 1);

        const connector = this.add.rectangle(cardX + cardWidth / 2, cardTopY + cardHeight, 2 * scale, Math.max(0, connectorBottomY - (cardTopY + cardHeight)), 0x94a3b8, 1).setOrigin(0.5, 0);

        const hit = this.add
            .rectangle(x, cardTopY + cardHeight / 2, cardWidth, cardHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        const widget: ValveWidget = { knob, trackTopY, trackBottomY, openness: 0, card, cardX, cardTopY, cardWidth, cardHeight, scale };

        hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            playSfx(this, SFX_KEYS.click);
            this.draggingValve = widget;
            this.updateValveFromPointer(widget, pointer);
        });

        this.root.add([card, titleText, subText, actionPills, track, fullLabel, midLabel, zeroLabel, openLabel, closedLabel, connector, knob, hit]);

        return widget;
    }

    // ---- Drag handling (scene-level, so the pointer can move off the knob mid-drag) -------

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.draggingValve) {
            this.updateValveFromPointer(this.draggingValve, pointer);
        }
    }

    private handlePointerUp() {
        const releasedValve = this.draggingValve;
        this.draggingValve = null;
        if (releasedValve) {
            this.snapValve(releasedValve);
            this.evaluateProcedure();
        }
    }

    private pointerToDesignY(pointer: Phaser.Input.Pointer): number {
        return (pointer.y - this.currentRootY) / this.currentScale;
    }

    private updateValveFromPointer(widget: ValveWidget, pointer: Phaser.Input.Pointer) {
        const designY = this.pointerToDesignY(pointer);
        const clampedY = Math.min(widget.trackBottomY, Math.max(widget.trackTopY, designY));
        widget.knob.y = clampedY;
        widget.openness = 1 - (clampedY - widget.trackTopY) / (widget.trackBottomY - widget.trackTopY);
    }

    private snapValve(widget: ValveWidget) {
        if (widget.openness <= CLOSED_THRESHOLD) this.setValveOpenness(widget, 0, true);
        if (widget.openness >= OPEN_THRESHOLD) this.setValveOpenness(widget, 1, true);
    }

    private setValveOpenness(widget: ValveWidget, openness: number, animate = false) {
        const targetY = widget.trackBottomY - openness * (widget.trackBottomY - widget.trackTopY);
        widget.openness = openness;
        if (animate) {
            this.tweens.add({ targets: widget.knob, y: targetY, duration: 160, ease: "Quad.Out" });
        } else {
            widget.knob.y = targetY;
        }
    }

    // ---- OCM readout (just the live number — no card/bar/caption) -------------------------

    private buildOcmReadout(x: number, y: number, scale: number) {
        this.ocmValueText = this.add.text(x, y, `${Math.round(this.ppm)} ppm`, { fontFamily: FONT, fontStyle: "600", fontSize: 22 * scale, color: RED_HEX }).setOrigin(0.5);
        this.root.add(this.ocmValueText);
    }

    private handlePumpInteraction() {
        playSfx(this, SFX_KEYS.click);
        if (!this.pumpOn) {
            if (this.valveA.openness < OPEN_THRESHOLD) {
                this.operationErrors++;
                this.setFeedback("Aliran Masuk Belum Tersedia", "Buka Valve A terlebih dahulu sebelum menjalankan pompa.", "warning");
                return;
            }
            this.pumpOn = true;
            if (!this.simulationStartedAt) this.simulationStartedAt = this.time.now;
            this.evaluateProcedure();
            return;
        }

        this.pumpOn = false;
        if (this.simulatorStep === "SEPARATING") {
            this.operationErrors++;
            this.stopSeparation();
            this.simulatorStep = "INLET_OPEN";
            this.setFeedback("Pompa Berhenti", "Proses pemisahan tidak dapat dilanjutkan. Nyalakan kembali pompa untuk melanjutkan.", "warning");
            this.updateSimulatorUi(true);
            return;
        }
        this.evaluateProcedure();
    }

    private conditionsForSeparation() {
        return this.valveA.openness >= OPEN_THRESHOLD && this.pumpOn && this.valveB.openness >= OPEN_THRESHOLD;
    }

    private evaluateProcedure() {
        if (this.simulatorStep === "COMPLETE" || this.simulatorStep === "DISCHARGING") return;

        if (this.simulatorStep === "SHUTDOWN_CLOSE_OVERBOARD") {
            if (this.valveD.openness <= CLOSED_THRESHOLD) this.simulatorStep = "SHUTDOWN_STOP_PUMP";
            this.updateSimulatorUi();
            return;
        }
        if (this.simulatorStep === "SHUTDOWN_STOP_PUMP") {
            if (!this.pumpOn) this.simulatorStep = "SHUTDOWN_CLOSE_VALVES";
            this.updateSimulatorUi();
            return;
        }
        if (this.simulatorStep === "SHUTDOWN_CLOSE_VALVES") {
            if (this.valveA.openness <= CLOSED_THRESHOLD && this.valveB.openness <= CLOSED_THRESHOLD) this.completeSimulation();
            else this.updateSimulatorUi();
            return;
        }

        if (this.valveD.openness >= OPEN_THRESHOLD) {
            if (this.ppm > 15) {
                this.handleUnsafeDischarge();
                return;
            }
            if (this.simulatorStep === "SAFE_TO_DISCHARGE") this.startDischarge();
        }

        if (this.simulatorStep === "SAFE_TO_DISCHARGE") {
            this.updateSimulatorUi();
            return;
        }

        if (this.valveA.openness < OPEN_THRESHOLD) {
            if (this.separationTimer) {
                this.operationErrors++;
                this.stopSeparation();
                this.setFeedback("Aliran OWS Terhenti", "Periksa posisi Valve A dan Valve B sebelum melanjutkan proses.", "warning");
            }
            this.simulatorStep = "READY";
            this.updateSimulatorUi(true);
            return;
        }
        if (!this.pumpOn) {
            this.simulatorStep = "INLET_OPEN";
            this.updateSimulatorUi();
            return;
        }
        if (this.valveB.openness < OPEN_THRESHOLD) {
            if (this.separationTimer) {
                this.operationErrors++;
                this.stopSeparation();
                this.setFeedback("Aliran OWS Terhenti", "Buka Valve B agar aliran dapat menuju proses OWS.", "warning");
            }
            this.simulatorStep = "PUMP_RUNNING";
            this.updateSimulatorUi(true);
            return;
        }
        this.startSeparation();
    }

    private startSeparation() {
        if (this.ppm <= 15) {
            this.simulatorStep = "SAFE_TO_DISCHARGE";
            this.updateSimulatorUi();
            return;
        }
        this.simulatorStep = "SEPARATING";
        if (!this.separationTimer) {
            this.separationTimer = this.time.addEvent({ delay: 550, loop: true, callback: () => {
                if (!this.conditionsForSeparation()) {
                    this.stopSeparation();
                    this.evaluateProcedure();
                    return;
                }
                this.ppm = Math.max(TARGET_FLOOR_PPM, this.ppm - (this.ppm > 18 ? 4 : 2));
                this.refreshOcmDisplay();
                if (this.ppm <= 15) {
                    this.stopSeparation();
                    this.simulatorStep = "SAFE_TO_DISCHARGE";
                }
                this.updateSimulatorUi();
            }});
        }
        this.updateSimulatorUi();
    }

    private stopSeparation() {
        this.separationTimer?.remove(false);
        this.separationTimer = null;
    }

    private handleUnsafeDischarge() {
        this.operationErrors++;
        this.unsafeDischargeAttempts++;
        this.setFeedback("Pembuangan Tidak Aman", `Nilai OCM masih ${Math.round(this.ppm)} ppm (batas aman ≤ 15 ppm). Valve D (Overboard) hanya boleh dibuka setelah OCM turun ≤ 15 ppm — tunggu proses pemisahan selesai.`, "error");
        this.setValveOpenness(this.valveD, 0, true);
        playSfx(this, SFX_KEYS.quizWrong);
        this.updateFlowVisualization();
    }

    private startDischarge() {
        if (this.dischargeTimer) return;
        this.simulatorStep = "DISCHARGING";
        this.dischargeTicks = 0;
        this.updateSimulatorUi();
        this.dischargeTimer = this.time.addEvent({ delay: 550, loop: true, callback: () => {
            this.dischargeTicks++;
            this.ppm = Math.max(TARGET_FLOOR_PPM, this.ppm - 2);
            this.refreshOcmDisplay();
            if (this.dischargeTicks >= 5) {
                this.stopDischargeTimer();
                this.simulatorStep = "SHUTDOWN_CLOSE_OVERBOARD";
                this.updateSimulatorUi();
            }
        }});
    }

    private stopDischargeTimer() {
        this.dischargeTimer?.remove(false);
        this.dischargeTimer = null;
        this.dischargeTicks = 0;
    }

    private completeSimulation() {
        this.stopSeparation();
        this.stopDischargeTimer();
        this.simulatorStep = "COMPLETE";
        setSimulatorProgress(true);
        playSfx(this, SFX_KEYS.quizCorrect);
        this.updateSimulatorUi();
    }

    // ---- Reusable contextual feedback, inside the existing bottom-right area ---------

    private buildSuccessInfo(right: number, bottom: number) {
        const width = 520;
        const height = 270;
        const background = this.add.graphics();
        this.feedbackBackground = background;

        this.feedbackTitle = this.add.text(24, 22, "", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 22,
            color: GREEN_HEX,
            wordWrap: { width: width - 48 },
        });
        this.feedbackBody = this.add.text(24, 66, "", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 17,
            color: BODY_TEXT,
            wordWrap: { width: width - 48 }, lineSpacing: 4,
        });
        this.feedbackSummary = this.add.text(24, 132, "", { fontFamily: FONT, fontStyle: "500", fontSize: 14, color: BODY_TEXT, wordWrap: { width: width - 48 }, lineSpacing: 3 });

        this.quizButton = new Button(this, {
            x: width - 24 - 220 / 2,
            y: height - 24 - 56 / 2,
            width: 220,
            height: 56,
            text: "Lanjut Kuis",
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 20,
            borderRadius: 18,
            fillColor: GREEN,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        this.quizButton.on("pointerdown", () => {
            if (this.simulatorStep !== "COMPLETE") return;
            this.draggingValve = null;
            playSfx(this, SFX_KEYS.click);
            this.goTo("OwsQuiz");
        });

        this.feedbackInfo = this.add.container(right - width, bottom - height, [background, this.feedbackTitle, this.feedbackBody, this.feedbackSummary, this.quizButton.view]);
        this.root.add(this.feedbackInfo);
    }

    private refreshOcmDisplay(animate = true) {
        const colorHex = this.ppm <= 15 ? GREEN_HEX : this.ppm <= 30 ? YELLOW_HEX : this.ppm <= 100 ? AMBER_HEX : RED_HEX;
        this.ocmValueText.setText(`${Math.round(this.ppm)} ppm`);
        this.ocmValueText.setColor(colorHex);
        if (animate) {
            this.tweens.killTweensOf(this.ocmValueText);
            this.tweens.add({ targets: this.ocmValueText, scaleX: 1.08, scaleY: 1.08, duration: 110, yoyo: true, ease: "Quad.Out" });
        }
    }

    private updateSimulatorUi(preserveFeedback = false) {
        this.updatePumpStatus();
        this.updateFlowVisualization();
        this.updateControlHighlights();
        this.updateProcedureTracker();
        this.updateHintPointers();
        if (preserveFeedback) return;

        const ppm = Math.round(this.ppm);
        switch (this.simulatorStep) {
            case "INLET_OPEN":
                this.setFeedback("Langkah 2/8 · Nyalakan Bilge Pump", "Klik area Bilge Pump sampai statusnya berubah menjadi PUMP ON. Pompa menekan bilge water melewati unit pemisah.", "neutral");
                break;
            case "PUMP_RUNNING":
                this.setFeedback("Langkah 3/8 · Buka Valve B (Top)", "Geser slider Valve B ke atas sampai 100% (Buka) agar campuran air-minyak mengalir ke proses pemisahan OWS.", "neutral");
                break;
            case "SEPARATING":
                this.setFeedback("Langkah 4/8 · Pantau OCM", `Jangan ubah katup atau pompa. Tunggu pembacaan OCM turun sampai ≤ 15 ppm (batas MARPOL Annex I). Saat ini: ${ppm} ppm.`, "neutral");
                break;
            case "SAFE_TO_DISCHARGE":
                this.setFeedback("Langkah 5/8 · Buka Valve D (Overboard)", `OCM ${ppm} ppm sudah ≤ 15 ppm, jadi aman. Geser slider Valve D ke atas sampai 100% (Buka) untuk mengalirkan air bersih ke laut.`, "success");
                break;
            case "DISCHARGING":
                this.setFeedback("Langkah 5/8 · Pembuangan Berlangsung", `OCM: ${ppm} ppm. Air hasil pemisahan sedang dialirkan ke laut. Tunggu sampai proses selesai — jangan menutup Valve D lebih awal.`, "success");
                break;
            case "SHUTDOWN_CLOSE_OVERBOARD":
                this.setFeedback("Langkah 6/8 · Tutup Valve D", "Pembuangan selesai. Geser slider Valve D ke bawah sampai 0% (Tutup) untuk menghentikan aliran ke laut.", "neutral");
                break;
            case "SHUTDOWN_STOP_PUMP":
                this.setFeedback("Langkah 7/8 · Matikan Bilge Pump", "Valve D sudah tertutup. Klik area Bilge Pump sampai statusnya PUMP OFF.", "neutral");
                break;
            case "SHUTDOWN_CLOSE_VALVES":
                this.setFeedback("Langkah 8/8 · Tutup Valve A dan B", "Geser slider Valve A dan Valve B ke bawah sampai 0% (Tutup) agar sistem kembali ke kondisi aman.", "neutral");
                break;
            case "COMPLETE":
                this.setFeedback(
                    "OWS Shutdown Complete",
                    "Prosedur pengoperasian OWS berhasil diselesaikan. Sistem telah dikembalikan ke kondisi aman.",
                    "success",
                    `OCM akhir: ${ppm} ppm   •   Overboard: Closed\nPump: OFF   •   Valve A: Closed   •   Valve B: Closed`,
                );
                break;
            case "READY":
            default:
                this.setFeedback("Langkah 1/8 · Buka Valve A (Inlet)", "Geser slider Valve A ke atas sampai 100% (Buka). Valve A mengalirkan bilge water dari tangki bilge masuk ke OWS.", "neutral");
                break;
        }
    }

    private setFeedback(title: string, body: string, tone: "neutral" | "success" | "warning" | "error", summary = "") {
        const style = tone === "success"
            ? { fill: 0xeaf7ef, line: GREEN, text: GREEN_HEX }
            : tone === "warning"
                ? { fill: 0xfdf3e7, line: 0xb5651d, text: AMBER_HEX }
                : tone === "error"
                    ? { fill: 0xfceaea, line: 0xc0392b, text: RED_HEX }
                    : { fill: 0xf7faff, line: PRIMARY_BLUE, text: PRIMARY_BLUE_HEX };
        const width = 520;
        const height = 270;
        this.feedbackBackground.clear();
        this.feedbackBackground.fillStyle(style.fill, 1);
        this.feedbackBackground.fillRoundedRect(0, 0, width, height, 20);
        this.feedbackBackground.lineStyle(2, style.line, 0.6);
        this.feedbackBackground.strokeRoundedRect(0, 0, width, height, 20);
        this.feedbackTitle.setText(title).setColor(style.text);
        this.feedbackBody.setText(body);
        this.feedbackSummary.setText(summary);
        this.quizButton.view.setVisible(this.simulatorStep === "COMPLETE");
    }

    private updatePumpStatus() {
        const x = this.pumpStatusBackground.getData("x") as number;
        const y = this.pumpStatusBackground.getData("y") as number;
        const width = this.pumpStatusBackground.getData("width") as number;
        const height = this.pumpStatusBackground.getData("height") as number;
        const color = this.pumpOn ? GREEN : 0xdce6f5;
        this.pumpStatusBackground.clear();
        this.pumpStatusBackground.fillStyle(this.pumpOn ? 0xe3f7ec : 0xf7faff, 1);
        this.pumpStatusBackground.fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
        this.pumpStatusBackground.lineStyle(2, color, 1);
        this.pumpStatusBackground.strokeRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
        this.pumpStatusText.setText(this.pumpOn ? "PUMP ON" : "PUMP OFF").setColor(this.pumpOn ? GREEN_HEX : BODY_TEXT_HEX);
    }

    private updateFlowVisualization() {
        const inletActive = this.valveA.openness >= OPEN_THRESHOLD;
        const processingActive = this.valveA.openness >= OPEN_THRESHOLD && this.pumpOn;
        const outletActive = this.simulatorStep === "DISCHARGING";
        this.flowIndicators.forEach(({ arrow, segment }) => {
            const active = segment === "inlet" ? inletActive : segment === "processing" ? processingActive : outletActive;
            arrow.setAlpha(active ? 1 : 0.3);
            arrow.setColor(active && segment === "outlet" ? GREEN_HEX : active ? PRIMARY_BLUE_HEX : BODY_TEXT_HEX);
        });
    }

    private updateControlHighlights() {
        const highlighted: ValveWidget[] = this.simulatorStep === "READY" ? [this.valveA]
            : this.simulatorStep === "PUMP_RUNNING" ? [this.valveB]
                : this.simulatorStep === "SAFE_TO_DISCHARGE" || this.simulatorStep === "SHUTDOWN_CLOSE_OVERBOARD" ? [this.valveD]
                    : this.simulatorStep === "SHUTDOWN_CLOSE_VALVES" ? [this.valveA, this.valveB] : [];
        [this.valveA, this.valveB, this.valveD].forEach((valve) => this.redrawValveCard(valve, highlighted.includes(valve)));
        const highlightPump = this.simulatorStep === "INLET_OPEN" || this.simulatorStep === "SHUTDOWN_STOP_PUMP";
        this.pumpHighlight.setFillStyle(0xcfe1ff, 0.7);
        this.pumpHighlight.setStrokeStyle(3, PRIMARY_BLUE, this.pumpOn || highlightPump ? 0.9 : 0.65);
    }

    private redrawValveCard(widget: ValveWidget, highlighted: boolean) {
        widget.card.clear();
        widget.card.fillStyle(0xffffff, 1);
        widget.card.fillRoundedRect(widget.cardX, widget.cardTopY, widget.cardWidth, widget.cardHeight, 14 * widget.scale);
        widget.card.fillStyle(0xeaf3ff, 1);
        widget.card.fillRoundedRect(
            widget.cardX + 2 * widget.scale,
            widget.cardTopY + 2 * widget.scale,
            widget.cardWidth - 4 * widget.scale,
            58 * widget.scale,
            { tl: 12 * widget.scale, tr: 12 * widget.scale, bl: 0, br: 0 },
        );
        widget.card.lineStyle(highlighted ? 3 : 2, highlighted ? PRIMARY_BLUE : BORDER_BLUE, 1);
        widget.card.strokeRoundedRect(widget.cardX, widget.cardTopY, widget.cardWidth, widget.cardHeight, 14 * widget.scale);
    }

    // ---- Instructions (card_intruksi_simulasi.png) ---------------------------------------

    private buildInstructions(x: number, y: number, width: number): number {
        const height = width * (724 / 2172);
        const card = this.add.image(x + width / 2, y + height / 2, "ows.cardInstruksi").setDisplaySize(width, height);
        this.root.add(card);
        return height;
    }

    // ---- Layout -------------------------------------------------------------------------

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        const rootX = (width - DESIGN_WIDTH * scale) / 2;
        const rootY = (height - DESIGN_HEIGHT * scale) / 2;
        this.root.setPosition(rootX, rootY);

        this.currentScale = scale;
        this.currentRootY = rootY;
    }
}
