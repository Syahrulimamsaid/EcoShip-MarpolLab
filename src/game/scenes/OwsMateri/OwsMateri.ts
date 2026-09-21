import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { setMaterialCompleted } from "../../OwsModuleState";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import {
    OWS_COMPONENT_MARKERS,
    OWS_PPM_SAMPLES,
    OWS_PROCEDURE_STEPS,
    OWS_RECORD_BOOK_EXAMPLE,
    OWS_RECORD_BOOK_FIELDS,
    OWS_SIDEBAR_STEPS,
    OWS_SUMMARY_CARDS,
    OWS_WORK_FLOW,
    OwsComponentMarker,
} from "./OwsMateriData";

// This page is authored directly at the game's own base resolution (no
// extra internal scale-to-fit layer) per the brief's "desain utama mengacu
// 1920x1080" — the background art is exactly 16:9 too, so it can just fill
// the canvas edge-to-edge.
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const TOTAL_STEPS = OWS_SIDEBAR_STEPS.length;

const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const RED = 0xc0392b;
const RED_HEX = "#c0392b";
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
const BOARD_HEIGHT = 380;
const BOARD_Y = FOOTER_TOP - 16 - BOARD_HEIGHT;
const BOARD_PAD = 32;
const CONTENT_X = BOARD_X + BOARD_PAD;
const CONTENT_WIDTH = BOARD_WIDTH - BOARD_PAD * 2;

/**
 * "Materi OWS" — a 7-step reading module overlaid on the same OWS engine-
 * room artwork the simulator uses (`ows.background`), styled as a sidebar +
 * whiteboard learning page rather than a full-bleed card, so the real
 * machinery (tank, valves, OCM, pipe runs) stays visible as the actual
 * subject matter instead of being redrawn. Reached from MainMenu before
 * SimulatorOws.
 */
