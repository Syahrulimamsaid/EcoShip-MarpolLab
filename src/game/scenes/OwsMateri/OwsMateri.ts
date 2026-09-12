import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { createStepDots } from "../../../component/StepDots/StepDots";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { setMaterialCompleted } from "../../OwsModuleState";
import { MATERIAL_COMPLETION_CHECKLIST, OWS_VALVES } from "./OwsMateriData";

// Authored at a fixed reference resolution and uniformly scaled to fit the
// window, same approach as the other module scenes.
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;
const TOTAL_STEPS = 4;

const CARD_X = MARGIN;
const CARD_Y = 300;
const CARD_WIDTH = DESIGN_WIDTH - MARGIN * 2;
const CARD_HEIGHT = 560;

const CONTENT_X = CARD_X + 40;
const CONTENT_TOP = CARD_Y + 36;
const CONTENT_WIDTH = CARD_WIDTH - 80;

const TEXT_COL_WIDTH = 560;
const ILLU_COL_X = CONTENT_X + TEXT_COL_WIDTH + 40;
const ILLU_COL_WIDTH = CONTENT_WIDTH - TEXT_COL_WIDTH - 40;
const ILLU_COL_CENTER_X = ILLU_COL_X + ILLU_COL_WIDTH / 2;

const GREEN_HEX = "#1f8d52";
const RED_HEX = "#c0392b";
const GREEN = 0x1f8d52;
const RED = 0xc0392b;
const NAVY = 0x143a84;

// Local helper instead of Phaser.Math.DegToRad — this scene only imports
// named values from "phaser", and the ambient global `Phaser` namespace
// that'd need isn't reliably present at runtime here.
const degToRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * The 4-step "Materi OWS" slideshow reached from MainMenu before the new
 * SimulatorOws scene — pure reading material, no gameplay of its own. Step 5
 * (internal only) is the completion summary. Structurally a twin of
 * StabilitasMateri, with far simpler per-step illustrations.
 */
