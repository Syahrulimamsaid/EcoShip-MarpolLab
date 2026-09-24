import { GameObjects, Scene } from "phaser";

import { addSectionBar } from "./IncidentStatusPanel";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const GREEN = 0x1f8d52;

export interface ChecklistItem {
    label: string;
    done: boolean;
}

/** Reactive checklist: rebuilt from state, never a static image. */
export function createActionChecklist(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, title: string, items: ChecklistItem[]) {
    addSectionBar(scene, parent, x, y, width, title);
    items.forEach((item, index) => {
        const rowY = y + 60 + index * 48;
        const row = scene.add.graphics();
        row.fillStyle(item.done ? 0xebf8ef : 0xeaf3ff, 1);
        row.fillRoundedRect(x, rowY, width, 40, 10);
        const mark = scene.add.circle(x + 28, rowY + 20, 13, item.done ? GREEN : 0xffffff, 1).setStrokeStyle(2, item.done ? GREEN : 0x8ebcf5, 1);
        const label = scene.add.text(x + 54, rowY + 20, item.label, { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#123a86" }).setOrigin(0, 0.5);
        parent.add([row, mark, label]);
        if (item.done) parent.add(scene.add.text(x + 28, rowY + 20, "✓", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0.5));
    });
}
