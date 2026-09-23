import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import {
    PILAH_COMMINUTOR_CARDS,
    PILAH_INCINERATOR_CARDS,
    PILAH_INTRO_ITEMS,
    PILAH_LEARNING_GOALS,
    PILAH_MANAGEMENT_FLOW,
    PILAH_SIDEBAR_STEPS,
    PILAH_SORTING_PRINCIPLES,
    PILAH_STORAGE_CARDS,
    PILAH_SUMMARY_POINTS,
    PILAH_WASTE_CATEGORIES,
} from "./PilahSampahMateriData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const TOTAL_STEPS = PILAH_SIDEBAR_STEPS.length;

const GREEN_HEX = "#1f8d52";
const AMBER = 0xe0792e;
const AMBER_HEX = "#b5651d";
const SKY = 0xeaf3ff;
// Pale blue used by the Incinerator information cards, matching the design reference.
const INCINERATOR_CARD_BG = 0xf3f7fc;
const PLACEHOLDER_BG = 0xf5f9ff;

const SIDEBAR_X = 24;
const SIDEBAR_Y = 104;
const SIDEBAR_WIDTH = 280;
const FOOTER_TOP = 976;
const SIDEBAR_HEIGHT = FOOTER_TOP - 16 - SIDEBAR_Y;

const BOARD_X = SIDEBAR_X + SIDEBAR_WIDTH + 24;
const BOARD_WIDTH = DESIGN_WIDTH - BOARD_X - 24;
const BOARD_Y = SIDEBAR_Y;
const BOARD_HEIGHT = SIDEBAR_HEIGHT;
const BOARD_RADIUS = 24;
const BOARD_PAD = 40;
const CONTENT_X = BOARD_X + BOARD_PAD;
const CONTENT_WIDTH = BOARD_WIDTH - BOARD_PAD * 2;
const CONTENT_BOTTOM = BOARD_Y + BOARD_HEIGHT - BOARD_PAD;
const COL_GAP = 32;

/**
 * "Materi Pemilahan Sampah" — a 7-step reading module that runs before the
 * existing PilahSampah drag-and-drop simulator. Mirrors OwsMateri's sidebar +
 * board layout so the two learning modules feel like one product; the
 * simulator itself (PilahSampah.ts) is untouched — this scene only adds a
 * "Mulai Simulasi" hand-off into it.
 *
 * The whiteboard content is template-driven, per the client design brief:
 * every slot that would hold an icon/illustration/machine asset (ship, sea,
 * environment, bin, Incinerator, Comminutor, storage bak, flow-step icons,
 * etc.) is rendered as an empty bordered placeholder container rather than a
 * generated icon — real PNG/SVG assets are meant to be dropped into those
 * slots later without touching this layout code.
 */
