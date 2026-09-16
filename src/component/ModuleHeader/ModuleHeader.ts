import { GameObjects, Scene } from "phaser";

import { SFX_KEYS, playSfx } from "../../game/SfxManager";

const PRIMARY_BLUE = 0x2f68d8;
const PRIMARY_BLUE_HEX = "#2f68d8";
const DARK_NAVY = "#143a84";
const BODY_TEXT = "#4a5b78";

export interface ModuleHeaderConfig {
    /** Top-left X of the whole header block, in the scene's design space. */
    x: number;
    badgeLabel: string;
    breadcrumbLabel: string;
    heading: string;
    subtitle: string;
    onBack: () => void;
}

/**
 * The light-theme header shared by module scenes: a solid "Kembali" pill
 * with a drawn arrow icon, a breadcrumb (badge > label), a heading, and a
 * subtitle. Authored at fixed design-space coordinates relative to `x`.
 */
export class ModuleHeader {
    /** All game objects to add to the scene's root container. */
    readonly view: GameObjects.GameObject[];

    constructor(scene: Scene, config: ModuleHeaderConfig) {
        const { x } = config;

        const backButton = createBackButton(scene, x, 40, config.onBack);

        const breadcrumbY = 148;
        const badgeText = scene.add.text(0, 0, config.badgeLabel, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 13,
            color: "#ffffff",
        });
        const badgeWidth = badgeText.width + 36;
        const badgeBg = scene.add.graphics();
        badgeBg.fillStyle(PRIMARY_BLUE, 1);
        badgeBg.fillRoundedRect(x, breadcrumbY - 17, badgeWidth, 34, 17);
        badgeText.setPosition(x + 18, breadcrumbY);
        badgeText.setOrigin(0, 0.5);

        const chevron = scene.add
            .text(x + badgeWidth + 16, breadcrumbY, "›", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 20,
                color: PRIMARY_BLUE_HEX,
            })
            .setOrigin(0, 0.5);

        const breadcrumbLabel = scene.add
            .text(x + badgeWidth + 40, breadcrumbY, config.breadcrumbLabel, {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 15,
                color: PRIMARY_BLUE_HEX,
            })
            .setOrigin(0, 0.5);

        const heading = scene.add.text(x, 190, config.heading, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 30,
            color: DARK_NAVY,
        });

        const subtitle = scene.add.text(x, 240, config.subtitle, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 15,
            color: BODY_TEXT,
            lineSpacing: 6,
        });

        this.view = [
            backButton,
            badgeBg,
            badgeText,
            chevron,
            breadcrumbLabel,
            heading,
            subtitle,
        ];
    }

}

/**
 * The "← Kembali" pill used by ModuleHeader — also usable standalone by
 * scenes that want the same back button without the rest of ModuleHeader's
 * badge/heading/subtitle block (e.g. Tentang). Uses the shared
 * `ows.btnKembali` illustration asset rather than drawn graphics, so every
 * back button in the app looks identical.
 */
export function createBackButton(scene: Scene, x: number, y: number, onBack: () => void): GameObjects.Container {
    const width = 172;
    const height = 54;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const image = scene.add.image(0, 0, "ows.btnKembali").setDisplaySize(width, height);

    const hitArea = scene.add
        .rectangle(0, 0, width, height, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

    const container = scene.add.container(centerX, centerY, [
        image,
        hitArea,
    ]);

    // Stopped (not killTweensOf(container)) on the next hover — killing
    // *every* tween on the container would also cut off an unrelated
    // entrance/exit fade animating the same container, freezing it at
    // whatever partial alpha it had reached.
    let hoverTween: Phaser.Tweens.Tween | null = null;

    hitArea.on("pointerover", () => {
        hoverTween?.stop();
        hoverTween = scene.tweens.add({
            targets: container,
            scaleX: 1.05,
            scaleY: 1.05,
            y: centerY - 3,
            duration: 140,
            ease: "Back.Out",
        });
    });
    hitArea.on("pointerout", () => {
        hoverTween?.stop();
        hoverTween = scene.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            y: centerY,
            duration: 140,
            ease: "Quad.Out",
        });
    });
    hitArea.on("pointerdown", () => {
        playSfx(scene, SFX_KEYS.click);
        onBack();
    });

    return container;
}
