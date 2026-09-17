import { GameObjects, Scale, Scene } from "phaser";

import { BgmToggleButton } from "../../../component/Button/BgmToggleButton";
import { Button } from "../../../component/Button/Button";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { createStepDots } from "../../../component/StepDots/StepDots";
import { isBgmEnabled, toggleBgm } from "../../BgmManager";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { SOPEP_LESSONS, SOPEP_TRANSITION_CHECKLIST, SopepIllustrationKey, SopepLesson } from "./SopepMateriData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const TOTAL_LESSONS = SOPEP_LESSONS.length;

const HEADER_Y = 32;
const HEADER_HEIGHT = 56;
const PANEL_Y = 120;
const FOOTER_TOP = 976;
const PANEL_HEIGHT = FOOTER_TOP - 24 - PANEL_Y;
const PANEL_X = 32;
const PANEL_WIDTH = Math.round(DESIGN_WIDTH * 0.545) - PANEL_X;
const PANEL_PAD = 40;
const ILLUSTRATION_X = PANEL_X + PANEL_WIDTH + 40;
const ILLUSTRATION_WIDTH = DESIGN_WIDTH - 32 - ILLUSTRATION_X;

const GREEN_HEX = "#1f8d52";

/**
 * "Materi Administrasi SOPEP" — a 4-page reading module reached from
 * MainMenu's third card, ending in a transition screen that hands off into
 * SopepSimulator. All 4 pages share one data-driven template
 * (MATERIAL_LESSON_PAGE pattern): layout code lives here, page content
 * lives in SopepMateriData.ts.
 */
