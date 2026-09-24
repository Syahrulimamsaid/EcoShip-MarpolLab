import { GameObjects, Input, Scene } from "phaser";

import { EquipmentConfig } from "./preparationConfig";
import { BLUE, FONT, GREEN, fitImage, strokeDashedRoundedRect } from "./preparationUi";

/** One of the six "Alat n" slots. Empty slots are dashed with a "+", filled
 * slots show the placed illustration and a remove button. */
export class EquipmentSlot {
    readonly view: GameObjects.Container;
    private readonly box: GameObjects.Graphics;
    private readonly item: GameObjects.Container | null = null;

    constructor(private readonly scene: Scene, index: number, x: number, y: number, private readonly width: number, private readonly height: number, private readonly equipment: EquipmentConfig | null, locked: boolean, onRemove: () => void) {
        this.view = scene.add.container(x + width / 2, y + height / 2);
        this.box = scene.add.graphics();
        this.view.add(this.box);
        this.draw("normal");

        if (equipment) {
            this.item = scene.add.container(0, -6);
            const image = fitImage(scene.add.image(0, 0, equipment.placedKey), width - 36, height - 44);
            const name = scene.add.text(0, height / 2 - 16, equipment.name, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: "#123a86" }).setOrigin(0.5);
            this.item.add(image);
            this.view.add([this.item, name]);
            if (!locked) {
                const close = scene.add.circle(width / 2 - 4, -height / 2 + 4, 13, 0xe5484d, 1).setStrokeStyle(2, 0xffffff, 1);
                const cross = scene.add.graphics();
                cross.lineStyle(3, 0xffffff, 1);
                cross.lineBetween(width / 2 - 9, -height / 2 - 1, width / 2 + 1, -height / 2 + 9);
                cross.lineBetween(width / 2 + 1, -height / 2 - 1, width / 2 - 9, -height / 2 + 9);
                // 44 × 44 touch target around the visible 26 px badge.
                const hit = scene.add.zone(width / 2 - 4, -height / 2 + 4, 44, 44).setInteractive({ useHandCursor: true });
                hit.on("pointerdown", (_pointer: Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); onRemove(); });
                this.view.add([close, cross, hit]);
            }
        } else {
            const plus = scene.add.text(0, -4, "+", { fontFamily: FONT, fontStyle: "300", fontSize: 54, color: "#9dbcea" }).setOrigin(0.5);
            this.view.add(plus);
        }
        const label = scene.add.text(0, height / 2 + 18, `Alat ${index + 1}`, { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#123a86" }).setOrigin(0.5);
        this.view.add(label);
        if (equipment) label.setVisible(false);
        if (locked && equipment) this.draw("valid");
    }

    get isEmpty() { return this.equipment === null; }

    setHighlight(on: boolean) {
        if (this.equipment) return;
        this.draw(on ? "highlight" : "normal");
    }

    playPlace() {
        if (!this.item) return;
        this.scene.tweens.add({ targets: this.item, scale: { from: 1.08, to: 1 }, duration: 180, ease: "Back.Out" });
    }

    private draw(mode: "normal" | "highlight" | "valid") {
        const { width, height } = this;
        this.box.clear();
        const filled = this.equipment !== null;
        this.box.fillStyle(mode === "highlight" ? 0xdcecff : mode === "valid" ? 0xebf8ef : 0xffffff, filled || mode === "highlight" ? 1 : 0.85);
        this.box.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
        if (filled) {
            this.box.lineStyle(2, mode === "valid" ? GREEN : BLUE, 1);
            this.box.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
        } else {
            strokeDashedRoundedRect(this.box, -width / 2, -height / 2, width, height, 14, mode === "highlight" ? BLUE : 0x8ebcf5);
        }
    }
}
