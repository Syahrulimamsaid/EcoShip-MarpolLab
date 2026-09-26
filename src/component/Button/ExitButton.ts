import { GameObjects, Scene } from "phaser";

import { SFX_KEYS, playSfx } from "../../game/SfxManager";

export interface ExitButtonConfig {
    x?: number;
    y?: number;
    size: number;
    onClick: () => void;
}

const BG_COLOR = 0xe0473e;

/** A hand-drawn rounded-square exit button (door + arrow), replacing the
 * old `home.btn.exit` image asset so it can be sized/proportioned to match
 * the BgmToggleButton next to it exactly. */
export class ExitButton {
    private scene: Scene;
    private container: GameObjects.Container;
    private background: GameObjects.Graphics;
    private icon: GameObjects.Graphics;
    private hitArea: GameObjects.Rectangle;
    private size: number;
    // Stopped (not killTweensOf(this.container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container, freezing it at
    // whatever partial alpha it had reached.
    private hoverTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, config: ExitButtonConfig) {
        this.scene = scene;
        this.size = config.size;

        this.background = scene.add.graphics();
        this.icon = scene.add.graphics();
        this.hitArea = scene.add
            .rectangle(0, 0, this.size, this.size, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        this.container = scene.add.container(config.x ?? 0, config.y ?? 0, [
            this.background,
            this.icon,
            this.hitArea,
        ]);
        this.container.setData("baseX", config.x ?? 0);
        this.container.setData("baseY", config.y ?? 0);

        this.hitArea.on("pointerover", () => {
            this.showHover();
            this.container.emit("pointerover");
        });
        this.hitArea.on("pointerout", () => this.hideHover());
        this.hitArea.on(
            "pointerdown",
            (
                _pointer: Phaser.Input.Pointer,
                _localX: number,
                _localY: number,
                event: Phaser.Types.Input.EventData,
            ) => {
                event.stopPropagation();
                playSfx(this.scene, SFX_KEYS.click);
                config.onClick();
            },
        );

        this.draw();
    }

    get view() {
        return this.container;
    }

    on(eventName: string, handler: () => void) {
        this.container.on(eventName, handler);
        return this;
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        this.container.setData("baseX", x);
        this.container.setData("baseY", y);
        return this;
    }

    setSize(size: number) {
        this.size = size;
        this.hitArea.setSize(size, size);
        this.draw();
        return this;
    }

    private showHover() {
        const baseY = this.container.getData("baseY") as number;
        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.08,
            scaleY: 1.08,
            y: baseY - 4,
            duration: 140,
            ease: "Back.Out",
        });
    }

    private hideHover() {
        const baseY = this.container.getData("baseY") as number;
        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.container,
            scaleX: 1,
            scaleY: 1,
            y: baseY,
            duration: 140,
            ease: "Quad.Out",
        });
    }

    private draw() {
        const size = this.size;
        const half = size / 2;
        const radius = size * 0.28;

        this.background.clear();
        this.background.fillStyle(BG_COLOR, 1);
        this.background.fillRoundedRect(-half, -half, size, size, radius);
        this.background.lineStyle(Math.max(2, size * 0.045), 0xffffff, 0.9);
        this.background.strokeRoundedRect(-half, -half, size, size, radius);

        this.icon.clear();

        // Door leaf.
        const doorW = size * 0.16;
        const doorH = size * 0.44;
        const doorX = -size * 0.16;
        this.icon.fillStyle(0xffffff, 1);
        this.icon.fillRoundedRect(doorX - doorW / 2, -doorH / 2, doorW, doorH, 3);

        // Door handle.
        this.icon.fillStyle(BG_COLOR, 1);
        this.icon.fillCircle(doorX + doorW * 0.2, 0, Math.max(1.5, size * 0.02));

        // Exit arrow.
        const arrowStartX = doorX + doorW / 2 + size * 0.02;
        const arrowTipX = size * 0.32;
        this.icon.lineStyle(Math.max(2, size * 0.055), 0xffffff, 1);
        this.icon.lineBetween(arrowStartX, 0, arrowTipX - size * 0.05, 0);
        this.icon.fillStyle(0xffffff, 1);
        this.icon.beginPath();
        this.icon.moveTo(arrowTipX + size * 0.05, 0);
        this.icon.lineTo(arrowTipX - size * 0.06, -size * 0.08);
        this.icon.lineTo(arrowTipX - size * 0.06, size * 0.08);
        this.icon.closePath();
        this.icon.fillPath();
    }
}
