import { GameObjects, Scene } from "phaser";

export const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
export const BLUE = 0x1774e8;
export const GREEN = 0x1f8d52;
export const ORANGE = 0xf59a23;
export const LINE_BLUE = 0xbcd9ff;

export function drawPanel(scene: Scene, x: number, y: number, width: number, height: number) {
    const panel = scene.add.graphics();
    panel.fillStyle(0xffffff, 0.96);
    panel.fillRoundedRect(x, y, width, height, 18);
    panel.lineStyle(2, LINE_BLUE, 1);
    panel.strokeRoundedRect(x, y, width, height, 18);
    return panel;
}

/** Phaser graphics has no dashed stroke: dash the straight edges and keep the corners solid. */
export function strokeDashedRoundedRect(g: GameObjects.Graphics, x: number, y: number, width: number, height: number, radius: number, color: number, alpha = 1) {
    const dash = 9;
    const gap = 6;
    g.lineStyle(2, color, alpha);
    const edge = (x1: number, y1: number, x2: number, y2: number) => {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const dx = (x2 - x1) / length;
        const dy = (y2 - y1) / length;
        for (let d = 0; d < length; d += dash + gap) {
            const end = Math.min(d + dash, length);
            g.lineBetween(x1 + dx * d, y1 + dy * d, x1 + dx * end, y1 + dy * end);
        }
    };
    edge(x + radius, y, x + width - radius, y);
    edge(x + width, y + radius, x + width, y + height - radius);
    edge(x + width - radius, y + height, x + radius, y + height);
    edge(x, y + height - radius, x, y + radius);
    const arc = (cx: number, cy: number, start: number) => { g.beginPath(); g.arc(cx, cy, radius, start, start + Math.PI / 2); g.strokePath(); };
    arc(x + radius, y + radius, Math.PI);
    arc(x + width - radius, y + radius, Math.PI * 1.5);
    arc(x + width - radius, y + height - radius, 0);
    arc(x + radius, y + height - radius, Math.PI / 2);
}

/** Icon badge + title used at the top of every Step 3 panel. */
export function addPanelHeader(scene: Scene, parent: GameObjects.Container, x: number, y: number, glyph: string, title: string) {
    const badge = scene.add.graphics();
    badge.fillStyle(BLUE, 1);
    badge.fillRoundedRect(x, y, 44, 44, 12);
    const icon = scene.add.text(x + 22, y + 22, glyph, { fontFamily: FONT, fontStyle: "800", fontSize: 22, color: "#ffffff" }).setOrigin(0.5);
    const label = scene.add.text(x + 58, y + 22, title, { fontFamily: FONT, fontStyle: "800", fontSize: 19, color: "#102b82" }).setOrigin(0, 0.5);
    parent.add([badge, icon, label]);
}

/** Scales an image down (never up) so it fits inside the given box. */
export function fitImage(image: GameObjects.Image, maxWidth: number, maxHeight: number) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    return image.setScale(scale);
}
