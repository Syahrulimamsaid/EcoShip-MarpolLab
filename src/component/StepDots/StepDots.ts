import { GameObjects, Scene } from "phaser";

const PRIMARY_BLUE = 0x2f68d8;
const DOT_EMPTY = 0xdce6f5;

/**
 * A row of small filled/unfilled circles indicating step N of `total` — the
 * lightweight "dots" counterpart to SceneProgressFooter's rounded segment
 * bar, used by scenes that page through discrete steps/questions one at a
 * time (Materi Stabilitas, Kuis Stabilitas).
 */
export function createStepDots(scene: Scene, x: number, y: number, total: number, current: number, spacing = 22): GameObjects.Arc[] {
    return Array.from({ length: total }, (_, index) =>
        scene.add.circle(x + index * spacing, y, 6, index < current ? PRIMARY_BLUE : DOT_EMPTY, 1),
    );
}
