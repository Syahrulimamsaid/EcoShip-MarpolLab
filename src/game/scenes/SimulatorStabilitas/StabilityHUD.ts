import { GameObjects, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { createContainerToken } from "./CargoContainerView";
import { CargoContainer, StabilityResult, StabilityStatus } from "./stability/types";

const GREEN = 0x1f8d52;
const ORANGE = 0xe0792e;
const RED = 0xc0392b;

const STATUS_COPY: Record<StabilityStatus, { text: string; color: number }> = {
    stable: { text: "✓ STABIL", color: GREEN },
    "almost-stable": { text: "HAMPIR STABIL", color: ORANGE },
    "port-heavy": { text: "← MIRING KE KIRI", color: RED },
    "starboard-heavy": { text: "MIRING KE KANAN →", color: RED },
    "high-center-of-gravity": { text: "SEIMBANG, TETAPI KURANG AMAN", color: ORANGE },
};

export interface StabilityHUDConfig {
    scene: Scene;
    /** Top-of-board status banner (inside the left playground card). */
    bannerX: number;
    bannerY: number;
    bannerWidth: number;
    /** Bottom-of-board moment/status strip. */
    panelX: number;
    panelY: number;
    panelWidth: number;
    /** Right column: palette tray + check button + feedback line. */
    railX: number;
    railY: number;
    railWidth: number;
    /** Feedback line and check button are pinned near the bottom of the
     * board (absolute Y, independent of railY) so the button always reads
     * as "the last thing in the column" regardless of palette row count. */
    feedbackY: number;
    checkButtonY: number;
    onDragStart: (container: CargoContainer, colorIndex: number, pointer: Phaser.Input.Pointer) => void;
    onCheckStability: () => void;
}

/**
 * Every readable/clickable piece of the stability mini-game that isn't the
 * ship itself: the live status banner, the moment/status readout, the
 * "PILIHAN MUATAN" palette tray, and the "CEK STABILITAS" button + feedback
 * line. Geometry/physics stay in StabilityCalculator — this only renders
 * whatever it's told.
 */
export class StabilityHUD {
    readonly view: GameObjects.GameObject[] = [];

    private scene: Scene;
    private onDragStart: StabilityHUDConfig["onDragStart"];

    private bannerText: GameObjects.Text;
    private bannerBg: GameObjects.Graphics;
    private bannerX: number;
    private bannerY: number;
    private bannerWidth: number;

    private portMomentText: GameObjects.Text;
    private starboardMomentText: GameObjects.Text;
    private panelStatusText: GameObjects.Text;

    private railX: number;
    private railY: number;
    private railWidth: number;
    private paletteContainer: GameObjects.Container;
    private feedbackText: GameObjects.Text;
    private checkButton: Button;

    private paletteTokenColor = new Map<string, number>();
    private nextColorIndex = 0;
    private paletteEntries = new Map<string, { token: GameObjects.Container; hit: GameObjects.Rectangle }>();

    constructor(config: StabilityHUDConfig) {
        const { scene } = config;
        this.scene = scene;
        this.onDragStart = config.onDragStart;
        this.bannerX = config.bannerX;
        this.bannerY = config.bannerY;
        this.bannerWidth = config.bannerWidth;
        this.railX = config.railX;
        this.railY = config.railY;
        this.railWidth = config.railWidth;

        // ---- Status banner ------------------------------------------------
        this.bannerBg = scene.add.graphics();
        this.bannerText = scene.add
            .text(config.bannerX + config.bannerWidth / 2, config.bannerY + 20, "", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 16,
                color: "#ffffff",
            })
            .setOrigin(0.5);
        this.view.push(this.bannerBg, this.bannerText);

        // ---- Moment / status panel -----------------------------------------
        const panelLabelStyle = { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 11, color: PRIMARY_BLUE_HEX };
        const panelValueStyle = { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 15, color: DARK_NAVY };

        const panelBg = scene.add.graphics();
        panelBg.fillStyle(0xffffff, 1);
        panelBg.fillRoundedRect(config.panelX, config.panelY, config.panelWidth, 62, 12);
        panelBg.lineStyle(2, BORDER_BLUE, 1);
        panelBg.strokeRoundedRect(config.panelX, config.panelY, config.panelWidth, 62, 12);

        const colWidth = config.panelWidth / 3;
        const portLabel = scene.add.text(config.panelX + 18, config.panelY + 10, "MOMEN KIRI", panelLabelStyle);
        this.portMomentText = scene.add.text(config.panelX + 18, config.panelY + 28, "0 ton·unit", panelValueStyle);

        const starboardLabel = scene.add.text(config.panelX + colWidth + 18, config.panelY + 10, "MOMEN KANAN", panelLabelStyle);
        this.starboardMomentText = scene.add.text(config.panelX + colWidth + 18, config.panelY + 28, "0 ton·unit", panelValueStyle);

        const statusLabel = scene.add.text(config.panelX + colWidth * 2 + 18, config.panelY + 10, "STATUS", panelLabelStyle);
        this.panelStatusText = scene.add.text(config.panelX + colWidth * 2 + 18, config.panelY + 28, "BELUM STABIL", {
            ...panelValueStyle,
            color: "#" + RED.toString(16).padStart(6, "0"),
        });

        this.view.push(panelBg, portLabel, this.portMomentText, starboardLabel, this.starboardMomentText, statusLabel, this.panelStatusText);

        // ---- Right rail: palette + button + feedback -----------------------
        const paletteLabel = scene.add.text(config.railX, config.railY, "PILIHAN MUATAN", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 14,
            color: DARK_NAVY,
        });
        this.paletteContainer = scene.add.container(0, 0);
        this.view.push(paletteLabel, this.paletteContainer);

        this.feedbackText = scene.add.text(config.railX, config.feedbackY, "", {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: BODY_TEXT,
            wordWrap: { width: config.railWidth },
            lineSpacing: 4,
        });
        this.view.push(this.feedbackText);

        this.checkButton = new Button(scene, {
            x: config.railX + config.railWidth / 2,
            y: config.checkButtonY,
            width: config.railWidth,
            height: 54,
            text: "CEK STABILITAS",
            fillColor: PRIMARY_BLUE,
            fontSize: 16,
        });
        this.checkButton.on("pointerdown", () => config.onCheckStability());
        this.view.push(this.checkButton.view);
    }

    // ---- Palette ---------------------------------------------------------

    /** Rebuilds the palette tray for whatever containers are still
     * unplaced — simplest correct approach given how small this list is
     * (redraw-on-change, same pattern InfoWindow/QuizScene use). */
    setPalette(containers: CargoContainer[]) {
        this.paletteContainer.removeAll(true);
        this.paletteEntries.clear();

        const cardWidth = 78;
        const cardHeight = 78;
        const gap = 10;
        const perRow = Math.max(1, Math.floor((this.railWidth + gap) / (cardWidth + gap)));

        containers.forEach((container, index) => {
            if (!this.paletteTokenColor.has(container.id)) {
                this.paletteTokenColor.set(container.id, this.nextColorIndex++);
            }
            const colorIndex = this.paletteTokenColor.get(container.id)!;

            const row = Math.floor(index / perRow);
            const col = index % perRow;
            const cardX = this.railX + col * (cardWidth + gap) + cardWidth / 2;
            const cardY = this.railY + 34 + row * (cardHeight + gap) + cardHeight / 2;

            const hit = this.scene.add
                .rectangle(cardX, cardY, cardWidth, cardHeight, 0xffffff, 0)
                .setInteractive({ useHandCursor: true });
            const token = createContainerToken(this.scene, container.weight, colorIndex, cardWidth - 10, cardHeight - 10);
            token.setPosition(cardX, cardY);

            hit.on("pointerover", () => this.scene.tweens.add({ targets: token, scale: 1.06, duration: 100 }));
            hit.on("pointerout", () => this.scene.tweens.add({ targets: token, scale: 1, duration: 100 }));
            hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onDragStart(container, colorIndex, pointer));

            this.paletteContainer.add([token, hit]);
            this.paletteEntries.set(container.id, { token, hit });
        });
    }

    getColorIndexFor(containerId: string): number {
        return this.paletteTokenColor.get(containerId) ?? 0;
    }

    resetColors() {
        this.paletteTokenColor.clear();
        this.nextColorIndex = 0;
    }

    /** Hides (and disables) a palette card while its container is being
     * dragged — otherwise the drag ghost spawns right on top of the still-
     * visible source card, reading as a "double" cargo token until the
     * pointer moves away from it. */
    setDragging(containerId: string, dragging: boolean) {
        const entry = this.paletteEntries.get(containerId);
        if (!entry) return;
        entry.token.setVisible(!dragging);
        if (dragging) entry.hit.disableInteractive();
        else entry.hit.setInteractive({ useHandCursor: true });
    }

    // ---- Readouts ----------------------------------------------------------

    update(result: StabilityResult) {
        this.portMomentText.setText(`${result.portMoment.toFixed(1)} ton·unit`);
        this.starboardMomentText.setText(`${result.starboardMoment.toFixed(1)} ton·unit`);

        const copy = STATUS_COPY[result.status];
        this.panelStatusText.setText(copy.text.replace(/[←→✓]/g, "").trim() || copy.text);
        this.panelStatusText.setColor("#" + copy.color.toString(16).padStart(6, "0"));

        this.bannerText.setText(copy.text);
        this.bannerBg.clear();
        this.bannerBg.fillStyle(copy.color, 1);
        this.bannerBg.fillRoundedRect(this.bannerX, this.bannerY, this.bannerWidth, 40, 10);
    }

    setFeedback(text: string, color = BODY_TEXT) {
        this.feedbackText.setText(text);
        this.feedbackText.setColor(color);
    }
}
