import { GameObjects, Scene } from "phaser";

export const PRIMARY_BLUE = 0x2f68d8;
export const PRIMARY_BLUE_HEX = "#2f68d8";
export const DARK_NAVY = "#143a84";
export const BODY_TEXT = "#4a5b78";
export const BORDER_BLUE = 0xbcd4f5;
export const PURPLE = 0x6c4fd1;
export const PURPLE_TEXT = "#5b3fc0";

/**
 * White card with a small pill-shaped tab label floating over its top
 * border, centered. Used for the main diagram/illustration cards.
 */
export function createFloatingTabCard(
    scene: Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    tabLabel: string,
): GameObjects.GameObject[] {
    const radius = 20;

    const card = scene.add.graphics();
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(x, y, width, height, radius);
    card.lineStyle(2, PRIMARY_BLUE, 0.9);
    card.strokeRoundedRect(x, y, width, height, radius);

    const tabText = scene.add.text(0, 0, tabLabel, {
        fontFamily: "Plus Jakarta Sans",
        fontStyle: "600",
        fontSize: 14,
        color: "#ffffff",
    });
    const tabWidth = tabText.width + 48;
    const tabHeight = 40;
    const tabX = x + width / 2 - tabWidth / 2;
    const tabY = y - tabHeight / 2;

    const tabBg = scene.add.graphics();
    tabBg.fillStyle(PRIMARY_BLUE, 1);
    tabBg.fillRoundedRect(tabX, tabY, tabWidth, tabHeight, tabHeight / 2);
    tabText.setPosition(x + width / 2, tabY + tabHeight / 2);
    tabText.setOrigin(0.5);

    return [card, tabBg, tabText];
}

/**
 * White card with a full-width solid header bar (rounded top corners only,
 * body rounded at the bottom).
 */
export function createHeaderBarCard(
    scene: Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    headerLabel: string,
    headerHeight = 48,
): GameObjects.GameObject[] {
    const radius = 16;

    const body = scene.add.graphics();
    body.fillStyle(0xffffff, 1);
    body.fillRoundedRect(x, y + headerHeight, width, height - headerHeight, {
        tl: 0,
        tr: 0,
        bl: radius,
        br: radius,
    });
    body.lineStyle(2, BORDER_BLUE, 1);
    body.strokeRoundedRect(x, y + headerHeight, width, height - headerHeight, {
        tl: 0,
        tr: 0,
        bl: radius,
        br: radius,
    });

    const header = scene.add.graphics();
    header.fillStyle(PRIMARY_BLUE, 1);
    header.fillRoundedRect(x, y, width, headerHeight, {
        tl: radius,
        tr: radius,
        bl: 0,
        br: 0,
    });

    const headerText = scene.add
        .text(x + width / 2, y + headerHeight / 2, headerLabel, {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "600",
            fontSize: 15,
            color: "#ffffff",
        })
        .setOrigin(0.5);

    return [body, header, headerText];
}
