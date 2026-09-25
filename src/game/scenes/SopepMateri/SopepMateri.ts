import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import {
    BODY_TEXT,
    BORDER_BLUE,
    DARK_NAVY,
    PRIMARY_BLUE,
    PRIMARY_BLUE_HEX,
} from "../../../component/ModulePanel/ModulePanel";
import {
    playSceneEnter,
    playSceneExit,
    trackGroup,
} from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx, playVoiceSfx, stopVoiceSfx } from "../../SfxManager";
import {
    SOPEP_LESSONS,
    SOPEP_TRANSITION_CHECKLIST,
    SopepIllustrationKey,
    SopepLesson,
} from "./SopepMateriData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const TOTAL_LESSONS = SOPEP_LESSONS.length;

const HEADER_Y = 32;
const HEADER_HEIGHT = 56;
const BREADCRUMB_Y = 38;
const BREADCRUMB_HEIGHT = HEADER_HEIGHT - 10;
const PANEL_Y = 120;
const FOOTER_TOP = 976;
const PANEL_HEIGHT = FOOTER_TOP - 24 - PANEL_Y;
const PANEL_X = 32;
const PANEL_WIDTH = Math.round(DESIGN_WIDTH * 0.545) - PANEL_X;
const MATERIAL_CARD_WIDTH = DESIGN_WIDTH - PANEL_X * 2;
const PANEL_PAD = 40;
const ILLUSTRATION_X = PANEL_X + PANEL_WIDTH + 40;
const ILLUSTRATION_WIDTH = DESIGN_WIDTH - 32 - ILLUSTRATION_X;

const GREEN_HEX = "#1f8d52";
const PLACEHOLDER_BG = 0xf5f9ff;

/** What image/illustration should be supplied for each lesson's placeholder
 * slot — shown as a caption inside the empty box so the asset's intent is
 * clear before the real artwork is dropped in. */
const SOPEP_ILLUSTRATION_CAPTIONS: Record<SopepIllustrationKey, string> = {
    administrasi:
        "Petugas kapal memeriksa dan mengelola dokumen serta administrasi SOPEP di ruang kerja kapal.",
    dokumen:
        "Susunan dokumen SOPEP, daftar kontak darurat, dan perlengkapan penanggulangan yang tercatat rapi.",
    pelaporan:
        "Proses pelaporan kejadian pencemaran minyak kepada pihak berwenang melalui radio/peta posisi kapal.",
    pencatatan:
        "Pencatatan kegiatan, latihan/drill, dan review berkala pelaksanaan SOPEP di kapal.",
};

/** An entry is added only when its matching `assets/soped/img-*` file exists.
 * Lessons without an entry keep the instructional placeholder card. */
const SOPEP_ILLUSTRATION_TEXTURES: Partial<
    Record<SopepIllustrationKey, string>
> = {
    administrasi: "soped.illustration.administrasi",
    dokumen: "soped.illustration.dokumen",
    pelaporan: "soped.illustration.pelaporan",
    pencatatan: "soped.illustration.pencatatan",
};

