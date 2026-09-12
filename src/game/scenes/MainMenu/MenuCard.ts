import { GameObjects, Scene } from "phaser";

/** Entrance animation variety for the menu grid — each card in the row can
 * use a different one so the whole grid doesn't animate in as one uniform
 * block. */
export type CardIntroStyle = "slideUp" | "slideDown" | "bounce";

export interface MenuCardConfig {
    texture: string;
    onSelect: () => void;
    onHover?: () => void;
    locked?: boolean;
}

export class MenuCard {
    private scene: Scene;
    private card: GameObjects.Image;
    private lockOverlay: GameObjects.Graphics;
    private lockIcon: GameObjects.Graphics;
    private locked: boolean;
    // Stopped (not killTweensOf(this.card)) on the next hover — killing
    // *every* tween on the card would also cut off an unrelated
    // entrance/exit fade animating the same card, freezing it at whatever
    // partial alpha it had reached.
    private hoverTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, config: MenuCardConfig) {
        this.scene = scene;
        this.locked = config.locked ?? false;

        this.card = scene.add
            .image(0, 0, config.texture)
            .setDepth(10)
            .setInteractive({ useHandCursor: !this.locked });

        this.lockOverlay = scene.add.graphics().setDepth(11);
        this.lockIcon = scene.add.graphics().setDepth(12);

        this.card.on("pointerdown", () => {
            if (!this.locked) {
                config.onSelect();
            }
        });
        this.card.on("pointerover", () => {
            if (!this.locked) {
                this.showPopup();
                config.onHover?.();
            }
        });
        this.card.on("pointerout", () => {
            if (!this.locked) {
                this.hidePopup();
            }
        });
    }

    get view() {
        return [this.card, this.lockOverlay, this.lockIcon];
    }

    setLocked(locked: boolean) {
        this.locked = locked;
        this.card.setInteractive({ useHandCursor: !locked });
        const baseWidth = this.card.getData("baseWidth") as number | undefined;
        const baseHeight = this.card.getData("baseHeight") as number | undefined;
        const baseX = this.card.x;
        const baseY = this.card.getData("baseY") as number | undefined;

        if (baseWidth && baseHeight && baseY !== undefined) {
            this.drawLockState(baseX, baseY, baseWidth, baseHeight);
        }
    }

    layout(x: number, y: number, width: number, height: number) {
        this.card.setPosition(x, y);
        this.card.setDisplaySize(width, height);
        this.card.setData("baseY", y);
        this.card.setData("baseWidth", width);
        this.card.setData("baseHeight", height);
        this.drawLockState(x, y, width, height);
    }

    playIntroAnimation(delay: number, style: CardIntroStyle = "slideUp") {
        const baseX = this.card.x;
        const baseY = this.card.getData("baseY") as number;
        const baseWidth = this.card.getData("baseWidth") as number;
        const baseHeight = this.card.getData("baseHeight") as number;

        let offsetY = 40;
        let ease = "Back.Out";
        let duration = 500;
        if (style === "slideDown") {
            offsetY = -40;
        } else if (style === "bounce") {
            offsetY = -70;
            ease = "Bounce.Out";
            duration = 700;
        }

        this.card.setAlpha(0);
        this.lockOverlay.setAlpha(0);
        this.lockIcon.setAlpha(0);
        this.card.setPosition(baseX, baseY + offsetY);
        this.card.setDisplaySize(baseWidth * 0.96, baseHeight * 0.96);
        this.drawLockState(this.card.x, this.card.y, this.card.displayWidth, this.card.displayHeight);

        this.scene.tweens.add({
            targets: [this.card, this.lockOverlay, this.lockIcon],
            alpha: 1,
            duration: 400,
            delay,
            ease: "Quad.Out",
        });

        this.scene.tweens.add({
            targets: this.card,
            y: baseY,
            displayWidth: baseWidth,
            displayHeight: baseHeight,
            duration,
            delay,
            ease,
            onUpdate: () => {
                this.drawLockState(this.card.x, this.card.y, this.card.displayWidth, this.card.displayHeight);
            },
        });
    }

    /** The reverse of playIntroAnimation — used when navigating away from
     * MainMenu so the grid doesn't just vanish. Returns the total duration
     * (delay + tween length) so the caller can wait for it before actually
     * switching scenes. */
    playExitAnimation(delay: number): number {
        const baseY = this.card.y;
        const duration = 280;

        this.scene.tweens.add({
            targets: [this.card, this.lockOverlay, this.lockIcon],
            alpha: 0,
            duration,
            delay,
            ease: "Quad.In",
        });
        this.scene.tweens.add({
            targets: this.card,
            y: baseY + 30,
            duration,
            delay,
            ease: "Quad.In",
        });

        return delay + duration;
    }

    private drawLockState(x: number, y: number, width: number, height: number) {
        this.lockOverlay.clear();
        this.lockIcon.clear();

        if (!this.locked) {
            return;
        }

        const left = x - width / 2;
        const top = y - height / 2;
        const overlayRadius = 23;

        this.lockOverlay.fillStyle(0x000000, 0.3);
        this.lockOverlay.fillRoundedRect(left, top, width, height, overlayRadius);

        const iconCenterX = x;
        const iconCenterY = y;
        const iconScale = Math.min(width, height);
        const bodyWidth = iconScale * 0.2;
        const bodyHeight = iconScale * 0.15;
        const bodyLeft = iconCenterX - bodyWidth / 2;
        const bodyTop = iconCenterY - bodyHeight / 2 + iconScale * 0.035;
        const shackleRadius = bodyWidth * 0.32;
        const shackleCenterY = bodyTop - bodyHeight * 0.12;

        this.lockIcon.lineStyle(Math.max(5, iconScale * 0.022), 0xffffff, 0.92);
        this.lockIcon.strokeRoundedRect(bodyLeft, bodyTop, bodyWidth, bodyHeight, bodyWidth * 0.12);
        this.lockIcon.beginPath();
        this.lockIcon.arc(iconCenterX, shackleCenterY, shackleRadius, Math.PI, 0, false);
        this.lockIcon.strokePath();
        this.lockIcon.fillStyle(0xffffff, 0.92);
        this.lockIcon.fillCircle(iconCenterX, bodyTop + bodyHeight * 0.48, Math.max(4, iconScale * 0.012));
    }

    private showPopup() {
        const baseY = this.card.getData("baseY") as number;
        const baseWidth = this.card.getData("baseWidth") as number;
        const baseHeight = this.card.getData("baseHeight") as number;

        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.card,
            displayWidth: baseWidth * 1.06,
            displayHeight: baseHeight * 1.06,
            y: baseY - 12,
            duration: 180,
            ease: "Quad.Out",
            onUpdate: () => {
                this.drawLockState(this.card.x, this.card.y, this.card.displayWidth, this.card.displayHeight);
            },
        });
    }

    private hidePopup() {
        const baseY = this.card.getData("baseY") as number;
        const baseWidth = this.card.getData("baseWidth") as number;
        const baseHeight = this.card.getData("baseHeight") as number;

        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.card,
            displayWidth: baseWidth,
            displayHeight: baseHeight,
            y: baseY,
            duration: 180,
            ease: "Quad.Out",
            onUpdate: () => {
                this.drawLockState(this.card.x, this.card.y, this.card.displayWidth, this.card.displayHeight);
            },
        });
    }
}
