import { GameObjects, Scene } from "phaser";

import { Button } from "../../../../component/Button/Button";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;
const GREEN = 0x1f8d52;
const ORANGE = 0xf59a23;

export interface DialogButton {
    text: string;
    primary?: boolean;
    onClick: () => void;
}

export interface DialogConfig {
    title: string;
    message: string;
    tone: "warning" | "success";
    buttons: DialogButton[];
}

/** Modal card centred on the 1920 × 1080 design space; the backdrop swallows input. */
export function createConfirmDialog(scene: Scene, parent: GameObjects.Container, config: DialogConfig) {
    const view = scene.add.container(0, 0);
    const accent = config.tone === "success" ? GREEN : ORANGE;
    const shade = scene.add.rectangle(960, 540, 1920, 1080, 0x0b1f4d, 0.45).setInteractive();
    const card = scene.add.graphics();
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(600, 380, 720, 300, 22);
    card.lineStyle(3, accent, 1);
    card.strokeRoundedRect(600, 380, 720, 300, 22);
    const mark = scene.add.circle(960, 440, 32, accent, 1);
    const glyph = scene.add.text(960, 440, config.tone === "success" ? "✓" : "!", { fontFamily: FONT, fontStyle: "800", fontSize: 36, color: "#ffffff" }).setOrigin(0.5);
    const title = scene.add.text(960, 500, config.title, { fontFamily: FONT, fontStyle: "800", fontSize: 26, color: config.tone === "success" ? "#1f8d52" : "#102b82" }).setOrigin(0.5);
    const message = scene.add.text(960, 552, config.message, { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: "#31568f", align: "center", wordWrap: { width: 620 }, lineSpacing: 4 }).setOrigin(0.5, 0);
    view.add([shade, card, mark, glyph, title, message]);

    const gap = 20;
    const width = 230;
    const total = config.buttons.length * width + (config.buttons.length - 1) * gap;
    config.buttons.forEach((item, index) => {
        const x = 960 - total / 2 + width / 2 + index * (width + gap);
        const button = new Button(scene, { x, y: 640, width, height: 50, text: item.text, fillColor: item.primary ? (config.tone === "success" ? GREEN : BLUE) : 0x8592a6, strokeAlpha: 0, fontFamily: FONT, fontStyle: "800", fontSize: 15, borderRadius: 25, hoverAnimation: "scale", hoverScale: 1.03 });
        button.on("pointerdown", item.onClick);
        view.add(button.view);
    });

    view.setDepth(500).setAlpha(0);
    parent.add(view);
    scene.tweens.add({ targets: view, alpha: 1, duration: 180, ease: "Sine.Out" });
    scene.tweens.add({ targets: [mark, glyph], scale: { from: 0.6, to: 1 }, duration: 260, ease: "Back.Out" });
    return view;
}
