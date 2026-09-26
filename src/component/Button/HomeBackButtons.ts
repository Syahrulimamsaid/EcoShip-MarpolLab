import { GameObjects, Scene } from "phaser";

import { SFX_KEYS, playSfx } from "../../game/SfxManager";

export interface HomeBackButtonsConfig {
    /** Top-left X/Y of the button row, in the scene's design space. */
    x: number;
    y: number;
    size?: number;
    /** Always present — every page can jump straight back to MainMenu. */
    onHome: () => void;
    /** Only rendered (beside Home) on pages reached beyond a module's first
     * materi/hub screen — returns to whichever scene led into this one. */
    onBack?: () => void;
}

/**
 * The two square icon buttons ("btn_home" / "btn_back" assets) shared by
 * every scene's header. Every page shows Home; a second Back button appears
 * beside it only when the page isn't a module's first-level destination
 * from MainMenu.
 */
export class HomeBackButtons {
    readonly view: GameObjects.Container;
    readonly width: number;
    readonly height: number;

    constructor(scene: Scene, config: HomeBackButtonsConfig) {
        const size = config.size ?? 56;
        const gap = 14;
        const items: GameObjects.GameObject[] = [buildIconButton(scene, 0, 0, size, "btn_home", config.onHome)];

        let width = size;
        if (config.onBack) {
            items.push(buildIconButton(scene, size + gap, 0, size, "btn_back", config.onBack));
            width = size * 2 + gap;
        }

        this.width = width;
        this.height = size;
        this.view = scene.add.container(config.x, config.y, items);
    }
}

function buildIconButton(scene: Scene, x: number, y: number, size: number, texture: string, onClick: () => void): GameObjects.Container {
    const image = scene.add.image(size / 2, size / 2, texture).setDisplaySize(size, size);
    const hit = scene.add.rectangle(size / 2, size / 2, size, size, 0xffffff, 0).setInteractive({ useHandCursor: true });
    const container = scene.add.container(x, y, [image, hit]);

    // Stopped (not killTweensOf(container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container.
    let hoverTween: Phaser.Tweens.Tween | null = null;
    hit.on("pointerover", () => {
        hoverTween?.stop();
        hoverTween = scene.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, y: y - 4, duration: 120, ease: "Back.Out" });
    });
    hit.on("pointerout", () => {
        hoverTween?.stop();
        hoverTween = scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, y, duration: 120, ease: "Quad.Out" });
    });
    hit.on("pointerdown", () => {
        playSfx(scene, SFX_KEYS.click);
        onClick();
    });

    return container;
}
