import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { SOPEP_RESULT_CHECKLIST, SopepMissionResult } from "./SopepSimulatorData";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const GREEN_HEX = "#1f8d52";
const SKY = 0xeaf3ff;

/**
 * SOPEP module's own "Hasil & Umpan Balik" — a per-module results screen
 * (mirrors StabilitasSimulatorResult's role) scored from the single oil-
 * spill-response mission just completed in SopepSimulator. Distinct from the
 * app's final "Kuis Evaluasi Akhir" (HasilUmpanBalik.ts), which is still
 * reachable from here as a secondary path so that existing feature stays
 * intact.
 */
export class SopepHasilUmpanBalik extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];
    private result: SopepMissionResult = { mistakeCount: 0, stepsCompleted: 0, totalSteps: 5, accuracyPercent: 100 };
    private reflectionText = "";
    private reflectionPreview!: GameObjects.Text;

    constructor() {
        super("SopepHasilUmpanBalik");
    }

    init(data: SopepMissionResult) {
        this.result = data ?? { mistakeCount: 0, stepsCompleted: 0, totalSteps: 5, accuracyPercent: 100 };
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
        const homeHeight = 56;
        const navButtons = new HomeBackButtons(this, {
            x: 32,
            y: 32,
            size: homeHeight,
            onHome: () => this.goTo("MainMenu"),
            onBack: () => this.goTo("SopepSimulator"),
        });

        const crumbX = 32 + navButtons.width + 16;
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

        this.root.add([navButtons.view, breadcrumb, badgeText, chevron, label]);
    }

    // ---- Content ------------------------------------------------------------------------

    private buildContent() {
        const panelX = 160;
        const panelY = 120;
        const panelWidth = DESIGN_WIDTH - panelX * 2;
        const panelHeight = 820;
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.97);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
        panel.lineStyle(2, BORDER_BLUE, 1);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
        this.root.add(panel);

        const contentX = panelX + 48;
        const contentWidth = panelWidth - 96;

        const heading = this.add.text(contentX, panelY + 28, "MISI SELESAI", { fontFamily: FONT, fontStyle: "800", fontSize: 28, color: DARK_NAVY });
        const subheading = this.add.text(contentX, heading.y + heading.height + 4, "SIMULASI PENANGANAN TUMPAHAN MINYAK", {
            fontFamily: FONT, fontStyle: "700", fontSize: 15, color: PRIMARY_BLUE_HEX,
        });
        this.root.add([heading, subheading]);

        // ---- Stat row: AKURASI PROSEDUR / KESALAHAN / LANGKAH SELESAI ----
        const stats: [string, string][] = [
            ["AKURASI PROSEDUR", `${this.result.accuracyPercent}%`],
            ["KESALAHAN", `${this.result.mistakeCount}`],
            ["LANGKAH SELESAI", `${this.result.stepsCompleted}/${this.result.totalSteps}`],
        ];
        const statGap = 16;
        const statWidth = (contentWidth - statGap * 2) / 3;
        const statY = subheading.y + subheading.height + 18;
        const statHeight = 84;
        stats.forEach(([label, value], index) => {
            const x = contentX + index * (statWidth + statGap);
            const bg = this.add.graphics();
            bg.fillStyle(SKY, 1);
            bg.fillRoundedRect(x, statY, statWidth, statHeight, 12);
            const valueText = this.add.text(x + 18, statY + 14, value, { fontFamily: FONT, fontStyle: "800", fontSize: 26, color: PRIMARY_BLUE_HEX });
            const labelText = this.add.text(x + 18, statY + 52, label, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: DARK_NAVY });
            this.root.add([bg, valueText, labelText]);
        });

        // ---- 8-item completion checklist (Section N) — always shown done,
        // since this is a linear completion screen, not per-item pass/fail. ----
        const checklistY = statY + statHeight + 24;
        const checklistTitle = this.add.text(contentX, checklistY, "CHECKLIST MISI", { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: PRIMARY_BLUE_HEX });
        this.root.add(checklistTitle);

        const colWidth = contentWidth / 2;
        const rowHeight = 30;
        SOPEP_RESULT_CHECKLIST.forEach((label, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = contentX + col * colWidth;
            const y = checklistTitle.y + checklistTitle.height + 12 + row * rowHeight;
            const mark = this.add.text(x, y, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 15, color: GREEN_HEX });
            const text = this.add.text(x + 24, y, label, { fontFamily: FONT, fontStyle: "600", fontSize: 14, color: DARK_NAVY });
            this.root.add([mark, text]);
        });

        const feedbackY = checklistTitle.y + checklistTitle.height + 12 + Math.ceil(SOPEP_RESULT_CHECKLIST.length / 2) * rowHeight + 10;
        const feedbackText = this.add.text(contentX, feedbackY, "Penanganan tumpahan telah dilakukan sesuai urutan prosedur simulasi SOPEP.", {
            fontFamily: FONT, fontStyle: "500", fontSize: 14, color: BODY_TEXT, wordWrap: { width: contentWidth }, lineSpacing: 4,
        });
        this.root.add(feedbackText);

        const reflectionY = feedbackText.y + feedbackText.height + 20;
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