export class PilahSampahMateri extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private sidebarContainer!: GameObjects.Container;
    private boardContainer!: GameObjects.Container;
    private footerContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private step = 1;
    private maxReachedStep = 1;

    constructor() {
        super("PilahSampahMateri");
    }

    create() {
        this.background = this.add.image(0, 0, "pilah_sampah.background");
        this.root = this.add.container(0, 0);

        this.step = 1;
        this.maxReachedStep = 1;

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());

        this.sidebarContainer = this.add.container(0, 0);
        this.root.add(this.sidebarContainer);
        groups.push([this.sidebarContainer]);

        this.boardContainer = this.add.container(0, 0);
        this.root.add(this.boardContainer);
        groups.push([this.boardContainer]);

        this.footerContainer = this.add.container(0, 0);
        this.root.add(this.footerContainer);
        groups.push([this.footerContainer]);

        this.transitionGroups = groups;

        this.renderStep();

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    // ---- Header ---------------------------------------------------------------------

    private buildHeader() {
        const navButtons = new HomeBackButtons(this, { x: 32, y: 32, onHome: () => this.goTo("MainMenu") });

        const crumbX = 32 + navButtons.width + 20;
        const crumbY = 38;
        const crumbHeight = navButtons.height - 10;
        const centerY = crumbY + crumbHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL PEMILAHAN SAMPAH", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 48;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Materi MARPOL Annex V", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 22 + chevron.width + 10 + label.width + 26;

        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);

        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 22, centerY - 2).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);
        this.root.add([navButtons.view, breadcrumb, badgeText, chevron, label]);
    }

    // ---- Sidebar ---------------------------------------------------------------------

    private buildSidebar() {
        this.sidebarContainer.removeAll(true);

        const cardRadius = 18;
        const headerHeight = 64;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(SIDEBAR_X, SIDEBAR_Y, SIDEBAR_WIDTH, SIDEBAR_HEIGHT, cardRadius);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(SIDEBAR_X, SIDEBAR_Y, SIDEBAR_WIDTH, SIDEBAR_HEIGHT, cardRadius);
        this.sidebarContainer.add(card);

        const header = this.add.graphics();
        header.fillStyle(PRIMARY_BLUE, 1);
        header.fillRoundedRect(SIDEBAR_X, SIDEBAR_Y, SIDEBAR_WIDTH, headerHeight, { tl: cardRadius, tr: cardRadius, bl: 0, br: 0 });
        this.sidebarContainer.add(header);

        const heading = this.add
            .text(SIDEBAR_X + 24, SIDEBAR_Y + headerHeight / 2, "Daftar Materi", {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 17,
                color: "#ffffff",
            })
            .setOrigin(0, 0.5);
        this.sidebarContainer.add(heading);

        const rowTop = SIDEBAR_Y + headerHeight + 20;
        const rowHeight = 90;

        PILAH_SIDEBAR_STEPS.forEach((item, index) => {
            const rowY = rowTop + index * rowHeight;
            const unlocked = item.id <= this.maxReachedStep;
            const active = item.id === this.step;
            const completed = item.id < this.maxReachedStep;

            if (active) {
                const activeBg = this.add.graphics();
                activeBg.fillStyle(SKY, 1);
                activeBg.fillRoundedRect(SIDEBAR_X + 12, rowY - 10, SIDEBAR_WIDTH - 24, rowHeight - 16, 12);
                this.sidebarContainer.add(activeBg);
            }

            const circleRadius = 18;
            const groupGap = 14;
            const contentCenterY = rowY + 18;
            const circleX = SIDEBAR_X + 42;
            const labelX = circleX + circleRadius + groupGap;

            const label = this.add.text(labelX, 0, item.title, {
                fontFamily: FONT,
                fontStyle: active ? "700" : "500",
                fontSize: 15,
                color: active ? DARK_NAVY : PRIMARY_BLUE_HEX,
                wordWrap: { width: SIDEBAR_WIDTH - 72 - 30 },
                lineSpacing: 3,
            });

            const circle = this.add.circle(circleX, contentCenterY, circleRadius, PRIMARY_BLUE, 1);
            const numberText = this.add
                .text(circleX, contentCenterY, String(item.id), {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 15,
                    color: "#ffffff",
                })
                .setOrigin(0.5);
            label.setY(contentCenterY - label.height / 2);

            this.sidebarContainer.add([circle, numberText, label]);

            if (completed) {
                const check = this.add.text(SIDEBAR_X + SIDEBAR_WIDTH - 26, rowY + 18, "✓", {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 16,
                    color: GREEN_HEX,
                }).setOrigin(0.5);
                this.sidebarContainer.add(check);
            }

            if (unlocked) {
                const hit = this.add
                    .rectangle(SIDEBAR_X + SIDEBAR_WIDTH / 2, rowY + 18, SIDEBAR_WIDTH - 12, rowHeight - 16, 0xffffff, 0)
                    .setInteractive({ useHandCursor: true });
                hit.on("pointerdown", () => this.goToStep(item.id));
                this.sidebarContainer.add(hit);
            }
        });
    }

    // ---- Footer nav -------------------------------------------------------------------

    private buildFooter() {
        this.footerContainer.removeAll(true);

        const navY = FOOTER_TOP + 18;
        const buttonHeight = 52;
        const atFirst = this.step <= 1;
        const isLast = this.step >= TOTAL_STEPS;

        const prevWidth = 190;
        const prevButton = new Button(this, {
            x: SIDEBAR_X + prevWidth / 2,
            y: navY + buttonHeight / 2,
            width: prevWidth,
            height: buttonHeight,
            text: "← Sebelumnya",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 14,
            borderRadius: buttonHeight / 2,
            disabled: atFirst,
            fillColor: atFirst ? 0xe2e8f0 : 0xffffff,
            strokeColor: atFirst ? 0xe2e8f0 : PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: atFirst ? "#94a3b8" : PRIMARY_BLUE_HEX,
        });
        if (!atFirst) {
            prevButton.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.goToStep(this.step - 1);
            });
        }

        const nextWidth = isLast ? 260 : 190;
        const nextButton = new Button(this, {
            x: BOARD_X + BOARD_WIDTH - nextWidth / 2,
            y: navY + buttonHeight / 2,
            width: nextWidth,
            height: buttonHeight,
            text: isLast ? "Mulai Simulasi" : "Selanjutnya",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 14,
            borderRadius: buttonHeight / 2,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        nextButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            if (isLast) {
                this.goTo("PilahSampah");
            } else {
                this.goToStep(this.step + 1);
            }
        });

        const pillWidth = 420;
        const pillHeight = 80;
        const pillX = BOARD_X + BOARD_WIDTH / 2 - pillWidth / 2;
        const pillY = navY - 14;
        const pillBg = this.add.graphics();
        pillBg.fillStyle(0xffffff, 1);
        pillBg.fillRoundedRect(pillX, pillY, pillWidth, pillHeight, 16);
        pillBg.lineStyle(2, BORDER_BLUE, 1);
        pillBg.strokeRoundedRect(pillX, pillY, pillWidth, pillHeight, 16);
        const stepLabel = this.add
            .text(BOARD_X + BOARD_WIDTH / 2, navY + buttonHeight / 2 - 12, `STEP ${this.step} / ${TOTAL_STEPS}`, {
                fontFamily: FONT, fontStyle: "700", fontSize: 14, color: DARK_NAVY,
            })
            .setOrigin(0.5);
        const barY = navY + buttonHeight / 2 + 16;
        const barWidth = 360;
        const barX = BOARD_X + BOARD_WIDTH / 2 - barWidth / 2;
        const segGap = 6;
        const segWidth = (barWidth - segGap * (TOTAL_STEPS - 1)) / TOTAL_STEPS;
        const segments: GameObjects.GameObject[] = [];
        for (let i = 0; i < TOTAL_STEPS; i++) {
            const seg = this.add.graphics();
            seg.fillStyle(i < this.step ? PRIMARY_BLUE : 0xdce6f5, 1);
            seg.fillRoundedRect(barX + i * (segWidth + segGap), barY, segWidth, 6, 3);
            segments.push(seg);
        }

        this.footerContainer.add([prevButton.view, nextButton.view, pillBg, stepLabel, ...segments]);
    }

    // ---- Step transitions -------------------------------------------------------------

    private goToStep(id: number) {
        if (id < 1 || id > TOTAL_STEPS || id > this.maxReachedStep + 1) return;
        this.step = id;
        this.renderStep();
    }

    private renderStep() {
        this.maxReachedStep = Math.max(this.maxReachedStep, this.step);
        this.buildSidebar();
        this.buildFooter();
        this.renderBoard();
    }

    // ---- Whiteboard chrome + shared building blocks ------------------------------------

    private addBoardChrome() {
        const shadow = this.add.graphics();
        shadow.fillStyle(0x0b1f4d, 0.06);
        shadow.fillRoundedRect(BOARD_X, BOARD_Y + 6, BOARD_WIDTH, BOARD_HEIGHT, BOARD_RADIUS);
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, BOARD_RADIUS);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, BOARD_RADIUS);
        this.boardContainer.add([shadow, card]);
    }

    /** Main title + short accent underline. Identical position/size on every state. */
    private addTitle(text: string): number {
        const title = this.add.text(CONTENT_X, BOARD_Y + 36, text, {
            fontFamily: FONT,
            fontStyle: "800",
            fontSize: 28,
            color: DARK_NAVY,
        });
        const underline = this.add.graphics();
        underline.fillStyle(PRIMARY_BLUE, 1);
        underline.fillRoundedRect(CONTENT_X, title.y + title.height + 8, 56, 4, 2);
        this.boardContainer.add([title, underline]);
        return title.y + title.height + 8 + 4;
    }

    private addDescription(text: string, y: number, width: number = CONTENT_WIDTH, x: number = CONTENT_X): number {
        const desc = this.add.text(x, y, text, {
            fontFamily: FONT,
            fontStyle: "500",
            fontSize: 16,
            color: BODY_TEXT,
            lineSpacing: 6,
            wordWrap: { width },
        });
        this.boardContainer.add(desc);
        return desc.y + desc.height;
    }

    /** Empty rounded-rect placeholder — where a PNG/SVG asset will be dropped in later. */
    private addPlaceholderBox(x: number, y: number, width: number, height: number, radius = 16) {
        const box = this.add.graphics();
        box.fillStyle(PLACEHOLDER_BG, 1);
        box.fillRoundedRect(x, y, width, height, radius);
        box.lineStyle(2, BORDER_BLUE, 1);
        box.strokeRoundedRect(x, y, width, height, radius);
        this.boardContainer.add(box);
    }

    /** Big illustration slot: shows the given texture contain-fit and
     * centered once an asset is supplied, otherwise falls back to the empty
     * placeholder box. */
    private addIllustrationSlot(x: number, y: number, width: number, height: number, textureKey?: string, radius = 20): number {
        if (!textureKey) {
            this.addPlaceholderBox(x, y, width, height, radius);
            return height;
        }
        const image = this.add.image(x + width / 2, y + height / 2, textureKey);
        const scale = Math.min(width / image.width, height / image.height);
        image.setScale(scale);
        this.boardContainer.add(image);
        return image.displayHeight;
    }

    private addInfoCard(x: number, y: number, width: number, height: number, title: string, body: string, accentHex = PRIMARY_BLUE_HEX, accent = PRIMARY_BLUE, background = SKY): void {
        const card = this.add.graphics();
        card.fillStyle(background, 1);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, accent, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        const titleText = this.add.text(x + 18, y + 16, title, { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: accentHex });
        const bodyText = this.add.text(x + 18, titleText.y + titleText.height + 6, body, {
            fontFamily: FONT,
            fontStyle: "500",
            fontSize: 14,
            color: BODY_TEXT,
            lineSpacing: 4,
            wordWrap: { width: width - 36 },
        });
        this.boardContainer.add([card, titleText, bodyText]);
    }

    /** Checklist card ("✓ item" rows). Returns the height actually used, so
     * callers can leave the remainder of a column as whitespace rather than
     * stretching the card to fill it. */
    private addChecklistCard(x: number, y: number, width: number, title: string, items: string[]): number {
        const lineHeight = 32;
        const titleBlockHeight = 46;
        const height = titleBlockHeight + items.length * lineHeight + 20;

        const card = this.add.graphics();
        card.fillStyle(SKY, 1);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, PRIMARY_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        this.boardContainer.add(card);

        const titleText = this.add.text(x + 20, y + 18, title, { fontFamily: FONT, fontStyle: "700", fontSize: 18, color: DARK_NAVY });
        this.boardContainer.add(titleText);

        items.forEach((item, index) => {
            const itemY = y + titleBlockHeight + index * lineHeight;
            const check = this.add.text(x + 20, itemY, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: GREEN_HEX });
            const label = this.add.text(x + 42, itemY, item, {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 15,
                color: DARK_NAVY,
                wordWrap: { width: width - 62 },
            });
            this.boardContainer.add([check, label]);
        });

        return height;
    }

    /** Full-width information bar at the bottom of a state. */
    private addInfoBar(text: string, y: number, width: number = CONTENT_WIDTH, x: number = CONTENT_X): number {
        const height = 60;
        const bar = this.add.graphics();
        bar.fillStyle(SKY, 1);
        bar.fillRoundedRect(x, y, width, height, 14);
        bar.lineStyle(2, PRIMARY_BLUE, 1);
        bar.strokeRoundedRect(x, y, width, height, 14);
        const label = this.add
            .text(x + width / 2, y + height / 2, text, {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 15,
                color: PRIMARY_BLUE_HEX,
                align: "center",
                wordWrap: { width: width - 48 },
            })
            .setOrigin(0.5);
        this.boardContainer.add([bar, label]);
        return height;
    }

    private renderBoard() {
        this.boardContainer.removeAll(true);
        this.addBoardChrome();

        switch (this.step) {
            case 1:
                this.buildStep1();
                break;
            case 2:
                this.buildStep2();
                break;
            case 3:
                this.buildStep3();
                break;
            case 4:
                this.buildStep4();
                break;
            case 5:
                this.buildStep5();
                break;
            case 6:
                this.buildStep6();
                break;
            default:
                this.buildStep7();
                break;
        }
    }

    // ---- Step 1: Pengantar MARPOL Annex V --------------------------------------------

    private buildStep1() {
        const titleBottom = this.addTitle("Pengantar MARPOL Annex V");
        const descBottom = this.addDescription(
            "MARPOL Annex V mengatur pencegahan pencemaran laut oleh sampah yang berasal dari kegiatan operasional kapal. Sampah harus dikelola, dipilah, disimpan, dan ditangani sesuai dengan jenisnya.",
            titleBottom + 16,
        );

        const iconRowY = descBottom + 30;
        const colGap = 28;
        const colWidth = (CONTENT_WIDTH - colGap * 3) / 4;
        const circleRadius = 36;
        PILAH_INTRO_ITEMS.forEach((item, index) => {
            const colX = CONTENT_X + index * (colWidth + colGap);
            const centerX = colX + colWidth / 2;
            const centerY = iconRowY + circleRadius;
            const icon = this.add.image(centerX, centerY, item.icon).setDisplaySize(circleRadius * 2, circleRadius * 2);
            this.boardContainer.add(icon);

            const label = this.add.text(centerX, centerY + circleRadius + 14, item.label, {
                fontFamily: FONT, fontStyle: "700", fontSize: 16, color: DARK_NAVY, align: "center",
            }).setOrigin(0.5, 0);
            const desc = this.add
                .text(centerX, label.y + label.height + 4, item.desc, {
                    fontFamily: FONT, fontStyle: "500", fontSize: 13, color: BODY_TEXT, align: "center", lineSpacing: 2,
                    wordWrap: { width: colWidth },
                })
                .setOrigin(0.5, 0);
            this.boardContainer.add([label, desc]);
        });

        const bottomY = iconRowY + circleRadius * 2 + 100;
        const leftWidth = CONTENT_WIDTH * 0.52;
        const rightWidth = CONTENT_WIDTH - leftWidth - COL_GAP;
        this.addChecklistCard(CONTENT_X, bottomY, leftWidth, "Tujuan Pembelajaran", PILAH_LEARNING_GOALS);

        const rightX = CONTENT_X + leftWidth + COL_GAP;
        this.addIllustrationSlot(rightX, bottomY, rightWidth, CONTENT_BOTTOM - bottomY, "pilah_sampah.materi.imgMarpol", 20);
    }

    // ---- Step 2: Pemilahan Sampah di Kapal --------------------------------------------

    private buildStep2() {
        const titleBottom = this.addTitle("Pemilahan Sampah di Kapal");
        const descBottom = this.addDescription(
            "Sampah harus dipisahkan berdasarkan jenisnya sejak dari sumber agar dapat dikelola dengan benar sesuai MARPOL Annex V.",
            titleBottom + 16,
        );

        const rowTop = descBottom + 24;
        const cardCount = PILAH_WASTE_CATEGORIES.length;
        const cardGap = 14;
        const cardWidth = (CONTENT_WIDTH - cardGap * (cardCount - 1)) / cardCount;
        const cardHeight = 226;
        const iconSize = 80;

        PILAH_WASTE_CATEGORIES.forEach((category, index) => {
            const x = CONTENT_X + index * (cardWidth + cardGap);
            const card = this.add.graphics();
            card.fillStyle(0xffffff, 1);
            card.fillRoundedRect(x, rowTop, cardWidth, cardHeight, 14);
            card.lineStyle(2, BORDER_BLUE, 1);
            card.strokeRoundedRect(x, rowTop, cardWidth, cardHeight, 14);
            this.boardContainer.add(card);

            const iconCenterX = x + cardWidth / 2;
            const iconCenterY = rowTop + 16 + iconSize / 2;
            if (category.icon) {
                const icon = this.add.image(iconCenterX, iconCenterY, category.icon);
                const scale = Math.min(iconSize / icon.width, iconSize / icon.height);
                icon.setScale(scale);
                this.boardContainer.add(icon);
            } else {
                this.addPlaceholderBox(x + (cardWidth - iconSize) / 2, rowTop + 16, iconSize, iconSize, 12);
            }

            const nameText = this.add
                .text(x + cardWidth / 2, rowTop + 16 + iconSize + 12, category.name, {
                    fontFamily: FONT, fontStyle: "700", fontSize: 15, color: DARK_NAVY, align: "center", lineSpacing: 2,
                    wordWrap: { width: cardWidth - 16 },
                })
                .setOrigin(0.5, 0);
            const descText = this.add
                .text(x + cardWidth / 2, nameText.y + nameText.height + 6, category.desc, {
                    fontFamily: FONT, fontStyle: "500", fontSize: 13, color: BODY_TEXT, align: "center", lineSpacing: 3,
                    wordWrap: { width: cardWidth - 16 },
                })
                .setOrigin(0.5, 0);
            this.boardContainer.add([nameText, descText]);
        });

        const principlesY = rowTop + cardHeight + 22;
        const half = PILAH_SORTING_PRINCIPLES.length / 2;
        const leftItems = PILAH_SORTING_PRINCIPLES.slice(0, half);
        const rightItems = PILAH_SORTING_PRINCIPLES.slice(half);
        const principlesHeight = this.addTwoColumnChecklistCard(CONTENT_X, principlesY, CONTENT_WIDTH, "Prinsip Pemilahan", leftItems, rightItems);

        this.addInfoBar(
            "Pemilahan yang benar mempermudah proses pengolahan, penyimpanan, dan penyerahan sampah.",
            principlesY + principlesHeight + 20,
        );
    }

    /** Same visual language as addChecklistCard, but splits items across two columns. */
    private addTwoColumnChecklistCard(x: number, y: number, width: number, title: string, leftItems: string[], rightItems: string[]): number {
        const lineHeight = 32;
        const titleBlockHeight = 46;
        const rows = Math.max(leftItems.length, rightItems.length);
        const height = titleBlockHeight + rows * lineHeight + 20;

        const card = this.add.graphics();
        card.fillStyle(SKY, 1);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, PRIMARY_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        this.boardContainer.add(card);

        const titleText = this.add.text(x + 20, y + 18, title, { fontFamily: FONT, fontStyle: "700", fontSize: 18, color: DARK_NAVY });
        this.boardContainer.add(titleText);

        const colWidth = (width - 40) / 2;
        [leftItems, rightItems].forEach((items, col) => {
            const colX = x + 20 + col * colWidth;
            items.forEach((item, index) => {
                const itemY = y + titleBlockHeight + index * lineHeight;
                const check = this.add.text(colX, itemY, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: GREEN_HEX });
                const label = this.add.text(colX + 22, itemY, item, {
                    fontFamily: FONT, fontStyle: "500", fontSize: 15, color: DARK_NAVY,
                    wordWrap: { width: colWidth - 42 },
                });
                this.boardContainer.add([check, label]);
            });
        });

        return height;
    }

    // ---- Step 3: Incinerator -----------------------------------------------------------

    private buildStep3() {
        const titleBottom = this.addTitle("Incinerator");
        const descBottom = this.addDescription(
            "Incinerator adalah peralatan di kapal yang digunakan untuk membakar jenis limbah tertentu secara terkendali sesuai prosedur operasional dan ketentuan yang berlaku.",
            titleBottom + 16,
        );

        const infoBarHeight = 60;
        const colY = descBottom + 26;
        const colBottomLimit = CONTENT_BOTTOM - infoBarHeight - 20;
        const colHeight = colBottomLimit - colY;
        const leftWidth = CONTENT_WIDTH * 0.42;
        const rightWidth = CONTENT_WIDTH - leftWidth - COL_GAP;

        this.addIllustrationSlot(CONTENT_X, colY, leftWidth, colHeight, "pilah_sampah.materi.imgIncinerator", 20);

        const rightX = CONTENT_X + leftWidth + COL_GAP;
        const cardGap = 16;
        const cardHeight = (colHeight - cardGap * (PILAH_INCINERATOR_CARDS.length - 1)) / PILAH_INCINERATOR_CARDS.length;
        PILAH_INCINERATOR_CARDS.forEach((card, index) => {
            const isWarning = card.title === "PERHATIAN";
            const cardY = colY + index * (cardHeight + cardGap);
            this.addInfoCard(
                rightX,
                cardY,
                rightWidth,
                cardHeight,
                card.title,
                card.body,
                isWarning ? AMBER_HEX : PRIMARY_BLUE_HEX,
                isWarning ? AMBER : PRIMARY_BLUE,
                INCINERATOR_CARD_BG,
            );
        });

        this.addInfoBar("Pastikan jenis sampah sesuai sebelum proses pembakaran dilakukan.", colBottomLimit + 20);
    }

    // ---- Step 4: Comminutor -------------------------------------------------------------

    private buildStep4() {
        const titleBottom = this.addTitle("Comminutor");
        const descBottom = this.addDescription(
            "Comminutor merupakan peralatan yang digunakan untuk menghancurkan atau memperkecil ukuran sampah makanan sebelum penanganan lebih lanjut.",
            titleBottom + 16,
        );

        const diagramHeight = 130;
        const colY = descBottom + 22;
        const colBottomLimit = CONTENT_BOTTOM - diagramHeight - 20;
        const colHeight = colBottomLimit - colY;
        const leftWidth = CONTENT_WIDTH * 0.42;
        const rightWidth = CONTENT_WIDTH - leftWidth - COL_GAP;

        this.addIllustrationSlot(CONTENT_X, colY, leftWidth, colHeight, "pilah_sampah.materi.imgComminutor", 20);

        const rightX = CONTENT_X + leftWidth + COL_GAP;
        const statHeight = 84;
        const statLabel = this.add.text(rightX, colY, "UKURAN PARTIKEL", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: PRIMARY_BLUE_HEX });
        const statValue = this.add.text(rightX, statLabel.y + statLabel.height + 6, "< 25 mm", { fontFamily: FONT, fontStyle: "800", fontSize: 34, color: DARK_NAVY });
        this.boardContainer.add([statLabel, statValue]);

        const cardsY = colY + statHeight;
        const cardGap = 14;
        const cardHeight = (colHeight - statHeight - cardGap * (PILAH_COMMINUTOR_CARDS.length - 1)) / PILAH_COMMINUTOR_CARDS.length;
        PILAH_COMMINUTOR_CARDS.forEach((card, index) => {
            const cardY = cardsY + index * (cardHeight + cardGap);
            this.addInfoCard(rightX, cardY, rightWidth, cardHeight, card.title, card.body);
        });

        // Simple input → machine → output diagram, spanning the full board width.
        const diagramY = colBottomLimit + 20;
        const boxSize = 76;
        const boxCenterY = diagramY + boxSize / 2;
        const diagramLabels = ["Sampah Masuk", "Comminutor", "Hasil Olahan"];
        const diagramIcons = [
            "pilah_sampah.materi.iconComminutorTrash",
            "pilah_sampah.materi.iconComminutor",
            "pilah_sampah.materi.iconComminutorResult",
        ];
        const slotWidth = CONTENT_WIDTH / 3;
        diagramLabels.forEach((diagramLabel, index) => {
            const slotCenterX = CONTENT_X + slotWidth * index + slotWidth / 2;
            this.addIllustrationSlot(slotCenterX - boxSize / 2, diagramY, boxSize, boxSize, diagramIcons[index], 14);
            const caption = this.add
                .text(slotCenterX, diagramY + boxSize + 8, diagramLabel, { fontFamily: FONT, fontStyle: "500", fontSize: 12, color: BODY_TEXT })
                .setOrigin(0.5, 0);
            this.boardContainer.add(caption);

            if (index < diagramLabels.length - 1) {
                const arrow = this.add
                    .text(slotCenterX + slotWidth / 2, boxCenterY, "→", { fontFamily: FONT, fontStyle: "600", fontSize: 22, color: BODY_TEXT })
                    .setOrigin(0.5);
                this.boardContainer.add(arrow);
            }
        });
    }

    // ---- Step 5: Bak / Gudang Sampah -----------------------------------------------------

    private buildStep5() {
        const titleBottom = this.addTitle("Bak / Gudang Sampah");
        const descBottom = this.addDescription(
            "Sampah yang belum dapat diolah atau diserahkan harus disimpan sementara pada area penyimpanan sampah di kapal dengan aman dan sesuai kategorinya.",
            titleBottom + 16,
        );

        const colY = descBottom + 26;
        const colHeight = CONTENT_BOTTOM - colY;
        const leftWidth = CONTENT_WIDTH * 0.42;
        const rightWidth = CONTENT_WIDTH - leftWidth - COL_GAP;

        const illustrationHeight = this.addIllustrationSlot(CONTENT_X, colY, leftWidth, colHeight, "pilah_sampah.materi.imgBakSampah", 20);

        const rightX = CONTENT_X + leftWidth + COL_GAP;
        const cardGap = 14;
        const cardsY = colY + (colHeight - illustrationHeight) / 2;
        const cardHeight = (illustrationHeight - cardGap * (PILAH_STORAGE_CARDS.length - 1)) / PILAH_STORAGE_CARDS.length;
        PILAH_STORAGE_CARDS.forEach((card, index) => {
            const cardY = cardsY + index * (cardHeight + cardGap);
            this.addInfoCard(rightX, cardY, rightWidth, cardHeight, card.title, card.body);
        });
    }

    // ---- Step 6: Alur Pengelolaan Sampah di Kapal -----------------------------------------

    private buildStep6() {
        const titleBottom = this.addTitle("Alur Pengelolaan Sampah di Kapal");
        const descBottom = this.addDescription(
            "Pengelolaan sampah dilakukan secara sistematis mulai dari pemilahan hingga penanganan dan penyerahan akhir.",
            titleBottom + 16,
        );

        const flowY = descBottom + 26;
        const nodeCount = PILAH_MANAGEMENT_FLOW.length;
        const arrowWidth = 30;
        const nodeWidth = (CONTENT_WIDTH - arrowWidth * (nodeCount - 1)) / nodeCount;
        const nodeCardHeight = 325;
        const iconHeight = 210;
        const iconSize = 178;
        const flowIcons = [
            "pilah_sampah.materi.iconAlurPemilahan",
            "pilah_sampah.materi.iconAlurPengelolaan",
            "pilah_sampah.materi.iconAlurPenyimpanan",
            "pilah_sampah.materi.iconAlurPencatatan",
            "pilah_sampah.materi.iconAlurPenyerahan",
        ];

        PILAH_MANAGEMENT_FLOW.forEach((flowStep, index) => {
            const x = CONTENT_X + index * (nodeWidth + arrowWidth);
            const centerX = x + nodeWidth / 2;

            const badgeRadius = 15;
            const badge = this.add.circle(centerX, flowY + 18, badgeRadius, PRIMARY_BLUE, 1);
            const badgeText = this.add.text(centerX, flowY + 18, flowStep.number, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: "#ffffff" }).setOrigin(0.5);
            this.boardContainer.add([badge, badgeText]);

            const iconY = flowY + 40;
            this.addIllustrationSlot(
                centerX - (nodeWidth - 18) / 2,
                iconY,
                nodeWidth - 18,
                iconHeight,
                flowIcons[index],
                12,
            );

            const labelText = this.add
                .text(centerX, iconY + iconHeight + 14, flowStep.label, { fontFamily: FONT, fontStyle: "700", fontSize: 18, color: DARK_NAVY, align: "center" })
                .setOrigin(0.5, 0);
            const descText = this.add
                .text(centerX, labelText.y + labelText.height + 6, flowStep.desc, {
                    fontFamily: FONT, fontStyle: "500", fontSize: 12, color: BODY_TEXT, align: "center", lineSpacing: 3,
                    wordWrap: { width: nodeWidth - 16 },
                })
                .setOrigin(0.5, 0);
            this.boardContainer.add([labelText, descText]);

            if (index < nodeCount - 1) {
                const arrow = this.add
                    .text(x + nodeWidth + arrowWidth / 2, flowY + iconSize / 2 + 56, "→", { fontFamily: FONT, fontStyle: "600", fontSize: 22, color: BODY_TEXT })
                    .setOrigin(0.5);
                this.boardContainer.add(arrow);
            }
        });

        this.addInfoBar(
            "Setiap tahap harus dilakukan sesuai prosedur pengelolaan sampah kapal dan ketentuan MARPOL Annex V.",
            flowY + nodeCardHeight + 24,
        );
    }

    // ---- Step 7: Kesimpulan ---------------------------------------------------------------

    private buildStep7() {
        const titleBottom = this.addTitle("Kesimpulan");
        const descBottom = this.addDescription(
            "Pengelolaan sampah di kapal merupakan tanggung jawab seluruh awak kapal. Pemilahan dan penanganan yang tepat membantu menjaga kebersihan kapal serta mencegah pencemaran lingkungan laut.",
            titleBottom + 16,
        );

        const infoBarHeight = 60;
        const colY = descBottom + 26;
        const colBottomLimit = CONTENT_BOTTOM - infoBarHeight - 20;
        const colHeight = colBottomLimit - colY;
        const leftWidth = CONTENT_WIDTH * 0.5;
        const rightWidth = CONTENT_WIDTH - leftWidth - COL_GAP;

        this.addChecklistCard(CONTENT_X, colY, leftWidth, "Poin Penting", PILAH_SUMMARY_POINTS);

        const rightX = CONTENT_X + leftWidth + COL_GAP;
        this.addIllustrationSlot(rightX, colY, rightWidth, colHeight, "pilah_sampah.materi.imgKesimpulan", 20);

        this.addInfoBar("Pengelolaan sampah yang tepat membantu menjaga laut tetap bersih untuk generasi mendatang.", colBottomLimit + 20);
    }

    // ---- Layout -------------------------------------------------------------------------

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        const rootX = (width - DESIGN_WIDTH * scale) / 2;
        const rootY = (height - DESIGN_HEIGHT * scale) / 2;
        this.root.setPosition(rootX, rootY);
    }
}
