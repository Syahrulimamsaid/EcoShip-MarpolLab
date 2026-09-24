import { GameObjects, Scene } from "phaser";

import { SOPEP_STEP5_ASSET_KEYS } from "../config/assetKeys";
import { FONT, ORANGE, addCardHeader, drawCard } from "./DocumentationUi";

export interface DocumentChecklistItem {
    label: string;
    done: boolean;
    /** Flagged by a failed save; shown with an "!" so it never relies on colour alone. */
    invalid: boolean;
    /** True when the item became complete since the last render. */
    justCompleted: boolean;
}

/** Two-column reactive checklist (row-major). Returns nothing: it is rebuilt from state. */
export function createDocumentChecklist(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, height: number, items: DocumentChecklistItem[]) {
    drawCard(scene, parent, x, y, width, height);
    addCardHeader(scene, parent, x, y, SOPEP_STEP5_ASSET_KEYS.iconDocument, "DAFTAR DOKUMEN YANG HARUS DILENGKAPI");
    const columnWidth = (width - 36 - 16) / 2;
    items.forEach((item, index) => {
        const rowX = x + 18 + (index % 2) * (columnWidth + 16);
        const rowY = y + 70 + Math.floor(index / 2) * 44;
        const row = scene.add.graphics();
        row.fillStyle(item.invalid ? 0xfff5e3 : 0xeaf3ff, 1);
        row.fillRoundedRect(rowX, rowY, columnWidth, 38, 10);
        if (item.invalid) { row.lineStyle(2, ORANGE, 1); row.strokeRoundedRect(rowX, rowY, columnWidth, 38, 10); }
        const check = scene.add.image(rowX + 24, rowY + 19, item.done ? SOPEP_STEP5_ASSET_KEYS.checkDone : SOPEP_STEP5_ASSET_KEYS.checkEmpty).setDisplaySize(26, 26);
        const label = scene.add.text(rowX + 50, rowY + 19, item.label, { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: item.done ? "#0f6b3b" : "#123a86" }).setOrigin(0, 0.5);
        parent.add([row, check, label]);
        if (item.invalid) parent.add(scene.add.text(rowX + columnWidth - 18, rowY + 19, "!", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: "#b45f06" }).setOrigin(0.5));
        if (item.justCompleted) scene.tweens.add({ targets: check, scale: { from: check.scale * 1.5, to: check.scale }, duration: 240, ease: "Back.Out" });
    });
}
