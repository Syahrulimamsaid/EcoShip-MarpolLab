import { GameObjects, Input, Scene } from "phaser";

import { EquipmentConfig } from "./preparationConfig";
import { FONT, GREEN, fitImage, strokeDashedRoundedRect } from "./preparationUi";

export type EquipmentPressHandler = (config: EquipmentConfig, pointer: Input.Pointer) => void;

/** One selectable equipment tile. Pointer handling is reported upward so the
 * step can decide between click-to-add and drag-to-add. */
export class EquipmentCard {
    readonly view: GameObjects.Container;

    constructor(scene: Scene, readonly config: EquipmentConfig, x: number, y: number, width: number, height: number, selected: boolean, locked: boolean, onPress: EquipmentPressHandler) {
        this.view = scene.add.container(x + width / 2, y + height / 2);
        const box = scene.add.graphics();
        box.fillStyle(selected ? 0xeaf3ff : 0xffffff, 1);
        box.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
        strokeDashedRoundedRect(box, -width / 2, -height / 2, width, height, 14, selected ? GREEN : 0x8ebcf5);

        const image = fitImage(scene.add.image(0, -16, config.assetKey), width - 40, height - 62);
        const name = scene.add.text(0, height / 2 - 20, config.name, { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: "#123a86" }).setOrigin(0.5);
        this.view.add([box, image, name]);
        if (selected) {
            image.setAlpha(0.5);
            const badge = scene.add.graphics();
            badge.fillStyle(GREEN, 1);
            badge.fillRoundedRect(-width / 2 + 10, -height / 2 + 10, 82, 22, 11);
            const check = scene.add.text(-width / 2 + 51, -height / 2 + 21, "✓ DIPILIH", { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: "#ffffff" }).setOrigin(0.5);
            this.view.add([badge, check]);
        }

        // The hit area is the whole card, comfortably above the 48 × 48 touch minimum.
        const hit = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: !locked });
        hit.on("pointerdown", (pointer: Input.Pointer) => { if (!locked) onPress(config, pointer); });
        hit.on("pointerover", () => { if (!locked && !selected) scene.tweens.add({ targets: this.view, scale: 1.04, duration: 120, ease: "Sine.Out" }); });
        hit.on("pointerout", () => scene.tweens.add({ targets: this.view, scale: 1, duration: 120, ease: "Sine.Out" }));
        this.view.add(hit);
    }

    get centerX() { return this.view.x; }
    get centerY() { return this.view.y; }
}
