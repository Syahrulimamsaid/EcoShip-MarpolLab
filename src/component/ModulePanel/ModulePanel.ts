import { GameObjects, Scene } from "phaser";

export const PRIMARY_BLUE = 0x2f68d8;
export const PRIMARY_BLUE_HEX = "#2f68d8";
export const DARK_NAVY = "#143a84";
export const BODY_TEXT = "#4a5b78";
export const BORDER_BLUE = 0xbcd4f5;

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
