import { GameObjects, Scene } from "phaser";

const CHARACTER_ASPECT = 1536 / 1024;
const SIZE_BOOST = 1.3;

export class CharacterPanel {
    private readonly characterWidthRef = 340;
    private readonly characterHeightRef = this.characterWidthRef * CHARACTER_ASPECT;

    private scene: Scene;
    private character: GameObjects.Image;

    constructor(scene: Scene) {
        this.scene = scene;
        this.character = scene.add.image(0, 0, "character");
    }

    layout(centerX: number, top: number, targetHeight: number, maxWidth: number) {
        const heightScale = targetHeight / this.characterHeightRef;
        const widthScale = maxWidth / this.characterWidthRef;
        const scale = Math.min(heightScale, widthScale);

        const characterWidth = this.characterWidthRef * scale * SIZE_BOOST;
        const characterHeight = this.characterHeightRef * scale * SIZE_BOOST;

        this.character.setPosition(centerX, top + characterHeight / 2);
        this.character.setDisplaySize(characterWidth, characterHeight);
    }

    /** Slides in from the right, unlike the cards/header which come from
     * above/below — keeps the whole intro from reading as one uniform
     * "everything rises together" motion. */
    playIntroAnimation(baseDelay: number) {
        const item = this.character;
        const baseX = item.x;
        item.alpha = 0;
        item.x = baseX + 60;

        this.scene.tweens.add({
            targets: item,
            alpha: 1,
            x: baseX,
            duration: 550,
            delay: baseDelay,
            ease: "Back.Out",
        });
    }

    /** The reverse of playIntroAnimation — returns the total duration
     * (delay + tween length) so the caller can wait for it before actually
     * switching scenes. */
    playExitAnimation(baseDelay: number): number {
        const item = this.character;
        const baseX = item.x;
        const duration = 300;

        this.scene.tweens.add({
            targets: item,
            alpha: 0,
            x: baseX + 60,
            duration,
            delay: baseDelay,
            ease: "Quad.In",
        });

        return baseDelay + duration;
    }
}
