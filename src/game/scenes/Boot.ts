import { Scene } from "phaser";

/**
 * Loads only what Preloader needs to render its own screen immediately —
 * background, logo, and the touch-button graphic. Every other game asset
 * loads inside Preloader's own preload() instead, where its progress bar
 * can show real loading progress rather than the game sitting on a flat
 * background-color canvas while a big, invisible queue finishes here.
 */
export class Boot extends Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        this.load.image("background", "assets/bg.png");
        this.load.image("logo", "assets/logo.png");
        this.load.image("btn.touch", "assets/btn_touch.png");
    }

    create() {
        // Canvas text must be measured after the local font has loaded.
        document.fonts.load('600 16px "Plus Jakarta Sans"').then(
            () => this.scene.start("Preloader"),
            (error) => {
                console.error("Failed to load Plus Jakarta Sans", error);
                this.scene.start("Preloader");
            },
        );
    }
}