export class OwsMateri extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private sidebarContainer!: GameObjects.Container;
    private boardContainer!: GameObjects.Container;
    private footerContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private step = 1;
    private maxReachedStep = 1;
    private activeMarkerIndex: number | null = null;
    private recordBookExampleOpen = false;

    constructor() {
        super("OwsMateri");
    }

    create() {
        this.background = this.add.image(0, 0, "ows.background");
        this.root = this.add.container(0, 0);

        this.step = 1;
        this.maxReachedStep = 1;
        this.activeMarkerIndex = null;
        this.recordBookExampleOpen = false;

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

        // Match the quiz header: a single joined module-and-page breadcrumb.
        const crumbX = 32 + navButtons.width + 20;
        const crumbY = 38;
        const crumbHeight = navButtons.height - 10;
        const centerY = crumbY + crumbHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL MATERI OWS", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 48;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Materi MARPOL Annex I", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 22 + chevron.width + 10 + label.width + 26;

        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);

        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        // The chevron glyph's visible mark sits lower than its text bounds.
        // Lift it slightly to align visually with the breadcrumb label.
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

        // Blue banner header — rounded top corners only, so it reads as
        // stitched onto the white body rather than a separate floating bar.
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

        OWS_SIDEBAR_STEPS.forEach((item, index) => {
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

            // Number circles stay solid blue regardless of lock state (matching
            // the reference design) — the unlock gate is enforced on the click
            // handler below, not communicated through a dimmed circle/label.
            // Left-aligned at a fixed X (not centered as a group), with the
            // circle vertically centered against the label's full block.
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
            x: BOARD_X + prevWidth / 2,
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

        const nextWidth = isLast ? 300 : 190;
        const nextButton = new Button(this, {
            x: BOARD_X + BOARD_WIDTH - nextWidth / 2,
            y: navY + buttonHeight / 2,
            width: nextWidth,
            height: buttonHeight,
            text: isLast ? "Mulai Simulator OWS →" : "Selanjutnya →",
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
                setMaterialCompleted();
                this.goTo("SimulatorOws");
            } else {
                this.goToStep(this.step + 1);
            }
        });

        // Backing card for the step label + progress bar, so they don't
        // float directly on the (often busy) background art.
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
                fontFamily: FONT,
                fontStyle: "700",
                fontSize: 14,
                color: DARK_NAVY,
            })
            .setOrigin(0.5);

        // Thin per-step progress bar under the nav row.
        const barY = navY + buttonHeight / 2 + 16;
        const barWidth = 360;
        const barX = BOARD_X + BOARD_WIDTH / 2 - barWidth / 2;
        const segGap = 6;
        const segWidth = (barWidth - segGap * (TOTAL_STEPS - 1)) / TOTAL_STEPS;
        const segments: GameObjects.GameObject[] = [];
        for (let i = 0; i < TOTAL_STEPS; i++) {
            const filled = i < this.step;
            const seg = this.add.graphics();
            seg.fillStyle(filled ? PRIMARY_BLUE : 0xdce6f5, 1);
            seg.fillRoundedRect(barX + i * (segWidth + segGap), barY, segWidth, 6, 3);
            segments.push(seg);
        }

        this.footerContainer.add([prevButton.view, nextButton.view, pillBg, stepLabel, ...segments]);
    }

    // ---- Step transitions -------------------------------------------------------------

    private goToStep(id: number) {
        // Sidebar rows only ever call this with an already-unlocked id (<=
        // maxReachedStep); the "+1" here is what lets the Next button (and
        // Prev/Next in general) advance into a step that becomes newly
        // unlocked by this very move.
        if (id < 1 || id > TOTAL_STEPS || id > this.maxReachedStep + 1) return;
        this.step = id;
        this.renderStep();
    }

    private renderStep() {
        this.maxReachedStep = Math.max(this.maxReachedStep, this.step);
        this.activeMarkerIndex = null;
        this.recordBookExampleOpen = false;

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

    /** Shared "note/warning" card standard: tinted background, full-opacity
     * accent border, and a solid icon badge beside bold accent-colored
     * text — used for every callout box across all 7 materi steps.
     * Returns the box height actually used, so callers can stack content
     * below it. */
    private buildNoteBox(x: number, y: number, width: number, message: string, accent: number, accentHex: string, bg: number, icon: string): number {
        const badgeRadius = 16;
        const paddingX = 24;
        const iconGap = 16;
        const textWidth = width - (paddingX + badgeRadius * 2 + iconGap + paddingX);

        const measure = this.add.text(0, 0, message, {
            fontFamily: FONT, fontStyle: "500", fontSize: 15, lineSpacing: 4, wordWrap: { width: textWidth },
        });
        const textHeight = measure.height;
        measure.destroy();

        const height = Math.max(64, textHeight + 28);
        const box = this.add.graphics();
        box.fillStyle(bg, 1);
        box.fillRoundedRect(x, y, width, height, 14);
        box.lineStyle(2, accent, 1);
        box.strokeRoundedRect(x, y, width, height, 14);

        const badgeCenterX = x + paddingX + badgeRadius;
        const badgeCenterY = y + height / 2;
        const badge = this.add.circle(badgeCenterX, badgeCenterY, badgeRadius, accent, 1);
        const badgeIcon = this.add.text(badgeCenterX, badgeCenterY, icon, { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0.5);
        const text = this.add
            .text(badgeCenterX + badgeRadius + iconGap, badgeCenterY, message, {
                fontFamily: FONT, fontStyle: "500", fontSize: 15, color: accentHex, lineSpacing: 4, wordWrap: { width: textWidth },
            })
            .setOrigin(0, 0.5);

        this.boardContainer.add([box, badge, badgeIcon, text]);
        return height;
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

    // ---- Step 1: Pengertian OWS --------------------------------------------------------

    private buildStep1() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Pengertian Oil Water Separator (OWS)");

        const rowTop = title.y + title.height + 16;
        const paraWidth = 620;
        const para = this.add.text(
            CONTENT_X,
            rowTop,
            "Oil Water Separator (OWS) adalah peralatan di kapal yang digunakan untuk memisahkan minyak dari air got (bilge water) sebelum air tersebut dibuang ke laut.",
            { fontFamily: FONT, fontStyle: "500", fontSize: 16, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: paraWidth } },
        );
        this.boardContainer.add(para);

        const cardsX = CONTENT_X + paraWidth + 32;
        const cardsWidth = CONTENT_WIDTH - paraWidth - 32;
        const cardW = (cardsWidth - 24) / 3;
        const cardH = 140;
        const highlights = [
            { label: "FUNGSI UTAMA", value: "Memisahkan kandungan minyak dari bilge water.", accent: PRIMARY_BLUE, accentHex: PRIMARY_BLUE_HEX, tint: 0xeaf3ff, icon: "⚙️" },
            { label: "TARGET BUANGAN", value: "< 15 PPM", accent: GREEN, accentHex: GREEN_HEX, tint: 0xe3f7ec, icon: "✅" },
            { label: "REGULASI", value: "MARPOL Annex I", accent: AMBER, accentHex: AMBER_HEX, tint: 0xfdecdf, icon: "📄" },
        ];
        highlights.forEach((item, index) => {
            const x = cardsX + index * (cardW + 12);
            const card = this.add.graphics();
            card.fillStyle(item.tint, 1);
            card.fillRoundedRect(x, rowTop, cardW, cardH, 14);
            card.lineStyle(2, item.accent, 1);
            card.strokeRoundedRect(x, rowTop, cardW, cardH, 14);

            const iconSize = 30;
            const iconCenterX = x + 16 + iconSize / 2;
            const iconCenterY = rowTop + 18 + iconSize / 2;
            const iconBadge = this.add.circle(iconCenterX, iconCenterY, iconSize / 2, item.accent, 1);
            const iconText = this.add.text(iconCenterX, iconCenterY, item.icon, { fontFamily: FONT, fontSize: 15 }).setOrigin(0.5);

            const label = this.add
                .text(iconCenterX + iconSize / 2 + 10, iconCenterY, item.label, {
                    fontFamily: FONT,
                    fontStyle: "700",
                    fontSize: 12,
                    color: item.accentHex,
                    wordWrap: { width: cardW - iconSize - 42 },
                })
                .setOrigin(0, 0.5);

            const isBigValue = item.value.length <= 20;
            const value = this.add.text(x + 16, rowTop + 18 + iconSize + 16, item.value, {
                fontFamily: FONT,
                fontStyle: isBigValue ? "800" : "500",
                fontSize: isBigValue ? 20 : 14,
                color: DARK_NAVY,
                wordWrap: { width: cardW - 32 },
                lineSpacing: 4,
            });
            this.boardContainer.add([card, iconBadge, iconText, label, value]);
        });

        const noteY = rowTop + Math.max(para.height, cardH) + 22;
        this.buildNoteBox(
            CONTENT_X, noteY, CONTENT_WIDTH,
            "Air buangan hanya dapat dialirkan ke laut apabila memenuhi persyaratan pembuangan yang berlaku.",
            PRIMARY_BLUE, PRIMARY_BLUE_HEX, SKY, "i",
        );
    }

    // ---- Step 2: Prinsip kerja -----------------------------------------------------------

    private buildStep2() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Prinsip Kerja OWS");

        const nodeCount = OWS_WORK_FLOW.length;
        const arrowWidth = 34;
        const nodeWidth = (CONTENT_WIDTH - arrowWidth * (nodeCount - 1)) / nodeCount;
        const nodeSize = 52;
        // rowTop is the node circles' vertical CENTER, so the gap below the
        // title needs to also clear the circles' own radius above that
        // center — otherwise the circles visually crowd right up against
        // the title text.
        const rowTop = title.y + title.height + 36 + nodeSize / 2;

        OWS_WORK_FLOW.forEach((flow, index) => {
            const x = CONTENT_X + index * (nodeWidth + arrowWidth);
            const centerX = x + nodeWidth / 2;
            const isHighlight = flow.label.includes("15 PPM");

            const circle = this.add.circle(centerX, rowTop, nodeSize / 2, isHighlight ? GREEN : PRIMARY_BLUE, 1);
            const numberText = this.add.text(centerX, rowTop, String(flow.number), { fontFamily: FONT, fontStyle: "600", fontSize: 18, color: "#ffffff" }).setOrigin(0.5);
            const label = this.add
                .text(centerX, rowTop + nodeSize / 2 + 12, flow.label, {
                    fontFamily: FONT,
                    fontStyle: "700",
                    fontSize: 17,
                    color: isHighlight ? GREEN_HEX : DARK_NAVY,
                    align: "center",
                    wordWrap: { width: nodeWidth },
                })
                .setOrigin(0.5, 0);
            const desc = this.add
                .text(centerX, label.y + label.height + 6, flow.description, {
                    fontFamily: FONT,
                    fontStyle: "500",
                    fontSize: 15,
                    color: BODY_TEXT,
                    align: "center",
                    lineSpacing: 2,
                    wordWrap: { width: nodeWidth },
                })
                .setOrigin(0.5, 0);

            this.boardContainer.add([circle, numberText, label, desc]);

            if (index < nodeCount - 1) {
                const arrow = this.add
                    .text(x + nodeWidth + arrowWidth / 2, rowTop, "→", { fontFamily: FONT, fontStyle: "600", fontSize: 22, color: BODY_TEXT })
                    .setOrigin(0.5);
                this.boardContainer.add(arrow);
            }
        });

        const noteY = rowTop + 150;
        this.buildNoteBox(
            CONTENT_X, noteY, CONTENT_WIDTH,
            "Air hanya diarahkan ke overboard apabila Oil Content Monitor membaca kadar minyak di bawah 15 PPM — jika belum, aliran dikembalikan (recirculation).",
            PRIMARY_BLUE, PRIMARY_BLUE_HEX, SKY, "i",
        );
    }

    // ---- Step 3: Komponen utama (markers over the real background) ----------------------

    private buildStep3() {
        // Deliberately no whiteboard card here — the brief asks this step to
        // rely on the real background artwork via markers instead of a big
        // card covering the machinery.
        const pillWidth = 700;
        const pillHeight = 64;
        const pillX = BOARD_X + BOARD_WIDTH / 2 - pillWidth / 2;
        const pillY = 118;
        const pill = this.add.graphics();
        pill.fillStyle(0xffffff, 1);
        pill.fillRoundedRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
        pill.lineStyle(3, PRIMARY_BLUE, 1);
        pill.strokeRoundedRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);

        const iconRadius = 22;
        const iconX = pillX + 12 + iconRadius;
        const iconY = pillY + pillHeight / 2;
        const iconBg = this.add.circle(iconX, iconY, iconRadius, PRIMARY_BLUE, 1);
        const icon = this.add.text(iconX, iconY - 1, "👆", { fontFamily: FONT, fontStyle: "600", fontSize: 22 }).setOrigin(0.5);

        const pillText = this.add
            .text(iconX + iconRadius + 18, iconY, "Klik salah satu komponen pada gambar untuk melihat penjelasannya", {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 17,
                color: PRIMARY_BLUE_HEX,
            })
            .setOrigin(0, 0.5);
        this.boardContainer.add([pill, iconBg, icon, pillText]);

        OWS_COMPONENT_MARKERS.forEach((marker, index) => {
            const x = Math.round(marker.xFrac * DESIGN_WIDTH);
            const y = Math.round(marker.yFrac * DESIGN_HEIGHT);
            const isActive = this.activeMarkerIndex === index;

            const ring = this.add.circle(x, y, 20, isActive ? PRIMARY_BLUE : 0xffffff, isActive ? 0.25 : 0.9);
            ring.setStrokeStyle(3, PRIMARY_BLUE, 1);
            const dot = this.add.circle(x, y, 15, isActive ? PRIMARY_BLUE : 0xffffff, 1);
            dot.setStrokeStyle(2, PRIMARY_BLUE, 1);
            const numberText = this.add
                .text(x, y, marker.number, {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 12,
                    color: isActive ? "#ffffff" : PRIMARY_BLUE_HEX,
                    padding: { top: 4, bottom: 4 },
                })
                .setOrigin(0.5);

            const hit = this.add.circle(x, y, 24, 0xffffff, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.activeMarkerIndex = index;
                this.renderBoard();
            });

            this.boardContainer.add([ring, dot, numberText, hit]);
        });

        if (this.activeMarkerIndex !== null) {
            this.buildMarkerDetailCard(OWS_COMPONENT_MARKERS[this.activeMarkerIndex]);
        }
    }

    private buildMarkerDetailCard(marker: OwsComponentMarker) {
        const anchorX = marker.xFrac * DESIGN_WIDTH;
        const anchorY = marker.yFrac * DESIGN_HEIGHT;
        const cardWidth = 594;
        const textXOffset = 102;
        const textWidth = cardWidth - textXOffset - 24;
        const titleMeasure = this.add.text(0, 0, marker.title, {
            fontFamily: FONT,
            fontStyle: "800",
            fontSize: 24,
            wordWrap: { width: textWidth },
        });
        const roleMeasure = this.add.text(0, 0, marker.role, {
            fontFamily: FONT,
            fontStyle: "500",
            fontSize: 20,
            lineSpacing: 3,
            wordWrap: { width: textWidth },
        });
        const cardHeight = Math.max(132, 24 + titleMeasure.height + 10 + roleMeasure.height + 20);
        titleMeasure.destroy();
        roleMeasure.destroy();
        const offsetX = anchorX < DESIGN_WIDTH / 2 ? 34 : -34 - cardWidth;
        let cardX = anchorX + offsetX;
        let cardY = anchorY - cardHeight / 2;

        cardX = Math.min(Math.max(cardX, BOARD_X), BOARD_X + BOARD_WIDTH - cardWidth);
        cardY = Math.min(Math.max(cardY, 190), FOOTER_TOP - 16 - cardHeight);

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);
        card.fillStyle(PRIMARY_BLUE, 0.2);
        card.fillRoundedRect(cardX, cardY, 88, cardHeight, { tl: 12, tr: 0, br: 0, bl: 12 });
        card.lineStyle(2, PRIMARY_BLUE, 1);
        card.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);

        const numberBadge = this.add.circle(cardX + 44, cardY + cardHeight / 2, 28, PRIMARY_BLUE, 1);
        const numberText = this.add.text(cardX + 44, cardY + cardHeight / 2, marker.number, { fontFamily: FONT, fontStyle: "800", fontSize: 22, color: "#ffffff" }).setOrigin(0.5);
        const textX = cardX + textXOffset;
        const titleText = this.add.text(textX, cardY + 24, marker.title, {
            fontFamily: FONT,
            fontStyle: "800",
            fontSize: 24,
            color: DARK_NAVY,
            wordWrap: { width: textWidth },
        });
        const roleText = this.add.text(textX, titleText.y + titleText.height + 10, marker.role, {
            fontFamily: FONT,
            fontStyle: "500",
            fontSize: 20,
            color: BODY_TEXT,
            lineSpacing: 3,
            wordWrap: { width: textWidth },
        });

        this.boardContainer.add([card, numberBadge, numberText, titleText, roleText]);
    }

    // ---- Step 4: Prosedur operasi ---------------------------------------------------------

    private buildStep4() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Prosedur Dasar Pengoperasian OWS");

        const listTop = title.y + title.height + 16;
        const columns = 2;
        const rows = Math.ceil(OWS_PROCEDURE_STEPS.length / columns);
        const colWidth = (CONTENT_WIDTH - 32) / columns;
        const rowHeight = 40;

        OWS_PROCEDURE_STEPS.forEach((step, index) => {
            const col = Math.floor(index / rows);
            const row = index % rows;
            const x = CONTENT_X + col * (colWidth + 32);
            const y = listTop + row * rowHeight;

            const badge = this.add.circle(x + 14, y + 14, 13, PRIMARY_BLUE, 1);
            const num = this.add
                .text(x + 14, y + 14, String(index + 1).padStart(2, "0"), { fontFamily: FONT, fontStyle: "600", fontSize: 10, color: "#ffffff" })
                .setOrigin(0.5);
            const label = this.add.text(x + 36, y + 4, step, {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 14,
                color: DARK_NAVY,
                wordWrap: { width: colWidth - 36 },
            });
            this.boardContainer.add([badge, num, label]);
        });

        const warnY = listTop + rows * rowHeight + 14;
        this.buildNoteBox(
            CONTENT_X, warnY, CONTENT_WIDTH,
            "Jangan melakukan pembuangan ke laut apabila kondisi sistem atau kadar minyak tidak memenuhi persyaratan.",
            RED, RED_HEX, 0xfceaea, "⚠",
        );
    }

    // ---- Step 5: Batas buangan -------------------------------------------------------------

    private buildStep5() {
        this.addBoardChrome();
        const title = this.addBoardTitle("Batas Kandungan Minyak");

        const rowTop = title.y + title.height + 20;
        const bigNumberWidth = 220;

        const bigNumber = this.add.text(CONTENT_X, rowTop, "≤ 15", { fontFamily: FONT, fontStyle: "600", fontSize: 44, color: GREEN_HEX });
        const bigNumberUnit = this.add.text(CONTENT_X + 4, rowTop + 54, "PPM", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: GREEN_HEX });
        this.boardContainer.add([bigNumber, bigNumberUnit]);

        // Scale bar: 0 → 45 PPM, green up to 15, red beyond.
        const barX = CONTENT_X + bigNumberWidth;
        const barWidth = CONTENT_WIDTH - bigNumberWidth;
        const barY = rowTop + 22;
        const barHeight = 14;
        const safeRatio = 15 / 45;

        const barBg = this.add.graphics();
        barBg.fillStyle(GREEN, 1);
        barBg.fillRoundedRect(barX, barY, barWidth * safeRatio, barHeight, { tl: 7, bl: 7, tr: 0, br: 0 });
        barBg.fillStyle(RED, 1);
        barBg.fillRoundedRect(barX + barWidth * safeRatio, barY, barWidth * (1 - safeRatio), barHeight, { tr: 7, br: 7, tl: 0, bl: 0 });
        this.boardContainer.add(barBg);

        [0, 15, 30, 45].forEach((value) => {
            const x = barX + (value / 45) * barWidth;
            const tick = this.add.rectangle(x, barY + barHeight / 2, 2, barHeight + 10, 0x8fa3c7, 1);
            const label = this.add.text(x, barY + barHeight + 14, String(value), { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: DARK_NAVY }).setOrigin(0.5, 0);
            this.boardContainer.add([tick, label]);
        });

        const safeLabel = this.add
            .text(barX + (barWidth * safeRatio) / 2, barY - 10, "AMAN", { fontFamily: FONT, fontStyle: "600", fontSize: 11, color: GREEN_HEX })
            .setOrigin(0.5, 1);
        const unsafeLabel = this.add
            .text(barX + barWidth * safeRatio + (barWidth * (1 - safeRatio)) / 2, barY - 10, "TIDAK MEMENUHI", { fontFamily: FONT, fontStyle: "600", fontSize: 11, color: RED_HEX })
            .setOrigin(0.5, 1);
        this.boardContainer.add([safeLabel, unsafeLabel]);

        const ocmNoteY = barY + 56;
        const ocmNote = this.add.text(
            CONTENT_X,
            ocmNoteY,
            "Oil Content Monitor (OCM) digunakan untuk memantau kandungan minyak pada air buangan.",
            { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: BODY_TEXT, lineSpacing: 5, wordWrap: { width: CONTENT_WIDTH } },
        );
        this.boardContainer.add(ocmNote);

        const chipsY = ocmNote.y + ocmNote.height + 18;
        const chipGap = 16;
        const chipWidth = (CONTENT_WIDTH - chipGap * (OWS_PPM_SAMPLES.length - 1)) / OWS_PPM_SAMPLES.length;
        const chipHeight = 56;

        OWS_PPM_SAMPLES.forEach((sample, index) => {
            const x = CONTENT_X + index * (chipWidth + chipGap);
            const isOk = sample.verdict === "MEMENUHI";
            const isBorder = sample.verdict === "BATAS";
            const color = isOk ? GREEN : isBorder ? AMBER : RED;
            const colorHex = isOk ? GREEN_HEX : isBorder ? AMBER_HEX : RED_HEX;
            const tint = isOk ? 0xe3f7ec : isBorder ? 0xfdecdf : 0xfceaea;

            const chip = this.add.graphics();
            chip.fillStyle(tint, 1);
            chip.fillRoundedRect(x, chipsY, chipWidth, chipHeight, 10);
            chip.lineStyle(2, color, 1);
            chip.strokeRoundedRect(x, chipsY, chipWidth, chipHeight, 10);
            const ppmText = this.add
                .text(x + chipWidth / 2, chipsY + 18, `${sample.ppm} PPM`, { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: DARK_NAVY })
                .setOrigin(0.5);
            const verdictText = this.add
                .text(x + chipWidth / 2, chipsY + 41, sample.verdict, { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: colorHex })
                .setOrigin(0.5);
            this.boardContainer.add([chip, ppmText, verdictText]);
        });
    }

    // ---- Step 6: Kewajiban pencatatan ------------------------------------------------------

    private buildStep6() {
        this.addBoardChrome();

        if (this.recordBookExampleOpen) {
            this.buildRecordBookExample();
            return;
        }

        const title = this.addBoardTitle("Pencatatan Operasi");
        const rowTop = title.y + title.height + 14;

        const paraWidth = 560;
        const para = this.add.text(
            CONTENT_X,
            rowTop,
            "Aktivitas terkait operasi dan penanganan minyak di kapal harus dicatat sesuai ketentuan yang berlaku pada kapal.",
            { fontFamily: FONT, fontStyle: "700", fontSize: 16, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: paraWidth } },
        );
        this.boardContainer.add(para);

        const bookY = rowTop + para.height + 20;
        const bookWidth = 150;
        const bookHeight = 100;
        const book = this.add.graphics();
        book.fillStyle(PRIMARY_BLUE, 1);
        book.fillRoundedRect(CONTENT_X, bookY, bookWidth, bookHeight, 8);
        book.fillStyle(0xffffff, 1);
        book.fillRect(CONTENT_X + 10, bookY + 10, bookWidth - 20, bookHeight - 20);
        book.lineStyle(2, PRIMARY_BLUE, 1);
        for (let i = 1; i <= 3; i++) {
            book.lineBetween(CONTENT_X + 20, bookY + 10 + i * 16, CONTENT_X + bookWidth - 20, bookY + 10 + i * 16);
        }
        const bookLabel = this.add
            .text(CONTENT_X + bookWidth / 2, bookY + bookHeight + 14, "OIL RECORD BOOK", { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: DARK_NAVY, align: "center" })
            .setOrigin(0.5, 0);
        this.boardContainer.add([book, bookLabel]);

        const exampleButtonY = bookLabel.y + bookLabel.height + 14;
        const exampleButtonWidth = bookWidth + 40;
        const exampleButton = new Button(this, {
            x: CONTENT_X + exampleButtonWidth / 2,
            y: exampleButtonY + 20,
            width: exampleButtonWidth,
            height: 40,
            text: "Lihat Contoh →",
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 16,
            borderRadius: 10,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        exampleButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.recordBookExampleOpen = true;
            this.renderBoard();
        });
        this.boardContainer.add(exampleButton.view);

        const fieldsX = CONTENT_X + paraWidth + 40;
        const fieldsWidth = CONTENT_WIDTH - paraWidth - 40;
        const fieldsHeading = this.add.text(fieldsX, rowTop, "Kategori informasi yang dicatat:", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 16,
            color: PRIMARY_BLUE_HEX,
        });
        this.boardContainer.add(fieldsHeading);

        const fieldRowTop = fieldsHeading.y + fieldsHeading.height + 10;
        const fieldCols = 2;
        const fieldRows = Math.ceil(OWS_RECORD_BOOK_FIELDS.length / fieldCols);
        const fieldColWidth = (fieldsWidth - 20) / fieldCols;
        const fieldRowHeight = 48;

        OWS_RECORD_BOOK_FIELDS.forEach((field, index) => {
            const col = Math.floor(index / fieldRows);
            const row = index % fieldRows;
            const x = fieldsX + col * (fieldColWidth + 20);
            const y = fieldRowTop + row * fieldRowHeight;
            const dot = this.add.circle(x + 5, y + 10, 4, PRIMARY_BLUE, 1);
            const label = this.add.text(x + 18, y, field, {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 16,
                color: DARK_NAVY,
                wordWrap: { width: fieldColWidth - 18 },
            });
            this.boardContainer.add([dot, label]);
        });
    }

    private buildRecordBookExample() {
        const title = this.addBoardTitle("Contoh Oil Record Book (Ilustrasi)");

        const closeButton = new Button(this, {
            x: BOARD_X + BOARD_WIDTH - 60,
            y: BOARD_Y + BOARD_PAD + 10,
            width: 90,
            height: 32,
            text: "✕ Tutup",
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 12,
            borderRadius: 10,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        closeButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.recordBookExampleOpen = false;
            this.renderBoard();
        });
        this.boardContainer.add(closeButton.view);

        const note = this.add.text(CONTENT_X, title.y + title.height + 10, "Data di bawah ini contoh ilustratif, bukan data kapal nyata.", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 16,
            color: BODY_TEXT,
        });
        this.boardContainer.add(note);

        const tableTop = note.y + note.height + 12;
        const colWidths = [190, CONTENT_WIDTH - 190 - 360 - 190, 200, 160];
        const headers = ["Tanggal / Waktu", "Jenis Operasi", "Jumlah / Kondisi", "Petugas"];

        let colX = CONTENT_X;
        headers.forEach((header, index) => {
            const headerText = this.add.text(colX, tableTop, header, { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: PRIMARY_BLUE_HEX });
            this.boardContainer.add(headerText);
            colX += colWidths[index];
        });

        const headerLine = this.add.rectangle(CONTENT_X + CONTENT_WIDTH / 2, tableTop + 28, CONTENT_WIDTH, 2, 0xdce6f5);
        this.boardContainer.add(headerLine);

        let rowY = tableTop + 42;
        OWS_RECORD_BOOK_EXAMPLE.forEach((row) => {
            colX = CONTENT_X;
            const values = [row.tanggal, row.operasi, row.jumlah, row.petugas];
            values.forEach((value, index) => {
                const cell = this.add.text(colX, rowY, value, {
                    fontFamily: FONT,
                    fontStyle: "500",
                    fontSize: 16,
                    color: DARK_NAVY,
                    lineSpacing: 3,
                    wordWrap: { width: colWidths[index] - 12 },
                });
                this.boardContainer.add(cell);
                colX += colWidths[index];
            });
            rowY += 68;
        });
    }

    // ---- Step 7: MARPOL Annex I --------------------------------------------------------------

    private buildStep7() {
        this.addBoardChrome();
        const title = this.addBoardTitle("MARPOL Annex I");

        const rowTop = title.y + title.height + 16;
        const cardGap = 20;
        const cardWidth = (CONTENT_WIDTH - cardGap * (OWS_SUMMARY_CARDS.length - 1)) / OWS_SUMMARY_CARDS.length;
        const cardHeight = 120;

        OWS_SUMMARY_CARDS.forEach((item, index) => {
            const x = CONTENT_X + index * (cardWidth + cardGap);
            const card = this.add.graphics();
            card.fillStyle(SKY, 1);
            card.fillRoundedRect(x, rowTop, cardWidth, cardHeight, 14);
            card.lineStyle(2, PRIMARY_BLUE, 1);
            card.strokeRoundedRect(x, rowTop, cardWidth, cardHeight, 14);
            const titleText = this.add.text(x + 18, rowTop + 16, item.title, { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: PRIMARY_BLUE_HEX });
            const bodyText = this.add.text(x + 18, rowTop + 48, item.body, {
                fontFamily: FONT,
                fontStyle: "700",
                fontSize: 14,
                color: DARK_NAVY,
                lineSpacing: 5,
                wordWrap: { width: cardWidth - 36 },
            });
            this.boardContainer.add([card, titleText, bodyText]);
        });

        const warnY = rowTop + cardHeight + 18;
        this.buildNoteBox(
            CONTENT_X, warnY, CONTENT_WIDTH,
            "INGAT! Operasikan OWS sesuai prosedur, pantau OCM, dan jangan melakukan pembuangan yang tidak memenuhi ketentuan.",
            AMBER, AMBER_HEX, 0xfdf3e7, "⚠",
        );
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
