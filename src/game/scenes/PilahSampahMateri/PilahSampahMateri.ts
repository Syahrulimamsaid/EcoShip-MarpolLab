import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import {
    COMMINUTOR_FLOW,
    FlowNode,
    INCINERATOR_FLOW,
    PILAH_HANDLING_BRANCHES,
    PILAH_INTRO_ICONS,
    PILAH_LEARNING_GOALS,
    PILAH_MAIN_FLOW,
    PILAH_REMINDERS,
    PILAH_SIDEBAR_STEPS,
    PILAH_SORTING_GOALS,
    PILAH_STORAGE_CHECKLIST,
    PILAH_SUMMARY,
    STORAGE_BINS,
    WASTE_CATEGORIES,
} from "./PilahSampahMateriData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const TOTAL_STEPS = PILAH_SIDEBAR_STEPS.length;

const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const AMBER = 0xe0792e;
const AMBER_HEX = "#b5651d";
const SKY = 0xeaf3ff;

const SIDEBAR_X = 24;
const SIDEBAR_Y = 104;
const SIDEBAR_WIDTH = 280;
const FOOTER_TOP = 976;
const SIDEBAR_HEIGHT = FOOTER_TOP - 16 - SIDEBAR_Y;

const BOARD_X = SIDEBAR_X + SIDEBAR_WIDTH + 24;
const BOARD_WIDTH = DESIGN_WIDTH - BOARD_X - 24;
const BOARD_Y = SIDEBAR_Y;
const BOARD_HEIGHT = SIDEBAR_HEIGHT;
const BOARD_PAD = 32;
const CONTENT_X = BOARD_X + BOARD_PAD;
const CONTENT_WIDTH = BOARD_WIDTH - BOARD_PAD * 2;

