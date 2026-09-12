import { GameObjects, Scene } from "phaser";

import { createContainerToken } from "./CargoContainerView";
import { CargoContainer, CargoSlot } from "./stability/types";

const OUTLINE_NAVY = 0x123b70;
const HULL_FILL = 0xd9e4ef;
const WATER_FILL = 0xbfe0f5;
const WATER_LINE = 0x3f8fd1;

const HULL_TOP_HALF_WIDTH = 170;
const HULL_HEIGHT = 90;
export const CELL_WIDTH = 54;
export const CELL_HEIGHT = 36;
const CELL_GAP_X = 6;
const CELL_GAP_Y = 4;
const GRID_WIDTH = 5 * CELL_WIDTH + 4 * CELL_GAP_X;

export type SlotVisualState = "idle" | "valid" | "target" | "invalid";

const SLOT_STATE_COLOR: Record<SlotVisualState, number> = {
    idle: 0x8ea7cf,
    valid: 0x22b8d8,
    target: 0x1f8d52,
    invalid: 0xc0392b,
};

// Local helpers instead of Phaser.Math.* — these scene files only import
// named values from "phaser", and the ambient global `Phaser` namespace
// they'd need for that isn't reliably present at runtime here (see
// CargoModel.ts's clamp() comment).
const degToRad = (deg: number) => (deg * Math.PI) / 180;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The front/aft-view ship: a rotating group (hull silhouette, centerline,
 * deck grid outlines, placed cargo tokens, G/M indicator) pivoting around
 * the bottom-center of the hull, plus a separate non-rotating water layer —
 * so heeling the ship never tilts the sea, per the brief.
 */
export class ShipFrontView {
    readonly view: GameObjects.GameObject[];

    private scene: Scene;
    private anchorX: number;
    private anchorY: number;
    private waterWidth: number;
    private onContainerPickup: (containerId: string, pointer: Phaser.Input.Pointer) => void;

    private hullGroup: GameObjects.Container;
    private cargoLayer: GameObjects.Container;
    private slotGraphics = new Map<string, GameObjects.Graphics>();
    private containerTokens = new Map<string, GameObjects.Container>();
    private containerHits = new Map<string, GameObjects.Rectangle>();

    private waterGraphics: GameObjects.Graphics;
    private waveTime = 0;

    private gDot: GameObjects.Arc;
    private mDot: GameObjects.Arc;
    private gmLine: GameObjects.Graphics;
    private knownSlots: CargoSlot[];

    constructor(
        scene: Scene,
        anchorX: number,
        anchorY: number,
        slots: CargoSlot[],
        onContainerPickup: (containerId: string, pointer: Phaser.Input.Pointer) => void,
        waterWidth = 900,
    ) {
        this.scene = scene;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.knownSlots = slots;
        this.onContainerPickup = onContainerPickup;
        this.waterWidth = waterWidth;

        this.waterGraphics = scene.add.graphics();
        this.drawWater();

        this.hullGroup = scene.add.container(anchorX, anchorY);
        this.hullGroup.add(this.buildHull());
        this.hullGroup.add(this.buildCenterline());

        this.cargoLayer = scene.add.container(0, 0);
        this.hullGroup.add(this.buildSlotOutlines(slots));
        this.hullGroup.add(this.cargoLayer);

        this.gmLine = scene.add.graphics();
        this.mDot = scene.add.circle(0, 0, 5, 0x1659a7, 1);
        this.gDot = scene.add.circle(0, 0, 5, 0xc0392b, 1);
        this.hullGroup.add([this.gmLine, this.mDot, this.gDot]);
        this.updateVerticalIndicator(0);

        this.view = [this.waterGraphics, this.hullGroup];
    }

    /** design-space anchor of the hull's pivot — the scene uses this plus
     * getSlotLocalPosition() to convert a slot to a screen rect for
     * pointer hit-testing (hit-testing ignores the current heel angle; at
     * ±9° max the resulting offset is a few px, negligible for this game). */
    get anchor() {
        return { x: this.anchorX, y: this.anchorY };
    }

    getCellSize() {
        return { width: CELL_WIDTH, height: CELL_HEIGHT };
    }

    /** Slot center, local to the hull's unrotated pivot. */
    getSlotLocalPosition(slot: CargoSlot) {
        const x = -GRID_WIDTH / 2 + CELL_WIDTH / 2 + slot.column * (CELL_WIDTH + CELL_GAP_X);
        const rowBottomY = -HULL_HEIGHT - (slot.row - 1) * (CELL_HEIGHT + CELL_GAP_Y);
        const y = rowBottomY - CELL_HEIGHT / 2;
        return { x, y };
    }

    // ---- Hull / water / centerline -----------------------------------------

