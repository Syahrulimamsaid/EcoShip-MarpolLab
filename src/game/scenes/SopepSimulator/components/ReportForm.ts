import { GameObjects, Scene } from "phaser";

import { Button } from "../../../../component/Button/Button";
import { ReportingData, ReportingFieldId } from "../core/SimulationState";
import { DEFAULT_REPORT_NOTE, REPORT_FIELDS } from "../steps/reporting/reportingConfig";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;

export interface ReportFormActions {
    onChange: (field: ReportingFieldId, value: string) => void;
    onReset: () => void;
    onSubmit: () => void;
}

/** Reusable Phaser form renderer for select, read-only, and multi-line report fields. */
export class ReportForm {
    readonly view: GameObjects.Container;
    private openMenu: GameObjects.Container | null = null;

    constructor(scene: Scene, x: number, y: number, width: number, data: ReportingData, invalid: readonly ReportingFieldId[], actions: ReportFormActions) {
        this.view = scene.add.container();
        const columnWidth = (width - 58) / 2;
        const columnX = [x + 24, x + 34 + columnWidth];
        const rowIndex = [0, 0];

        REPORT_FIELDS.forEach((field) => {
            const row = rowIndex[field.column]++;
            const fieldX = columnX[field.column];
            // Both columns use the same reporting rows. This keeps the note
            // field aligned with "TYPE OF POLLUTANT" on the left.
            const fieldY = y + 94 + row * 76;
            this.createField(scene, fieldX, fieldY, columnWidth, field, data[field.id], invalid.includes(field.id), actions);
        });

        const reset = new Button(scene, { x: x + 145, y: y + 540, width: 214, height: 50, text: "RESET FORM", fillColor: 0xeaf3ff, textColor: "#1764c8", strokeColor: 0x9fc5ff, strokeAlpha: 1, fontFamily: FONT, fontStyle: "800", fontSize: 14, borderRadius: 12, hoverAnimation: "scale", hoverScale: 1.03 });
        reset.on("pointerdown", actions.onReset);
        const submit = new Button(scene, { x: x + width - 145, y: y + 540, width: 246, height: 50, text: "✈  KIRIM LAPORAN", fillColor: BLUE, strokeAlpha: 0, fontFamily: FONT, fontStyle: "800", fontSize: 14, borderRadius: 12, hoverAnimation: "scale", hoverScale: 1.03 });
        submit.on("pointerdown", actions.onSubmit);
        this.view.add(reset.view);
        this.view.add(submit.view);
    }

    destroy() {
        this.openMenu?.destroy();
        this.view.destroy(true);
    }

    private createField(scene: Scene, x: number, y: number, width: number, field: typeof REPORT_FIELDS[number], value: string, invalid: boolean, actions: ReportFormActions) {
        const label = scene.add.text(x, y, field.label, { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: "#234a87" });
        const height = field.multiline ? 68 : 38;
        const box = scene.add.graphics();
        box.fillStyle(0xffffff, 0.98);
        box.fillRoundedRect(x, y + 18, width, height, 8);
        box.lineStyle(2, invalid ? 0xf59a23 : 0xbcd9ff, 1);
        box.strokeRoundedRect(x, y + 18, width, height, 8);
        const empty = value.length === 0;
        const text = scene.add.text(x + 12, y + 18 + (field.multiline ? 10 : height / 2), empty ? (field.multiline ? "Klik untuk menambahkan catatan" : "Pilih informasi") : value, {
            fontFamily: FONT, fontStyle: "500", fontSize: 12, color: empty ? "#7d97bc" : "#153b7a", wordWrap: { width: width - 40 }, lineSpacing: 3,
        }).setOrigin(0, field.multiline ? 0 : 0.5);
        const hit = scene.add.rectangle(x + width / 2, y + 18 + height / 2, width, height, 0xffffff, 0).setInteractive({ useHandCursor: !!field.options || !!field.multiline });
        if (field.options) {
            const arrow = scene.add.text(x + width - 16, y + 18 + height / 2, "⌄", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: "#1764c8" }).setOrigin(0.5);
            this.view.add(arrow);
            hit.on("pointerdown", () => this.toggleOptions(scene, x, y + 60, width, field.id, field.options!, actions));
        } else if (field.multiline) {
            hit.on("pointerdown", () => actions.onChange(field.id, value || DEFAULT_REPORT_NOTE));
        }
        this.view.add(label);
        this.view.add(box);
        this.view.add(text);
        this.view.add(hit);
    }

    private toggleOptions(scene: Scene, x: number, y: number, width: number, field: ReportingFieldId, options: string[], actions: ReportFormActions) {
        if (this.openMenu) { this.openMenu.destroy(true); this.openMenu = null; return; }
        const menu = scene.add.container();
        menu.setDepth(100);
        const height = options.length * 34 + 12;
        const bg = scene.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(x, y, width, height, 9);
        bg.lineStyle(2, 0x77aef5, 1);
        bg.strokeRoundedRect(x, y, width, height, 9);
        menu.add(bg);
        options.forEach((option, index) => {
            const itemY = y + 6 + index * 34;
            const item = scene.add.rectangle(x + width / 2, itemY + 14, width - 12, 29, 0xeaf3ff, 0).setInteractive({ useHandCursor: true });
            const label = scene.add.text(x + 12, itemY + 14, option, { fontFamily: FONT, fontStyle: "600", fontSize: 11, color: "#153b7a" }).setOrigin(0, 0.5);
            item.on("pointerover", () => item.setFillStyle(0xeaf3ff, 1));
            item.on("pointerout", () => item.setFillStyle(0xeaf3ff, 0));
            item.on("pointerdown", () => { this.openMenu?.destroy(true); this.openMenu = null; actions.onChange(field, option); });
            menu.add(item); menu.add(label);
        });
        this.view.add(menu);
        this.openMenu = menu;
    }
}
