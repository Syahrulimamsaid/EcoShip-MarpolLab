import { GameObjects, Scene } from "phaser";

import { ButtonHoverAnimation } from "./Button";

export interface ButtonImageConfig {
    x?: number;
    y?: number;
    texture: string;
    frame?: string | number;
    width: number;
    height: number;
    alpha?: number;
    hoverAnimation?: ButtonHoverAnimation;
    hoverScale?: number;
    hoverOffsetY?: number;
    hoverDuration?: number;
    hoverEase?: string;
    useHandCursor?: boolean;
}

export class ButtonImage {
    private scene: Scene;
    private container: GameObjects.Container;
    private image: GameObjects.Image;
    private hitArea: GameObjects.Rectangle;
    private config: Required<ButtonImageConfig>;
    // Stopped (not killTweensOf(this.container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container, freezing it at
    // whatever partial alpha it had reached.
    private hoverTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, config: ButtonImageConfig) {
        this.scene = scene;
        this.config = {
            x: config.x ?? 0,
            y: config.y ?? 0,
            texture: config.texture,
            frame: config.frame ?? 0,
            width: config.width,
            height: config.height,
            alpha: config.alpha ?? 1,
            hoverAnimation: config.hoverAnimation ?? "popup",
            hoverScale: config.hoverScale ?? 1.08,
            hoverOffsetY: config.hoverOffsetY ?? 4,
            hoverDuration: config.hoverDuration ?? 140,
            hoverEase: config.hoverEase ?? "Back.Out",
            useHandCursor: config.useHandCursor ?? true,
        };

        this.image = scene.add
            .image(0, 0, this.config.texture, this.config.frame)
            .setOrigin(0.5)
            .setAlpha(this.config.alpha);

        this.hitArea = scene.add
            .rectangle(0, 0, this.config.width, this.config.height, 0xffffff, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: this.config.useHandCursor });

        this.container = scene.add.container(this.config.x, this.config.y, [
            this.image,
            this.hitArea,
        ]);

        this.container.setSize(this.config.width, this.config.height);
        this.container.setData("baseX", this.config.x);
        this.container.setData("baseY", this.config.y);
        this.container.setData("baseScaleX", 1);
        this.container.setData("baseScaleY", 1);

        this.draw();
        this.bindInteractions();
    }

    get view() {
        return this.container;
    }

    get imageView() {
        return this.image;
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        this.container.setData("baseX", x);
        this.container.setData("baseY", y);
        return this;
    }

    setSize(width: number, height: number) {
        this.config.width = width;
        this.config.height = height;
        this.draw();
        return this;
    }

    setDepth(depth: number) {
        this.container.setDepth(depth);
        return this;
    }

    on(eventName: string, handler: () => void) {
        this.container.on(eventName, handler);
        return this;
    }

    private draw() {
        this.image.setPosition(0, 0);
        this.image.setDisplaySize(this.config.width, this.config.height);
        this.image.setAlpha(this.config.alpha);
        this.hitArea.setSize(this.config.width, this.config.height);
        this.container.setSize(this.config.width, this.config.height);
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
                tweenConfig.y = baseY;
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
