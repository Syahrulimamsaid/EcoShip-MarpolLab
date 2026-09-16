import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
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

interface ValveWidget {
    knob: GameObjects.Arc;
    trackTopY: number;
    trackBottomY: number;
    /** 0 = fully closed (Tutup), 1 = fully open (Buka) — continuously
     * adjustable, not a binary toggle. */
    openness: number;
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
    private draggingValve: ValveWidget | null = null;

    private ppm = START_PPM;
    private progressReported = false;
    private ocmValueText!: GameObjects.Text;
    private flowArrows: GameObjects.Text[] = [];
    private successInfo!: GameObjects.Container;
    private safeValueText!: GameObjects.Text;

    private currentScale = 1;
    private currentRootY = 0;

    constructor() {
        super("SimulatorOws");
    }

    create() {
        this.background = this.add.image(0, 0, "ows.background");
        this.root = this.add.container(0, 0);

        this.ppm = START_PPM;
        this.progressReported = false;
        this.flowArrows = [];
        this.draggingValve = null;

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildMainCard());
        this.transitionGroups = groups;

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        this.refreshOcmDisplay();

        this.input.on("pointermove", this.handlePointerMove, this);
        this.input.on("pointerup", this.handlePointerUp, this);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
            this.input.off("pointermove", this.handlePointerMove, this);
            this.input.off("pointerup", this.handlePointerUp, this);
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
        const backWidth = 165;
        const backHeight = backWidth * (558 / 1780);
        const headerY = 32;
        const centerY = headerY + backHeight / 2;
        const backButton = this.add
            .image(MARGIN + backWidth / 2, centerY, "ows.btnKembali")
            .setDisplaySize(backWidth, backHeight)
            .setInteractive({ useHandCursor: true });
        backButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        // Give the simulator the same contextual description as the quiz.
        const crumbX = MARGIN + backWidth + 20;
        const crumbHeight = backHeight;
        const badgeText = this.add.text(0, 0, "MODUL SIMULATOR OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 48;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Simulator OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 22 + chevron.width + 10 + label.width + 26;
        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, headerY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, headerY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, headerY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 22, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        this.root.add([backButton, breadcrumb, badgeText, chevron, label]);
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

        const title = this.add.text(contentX, contentTop, "AREA SIMULASI OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 24 * CARD_SCALE, color: DARK_NAVY });
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

        // Inlet / outlet tags either side of the diagram.
        const inletTag = this.buildFlowTag(compLeft - 150 * scale, valveAPos.y, "Inlet\n(From Bilge)", scale);
        const outletTag = this.buildFlowTag(compLeft + compWidth + 150 * scale, valveDPos.y, "Outlet\n(To Sea)", scale);
        this.root.add([inletTag, outletTag]);

        this.flowArrows.push(
            this.buildFlowArrow(compLeft - 70 * scale, valveAPos.y, scale),
            this.buildFlowArrow(compLeft + compWidth + 70 * scale, valveDPos.y, scale),
        );

        this.valveA = this.buildValveWidget(valveAPos.x, valveAPos.y, "Valve A", "(Inlet)", scale);
        this.valveB = this.buildValveWidget(valveBPos.x, valveBPos.y, "Valve B", "(Top)", scale);
        // Valve D (overboard) sits downstream of the OCM in this diagram, so
        // it doesn't feed back into the PPM reading — it's still a fully
        // interactive slider, just not wired to the ppm calculation.
        this.buildValveWidget(valveDPos.x, valveDPos.y, "Valve D", "(Overboard)", scale);

        this.buildOcmReadout(ocmPos.x, ocmPos.y, scale);

        return compTop + compHeight;
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
        const cardWidth = 150 * scale;
        const cardHeight = 196 * scale;
        const cardGap = 30 * scale;
        const cardTopY = valveY - cardGap - cardHeight;
        const connectorBottomY = valveY - 12 * scale;
        const cardX = x - cardWidth / 2;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardTopY, cardWidth, cardHeight, 14 * scale);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(cardX, cardTopY, cardWidth, cardHeight, 14 * scale);

        const titleText = this.add.text(x, cardTopY + 16 * scale, title, { fontFamily: FONT, fontStyle: "600", fontSize: 15 * scale, color: DARK_NAVY }).setOrigin(0.5, 0);
        const subText = this.add.text(x, cardTopY + 36 * scale, sublabel, { fontFamily: FONT, fontStyle: "600", fontSize: 11 * scale, color: BODY_TEXT }).setOrigin(0.5, 0);

        const openLabel = this.add.text(x, cardTopY + 66 * scale, "Buka", { fontFamily: FONT, fontStyle: "600", fontSize: 13 * scale, color: DARK_NAVY }).setOrigin(0.5, 0.5);

        // A thick pill-shaped track (not a thin line) with a large solid
        // knob riding on it — Buka/Tutup labels sit above and below rather
        // than beside it, matching the reference control's look.
        const trackWidth = 26 * scale;
        const trackTopY = cardTopY + 84 * scale;
        const trackBottomY = cardTopY + cardHeight - 34 * scale;
        const track = this.add.graphics();
        track.fillStyle(0xd8e3f7, 1);
        track.fillRoundedRect(x - trackWidth / 2, trackTopY, trackWidth, trackBottomY - trackTopY, trackWidth / 2);

        const closedLabel = this.add.text(x, cardTopY + cardHeight - 16 * scale, "Tutup", { fontFamily: FONT, fontStyle: "600", fontSize: 12 * scale, color: BODY_TEXT }).setOrigin(0.5, 0.5);

        const knob = this.add.circle(x, trackBottomY, 16 * scale, PRIMARY_BLUE, 1);
        knob.setStrokeStyle(3 * scale, 0xffffff, 1);

        const connector = this.add.rectangle(cardX + cardWidth / 2, cardTopY + cardHeight, 2 * scale, Math.max(0, connectorBottomY - (cardTopY + cardHeight)), 0x94a3b8, 1).setOrigin(0.5, 0);

        const hit = this.add
            .rectangle(x, cardTopY + cardHeight / 2, cardWidth, cardHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        const widget: ValveWidget = { knob, trackTopY, trackBottomY, openness: 0 };

        hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            playSfx(this, SFX_KEYS.click);
            this.draggingValve = widget;
            this.updateValveFromPointer(widget, pointer);
        });

