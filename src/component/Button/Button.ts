import { GameObjects, Scene } from "phaser";

import { SFX_KEYS, playSfx } from "../../game/SfxManager";

export type ButtonHoverAnimation = "popup" | "lift" | "scale" | "none";

export interface ButtonConfig {
    x?: number;
    y?: number;
    width: number;
    height: number;
    text: string;
    fillColor: number;
    fillAlpha?: number;
    strokeColor?: number;
    strokeAlpha?: number;
    strokeWidth?: number;
    borderRadius?: number;
    textColor?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: string;
    hoverAnimation?: ButtonHoverAnimation;
    hoverScale?: number;
    hoverOffsetY?: number;
    hoverDuration?: number;
    hoverEase?: string;
    /** When true, the button renders but has no hit area, hover animation,
     * or click handling — used for a visually-muted disabled state (e.g. a
     * "previous" button on the first step). Defaults to false. */
    disabled?: boolean;
    /** Wraps the label to this width (centered, multi-line) instead of the
     * default single-line label — for buttons with longer text. */
    wordWrapWidth?: number;
}

export class Button {
    private scene: Scene;
    private container: GameObjects.Container;
    private background: GameObjects.Graphics;
    private label: GameObjects.Text;
    private hitArea: GameObjects.Rectangle;
    private config: Required<ButtonConfig>;
    // Stopped (not killTweensOf(this.container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container, freezing it at
    // whatever partial alpha it had reached.
    private hoverTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, config: ButtonConfig) {
        this.scene = scene;
        this.config = {
            x: config.x ?? 0,
            y: config.y ?? 0,
            width: config.width,
            height: config.height,
            text: config.text,
            fillColor: config.fillColor,
            fillAlpha: config.fillAlpha ?? 1,
            strokeColor: config.strokeColor ?? 0xffffff,
            strokeAlpha: config.strokeAlpha ?? 0.24,
            strokeWidth: config.strokeWidth ?? 2,
            borderRadius: config.borderRadius ?? 16,
            textColor: config.textColor ?? "#ffffff",
            fontFamily: config.fontFamily ?? "Plus Jakarta Sans",
            fontSize: config.fontSize ?? 16,
            fontStyle: config.fontStyle ?? "600",
            hoverAnimation: config.hoverAnimation ?? "popup",
            hoverScale: config.hoverScale ?? 1.08,
            hoverOffsetY: config.hoverOffsetY ?? 4,
            hoverDuration: config.hoverDuration ?? 140,
            hoverEase: config.hoverEase ?? "Back.Out",
            disabled: config.disabled ?? false,
            wordWrapWidth: config.wordWrapWidth ?? 0,
        };

        this.background = scene.add.graphics();
        this.hitArea = scene.add.rectangle(0, 0, this.config.width, this.config.height, 0xffffff, 0).setOrigin(0.5);
        if (!this.config.disabled) {
            this.hitArea.setInteractive({ useHandCursor: true });
        }
        this.label = scene.add
            .text(0, 0, this.config.text, {
                fontFamily: this.config.fontFamily,
                fontSize: this.config.fontSize,
                fontStyle: this.config.fontStyle,
                color: this.config.textColor,
                align: "center",
                wordWrap: this.config.wordWrapWidth > 0 ? { width: this.config.wordWrapWidth } : undefined,
            })
            .setOrigin(0.5);

        this.container = scene.add.container(this.config.x, this.config.y, [
            this.background,
            this.hitArea,
            this.label,
        ]);

        this.container.setSize(this.config.width, this.config.height);
        this.container.setData("baseX", this.config.x);
        this.container.setData("baseY", this.config.y);
        this.container.setData("baseScaleX", 1);
        this.container.setData("baseScaleY", 1);

        this.draw();
        if (!this.config.disabled) {
            this.bindInteractions();
        }
    }

    get view() {
        return this.container;
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        this.container.setData("baseX", x);
        this.container.setData("baseY", y);
        return this;
    }

    on(eventName: string, handler: () => void) {
        this.container.on(eventName, handler);
        return this;
    }

    private draw() {
        const {
            width,
            height,
            fillColor,
            fillAlpha,
            strokeColor,
            strokeAlpha,
            strokeWidth,
            borderRadius,
        } = this.config;

        this.background.clear();
        this.background.fillStyle(fillColor, fillAlpha);
        this.background.lineStyle(strokeWidth, strokeColor, strokeAlpha);
        this.background.fillRoundedRect(
            -width / 2,
            -height / 2,
            width,
            height,
            borderRadius,
        );
        this.background.strokeRoundedRect(
            -width / 2,
            -height / 2,
            width,
            height,
            borderRadius,
        );

        this.hitArea.setSize(width, height);
        this.label.setText(this.config.text);
        this.label.setStyle({
            fontFamily: this.config.fontFamily,
            fontSize: `${this.config.fontSize}px`,
            fontStyle: this.config.fontStyle,
            color: this.config.textColor,
        });
    }

    private bindInteractions() {
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
                this.container.emit("pointerdown");
            },
        );
    }

    private showHover() {
        const baseX =
            (this.container.getData("baseX") as number) ?? this.container.x;
        const baseY =
            (this.container.getData("baseY") as number) ?? this.container.y;
        const baseScaleX =
            (this.container.getData("baseScaleX") as number) ?? 1;
        const baseScaleY =
            (this.container.getData("baseScaleY") as number) ?? 1;

        this.hoverTween?.stop();

        const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
            targets: this.container,
            duration: this.config.hoverDuration,
            ease: this.config.hoverEase,
        };

        switch (this.config.hoverAnimation) {
            case "popup":
                tweenConfig.x = baseX;
                tweenConfig.y = baseY - this.config.hoverOffsetY;
                tweenConfig.scaleX = baseScaleX * this.config.hoverScale;
                tweenConfig.scaleY = baseScaleY * this.config.hoverScale;
                break;
            case "lift":
                tweenConfig.x = baseX;
                tweenConfig.y = baseY - this.config.hoverOffsetY;
                tweenConfig.scaleX = baseScaleX;
                tweenConfig.scaleY = baseScaleY;
                break;
            case "scale":
                tweenConfig.x = baseX;
                tweenConfig.y = baseY - this.config.hoverOffsetY;
                tweenConfig.scaleX = baseScaleX * this.config.hoverScale;
                tweenConfig.scaleY = baseScaleY * this.config.hoverScale;
                break;
            case "none":
            default:
                tweenConfig.x = baseX;
                tweenConfig.y = baseY;
                tweenConfig.scaleX = baseScaleX;
                tweenConfig.scaleY = baseScaleY;
                break;
        }

        this.hoverTween = this.scene.tweens.add(tweenConfig);
    }

    private hideHover() {
        const baseX =
            (this.container.getData("baseX") as number) ?? this.container.x;
        const baseY =
            (this.container.getData("baseY") as number) ?? this.container.y;
        const baseScaleX =
            (this.container.getData("baseScaleX") as number) ?? 1;
        const baseScaleY =
            (this.container.getData("baseScaleY") as number) ?? 1;

        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.container,
            x: baseX,
            y: baseY,
            scaleX: baseScaleX,
            scaleY: baseScaleY,
            duration: this.config.hoverDuration,
            ease: "Quad.Out",
        });
    }
}
