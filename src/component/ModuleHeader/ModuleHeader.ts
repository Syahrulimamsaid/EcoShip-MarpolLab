import { GameObjects, Scene } from "phaser";

import { HomeBackButtons } from "../Button/HomeBackButtons";

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
    /** Always present — every page can jump straight back to MainMenu. */
    onHome: () => void;
    /** Only rendered (beside Home) on pages reached beyond a module's
     * first-level materi/hub screen. */
    onBack?: () => void;
}

/**
 * The light-theme header shared by module scenes: Home (+ optional Back)
 * icon buttons, a breadcrumb (badge > label), a heading, and a subtitle.
 * Authored at fixed design-space coordinates relative to `x`.
 */
export class ModuleHeader {
    /** All game objects to add to the scene's root container. */
    readonly view: GameObjects.GameObject[];

    constructor(scene: Scene, config: ModuleHeaderConfig) {
        const { x } = config;

        const backButton = new HomeBackButtons(scene, { x, y: 40, onHome: config.onHome, onBack: config.onBack }).view;

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
