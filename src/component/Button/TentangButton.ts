import { GameObjects, Scene } from "phaser";

export interface TentangButtonConfig {
    x?: number;
    y?: number;
    width: number;
    height: number;
    onClick: () => void;
}

const PILL_FILL = 0xf3f9ff;
const PILL_STROKE = 0x6fb3ec;
const BADGE_FILL = 0x0d4694;
const BADGE_RING = 0x9ccdf5;
const TEXT_COLOR = "#0d4694";

/** A hand-drawn pill button (info badge + "Tentang" label), replacing the
 * old `home.btn.tentang` image asset so its colors/shape live in code
 * instead of a static PNG. */
export class TentangButton {
    private scene: Scene;
    private container: GameObjects.Container;
    private background: GameObjects.Graphics;
    private badge: GameObjects.Graphics;
    private label: GameObjects.Text;
    private hitArea: GameObjects.Rectangle;
    private width: number;
    private height: number;
    // Stopped (not killTweensOf(this.container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container, freezing it at
    // whatever partial alpha it had reached.
    private hoverTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, config: TentangButtonConfig) {
        this.scene = scene;
        this.width = config.width;
        this.height = config.height;

        this.background = scene.add.graphics();
        this.badge = scene.add.graphics();
        this.label = scene.add
            .text(0, 0, "Tentang", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                color: TEXT_COLOR,
            })
            .setOrigin(0, 0.5);

        this.hitArea = scene.add
            .rectangle(0, 0, this.width, this.height, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        this.container = scene.add.container(config.x ?? 0, config.y ?? 0, [
            this.background,
            this.badge,
            this.label,
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

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.hitArea.setSize(width, height);
        this.draw();
        return this;
    }

    private showHover() {
        const baseY = this.container.getData("baseY") as number;
        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.05,
            scaleY: 1.05,
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
        const width = this.width;
        const height = this.height;
        const half = height / 2;
        const badgeRadius = height * 0.6;
        const badgeX = -width / 2 + badgeRadius * 0.5;

        this.background.clear();
        this.background.fillStyle(PILL_FILL, 1);
        this.background.fillRoundedRect(-width / 2, -half, width, height, half);
        this.background.lineStyle(Math.max(3, height * 0.06), PILL_STROKE, 1);
        this.background.strokeRoundedRect(-width / 2, -half, width, height, half);

        this.badge.clear();
        this.badge.fillStyle(0xffffff, 1);
        this.badge.fillCircle(badgeX, 0, badgeRadius);
        this.badge.lineStyle(Math.max(2, height * 0.045), BADGE_RING, 1);
        this.badge.strokeCircle(badgeX, 0, badgeRadius);
        this.badge.fillStyle(BADGE_FILL, 1);
        this.badge.fillCircle(badgeX, 0, badgeRadius * 0.8);

        // "i" icon: dot + rounded stem, both white.
        const iconR = badgeRadius * 0.11;
        this.badge.fillStyle(0xffffff, 1);
        this.badge.fillCircle(badgeX, -badgeRadius * 0.32, iconR);
        this.badge.fillRoundedRect(
            badgeX - iconR,
            -badgeRadius * 0.1,
            iconR * 2,
            badgeRadius * 0.58,
            iconR,
        );

        this.label.setFontSize(Math.max(16, height * 0.4));
        this.label.setPosition(badgeX + badgeRadius + height * 0.25, 0);
    }
}
