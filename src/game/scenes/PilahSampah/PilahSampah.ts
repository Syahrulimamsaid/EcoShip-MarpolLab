import { GameObjects, Math as PhaserMath, Scale, Scene } from "phaser";

import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { shuffled } from "../../QuizShuffle";
import { SFX_KEYS, playSfx } from "../../SfxManager";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const PRIMARY_BLUE = 0x087ff1;
const MAX_LIVES = 5;

type BinId = "incinerator" | "comminutor" | "plastic";

interface WasteItemConfig {
    texture: string;
    bin: BinId;
    x: number;
    y: number;
}

const BIN_ZONES: Record<BinId, { x: number; y: number; width: number; height: number }> = {
    incinerator: { x: 702, y: 558, width: 220, height: 230 },
    comminutor: { x: 1015, y: 566, width: 230, height: 210 },
    plastic: { x: 1318, y: 566, width: 250, height: 210 },
};

const WASTE_ITEMS: WasteItemConfig[] = [
    { texture: "pilah_sampah.waste.plastik", bin: "plastic", x: 470, y: 760 },
    { texture: "pilah_sampah.waste.kalengMerah", bin: "plastic", x: 590, y: 760 },
    { texture: "pilah_sampah.waste.organik", bin: "comminutor", x: 710, y: 760 },
    { texture: "pilah_sampah.waste.kertas", bin: "incinerator", x: 830, y: 760 },
    { texture: "pilah_sampah.waste.kardus", bin: "incinerator", x: 950, y: 760 },
    { texture: "pilah_sampah.waste.logam", bin: "plastic", x: 1070, y: 760 },
    { texture: "pilah_sampah.waste.styrofoam", bin: "plastic", x: 1190, y: 760 },
    { texture: "pilah_sampah.waste.kaca", bin: "plastic", x: 1310, y: 760 },
    { texture: "pilah_sampah.waste.taliJaring", bin: "plastic", x: 1430, y: 760 },
];

/** A drag-and-drop MARPOL Annex V activity. The background already contains
 * the three waste receptacles and conveyor; this scene only adds the lesson
 * chrome, instructions, and the locally supplied waste-item sprites. */