    private buildHull(): GameObjects.Graphics {
        const g = this.scene.add.graphics();
        const points = [
            { x: -HULL_TOP_HALF_WIDTH, y: -HULL_HEIGHT },
            { x: HULL_TOP_HALF_WIDTH, y: -HULL_HEIGHT },
            { x: HULL_TOP_HALF_WIDTH * 0.82, y: -HULL_HEIGHT * 0.33 },
            { x: 18, y: 0 },
            { x: -18, y: 0 },
            { x: -HULL_TOP_HALF_WIDTH * 0.82, y: -HULL_HEIGHT * 0.33 },
        ];

        g.fillStyle(HULL_FILL, 1);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((p) => g.lineTo(p.x, p.y));
        g.closePath();
        g.fillPath();
        g.lineStyle(3, OUTLINE_NAVY, 1);
        g.strokePath();

        return g;
    }

    private buildCenterline(): GameObjects.Graphics {
        const g = this.scene.add.graphics();
        const topY = -HULL_HEIGHT - 3 * (CELL_HEIGHT + CELL_GAP_Y) - 6;
        g.lineStyle(1.5, OUTLINE_NAVY, 0.35);
        for (let y = topY; y < 0; y += 10) {
            g.lineBetween(0, y, 0, Math.min(y + 5, 0));
        }
        return g;
    }

