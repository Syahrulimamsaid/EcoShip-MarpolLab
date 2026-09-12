import { GameObjects, Scene } from "phaser";

const OUTLINE_NAVY = 0x123b70;

/** Flat shipping-container palette — color is purely decorative variety per
 * the art-direction brief ("warna TIDAK menunjukkan jawaban"), cycled by
 * index so it's deterministic rather than random-per-render. */
const CONTAINER_COLORS = [0x2f68d8, 0x2c8fb8, 0xe0792e, 0xdba61a];

export function containerColorFor(index: number): number {
    return CONTAINER_COLORS[index % CONTAINER_COLORS.length];
}

/**
 * A flat 2D shipping-container token: corrugation ticks, a big weight
 * label, a thin navy outline. Used identically for palette items, the drag
 * ghost, and containers already placed on deck — only the parent/position
 * differs, so drag state always looks like what it's dragging.
 */
export function createContainerToken(
    scene: Scene,
    weight: number,
    colorIndex: number,
    width: number,
    height: number,
): GameObjects.Container {
    const color = containerColorFor(colorIndex);
    const g = scene.add.graphics();

    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    g.lineStyle(2, OUTLINE_NAVY, 0.9);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);

    // Corrugation ticks along the top/bottom edges.
    g.lineStyle(1.5, 0xffffff, 0.35);
    const tickCount = Math.max(3, Math.floor(width / 12));
    for (let i = 1; i < tickCount; i++) {
        const tx = -width / 2 + (width / tickCount) * i;
        g.lineBetween(tx, -height / 2 + 3, tx, height / 2 - 3);
    }

    const weightText = scene.add
        .text(0, -3, String(weight), {
            fontFamily: "Arial Black",
            fontSize: Math.max(12, Math.min(20, height * 0.42)),
            color: "#ffffff",
        })
        .setOrigin(0.5, 1);
    const tonText = scene.add
        .text(0, 2, "TON", {
            fontFamily: "Arial Black",
            fontSize: Math.max(8, Math.min(11, height * 0.22)),
            color: "#ffffff",
        })
        .setOrigin(0.5, 0);

    return scene.add.container(0, 0, [g, weightText, tonText]);
}
