import { GameObjects, Scale, Scene } from "phaser";

import { BgmToggleButton } from "../../../component/Button/BgmToggleButton";
import { Button } from "../../../component/Button/Button";
import { BODY_TEXT, BORDER_BLUE, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { isBgmEnabled, toggleBgm } from "../../BgmManager";
import { EventBus } from "../../EventBus";
import { setSimulatorProgress } from "../../OwsModuleState";
import { SFX_KEYS, playSfx } from "../../SfxManager";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;

const TIME_LIMIT_SECONDS = 150; // "02:30"
const START_PPM = 45;
const TARGET_PPM = 15;
const PPM_FLOOR = 8;
const PPM_STEP_PER_TICK = 3;
// Raw screen pixels — a real swipe, not a tap, per the brief's "sapuan"
// requirement. Measured in screen space (not design space) since it's only
// ever compared to itself, so container scale doesn't matter.
const SWIPE_THRESHOLD_PX = 24;

const RED = 0xc0392b;
const GREEN = 0x1f8d52;
const AMBER = 0xe0792e;
const BLUE = 0x2f68d8;
const RED_HEX = "#c0392b";
const GREEN_HEX = "#1f8d52";
const AMBER_HEX = "#e0792e";
const NAVY_HEX = "#143a84";

type Phase = "playing" | "success" | "failed";

/**
 * The reference-brief time-attack simulator: bring the Oil Content Monitor
 * (OCM) reading from 45 PPM to below the MARPOL Annex I discharge limit (15
 * PPM) before the clock runs out, by swiping Katup 1 (inlet) open — while
 * never swiping Katup 3 (bypass) open, which dumps unfiltered water
 * overboard and instantly fails the mission. Katup 2 (outlet) is never
 * player-controlled: it only opens automatically once the follow-up
 * OwsQuiz scene is passed.
 *
 * All chrome is hand-drawn with Graphics/Text (no image assets), matching
 * the rest of this codebase's recently-established convention.
 */
export class SimulatorOws extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    private bgmToggleButton!: BgmToggleButton;

    private katup1Open = false;
    private katup3Open = false;
    private ppm = START_PPM;
    private timeRemaining = TIME_LIMIT_SECONDS;
    private phase: Phase = "playing";
    private failReason = "";
    private tickEvent: Phaser.Time.TimerEvent | null = null;

    private pendingValve: 1 | 3 | null = null;
    private pendingStartX = 0;
    private pendingStartY = 0;

    private valve1Wheel!: GameObjects.Graphics;
    private valve3Wheel!: GameObjects.Graphics;
    private valve1StateText!: GameObjects.Text;
    private valve3StateText!: GameObjects.Text;
    private ocmValueText!: GameObjects.Text;
    private ocmPanelBg!: GameObjects.Graphics;
    private ocmLights: GameObjects.Arc[] = [];
    private timeValueText!: GameObjects.Text;
    private timeBarFill!: GameObjects.Graphics;
    private overlayContainer: GameObjects.Container | null = null;

    constructor() {
        super("SimulatorOws");
    }

    create() {
        this.background = this.add.image(0, 0, "ows.background");
        this.root = this.add.container(0, 0);

        this.resetGameState();

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildTopBar());
        trackGroup(this.root, groups, () => this.buildInstructionPanel());
        trackGroup(this.root, groups, () => this.buildTimerAndTarget());
        trackGroup(this.root, groups, () => this.buildTankIllustration());
        trackGroup(this.root, groups, () => this.buildOcmPanel());
        trackGroup(this.root, groups, () => this.buildHintCards());
        trackGroup(this.root, groups, () => this.buildResetButton());
        this.transitionGroups = groups;

        this.startTicking();
        this.refreshHud();

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        this.input.on("pointerup", this.handlePointerUp, this);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
            this.input.off("pointerup", this.handlePointerUp, this);
            this.tickEvent?.remove(false);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        this.tickEvent?.remove(false);
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    private resetGameState() {
        this.katup1Open = false;
        this.katup3Open = false;
        this.ppm = START_PPM;
        this.timeRemaining = TIME_LIMIT_SECONDS;
        this.phase = "playing";
        this.failReason = "";
        this.pendingValve = null;
    }

    // ---- Tick loop --------------------------------------------------------------

    private startTicking() {
        this.tickEvent?.remove(false);
        this.tickEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this.onTick(),
        });
    }

    private onTick() {
        if (this.phase !== "playing") return;

        this.timeRemaining = Math.max(0, this.timeRemaining - 1);

        if (this.katup1Open && !this.katup3Open) {
            this.ppm = Math.max(PPM_FLOOR, this.ppm - PPM_STEP_PER_TICK);
        }

        if (this.ppm < TARGET_PPM) {
            this.handleSuccess();
            return;
        }

        if (this.timeRemaining <= 0) {
            this.handleFailure("Waktu habis sebelum kadar minyak turun di bawah 15 PPM.");
            return;
        }

        this.refreshHud();
    }

    private handleSuccess() {
        this.phase = "success";
        this.tickEvent?.remove(false);
        setSimulatorProgress(true);
        playSfx(this, SFX_KEYS.quizCorrect);
        this.refreshHud();
        this.flashOcmBorder(GREEN);

        this.time.delayedCall(900, () => this.goTo("OwsQuiz"));
    }

    private handleFailure(reason: string) {
        this.phase = "failed";
        this.failReason = reason;
        this.tickEvent?.remove(false);
        setSimulatorProgress(false);
        playSfx(this, SFX_KEYS.quizWrong);
        this.refreshHud();
        this.showFailOverlay();
    }

    // ---- Valve interaction (swipe) ------------------------------------------------

    private registerValveHitArea(x: number, y: number, radius: number, valve: 1 | 3) {
        const hit = this.add
            .circle(x, y, radius, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
        hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.phase !== "playing") return;
            this.pendingValve = valve;
            this.pendingStartX = pointer.x;
            this.pendingStartY = pointer.y;
        });
        return hit;
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        if (this.pendingValve === null || this.phase !== "playing") {
            this.pendingValve = null;
            return;
        }

        const dx = pointer.x - this.pendingStartX;
        const dy = pointer.y - this.pendingStartY;
        const distance = Math.hypot(dx, dy);
        const valve = this.pendingValve;
        this.pendingValve = null;

        if (distance < SWIPE_THRESHOLD_PX) return;

        this.toggleValve(valve);
    }

    private toggleValve(valve: 1 | 3) {
        playSfx(this, SFX_KEYS.click);

        if (valve === 1) {
            this.katup1Open = !this.katup1Open;
            this.animateWheel(this.valve1Wheel, this.katup1Open);
        } else {
            this.katup3Open = !this.katup3Open;
            this.animateWheel(this.valve3Wheel, this.katup3Open);

            if (this.katup3Open) {
                this.handleFailure("Katup Bypass dibuka — air got yang belum tersaring bocor langsung ke laut!");
                return;
            }
        }

        this.refreshHud();
    }

    private animateWheel(wheel: GameObjects.Graphics, open: boolean) {
        this.tweens.add({
            targets: wheel,
            angle: open ? 90 : 0,
            duration: 260,
            ease: "Back.Out",
        });
    }

    // ---- Top bar (compact — not ModuleHeader, the tank illustration needs the
    // vertical room ModuleHeader's heading+subtitle block would otherwise eat) ----

    private buildTopBar() {
        const iconSize = 52;
        const iconY = MARGIN + iconSize / 2;

        const homeBtn = this.buildIconButton(MARGIN + iconSize / 2, iconY, iconSize, "⌂", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        const backX = MARGIN + iconSize + 10 + iconSize / 2;
        const backBtn = this.buildIconButton(backX, iconY, iconSize, "‹", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("PilihAktivitasOws");
        });

        const badgeX = backX + iconSize / 2 + 16;
        const badgeText = this.add.text(0, 0, "Simulator OWS", {
            fontFamily: "Arial Black",
            fontSize: 16,
            color: "#ffffff",
        });
        const badgeSubtext = this.add.text(0, 0, "MARPOL Annex I", {
            fontFamily: "Arial",
            fontSize: 11,
            color: "#dce9ff",
        });
        const badgeWidth = Math.max(badgeText.width, badgeSubtext.width) + 32;
        const badgeHeight = iconSize;
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(PRIMARY_BLUE, 1);
        badgeBg.fillRoundedRect(badgeX, iconY - badgeHeight / 2, badgeWidth, badgeHeight, 14);
        badgeText.setPosition(badgeX + 16, iconY - 15);
        badgeSubtext.setPosition(badgeX + 16, iconY + 4);

        // Top-right controls: Panduan / sound / settings.
        const rightIconY = iconY;
        const settingsX = DESIGN_WIDTH - MARGIN - iconSize / 2;
        const settingsBtn = this.buildIconButton(settingsX, rightIconY, iconSize, "⚙", () => playSfx(this, SFX_KEYS.click));

        this.bgmToggleButton = new BgmToggleButton(this, {
            x: settingsX - iconSize / 2 - 10 - 0,
            y: rightIconY,
            height: 44,
            initialEnabled: isBgmEnabled(),
            onToggle: () => {
                playSfx(this, SFX_KEYS.click);
                return toggleBgm();
            },
        });
        // Position now that the component knows its own width.
        this.bgmToggleButton.setPosition(settingsX - iconSize / 2 - 10 - this.bgmToggleButton.width / 2, rightIconY);

        const panduanText = this.add.text(0, 0, "Panduan", { fontFamily: "Arial Black", fontSize: 14, color: PRIMARY_BLUE_HEX });
        const panduanWidth = panduanText.width + 56;
        const panduanCenterX = this.bgmToggleButton.view.x - this.bgmToggleButton.width / 2 - 10 - panduanWidth / 2;
        const panduanBg = this.add.graphics();
        panduanBg.fillStyle(0xffffff, 1);
        panduanBg.fillRoundedRect(panduanCenterX - panduanWidth / 2, rightIconY - iconSize / 2, panduanWidth, iconSize, iconSize / 2);
        panduanBg.lineStyle(2, BORDER_BLUE, 1);
        panduanBg.strokeRoundedRect(panduanCenterX - panduanWidth / 2, rightIconY - iconSize / 2, panduanWidth, iconSize, iconSize / 2);
        const infoBadge = this.add.graphics();
        infoBadge.fillStyle(PRIMARY_BLUE, 1);
        infoBadge.fillCircle(panduanCenterX - panduanWidth / 2 + 26, rightIconY, 13);
        const infoI = this.add.text(panduanCenterX - panduanWidth / 2 + 26, rightIconY, "i", { fontFamily: "Arial Black", fontSize: 14, color: "#ffffff" }).setOrigin(0.5);
        panduanText.setPosition(panduanCenterX - panduanWidth / 2 + 46, rightIconY - panduanText.height / 2);

        this.root.add([
            homeBtn,
            backBtn,
            badgeBg,
            badgeText,
            badgeSubtext,
            panduanBg,
            infoBadge,
            infoI,
            panduanText,
            settingsBtn,
            this.bgmToggleButton.view,
        ]);
    }

    private buildIconButton(x: number, y: number, size: number, glyph: string, onClick: () => void): GameObjects.Container {
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
        bg.lineStyle(2, BORDER_BLUE, 1);
        bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        const label = this.add.text(0, -2, glyph, { fontFamily: "Arial Black", fontSize: 22, color: PRIMARY_BLUE_HEX }).setOrigin(0.5);
        const hit = this.add.rectangle(0, 0, size, size, 0xffffff, 0).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", onClick);

        return this.add.container(x, y, [bg, label, hit]);
    }

    // ---- Left column: Instruksi + alert -------------------------------------------

    private buildInstructionPanel() {
        const x = MARGIN;
        const y = 110;
        const width = 300;

        const steps = [
            "Atur katup sesuai urutan yang benar",
            "Pantau nilai Oil Content Monitor (OCM)",
            "Turunkan kadar minyak hingga < 15 PPM",
            "Selesaikan sebelum waktu habis",
        ];

        const headerHeight = 48;
        const rowHeight = 46;
        const height = headerHeight + steps.length * rowHeight + 16;

        const card = this.add.graphics();
        card.fillStyle(0xeaf3ff, 1);
        card.fillRoundedRect(x, y, width, height, 16);
        card.lineStyle(2, PRIMARY_BLUE, 0.5);
        card.strokeRoundedRect(x, y, width, height, 16);
        this.root.add(card);

        const title = this.add.text(x + 20, y + 16, "📋 Instruksi", { fontFamily: "Arial Black", fontSize: 17, color: DARK_NAVY });
        this.root.add(title);

        steps.forEach((step, index) => {
            const rowY = y + headerHeight + index * rowHeight;
            const bubble = this.add.circle(x + 30, rowY + 16, 14, PRIMARY_BLUE, 1);
            const number = this.add.text(x + 30, rowY + 16, String(index + 1), { fontFamily: "Arial Black", fontSize: 13, color: "#ffffff" }).setOrigin(0.5);
            const label = this.add.text(x + 54, rowY, step, {
                fontFamily: "Arial",
                fontSize: 13,
                color: DARK_NAVY,
                lineSpacing: 3,
                wordWrap: { width: width - 74 },
            });
            this.root.add([bubble, number, label]);
        });

        const alertY = y + height + 20;
        const alertHeight = 130;
        const alertCard = this.add.graphics();
        alertCard.fillStyle(0xfdf3e7, 1);
        alertCard.fillRoundedRect(x, alertY, width, alertHeight, 16);
        alertCard.lineStyle(2, AMBER, 0.7);
        alertCard.strokeRoundedRect(x, alertY, width, alertHeight, 16);
        const alertTitle = this.add.text(x + 20, alertY + 14, "⚠ Kadar minyak awal: 45 PPM", {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: AMBER_HEX,
            wordWrap: { width: width - 40 },
        });
        const alertBody = this.add.text(x + 20, alertTitle.y + alertTitle.height + 10, "Turunkan hingga < 15 PPM untuk buang ke laut dengan aman.", {
            fontFamily: "Arial",
            fontSize: 12,
            color: BODY_TEXT,
            lineSpacing: 3,
            wordWrap: { width: width - 40 },
        });
        this.root.add([alertCard, alertTitle, alertBody]);
    }

    // ---- Timer + target cards -----------------------------------------------------

    private buildTimerAndTarget() {
        const y = 110;
        const height = 90;
        const timerWidth = 260;
        const targetWidth = 200;
        const gap = 16;
        const rightEdge = DESIGN_WIDTH - MARGIN;
        const targetX = rightEdge - targetWidth;
        const timerX = targetX - gap - timerWidth;

        const timerCard = this.add.graphics();
        timerCard.fillStyle(0xffffff, 1);
        timerCard.fillRoundedRect(timerX, y, timerWidth, height, 16);
        timerCard.lineStyle(2, PRIMARY_BLUE, 0.5);
        timerCard.strokeRoundedRect(timerX, y, timerWidth, height, 16);
        const timerLabel = this.add.text(timerX + 18, y + 14, "⏱ Waktu Tersisa", { fontFamily: "Arial Black", fontSize: 13, color: BODY_TEXT });
        this.timeValueText = this.add.text(timerX + 18, y + 32, "02:30", { fontFamily: "Arial Black", fontSize: 26, color: DARK_NAVY });
        const barTrack = this.add.graphics();
        barTrack.fillStyle(0xe2e8f0, 1);
        barTrack.fillRoundedRect(timerX + 18, y + height - 18, timerWidth - 36, 8, 4);
        this.timeBarFill = this.add.graphics();
        this.root.add([timerCard, timerLabel, this.timeValueText, barTrack, this.timeBarFill]);

        const targetCard = this.add.graphics();
        targetCard.fillStyle(0xeafaf0, 1);
        targetCard.fillRoundedRect(targetX, y, targetWidth, height, 16);
        targetCard.lineStyle(2, GREEN, 0.5);
        targetCard.strokeRoundedRect(targetX, y, targetWidth, height, 16);
        const targetLabel = this.add.text(targetX + 18, y + 18, "🎯 Target", { fontFamily: "Arial Black", fontSize: 13, color: BODY_TEXT });
        const targetValue = this.add.text(targetX + 18, y + 40, "< 15 PPM", { fontFamily: "Arial Black", fontSize: 22, color: GREEN_HEX });
        this.root.add([targetCard, targetLabel, targetValue]);

        this.timerCardBounds = { x: timerX, y, width: timerWidth, height };
    }

    private timerCardBounds = { x: 0, y: 0, width: 0, height: 0 };

    // ---- Center: OWS tank + pipe network -------------------------------------------

    private buildTankIllustration() {
        const centerX = 660;
        const tankTop = 250;
        const tankWidth = 200;
        const tankHeight = 300;
        const tankBottom = tankTop + tankHeight;

        const g = this.add.graphics();
        g.fillStyle(0xf1f5fb, 1);
        g.fillRoundedRect(centerX - tankWidth / 2, tankTop, tankWidth, tankHeight, 20);
        g.lineStyle(3, PRIMARY_BLUE, 0.8);
        g.strokeRoundedRect(centerX - tankWidth / 2, tankTop, tankWidth, tankHeight, 20);
        this.root.add(g);

        const tankLabel = this.add
            .text(centerX, tankTop + tankHeight * 0.4, "OWS\n\nOIL WATER\nSEPARATOR", {
                fontFamily: "Arial Black",
                fontSize: 15,
                color: NAVY_HEX,
                align: "center",
                lineSpacing: 2,
            })
            .setOrigin(0.5);
        this.root.add(tankLabel);

        // Pump block beneath the tank.
        const pump = this.add.graphics();
        pump.fillStyle(BLUE, 1);
        pump.fillRoundedRect(centerX - 60, tankBottom + 20, 120, 46, 8);
        this.root.add(pump);
        const pumpLabel = this.add.text(centerX, tankBottom + 43, "Pompa Bilge Water", { fontFamily: "Arial", fontSize: 11, color: "#ffffff" }).setOrigin(0.5);
        this.root.add(pumpLabel);

        // Katup 1 — Inlet, lower-left of the tank.
        const valve1X = centerX - tankWidth / 2 - 80;
        const valve1Y = tankTop + tankHeight * 0.7;
        this.valve1Wheel = this.buildValveWheel(valve1X, valve1Y, RED);
        this.valve1StateText = this.add.text(valve1X, valve1Y + 46, "TERTUTUP", { fontFamily: "Arial Black", fontSize: 11, color: RED_HEX }).setOrigin(0.5);
        const valve1Label = this.add.text(valve1X, valve1Y - 60, "Katup 1\n(Inlet)", { fontFamily: "Arial Black", fontSize: 12, color: DARK_NAVY, align: "center" }).setOrigin(0.5);
        const valve1Hit = this.registerValveHitArea(valve1X, valve1Y, 34, 1);

        // Inlet pipe from bilge tank label to Katup 1.
        const inletPipe = this.add.graphics();
        inletPipe.lineStyle(10, 0x64748b, 1);
        inletPipe.lineBetween(valve1X - 90, valve1Y, valve1X, valve1Y);
        inletPipe.lineBetween(valve1X, valve1Y, valve1X, tankTop + tankHeight * 0.7);
        const bilgeLabel = this.add.text(valve1X - 90, valve1Y - 50, "Dari Bilge Tank\n45 PPM", {
            fontFamily: "Arial Black",
            fontSize: 11,
            color: RED_HEX,
            align: "center",
        }).setOrigin(0.5);

        // Katup 3 — Bypass, above the tank.
        const valve3X = centerX;
        const valve3Y = tankTop - 70;
        this.valve3Wheel = this.buildValveWheel(valve3X, valve3Y, BLUE);
        this.valve3StateText = this.add.text(valve3X, valve3Y + 46, "TERTUTUP", { fontFamily: "Arial Black", fontSize: 11, color: RED_HEX }).setOrigin(0.5);
        const valve3Label = this.add.text(valve3X, valve3Y - 46, "Katup 3\n(Bypass)", { fontFamily: "Arial Black", fontSize: 12, color: DARK_NAVY, align: "center" }).setOrigin(0.5);
        const valve3Hit = this.registerValveHitArea(valve3X, valve3Y, 34, 3);

        const bypassPipe = this.add.graphics();
        bypassPipe.lineStyle(10, 0x64748b, 1);
        bypassPipe.lineBetween(centerX, tankTop, valve3X, valve3Y);

        // Katup 2 — Outlet (never player-controlled), lower-right of the tank.
        const valve2X = centerX + tankWidth / 2 + 90;
        const valve2Y = tankTop + tankHeight * 0.55;
        const valve2Wheel = this.buildValveWheel(valve2X, valve2Y, GREEN);
        valve2Wheel.setAlpha(0.35);
        const valve2Label = this.add.text(valve2X, valve2Y - 60, "Katup 2\n(Outlet)", { fontFamily: "Arial Black", fontSize: 12, color: DARK_NAVY, align: "center" }).setOrigin(0.5);
        const valve2Note = this.add.text(valve2X, valve2Y + 46, "OTOMATIS", { fontFamily: "Arial Black", fontSize: 10, color: BODY_TEXT }).setOrigin(0.5);

        const outletPipe = this.add.graphics();
        outletPipe.lineStyle(10, 0x64748b, 1);
        outletPipe.lineBetween(centerX + tankWidth / 2, tankTop + tankHeight * 0.55, valve2X, valve2Y);
        outletPipe.lineBetween(valve2X, valve2Y, valve2X + 90, valve2Y);

        const seaLabel = this.add.text(valve2X + 90, valve2Y - 20, "Ke Laut\n(Overboard)", {
            fontFamily: "Arial Black",
            fontSize: 11,
            color: BODY_TEXT,
            align: "center",
        }).setOrigin(0.5, 1);

        this.root.add([
            valve1Hit,
            this.valve1Wheel,
            this.valve1StateText,
            valve1Label,
            inletPipe,
            bilgeLabel,
            valve3Hit,
            this.valve3Wheel,
            this.valve3StateText,
            valve3Label,
            bypassPipe,
            valve2Wheel,
            valve2Label,
            valve2Note,
            outletPipe,
            seaLabel,
        ]);
    }

    private buildValveWheel(x: number, y: number, color: number): GameObjects.Graphics {
        const wheel = this.add.graphics({ x, y });
        wheel.fillStyle(0xffffff, 1);
        wheel.fillCircle(0, 0, 34);
        wheel.lineStyle(6, color, 1);
        wheel.strokeCircle(0, 0, 34);
        wheel.fillStyle(color, 1);
        wheel.fillCircle(0, 0, 24);
        wheel.lineStyle(4, 0xffffff, 1);
        wheel.lineBetween(-14, 0, 14, 0);
        wheel.lineBetween(0, -14, 0, 14);
        return wheel;
    }

    // ---- OCM readout panel ---------------------------------------------------------

    private buildOcmPanel() {
        const x = 1080;
        const y = 340;
        const width = 230;
        const height = 160;

        this.ocmPanelBg = this.add.graphics();
        this.root.add(this.ocmPanelBg);

        const label = this.add.text(x + width / 2, y + 20, "Oil Content Monitor (OCM)", {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: BODY_TEXT,
            align: "center",
            wordWrap: { width: width - 20 },
        }).setOrigin(0.5, 0);
        this.root.add(label);

        this.ocmValueText = this.add.text(x + width / 2, y + 66, `${this.ppm} PPM`, {
            fontFamily: "Arial Black",
            fontSize: 34,
            color: RED_HEX,
        }).setOrigin(0.5);
        this.root.add(this.ocmValueText);

        const lightsY = y + height - 26;
        const lightColors = [GREEN, AMBER, RED];
        this.ocmLights = lightColors.map((color, index) =>
            this.add.circle(x + width / 2 - 30 + index * 30, lightsY, 8, color, 0.25),
        );
        this.root.add(this.ocmLights);

        this.ocmPanelBounds = { x, y, width, height };
    }

    private ocmPanelBounds = { x: 0, y: 0, width: 0, height: 0 };

    private flashOcmBorder(color: number) {
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 600,
            repeat: 2,
            yoyo: true,
            onUpdate: () => this.drawOcmPanel(color),
        });
    }

    private drawOcmPanel(borderColorOverride?: number) {
        const { x, y, width, height } = this.ocmPanelBounds;
        if (width === 0) return;

        const borderColor = borderColorOverride ?? (this.ppm < TARGET_PPM ? GREEN : this.ppm < 30 ? AMBER : RED);

        this.ocmPanelBg.clear();
        this.ocmPanelBg.fillStyle(0x0f2138, 1);
        this.ocmPanelBg.fillRoundedRect(x, y, width, height, 16);
        this.ocmPanelBg.lineStyle(3, borderColor, 1);
        this.ocmPanelBg.strokeRoundedRect(x, y, width, height, 16);
    }

    // ---- Bottom hint cards ----------------------------------------------------------

    private buildHintCards() {
        const y = 700;
        const height = 110;
        const orderWidth = 300;
        const statusWidth = 260;
        const gap = 16;
        const rightEdge = DESIGN_WIDTH - MARGIN;
        const statusX = rightEdge - statusWidth;
        const orderX = statusX - gap - orderWidth;

        const orderCard = this.add.graphics();
        orderCard.fillStyle(0xffffff, 1);
        orderCard.fillRoundedRect(orderX, y, orderWidth, height, 16);
        orderCard.lineStyle(2, BORDER_BLUE, 1);
        orderCard.strokeRoundedRect(orderX, y, orderWidth, height, 16);
        const orderHeader = this.add.graphics();
        orderHeader.fillStyle(PRIMARY_BLUE, 1);
        orderHeader.fillRoundedRect(orderX, y, orderWidth, 36, { tl: 16, tr: 16, bl: 0, br: 0 });
        const orderTitle = this.add.text(orderX + orderWidth / 2, y + 18, "Urutan Katup (Petunjuk)", { fontFamily: "Arial Black", fontSize: 12, color: "#ffffff" }).setOrigin(0.5);

        const dotColors = [RED, GREEN, BLUE];
        const dotsY = y + 36 + (height - 36) / 2;
        const dotGap = 70;
        const dotsStartX = orderX + orderWidth / 2 - dotGap;
        const orderDots: GameObjects.GameObject[] = [];
        dotColors.forEach((color, index) => {
            const dotX = dotsStartX + index * dotGap;
            const dot = this.add.circle(dotX, dotsY, 18, color, 1);
            const num = this.add.text(dotX, dotsY, String(index + 1), { fontFamily: "Arial Black", fontSize: 14, color: "#ffffff" }).setOrigin(0.5);
            orderDots.push(dot, num);
            if (index < dotColors.length - 1) {
                const arrow = this.add.text(dotX + dotGap / 2, dotsY, "→", { fontFamily: "Arial Black", fontSize: 16, color: BODY_TEXT }).setOrigin(0.5);
                orderDots.push(arrow);
            }
        });

        const statusCard = this.add.graphics();
        statusCard.fillStyle(0xffffff, 1);
        statusCard.fillRoundedRect(statusX, y, statusWidth, height, 16);
        statusCard.lineStyle(2, BORDER_BLUE, 1);
        statusCard.strokeRoundedRect(statusX, y, statusWidth, height, 16);
        const statusHeader = this.add.graphics();
        statusHeader.fillStyle(PRIMARY_BLUE, 1);
        statusHeader.fillRoundedRect(statusX, y, statusWidth, 36, { tl: 16, tr: 16, bl: 0, br: 0 });
        const statusTitle = this.add.text(statusX + statusWidth / 2, y + 18, "Indikator Status", { fontFamily: "Arial Black", fontSize: 12, color: "#ffffff" }).setOrigin(0.5);

        const legendRows: Array<[number, string]> = [
            [GREEN, "Normal"],
            [AMBER, "Perhatian"],
            [RED, "Tidak Aman"],
        ];
        const legendItems: GameObjects.GameObject[] = [];
        legendRows.forEach(([color, text], index) => {
            const rowY = y + 50 + index * 20;
            const dot = this.add.circle(statusX + 24, rowY, 6, color, 1);
            const label = this.add.text(statusX + 40, rowY, text, { fontFamily: "Arial", fontSize: 12, color: DARK_NAVY }).setOrigin(0, 0.5);
            legendItems.push(dot, label);
        });

        this.root.add([orderCard, orderHeader, orderTitle, ...orderDots, statusCard, statusHeader, statusTitle, ...legendItems]);
    }

    // ---- Reset button ---------------------------------------------------------------

    private buildResetButton() {
        const button = new Button(this, {
            x: MARGIN + 90,
            y: DESIGN_HEIGHT - 44,
            width: 160,
            height: 52,
            text: "↺ Reset",
            fontSize: 15,
            borderRadius: 14,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        button.on("pointerdown", () => this.handleReset());
        this.root.add(button.view);
    }

    private handleReset() {
        playSfx(this, SFX_KEYS.click);
        this.hideFailOverlay();
        this.resetGameState();
        this.valve1Wheel.setAngle(0);
        this.valve3Wheel.setAngle(0);
        this.startTicking();
        this.refreshHud();
    }

    // ---- HUD refresh ------------------------------------------------------------------

    private refreshHud() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.timeValueText.setText(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);

        const { x, y, width, height } = this.timerCardBounds;
        if (width > 0) {
            const ratio = this.timeRemaining / TIME_LIMIT_SECONDS;
            this.timeBarFill.clear();
            this.timeBarFill.fillStyle(RED, 1);
            this.timeBarFill.fillRoundedRect(x + 18, y + height - 18, Math.max(0, (width - 36) * ratio), 8, 4);
        }

        this.ocmValueText.setText(`${this.ppm} PPM`);
        this.ocmValueText.setColor(this.ppm < TARGET_PPM ? GREEN_HEX : this.ppm < 30 ? AMBER_HEX : RED_HEX);
        this.drawOcmPanel();

        this.ocmLights.forEach((light, index) => {
            const isGreen = index === 0 && this.ppm < TARGET_PPM;
            const isAmber = index === 1 && this.ppm >= TARGET_PPM && this.ppm < 30;
            const isRed = index === 2 && this.ppm >= 30;
            light.setAlpha(isGreen || isAmber || isRed ? 1 : 0.25);
        });

        this.valve1StateText.setText(this.katup1Open ? "TERBUKA" : "TERTUTUP");
        this.valve1StateText.setColor(this.katup1Open ? GREEN_HEX : RED_HEX);
        this.valve3StateText.setText(this.katup3Open ? "TERBUKA" : "TERTUTUP");
        this.valve3StateText.setColor(this.katup3Open ? RED_HEX : GREEN_HEX);
    }

    // ---- Fail overlay -----------------------------------------------------------------

    private showFailOverlay() {
        this.hideFailOverlay();

        const overlay = this.add.container(0, 0);
        const dim = this.add.rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0x0a1a33, 0.72);
        overlay.add(dim);

        const cardWidth = 620;
        const cardHeight = 300;
        const cardX = DESIGN_WIDTH / 2 - cardWidth / 2;
        const cardY = DESIGN_HEIGHT / 2 - cardHeight / 2;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        card.lineStyle(3, RED, 1);
        card.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        overlay.add(card);

        const icon = this.add.text(DESIGN_WIDTH / 2, cardY + 50, "⚠", { fontFamily: "Arial Black", fontSize: 44, color: RED_HEX }).setOrigin(0.5);
        const title = this.add.text(DESIGN_WIDTH / 2, cardY + 106, "MISI GAGAL — KEBOCORAN POLUSI", { fontFamily: "Arial Black", fontSize: 20, color: RED_HEX, align: "center", wordWrap: { width: cardWidth - 60 } }).setOrigin(0.5);
        const body = this.add.text(DESIGN_WIDTH / 2, cardY + 150, this.failReason, {
            fontFamily: "Arial",
            fontSize: 14,
            color: BODY_TEXT,
            align: "center",
            wordWrap: { width: cardWidth - 80 },
        }).setOrigin(0.5);
        overlay.add([icon, title, body]);

        const retryButton = new Button(this, {
            x: DESIGN_WIDTH / 2 - 110,
            y: cardY + cardHeight - 50,
            width: 200,
            height: 52,
            text: "COBA LAGI",
            fontSize: 15,
            borderRadius: 14,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        retryButton.on("pointerdown", () => this.handleReset());

        const backButton = new Button(this, {
            x: DESIGN_WIDTH / 2 + 110,
            y: cardY + cardHeight - 50,
            width: 200,
            height: 52,
            text: "KEMBALI",
            fontSize: 15,
            borderRadius: 14,
            fillColor: 0xffffff,
            strokeColor: PRIMARY_BLUE,
            strokeAlpha: 1,
            textColor: PRIMARY_BLUE_HEX,
        });
        backButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("PilihAktivitasOws");
        });

        overlay.add([retryButton.view, backButton.view]);
        overlay.setDepth(1000);
        this.root.add(overlay);
        this.overlayContainer = overlay;
    }

    private hideFailOverlay() {
        this.overlayContainer?.destroy();
        this.overlayContainer = null;
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