/**
 * "Materi Pemilahan Sampah" — a 7-step reading module that runs before the
 * existing PilahSampah drag-and-drop simulator. Mirrors OwsMateri's sidebar +
 * whiteboard layout so the two learning modules feel like one product; the
 * simulator itself (PilahSampah.ts) is untouched — this scene only adds a
 * "Mulai Simulasi" hand-off into it.
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

        const rowTop = SIDEBAR_Y + headerHeight + 16;
        const rowsBottom = SIDEBAR_Y + SIDEBAR_HEIGHT - 16;
        const rowHeight = Math.min(84, (rowsBottom - rowTop) / PILAH_SIDEBAR_STEPS.length);

        PILAH_SIDEBAR_STEPS.forEach((item, index) => {
            const rowY = rowTop + index * rowHeight;
            const unlocked = item.id <= this.maxReachedStep;
            const active = item.id === this.step;
            const completed = item.id < this.maxReachedStep;

            if (active) {
                const activeBg = this.add.graphics();
                activeBg.fillStyle(SKY, 1);
                activeBg.fillRoundedRect(SIDEBAR_X + 12, rowY - 8, SIDEBAR_WIDTH - 24, rowHeight - 12, 12);
                this.sidebarContainer.add(activeBg);
            }

            const circleRadius = 17;
            const groupGap = 14;
            const contentCenterY = rowY + rowHeight / 2 - 6;
            const circleX = SIDEBAR_X + 40;
            const labelX = circleX + circleRadius + groupGap;

            const label = this.add.text(labelX, 0, item.title, {
                fontFamily: FONT,
                fontStyle: active ? "700" : "500",
                fontSize: 14,
                color: active ? DARK_NAVY : PRIMARY_BLUE_HEX,
                wordWrap: { width: SIDEBAR_WIDTH - 70 - 28 },
                lineSpacing: 3,
            });

            const circle = this.add.circle(circleX, contentCenterY, circleRadius, PRIMARY_BLUE, 1);
            const numberText = this.add
                .text(circleX, contentCenterY, String(item.id), {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 14,
                    color: "#ffffff",
                })
                .setOrigin(0.5);
            label.setY(contentCenterY - label.height / 2);

            this.sidebarContainer.add([circle, numberText, label]);

            if (completed) {
                const check = this.add.text(SIDEBAR_X + SIDEBAR_WIDTH - 24, contentCenterY, "✓", {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 15,
                    color: GREEN_HEX,
                }).setOrigin(0.5);
                this.sidebarContainer.add(check);
            }

            if (unlocked) {
                const hit = this.add
                    .rectangle(SIDEBAR_X + SIDEBAR_WIDTH / 2, rowY + rowHeight / 2 - 6, SIDEBAR_WIDTH - 12, rowHeight - 8, 0xffffff, 0)
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
            text: isLast ? "Mulai Simulasi →" : "Selanjutnya →",
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

    // ---- Whiteboard chrome + per-step content --------------------------------------------

    private addBoardChrome() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, 18);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, 18);
        this.boardContainer.add(card);
    }

    private addBoardTitle(text: string): GameObjects.Text {
        const title = this.add.text(CONTENT_X, BOARD_Y + BOARD_PAD, text, {
            fontFamily: FONT,
            fontStyle: "800",
            fontSize: 26,
            color: DARK_NAVY,
        });
        this.boardContainer.add(title);
        return title;
    }

    private buildNoteBox(x: number, y: number, width: number, message: string, accent: number, accentHex: string, bg: number, icon: string): number {
        const badgeRadius = 16;
        const paddingX = 24;
        const iconGap = 16;
        const textWidth = width - (paddingX + badgeRadius * 2 + iconGap + paddingX);
        const measure = this.add.text(0, 0, message, { fontFamily: FONT, fontStyle: "500", fontSize: 15, lineSpacing: 4, wordWrap: { width: textWidth } });
        const height = Math.max(64, measure.height + 28);
        measure.destroy();

        const box = this.add.graphics();
        box.fillStyle(bg, 1);
        box.fillRoundedRect(x, y, width, height, 14);
        box.lineStyle(2, accent, 1);
        box.strokeRoundedRect(x, y, width, height, 14);
        const badgeX = x + paddingX + badgeRadius;
        const badgeY = y + height / 2;
        const badge = this.add.circle(badgeX, badgeY, badgeRadius, accent, 1);
        const badgeIcon = this.add.text(badgeX, badgeY, icon, { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0.5);
        const noteText = this.add.text(badgeX + badgeRadius + iconGap, badgeY, message, {
            fontFamily: FONT, fontStyle: "500", fontSize: 15, color: accentHex, lineSpacing: 4, wordWrap: { width: textWidth },
        }).setOrigin(0, 0.5);
        this.boardContainer.add([box, badge, badgeIcon, noteText]);
        return height;
    }

    private addChecklistPanel(x: number, y: number, width: number, title: string, items: string[], accentHex = PRIMARY_BLUE_HEX, accent = PRIMARY_BLUE): number {
        const lineHeight = 30;
        const height = 46 + items.length * lineHeight + 10;

        const card = this.add.graphics();
        card.fillStyle(SKY, 1);
        card.fillRoundedRect(x, y, width, height, 14);
        card.lineStyle(2, accent, 1);
        card.strokeRoundedRect(x, y, width, height, 14);
        this.boardContainer.add(card);

        const titleText = this.add.text(x + 18, y + 16, title, { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: accentHex });
        this.boardContainer.add(titleText);

        items.forEach((item, index) => {
            const itemY = y + 50 + index * lineHeight;
            const check = this.add.text(x + 18, itemY, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: GREEN_HEX });
            const label = this.add.text(x + 40, itemY, item, {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 13,
                color: DARK_NAVY,
                wordWrap: { width: width - 58 },
            });
            this.boardContainer.add([check, label]);
        });

        return height;
    }

    /** A row of circular flow nodes joined by arrows, used by steps 3/4/6. */
    private buildFlowChain(nodes: FlowNode[], topY: number, highlightLastGreen = false): number {
        const nodeCount = nodes.length;
        const arrowWidth = 34;
        const nodeWidth = (CONTENT_WIDTH - arrowWidth * (nodeCount - 1)) / nodeCount;
        const nodeSize = 56;
        const centerY = topY + nodeSize / 2;

        let maxBottom = centerY;
        nodes.forEach((node, index) => {
            const x = CONTENT_X + index * (nodeWidth + arrowWidth);
            const centerX = x + nodeWidth / 2;
            const isLast = index === nodeCount - 1;
            const highlight = highlightLastGreen && isLast;

            const circle = this.add.circle(centerX, centerY, nodeSize / 2, highlight ? GREEN : PRIMARY_BLUE, 1);
            const numberText = this.add.text(centerX, centerY, String(index + 1), { fontFamily: FONT, fontStyle: "700", fontSize: 16, color: "#ffffff" }).setOrigin(0.5);
            const label = this.add
                .text(centerX, centerY + nodeSize / 2 + 12, node.label, {
                    fontFamily: FONT,
                    fontStyle: "700",
                    fontSize: 14,
                    color: highlight ? GREEN_HEX : DARK_NAVY,
                    align: "center",
                    lineSpacing: 3,
                    wordWrap: { width: nodeWidth + 10 },
                })
                .setOrigin(0.5, 0);
            this.boardContainer.add([circle, numberText, label]);
            maxBottom = Math.max(maxBottom, label.y + label.height);

            if (index < nodeCount - 1) {
                const arrow = this.add
                    .text(x + nodeWidth + arrowWidth / 2, centerY, "→", { fontFamily: FONT, fontStyle: "600", fontSize: 22, color: BODY_TEXT })
                    .setOrigin(0.5);
                this.boardContainer.add(arrow);
            }
        });

        return maxBottom;
    }

    private renderBoard() {
        this.boardContainer.removeAll(true);

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
        this.addBoardChrome();
        const title = this.addBoardTitle("Pengantar MARPOL Annex V");

        const paraWidth = CONTENT_WIDTH;
        const para = this.add.text(
            CONTENT_X,
            title.y + title.height + 16,
            "MARPOL Annex V mengatur pencegahan pencemaran laut oleh sampah yang berasal dari kegiatan operasional kapal. Sampah harus dikelola, dipilah, disimpan, dan ditangani sesuai dengan jenisnya.",
            { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: paraWidth } },
        );
        this.boardContainer.add(para);

        const iconRowY = para.y + para.height + 34;
        const iconSize = 84;
        const iconGap = (CONTENT_WIDTH - iconSize * PILAH_INTRO_ICONS.length) / (PILAH_INTRO_ICONS.length - 1);
        PILAH_INTRO_ICONS.forEach((item, index) => {
            const centerX = CONTENT_X + iconSize / 2 + index * (iconSize + iconGap);
            const circle = this.add.circle(centerX, iconRowY + iconSize / 2, iconSize / 2, SKY, 1);
            circle.setStrokeStyle(2, PRIMARY_BLUE, 0.5);
            const icon = this.add.text(centerX, iconRowY + iconSize / 2 - 6, item.icon, { fontFamily: FONT, fontSize: 34 }).setOrigin(0.5);
            const label = this.add.text(centerX, iconRowY + iconSize + 10, item.label, {
                fontFamily: FONT, fontStyle: "600", fontSize: 13, color: DARK_NAVY,
            }).setOrigin(0.5, 0);
            this.boardContainer.add([circle, icon, label]);
        });

        const panelY = iconRowY + iconSize + 46;
        this.addChecklistPanel(CONTENT_X, panelY, CONTENT_WIDTH, "🎯  Tujuan Pembelajaran", PILAH_LEARNING_GOALS.map((g) => g), PRIMARY_BLUE_HEX, PRIMARY_BLUE);
    }

    // ---- Step 2: Pemilahan Sampah di Kapal --------------------------------------------

    private buildStep2() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Pemilahan Sampah di Kapal");

        const desc = this.add.text(
            CONTENT_X,
            title.y + title.height + 10,
            "Sampah harus dipisahkan berdasarkan jenisnya sejak dari sumber agar dapat dikelola dengan benar.",
            { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, wordWrap: { width: CONTENT_WIDTH } },
        );
        this.boardContainer.add(desc);

        const rowTop = desc.y + desc.height + 20;
        const cardGap = 14;
        const cardCount = WASTE_CATEGORIES.length;
        const cardWidth = (CONTENT_WIDTH - cardGap * (cardCount - 1)) / cardCount;
        const binHeight = 54;
        const cardHeight = 210;

        WASTE_CATEGORIES.forEach((category, index) => {
            const x = CONTENT_X + index * (cardWidth + cardGap);

            const bin = this.add.graphics();
            bin.fillStyle(category.color, 1);
            bin.fillRoundedRect(x, rowTop, cardWidth, binHeight, { tl: 10, tr: 10, bl: 0, br: 0 });
            const lid = this.add.rectangle(x + cardWidth / 2, rowTop - 4, cardWidth * 0.7, 8, category.color, 1);
            const icon = this.add.text(x + cardWidth / 2, rowTop + binHeight / 2, category.icon, { fontFamily: FONT, fontSize: 22 }).setOrigin(0.5);

            const card = this.add.graphics();
            card.fillStyle(0xffffff, 1);
            card.fillRoundedRect(x, rowTop + binHeight, cardWidth, cardHeight - binHeight, { tl: 0, tr: 0, bl: 10, br: 10 });
            card.lineStyle(2, category.color, 0.4);
            card.strokeRoundedRect(x, rowTop + binHeight, cardWidth, cardHeight - binHeight, { tl: 0, tr: 0, bl: 10, br: 10 });

            const titleText = this.add.text(x + 10, rowTop + binHeight + 12, category.title, {
                fontFamily: FONT, fontStyle: "700", fontSize: 12, color: DARK_NAVY,
                wordWrap: { width: cardWidth - 20 }, lineSpacing: 2,
            });
            let nextY = titleText.y + titleText.height + 2;
            const items: GameObjects.GameObject[] = [bin, lid, icon, card, titleText];
            if (category.subtitle) {
                const subtitleText = this.add.text(x + 10, nextY, category.subtitle, {
                    fontFamily: FONT, fontStyle: "600", fontSize: 11, color: BODY_TEXT,
                });
                items.push(subtitleText);
                nextY = subtitleText.y + subtitleText.height + 4;
            } else {
                nextY += 4;
            }
            const exampleText = this.add.text(x + 10, nextY, category.example, {
                fontFamily: FONT, fontStyle: "600", fontSize: 11, color: BODY_TEXT,
                wordWrap: { width: cardWidth - 20 }, lineSpacing: 2,
            });
            items.push(exampleText);

            this.boardContainer.add(items);
        });

        const panelY = rowTop + cardHeight + 22;
        const panelGap = 20;
        const panelWidth = (CONTENT_WIDTH - panelGap) / 2;
        this.addChecklistPanel(CONTENT_X, panelY, panelWidth, "🎯  Tujuan Pemilahan Sampah", PILAH_SORTING_GOALS, PRIMARY_BLUE_HEX, PRIMARY_BLUE);
        this.addChecklistPanel(CONTENT_X + panelWidth + panelGap, panelY, panelWidth, "🚢  Ingat!", PILAH_REMINDERS, PRIMARY_BLUE_HEX, PRIMARY_BLUE);
    }

    // ---- Step 3: Incinerator -----------------------------------------------------------

    private buildStep3() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Incinerator");

        const illustrationY = title.y + title.height + 20;
        const illustrationX = CONTENT_X + CONTENT_WIDTH / 2 - 60;
        const machine = this.add.graphics();
        machine.fillStyle(0x8a94a6, 1);
        machine.fillRoundedRect(illustrationX, illustrationY, 120, 90, 10);
        machine.fillStyle(0x5b6577, 1);
        machine.fillRect(illustrationX + 10, illustrationY + 60, 100, 12);
        const chimney = this.add.rectangle(illustrationX + 90, illustrationY - 20, 18, 40, 0x5b6577);
        const flame = this.add.text(illustrationX + 30, illustrationY + 20, "🔥", { fontFamily: FONT, fontSize: 34 }).setOrigin(0.5);
        this.boardContainer.add([machine, chimney, flame]);

        const desc = this.add.text(
            CONTENT_X,
            illustrationY + 100,
            "Incinerator merupakan peralatan yang digunakan untuk membakar jenis limbah tertentu sehingga volume limbah dapat dikurangi.",
            { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, align: "center", wordWrap: { width: CONTENT_WIDTH } },
        ).setOrigin(0.5, 0);
        desc.setX(CONTENT_X + CONTENT_WIDTH / 2);
        this.boardContainer.add(desc);

        const flowTop = desc.y + desc.height + 30;
        const flowBottom = this.buildFlowChain(INCINERATOR_FLOW, flowTop);

        const noteY = flowBottom + 26;
        this.buildNoteBox(
            CONTENT_X, noteY, CONTENT_WIDTH,
            "Tidak semua jenis sampah boleh dibakar. Pengoperasian incinerator harus mengikuti prosedur kapal dan ketentuan yang berlaku.",
            AMBER, AMBER_HEX, 0xfdf3e7, "⚠",
        );
    }

    // ---- Step 4: Comminutor -------------------------------------------------------------

    private buildStep4() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Comminutor");

        const illustrationY = title.y + title.height + 20;
        const illustrationX = CONTENT_X + CONTENT_WIDTH / 2 - 60;
        const machine = this.add.graphics();
        machine.fillStyle(0x2f68d8, 1);
        machine.fillRoundedRect(illustrationX, illustrationY, 120, 70, 10);
        machine.fillStyle(0xffffff, 1);
        machine.fillCircle(illustrationX + 60, illustrationY + 35, 22);
        const blade = this.add.text(illustrationX + 60, illustrationY + 35, "⚙️", { fontFamily: FONT, fontSize: 26 }).setOrigin(0.5);
        const foodIn = this.add.text(illustrationX + 60, illustrationY - 26, "🍌", { fontFamily: FONT, fontSize: 26 }).setOrigin(0.5);
        this.boardContainer.add([machine, blade, foodIn]);

        const desc = this.add.text(
            CONTENT_X,
            illustrationY + 90,
            "Comminutor digunakan untuk menghancurkan atau menggiling sisa makanan menjadi ukuran partikel yang lebih kecil.",
            { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, align: "center", wordWrap: { width: CONTENT_WIDTH } },
        ).setOrigin(0.5, 0);
        desc.setX(CONTENT_X + CONTENT_WIDTH / 2);
        this.boardContainer.add(desc);

        const flowTop = desc.y + desc.height + 30;
        const flowBottom = this.buildFlowChain(COMMINUTOR_FLOW, flowTop);

        const noteY = flowBottom + 26;
        const note = this.add.graphics();
        note.fillStyle(SKY, 1);
        note.fillRoundedRect(CONTENT_X, noteY, CONTENT_WIDTH, 54, 12);
        note.lineStyle(2, PRIMARY_BLUE, 1);
        note.strokeRoundedRect(CONTENT_X, noteY, CONTENT_WIDTH, 54, 12);
        this.boardContainer.add(note);
        const noteText = this.add
            .text(CONTENT_X + 16, noteY + 27, "Comminutor bukan tempat untuk semua jenis sampah — plastik, logam, dan kaca tidak boleh dimasukkan ke comminutor.", {
                fontFamily: FONT, fontStyle: "500", fontSize: 15, color: PRIMARY_BLUE_HEX, lineSpacing: 4, wordWrap: { width: CONTENT_WIDTH - 32 },
            })
            .setOrigin(0, 0.5);
        this.boardContainer.add(noteText);
    }

    // ---- Step 5: Bak / Gudang Sampah -----------------------------------------------------

    private buildStep5() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Bak dan Gudang Sampah");

        const desc = this.add.text(
            CONTENT_X,
            title.y + title.height + 10,
            "Gudang sampah merupakan area penyimpanan sementara untuk sampah yang telah dipilah sebelum diolah di atas kapal atau diserahkan ke fasilitas penerimaan di pelabuhan.",
            { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: CONTENT_WIDTH } },
        );
        this.boardContainer.add(desc);

        const rowTop = desc.y + desc.height + 30;
        const gap = 16;
        const binWidth = (CONTENT_WIDTH - gap * (STORAGE_BINS.length - 1)) / STORAGE_BINS.length;
        const binHeight = 130;

        STORAGE_BINS.forEach((bin, index) => {
            const x = CONTENT_X + index * (binWidth + gap);
            const card = this.add.graphics();
            card.fillStyle(bin.color, 0.12);
            card.fillRoundedRect(x, rowTop, binWidth, binHeight, 12);
            card.lineStyle(2, bin.color, 0.7);
            card.strokeRoundedRect(x, rowTop, binWidth, binHeight, 12);
            const lidTop = rowTop + 14;
            const lid = this.add.graphics();
            lid.fillStyle(bin.color, 1);
            lid.fillRoundedRect(x + binWidth / 2 - 24, lidTop, 48, 20, 6);
            const bodyRect = this.add.rectangle(x + binWidth / 2, lidTop + 44, 56, 46, bin.color, 1).setOrigin(0.5);
            const label = this.add
                .text(x + binWidth / 2, rowTop + binHeight - 24, bin.label, {
                    fontFamily: FONT, fontStyle: "700", fontSize: 12, color: DARK_NAVY, align: "center",
                    wordWrap: { width: binWidth - 10 },
                })
                .setOrigin(0.5);
            this.boardContainer.add([card, lid, bodyRect, label]);
        });

        const panelY = rowTop + binHeight + 26;
        this.addChecklistPanel(CONTENT_X, panelY, CONTENT_WIDTH, "✅  Checklist Gudang Sampah", PILAH_STORAGE_CHECKLIST, PRIMARY_BLUE_HEX, PRIMARY_BLUE);
    }

    // ---- Step 6: Alur Pengelolaan ---------------------------------------------------------

    private buildStep6() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Alur Pengelolaan Sampah di Kapal");

        const chainTop = title.y + title.height + 40;
        const chainBottom = this.buildFlowChain(PILAH_MAIN_FLOW, chainTop);

        // Branching diagram: the last chain node splits into the four
        // handling routes below it.
        const branchTop = chainBottom + 40;
        const branchGap = 20;
        const branchCount = PILAH_HANDLING_BRANCHES.length;
        const branchWidth = (CONTENT_WIDTH - branchGap * (branchCount - 1)) / branchCount;
        const branchHeight = 64;

        const trunkX = CONTENT_X + CONTENT_WIDTH / 2;
        const trunk = this.add.line(0, 0, trunkX, chainBottom + 6, trunkX, branchTop - 16, BORDER_BLUE, 1).setLineWidth(2);
        this.boardContainer.add(trunk);
        const rail = this.add.line(0, 0, CONTENT_X + branchWidth / 2, branchTop - 16, CONTENT_X + CONTENT_WIDTH - branchWidth / 2, branchTop - 16, BORDER_BLUE, 1).setLineWidth(2);
        this.boardContainer.add(rail);

        PILAH_HANDLING_BRANCHES.forEach((branchLabel, index) => {
            const x = CONTENT_X + index * (branchWidth + branchGap);
            const centerX = x + branchWidth / 2;

            const drop = this.add.line(0, 0, centerX, branchTop - 16, centerX, branchTop, BORDER_BLUE, 1).setLineWidth(2);
            this.boardContainer.add(drop);

            const card = this.add.graphics();
            card.fillStyle(0xf7faff, 1);
            card.fillRoundedRect(x, branchTop, branchWidth, branchHeight, 12);
            card.lineStyle(2, PRIMARY_BLUE, 0.5);
            card.strokeRoundedRect(x, branchTop, branchWidth, branchHeight, 12);
            const label = this.add
                .text(centerX, branchTop + branchHeight / 2, branchLabel, {
                    fontFamily: FONT, fontStyle: "700", fontSize: 13, color: DARK_NAVY, align: "center",
                    lineSpacing: 3, wordWrap: { width: branchWidth - 12 },
                })
                .setOrigin(0.5);
            this.boardContainer.add([card, label]);
        });
    }

    // ---- Step 7: Kesimpulan ---------------------------------------------------------------

    private buildStep7() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Siap Melakukan Pemilahan Sampah?");

        const listTop = title.y + title.height + 24;
        const rowHeight = 40;
        PILAH_SUMMARY.forEach((item, index) => {
            const y = listTop + index * rowHeight;
            const badge = this.add.circle(CONTENT_X + 14, y + 14, 14, PRIMARY_BLUE, 1);
            const num = this.add.text(CONTENT_X + 14, y + 14, String(index + 1), { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#ffffff" }).setOrigin(0.5);
            const label = this.add.text(CONTENT_X + 40, y + 3, item, {
                fontFamily: FONT, fontStyle: "500", fontSize: 15, color: DARK_NAVY,
                wordWrap: { width: CONTENT_WIDTH - 60 },
            });
            this.boardContainer.add([badge, num, label]);
        });

        const messageY = listTop + PILAH_SUMMARY.length * rowHeight + 20;
        const message = this.add.graphics();
        message.fillStyle(0xe4f7ec, 1);
        message.fillRoundedRect(CONTENT_X, messageY, CONTENT_WIDTH, 74, 14);
        message.lineStyle(2, GREEN, 0.4);
        message.strokeRoundedRect(CONTENT_X, messageY, CONTENT_WIDTH, 74, 14);
        const messageIcon = this.add.text(CONTENT_X + 26, messageY + 37, "🚀", { fontFamily: FONT, fontSize: 26 }).setOrigin(0.5);
        const messageText = this.add
            .text(CONTENT_X + 56, messageY + 37, "Sekarang saatnya menerapkan pengetahuanmu dalam Simulasi Pemilahan Sampah.", {
                fontFamily: FONT, fontStyle: "700", fontSize: 16, color: GREEN_HEX, wordWrap: { width: CONTENT_WIDTH - 90 },
            })
            .setOrigin(0, 0.5);
        this.boardContainer.add([message, messageIcon, messageText]);
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
