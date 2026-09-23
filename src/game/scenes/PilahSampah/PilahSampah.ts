import { GameObjects, Math as PhaserMath, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { HomeBackButtons } from "../../../component/Button/HomeBackButtons";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { unlockNextModuleAfter } from "../../ModuleProgress";
import { shuffled } from "../../QuizShuffle";
import { SFX_KEYS, playSfx } from "../../SfxManager";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const PRIMARY_BLUE = 0x087ff1;
const MAX_LIVES = 5;
const SUCCESS = 0x1f8d52;
const ERROR = 0xc0392b;

type BinId = "incinerator" | "comminutor" | "storage";

interface WasteItemConfig {
    texture: string;
    name: string;
    category: string;
    bin: BinId;
    rounds: number[];
    available: boolean;
    feedbackCorrect: string;
    feedbackWrong: string;
}

const BIN_ZONES: Record<BinId, { x: number; y: number; width: number; height: number }> = {
    incinerator: { x: 702, y: 558, width: 220, height: 230 },
    comminutor: { x: 1015, y: 566, width: 230, height: 210 },
    storage: { x: 1318, y: 566, width: 250, height: 210 },
};

/** Full pool of waste types the lesson can draw from. Each round only shows
 * ITEMS_PER_ROUND of these, chosen at random. */
const WASTE_POOL: WasteItemConfig[] = [
    { texture: "pilah_sampah.waste.plastik", name: "Botol Plastik", category: "Plastik", bin: "storage", rounds: [1, 2, 3], available: true, feedbackCorrect: "Botol plastik disimpan di gudang sampah untuk penanganan selanjutnya.", feedbackWrong: "Botol plastik tidak diproses melalui Incinerator atau Comminutor. Simpan di gudang sampah." },
    { texture: "pilah_sampah.waste.kalengMerah", name: "Kaleng Minuman", category: "Logam", bin: "storage", rounds: [1, 2, 3], available: true, feedbackCorrect: "Kaleng minuman disimpan untuk penanganan selanjutnya di pelabuhan.", feedbackWrong: "Kaleng minuman termasuk logam dan perlu disimpan di gudang sampah." },
    { texture: "pilah_sampah.waste.organik", name: "Kulit Pisang", category: "Sampah Organik", bin: "comminutor", rounds: [1, 2, 3], available: true, feedbackCorrect: "Kulit pisang adalah sampah organik yang dapat dicacah melalui Comminutor.", feedbackWrong: "Kulit pisang adalah sampah organik. Arahkan ke Comminutor untuk dicacah." },
    { texture: "pilah_sampah.waste.kertas", name: "Kertas", category: "Kertas", bin: "incinerator", rounds: [1, 2, 3], available: true, feedbackCorrect: "Kertas dapat diarahkan ke Incinerator pada skenario pembelajaran ini.", feedbackWrong: "Comminutor digunakan untuk sampah makanan. Kertas diarahkan ke Incinerator pada simulasi ini." },
    { texture: "pilah_sampah.waste.kardus", name: "Kardus", category: "Kertas / Karton", bin: "incinerator", rounds: [1, 2, 3], available: true, feedbackCorrect: "Kardus dapat diarahkan ke Incinerator pada skenario pembelajaran ini.", feedbackWrong: "Kardus berbahan kertas dan diarahkan ke Incinerator pada simulasi ini." },
    { texture: "pilah_sampah.waste.logam", name: "Potongan Logam", category: "Logam", bin: "storage", rounds: [2, 3], available: true, feedbackCorrect: "Potongan logam disimpan untuk penanganan lebih lanjut.", feedbackWrong: "Logam tidak dicacah atau dibakar pada simulasi ini. Simpan di gudang sampah." },
    { texture: "pilah_sampah.waste.styrofoam", name: "Styrofoam", category: "Plastik", bin: "storage", rounds: [2, 3], available: true, feedbackCorrect: "Styrofoam disimpan di gudang sampah untuk penanganan berikutnya.", feedbackWrong: "Styrofoam tidak diarahkan ke Comminutor. Simpan di gudang sampah." },
    { texture: "pilah_sampah.waste.kaca", name: "Botol Kaca", category: "Kaca", bin: "storage", rounds: [1, 2, 3], available: true, feedbackCorrect: "Botol kaca disimpan dengan aman untuk penanganan selanjutnya.", feedbackWrong: "Kaca perlu disimpan di gudang sampah, bukan diproses dengan Incinerator atau Comminutor." },
    { texture: "pilah_sampah.waste.taliJaring", name: "Tali / Jaring Sintetis", category: "Sintetis", bin: "storage", rounds: [2, 3], available: true, feedbackCorrect: "Tali dan jaring sintetis disimpan untuk penanganan selanjutnya.", feedbackWrong: "Tali atau jaring sintetis disimpan di gudang sampah pada simulasi ini." },
    { texture: "pilah_sampah.waste.daun", name: "Sisa Sayuran", category: "Sampah Organik", bin: "comminutor", rounds: [2, 3], available: true, feedbackCorrect: "Sisa sayuran dapat diproses melalui Comminutor.", feedbackWrong: "Sisa sayuran adalah sampah organik yang diarahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.kue", name: "Sisa Kue", category: "Sampah Organik", bin: "comminutor", rounds: [2, 3], available: true, feedbackCorrect: "Sisa kue dapat dicacah melalui Comminutor.", feedbackWrong: "Sisa kue termasuk sampah organik. Arahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.paperBag", name: "Paper Bag", category: "Kertas", bin: "incinerator", rounds: [2, 3], available: true, feedbackCorrect: "Paper bag berbahan kertas dapat diarahkan ke Incinerator pada simulasi ini.", feedbackWrong: "Paper bag bukan sampah organik. Arahkan ke Incinerator pada simulasi ini." },
    // TODO ASSET: add a preloaded texture, then change available to true.
    { texture: "pilah_sampah.waste.sisaNasi", name: "Sisa Nasi", category: "Sampah Organik", bin: "comminutor", rounds: [1, 2, 3], available: true, feedbackCorrect: "Sisa nasi dapat dicacah melalui Comminutor.", feedbackWrong: "Sisa nasi adalah sampah organik. Arahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.kulitJeruk", name: "Kulit Jeruk", category: "Sampah Organik", bin: "comminutor", rounds: [2, 3], available: true, feedbackCorrect: "Kulit jeruk dapat diproses melalui Comminutor.", feedbackWrong: "Kulit jeruk adalah sampah organik. Arahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.potonganBuah", name: "Potongan Buah", category: "Sampah Organik", bin: "comminutor", rounds: [2, 3], available: false, feedbackCorrect: "Potongan buah dapat dicacah melalui Comminutor.", feedbackWrong: "Potongan buah adalah sampah organik. Arahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.sisaIkan", name: "Tulang / Sisa Ikan", category: "Sampah Organik", bin: "comminutor", rounds: [2, 3], available: true, feedbackCorrect: "Sisa ikan dapat diarahkan ke Comminutor.", feedbackWrong: "Sisa ikan termasuk sampah organik pada simulasi ini." },
    { texture: "pilah_sampah.waste.sisaRoti", name: "Sisa Roti", category: "Sampah Organik", bin: "comminutor", rounds: [2, 3], available: true, feedbackCorrect: "Sisa roti dapat dicacah melalui Comminutor.", feedbackWrong: "Sisa roti termasuk sampah organik. Arahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.gelasPlastik", name: "Gelas Plastik", category: "Plastik", bin: "storage", rounds: [2, 3], available: false, feedbackCorrect: "Gelas plastik disimpan di gudang sampah.", feedbackWrong: "Gelas plastik disimpan untuk penanganan selanjutnya." },
    { texture: "pilah_sampah.waste.kantongPlastik", name: "Kantong Plastik", category: "Plastik", bin: "storage", rounds: [3], available: false, feedbackCorrect: "Kantong plastik disimpan di gudang sampah.", feedbackWrong: "Kantong plastik disimpan untuk penanganan selanjutnya." },
    { texture: "pilah_sampah.waste.kemasanPlastik", name: "Kemasan Plastik", category: "Plastik", bin: "storage", rounds: [2, 3], available: false, feedbackCorrect: "Kemasan plastik disimpan di gudang sampah.", feedbackWrong: "Kemasan plastik tidak diarahkan ke Comminutor pada simulasi ini." },
    { texture: "pilah_sampah.waste.pecahanKaca", name: "Pecahan Kaca", category: "Kaca", bin: "storage", rounds: [2, 3], available: false, feedbackCorrect: "Pecahan kaca disimpan dengan aman untuk penanganan selanjutnya.", feedbackWrong: "Pecahan kaca perlu disimpan di gudang sampah." },
    { texture: "pilah_sampah.waste.kalengMakanan", name: "Kaleng Makanan", category: "Logam", bin: "storage", rounds: [2, 3], available: false, feedbackCorrect: "Kaleng makanan disimpan di gudang sampah.", feedbackWrong: "Kaleng makanan termasuk logam dan perlu disimpan." },
    { texture: "pilah_sampah.waste.aluminium", name: "Aluminium", category: "Logam", bin: "storage", rounds: [3], available: false, feedbackCorrect: "Aluminium disimpan untuk penanganan selanjutnya.", feedbackWrong: "Aluminium perlu disimpan di gudang sampah." },
    { texture: "pilah_sampah.waste.kemasanKertas", name: "Kemasan Kertas", category: "Kertas", bin: "incinerator", rounds: [2, 3], available: false, feedbackCorrect: "Kemasan berbahan kertas diarahkan ke Incinerator pada simulasi ini.", feedbackWrong: "Kemasan kertas diarahkan ke Incinerator pada simulasi ini." },
    { texture: "pilah_sampah.waste.sisaMakanan", name: "Sisa Makanan", category: "Sampah Organik", bin: "comminutor", rounds: [1, 2, 3], available: false, feedbackCorrect: "Sisa makanan dapat dicacah melalui Comminutor.", feedbackWrong: "Sisa makanan diarahkan ke Comminutor." },
    { texture: "pilah_sampah.waste.residuLain", name: "Sampah Lainnya", category: "Residu", bin: "storage", rounds: [3], available: false, feedbackCorrect: "Sampah residu disimpan untuk penanganan lebih lanjut.", feedbackWrong: "Sampah residu disimpan di gudang sampah pada simulasi ini." },
];

const ROUND_ITEM_COUNTS = [6, 8, 8];
const SLOT_SPACING = 120;
const SLOT_CENTER_X = DESIGN_WIDTH / 2;
const SLOT_Y = 760;

/** Conveyor slot positions, one per item shown in a round, centered on the belt. */
function getSlotPositions(count: number): { x: number; y: number }[] {
    const startX = SLOT_CENTER_X - ((count - 1) * SLOT_SPACING) / 2;
    return Array.from({ length: count }, (_, index) => ({ x: startX + index * SLOT_SPACING, y: SLOT_Y }));
}

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
    private roundText!: GameObjects.Text;
    private progressText!: GameObjects.Text;
    private progressBar!: GameObjects.Graphics;
    private storageCapacityText!: GameObjects.Text;
    private storageCapacityBar!: GameObjects.Graphics;
    private dragLabel?: GameObjects.Container;
    private hoverHighlight?: GameObjects.Graphics;
    private hoveredBin?: BinId;
    private lives = MAX_LIVES;
    private currentRound = 1;
    private readonly totalRounds = 3;
    private correctAnswers = 0;
    private wrongAnswers = 0;
    private totalAttempts = 0;
    private roundCorrect = 0;
    private roundWrong = 0;
    private processedItems = 0;
    private totalRoundItems = 0;
    private storageItems = 0;
    private roundActive = false;
    private itemOrder: WasteItemConfig[] = [];

    constructor() {
        super("PilahSampah");
    }

    /** Picks non-duplicated, currently available waste assets for a round. */
    private pickRoundItems(): WasteItemConfig[] {
        const roundIndex = this.currentRound - 1;
        const candidates = WASTE_POOL.filter((item) => item.available && item.rounds.includes(this.currentRound));
        return shuffled(candidates).slice(0, Math.min(ROUND_ITEM_COUNTS[roundIndex], candidates.length));
    }

    create() {
        this.background = this.add.image(0, 0, "pilah_sampah.background");
        this.root = this.add.container(0, 0);
        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildInstructions());
        trackGroup(this.root, groups, () => this.buildBinLabels());
        this.wasteLayer = this.add.container(0, 0);
        this.root.add(this.wasteLayer);
        groups.push([this.wasteLayer]);
        this.buildStatus();
        this.buildLives();
        this.transitionGroups = groups;

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);
        this.startRound(1);
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
        const headerY = 32;
        const navButtons = new HomeBackButtons(this, {
            x: 32,
            y: headerY,
            onHome: () => this.goTo("MainMenu"),
            onBack: () => this.goTo("PilahSampahMateri"),
        });

        const crumbX = 32 + navButtons.width + 20;
        // Match the compact breadcrumb used by the OWS materi screen.
        const crumbY = 38;
        const crumbHeight = navButtons.height - 10;
        const centerY = crumbY + crumbHeight / 2;
        const badgeText = this.add.text(0, 0, "MODUL PEMILAHAN SAMPAH", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = badgeText.width + 48;
        const chevron = this.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: "#087ff1" });
        const label = this.add.text(0, 0, "MARPOL Annex V", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: "#087ff1" });
        const whiteWidth = 22 + chevron.width + 10 + label.width + 26;
        const breadcrumb = this.add.graphics();
        breadcrumb.fillStyle(0xffffff, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        breadcrumb.fillStyle(PRIMARY_BLUE, 1);
        breadcrumb.fillRoundedRect(crumbX, crumbY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        breadcrumb.lineStyle(2, PRIMARY_BLUE, 1);
        breadcrumb.strokeRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        badgeText.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        chevron.setPosition(crumbX + blueWidth + 22, centerY).setOrigin(0, 0.5);
        label.setPosition(chevron.x + chevron.width + 10, centerY).setOrigin(0, 0.5);

        this.root.add([navButtons.view, breadcrumb, badgeText, chevron, label]);
    }

    private buildInstructions() {
        const width = 360;
        const height = width * (1536 / 1024);
        const instructions = this.add.image(32 + width / 2, 126 + height / 2, "pilah_sampah.instruksi").setDisplaySize(width, height);
        this.root.add(instructions);
    }

    private buildBinLabels() {
        this.buildBinLabel(BIN_ZONES.incinerator.x, 343, "INCINERATOR", "Sampah yang dapat\ndibakar (non-plastik)", "incinerator");
        this.buildBinLabel(BIN_ZONES.comminutor.x, 343, "COMMINUTOR", "Sampah organik\nhingga < 25 mm", "comminutor");
        this.buildBinLabel(BIN_ZONES.storage.x, 343, "BAK / GUDANG\nSAMPAH", "Simpan untuk penanganan\nselanjutnya", "recycling");
        this.storageCapacityText = this.add.text(BIN_ZONES.storage.x, 414, "KAPASITAS GUDANG  0%", { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: "#143a84" }).setOrigin(0.5);
        this.storageCapacityBar = this.add.graphics();
        this.root.add([this.storageCapacityText, this.storageCapacityBar]);
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
        const slotPositions = getSlotPositions(this.itemOrder.length);
        this.itemOrder.forEach((config, index) => {
            const slot = slotPositions[index];
            const item = this.add
                .image(slot.x - 420, slot.y, config.texture)
                .setAlpha(0);
            const baseScale = 78 / Math.max(item.width, item.height);
            item.setScale(baseScale);
            item.setData("baseScale", baseScale);
            item.setData("originX", slot.x);
            item.setData("originY", slot.y);
            item.setData("bin", config.bin);
            item.setData("config", config);
            item.setData("ready", false);
            item.on("dragstart", (pointer: Phaser.Input.Pointer) => {
                if (!this.roundActive || !item.getData("ready")) return;
                this.wasteLayer.bringToTop(item);
                item.setData("offsetX", this.toDesignX(pointer.worldX) - item.x);
                item.setData("offsetY", this.toDesignY(pointer.worldY) - item.y);
                item.setData("downScreenX", pointer.x);
                item.setData("downScreenY", pointer.y);
                item.setData("dragMoved", false);
                item.setScale(baseScale * 1.08);
                item.setTint(0xf4f9ff);
                this.showDragLabel(item);
            });
            item.on("drag", (pointer: Phaser.Input.Pointer) => {
                if (!this.roundActive) return;
                // Compare against raw screen-space movement, not design-space
                // (which is divided by the current canvas scale and can turn
                // tiny click jitter into a false "drag" on smaller windows).
                const movedScreenX = Math.abs(pointer.x - item.getData("downScreenX"));
                const movedScreenY = Math.abs(pointer.y - item.getData("downScreenY"));
                if (movedScreenX > 8 || movedScreenY > 8) item.setData("dragMoved", true);
                if (!item.getData("dragMoved")) return;
                const x = this.toDesignX(pointer.worldX) - item.getData("offsetX");
                const y = this.toDesignY(pointer.worldY) - item.getData("offsetY");
                item.setPosition(x, y);
                const hovered = this.getBinAt(x, y);
                this.updateDropHover(hovered === config.bin ? hovered : undefined);
                this.positionDragLabel(item);
            });
            // Phaser's dragend coordinates are not world coordinates. Use
            // the pointer directly, transformed into the scene's design space.
            item.on("dragend", (pointer: Phaser.Input.Pointer) => {
                this.destroyDragLabel();
                this.updateDropHover();
                if (!item.getData("dragMoved")) {
                    const baseScale = item.getData("baseScale") as number;
                    item.clearTint();
                    item.setScale(baseScale);
                    return;
                }
                this.handleWasteDrop(item, pointer.worldX, pointer.worldY);
            });
            this.wasteLayer.add(item);
        });
    }

    private startRound(round: number) {
        this.currentRound = round;
        this.lives = MAX_LIVES;
        this.roundCorrect = 0;
        this.roundWrong = 0;
        this.processedItems = 0;
        this.storageItems = 0;
        this.roundActive = false;
        this.wasteLayer.removeAll(true);
        this.itemOrder = this.pickRoundItems();
        this.totalRoundItems = this.itemOrder.length;
        this.updateLives();
        this.updateProgress();
        this.updateStorageCapacity();
        this.buildWasteItems();
        this.animateConveyorEntrance();
    }

    private animateConveyorEntrance() {
        this.setFeedback(`RONDE ${this.currentRound} / ${this.totalRounds}\nSampah sedang memasuki conveyor.`);
        const items = this.wasteLayer.list.filter((child): child is GameObjects.Image => child instanceof GameObjects.Image);
        items.forEach((item, index) => {
            this.tweens.add({
                targets: item, x: item.getData("originX"), alpha: 1, duration: 650, delay: index * 110, ease: "Sine.Out",
                onComplete: () => {
                    item.setData("ready", true);
                    item.setInteractive({ useHandCursor: true, draggable: true });
                    if (index === items.length - 1) {
                        this.roundActive = true;
                        this.recoverConveyorItems();
                        this.setFeedback("Seret setiap sampah ke area pengelolaan yang sesuai.");
                    }
                },
            });
        });
    }

    private handleWasteDrop(item: GameObjects.Image, screenX: number, screenY: number) {
        if (!this.roundActive || item.getData("settling")) return;
        item.setData("settling", true);
        item.disableInteractive();
        item.clearTint();
        const baseScale = item.getData("baseScale") as number;
        const x = this.toDesignX(screenX);
        const y = this.toDesignY(screenY);
        const config = item.getData("config") as WasteItemConfig;
        const bin = config.bin;
        const zone = BIN_ZONES[bin];
        const targetBin = this.getBinAt(x, y);
        const isCorrect = targetBin === bin;
        this.totalAttempts++;

        if (isCorrect) {
            playSfx(this, SFX_KEYS.quizCorrect);
            this.correctAnswers++;
            this.roundCorrect++;
            this.processedItems++;
            this.roundActive = false;
            this.flashBin(targetBin!, SUCCESS);
            this.playProcessingAnimation(bin);
            if (bin === "storage") {
                this.storageItems++;
                this.updateStorageCapacity();
            }
            this.updateProgress();
            this.setFeedback(`✓ BENAR\n${config.feedbackCorrect}`, "#1f8d52");
            this.tweens.add({
                targets: item,
                x: zone.x,
                y: zone.y,
                scaleX: baseScale * 0.3,
                scaleY: baseScale * 0.3,
                alpha: 0,
                duration: 220,
                ease: "Back.In",
                onComplete: () => {
                    item.destroy();
                    if (this.processedItems === this.totalRoundItems) {
                        this.time.delayedCall(650, () => this.completeRound());
                    } else {
                        this.time.delayedCall(350, () => {
                            this.recoverConveyorItems();
                            this.roundActive = true;
                        });
                    }
                },
            });
            return;
        }

        this.wrongAnswers++;
        this.roundWrong++;
        this.lives--;
        this.updateLives();
        if (targetBin) this.flashBin(targetBin, ERROR);
        this.setFeedback(`BELUM TEPAT\n${config.feedbackWrong}`, "#c0392b");
        playSfx(this, SFX_KEYS.quizWrong);
        item.setTint(0xffd6d1);
        this.tweens.add({
            targets: item,
            x: item.getData("originX"),
            y: item.getData("originY"),
            scaleX: baseScale,
            scaleY: baseScale,
            duration: 300,
            ease: "Back.Out",
            onComplete: () => {
                item.clearTint();
                if (this.lives > 0) {
                    item.setData("settling", false);
                    item.setInteractive({ useHandCursor: true, draggable: true });
                }
            },
        });

        if (this.lives === 0) {
            this.roundActive = false;
            this.wasteLayer.list.forEach((child) => {
                if (child instanceof GameObjects.Image) child.disableInteractive();
            });
            this.time.delayedCall(800, () => this.showFailureModal());
        }
    }

    private buildStatus() {
        const x = 1150;
        const y = 128;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.96);
        card.fillRoundedRect(x, y, 336, 74, 20);
        card.lineStyle(2, PRIMARY_BLUE, 1);
        card.strokeRoundedRect(x, y, 336, 74, 20);
        this.roundText = this.add.text(x + 24, y + 14, "RONDE 1 / 3", { fontFamily: FONT, fontStyle: "700", fontSize: 17, color: "#143a84" });
        this.progressText = this.add.text(x + 24, y + 43, "SAMPAH DIPROSES  0 / 0", { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#143a84" });
        this.progressBar = this.add.graphics();
        this.root.add([card, this.roundText, this.progressText, this.progressBar]);
    }

    private buildLives() {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.96);
        card.fillRoundedRect(DESIGN_WIDTH - 310, 24, 278, 72, 20);
        card.lineStyle(2, PRIMARY_BLUE, 1);
        card.strokeRoundedRect(DESIGN_WIDTH - 310, 24, 278, 72, 20);
        const label = this.add.text(DESIGN_WIDTH - 286, 34, "KESEMPATAN", { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: "#143a84" });
        this.lifeHearts = Array.from({ length: MAX_LIVES }, (_, index) =>
            this.add.graphics().setPosition(DESIGN_WIDTH - 171 + (index - 2) * 46, 68),
        );
        this.feedbackBackground = this.add.graphics();
        this.feedbackText = this.add.text(0, 0, "", {
            fontFamily: FONT, fontStyle: "600", fontSize: 22, color: "#143a84",
            align: "center", wordWrap: { width: 1200 },
        }).setOrigin(0.5);
        const feedback = this.add.container(DESIGN_WIDTH / 2, 990, [this.feedbackBackground, this.feedbackText]);
        this.root.add([card, label, ...this.lifeHearts, feedback]);
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

    private updateProgress() {
        const dots = Array.from({ length: this.totalRounds }, (_, index) => index < this.currentRound ? "●" : "○").join(" ");
        this.roundText.setText(`RONDE ${this.currentRound} / ${this.totalRounds}  ${dots}`);
        this.progressText.setText(`SAMPAH DIPROSES  ${this.processedItems} / ${this.totalRoundItems}`);
        this.progressBar.clear();
    }

    private updateStorageCapacity() {
        const percent = Math.min(100, this.storageItems * 15);
        const width = 180;
        const x = BIN_ZONES.storage.x - width / 2;
        this.storageCapacityText.setText(`KAPASITAS GUDANG  ${percent}%`);
        this.storageCapacityBar.clear();
        this.storageCapacityBar.fillStyle(0xdcecff, 1);
        this.storageCapacityBar.fillRoundedRect(x, 426, width, 10, 5);
        this.storageCapacityBar.fillStyle(SUCCESS, 1);
        this.storageCapacityBar.fillRoundedRect(x, 426, width * percent / 100, 10, 5);
    }

    private flashBin(bin: BinId, color: number) {
        const zone = BIN_ZONES[bin];
        const flash = this.add.graphics();
        flash.fillStyle(color, 0.16);
        flash.fillRoundedRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height, 20);
        flash.lineStyle(5, color, 0.9);
        flash.strokeRoundedRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height, 20);
        this.root.add(flash);
        this.tweens.add({ targets: flash, alpha: 0, duration: 700, ease: "Sine.Out", onComplete: () => flash.destroy() });
    }

    private playProcessingAnimation(bin: BinId) {
        const zone = BIN_ZONES[bin];
        const color = bin === "incinerator" ? 0xf59e0b : bin === "comminutor" ? PRIMARY_BLUE : SUCCESS;
        const pulse = this.add.circle(zone.x, zone.y, 20, color, 0.45);
        this.root.add(pulse);
        this.tweens.add({ targets: pulse, scaleX: 3, scaleY: 3, alpha: 0, duration: 750, ease: "Sine.Out", onComplete: () => pulse.destroy() });
        if (bin === "comminutor") {
            this.tweens.add({ targets: pulse, x: zone.x + 6, yoyo: true, repeat: 3, duration: 55 });
        }
    }

    private getBinAt(x: number, y: number): BinId | undefined {
        return (Object.keys(BIN_ZONES) as BinId[]).find((candidate) => {
            const zone = BIN_ZONES[candidate];
            return x >= zone.x - zone.width / 2 && x <= zone.x + zone.width / 2 && y >= zone.y - zone.height / 2 && y <= zone.y + zone.height / 2;
        });
    }

    private updateDropHover(bin?: BinId) {
        if (bin === this.hoveredBin) return;
        this.hoveredBin = bin;
        this.hoverHighlight?.destroy();
        this.hoverHighlight = undefined;
        if (!bin) return;
        const zone = BIN_ZONES[bin];
        const highlight = this.add.graphics();
        highlight.fillStyle(SUCCESS, 0.12);
        highlight.fillRoundedRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height, 20);
        highlight.lineStyle(4, SUCCESS, 0.9);
        highlight.strokeRoundedRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height, 20);
        this.root.add(highlight);
        this.hoverHighlight = highlight;
    }

    /** Keeps unprocessed conveyor items visible after a tween or interrupted
     * pointer gesture. Processed items are destroyed and therefore excluded. */
    private recoverConveyorItems() {
        this.wasteLayer.list.forEach((child) => {
            if (!(child instanceof GameObjects.Image) || child.getData("settling") || !child.getData("ready")) return;
            child.setVisible(true).setAlpha(1);
            if (child.x < 0 || child.x > DESIGN_WIDTH || child.y < 0 || child.y > DESIGN_HEIGHT) {
                child.setPosition(child.getData("originX"), child.getData("originY"));
            }
        });
    }

    private showDragLabel(item: GameObjects.Image) {
        this.destroyDragLabel();
        const config = item.getData("config") as WasteItemConfig;
        const background = this.add.graphics();
        const name = this.add.text(0, 0, config.name.toUpperCase(), { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: "#143a84" }).setOrigin(0.5, 0);
        const category = this.add.text(0, name.height + 3, config.category, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: "#4a5b78" }).setOrigin(0.5, 0);
        const width = Math.max(name.width, category.width) + 28;
        const height = name.height + category.height + 16;
        background.fillStyle(0xffffff, 0.97);
        background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        background.lineStyle(2, PRIMARY_BLUE, 1);
        background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.dragLabel = this.add.container(item.x, item.y - 62, [background, name, category]);
        this.wasteLayer.add(this.dragLabel);
    }

    private positionDragLabel(item: GameObjects.Image) {
        this.dragLabel?.setPosition(item.x, item.y - 62);
    }

    private destroyDragLabel() {
        this.dragLabel?.destroy();
        this.dragLabel = undefined;
    }

    private restartRound() {
        this.startRound(this.currentRound);
    }

    private completeRound() {
        this.roundActive = false;
        if (this.currentRound < this.totalRounds) {
            this.showRoundCompleteModal();
            return;
        }
        this.showFinalModal();
    }

    private getAccuracy() {
        return this.totalAttempts ? Math.round(this.correctAnswers / this.totalAttempts * 100) : 0;
    }

    private showFailureModal() {
        this.showSimpleModal("SIMULASI BELUM BERHASIL", "Kamu masih melakukan beberapa kesalahan dalam menentukan pengelolaan sampah.", "COBA LAGI", ERROR, () => this.restartRound());
    }

    private showRoundCompleteModal() {
        const accuracy = this.roundCorrect + this.roundWrong ? Math.round(this.roundCorrect / (this.roundCorrect + this.roundWrong) * 100) : 0;
        this.showSimpleModal(`RONDE ${this.currentRound} SELESAI`, `✓ ${this.processedItems} Sampah Diproses\n✓ Akurasi ${accuracy}%\n✓ Pemilahan Selesai`, `LANJUT RONDE ${this.currentRound + 1}`, SUCCESS, () => this.startRound(this.currentRound + 1));
    }

    private showFinalModal() {
        this.showSimpleModal(
            "SIMULASI SELESAI",
            `PEMILAHAN SAMPAH DI KAPAL\n\nAKURASI  ${this.getAccuracy()}%\nBENAR  ${this.correctAnswers}     SALAH  ${this.wrongAnswers}\nRONDE SELESAI  3 / 3\n\n✓ Mengenali jenis sampah\n✓ Menentukan proses pengelolaan\n✓ Menggunakan Incinerator dengan tepat\n✓ Menggunakan Comminutor dengan tepat\n✓ Menentukan sampah yang harus disimpan\n\nKamu telah menyelesaikan simulasi pemilahan dan pengelolaan sampah di kapal.`,
            "SELESAI",
            SUCCESS,
            () => { unlockNextModuleAfter("simulator-stabilitas"); this.goTo("MainMenu"); },
            true,
            "ULANGI SIMULASI",
            () => {
                this.correctAnswers = 0;
                this.wrongAnswers = 0;
                this.totalAttempts = 0;
                this.startRound(1);
            },
        );
    }

    /** Shown once every waste item has been sorted correctly. Unlocks the
     * next module in the MainMenu chain and hands the player back to
     * MainMenu — this scene has no quiz of its own, so finishing the
     * drag-and-drop activity is the module's sole completion signal. */
    private showSimpleModal(titleLabel: string, messageLabel: string, buttonLabel: string, accent: number, onContinue: () => void, large = false, secondaryLabel?: string, onSecondary?: () => void) {
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

        const panelWidth = large ? 680 : 620;
        const radius = 32;
        const badgeRadius = large ? 44 : 40;
        const detailCardHeight = 102;
        const buttonHeight = 54;

        // Measure text heights first (position doesn't matter yet) so the
        // panel can be sized to fit its content with consistent margins,
        // instead of relying on a fixed height that clips or crowds items.
        const title = this.add
            .text(centerX, 0, titleLabel, { fontFamily: FONT, fontStyle: "800", fontSize: 28, color: "#143a84" })
            .setOrigin(0.5, 0);
        const isRoundComplete = titleLabel.startsWith("RONDE");
        const context = isRoundComplete
            ? this.add.text(centerX, 0, "PEMILAHAN SAMPAH DI KAPAL", { fontFamily: FONT, fontStyle: "700", fontSize: 13, color: "#087ff1", letterSpacing: 1 }).setOrigin(0.5, 0)
            : undefined;
        const message = this.add
            .text(centerX, 0, messageLabel, {
                fontFamily: FONT, fontStyle: "600", fontSize: large ? 15 : 16, color: "#4a5b78", align: "center", lineSpacing: 6,
                wordWrap: { width: panelWidth - 64 },
            })
            .setOrigin(0.5, 0);

        // Lay out everything from the top of the panel downward using
        // explicit margins between each block.
        const badgeTop = 56;
        const badgeY = badgeTop + badgeRadius;
        const titleTop = badgeTop + badgeRadius * 2 + 8 /* badge ring */ + 32 /* badge -> title */;
        let cursor = titleTop + title.height;

        let contextTop: number | undefined;
        if (context) {
            contextTop = cursor + 12;
            cursor = contextTop + context.height + 22;
        } else {
            cursor += 24;
        }

        const detailTop = cursor;
        const contentBottom = large ? detailTop + message.height : detailTop + detailCardHeight;
        const buttonY = contentBottom + 36 + buttonHeight / 2;
        const panelHeight = buttonY + buttonHeight / 2 + 56;
        const panelTop = centerY - panelHeight / 2;

        // Soft layered elevation instead of a single flat drop shadow.
        const shadow = this.add.graphics();
        shadow.fillStyle(0x081a33, 0.06);
        shadow.fillRoundedRect(centerX - panelWidth / 2 - 6, panelTop + 18, panelWidth + 12, panelHeight, radius + 6);
        shadow.fillStyle(0x081a33, 0.1);
        shadow.fillRoundedRect(centerX - panelWidth / 2, panelTop + 10, panelWidth, panelHeight, radius);

        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 1);
        panel.fillRoundedRect(centerX - panelWidth / 2, panelTop, panelWidth, panelHeight, radius);
        panel.lineStyle(2, PRIMARY_BLUE, 0.45);
        panel.strokeRoundedRect(centerX - panelWidth / 2, panelTop, panelWidth, panelHeight, radius);

        const accentLine = this.add.graphics();
        accentLine.fillStyle(accent, 1);
        accentLine.fillRoundedRect(centerX - 34, panelTop + 24, 68, 5, 3);

        const badgeRing = this.add.circle(centerX, panelTop + badgeY, badgeRadius + 8, accent, 0.12);
        const badge = this.add.circle(centerX, panelTop + badgeY, badgeRadius, accent, 1);
        const check = this.add.text(centerX, panelTop + badgeY, "✓", { fontFamily: FONT, fontStyle: "700", fontSize: 44, color: "#ffffff" }).setOrigin(0.5);

        title.setY(panelTop + titleTop);
        context?.setY(panelTop + (contextTop as number));

        const detailCard = this.add.graphics();
        if (!large) {
            detailCard.fillStyle(0xeaf3ff, 1);
            detailCard.fillRoundedRect(centerX - 235, panelTop + detailTop, 470, detailCardHeight, 16);
            detailCard.lineStyle(2, 0xb8d5ff, 1);
            detailCard.strokeRoundedRect(centerX - 235, panelTop + detailTop, 470, detailCardHeight, 16);
        }
        message.setY(panelTop + detailTop + (large ? 0 : 17));
        const hasSecondary = !!(secondaryLabel && onSecondary);
        const primaryWidth = hasSecondary ? 260 : 280;
        const secondaryWidth = 230;
        const buttonGap = 32;
        let primaryX = centerX;
        let secondaryX = centerX;
        if (hasSecondary) {
            const totalWidth = primaryWidth + buttonGap + secondaryWidth;
            const leftEdge = centerX - totalWidth / 2;
            primaryX = leftEdge + primaryWidth / 2;
            secondaryX = leftEdge + primaryWidth + buttonGap + secondaryWidth / 2;
        }

        const button = new Button(this, {
            x: primaryX,
            y: panelTop + buttonY,
            width: primaryWidth,
            height: 54,
            text: buttonLabel,
            fontFamily: FONT,
            fontStyle: "600",
            fontSize: 16,
            borderRadius: 27,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        const contents: GameObjects.GameObject[] = [overlay, shadow, panel, accentLine, badgeRing, badge, check, title, detailCard, message, button.view];
        if (context) contents.push(context);
        let secondaryButton: Button | undefined;
        if (hasSecondary) {
            secondaryButton = new Button(this, {
                x: secondaryX,
                y: panelTop + buttonY,
                width: secondaryWidth,
                height: 54,
                text: secondaryLabel!,
                fontFamily: FONT,
                fontStyle: "600",
                fontSize: 16,
                borderRadius: 27,
                fillColor: 0xffffff,
                strokeColor: PRIMARY_BLUE,
                strokeWidth: 2,
                textColor: "#087ff1",
            });
            contents.push(secondaryButton.view);
        }
        button.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            modal.destroy();
            onContinue();
        });
        secondaryButton?.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            modal.destroy();
            onSecondary!();
        });

        const modal = this.add.container(0, 0, contents).setDepth(200);
        this.root.add(modal);
        modal.setAlpha(0);
        modal.setScale(0.92);
        this.tweens.add({ targets: modal, alpha: 1, scaleX: 1, scaleY: 1, duration: 220, ease: "Back.Out" });
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
