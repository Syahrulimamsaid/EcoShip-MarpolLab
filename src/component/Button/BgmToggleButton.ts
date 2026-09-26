import { GameObjects, Scene } from "phaser";

import { SFX_KEYS, playSfx } from "../../game/SfxManager";

export interface BgmToggleButtonConfig {
    x?: number;
    y?: number;
    height: number;
    initialEnabled: boolean;
    /** Performs the actual toggle (see BgmManager.toggleBgm) and returns
     * the resulting enabled state, which this switch then reflects. */
    onToggle: () => boolean;
}

const WIDTH_RATIO = 1.8; // track width = height * WIDTH_RATIO
const KNOB_PADDING = 3;
const ON_COLOR = 0x2aa658; // green — music playing
const OFF_COLOR = 0xd68a1f; // orange — music paused
const BORDER_COLOR = 0x2f68d8; // blue — brand accent, always present

/**
 * An iOS-style on/off pill switch for background music. Track color signals
 * state (green = playing, orange = paused); a music-note glyph on the
 * track's empty side (with a mute slash when off) makes clear what the
 * switch actually controls, since an unlabelled switch alone wouldn't say.
 */
export class BgmToggleButton {
    private scene: Scene;
    private container: GameObjects.Container;
    private track: GameObjects.Graphics;
    private noteIcon: GameObjects.Text;
    private muteSlash: GameObjects.Graphics;
    private knobShadow: GameObjects.Arc;
    private knob: GameObjects.Arc;
    private knobRing: GameObjects.Arc;
    private hitArea: GameObjects.Rectangle;
    private trackHeight: number;
    private trackWidth: number;
    private enabled: boolean;
    private onToggle: () => boolean;
    // Stopped (not killTweensOf(this.container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container, freezing it at
    // whatever partial alpha it had reached.
    private hoverTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, config: BgmToggleButtonConfig) {
        this.scene = scene;
        this.trackHeight = config.height;
        this.trackWidth = config.height * WIDTH_RATIO;
        this.enabled = config.initialEnabled;
        this.onToggle = config.onToggle;

        this.track = scene.add.graphics();

        this.noteIcon = scene.add
            .text(0, 0, "♪", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: Math.round(this.trackHeight * 0.5),
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.muteSlash = scene.add.graphics();

        const knobRadius = this.trackHeight / 2 - KNOB_PADDING;
        this.knobShadow = scene.add.circle(0, 1.5, knobRadius, 0x000000, 0.18);
        this.knob = scene.add.circle(0, 0, knobRadius, 0xffffff, 1);
        this.knobRing = scene.add.circle(0, 0, Math.max(0, knobRadius - 2), 0xffffff, 0);

        this.hitArea = scene.add
            .rectangle(0, 0, this.trackWidth, this.trackHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        this.container = scene.add.container(config.x ?? 0, config.y ?? 0, [
            this.track,
            this.noteIcon,
            this.muteSlash,
            this.knobShadow,
            this.knob,
            this.knobRing,
            this.hitArea,
        ]);
        this.container.setData("baseX", config.x ?? 0);
        this.container.setData("baseY", config.y ?? 0);

        this.hitArea.on("pointerover", () => this.showHover());
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
                this.enabled = this.onToggle();
                this.draw(true);
            },
        );

        this.draw(false);
    }

    get view() {
        return this.container;
    }

    get width() {
        return this.trackWidth;
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        this.container.setData("baseX", x);
        this.container.setData("baseY", y);
        return this;
    }

    setSize(height: number) {
        this.trackHeight = height;
        this.trackWidth = height * WIDTH_RATIO;
        this.hitArea.setSize(this.trackWidth, this.trackHeight);

        const knobRadius = this.trackHeight / 2 - KNOB_PADDING;
        this.knob.setRadius(knobRadius);
        this.knobShadow.setRadius(knobRadius);
        this.knobShadow.y = 1.5;
        this.knobRing.setRadius(Math.max(0, knobRadius - 2));
        this.noteIcon.setFontSize(Math.round(this.trackHeight * 0.5));

        this.draw(false);
        return this;
    }

    private knobX() {
        const radius = this.trackHeight / 2 - KNOB_PADDING;
        const travel = this.trackWidth / 2 - KNOB_PADDING - radius;
        return this.enabled ? travel : -travel;
    }

    /** The note glyph sits on whichever side the knob has vacated. */
    private noteX() {
        return -this.knobX() * 0.62;
    }

    private showHover() {
        const baseY = this.container.getData("baseY") as number;
        this.hoverTween?.stop();
        this.hoverTween = this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.06,
            scaleY: 1.06,
            y: baseY - 2,
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

    private drawMuteSlash() {
        const r = this.trackHeight * 0.2;
        this.muteSlash.clear();
        this.muteSlash.lineStyle(Math.max(1.5, this.trackHeight * 0.07), 0xffffff, 0.95);
        this.muteSlash.lineBetween(-r, -r, r, r);
    }

    private draw(animate: boolean) {
        const halfW = this.trackWidth / 2;
        const halfH = this.trackHeight / 2;
        const color = this.enabled ? ON_COLOR : OFF_COLOR;

        this.track.clear();
        this.track.fillStyle(color, 1);
        this.track.fillRoundedRect(-halfW, -halfH, this.trackWidth, this.trackHeight, halfH);
        this.track.lineStyle(2, BORDER_COLOR, 0.5);
        this.track.strokeRoundedRect(-halfW, -halfH, this.trackWidth, this.trackHeight, halfH);

        this.knobRing.setStrokeStyle(2, color, 1);
        this.drawMuteSlash();
        this.muteSlash.setVisible(!this.enabled);

        const targetKnobX = this.knobX();
        const targetNoteX = this.noteX();

        this.scene.tweens.killTweensOf([this.knob, this.knobShadow, this.knobRing, this.noteIcon, this.muteSlash]);
        if (animate) {
            this.scene.tweens.add({
                targets: [this.knob, this.knobShadow, this.knobRing],
                x: targetKnobX,
                duration: 180,
                ease: "Cubic.Out",
            });
            this.scene.tweens.add({
                targets: [this.noteIcon, this.muteSlash],
                x: targetNoteX,
                duration: 180,
                ease: "Cubic.Out",
            });
        } else {
            this.knob.x = targetKnobX;
            this.knobShadow.x = targetKnobX;
            this.knobRing.x = targetKnobX;
            this.noteIcon.x = targetNoteX;
            this.muteSlash.x = targetNoteX;
        }
    }
}
