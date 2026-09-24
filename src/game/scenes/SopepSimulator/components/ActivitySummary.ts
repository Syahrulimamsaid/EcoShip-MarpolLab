import { GameObjects, Scene } from "phaser";

import { SOPEP_STEP5_ASSET_KEYS } from "../config/assetKeys";
import { FONT, addCardHeader, drawCard } from "./DocumentationUi";

const ROW_ICONS = [SOPEP_STEP5_ASSET_KEYS.iconIncident, SOPEP_STEP5_ASSET_KEYS.iconLocation, SOPEP_STEP5_ASSET_KEYS.iconDescription, SOPEP_STEP5_ASSET_KEYS.iconReport];

/** "RINGKASAN KEGIATAN PENANGANAN": rows come straight from the Step 1–4 state. */
export function createActivitySummary(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, height: number, rows: Array<[string, string]>) {
    drawCard(scene, parent, x, y, width, height);
    addCardHeader(scene, parent, x, y, SOPEP_STEP5_ASSET_KEYS.iconReport, "RINGKASAN KEGIATAN PENANGANAN");
    const panel = scene.add.graphics();
    panel.fillStyle(0xf1f7ff, 1);
    panel.fillRoundedRect(x + 18, y + 66, width - 36, height - 78, 10);
    parent.add(panel);

    let rowY = y + 72;
    rows.forEach(([label, value], index) => {
        parent.add(scene.add.image(x + 32, rowY, ROW_ICONS[index]).setOrigin(0, 0).setDisplaySize(22, 22));
        parent.add(scene.add.text(x + 66, rowY + 12, label, { fontFamily: FONT, fontStyle: "500", fontSize: 13, color: "#315f88" }).setOrigin(0, 0.5));
        parent.add(scene.add.text(x + 160, rowY + 12, ":", { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#315f88" }).setOrigin(0, 0.5));
        const text = scene.add.text(x + 174, rowY + 12, value, { fontFamily: FONT, fontStyle: index === 1 || index === 3 ? "800" : "500", fontSize: 12, color: "#102b82", wordWrap: { width: width - 200 }, lineSpacing: 1 }).setOrigin(0, 0.5);
        parent.add(text);
        rowY += Math.max(28, text.height + 8);
    });
}