/**
 * "Materi Administrasi SOPEP" — a 4-page reading module reached from
 * MainMenu's third card, ending in a transition screen that hands off into
 * SopepSimulator. All 4 pages share one data-driven template
 * (MATERIAL_LESSON_PAGE pattern): layout code lives here, page content
 * lives in SopepMateriData.ts.
 *
 * As with PilahSampahMateri, every slot that would hold an icon or
 * illustration asset is rendered as an empty bordered placeholder container
 * rather than a generated icon — real PNG/SVG assets are meant to be dropped
 * into those slots later without touching this layout code.
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

        playVoiceSfx(this, SFX_KEYS.materiSopep);

        this.events.once("shutdown", () => {
            stopVoiceSfx();
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () =>
            this.scene.start(sceneKey),
        );
    }

    // ---- Header ---------------------------------------------------------------------

    private buildHeader() {
        const navButtons = new HomeBackButtons(this, {
            x: 32,
            y: HEADER_Y,
            size: HEADER_HEIGHT,
            onHome: () => this.goTo("MainMenu"),
        });

        const crumbX = 32 + navButtons.width + 16;
        const crumbHeight = BREADCRUMB_HEIGHT;
        const centerY = BREADCRUMB_Y + crumbHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL MATERI SOPEP", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 15,
            color: "#ffffff",
        });
        const blueWidth = badgeText.width + 44;
        const chevron = this.add.text(0, 0, "›", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 20,
            color: PRIMARY_BLUE_HEX,
        });
        const label = this.add.text(0, 0, "Administrasi SOPEP", {
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 16,
            color: PRIMARY_BLUE_HEX,
        });
        const whiteWidth = 20 + chevron.width + 10 + label.width + 24;

        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(
            crumbX,
            BREADCRUMB_Y,
            blueWidth + whiteWidth,
            crumbHeight,
            crumbHeight / 2,
        );
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(
            crumbX,
            BREADCRUMB_Y,
            blueWidth,
            crumbHeight,
            { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 },
        );
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(
            crumbX,
            BREADCRUMB_Y,
            blueWidth + whiteWidth,
            crumbHeight,
            crumbHeight / 2,
        );

        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 20, centerY).setOrigin(0, 0.5);
        label
            .setPosition(chevron.x + chevron.width + 10, centerY)
            .setOrigin(0, 0.5);

        this.root.add([navButtons.view, breadcrumb, badgeText, chevron, label]);
    }

    // ---- Main content (data-driven "MaterialLessonPage" template) ---------------------

    private renderLesson() {
        this.boardContainer.removeAll(true);
        this.footerContainer.removeAll(true);
        const lesson = SOPEP_LESSONS[this.lessonIndex];
        this.buildLeftPanel(lesson);
        this.buildIllustration(
            lesson.illustration,
            ILLUSTRATION_X,
            PANEL_Y,
            ILLUSTRATION_WIDTH,
            PANEL_HEIGHT,
        );
        this.buildFooter();
    }

    private buildLeftPanel(lesson: SopepLesson) {
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.96);
        panel.fillRoundedRect(
            PANEL_X,
            PANEL_Y,
            MATERIAL_CARD_WIDTH,
            PANEL_HEIGHT,
            24,
        );
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(
            PANEL_X,
            PANEL_Y,
            MATERIAL_CARD_WIDTH,
            PANEL_HEIGHT,
            24,
        );
        this.boardContainer.add(panel);

        const contentX = PANEL_X + PANEL_PAD;
        const contentWidth = PANEL_WIDTH - PANEL_PAD * 2;

        // Pill label: "MATERI PEMBELAJARAN"
        const pillY = PANEL_Y + PANEL_PAD;
        const pillText = this.add.text(0, 0, "MATERI PEMBELAJARAN", {
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 13,
            color: "#ffffff",
        });
        const pillHeight = 36;
        const pillWidth = pillText.width + 40;
        const pill = this.add.graphics();
        pill.fillStyle(PRIMARY_BLUE, 1);
        pill.fillRoundedRect(
            contentX,
            pillY,
            pillWidth,
            pillHeight,
            pillHeight / 2,
        );
        pillText
            .setPosition(contentX + 20, pillY + pillHeight / 2)
            .setOrigin(0, 0.5);
        this.boardContainer.add([pill, pillText]);

        const title = this.add.text(
            contentX,
            pillY + pillHeight + 20,
            lesson.title,
            {
                fontFamily: FONT,
                fontStyle: "800",
                fontSize: 28,
                color: DARK_NAVY,
            },
        );
        const underline = this.add.graphics();
        underline.fillStyle(PRIMARY_BLUE, 1);
        underline.fillRoundedRect(
            contentX,
            title.y + title.height + 8,
            56,
            4,
            2,
        );
        this.boardContainer.add([title, underline]);

        const description = this.add.text(
            contentX,
            title.y + title.height + 8 + 4 + 14,
            lesson.description,
            {
                fontFamily: FONT,
                fontStyle: "500",
                fontSize: 16,
                color: BODY_TEXT,
                lineSpacing: 6,
                wordWrap: { width: contentWidth },
            },
        );
        this.boardContainer.add(description);

        let cardsY = description.y + description.height + 26;
        const cardCount = lesson.infoCards.length;
        const cardGap = 20;
        const cardWidth =
            cardCount === 1 ? contentWidth : (contentWidth - cardGap) / 2;

        lesson.infoCards.forEach((card, index) => {
            const cardX = contentX + index * (cardWidth + cardGap);
            this.buildInfoCard(cardX, cardsY, cardWidth, card);
        });
    }

    private buildInfoCard(
        x: number,
        y: number,
        width: number,
        card: SopepLesson["infoCards"][number],
    ) {
        const lineHeight = card.numbered ? 32 : 0;
        let bodyHeight = 0;
        if (card.body) {
            const measure = this.add.text(0, 0, card.body, {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 15,
                lineSpacing: 6,
                wordWrap: { width: width - 48 },
            });
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

        const heading = this.add
            .text(x + 24, y + 30, card.heading, {
                fontFamily: FONT,
                fontStyle: "700",
                fontSize: 16,
                color: card.accentHex,
                wordWrap: { width: width - 48 },
            })
            .setOrigin(0, 0.5);
        this.boardContainer.add(heading);

        if (card.body) {
            const body = this.add.text(x + 24, y + 62, card.body, {
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 15,
                color: DARK_NAVY,
                lineSpacing: 6,
                wordWrap: { width: width - 48 },
            });
            this.boardContainer.add(body);
        }

        if (card.items) {
            card.items.forEach((item, index) => {
                const itemY = y + 62 + index * lineHeight;
                const badge = this.add.circle(
                    x + 34,
                    itemY + 10,
                    12,
                    card.accent,
                    1,
                );
                const num = this.add
                    .text(x + 34, itemY + 10, String(index + 1), {
                        fontFamily: FONT,
                        fontStyle: "700",
                        fontSize: 11,
                        color: "#ffffff",
                    })
                    .setOrigin(0.5);
                const label = this.add.text(x + 54, itemY, item, {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 14,
                    color: DARK_NAVY,
                    wordWrap: { width: width - 76 },
                });
                this.boardContainer.add([badge, num, label]);
            });
        }
    }

    // ---- Right-side illustration (empty placeholder, asset dropped in later) -----------

    /** Empty rounded-rect placeholder — where a PNG/SVG illustration asset will be
     * dropped in later. Mirrors PilahSampahMateri's addPlaceholderBox, plus an
     * optional centered caption describing what image belongs in the slot so
     * whoever supplies the asset knows what to draw/commission. */
    private addPlaceholderBox(
        x: number,
        y: number,
        width: number,
        height: number,
        radius = 20,
        caption?: string,
    ) {
        const box = this.add.graphics();
        box.fillStyle(PLACEHOLDER_BG, 1);
        box.fillRoundedRect(x, y, width, height, radius);
        box.lineStyle(2, BORDER_BLUE, 1);
        box.strokeRoundedRect(x, y, width, height, radius);
        this.boardContainer.add(box);

        if (caption) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const label = this.add
                .text(centerX, centerY - 14, "ILUSTRASI", {
                    fontFamily: FONT,
                    fontStyle: "700",
                    fontSize: 12,
                    color: PRIMARY_BLUE_HEX,
                    letterSpacing: 1,
                })
                .setOrigin(0.5, 1);
            const captionText = this.add
                .text(centerX, centerY + 6, caption, {
                    fontFamily: FONT,
                    fontStyle: "500",
                    fontSize: 14,
                    color: BODY_TEXT,
                    align: "center",
                    lineSpacing: 4,
                    wordWrap: { width: width - 80 },
                })
                .setOrigin(0.5, 0);
            this.boardContainer.add([label, captionText]);
        }
    }

    /** Dispatch entry point for the per-lesson illustration slot. Every lesson
     * (administrasi, dokumen, pelaporan, pencatatan) currently renders an empty
     * placeholder container with a caption describing what image should go
     * there, so a real per-lesson texture can be swapped in later without
     * touching renderLesson(). */
    private buildIllustration(
        key: SopepIllustrationKey,
        x: number,
        y: number,
        width: number,
        height: number,
    ) {
        const texture = SOPEP_ILLUSTRATION_TEXTURES[key];
        if (texture) {
            const padding = 10;
            const illustration = this.add
                .image(x + width / 2, y + height / 2, texture)
                .setDisplaySize(width - padding * 2, height - padding * 2);
            this.boardContainer.add(illustration);
            return;
        }

        this.addPlaceholderBox(
            x,
            y,
            width,
            height,
            20,
            SOPEP_ILLUSTRATION_CAPTIONS[key],
        );
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

        // Step pill + segmented progress bar, matching the OWS/Pilah Sampah
        // materi footer standard instead of a row of plain dots.
        const pillWidth = 420;
        const pillHeight = 80;
        const pillX = DESIGN_WIDTH / 2 - pillWidth / 2;
        const pillY = navY - 14;
        const pillBg = this.add.graphics();
        pillBg.fillStyle(0xffffff, 1);
        pillBg.fillRoundedRect(pillX, pillY, pillWidth, pillHeight, 16);
        pillBg.lineStyle(2, BORDER_BLUE, 1);
        pillBg.strokeRoundedRect(pillX, pillY, pillWidth, pillHeight, 16);

        const stepLabel = this.add
            .text(
                DESIGN_WIDTH / 2,
                navY + buttonHeight / 2 - 12,
                `STEP ${this.lessonIndex + 1} / ${TOTAL_LESSONS}`,
                {
                    fontFamily: FONT,
                    fontStyle: "700",
                    fontSize: 14,
                    color: DARK_NAVY,
                },
            )
            .setOrigin(0.5);

        const barY = navY + buttonHeight / 2 + 16;
        const barWidth = 360;
        const barX = DESIGN_WIDTH / 2 - barWidth / 2;
        const segGap = 6;
        const segWidth =
            (barWidth - segGap * (TOTAL_LESSONS - 1)) / TOTAL_LESSONS;
        const segments: GameObjects.GameObject[] = [];
        for (let i = 0; i < TOTAL_LESSONS; i++) {
            const filled = i <= this.lessonIndex;
            const seg = this.add.graphics();
            seg.fillStyle(filled ? PRIMARY_BLUE : 0xdce6f5, 1);
            seg.fillRoundedRect(
                barX + i * (segWidth + segGap),
                barY,
                segWidth,
                6,
                3,
            );
            segments.push(seg);
        }

        this.footerContainer.add([
            prevButton.view,
            nextButton.view,
            pillBg,
            stepLabel,
            ...segments,
        ]);
    }

    // ---- Transition modal ("MATERI SELESAI") -------------------------------------------

    private showTransitionModal() {
        const centerX = DESIGN_WIDTH / 2;
        const centerY = DESIGN_HEIGHT / 2;

        const overlay = this.add
            .rectangle(
                centerX,
                centerY,
                DESIGN_WIDTH,
                DESIGN_HEIGHT,
                0x081a33,
                0.5,
            )
            .setInteractive({ useHandCursor: false });
        overlay.on(
            "pointerdown",
            (
                _pointer: Phaser.Input.Pointer,
                _localX: number,
                _localY: number,
                event: Phaser.Types.Input.EventData,
            ) => {
                event.stopPropagation();
            },
        );

        const panelWidth = 720;
        const panelHeight = 520;
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 1);
        panel.fillRoundedRect(
            centerX - panelWidth / 2,
            centerY - panelHeight / 2,
            panelWidth,
            panelHeight,
            24,
        );
        panel.lineStyle(3, PRIMARY_BLUE, 0.5);
        panel.strokeRoundedRect(
            centerX - panelWidth / 2,
            centerY - panelHeight / 2,
            panelWidth,
            panelHeight,
            24,
        );

        const top = centerY - panelHeight / 2;
        const badge = this.add.circle(centerX, top + 60, 40, 0x1f8d52, 1);
        const badgeIcon = this.add
            .text(centerX, top + 60, "✓", {
                fontFamily: FONT,
                fontStyle: "700",
                fontSize: 40,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        const heading = this.add
            .text(centerX, top + 118, "MATERI SELESAI", {
                fontFamily: FONT,
                fontStyle: "800",
                fontSize: 26,
                color: DARK_NAVY,
            })
            .setOrigin(0.5, 0);
        const subheading = this.add
            .text(
                centerX,
                heading.y + heading.height + 8,
                "Sekarang saatnya menerapkan pemahamanmu.",
                {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 15,
                    color: PRIMARY_BLUE_HEX,
                },
            )
            .setOrigin(0.5, 0);
        const body = this.add
            .text(
                centerX,
                subheading.y + subheading.height + 14,
                "Kamu telah mempelajari dokumen, sistem pelaporan, pencatatan, dan review dalam Administrasi SOPEP. Selanjutnya, terapkan pemahaman tersebut dalam simulasi penanganan tumpahan minyak.",
                {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 14,
                    color: BODY_TEXT,
                    align: "center",
                    lineSpacing: 5,
                    wordWrap: { width: panelWidth - 100 },
                },
            )
            .setOrigin(0.5, 0);

        const checklistY = body.y + body.height + 20;
        const checklistItems = SOPEP_TRANSITION_CHECKLIST.map((item, index) => {
            const rowY = checklistY + index * 28;
            const check = this.add.text(
                centerX - panelWidth / 2 + 95,
                rowY,
                "✓",
                {
                    fontFamily: FONT,
                    fontStyle: "700",
                    fontSize: 14,
                    color: GREEN_HEX,
                },
            );
            const label = this.add.text(
                centerX - panelWidth / 2 + 121,
                rowY,
                item,
                {
                    fontFamily: FONT,
                    fontStyle: "600",
                    fontSize: 14,
                    color: DARK_NAVY,
                },
            );
            return [check, label];
        }).flat();

        const buttonsY = top + panelHeight - 100;
        const ctaButton = new Button(this, {
            x: centerX,
            y: buttonsY,
            width: 340,
            height: 56,
            text: "MULAI SIMULASI SOPEP",
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
            .container(0, 0, [
                overlay,
                panel,
                badge,
                badgeIcon,
                heading,
                subheading,
                body,
                ...checklistItems,
                ctaButton.view,
                secondaryButton.view,
            ])
            .setDepth(200);
        this.root.add(modal);
        modal.setAlpha(0);
        modal.setScale(0.94);
        this.tweens.add({
            targets: modal,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 220,
            ease: "Back.Out",
        });
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