export class PilahSampah extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];
    private currentScale = 1;
    private currentRootX = 0;
    private currentRootY = 0;
    private wasteLayer!: GameObjects.Container;
    private lifeHearts: GameObjects.Graphics[] = [];
    private feedbackText!: GameObjects.Text;
    private feedbackBackground!: GameObjects.Graphics;
    private lives = MAX_LIVES;
    private remainingItems = WASTE_ITEMS.length;
    private restarting = false;
    private itemOrder: WasteItemConfig[] = [];

    constructor() {
        super("PilahSampah");
    }

    create() {
        this.background = this.add.image(0, 0, "pilah_sampah.background");
        this.root = this.add.container(0, 0);
        this.lives = MAX_LIVES;
        this.remainingItems = WASTE_ITEMS.length;
        this.restarting = false;
        this.itemOrder = [...WASTE_ITEMS];

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildInstructions());
        trackGroup(this.root, groups, () => this.buildBinLabels());
        this.wasteLayer = this.add.container(0, 0);
        this.root.add(this.wasteLayer);
        this.buildWasteItems();
        groups.push([this.wasteLayer]);
        this.buildLives();
        this.transitionGroups = groups;

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);
        // Wait for the conveyor items to reach their authored positions.
        this.input.enabled = false;
        this.time.delayedCall(700, () => { this.input.enabled = true; });
        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        this.input.enabled = false;
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    private buildHeader() {
        const backWidth = 165;
        const backHeight = backWidth * (558 / 1780);
        const headerY = 32;
        const centerY = headerY + backHeight / 2;
        const backButton = this.add
            .image(32 + backWidth / 2, centerY, "pilah_sampah.btnKembali")
            .setDisplaySize(backWidth, backHeight)
            .setInteractive({ useHandCursor: true });
        backButton.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.goTo("MainMenu");
        });

        const crumbX = 32 + backWidth + 20;
        const badgeText = this.add.text(0, 0, "MODUL PEMILAHAN SAMPAH", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 48;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: "#087ff1" });
        const label = this.add.text(0, 0, "MARPOL Annex V", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: "#087ff1" });
        const whiteWidth = 22 + chevron.width + 10 + label.width + 26;
        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, headerY, blueWidth + whiteWidth, backHeight, backHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, headerY, blueWidth, backHeight, { tl: backHeight / 2, bl: backHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, headerY, blueWidth + whiteWidth, backHeight, backHeight / 2);
        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 22, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        this.root.add([backButton, breadcrumb, badgeText, chevron, label]);
    }

    private buildInstructions() {
        const width = 360;
        const height = width * (1536 / 1024);
        const instructions = this.add.image(32 + width / 2, 126 + height / 2, "pilah_sampah.instruksi").setDisplaySize(width, height);
        this.root.add(instructions);
    }

    private buildBinLabels() {
        this.buildBinLabel(BIN_ZONES.incinerator.x, 343, "INSINERATOR", "Sampah yang dapat\ndibakar (non-plastik)", "incinerator");
        this.buildBinLabel(BIN_ZONES.comminutor.x, 343, "COMMINUTOR", "Sampah organik\nhingga < 25 mm", "comminutor");
        this.buildBinLabel(BIN_ZONES.plastic.x, 343, "BAK GUDANG\nSAMPAH PLASTIK", "Simpan untuk penanganan\ndi pelabuhan", "recycling");
    }

    private buildBinLabel(x: number, y: number, title: string, subtitle: string, icon: string) {
        const width = 280;
        const height = 106;
        const left = x - width / 2;
        const top = y - height / 2;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(left, top, width, height, 12);
        card.lineStyle(3, 0x143a84, 1);
        card.strokeRoundedRect(left, top, width, height, 12);
        const symbol = this.add.image(left + 44, y, `pilah_sampah.icon.${icon}`).setDisplaySize(56, 56);
        const textX = left + 82;
        const textWidth = width - 94;
        const titleText = this.add.text(textX, 0, title, {
            fontFamily: FONT, fontStyle: "600", fontSize: 16, color: "#143a84",
            wordWrap: { width: textWidth }, lineSpacing: 0,
        });
        const subtitleText = this.add.text(textX, 0, subtitle, {
            fontFamily: FONT, fontStyle: "600", fontSize: 13, color: "#143a84",
            wordWrap: { width: textWidth }, lineSpacing: 1,
        });
        const textTop = y - (titleText.height + 5 + subtitleText.height) / 2;
        titleText.setY(textTop);
        subtitleText.setY(textTop + titleText.height + 5);
        this.root.add([card, symbol, titleText, subtitleText]);
    }

    private buildWasteItems() {
        this.itemOrder.forEach((config, index) => {
            const slot = WASTE_ITEMS[index];
            const item = this.add
                .image(slot.x, slot.y, config.texture)
                .setInteractive({ useHandCursor: true, draggable: true });
            const baseScale = 78 / Math.max(item.width, item.height);
            item.setScale(baseScale);
            item.setData("baseScale", baseScale);
            item.setData("originX", slot.x);
            item.setData("originY", slot.y);
            item.setData("bin", config.bin);
            item.on("dragstart", (pointer: Phaser.Input.Pointer) => {
                this.wasteLayer.bringToTop(item);
                item.setData("offsetX", this.toDesignX(pointer.worldX) - item.x);
                item.setData("offsetY", this.toDesignY(pointer.worldY) - item.y);
            });
            item.on("drag", (pointer: Phaser.Input.Pointer) => {
                if (this.restarting) return;
                item.setPosition(
                    this.toDesignX(pointer.worldX) - item.getData("offsetX"),
                    this.toDesignY(pointer.worldY) - item.getData("offsetY"),
                );
            });
            // Phaser's dragend coordinates are not world coordinates. Use
            // the pointer directly, transformed into the scene's design space.
            item.on("dragend", (pointer: Phaser.Input.Pointer) => this.handleWasteDrop(item, pointer.worldX, pointer.worldY));
            this.wasteLayer.add(item);
        });
    }

    private handleWasteDrop(item: GameObjects.Image, screenX: number, screenY: number) {
        if (this.restarting || item.getData("settling")) return;
        item.setData("settling", true);
        item.disableInteractive();
        const baseScale = item.getData("baseScale") as number;
        const x = this.toDesignX(screenX);
        const y = this.toDesignY(screenY);
        const bin = item.getData("bin") as BinId;
        const zone = BIN_ZONES[bin];
        const isCorrect = x >= zone.x - zone.width / 2 && x <= zone.x + zone.width / 2 && y >= zone.y - zone.height / 2 && y <= zone.y + zone.height / 2;

        if (isCorrect) {
            playSfx(this, SFX_KEYS.click);
            this.remainingItems--;
            this.setFeedback(this.remainingItems === 0 ? "Semua sampah berhasil dipilah!" : "Benar! Sampah masuk ke wadah yang sesuai.", "#1f8d52");
            this.tweens.add({
                targets: item,
                x: zone.x,
                y: zone.y,
                scaleX: baseScale * 0.3,
                scaleY: baseScale * 0.3,
                alpha: 0,
                duration: 220,
                ease: "Back.In",
                onComplete: () => item.destroy(),
            });
            return;
        }

        this.lives--;
        this.updateLives();
        this.setFeedback("Belum sesuai. Seret sampah ke wadah yang tepat.", "#c0392b");
        this.tweens.add({
            targets: item,
            x: item.getData("originX"),
            y: item.getData("originY"),
            scaleX: baseScale,
            scaleY: baseScale,
            duration: 220,
            ease: "Back.Out",
            onComplete: () => {
                if (!this.restarting) {
                    item.setData("settling", false);
                    item.setInteractive({ useHandCursor: true, draggable: true });
                }
            },
        });

        if (this.lives === 0) {
            this.restarting = true;
            this.wasteLayer.list.forEach((child) => child.disableInteractive());
            this.setFeedback("Nyawa habis. Mengulang dengan posisi sampah diacak...", "#c0392b");
            this.time.delayedCall(1200, () => this.restartRound());
        }
    }

    private buildLives() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.96);
        card.fillRoundedRect(DESIGN_WIDTH - 310, 24, 278, 72, 20);
        card.lineStyle(2, PRIMARY_BLUE, 1);
        card.strokeRoundedRect(DESIGN_WIDTH - 310, 24, 278, 72, 20);
        this.lifeHearts = Array.from({ length: MAX_LIVES }, (_, index) =>
            this.add.graphics().setPosition(DESIGN_WIDTH - 171 + (index - 2) * 46, 58),
        );
        this.feedbackBackground = this.add.graphics();
        this.feedbackText = this.add.text(0, 0, "", {
            fontFamily: FONT, fontStyle: "600", fontSize: 22, color: "#143a84",
            align: "center", wordWrap: { width: 1200 },
        }).setOrigin(0.5);
        const feedback = this.add.container(DESIGN_WIDTH / 2, 990, [this.feedbackBackground, this.feedbackText]);
        this.root.add([card, ...this.lifeHearts, feedback]);
        this.setFeedback("Seret setiap sampah ke wadah yang sesuai.");
        this.updateLives();
    }

    private setFeedback(message: string, color = "#143a84") {
        this.feedbackText.setText(message).setColor(color);
        const width = this.feedbackText.width + 64;
        const height = Math.max(64, this.feedbackText.height + 32);
        this.feedbackBackground.clear();
        this.feedbackBackground.fillStyle(0xffffff, 1);
        this.feedbackBackground.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
        this.feedbackBackground.lineStyle(3, 0x008fff, 1);
        this.feedbackBackground.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    }

    private updateLives() {
        const points = Array.from({ length: 64 }, (_, index) => {
            const angle = index / 64 * Math.PI * 2;
            return new PhaserMath.Vector2(
                18 * Math.sin(angle) ** 3,
                -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * 1.1,
            );
        });
        this.lifeHearts.forEach((heart, index) => {
            heart.clear();
            heart.fillStyle(index < this.lives ? 0xe74454 : 0xd6dee8, 1);
            heart.fillPoints(points, true);
        });
    }

    private restartRound() {
        this.wasteLayer.list.forEach((child) => this.tweens.killTweensOf(child));
        this.wasteLayer.removeAll(true);
        const nextOrder = shuffled(this.itemOrder);
        // Even an identical random permutation must visibly change the order.
        if (nextOrder.every((item, index) => item === this.itemOrder[index])) {
            nextOrder.push(nextOrder.shift()!);
        }
        this.itemOrder = nextOrder;
        this.lives = MAX_LIVES;
        this.remainingItems = WASTE_ITEMS.length;
        this.restarting = false;
        this.buildWasteItems();
        this.updateLives();
        this.setFeedback("Coba lagi! Posisi sampah sudah diacak.");
    }

    private toDesignX(screenX: number) {
        return (screenX - this.currentRootX) / this.currentScale;
    }

    private toDesignY(screenY: number) {
        return (screenY - this.currentRootY) / this.currentScale;
    }

    private layout(width: number, height: number) {
        this.currentScale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.currentRootX = (width - DESIGN_WIDTH * this.currentScale) / 2;
        this.currentRootY = (height - DESIGN_HEIGHT * this.currentScale) / 2;
        this.root.setScale(this.currentScale);
        this.root.setPosition(this.currentRootX, this.currentRootY);
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(DESIGN_WIDTH * this.currentScale, DESIGN_HEIGHT * this.currentScale);
    }
}
