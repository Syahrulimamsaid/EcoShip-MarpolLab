import { GameObjects, Scene } from "phaser";

export const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
export const BLUE = 0x1774e8;
export const GREEN = 0x1f8d52;
export const ORANGE = 0xf59a23;
export const LINE_BLUE = 0xbcd9ff;

export function drawCard(scene: Scene, parent: GameObjects.Container, x: number, y: number, width: number, height: number) {
    const card = scene.add.graphics();
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(x, y, width, height, 18);
    card.lineStyle(2, LINE_BLUE, 1);
    card.strokeRoundedRect(x, y, width, height, 18);
    parent.add(card);
}

/** Icon tile + title (+ optional description) used at the top of every Step 5 card. */
export function addCardHeader(scene: Scene, parent: GameObjects.Container, x: number, y: number, iconKey: string, title: string, description?: string, width = 400) {
    parent.add(scene.add.image(x + 18, y + 16, iconKey).setOrigin(0, 0).setDisplaySize(46, 46));
    parent.add(scene.add.text(x + 76, y + 39, title, { fontFamily: FONT, fontStyle: "800", fontSize: 19, color: "#102b82" }).setOrigin(0, 0.5));
    if (description) parent.add(scene.add.text(x + 76, y + 50, description, { fontFamily: FONT, fontStyle: "500", fontSize: 12, color: "#315f88", wordWrap: { width }, lineSpacing: 2 }));
}

export interface FormFieldConfig {
    x: number;
    y: number;
    width: number;
    iconKey: string;
    label: string;
    value: string;
    /** Label column width; the value box takes the rest of `width`. */
    labelWidth: number;
    select?: boolean;
}

/** Read-only, auto-filled value box (data already collected in Steps 1–2). */
export function createFormField(scene: Scene, parent: GameObjects.Container, config: FormFieldConfig) {
    const { x, y, width, labelWidth } = config;
    parent.add(scene.add.image(x, y + 4, config.iconKey).setOrigin(0, 0).setDisplaySize(30, 30));
    parent.add(scene.add.text(x + 42, y + 19, config.label, { fontFamily: FONT, fontStyle: "800", fontSize: 12, color: "#234a87" }).setOrigin(0, 0.5));
    const boxX = x + labelWidth;
    const boxWidth = width - labelWidth;
    const box = scene.add.graphics();
    box.fillStyle(0xf5f9ff, 1);
    box.fillRoundedRect(boxX, y, boxWidth, 38, 8);
    box.lineStyle(2, LINE_BLUE, 1);
    box.strokeRoundedRect(boxX, y, boxWidth, 38, 8);
    parent.add(box);
    parent.add(scene.add.text(boxX + 12, y + 19, config.value, { fontFamily: FONT, fontStyle: "500", fontSize: 14, color: "#153b7a" }).setOrigin(0, 0.5));
    if (config.select) parent.add(scene.add.text(boxX + boxWidth - 16, y + 18, "⌄", { fontFamily: FONT, fontStyle: "800", fontSize: 18, color: "#1764c8" }).setOrigin(0.5));
}