export class OwsMateri extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private bodyContainer!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private step = 1;

    private stepLabelText!: GameObjects.Text;
    private stepDotsGroup!: GameObjects.Container;

    constructor() {
        super("OwsMateri");
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildStepIndicator());
        trackGroup(this.root, groups, () => this.buildCardChrome());

        this.bodyContainer = this.add.container(0, 0);
        this.root.add(this.bodyContainer);
        groups.push([this.bodyContainer]);
        this.transitionGroups = groups;

        this.step = 1;
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

    // ---- Header / chrome ------------------------------------------------------

    private buildHeader() {
        const header = new ModuleHeader(this, {
            x: MARGIN,
            badgeLabel: "MODUL SIMULATOR OWS",
            breadcrumbLabel: "Materi Oily Water Separator",
            heading: "MENGENAL OILY WATER SEPARATOR",
            subtitle: "Pelajari cara kerja OWS dan batas aman MARPOL Annex I sebelum melakukan simulasi.",
            onBack: () => this.goTo("MainMenu"),
        });
        this.root.add(header.view);
    }

    private buildStepIndicator() {
        this.stepLabelText = this.add.text(MARGIN, 262, "MATERI 1 / 4", {
            fontFamily: "Arial Black",
            fontSize: 15,
            color: PRIMARY_BLUE_HEX,
        });
        this.stepDotsGroup = this.add.container(0, 0);
        this.root.add([this.stepLabelText, this.stepDotsGroup]);
    }

    private updateStepIndicator() {
        const visible = this.step <= TOTAL_STEPS;
        this.stepLabelText.setVisible(visible);
        this.stepDotsGroup.setVisible(visible);
        if (!visible) return;

        this.stepLabelText.setText(`MATERI ${this.step} / ${TOTAL_STEPS}`);
        this.stepDotsGroup.removeAll(true);
        this.stepDotsGroup.add(createStepDots(this, MARGIN + 150, 269, TOTAL_STEPS, this.step));
    }

    private buildCardChrome() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 20);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 20);
        this.root.add(card);
    }

    /** Rebuilt every renderStep() (added to bodyContainer, which is fully
     * cleared each time) so the disabled/enabled look and label always
     * match the current step without needing separate enable/disable
     * bookkeeping on persistent objects. */
    private buildNavButtonsForStep() {
        const buttonHeight = 50;
        const navY = CARD_Y + CARD_HEIGHT + 40;
        const atFirst = this.step <= 1;
        const isCompletion = this.step > TOTAL_STEPS;

        const prevWidth = 190;
        const prevButton = new Button(this, {
            x: CARD_X + prevWidth / 2,
            y: navY + buttonHeight / 2,
            width: prevWidth,
            height: buttonHeight,
            text: "← SEBELUMNYA",
            fontSize: 14,
            borderRadius: 12,
            disabled: atFirst,
            fillColor: atFirst ? 0xe2e8f0 : 0xffffff,
            strokeColor: atFirst ? 0xe2e8f0 : PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: atFirst ? "#94a3b8" : PRIMARY_BLUE_HEX,
        });
        prevButton.on("pointerdown", () => this.goPrev());
        this.bodyContainer.add(prevButton.view);

        if (!isCompletion) {
            const nextWidth = 190;
            const nextButton = new Button(this, {
                x: CARD_X + CARD_WIDTH - nextWidth / 2,
                y: navY + buttonHeight / 2,
                width: nextWidth,
                height: buttonHeight,
                text: this.step === TOTAL_STEPS ? "LIHAT RINGKASAN →" : "SELANJUTNYA →",
                fontSize: 14,
                borderRadius: 12,
                fillColor: PRIMARY_BLUE,
                strokeAlpha: 0,
                textColor: "#ffffff",
            });
            nextButton.on("pointerdown", () => this.goNext());
            this.bodyContainer.add(nextButton.view);
        }
    }

    private goPrev() {
        if (this.step <= 1) return;
        playSfx(this, SFX_KEYS.click);
        this.step -= 1;
        this.renderStep();
    }

    private goNext() {
        if (this.step > TOTAL_STEPS) return;
        playSfx(this, SFX_KEYS.click);
        this.step += 1;
        this.renderStep();
    }

    private renderStep() {
        this.bodyContainer.removeAll(true);
        this.updateStepIndicator();

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
            default:
                this.buildCompletion();
                break;
        }

        this.buildNavButtonsForStep();
    }

    private addStepTitle(text: string): GameObjects.Text {
        const title = this.add.text(CONTENT_X, CONTENT_TOP, text, {
            fontFamily: "Arial Black",
            fontSize: 22,
            color: DARK_NAVY,
        });
        this.bodyContainer.add(title);
        return title;
    }

    // ---- Step 1: Apa itu OWS ----------------------------------------------------

    private buildStep1() {
        const title = this.addStepTitle("APA ITU OILY WATER SEPARATOR (OWS)?");

        const body = this.add.text(
            CONTENT_X,
            title.y + title.height + 20,
            "OWS adalah peralatan di kamar mesin yang memisahkan minyak dari air got (bilge water) sebelum air tersebut boleh dibuang ke laut, memanfaatkan perbedaan berat jenis antara minyak dan air.",
            {
                fontFamily: "Arial",
                fontSize: 15,
                color: BODY_TEXT,
                lineSpacing: 6,
                wordWrap: { width: TEXT_COL_WIDTH },
            },
        );
        this.bodyContainer.add(body);

        const calloutY = body.y + body.height + 24;
        const calloutHeight = 90;
        const callout = this.add.graphics();
        callout.fillStyle(0xeaf1fd, 1);
        callout.fillRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        callout.lineStyle(2, PRIMARY_BLUE, 0.5);
        callout.strokeRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        const calloutTitle = this.add.text(CONTENT_X + 18, calloutY + 16, "Kenapa penting?", {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: PRIMARY_BLUE_HEX,
        });
        const calloutBody = this.add.text(
            CONTENT_X + 18,
            calloutY + 38,
            "Tanpa OWS, air got yang tercampur minyak dari kamar mesin akan mencemari laut setiap kali dipompa keluar.",
            { fontFamily: "Arial", fontSize: 13, color: DARK_NAVY, wordWrap: { width: TEXT_COL_WIDTH - 36 } },
        );
        this.bodyContainer.add([callout, calloutTitle, calloutBody]);

        this.drawTankIllustration();
    }

    private drawTankIllustration() {
        const cx = ILLU_COL_CENTER_X;
        const tankWidth = Math.min(ILLU_COL_WIDTH - 60, 220);
        const tankHeight = 260;
        const tankTop = CARD_Y + 90;
        const tankBottom = tankTop + tankHeight;

        const g = this.add.graphics();
        // Tank body.
        g.fillStyle(0xf1f5fb, 1);
        g.fillRoundedRect(cx - tankWidth / 2, tankTop, tankWidth, tankHeight, 16);
        // Water layer (bottom).
        g.fillStyle(0x9fc6f0, 0.9);
        g.fillRoundedRect(cx - tankWidth / 2 + 6, tankTop + tankHeight * 0.35, tankWidth - 12, tankHeight * 0.65 - 6, { tl: 4, tr: 4, bl: 12, br: 12 });
        // Oil layer (floats on top of the water).
        g.fillStyle(0xd9a441, 0.9);
        g.fillRoundedRect(cx - tankWidth / 2 + 6, tankTop + tankHeight * 0.2, tankWidth - 12, tankHeight * 0.16, 6);
        g.lineStyle(3, PRIMARY_BLUE, 0.9);
        g.strokeRoundedRect(cx - tankWidth / 2, tankTop, tankWidth, tankHeight, 16);
        this.bodyContainer.add(g);

        const label = this.add.text(cx, tankTop + tankHeight * 0.1, "OWS", { fontFamily: "Arial Black", fontSize: 16, color: DARK_NAVY }).setOrigin(0.5);
        this.bodyContainer.add(label);

        // Inlet arrow (left, dirty water in).
        const arrowY = tankTop + tankHeight * 0.75;
        const inArrow = this.add.graphics();
        inArrow.lineStyle(4, RED, 1);
        inArrow.lineBetween(cx - tankWidth / 2 - 70, arrowY, cx - tankWidth / 2 - 10, arrowY);
        inArrow.fillStyle(RED, 1);
        inArrow.fillTriangle(cx - tankWidth / 2 - 4, arrowY, cx - tankWidth / 2 - 18, arrowY - 8, cx - tankWidth / 2 - 18, arrowY + 8);
        this.bodyContainer.add(inArrow);
        const inLabel = this.add
            .text(cx - tankWidth / 2 - 40, arrowY - 22, "Air Got\nKotor", { fontFamily: "Arial", fontSize: 11, color: RED_HEX, align: "center" })
            .setOrigin(0.5);
        this.bodyContainer.add(inLabel);

        // Outlet arrow (right, clean water out).
        const outArrow = this.add.graphics();
        outArrow.lineStyle(4, GREEN, 1);
        outArrow.lineBetween(cx + tankWidth / 2 + 10, arrowY, cx + tankWidth / 2 + 70, arrowY);
        outArrow.fillStyle(GREEN, 1);
        outArrow.fillTriangle(cx + tankWidth / 2 + 76, arrowY, cx + tankWidth / 2 + 62, arrowY - 8, cx + tankWidth / 2 + 62, arrowY + 8);
        this.bodyContainer.add(outArrow);
        const outLabel = this.add
            .text(cx + tankWidth / 2 + 42, arrowY - 22, "Air\nBersih", { fontFamily: "Arial", fontSize: 11, color: GREEN_HEX, align: "center" })
            .setOrigin(0.5);
        this.bodyContainer.add(outLabel);

        const legend = this.add.text(cx, tankBottom + 34, "🟤 Lapisan minyak mengapung di atas air", {
            fontFamily: "Arial",
            fontSize: 12,
            color: BODY_TEXT,
        }).setOrigin(0.5);
        this.bodyContainer.add(legend);
    }

    // ---- Step 2: OCM & batas 15 PPM ---------------------------------------------

    private buildStep2() {
        const title = this.addStepTitle("OIL CONTENT MONITOR (OCM) & BATAS 15 PPM");

        const body = this.add.text(
            CONTENT_X,
            title.y + title.height + 20,
            "MARPOL Annex I mewajibkan air buangan got memiliki kadar minyak di bawah 15 PPM (part per million). Oil Content Monitor (OCM) membaca kadar ini secara terus-menerus selama proses filtrasi.",
            { fontFamily: "Arial", fontSize: 15, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: TEXT_COL_WIDTH } },
        );
        this.bodyContainer.add(body);

        const calloutY = body.y + body.height + 24;
        const calloutHeight = 90;
        const callout = this.add.graphics();
        callout.fillStyle(0xfdf3e7, 1);
        callout.fillRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        callout.lineStyle(2, 0xe0792e, 0.6);
        callout.strokeRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        const calloutTitle = this.add.text(CONTENT_X + 18, calloutY + 16, "Aturan emasnya:", {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: "#b5651d",
        });
        const calloutBody = this.add.text(CONTENT_X + 18, calloutY + 38, "Selama OCM membaca ≥ 15 PPM, katup buang ke laut wajib tetap tertutup.", {
            fontFamily: "Arial",
            fontSize: 13,
            color: DARK_NAVY,
            wordWrap: { width: TEXT_COL_WIDTH - 36 },
        });
        this.bodyContainer.add([callout, calloutTitle, calloutBody]);

        this.drawGaugeIllustration();
    }

    private drawGaugeIllustration() {
        const cx = ILLU_COL_CENTER_X;
        const cy = CARD_Y + 260;
        const radius = 120;

        const g = this.add.graphics();
        // Danger band (right half, ≥15 PPM) then safe band (left half, <15 PPM).
        g.lineStyle(24, RED, 1);
        g.beginPath();
        g.arc(cx, cy, radius, degToRad(-180), degToRad(-20), false);
        g.strokePath();
        g.lineStyle(24, GREEN, 1);
        g.beginPath();
        g.arc(cx, cy, radius, degToRad(-20), degToRad(0), false);
        g.strokePath();
        this.bodyContainer.add(g);

        // Needle pointing into the danger zone (illustrating the "before
        // filtration" reading of 45 PPM the simulator starts at).
        const needleAngle = degToRad(-95);
        const needle = this.add.graphics();
        needle.lineStyle(5, NAVY, 1);
        needle.lineBetween(cx, cy, cx + Math.cos(needleAngle) * (radius - 30), cy + Math.sin(needleAngle) * (radius - 30));
        needle.fillStyle(NAVY, 1);
        needle.fillCircle(cx, cy, 9);
        this.bodyContainer.add(needle);

        const label = this.add.text(cx, cy + 40, "OCM", { fontFamily: "Arial Black", fontSize: 15, color: DARK_NAVY }).setOrigin(0.5);
        const ppmLow = this.add.text(cx - radius + 10, cy + 8, "< 15 PPM\nAMAN", { fontFamily: "Arial Black", fontSize: 11, color: GREEN_HEX, align: "center" }).setOrigin(0.5);
        const ppmHigh = this.add.text(cx + radius - 10, cy + 8, "≥ 15 PPM\nTIDAK AMAN", { fontFamily: "Arial Black", fontSize: 11, color: RED_HEX, align: "center" }).setOrigin(0.5);
        this.bodyContainer.add([label, ppmLow, ppmHigh]);
    }

    // ---- Step 3: Mengenal 3 katup ------------------------------------------------

    private buildStep3() {
        const title = this.addStepTitle("MENGENAL 3 KATUP OWS");

        const body = this.add.text(
            CONTENT_X,
            title.y + title.height + 20,
            "Simulator OWS akan melibatkan tiga katup. Kenali fungsi masing-masing sebelum mencoba menurunkan kadar minyak di bawah batas aman.",
            { fontFamily: "Arial", fontSize: 15, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: TEXT_COL_WIDTH } },
        );
        this.bodyContainer.add(body);

        let rowY = body.y + body.height + 30;
        OWS_VALVES.forEach((valve) => {
            const wheel = this.add.graphics();
            wheel.fillStyle(valve.color, 1);
            wheel.fillCircle(CONTENT_X + 22, rowY + 14, 20);
            wheel.lineStyle(4, 0xffffff, 1);
            wheel.lineBetween(CONTENT_X + 22 - 12, rowY + 14, CONTENT_X + 22 + 12, rowY + 14);
            wheel.lineBetween(CONTENT_X + 22, rowY + 14 - 12, CONTENT_X + 22, rowY + 14 + 12);
            this.bodyContainer.add(wheel);

            const label = this.add.text(CONTENT_X + 56, rowY, valve.label, { fontFamily: "Arial Black", fontSize: 14, color: DARK_NAVY });
            const role = this.add.text(CONTENT_X + 56, rowY + 20, valve.role, {
                fontFamily: "Arial",
                fontSize: 12,
                color: BODY_TEXT,
                lineSpacing: 3,
                wordWrap: { width: TEXT_COL_WIDTH - 56 },
            });
            this.bodyContainer.add([label, role]);

            rowY = role.y + role.height + 22;
        });

        this.drawValveTrio();
    }

    private drawValveTrio() {
        const cx = ILLU_COL_CENTER_X;
        const top = CARD_Y + 90;
        const gap = 130;

        OWS_VALVES.forEach((valve, index) => {
            const y = top + index * gap;
            const wheel = this.add.graphics();
            wheel.fillStyle(0xffffff, 1);
            wheel.fillCircle(cx, y, 44);
            wheel.lineStyle(6, valve.color, 1);
            wheel.strokeCircle(cx, y, 44);
            wheel.fillStyle(valve.color, 1);
            wheel.fillCircle(cx, y, 30);
            wheel.lineStyle(5, 0xffffff, 1);
            wheel.lineBetween(cx - 18, y, cx + 18, y);
            wheel.lineBetween(cx, y - 18, cx, y + 18);
            this.bodyContainer.add(wheel);

            const numberLabel = this.add
                .text(cx, y + 62, `KATUP ${valve.number}`, { fontFamily: "Arial Black", fontSize: 12, color: DARK_NAVY })
                .setOrigin(0.5);
            this.bodyContainer.add(numberLabel);
        });
    }

    // ---- Step 4: Bahaya katup bypass ---------------------------------------------

    private buildStep4() {
        const title = this.addStepTitle("BAHAYA KATUP BYPASS");

        const body = this.add.text(
            CONTENT_X,
            title.y + title.height + 20,
            "Katup Bypass melewati proses filtrasi sepenuhnya. Membukanya berarti air got yang masih kotor langsung terbuang ke laut — pelanggaran serius terhadap MARPOL Annex I.",
            { fontFamily: "Arial", fontSize: 15, color: BODY_TEXT, lineSpacing: 6, wordWrap: { width: TEXT_COL_WIDTH } },
        );
        this.bodyContainer.add(body);

        const calloutY = body.y + body.height + 24;
        const calloutHeight = 90;
        const callout = this.add.graphics();
        callout.fillStyle(0xfceaea, 1);
        callout.fillRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        callout.lineStyle(2, RED, 0.6);
        callout.strokeRoundedRect(CONTENT_X, calloutY, TEXT_COL_WIDTH, calloutHeight, 14);
        const calloutTitle = this.add.text(CONTENT_X + 18, calloutY + 16, "Ingat di simulator:", {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: RED_HEX,
        });
        const calloutBody = this.add.text(CONTENT_X + 18, calloutY + 38, "Jangan pernah membuka Katup 3 (Bypass) — itu langsung dianggap misi gagal.", {
            fontFamily: "Arial",
            fontSize: 13,
            color: DARK_NAVY,
            wordWrap: { width: TEXT_COL_WIDTH - 36 },
        });
        this.bodyContainer.add([callout, calloutTitle, calloutBody]);

        this.drawBypassWarning();
    }

    private drawBypassWarning() {
        const cx = ILLU_COL_CENTER_X;
        const cy = CARD_Y + 220;

        const wheel = this.add.graphics();
        wheel.fillStyle(0xffffff, 1);
        wheel.fillCircle(cx, cy, 54);
        wheel.lineStyle(7, 0x2f68d8, 1);
        wheel.strokeCircle(cx, cy, 54);
        wheel.fillStyle(0x2f68d8, 1);
        wheel.fillCircle(cx, cy, 38);
        wheel.lineStyle(6, 0xffffff, 1);
        wheel.lineBetween(cx - 22, cy, cx + 22, cy);
        wheel.lineBetween(cx, cy - 22, cx, cy + 22);
        this.bodyContainer.add(wheel);

        // Prohibition slash over the valve.
        const slash = this.add.graphics();
        slash.lineStyle(10, RED, 0.9);
        slash.strokeCircle(cx, cy, 70);
        slash.lineBetween(cx - 49, cy - 49, cx + 49, cy + 49);
        this.bodyContainer.add(slash);

        const label = this.add
            .text(cx, cy + 100, "KATUP 3 — BYPASS\nJANGAN DIBUKA", { fontFamily: "Arial Black", fontSize: 14, color: RED_HEX, align: "center" })
            .setOrigin(0.5);
        this.bodyContainer.add(label);
    }

    // ---- Completion ---------------------------------------------------------------

    private buildCompletion() {
        const centerX = CARD_X + CARD_WIDTH / 2;
        const icon = this.add.text(centerX, CARD_Y + 60, "✓", { fontFamily: "Arial Black", fontSize: 52, color: GREEN_HEX }).setOrigin(0.5);
        const title = this.add
            .text(centerX, CARD_Y + 130, "MATERI SELESAI", { fontFamily: "Arial Black", fontSize: 26, color: GREEN_HEX })
            .setOrigin(0.5);
        const subtitle = this.add
            .text(centerX, CARD_Y + 168, "Anda telah mempelajari dasar-dasar Oily Water Separator dan MARPOL Annex I.", {
                fontFamily: "Arial",
                fontSize: 14,
                color: BODY_TEXT,
            })
            .setOrigin(0.5);
        this.bodyContainer.add([icon, title, subtitle]);

        const listTop = CARD_Y + 210;
        const rowHeight = 30;
        MATERIAL_COMPLETION_CHECKLIST.forEach((item, index) => {
            const rowY = listTop + index * rowHeight;
            const check = this.add.text(centerX - 190, rowY, "✓", { fontFamily: "Arial Black", fontSize: 14, color: GREEN_HEX });
            const label = this.add.text(centerX - 160, rowY, item, { fontFamily: "Arial", fontSize: 14, color: DARK_NAVY });
            this.bodyContainer.add([check, label]);
        });

        const buttonWidth = 260;
        const buttonHeight = 52;
        const buttonY = listTop + MATERIAL_COMPLETION_CHECKLIST.length * rowHeight + 26;
        const button = new Button(this, {
            x: centerX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            text: "PILIH AKTIVITAS →",
            fontSize: 15,
            borderRadius: 14,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        button.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            setMaterialCompleted();
            this.goTo("PilihAktivitasOws");
        });
        this.bodyContainer.add(button.view);
    }

    // ---- Layout -------------------------------------------------------------------

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
