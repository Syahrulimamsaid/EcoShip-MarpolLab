import { GameObjects, Scene } from "phaser";

import { SFX_KEYS, playSfx } from "../../../SfxManager";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

export interface HotspotCalloutConfig {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    title: string;
    description: string;
    complete: boolean;
    onClick: () => void;
}

export function createHotspotCallout(scene: Scene, config: HotspotCalloutConfig): GameObjects.Container {
    const view = scene.add.container();
    const width = 236;
    const height = 84;
    const green = 0x1f8d52;
    const blue = 0x1774e8;
    const color = config.complete ? green : blue;
    const line = scene.add.graphics();
    line.lineStyle(2, color, 0.75);
    line.lineBetween(config.targetX, config.targetY, config.x + width / 2, config.y + height);
    const card = scene.add.graphics();
    card.fillStyle(0xffffff, 0.96);
    card.fillRoundedRect(config.x, config.y, width, height, 13);
    card.lineStyle(2, color, 0.65);
    card.strokeRoundedRect(config.x, config.y, width, height, 13);
    const icon = scene.add.circle(config.x + 29, config.y + 29, 19, color, 1);
    const mark = scene.add.text(config.x + 29, config.y + 29, config.complete ? "✓" : "•", { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0.5);
    const title = scene.add.text(config.x + 57, config.y + 16, config.title, { fontFamily: FONT, fontStyle: "800", fontSize: 12, color: "#112c7e" });
    const detail = scene.add.text(config.x + 57, config.y + 38, config.description, { fontFamily: FONT, fontStyle: "500", fontSize: 10, color: "#31568f", wordWrap: { width: width - 72 }, lineSpacing: 2 });
    const hit = scene.add.rectangle(config.x + width / 2, config.y + height / 2, width, height, 0xffffff, 0).setInteractive({ useHandCursor: !config.complete });
    if (!config.complete) hit.on("pointerdown", () => { playSfx(scene, SFX_KEYS.click); config.onClick(); });
    view.add(line);
    view.add(card);
    view.add(icon);
    view.add(mark);
    view.add(title);
    view.add(detail);
    view.add(hit);
    view.setDepth(20);
    return view;
}
