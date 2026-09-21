import { GameObjects, Scale, Scene } from "phaser";

import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { setSimulatorProgress } from "../../StabilityModuleState";
import { createContainerToken } from "./CargoContainerView";
import { ShipFrontView } from "./ShipFrontView";
import { StabilityHUD } from "./StabilityHUD";
import { evaluateStability, validatePlacement } from "./stability/StabilityCalculator";
import { generateScenario } from "./stability/StabilityScenarioGenerator";
import { CargoContainer, CargoPlacement, CargoSlot, CaseNumber, StabilityResult, StabilityScenario } from "./stability/types";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1060;
const MARGIN = 40;
const LEFT_COLUMN_WIDTH = 880;
const RIGHT_COLUMN_X = 990;
const RIGHT_COLUMN_WIDTH = 462;
const BOARD_Y = 300;
const BOARD_HEIGHT = 620;

const GREEN_HEX = "#1f8d52";
const ORANGE_HEX = "#e0792e";
const RED_HEX = "#c0392b";

export class SimulatorStabilitas extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;

    private shipView!: ShipFrontView;
    private hud!: StabilityHUD;

    private caseText!: GameObjects.Text;
    private casePips: GameObjects.Arc[] = [];

    private scenario!: StabilityScenario;
    private placements: CargoPlacement[] = [];
    private availableCargo: CargoContainer[] = [];
    private caseNumber: CaseNumber = 1;
    private initialColorCounter = 0;

    private dragGhost: GameObjects.Container | null = null;
    private draggedContainer: CargoContainer | null = null;
    private draggedColorIndex = 0;
    private hoverSlotId: string | null = null;
    /** Set while dragging a container picked back up off the deck (a
     * "revision" — see beginRevise()) so a failed/cancelled drop can put it
     * back where it came from instead of losing it. Null for palette-sourced
     * drags. */
    private reviseOriginSlotId: string | null = null;
    /** Remembers each placed container's palette color so picking it back
     * up for revision, or restoring it after a cancelled drag, keeps the
     * same token color instead of reassigning a new one. */
    private containerColorIndex = new Map<string, number>();

    private currentScale = 1;
    private currentRootX = 0;
    private currentRootY = 0;
    private transitionGroups: GameObjects.GameObject[][] = [];

    constructor() {
        super("SimulatorStabilitas");
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildCaseProgress());
        trackGroup(this.root, groups, () => this.buildBoard());
        this.transitionGroups = groups;

        this.startCase(1);

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        this.input.on("pointermove", this.handlePointerMove, this);
        this.input.on("pointerup", this.handlePointerUp, this);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
            this.input.off("pointermove", this.handlePointerMove, this);
            this.input.off("pointerup", this.handlePointerUp, this);
        });
    }

    update(time: number, delta: number) {
        this.shipView?.update(time, delta);
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    // ---- Header / progress --------------------------------------------------

    private buildHeader() {
        const header = new ModuleHeader(this, {
            x: MARGIN,
            badgeLabel: "MODUL SIMULATOR STABILITAS",
            breadcrumbLabel: "Simulasi Distribusi Beban",
            heading: "SIMULASI STABILITAS KAPAL",
            subtitle: "Atur distribusi muatan agar kapal kembali dalam kondisi stabil.",
            onHome: () => this.goTo("MainMenu"),
            onBack: () => this.goTo("PilihAktivitasStabilitas"),
        });
        this.root.add(header.view);
    }

    private buildCaseProgress() {
        this.caseText = this.add.text(MARGIN, 262, "CASE 1/3", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 15,
            color: PRIMARY_BLUE_HEX,
        });
        this.root.add(this.caseText);

        this.casePips = [0, 1, 2].map((index) =>
            this.add.circle(MARGIN + 100 + index * 22, 269, 6, 0xdce6f5, 1),
        );
        this.root.add(this.casePips);
        this.updateCaseProgress();
    }

    private updateCaseProgress() {
        this.caseText.setText(`CASE ${this.caseNumber}/3`);
        this.casePips.forEach((pip, index) => {
            pip.setFillStyle(index < this.caseNumber ? PRIMARY_BLUE : 0xdce6f5, 1);
        });
    }

    // ---- Board (ship + HUD) --------------------------------------------------

    private buildBoard() {
        const boardG = this.add.graphics();
        boardG.fillStyle(0xffffff, 1);
        boardG.fillRoundedRect(MARGIN, BOARD_Y, LEFT_COLUMN_WIDTH, BOARD_HEIGHT, 20);
        boardG.lineStyle(2, BORDER_BLUE, 1);
        boardG.strokeRoundedRect(MARGIN, BOARD_Y, LEFT_COLUMN_WIDTH, BOARD_HEIGHT, 20);
        this.root.add(boardG);

        const portLabel = this.add.text(MARGIN + 60, BOARD_Y + 92, "PORT / KIRI", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: DARK_NAVY,
        });
        const starboardLabel = this.add
            .text(MARGIN + LEFT_COLUMN_WIDTH - 60, BOARD_Y + 92, "STARBOARD / KANAN", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 13,
                color: DARK_NAVY,
            })
            .setOrigin(1, 0);
        this.root.add([portLabel, starboardLabel]);

        const shipAnchorX = MARGIN + LEFT_COLUMN_WIDTH / 2;
        const shipAnchorY = BOARD_Y + BOARD_HEIGHT - 150;

        const railBg = this.add.graphics();
        railBg.fillStyle(0xffffff, 1);
        railBg.fillRoundedRect(RIGHT_COLUMN_X, BOARD_Y, RIGHT_COLUMN_WIDTH, BOARD_HEIGHT, 20);
        railBg.lineStyle(2, PRIMARY_BLUE, 0.9);
        railBg.strokeRoundedRect(RIGHT_COLUMN_X, BOARD_Y, RIGHT_COLUMN_WIDTH, BOARD_HEIGHT, 20);
        this.root.add(railBg);

        const railBottomY = BOARD_Y + BOARD_HEIGHT - 24;
        const checkButtonY = railBottomY - 27;

        this.hud = new StabilityHUD({
            scene: this,
            bannerX: MARGIN + 32,
            bannerY: BOARD_Y + 28,
            bannerWidth: LEFT_COLUMN_WIDTH - 64,
            panelX: MARGIN + 32,
            panelY: shipAnchorY + 68,
            panelWidth: LEFT_COLUMN_WIDTH - 64,
            railX: RIGHT_COLUMN_X + 24,
            railY: BOARD_Y + 40,
            railWidth: RIGHT_COLUMN_WIDTH - 48,
            feedbackY: checkButtonY - 27 - 64,
            checkButtonY,
            onDragStart: (container, colorIndex, pointer) => {
                this.reviseOriginSlotId = null;
                this.beginDrag(container, colorIndex, pointer);
            },
            onCheckStability: () => this.checkStability(),
        });
        this.root.add(this.hud.view);

        // Slots are identical across every case, so an initial (empty)
        // scenario's slots are enough to build the visual grid once —
        // startCase() only ever changes occupancy/containers afterward.
        this.shipView = new ShipFrontView(
            this,
            shipAnchorX,
            shipAnchorY,
            generateScenario(1).slots,
            (containerId, pointer) => this.beginRevise(containerId, pointer),
            LEFT_COLUMN_WIDTH - 80,
        );
        this.root.add(this.shipView.view);
    }

    // ---- Case lifecycle -------------------------------------------------------

    private startCase(caseNumber: CaseNumber) {
        this.caseNumber = caseNumber;
        this.scenario = generateScenario(caseNumber);
        this.placements = [...this.scenario.initialCargo];
        this.availableCargo = [...this.scenario.availableCargo];
        this.initialColorCounter = 100; // distinct range from palette color indices
        this.containerColorIndex.clear();

        this.shipView.resetForNewScenario(this.scenario.slots);
        this.hud.resetColors();

        for (const placement of this.scenario.initialCargo) {
            const container = this.scenario.initialCargoContainers.find((c) => c.id === placement.containerId);
            const slot = this.scenario.slots.find((s) => s.id === placement.slotId);
            if (container && slot) {
                const colorIndex = this.initialColorCounter++;
                this.shipView.placeContainer(container, slot, colorIndex);
                this.containerColorIndex.set(container.id, colorIndex);
            }
        }

        this.hud.setPalette(this.availableCargo);
        this.updateCaseProgress();
        this.hud.setFeedback("Seimbangkan kapal dengan mengatur muatan yang tersedia di sisi yang lebih ringan.", BODY_TEXT);
        this.recomputeStability();
    }

    private allContainers(): CargoContainer[] {
        return [...this.scenario.initialCargoContainers, ...this.scenario.availableCargo];
    }

    private recomputeStability(): StabilityResult {
        const result = evaluateStability(this.placements, this.scenario.slots, this.allContainers(), this.scenario.maxVerticalPenalty);
        this.hud.update(result);
        this.shipView.setHeel(result.heelAngle);

        const verticalRatio = Number.isFinite(this.scenario.maxVerticalPenalty)
            ? result.verticalPenalty / this.scenario.maxVerticalPenalty
            : 0;
        this.shipView.updateVerticalIndicator(verticalRatio);

        this.updateLiveFeedback(result);
        return result;
    }

    private updateLiveFeedback(result: StabilityResult) {
        switch (result.status) {
            case "stable":
                this.hud.setFeedback("Kapal tampak seimbang. Tekan CEK STABILITAS untuk konfirmasi.", GREEN_HEX);
                break;
            case "port-heavy":
                this.hud.setFeedback("Kapal masih miring ke kiri.", ORANGE_HEX);
                break;
            case "starboard-heavy":
                this.hud.setFeedback("Kapal masih miring ke kanan.", ORANGE_HEX);
                break;
            case "almost-stable":
                this.hud.setFeedback("Keseimbangan membaik. Sedikit lagi!", ORANGE_HEX);
                break;
            case "high-center-of-gravity":
                this.hud.setFeedback("Momen sudah seimbang, tapi muatan berat menumpuk terlalu tinggi.", ORANGE_HEX);
                break;
        }
    }

    private checkStability() {
        playSfx(this, SFX_KEYS.click);
        const result = this.recomputeStability();

        if (result.status === "stable") {
            this.handleCaseSuccess();
        } else {
            this.hud.setFeedback("BELUM STABIL — distribusi muatan belum menghasilkan momen yang seimbang.", RED_HEX);
            this.shipView.rockFeedback(result.heelAngle);
        }
    }

    /** No modal checkpoint between cases — a stable result settles the
     * ship, shows a brief inline confirmation, then moves straight on to
     * the next case (or Hasil & Umpan Balik after case 3) on its own. */
    private handleCaseSuccess() {
        this.hud.setFeedback("✓ STABIL — distribusi muatan tepat, kapal kembali dalam kondisi stabil.", GREEN_HEX);
        this.shipView.settleBounce();
        this.time.delayedCall(900, () => this.advanceAfterSuccess());
    }

    private advanceAfterSuccess() {
        if (this.caseNumber < 3) {
            this.startCase((this.caseNumber + 1) as CaseNumber);
        } else {
            setSimulatorProgress(3);
            this.goTo("StabilitasSimulatorResult");
        }
    }

    // ---- Drag & drop ------------------------------------------------------------

    private beginDrag(container: CargoContainer, colorIndex: number, pointer: Phaser.Input.Pointer) {
        this.draggedContainer = container;
        this.draggedColorIndex = colorIndex;
        this.hud.setDragging(container.id, true);

        const ghostSize = 66 * this.currentScale;
        const token = createContainerToken(this, container.weight, colorIndex, ghostSize, ghostSize);
        this.dragGhost = this.add.container(pointer.x, pointer.y, [token]);
        this.dragGhost.setDepth(1000);
        this.dragGhost.setScale(1.05);
        this.dragGhost.setAlpha(0.95);

        // Preview every currently-fillable slot as a valid drop target.
        for (const slot of this.scenario.slots) {
            const validation = validatePlacement(slot, this.scenario.slots, this.placements);
            if (validation.valid) this.shipView.setSlotState(slot.id, "valid");
        }
    }

    /** Picks a container back up off the deck so it can be redropped
     * elsewhere — otherwise, once placed, cargo could never be moved during
     * a revision pass. Removes the placement/token immediately (so the
     * board reflects the lighter ship right away) and remembers the origin
     * slot in case the drag is cancelled. */
    private beginRevise(containerId: string, pointer: Phaser.Input.Pointer) {
        const placementIndex = this.placements.findIndex((p) => p.containerId === containerId);
        if (placementIndex === -1) return;
        const container = this.allContainers().find((c) => c.id === containerId);
        if (!container) return;

        this.reviseOriginSlotId = this.placements[placementIndex].slotId;
        this.placements.splice(placementIndex, 1);
        this.shipView.removeContainer(containerId);
        this.recomputeStability();

        const colorIndex = this.containerColorIndex.get(containerId) ?? 0;
        this.beginDrag(container, colorIndex, pointer);
    }

    /** Puts a revised container back on its original slot after a
     * cancelled/invalid drop — a no-op for palette-sourced drags, which
     * never left the tray in the first place. */
    private restoreToOrigin(container: CargoContainer, originSlotId: string | null) {
        if (!originSlotId) return;
        const originSlot = this.scenario.slots.find((s) => s.id === originSlotId);
        if (!originSlot) return;

        this.placements.push({ containerId: container.id, slotId: originSlot.id });
        this.shipView.placeContainer(container, originSlot, this.containerColorIndex.get(container.id) ?? 0);
        this.recomputeStability();
    }

    /** Sends a revised (picked-up-off-the-ship) container back to the
     * "PILIHAN MUATAN" tray instead of restoring it to its old slot — for
     * when it turns out not to be needed at all, not just moved elsewhere. */
    private returnContainerToPalette(container: CargoContainer) {
        this.availableCargo.push(container);
        this.hud.setPalette(this.availableCargo);
        this.recomputeStability();
    }

    /** Whether a drop point (raw pointer coords) lands inside the right
     * column's card — the palette tray's drop zone for "return this cargo,
     * I don't want to use it after all". */
    private isPointerOverPalette(pointer: Phaser.Input.Pointer): boolean {
        const designX = (pointer.x - this.currentRootX) / this.currentScale;
        const designY = (pointer.y - this.currentRootY) / this.currentScale;
        return (
            designX >= RIGHT_COLUMN_X &&
            designX <= RIGHT_COLUMN_X + RIGHT_COLUMN_WIDTH &&
            designY >= BOARD_Y &&
            designY <= BOARD_Y + BOARD_HEIGHT
        );
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (!this.dragGhost || !this.draggedContainer) return;
        this.dragGhost.setPosition(pointer.x, pointer.y);

        const slot = this.findSlotAt(pointer);
        const slotId = slot?.id ?? null;
        if (slotId === this.hoverSlotId) return;

        if (this.hoverSlotId) {
            const previous = this.scenario.slots.find((s) => s.id === this.hoverSlotId);
            if (previous) {
                const validation = validatePlacement(previous, this.scenario.slots, this.placements);
                this.shipView.setSlotState(previous.id, validation.valid ? "valid" : "idle");
            }
        }

        this.hoverSlotId = slotId;
        if (slot) {
            const validation = validatePlacement(slot, this.scenario.slots, this.placements);
            this.shipView.setSlotState(slot.id, validation.valid ? "target" : "invalid");
        }
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        const container = this.draggedContainer;
        if (!container) return;

        this.dragGhost?.destroy();
        this.dragGhost = null;
        this.draggedContainer = null;
        this.shipView.resetSlotStates(this.scenario.slots);
        this.hoverSlotId = null;
        this.hud.setDragging(container.id, false);

        const originSlotId = this.reviseOriginSlotId;
        this.reviseOriginSlotId = null;

        const slot = this.findSlotAt(pointer);
        if (!slot) {
            if (originSlotId && this.isPointerOverPalette(pointer)) {
                this.returnContainerToPalette(container);
            } else {
                this.restoreToOrigin(container, originSlotId);
            }
            return;
        }

        const validation = validatePlacement(slot, this.scenario.slots, this.placements);
        if (!validation.valid) {
            this.hud.setFeedback(validation.reason ?? "Penempatan tidak valid.", RED_HEX);
            playSfx(this, SFX_KEYS.click);
            this.restoreToOrigin(container, originSlotId);
            return;
        }

        this.placements.push({ containerId: container.id, slotId: slot.id });
        this.shipView.placeContainer(container, slot, this.draggedColorIndex);
        this.containerColorIndex.set(container.id, this.draggedColorIndex);
        this.availableCargo = this.availableCargo.filter((c) => c.id !== container.id);
        this.hud.setPalette(this.availableCargo);
        playSfx(this, SFX_KEYS.click);
        this.recomputeStability();
    }

    private findSlotAt(pointer: Phaser.Input.Pointer): CargoSlot | null {
        const designX = (pointer.x - this.currentRootX) / this.currentScale;
        const designY = (pointer.y - this.currentRootY) / this.currentScale;
        const anchor = this.shipView.anchor;
        const localX = designX - anchor.x;
        const localY = designY - anchor.y;
        const { width, height } = this.shipView.getCellSize();

        for (const slot of this.scenario.slots) {
            const pos = this.shipView.getSlotLocalPosition(slot);
            if (
                localX >= pos.x - width / 2 &&
                localX <= pos.x + width / 2 &&
                localY >= pos.y - height / 2 &&
                localY <= pos.y + height / 2
            ) {
                return slot;
            }
        }
        return null;
    }

    // ---- Layout -----------------------------------------------------------------

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        const rootX = (width - DESIGN_WIDTH * scale) / 2;
        const rootY = (height - DESIGN_HEIGHT * scale) / 2;
        this.root.setPosition(rootX, rootY);

        this.currentScale = scale;
        this.currentRootX = rootX;
        this.currentRootY = rootY;
    }
}
