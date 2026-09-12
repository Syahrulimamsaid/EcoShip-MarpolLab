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
            fontFamily: "Arial Black",
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
                fontFamily: "Arial Black",
                fontSize: 20,
                color: PRIMARY_BLUE_HEX,
            })
            .setOrigin(0, 0.5);

        const breadcrumbLabel = scene.add
            .text(x + badgeWidth + 40, breadcrumbY, config.breadcrumbLabel, {
                fontFamily: "Arial Black",
                fontSize: 15,
                color: PRIMARY_BLUE_HEX,
            })
            .setOrigin(0, 0.5);

        const heading = scene.add.text(x, 190, config.heading, {
            fontFamily: "Arial Black",
            fontSize: 30,
            color: DARK_NAVY,
        });

        const subtitle = scene.add.text(x, 240, config.subtitle, {
            fontFamily: "Arial",
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
 * The solid blue "← Kembali" pill used by ModuleHeader — also usable
 * standalone by scenes that want the same back button without the rest of
 * ModuleHeader's badge/heading/subtitle block (e.g. Tentang).
 */
export function createBackButton(scene: Scene, x: number, y: number, onBack: () => void): GameObjects.Container {
    const width = 172;
    const height = 54;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const bg = scene.add.graphics();
    bg.fillStyle(PRIMARY_BLUE, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);

    // A drawn arrow icon reads much cleaner at this size than a text
    // "←" glyph.
    const arrowTipX = -width / 2 + 20;
    const arrow = scene.add.graphics();
    arrow.fillStyle(0xffffff, 1);
    arrow.beginPath();
    arrow.moveTo(arrowTipX, 0);
    arrow.lineTo(arrowTipX + 12, -11);
    arrow.lineTo(arrowTipX + 12, -3);
    arrow.lineTo(arrowTipX + 28, -3);
    arrow.lineTo(arrowTipX + 28, 3);
    arrow.lineTo(arrowTipX + 12, 3);
    arrow.lineTo(arrowTipX + 12, 11);
    arrow.closePath();
    arrow.fillPath();

    const label = scene.add
        .text(-width / 2 + 66, 0, "Kembali", {
            fontFamily: "Arial Black",
            fontSize: 19,
            color: "#ffffff",
        })
        .setOrigin(0, 0.5);

    const hitArea = scene.add
        .rectangle(0, 0, width, height, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

    const container = scene.add.container(centerX, centerY, [
        bg,
        arrow,
        label,
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