export class SopepMateri extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private boardContainer!: GameObjects.Container;
    private footerContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private lessonIndex = 0;

    constructor() {
        super("SopepMateri");
    }

    create() {
        this.background = this.add.image(0, 0, "soped.background");
        this.root = this.add.container(0, 0);
        this.lessonIndex = 0;

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());

        this.boardContainer = this.add.container(0, 0);
        this.root.add(this.boardContainer);
        groups.push([this.boardContainer]);

        this.footerContainer = this.add.container(0, 0);
        this.root.add(this.footerContainer);
        groups.push([this.footerContainer]);

        this.transitionGroups = groups;

        this.renderLesson();

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
        const homeWidth = 150;
        const homeHeight = HEADER_HEIGHT;
        const homeBg = this.add.graphics();
        homeBg.fillStyle(0xffffff, 1);
        homeBg.fillRoundedRect(32, HEADER_Y, homeWidth, homeHeight, homeHeight / 2);
        homeBg.lineStyle(2, BORDER_BLUE, 1);
        homeBg.strokeRoundedRect(32, HEADER_Y, homeWidth, homeHeight, homeHeight / 2);
        const homeIcon = this.add.text(32 + 26, HEADER_Y + homeHeight / 2, "🏠", { fontFamily: FONT, fontSize: 18 }).setOrigin(0.5);
        const homeLabel = this.add
            .text(32 + 48, HEADER_Y + homeHeight / 2, "Beranda", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: PRIMARY_BLUE_HEX })
            .setOrigin(0, 0.5);
        const homeHit = this.add.rectangle(32 + homeWidth / 2, HEADER_Y + homeHeight / 2, homeWidth, homeHeight, 0xffffff, 0).setInteractive({ useHandCursor: true });
        homeHit.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        const crumbX = 32 + homeWidth + 16;
        const crumbHeight = HEADER_HEIGHT;
        const centerY = HEADER_Y + crumbHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL MATERI SOPEP", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: "#ffffff" });
        const blueWidth = badgeText.width + 44;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Administrasi SOPEP", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 20 + chevron.width + 10 + label.width + 24;

        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, HEADER_Y, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, HEADER_Y, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, HEADER_Y, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);

        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 20, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        // Right side: BGM toggle + a decorative settings icon (no settings
        // panel exists in this project yet — kept as a visual placeholder
        // matching the reference header).
        const iconSize = HEADER_HEIGHT;
        let rightX = DESIGN_WIDTH - 32 - iconSize / 2;

        const settingsBg = this.add.circle(rightX, centerY, iconSize / 2, 0xffffff, 1);
        settingsBg.setStrokeStyle(2, BORDER_BLUE, 1);
        const settingsIcon = this.add.text(rightX, centerY, "⚙️", { fontFamily: FONT, fontSize: 20 }).setOrigin(0.5);
        const settingsHit = this.add.circle(rightX, centerY, iconSize / 2, 0xffffff, 0).setInteractive({ useHandCursor: true });
        settingsHit.on("pointerdown", () => playSfx(this, SFX_KEYS.click));

        rightX -= iconSize + 16;
        const bgmToggle = new BgmToggleButton(this, {
            x: rightX,
            y: centerY,
            height: 40,
            initialEnabled: isBgmEnabled(),
            onToggle: () => {
                playSfx(this, SFX_KEYS.click);
                return toggleBgm();
            },
        });

        this.root.add([homeBg, homeIcon, homeLabel, homeHit, breadcrumb, badgeText, chevron, label, settingsBg, settingsIcon, settingsHit, bgmToggle.view]);
    }

    // ---- Main content (data-driven "MaterialLessonPage" template) ---------------------

    private renderLesson() {
        this.boardContainer.removeAll(true);
        this.footerContainer.removeAll(true);
        const lesson = SOPEP_LESSONS[this.lessonIndex];
        this.buildLeftPanel(lesson);
        this.buildIllustration(lesson.illustration, ILLUSTRATION_X, PANEL_Y, ILLUSTRATION_WIDTH, PANEL_HEIGHT);
        this.buildFooter();
    }

    private buildLeftPanel(lesson: SopepLesson) {
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.96);
        panel.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 24);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 24);
        this.boardContainer.add(panel);

        const contentX = PANEL_X + PANEL_PAD;
        const contentWidth = PANEL_WIDTH - PANEL_PAD * 2;

        // Pill label: "📖 MATERI PEMBELAJARAN"
        const pillY = PANEL_Y + PANEL_PAD;
        const pillText = this.add.text(0, 0, "MATERI PEMBELAJARAN", { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#ffffff" });
        const pillHeight = 36;
        const pillWidth = 34 + pillText.width + 20;
        const pill = this.add.graphics();
        pill.fillStyle(PRIMARY_BLUE, 1);
        pill.fillRoundedRect(contentX, pillY, pillWidth, pillHeight, pillHeight / 2);
        const pillIcon = this.add.text(contentX + 20, pillY + pillHeight / 2, "📖", { fontFamily: FONT, fontSize: 15 }).setOrigin(0.5);
        pillText.setPosition(contentX + 36, pillY + pillHeight / 2).setOrigin(0, 0.5);
        this.boardContainer.add([pill, pillIcon, pillText]);

        const title = this.add.text(contentX, pillY + pillHeight + 20, lesson.title, {
            fontFamily: FONT, fontStyle: "700", fontSize: 40, color: DARK_NAVY,
        });
        this.boardContainer.add(title);

        const underline = this.add.rectangle(contentX, title.y + title.height + 14, 64, 6, PRIMARY_BLUE, 1).setOrigin(0, 0.5);
        underline.setDisplaySize(64, 6);
        this.boardContainer.add(underline);

        const description = this.add.text(contentX, underline.y + 22, lesson.description, {
            fontFamily: FONT, fontStyle: "600", fontSize: 16, color: BODY_TEXT, lineSpacing: 7,
            wordWrap: { width: contentWidth },
        });
        this.boardContainer.add(description);

        let cardsY = description.y + description.height + 26;
        const cardCount = lesson.infoCards.length;
        const cardGap = 20;
        const cardWidth = cardCount === 1 ? contentWidth : (contentWidth - cardGap) / 2;

        lesson.infoCards.forEach((card, index) => {
            const cardX = contentX + index * (cardWidth + cardGap);
            this.buildInfoCard(cardX, cardsY, cardWidth, card);
        });
    }

    private buildInfoCard(x: number, y: number, width: number, card: SopepLesson["infoCards"][number]) {
        const lineHeight = card.numbered ? 32 : 0;
        let bodyHeight = 0;
        if (card.body) {
            const measure = this.add.text(0, 0, card.body, { fontFamily: FONT, fontStyle: "600", fontSize: 15, lineSpacing: 6, wordWrap: { width: width - 48 } });
            bodyHeight = measure.height;
            measure.destroy();
        }
        const height = card.items
            ? 56 + card.items.length * lineHeight + 16
            : 70 + bodyHeight + 20;

        const bg = this.add.graphics();
        bg.fillStyle(card.bg, 1);
        bg.fillRoundedRect(x, y, width, height, 16);
        bg.lineStyle(2, card.accent, 0.4);
        bg.strokeRoundedRect(x, y, width, height, 16);
        this.boardContainer.add(bg);

        const headingIcon = this.add.circle(x + 30, y + 30, 16, card.accent, 1);
        const headingIconText = this.add.text(x + 30, y + 30, card.headingIcon, { fontFamily: FONT, fontSize: 15 }).setOrigin(0.5);
        const heading = this.add.text(x + 54, y + 30, card.heading, {
            fontFamily: FONT, fontStyle: "700", fontSize: 16, color: card.accentHex,
            wordWrap: { width: width - 70 },
        }).setOrigin(0, 0.5);
        this.boardContainer.add([headingIcon, headingIconText, heading]);

        if (card.body) {
            const body = this.add.text(x + 24, y + 62, card.body, {
                fontFamily: FONT, fontStyle: "600", fontSize: 15, color: DARK_NAVY, lineSpacing: 6,
                wordWrap: { width: width - 48 },
            });
            this.boardContainer.add(body);
        }

        if (card.items) {
            card.items.forEach((item, index) => {
                const itemY = y + 62 + index * lineHeight;
                const badge = this.add.circle(x + 34, itemY + 10, 12, card.accent, 1);
                const num = this.add.text(x + 34, itemY + 10, String(index + 1), { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: "#ffffff" }).setOrigin(0.5);
                const label = this.add.text(x + 54, itemY, item, {
                    fontFamily: FONT, fontStyle: "600", fontSize: 14, color: DARK_NAVY,
                    wordWrap: { width: width - 76 },
                });
                this.boardContainer.add([badge, num, label]);
            });
        }
    }

    // ---- Right-side illustrations (flat vector, data-keyed) ----------------------------

    private buildIllustration(key: SopepIllustrationKey, x: number, y: number, width: number, height: number) {
        switch (key) {
            case "administrasi":
                this.buildAdministrasiIllustration(x, y, width, height);
                break;
            case "dokumen":
                this.buildDokumenIllustration(x, y, width, height);
                break;
            case "pelaporan":
                this.buildPelaporanIllustration(x, y, width, height);
                break;
            default:
                this.buildPencatatanIllustration(x, y, width, height);
                break;
        }
    }

    private buildBigBinder(x: number, y: number, width: number, height: number, lines: string[]) {
        const binder = this.add.graphics();
        binder.fillStyle(PRIMARY_BLUE, 1);
        binder.fillRoundedRect(x, y, width, height, 14);
        binder.fillStyle(0x1d4fb0, 1);
        binder.fillRoundedRect(x, y, 16, height, { tl: 14, bl: 14, tr: 0, br: 0 });
        const ship = this.add.text(x + width / 2, y + height * 0.6, "🚢", { fontFamily: FONT, fontSize: Math.min(48, width * 0.22) }).setOrigin(0.5);
        const texts = lines.map((line, index) =>
            this.add
                .text(x + width / 2, y + 34 + index * 26, line, {
                    fontFamily: FONT, fontStyle: index === 0 ? "800" : "600", fontSize: index === 0 ? 20 : 12, color: "#ffffff",
                    align: "center", wordWrap: { width: width - 24 },
                })
                .setOrigin(0.5, 0),
        );
        this.boardContainer.add([binder, ship, ...texts]);
    }

    private buildBinderStack(x: number, y: number, width: number, rowHeight: number, labels: string[]) {
        const items: GameObjects.GameObject[] = [];
        labels.forEach((label, index) => {
            const rowY = y + index * (rowHeight + 8);
            const bg = this.add.graphics();
            bg.fillStyle(0xffffff, 1);
            bg.fillRoundedRect(x, rowY, width, rowHeight, 8);
            bg.lineStyle(2, PRIMARY_BLUE, 0.5);
            bg.strokeRoundedRect(x, rowY, width, rowHeight, 8);
            const dot = this.add.circle(x + width - 22, rowY + rowHeight / 2, 8, PRIMARY_BLUE, 1);
            const text = this.add.text(x + 16, rowY + rowHeight / 2, label, {
                fontFamily: FONT, fontStyle: "700", fontSize: 13, color: DARK_NAVY,
            }).setOrigin(0, 0.5);
            items.push(bg, dot, text);
        });
        this.boardContainer.add(items);
        return y + labels.length * (rowHeight + 8);
    }

    private buildAdministrasiIllustration(x: number, y: number, width: number, height: number) {
        const binderWidth = width * 0.42;
        const binderHeight = height * 0.5;
        const binderY = y + height * 0.12;
        this.buildBigBinder(x, binderY, binderWidth, binderHeight, ["SOPEP", "SHIPBOARD OIL POLLUTION", "EMERGENCY PLAN"]);

        const stackX = x + binderWidth + 24;
        const stackWidth = width - binderWidth - 24;
        this.buildBinderStack(stackX, binderY + 10, stackWidth, 44, ["REPORT", "DRILL RECORD", "EQUIPMENT LOG", "CORRESPONDENCE"]);

        const propsY = binderY + binderHeight + 40;
        const props = [
            { icon: "📻", label: "Radio" },
            { icon: "🖊️", label: "Pena" },
            { icon: "🗺️", label: "Peta Laut" },
            { icon: "🧢", label: "Topi Perwira" },
        ];
        const propGap = width / props.length;
        props.forEach((prop, index) => {
            const centerX = x + propGap * index + propGap / 2;
            const circle = this.add.circle(centerX, propsY + 40, 40, 0xffffff, 1);
            circle.setStrokeStyle(2, PRIMARY_BLUE, 0.4);
            const icon = this.add.text(centerX, propsY + 40, prop.icon, { fontFamily: FONT, fontSize: 32 }).setOrigin(0.5);
            const label = this.add.text(centerX, propsY + 88, prop.label, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: DARK_NAVY }).setOrigin(0.5, 0);
            this.boardContainer.add([circle, icon, label]);
        });
    }

    private buildDokumenIllustration(x: number, y: number, width: number, height: number) {
        const binderWidth = width * 0.4;
        const binderHeight = height * 0.44;
        const binderY = y + height * 0.08;
        this.buildBigBinder(x, binderY, binderWidth, binderHeight, ["SOPEP"]);

        const stackX = x + binderWidth + 24;
        const stackWidth = width - binderWidth - 24;
        this.buildBinderStack(stackX, binderY + 10, stackWidth, 44, ["SOPEP", "CREW LIST", "EQUIPMENT LIST", "EMERGENCY PROCEDURE"]);

        const docY = binderY + binderHeight + 36;
        const docWidth = width * 0.62;
        const docHeight = 130;
        const doc = this.add.graphics();
        doc.fillStyle(0xffffff, 1);
        doc.fillRoundedRect(x, docY, docWidth, docHeight, 10);
        doc.lineStyle(2, PRIMARY_BLUE, 0.5);
        doc.strokeRoundedRect(x, docY, docWidth, docHeight, 10);
        const docTitle = this.add.text(x + 18, docY + 16, "EMERGENCY CONTACT LIST", { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: PRIMARY_BLUE_HEX });
        const docLines = [1, 2, 3].map((n) => this.add.rectangle(x + 18 + 90, docY + 16 + 22 * n + 10, docWidth - 36 - 90, 4, 0xdce6f5, 1).setOrigin(0, 0.5));
        this.boardContainer.add([doc, docTitle, ...docLines]);

        const pen = this.add.text(x + docWidth + 30, docY + docHeight / 2, "🖊️", { fontFamily: FONT, fontSize: 40 }).setOrigin(0.5);
        this.boardContainer.add(pen);
    }

    private buildClipboard(x: number, y: number, width: number, height: number, heading: string, fields: string[]) {
        const board = this.add.graphics();
        board.fillStyle(0xffffff, 1);
        board.fillRoundedRect(x, y, width, height, 14);
        board.lineStyle(2, PRIMARY_BLUE, 0.5);
        board.strokeRoundedRect(x, y, width, height, 14);
        const clip = this.add.rectangle(x + width / 2, y, 60, 20, PRIMARY_BLUE, 1).setOrigin(0.5);
        const headingText = this.add.text(x + width / 2, y + 26, heading, {
            fontFamily: FONT, fontStyle: "800", fontSize: 15, color: DARK_NAVY, align: "center", wordWrap: { width: width - 30 },
        }).setOrigin(0.5, 0);
        const items: GameObjects.GameObject[] = [board, clip, headingText];
        const fieldTop = headingText.y + headingText.height + 16;
        const rowHeight = (height - (fieldTop - y) - 16) / fields.length;
        fields.forEach((field, index) => {
            const rowY = fieldTop + index * rowHeight;
            const label = this.add.text(x + 18, rowY, field, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: BODY_TEXT });
            const line = this.add.rectangle(x + 18, rowY + 18, width - 36, 2, 0xdce6f5, 1).setOrigin(0, 0.5);
            items.push(label, line);
        });
        this.boardContainer.add(items);
    }

    private buildPelaporanIllustration(x: number, y: number, width: number, height: number) {
        const clipboardWidth = width * 0.6;
        const clipboardHeight = height * 0.62;
        this.buildClipboard(x, y + 20, clipboardWidth, clipboardHeight, "OIL POLLUTION REPORT", [
            "Date & Time", "Position", "Type of Incident", "Estimated Quantity", "Action Taken", "Assistance Needed",
        ]);

        const sideX = x + clipboardWidth + 26;
        const sideWidth = width - clipboardWidth - 26;
        const radio = this.add.text(sideX + sideWidth / 2, y + 70, "📻", { fontFamily: FONT, fontSize: 44 }).setOrigin(0.5);
        const monitor = this.add.text(sideX + sideWidth / 2, y + 160, "🗺️", { fontFamily: FONT, fontSize: 44 }).setOrigin(0.5);
        const pen = this.add.text(sideX + sideWidth / 2, y + 250, "🖊️", { fontFamily: FONT, fontSize: 40 }).setOrigin(0.5);
        this.boardContainer.add([radio, monitor, pen]);

        const signY = y + clipboardHeight + 46;
        const signWidth = width * 0.7;
        const sign = this.add.graphics();
        sign.fillStyle(0x1f8d52, 1);
        sign.fillRoundedRect(x, signY, signWidth, 60, 10);
        const signText1 = this.add.text(x + 18, signY + 14, "REPORT EARLY", { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: "#ffffff" });
        const signText2 = this.add.text(x + 18, signY + 34, "PREVENT FURTHER POLLUTION", { fontFamily: FONT, fontStyle: "600", fontSize: 11, color: "#e4f7ec" });
        this.boardContainer.add([sign, signText1, signText2]);
    }

    private buildPencatatanIllustration(x: number, y: number, width: number, height: number) {
        const clipboardWidth = width * 0.52;
        const clipboardHeight = height * 0.5;
        this.buildClipboard(x, y + 10, clipboardWidth, clipboardHeight, "SOPEP RECORD", ["Date", "Activity", "Remarks"]);

        const stackX = x + clipboardWidth + 24;
        const stackWidth = width - clipboardWidth - 24;
        this.buildBinderStack(stackX, y + 20, stackWidth, 44, ["DRILL RECORD", "INSPECTION LOG", "INCIDENT REPORT", "REVIEW & UPDATE"]);

        const propsY = y + clipboardHeight + 40;
        const pen = this.add.text(x + 60, propsY + 30, "🖊️", { fontFamily: FONT, fontSize: 40 }).setOrigin(0.5);
        const mugCircle = this.add.circle(x + 170, propsY + 30, 34, 0xffffff, 1);
        mugCircle.setStrokeStyle(2, PRIMARY_BLUE, 0.4);
        const mug = this.add.text(x + 170, propsY + 30, "☕", { fontFamily: FONT, fontSize: 30 }).setOrigin(0.5);
        this.boardContainer.add([pen, mugCircle, mug]);
    }

    // ---- Footer nav -------------------------------------------------------------------

    private buildFooter() {
        const navY = FOOTER_TOP + 20;
        const buttonHeight = 56;
        const atFirst = this.lessonIndex <= 0;
        const isLast = this.lessonIndex >= TOTAL_LESSONS - 1;

        const prevWidth = 190;
        const prevButton = new Button(this, {
            x: PANEL_X + prevWidth / 2,
            y: navY + buttonHeight / 2,
            width: prevWidth,
            height: buttonHeight,
            text: "← Sebelumnya",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
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
                this.lessonIndex--;
                this.renderLesson();
            });
        }

        const nextWidth = isLast ? 220 : 200;
        const nextButton = new Button(this, {
            x: DESIGN_WIDTH - 32 - nextWidth / 2,
            y: navY + buttonHeight / 2,
            width: nextWidth,
            height: buttonHeight,
            text: isLast ? "Selesai ✓" : "Selanjutnya →",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: buttonHeight / 2,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        nextButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            if (isLast) {
                this.showTransitionModal();
            } else {
                this.lessonIndex++;
                this.renderLesson();
            }
        });

        const dotsY = navY + buttonHeight / 2 - 10;
        const dots = createStepDots(this, DESIGN_WIDTH / 2 - ((TOTAL_LESSONS - 1) * 22) / 2, dotsY, TOTAL_LESSONS, this.lessonIndex + 1);
        const fraction = this.add
            .text(DESIGN_WIDTH / 2, dotsY + 24, `${this.lessonIndex + 1} / ${TOTAL_LESSONS}`, {
                fontFamily: FONT, fontStyle: "700", fontSize: 14, color: DARK_NAVY,
            })
            .setOrigin(0.5, 0);

        this.footerContainer.add([prevButton.view, nextButton.view, ...dots, fraction]);
    }

    // ---- Transition modal ("MATERI SELESAI") -------------------------------------------

    private showTransitionModal() {
        const centerX = DESIGN_WIDTH / 2;
        const centerY = DESIGN_HEIGHT / 2;

        const overlay = this.add
            .rectangle(centerX, centerY, DESIGN_WIDTH, DESIGN_HEIGHT, 0x081a33, 0.5)
            .setInteractive({ useHandCursor: false });
        overlay.on(
            "pointerdown",
            (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
            },
        );

        const panelWidth = 720;
        const panelHeight = 520;
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 1);
        panel.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 24);
        panel.lineStyle(3, PRIMARY_BLUE, 0.5);
        panel.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 24);

        const top = centerY - panelHeight / 2;
        const badge = this.add.circle(centerX, top + 60, 40, 0x1f8d52, 1);
        const badgeIcon = this.add.text(centerX, top + 60, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 40, color: "#ffffff" }).setOrigin(0.5);

        const heading = this.add.text(centerX, top + 118, "MATERI SELESAI", { fontFamily: FONT, fontStyle: "800", fontSize: 26, color: DARK_NAVY }).setOrigin(0.5, 0);
        const subheading = this.add
            .text(centerX, heading.y + heading.height + 8, "Sekarang saatnya menerapkan pemahamanmu.", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: PRIMARY_BLUE_HEX })
            .setOrigin(0.5, 0);
        const body = this.add
            .text(
                centerX,
                subheading.y + subheading.height + 14,
                "Kamu telah mempelajari dokumen, sistem pelaporan, pencatatan, dan review dalam Administrasi SOPEP. Selanjutnya, terapkan pemahaman tersebut dalam simulasi penanganan tumpahan minyak.",
                { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: BODY_TEXT, align: "center", lineSpacing: 5, wordWrap: { width: panelWidth - 100 } },
            )
            .setOrigin(0.5, 0);

        const checklistY = body.y + body.height + 20;
        const checklistItems = SOPEP_TRANSITION_CHECKLIST.map((item, index) => {
            const rowY = checklistY + index * 28;
            const check = this.add.text(centerX - panelWidth / 2 + 70, rowY, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: GREEN_HEX });
            const label = this.add.text(centerX - panelWidth / 2 + 96, rowY, item, { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: DARK_NAVY });
            return [check, label];
        }).flat();

        const buttonsY = top + panelHeight - 100;
        const ctaButton = new Button(this, {
            x: centerX,
            y: buttonsY,
            width: 340,
            height: 56,
            text: "MULAI SIMULASI SOPEP →",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 16,
            borderRadius: 28,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        ctaButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("SopepSimulator");
        });

        const secondaryButton = new Button(this, {
            x: centerX,
            y: buttonsY + 66,
            width: 260,
            height: 46,
            text: "PELAJARI KEMBALI",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 14,
            borderRadius: 23,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        secondaryButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            modal.destroy();
            this.lessonIndex = 0;
            this.renderLesson();
        });

        const modal = this.add
            .container(0, 0, [overlay, panel, badge, badgeIcon, heading, subheading, body, ...checklistItems, ctaButton.view, secondaryButton.view])
            .setDepth(200);
        this.root.add(modal);
        modal.setAlpha(0);
        modal.setScale(0.94);
        this.tweens.add({ targets: modal, alpha: 1, scaleX: 1, scaleY: 1, duration: 220, ease: "Back.Out" });
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
