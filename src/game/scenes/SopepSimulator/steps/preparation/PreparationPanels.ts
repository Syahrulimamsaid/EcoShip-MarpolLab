import { GameObjects, Scene } from "phaser";

import { SOPEP_STEP3_ASSET_KEYS } from "../../config/assetKeys";
import { IncidentData } from "../../core/SimulationState";
import { SELECTION_GUIDE } from "./preparationConfig";
import { BLUE, FONT, LINE_BLUE, addPanelHeader, drawPanel } from "./preparationUi";

/** The prep background already contains the labelled rack and its gear, so it is the whole storage view. */
export function createEquipmentStorageView(scene: Scene, parent: GameObjects.Container) {
    parent.add(scene.add.image(0, 0, SOPEP_STEP3_ASSET_KEYS.background).setOrigin(0, 0).setDisplaySize(1920, 1080));
}

export function createScenarioInfoPanel(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, height: number, incident: IncidentData) {
    parent.add(drawPanel(scene, x, y, width, height));
    addPanelHeader(scene, parent, x + 18, y + 14, "i", "INFORMASI SKENARIO");
    const rows: Array<[string, string]> = [
        ["Lokasi Kejadian", incident.location],
        ["Jenis Insiden", incident.incidentType],
        ["Jenis Pencemar", incident.pollutantType],
        ["Sumber Tumpahan", incident.source],
        ["Kondisi Tumpahan", incident.spillCondition],
    ];
    rows.forEach(([label, value], index) => {
        const rowY = y + 74 + index * 32;
        const dot = scene.add.circle(x + 30, rowY + 14, 7, BLUE, 1);
        const name = scene.add.text(x + 50, rowY + 14, label, { fontFamily: FONT, fontStyle: "500", fontSize: 13, color: "#234a87" }).setOrigin(0, 0.5);
        const colon = scene.add.text(x + 190, rowY + 14, ":", { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#234a87" }).setOrigin(0, 0.5);
        const text = scene.add.text(x + 204, rowY + 14, value, { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#102b82", wordWrap: { width: 200 }, lineSpacing: 0 }).setOrigin(0, 0.5);
        parent.add([dot, name, colon, text]);
        if (index < rows.length - 1) parent.add(scene.add.rectangle(x + width / 2, rowY + 31, width - 36, 1, LINE_BLUE, 1));
    });
}

export function createSelectionGuidePanel(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, height: number) {
    parent.add(drawPanel(scene, x, y, width, height));
    addPanelHeader(scene, parent, x + 18, y + 14, "?", "PANDUAN PEMILIHAN");
    SELECTION_GUIDE.forEach((text, index) => {
        const rowY = y + 88 + index * 30;
        const circle = scene.add.circle(x + 34, rowY, 11, BLUE, 1);
        const number = scene.add.text(x + 34, rowY, String(index + 1), { fontFamily: FONT, fontStyle: "800", fontSize: 12, color: "#ffffff" }).setOrigin(0.5);
        const label = scene.add.text(x + 56, rowY, text, { fontFamily: FONT, fontStyle: "500", fontSize: 13, color: "#123a86" }).setOrigin(0, 0.5);
        parent.add([circle, number, label]);
    });
    void height;
}