    private drawWater() {
        const width = this.waterWidth;
        const g = this.waterGraphics;
        g.setPosition(this.anchorX, this.anchorY);
        g.clear();

        g.fillStyle(WATER_FILL, 0.9);
        g.fillRect(-width / 2, 0, width, 60);

        g.lineStyle(3, WATER_LINE, 0.9);
        g.beginPath();
        const step = 24;
        for (let x = -width / 2; x <= width / 2; x += step) {
            const y = Math.sin((x + this.waveTime) * 0.045) * 4;
            if (x === -width / 2) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.strokePath();
    }

    /** Advances the wave phase — call from the scene's update loop. */
    update(_time: number, delta: number) {
        this.waveTime += delta * 0.03;
        this.drawWater();
    }

    // ---- Deck slots ---------------------------------------------------------

    private buildSlotOutlines(slots: CargoSlot[]): GameObjects.Graphics[] {
        return slots.map((slot) => {
            const g = this.scene.add.graphics();
            this.slotGraphics.set(slot.id, g);
            this.drawSlot(slot, g, "idle");
            return g;
        });
    }

    private drawSlot(slot: CargoSlot, g: GameObjects.Graphics, state: SlotVisualState) {
        const { x, y } = this.getSlotLocalPosition(slot);
        const w = CELL_WIDTH;
        const h = CELL_HEIGHT;
        const color = SLOT_STATE_COLOR[state];

        g.clear();
        g.lineStyle(state === "idle" ? 1.5 : 2.5, color, state === "idle" ? 0.5 : 0.95);

        // Dashed rectangle outline as a drop-zone indicator.
        const rectPoints: [number, number, number, number][] = [
            [x - w / 2, y - h / 2, x + w / 2, y - h / 2],
            [x + w / 2, y - h / 2, x + w / 2, y + h / 2],
            [x + w / 2, y + h / 2, x - w / 2, y + h / 2],
            [x - w / 2, y + h / 2, x - w / 2, y - h / 2],
        ];
        const dash = 6;
        rectPoints.forEach(([x1, y1, x2, y2]) => {
            const length = Math.hypot(x2 - x1, y2 - y1);
            const steps = Math.max(1, Math.floor(length / dash));
            for (let i = 0; i < steps; i += 2) {
                const t0 = i / steps;
                const t1 = Math.min(1, (i + 1) / steps);
                g.lineBetween(
                    x1 + (x2 - x1) * t0,
                    y1 + (y2 - y1) * t0,
                    x1 + (x2 - x1) * t1,
                    y1 + (y2 - y1) * t1,
                );
            }
        });
    }

    setSlotState(slotId: string, state: SlotVisualState) {
        const graphic = this.slotGraphics.get(slotId);
        const slot = this.findSlotById(slotId);
        if (graphic && slot) this.drawSlot(slot, graphic, state);
    }

    /** Clears every slot's drag-feedback outline back to idle — called when
     * a drag ends, as opposed to resetForNewScenario() which also clears
     * placed cargo for a brand new case. */
    resetSlotStates(slots: CargoSlot[]) {
        for (const slot of slots) this.setSlotState(slot.id, "idle");
    }

    private findSlotById(slotId: string): CargoSlot | undefined {
        return this.knownSlots.find((s) => s.id === slotId);
    }

    /** Slot ids/columns/rows are identical across every generated scenario
     * (only occupancy differs), so this only needs the freshest slots
     * reference for lookups, plus a visual reset when a new case starts. */
    resetForNewScenario(slots: CargoSlot[]) {
        this.knownSlots = slots;
        this.clearContainers();
        for (const slot of slots) this.setSlotState(slot.id, "idle");
        this.updateVerticalIndicator(0);
    }

    // ---- Cargo tokens on deck -----------------------------------------------

    /** Placed cargo stays pickup-able (a small invisible hit rectangle
     * sibling, same pattern as the palette tray) so a revision pass can
     * grab it back off the deck instead of it being stuck once dropped. */
    placeContainer(container: CargoContainer, slot: CargoSlot, colorIndex: number) {
        const { x, y } = this.getSlotLocalPosition(slot);
        const token = createContainerToken(this.scene, container.weight, colorIndex, CELL_WIDTH - 4, CELL_HEIGHT - 4);
        token.setPosition(x, y);
        token.setScale(0.6);
        token.setAlpha(0);
        this.cargoLayer.add(token);
        this.containerTokens.set(container.id, token);

        const hit = this.scene.add
            .rectangle(x, y, CELL_WIDTH - 4, CELL_HEIGHT - 4, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
        hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onContainerPickup(container.id, pointer));
        this.cargoLayer.add(hit);
        this.containerHits.set(container.id, hit);

        this.scene.tweens.add({
            targets: token,
            scale: 1,
            alpha: 1,
            duration: 220,
            ease: "Back.Out",
        });

        return token;
    }

    removeContainer(containerId: string) {
        const token = this.containerTokens.get(containerId);
        if (token) {
            token.destroy();
            this.containerTokens.delete(containerId);
        }
        const hit = this.containerHits.get(containerId);
        if (hit) {
            hit.destroy();
            this.containerHits.delete(containerId);
        }
    }

    clearContainers() {
        this.containerTokens.forEach((token) => token.destroy());
        this.containerTokens.clear();
        this.containerHits.forEach((hit) => hit.destroy());
        this.containerHits.clear();
    }

    // ---- Heel animation -------------------------------------------------------

    setHeel(angleDegrees: number, duration = 450) {
        this.scene.tweens.killTweensOf(this.hullGroup);
        this.scene.tweens.add({
            targets: this.hullGroup,
            rotation: degToRad(angleDegrees),
            duration,
            ease: "Sine.InOut",
        });
    }

    /** A light back-and-forth wobble used when "CEK STABILITAS" reveals the
     * configuration is still unstable — settles back on the current target
     * heel, not on zero. Chained via onComplete rather than
     * tweens.chain()/Phaser.Math.* to avoid relying on the global `Phaser`
     * namespace (see CargoModel.ts's clamp() comment) or newer tween APIs. */
    rockFeedback(targetAngleDegrees: number) {
        const targetRad = degToRad(targetAngleDegrees);
        this.scene.tweens.killTweensOf(this.hullGroup);
        this.scene.tweens.add({
            targets: this.hullGroup,
            rotation: targetRad + degToRad(1.5),
            duration: 130,
            ease: "Sine.InOut",
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.hullGroup,
                    rotation: targetRad + degToRad(-1.5),
                    duration: 130,
                    ease: "Sine.InOut",
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: this.hullGroup,
                            rotation: targetRad,
                            duration: 160,
                            ease: "Sine.InOut",
                        });
                    },
                });
            },
        });
    }

    /** Settle bounce played once the ship reaches (near) zero heel. */
    settleBounce() {
        this.scene.tweens.killTweensOf(this.hullGroup);
        this.scene.tweens.add({
            targets: this.hullGroup,
            rotation: 0,
            duration: 700,
            ease: "Sine.InOut",
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.hullGroup,
                    rotation: degToRad(-0.5),
                    duration: 140,
                    ease: "Sine.InOut",
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: this.hullGroup,
                            rotation: degToRad(0.3),
                            duration: 140,
                            ease: "Sine.InOut",
                            onComplete: () => {
                                this.scene.tweens.add({
                                    targets: this.hullGroup,
                                    rotation: 0,
                                    duration: 140,
                                    ease: "Sine.InOut",
                                });
                            },
                        });
                    },
                });
            },
        });
    }

    // ---- G/M indicator --------------------------------------------------------

    /** `penaltyRatio` in [0,1]: 0 = safe (G low, far under M), 1 = risky (G
     * close to M). Purely illustrative — no real GM math here. */
    updateVerticalIndicator(penaltyRatio: number) {
        const ratio = clamp01(penaltyRatio);
        const lineX = HULL_TOP_HALF_WIDTH + 40;
        const mY = -HULL_HEIGHT - 3 * (CELL_HEIGHT + CELL_GAP_Y) - 20;
        const gLowY = -20;
        const gHighY = mY + 14;
        const gY = gLowY + (gHighY - gLowY) * ratio;

        this.gmLine.clear();
        this.gmLine.lineStyle(1.5, OUTLINE_NAVY, 0.4);
        this.gmLine.lineBetween(lineX, mY, lineX, gLowY);

        this.mDot.setPosition(lineX, mY);
        this.gDot.setPosition(lineX, gY);
    }

    destroy() {
        this.view.forEach((obj) => obj.destroy());
    }
}
