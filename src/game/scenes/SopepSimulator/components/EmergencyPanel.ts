import { GameObjects, Scene } from "phaser";

import { Button } from "../../../../component/Button/Button";
import { SOPEP_ASSET_KEYS } from "../config/assetKeys";
import { IdentificationPointId, SimulationState } from "../core/SimulationState";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;
const GREEN = 0x1f8d52;

const CHECKLIST: Array<[IdentificationPointId, string]> = [
    ["location", "Lokasi kejadian"],
    ["source", "Sumber tumpahan"],
    ["pollutant", "Jenis pencemar"],
    ["spillCondition", "Kondisi tumpahan"],
    ["scupper", "Saluran pembuangan (scupper)"],
];

export interface EmergencyPanelActions {
    started: boolean;
    onStart: () => void;
    onNext: () => void;
}

export function createEmergencyPanel(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, height: number, state: SimulationState, actions: EmergencyPanelActions) {
    const view = scene.add.container();
    const panel = scene.add.graphics();
    panel.fillStyle(0xffffff, 0.98);
    panel.fillRoundedRect(x, y, width, height, 18);
    panel.lineStyle(2, 0xbcd9ff, 1);
    panel.strokeRoundedRect(x, y, width, height, 18);
    panel.fillStyle(BLUE, 1);
    panel.fillRoundedRect(x, y, width, 54, { tl: 18, tr: 18, bl: 0, br: 0 });
    view.add(panel);
    view.add(scene.add.text(x + 20, y + 27, "KONDISI DARURAT", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0, 0.5));

    const rows: Array<[string, string, string]> = [
        ["Lokasi", "Main Deck", "#143a84"],
        ["Insiden", "Oil Spill", "#143a84"],
        ["Status", "BELUM DITANGANI", "#e43d24"],
    ];
    rows.forEach(([label, value, color], index) => {
        const rowY = y + 77 + index * 66;
        const labelText = scene.add.text(x + 28, rowY + 4, label, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: "#54709e" });
        const valueText = scene.add.text(x + 28, rowY + 24, value, { fontFamily: FONT, fontStyle: "800", fontSize: 14, color });
        // Rectangle uses a centered origin by default. Centre it inside the
        // card so the separator stays within both rounded borders.
        const line = scene.add.rectangle(x + width / 2, rowY + 57, width - 40, 1, 0xbcd9ff, 0.75);
        view.add(labelText);
        view.add(valueText);
        view.add(line);
    });

    const headerY = y + 284;
    const checklistHeader = scene.add.graphics();
    checklistHeader.fillStyle(BLUE, 1);
    checklistHeader.fillRoundedRect(x + 18, headerY, width - 36, 36, 8);
    view.add(checklistHeader);
    view.add(scene.add.text(x + width / 2, headerY + 18, "INFORMASI YANG HARUS DIIDENTIFIKASI", { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: "#ffffff" }).setOrigin(0.5));
    CHECKLIST.forEach(([id, label], index) => {
        const rowY = headerY + 44 + index * 48;
        const done = state.isIdentified(id);
        const row = scene.add.graphics();
        row.fillStyle(done ? 0xebf8ef : 0xeaf3ff, 1);
        row.fillRoundedRect(x + 18, rowY, width - 36, 42, 8);
        row.lineStyle(1, done ? GREEN : 0xbcd9ff, 0.8);
        row.strokeRoundedRect(x + 18, rowY, width - 36, 42, 8);
        const status = scene.add.image(x + 41, rowY + 21, done ? SOPEP_ASSET_KEYS.statusChecked : SOPEP_ASSET_KEYS.statusUnchecked).setDisplaySize(22, 22);
        const text = scene.add.text(x + 70, rowY + 21, label, { fontFamily: FONT, fontStyle: done ? "700" : "600", fontSize: 12, color: done ? "#1f8d52" : "#143a84" }).setOrigin(0, 0.5);
        view.add(row);
        view.add(status);
        view.add(text);
    });

    const ready = state.isIdentificationComplete();
    const label = actions.started ? "LANJUT  →" : "MULAI IDENTIFIKASI";
    const enabled = actions.started ? ready : true;
    const button = new Button(scene, { x: x + width / 2, y: y + height - 62, width: width - 44, height: 56, text: label, fontFamily: FONT, fontStyle: "800", fontSize: 16, borderRadius: 28, fillColor: enabled ? BLUE : 0xaab4c6, strokeAlpha: 0, disabled: !enabled });
    button.on("pointerdown", actions.started ? actions.onNext : actions.onStart);
    view.add(button.view);
    view.setDepth(30);
    parent.add(view);
    return view;
}
