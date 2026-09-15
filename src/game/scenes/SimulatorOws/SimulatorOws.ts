import { GameObjects, Scale, Scene } from "phaser";

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

const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const YELLOW = 0xf1c40f;
const YELLOW_HEX = "#b7930a";
const AMBER = 0xe0792e;
const AMBER_HEX = "#b5651d";
const RED = 0xc0392b;
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

    // ---- Header (just the back button — no breadcrumb/help pill) ------------------------

    private buildHeader() {
        const centerY = MARGIN + 24;
        const backWidth = 140;
        const backHeight = backWidth * (558 / 1780);
        const backButton = this.add
            .image(MARGIN + backWidth / 2, centerY, "ows.btnKembali")
            .setDisplaySize(backWidth, backHeight)
            .setInteractive({ useHandCursor: true });
        backButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("PilihAktivitasOws");
        });

        this.root.add(backButton);
    }

    // ---- Main card ---------------------------------------------------------------------

    private buildMainCard() {
        const cardX = MARGIN;
        const cardY = 92;
        const cardWidth = DESIGN_WIDTH - MARGIN * 2;
        const cardHeight = DESIGN_HEIGHT - cardY - MARGIN;

        const shadow = this.add.graphics();
        shadow.fillStyle(0x0a1a33, 0.06);
        shadow.fillRoundedRect(cardX, cardY + 4, cardWidth, cardHeight, 24);
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 24);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 24);
        this.root.add([shadow, card]);

        const contentX = cardX + 32;
        const contentTop = cardY + 28;

        const title = this.add.text(contentX, contentTop, "AREA SIMULASI OWS", { fontFamily: FONT, fontSize: 24, fontStyle: "800", color: DARK_NAVY });
        const subtitle = this.add.text(contentX, title.y + title.height + 6, "Atur posisi katup dan amati arah aliran serta nilai kandungan minyak pada OCM.", {
            fontFamily: FONT,
            fontSize: 14,
            color: BODY_TEXT,
        });
        this.root.add([title, subtitle]);

        this.buildLegend(cardX + cardWidth - 32 - 380, contentTop, 380);
        this.buildDiagram(cardX, cardWidth, contentTop + 90);
        this.buildInstructions(contentX, cardY + cardHeight - 32 - 130, 900);
    }

    // ---- Legend -------------------------------------------------------------------------

    private buildLegend(x: number, y: number, width: number) {
        const height = 200;
        const bg = this.add.graphics();
        bg.fillStyle(0xf7faff, 1);
        bg.fillRoundedRect(x, y, width, height, 14);
        bg.lineStyle(2, BORDER_BLUE, 1);
        bg.strokeRoundedRect(x, y, width, height, 14);

        const heading = this.add.text(x + 16, y + 14, "Indikator Nilai OCM (ppm)", { fontFamily: FONT, fontSize: 13, fontStyle: "800", color: DARK_NAVY });

        const rows: Array<[number, string, string]> = [
            [GREEN, "≤ 15", "Aman (dapat dibuang ke laut)"],
            [YELLOW, "16 – 30", "Perhatian"],
            [AMBER, "31 – 100", "Tidak Aman"],
            [RED, "> 100", "Sangat Tidak Aman"],
        ];

        const items: GameObjects.GameObject[] = [bg, heading];
        rows.forEach(([color, range, label], index) => {
            const rowY = y + 48 + index * 36;
            const dot = this.add.circle(x + 24, rowY, 7, color, 1);
            const rangeText = this.add.text(x + 42, rowY, range, { fontFamily: FONT, fontSize: 13, fontStyle: "800", color: DARK_NAVY }).setOrigin(0, 0.5);
            const labelText = this.add.text(x + 130, rowY, label, { fontFamily: FONT, fontSize: 12, color: BODY_TEXT }).setOrigin(0, 0.5);
            items.push(dot, rangeText, labelText);
        });

        this.root.add(items);
    }

    // ---- Diagram (component_ows.png + overlaid valve/label widgets) -------------------------

    private buildDiagram(cardX: number, cardWidth: number, diagramTop: number) {
        const compWidth = 900;
        const compHeight = compWidth * (941 / 1671);
        const compLeft = cardX + cardWidth / 2 - compWidth / 2;
        const compTop = diagramTop + 80;

        const component = this.add.image(compLeft + compWidth / 2, compTop + compHeight / 2, "ows.component").setDisplaySize(compWidth, compHeight);
        this.root.add(component);

        // Fractional positions of each valve/the OCM screen within the
        // component artwork itself (eyeballed against the illustration).
        const valveAPos = { x: compLeft + compWidth * 0.24, y: compTop + compHeight * 0.5 };
        const valveBPos = { x: compLeft + compWidth * 0.47, y: compTop + compHeight * 0.18 };
        const ocmPos = { x: compLeft + compWidth * 0.665, y: compTop + compHeight * 0.585 };
        const valveDPos = { x: compLeft + compWidth * 0.835, y: compTop + compHeight * 0.735 };

        // Inlet / outlet tags either side of the diagram.
        const inletTag = this.buildFlowTag(compLeft - 150, valveAPos.y, "Inlet\n(From Bilge)");
        const outletTag = this.buildFlowTag(compLeft + compWidth + 150, valveDPos.y, "Outlet\n(To Sea)");
        this.root.add([inletTag, outletTag]);

        this.flowArrows.push(
            this.buildFlowArrow(compLeft - 70, valveAPos.y),
            this.buildFlowArrow(compLeft + compWidth + 70, valveDPos.y),
        );

        this.valveA = this.buildValveWidget(valveAPos.x, valveAPos.y, "Valve A", "(Inlet)");
        this.valveB = this.buildValveWidget(valveBPos.x, valveBPos.y, "Valve B", "(Top)");
        // Valve D (overboard) sits downstream of the OCM in this diagram, so
        // it doesn't feed back into the PPM reading — it's still a fully
        // interactive slider, just not wired to the ppm calculation.
        this.buildValveWidget(valveDPos.x, valveDPos.y, "Valve D", "(Overboard)");

        this.buildOcmReadout(ocmPos.x, ocmPos.y);
    }

    private buildFlowTag(x: number, y: number, label: string): GameObjects.GameObject {
        const width = 140;
        const height = 56;
        const bg = this.add.graphics();
        bg.fillStyle(0x0f2138, 1);
        bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 14);
        const text = this.add
            .text(x - width / 2 + 14, y, label, { fontFamily: FONT, fontSize: 13, fontStyle: "700", color: "#ffffff", align: "left", lineSpacing: 3 })
            .setOrigin(0, 0.5);
        return this.add.container(0, 0, [bg, text]);
    }

    private buildFlowArrow(x: number, y: number): GameObjects.Text {
        const arrow = this.add.text(x, y, "→", { fontFamily: FONT, fontSize: 26, fontStyle: "800", color: BODY_TEXT_HEX }).setOrigin(0.5).setAlpha(0.3);
        this.root.add(arrow);
        return arrow;
    }

    /** A label card (title + sub-label) with a continuously-draggable
     * vertical Buka/Tutup slider, floating above the real valve on the
     * component artwork and joined to it by a thin connector line. */
    private buildValveWidget(x: number, valveY: number, title: string, sublabel: string): ValveWidget {
        const cardWidth = 150;
        const cardHeight = 150;
        const cardGap = 30;
        const cardTopY = valveY - cardGap - cardHeight;
        const connectorBottomY = valveY - 12;
        const cardX = x - cardWidth / 2;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardTopY, cardWidth, cardHeight, 14);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(cardX, cardTopY, cardWidth, cardHeight, 14);

        const titleText = this.add.text(x, cardTopY + 16, title, { fontFamily: FONT, fontSize: 15, fontStyle: "800", color: DARK_NAVY }).setOrigin(0.5, 0);
        const subText = this.add.text(x, cardTopY + 36, sublabel, { fontFamily: FONT, fontSize: 11, color: BODY_TEXT }).setOrigin(0.5, 0);

        const trackTopY = cardTopY + 58;
        const trackBottomY = cardTopY + cardHeight - 18;
        const trackX = x - 24;
        const track = this.add.graphics();
        track.fillStyle(0xe2e8f0, 1);
        track.fillRoundedRect(trackX - 4, trackTopY, 8, trackBottomY - trackTopY, 4);

        const openLabel = this.add.text(trackX + 16, trackTopY, "Buka", { fontFamily: FONT, fontSize: 12, fontStyle: "700", color: DARK_NAVY }).setOrigin(0, 0.5);
        const closedLabel = this.add.text(trackX + 16, trackBottomY, "Tutup", { fontFamily: FONT, fontSize: 12, color: BODY_TEXT }).setOrigin(0, 0.5);

        const knob = this.add.circle(trackX, trackBottomY, 11, PRIMARY_BLUE, 1);
        knob.setStrokeStyle(3, 0xffffff, 1);

        const connector = this.add.rectangle(cardX + cardWidth / 2, cardTopY + cardHeight, 2, Math.max(0, connectorBottomY - (cardTopY + cardHeight)), 0x94a3b8, 1).setOrigin(0.5, 0);

        const hit = this.add
            .rectangle(x, (trackTopY + trackBottomY) / 2, cardWidth, trackBottomY - trackTopY + 24, 0xffffff, 0)
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

    private buildOcmReadout(x: number, y: number) {
        this.ocmValueText = this.add.text(x, y, `${Math.round(this.ppm)} ppm`, { fontFamily: FONT, fontSize: 22, fontStyle: "800", color: RED_HEX }).setOrigin(0.5);
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

    private refreshOcmDisplay() {
        const colorHex = this.ppm <= 15 ? GREEN_HEX : this.ppm <= 30 ? YELLOW_HEX : this.ppm <= 100 ? AMBER_HEX : RED_HEX;
        this.ocmValueText.setText(`${Math.round(this.ppm)} ppm`);
        this.ocmValueText.setColor(colorHex);
    }

    // ---- Instructions -------------------------------------------------------------------

    private buildInstructions(x: number, y: number, width: number) {
        const height = 130;
        const bg = this.add.graphics();
        bg.fillStyle(0xf7faff, 1);
        bg.fillRoundedRect(x, y, width, height, 14);
        bg.lineStyle(2, BORDER_BLUE, 1);
        bg.strokeRoundedRect(x, y, width, height, 14);

        const iconBg = this.add.circle(x + 24, y + 22, 12, PRIMARY_BLUE, 1);
        const icon = this.add.text(x + 24, y + 22, "i", { fontFamily: FONT, fontSize: 13, fontStyle: "800", color: "#ffffff" }).setOrigin(0.5);
        const heading = this.add.text(x + 44, y + 22, "Instruksi:", { fontFamily: FONT, fontSize: 14, fontStyle: "800", color: DARK_NAVY }).setOrigin(0, 0.5);

        const steps = [
            "Geser slider katup ke posisi Buka/Tutup sesuai kebutuhan (bisa sebagian).",
            "Amati arah aliran fluida pada pipa.",
            "Perhatikan nilai kandungan minyak (ppm) pada OCM — nilainya berubah realtime.",
            "Pastikan nilai OCM ≤ 15 ppm sebelum fluida dianggap aman dibuang ke laut.",
        ];
        const items: GameObjects.GameObject[] = [bg, iconBg, icon, heading];
        steps.forEach((step, index) => {
            const stepText = this.add.text(x + 24, y + 48 + index * 20, `${index + 1}. ${step}`, {
                fontFamily: FONT,
                fontSize: 12,
                color: BODY_TEXT,
                wordWrap: { width: width - 48 },
            });
            items.push(stepText);
        });

        this.root.add(items);
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