        this.root.add([card, titleText, subText, track, openLabel, closedLabel, connector, knob, hit]);

        return widget;
    }

    // ---- Drag handling (scene-level, so the pointer can move off the knob mid-drag) -------

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.draggingValve) {
            this.updateValveFromPointer(this.draggingValve, pointer);
        }
    }

    private handlePointerUp() {
        this.draggingValve = null;
    }

    private pointerToDesignY(pointer: Phaser.Input.Pointer): number {
        return (pointer.y - this.currentRootY) / this.currentScale;
    }

    private updateValveFromPointer(widget: ValveWidget, pointer: Phaser.Input.Pointer) {
        const designY = this.pointerToDesignY(pointer);
        const clampedY = Math.min(widget.trackBottomY, Math.max(widget.trackTopY, designY));
        widget.knob.y = clampedY;
        widget.openness = 1 - (clampedY - widget.trackTopY) / (widget.trackBottomY - widget.trackTopY);
        this.recomputePpm();
    }

    // ---- OCM readout (just the live number — no card/bar/caption) -------------------------

    private buildOcmReadout(x: number, y: number, scale: number) {
        this.ocmValueText = this.add.text(x, y, `${Math.round(this.ppm)} ppm`, { fontFamily: FONT, fontStyle: "600", fontSize: 22 * scale, color: RED_HEX }).setOrigin(0.5);
        this.root.add(this.ocmValueText);
    }

    private recomputePpm() {
        const flowFactor = Math.min(this.valveA.openness, this.valveB.openness);
        this.ppm = START_PPM - (START_PPM - TARGET_FLOOR_PPM) * flowFactor;
        this.refreshOcmDisplay();

        this.flowArrows.forEach((arrow) => {
            arrow.setAlpha(0.3 + flowFactor * 0.7);
            arrow.setColor(flowFactor > 0.05 ? PRIMARY_BLUE_HEX : BODY_TEXT_HEX);
        });

        if (this.ppm <= 15 && !this.progressReported) {
            this.progressReported = true;
            setSimulatorProgress(true);
        }
    }

    // ---- Safe status and quiz action, inside the bottom-right of the whiteboard ---------

    private buildSuccessInfo(right: number, bottom: number) {
        const width = 520;
        const height = 210;
        const background = this.add.graphics();
        background.fillStyle(0xeaf7ef, 1);
        background.fillRoundedRect(0, 0, width, height, 20);
        background.lineStyle(2, GREEN, 0.25);
        background.strokeRoundedRect(0, 0, width, height, 20);

        const title = this.add.text(24, 22, "Batas Aman Tercapai!", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 24,
            color: GREEN_HEX,
        });
        this.safeValueText = this.add.text(24, 62, "", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 18,
            color: BODY_TEXT,
            wordWrap: { width: width - 48 },
        });

        const quizButton = new Button(this, {
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
        quizButton.on("pointerdown", () => {
            if (this.ppm > 15) return;
            this.draggingValve = null;
            playSfx(this, SFX_KEYS.click);
            this.goTo("OwsQuiz");
        });

        this.successInfo = this.add.container(right - width, bottom - height, [background, title, this.safeValueText, quizButton.view]);
        this.successInfo.setVisible(false);
        this.root.add(this.successInfo);
    }

    private refreshOcmDisplay() {
        const colorHex = this.ppm <= 15 ? GREEN_HEX : this.ppm <= 30 ? YELLOW_HEX : this.ppm <= 100 ? AMBER_HEX : RED_HEX;
        this.ocmValueText.setText(`${Math.round(this.ppm)} ppm`);
        this.ocmValueText.setColor(colorHex);
        this.successInfo.setVisible(this.ppm <= 15);
        this.safeValueText.setText(`Nilai OCM ${Math.round(this.ppm)} ppm sudah memenuhi batas aman simulasi (maksimal 15 ppm).`);
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
