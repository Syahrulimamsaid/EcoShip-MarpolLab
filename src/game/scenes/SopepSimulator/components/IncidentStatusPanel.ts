import { GameObjects, Scene } from "phaser";

import { IncidentData } from "../core/SimulationState";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;

/** Blue section bar shared by the Step 4 side panel blocks. */
export function addSectionBar(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, title: string) {
    const bar = scene.add.graphics();
    bar.fillStyle(BLUE, 1);
    bar.fillRoundedRect(x, y, width, 48, 8);
    const label = scene.add.text(x + 16, y + 24, title, { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0, 0.5);
    parent.add([bar, label]);
}

/** "KONDISI DARURAT": location / incident come from the shared incident record. */
export function createIncidentStatusPanel(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, incident: IncidentData, status: { text: string; color: string }) {
    addSectionBar(scene, parent, x, y, width, "KONDISI DARURAT");
    const rows: Array<[string, string, string]> = [
        ["Lokasi", incident.location, "#102b82"],
        ["Insiden", incident.incidentType, "#102b82"],
        ["Status", status.text, status.color],
    ];
    rows.forEach(([label, value, color], index) => {
        const rowY = y + 64 + index * 62;
        const icon = scene.add.circle(x + 30, rowY + 26, 17, index === 2 ? 0xfff0d6 : 0xe3efff, 1).setStrokeStyle(2, index === 2 ? 0xf59a23 : BLUE, 1);
        const dot = scene.add.circle(x + 30, rowY + 26, 6, index === 2 ? 0xf59a23 : BLUE, 1);
        const name = scene.add.text(x + 64, rowY + 8, label, { fontFamily: FONT, fontStyle: "500", fontSize: 12, color: "#54709e" });
        const text = scene.add.text(x + 64, rowY + 26, value, { fontFamily: FONT, fontStyle: "800", fontSize: 17, color });
        parent.add([icon, dot, name, text]);
        if (index < rows.length - 1) parent.add(scene.add.rectangle(x + width / 2, rowY + 58, width, 1, 0xbcd9ff, 0.8));
    });
}
