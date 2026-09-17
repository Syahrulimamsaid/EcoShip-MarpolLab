import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { SopepCaseScore, SopepResultData } from "./SopepSimulatorData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const GREEN_HEX = "#1f8d52";
const SKY = 0xeaf3ff;

const AUDITOR_CHECKLIST = [
    "Identifikasi sumber",
    "Penghentian kebocoran",
    "Pencegahan pencemaran",
    "Penanganan tumpahan",
    "Pengelolaan limbah",
    "Administrasi & pelaporan",
];

function average(scores: SopepCaseScore[], pick: (score: SopepCaseScore) => boolean): number {
    if (scores.length === 0) return 0;
    const correct = scores.filter(pick).length;
    return Math.round((correct / scores.length) * 100);
}

/**
 * SOPEP module's own "Hasil & Umpan Balik" — a per-module results screen
 * (mirrors StabilitasSimulatorResult's role) scored from the 3 emergency-
 * response cases just completed in SopepSimulator. Distinct from the app's
 * final "Kuis Evaluasi Akhir" (HasilUmpanBalik.ts), which is still reachable
 * from here as a secondary path so that existing feature stays intact.
 */
export class SopepHasilUmpanBalik extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];
    private caseScores: SopepCaseScore[] = [];
    private reflectionText = "";
    private reflectionPreview!: GameObjects.Text;

    constructor() {
        super("SopepHasilUmpanBalik");
    }

    init(data: SopepResultData) {
        this.caseScores = data?.caseScores ?? [];
    }

    create() {
        this.background = this.add.image(0, 0, "soped.background");
        this.root = this.add.container(0, 0);
        this.reflectionText = "";

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildContent());
        this.transitionGroups = groups;

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
        const homeHeight = 56;
        const homeBg = this.add.graphics();
        homeBg.fillStyle(0xffffff, 1);
        homeBg.fillRoundedRect(32, 32, homeWidth, homeHeight, homeHeight / 2);
        homeBg.lineStyle(2, BORDER_BLUE, 1);
        homeBg.strokeRoundedRect(32, 32, homeWidth, homeHeight, homeHeight / 2);
        const homeIcon = this.add.text(32 + 26, 32 + homeHeight / 2, "🏠", { fontFamily: FONT, fontSize: 18 }).setOrigin(0.5);
        const homeLabel = this.add.text(32 + 48, 32 + homeHeight / 2, "Beranda", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: PRIMARY_BLUE_HEX }).setOrigin(0, 0.5);
        const homeHit = this.add.rectangle(32 + homeWidth / 2, 32 + homeHeight / 2, homeWidth, homeHeight, 0xffffff, 0).setInteractive({ useHandCursor: true });
        homeHit.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        const crumbX = 32 + homeWidth + 16;
        const centerY = 32 + homeHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL SOPEP", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: "#ffffff" });
        const blueWidth = badgeText.width + 44;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const label = this.add.text(0, 0, "Hasil & Umpan Balik", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 20 + chevron.width + 10 + label.width + 24;

        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, 32, blueWidth + whiteWidth, homeHeight, homeHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, 32, blueWidth, homeHeight, { tl: homeHeight / 2, bl: homeHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, 32, blueWidth + whiteWidth, homeHeight, homeHeight / 2);
        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 20, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        this.root.add([homeBg, homeIcon, homeLabel, homeHit, breadcrumb, badgeText, chevron, label]);
    }

    // ---- Content ------------------------------------------------------------------------

    private buildContent() {
        const panelX = 160;
        const panelY = 120;
        const panelWidth = DESIGN_WIDTH - panelX * 2;
        const panelHeight = 840;
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.97);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
        this.root.add(panel);

        const contentX = panelX + 48;
        const contentWidth = panelWidth - 96;

        const heading = this.add.text(contentX, panelY + 32, "HASIL & UMPAN BALIK", { fontFamily: FONT, fontStyle: "800", fontSize: 28, color: DARK_NAVY });
        this.root.add(heading);

        const identifikasi = average(this.caseScores, (s) => s.identifyFirstTry);
        const tindakan = average(this.caseScores, (s) => s.stopFirstTry);
        const kit = average(this.caseScores, (s) => s.kitOrderCorrect);
        const administrasi = average(this.caseScores, (s) => s.reportSubmitted);
        const overall = Math.round((identifikasi + tindakan + kit + administrasi) / 4);

        const scoreY = heading.y + heading.height + 20;
        const scoreLabel = this.add.text(contentX, scoreY, "SKOR AKURASI", { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: PRIMARY_BLUE_HEX });
        const scoreValue = this.add.text(contentX, scoreY + 22, `${overall} / 100`, { fontFamily: FONT, fontStyle: "800", fontSize: 44, color: GREEN_HEX });
        this.root.add([scoreLabel, scoreValue]);

        const breakdown: [string, number][] = [
            ["Ketepatan Identifikasi", identifikasi],
            ["Ketepatan Tindakan", tindakan],
            ["Penggunaan SOPEP Kit", kit],
            ["Administrasi & Pelaporan", administrasi],
        ];
        const cardGap = 16;
        const cardWidth = (contentWidth - cardGap * 3) / 4;
        const cardY = scoreValue.y + scoreValue.height + 20;
        const cardHeight = 90;
        breakdown.forEach(([label, value], index) => {
            const x = contentX + index * (cardWidth + cardGap);
            const bg = this.add.graphics();
            bg.fillStyle(SKY, 1);
            bg.fillRoundedRect(x, cardY, cardWidth, cardHeight, 12);
            const valueText = this.add.text(x + 16, cardY + 14, `${value}%`, { fontFamily: FONT, fontStyle: "800", fontSize: 22, color: PRIMARY_BLUE_HEX });
            const labelText = this.add.text(x + 16, cardY + 50, label, {
                fontFamily: FONT, fontStyle: "600", fontSize: 12, color: DARK_NAVY, wordWrap: { width: cardWidth - 32 }, lineSpacing: 2,
            });
            this.root.add([bg, valueText, labelText]);
        });

        const checklistY = cardY + cardHeight + 26;
        const checklistTitle = this.add.text(contentX, checklistY, "CHECKLIST AUDITOR", { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: PRIMARY_BLUE_HEX });
        this.root.add(checklistTitle);

        const checklistValues = [identifikasi >= 50, tindakan >= 50, true, kit >= 50, kit >= 50, true];
        const colWidth = contentWidth / 2;
        const rowHeight = 32;
        AUDITOR_CHECKLIST.forEach((label, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = contentX + col * colWidth;
            const y = checklistTitle.y + checklistTitle.height + 12 + row * rowHeight;
            const passed = checklistValues[index];
            const mark = this.add.text(x, y, passed ? "✓" : "○", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: passed ? GREEN_HEX : "#94a3b8" });
            const text = this.add.text(x + 24, y, label, { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: DARK_NAVY });
            this.root.add([mark, text]);
        });

        const reflectionY = checklistTitle.y + checklistTitle.height + 12 + Math.ceil(AUDITOR_CHECKLIST.length / 2) * rowHeight + 24;
        const reflectionTitle = this.add.text(contentX, reflectionY, "REFLEKSI MANDIRI", { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: PRIMARY_BLUE_HEX });
        this.root.add(reflectionTitle);

        const boxY = reflectionTitle.y + reflectionTitle.height + 10;
        const boxHeight = 96;
        const box = this.add.graphics();
        box.fillStyle(SKY, 1);
        box.fillRoundedRect(contentX, boxY, contentWidth, boxHeight, 12);
        box.lineStyle(2, BORDER_BLUE, 1);
        box.strokeRoundedRect(contentX, boxY, contentWidth, boxHeight, 12);
        this.reflectionPreview = this.add.text(contentX + 18, boxY + 16, "Tuliskan hal penting yang kamu pelajari dari simulasi ini...", {
            fontFamily: FONT, fontStyle: "600", fontSize: 14, color: BODY_TEXT, wordWrap: { width: contentWidth - 36 }, lineSpacing: 4,
        });
        const boxHit = this.add.rectangle(contentX + contentWidth / 2, boxY + boxHeight / 2, contentWidth, boxHeight, 0xffffff, 0).setInteractive({ useHandCursor: true });
        boxHit.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            const entered = window.prompt("Tuliskan hal penting yang kamu pelajari dari simulasi ini:", this.reflectionText);
            if (entered !== null) {
                this.reflectionText = entered.trim();
                this.reflectionPreview.setText(this.reflectionText.length > 0 ? this.reflectionText : "Tuliskan hal penting yang kamu pelajari dari simulasi ini...");
                this.reflectionPreview.setColor(this.reflectionText.length > 0 ? DARK_NAVY : BODY_TEXT);
            }
        });
        this.root.add([box, this.reflectionPreview, boxHit]);

        const buttonsY = boxY + boxHeight + 40;
        const repeatButton = new Button(this, {
            x: contentX + 160,
            y: buttonsY,
            width: 280,
            height: 56,
            text: "ULANGI MISI",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 15,
            borderRadius: 28,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        repeatButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("SopepSimulator");
        });

        const finalQuizButton = new Button(this, {
            x: contentX + 160 + 300,
            y: buttonsY,
            width: 320,
            height: 56,
            text: "Lanjut ke Kuis Evaluasi Akhir →",
            fontFamily: FONT,
            fontStyle: "700",
            fontSize: 14,
            borderRadius: 28,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        finalQuizButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("HasilUmpanBalik");
        });

        this.root.add([repeatButton.view, finalQuizButton.view]);
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
