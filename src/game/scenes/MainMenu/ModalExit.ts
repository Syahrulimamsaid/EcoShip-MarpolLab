import { GameObjects, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { SFX_KEYS, playSfx } from "../../SfxManager";

export class ModalExit {
    private scene: Scene;
    private container: GameObjects.Container;

    constructor(scene: Scene, onConfirm: () => void) {
        this.scene = scene;

        const overlay = scene.add
            .rectangle(0, 0, 100, 100, 0x081a33, 0.48)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: false });
        const panelBg = scene.add
            .rectangle(0, 0, 420, 220, 0xffffff, 0.98)
            .setStrokeStyle(3, 0xb8d4f4, 1)
            .setOrigin(0.5);
        const title = scene.add
            .text(0, -54, "Konfirmasi Keluar", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 24,
                color: "#143a84",
            })
            .setOrigin(0.5);
        const message = scene.add
            .text(0, -6, "Apakah Anda yakin ingin keluar?", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 18,
                color: "#28466d",
                align: "center",
            })
            .setOrigin(0.5);
        const noButton = new Button(scene, {
            width: 120,
            height: 46,
            text: "Tidak",
            fillColor: 0x7d8da8,
            strokeColor: 0xffffff,
            strokeAlpha: 0.24,
            borderRadius: 16,
            hoverAnimation: "popup",
            hoverScale: 1.08,
            hoverOffsetY: 4,
        });
        const yesButton = new Button(scene, {
            width: 120,
            height: 46,
            text: "Iya",
            fillColor: 0xd9534f,
            strokeColor: 0xffffff,
            strokeAlpha: 0.24,
            borderRadius: 16,
            hoverAnimation: "popup",
            hoverScale: 1.08,
            hoverOffsetY: 4,
        });

        noButton.setPosition(-72, 64);
        yesButton.setPosition(72, 64);

        noButton.on("pointerdown", () => {
            playSfx(scene, SFX_KEYS.click);
            this.close();
        });
        yesButton.on("pointerdown", () => {
            playSfx(scene, SFX_KEYS.click);
            onConfirm();
        });

        overlay.on(
            "pointerdown",
            (
                _pointer: Phaser.Input.Pointer,
                _localX: number,
                _localY: number,
                event: Phaser.Types.Input.EventData,
            ) => {
                event.stopPropagation();
            },
        );

        this.container = scene.add
            .container(0, 0, [
                overlay,
                panelBg,
                title,
                message,
                noButton.view,
                yesButton.view,
            ])
            .setDepth(100);
        this.container.setData("overlay", overlay);
        this.container.setVisible(false);
    }

    get view() {
        return this.container;
    }

    open() {
        this.container.setVisible(true);
        this.container.alpha = 0;
        this.container.setScale(0.96);

        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 180,
            ease: "Quad.Out",
        });
    }

    close() {
        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            scaleX: 0.96,
            scaleY: 0.96,
            duration: 160,
            ease: "Quad.Out",
            onComplete: () => {
                this.container.setVisible(false);
            },
        });
    }

    layout(centerX: number, centerY: number, width: number, height: number) {
        this.container.setPosition(centerX, centerY);
        this.container.setSize(width, height);

        const overlay = this.container.getData(
            "overlay",
        ) as GameObjects.Rectangle;
        overlay.setSize(width, height);
    }

}
