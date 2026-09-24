import { GameObjects, Input, Tweens } from "phaser";

import { Button } from "../../../../../component/Button/Button";
import { SOPEPStep, SOPEPStepContext } from "../../core/StepTypes";
import { EquipmentCard } from "./EquipmentCard";
import { EquipmentSlot } from "./EquipmentSlot";
import { createEquipmentStorageView, createScenarioInfoPanel, createSelectionGuidePanel } from "./PreparationPanels";
import { EQUIPMENT_CONFIG, EquipmentConfig, SLOT_COUNT, getEquipment, resolveScenario, validateEquipmentSelection } from "./preparationConfig";
import { BLUE, FONT, GREEN, ORANGE, addPanelHeader, drawPanel } from "./preparationUi";

const PICKER = { x: 1147, y: 251, width: 740, height: 451 };
const LIST = { x: 34, y: 722, width: 1031, height: 240 };
const SCENARIO = { x: 1078, y: 722, width: 418, height: 240 };
const GUIDE = { x: 1506, y: 722, width: 380, height: 240 };
const SLOT = { width: 145, height: 112, pitch: 163, top: 72 };
const CARD = { columns: 4, width: 167, height: 152, gap: 12, top: 118 };
const DRAG_THRESHOLD = 12;

/** Step 3 — choose SOPEP equipment for the case recorded in Step 1. The
 * selection lives in SimulationState (ids only); the Phaser objects below are
 * rebuilt from it, so leaving and re-entering the step restores everything. */
export class PreparationStep implements SOPEPStep {
    readonly id = 3;
    readonly key = "preparation";
    readonly title = "Persiapan Penanganan";

    private context!: SOPEPStepContext;
    private slots: EquipmentSlot[] = [];
    private slotsView: GameObjects.Container | null = null;
    private notice = "";
    private press: { config: EquipmentConfig; startX: number; startY: number } | null = null;
    private ghost: GameObjects.Image | null = null;
    private activeTweens: Tweens.Tween[] = [];
    private listening = false;

    create(context: SOPEPStepContext) { this.context = context; }

    enter() {
        this.attachListeners();
        this.render();
    }

    exit() { this.clearRuntime(); }

    reset() {
        this.clearRuntime();
        this.context.state.resetPreparation();
        this.notice = "";
        this.attachListeners();
        this.context.refreshSharedUi();
        this.render();
    }

    isComplete() { return this.context.state.isPreparationComplete(); }

    destroy() {
        this.clearRuntime();
        this.context.container.removeAll(true);
    }

    private get selected() { return this.context.state.data.preparation.selectedEquipment; }
    private get locked() { return this.context.state.data.preparation.confirmed; }

    private render() {
        const { scene, container, state } = this.context;
        this.slots = [];
        this.slotsView = null;
        container.removeAll(true);

        createEquipmentStorageView(scene, container);
        this.createPicker();
        this.createSelectedPanel();
        createScenarioInfoPanel(scene, container, SCENARIO.x, SCENARIO.y, SCENARIO.width, SCENARIO.height, state.data.incident);
        createSelectionGuidePanel(scene, container, GUIDE.x, GUIDE.y, GUIDE.width, GUIDE.height);
        this.createFeedback();
        this.createActions();
    }

    private createPicker() {
        const { scene, container } = this.context;
        container.add(drawPanel(scene, PICKER.x, PICKER.y, PICKER.width, PICKER.height));
        addPanelHeader(scene, container, PICKER.x + 18, PICKER.y + 16, "≡", "PILIH PERALATAN YANG DIBUTUHKAN");
        container.add(scene.add.text(PICKER.x + 76, PICKER.y + 68, "Pilih peralatan yang sesuai dengan kondisi tumpahan minyak pada skenario ini.\nSeret peralatan ke area persiapan di bawah, atau cukup klik peralatannya.", { fontFamily: FONT, fontStyle: "500", fontSize: 13, color: "#315f88", lineSpacing: 3 }));

        EQUIPMENT_CONFIG.forEach((config, index) => {
            const x = PICKER.x + 18 + (index % CARD.columns) * (CARD.width + CARD.gap);
            const y = PICKER.y + CARD.top + Math.floor(index / CARD.columns) * (CARD.height + CARD.gap);
            const card = new EquipmentCard(scene, config, x, y, CARD.width, CARD.height, this.selected.includes(config.id), this.locked, (item, pointer) => this.onCardPress(item, pointer));
            container.add(card.view);
        });
    }

    private createSelectedPanel() {
        const { scene, container } = this.context;
        this.slotsView = scene.add.container(0, 0);
        this.slotsView.add(drawPanel(scene, LIST.x, LIST.y, LIST.width, LIST.height));
        addPanelHeader(scene, this.slotsView, LIST.x + 18, LIST.y + 14, "≡", "DAFTAR PERALATAN TERPILIH");
        for (let index = 0; index < SLOT_COUNT; index++) {
            const equipment = getEquipment(this.selected[index] ?? "") ?? null;
            const slot = new EquipmentSlot(scene, index, LIST.x + 26 + index * SLOT.pitch, LIST.y + SLOT.top, SLOT.width, SLOT.height, equipment, this.locked, () => this.removeEquipment(this.selected[index]));
            this.slots.push(slot);
            this.slotsView.add(slot.view);
        }
        container.add(this.slotsView);
    }

    private createFeedback() {
        const { scene, container, state } = this.context;
        const result = state.data.preparation.validationResult;
        const message = this.notice
            ? { status: "unnecessary" as const, title: "PERHATIAN", message: this.notice }
            : result;
        if (!message) return;
        const color = message.status === "success" ? GREEN : ORANGE;
        const box = scene.add.graphics();
        box.fillStyle(message.status === "success" ? 0xebf8ef : 0xfff5e3, 0.98);
        box.fillRoundedRect(34, 978, 850, 66, 14);
        box.lineStyle(2, color, 1);
        box.strokeRoundedRect(34, 978, 850, 66, 14);
        const title = scene.add.text(54, 990, message.title, { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: message.status === "success" ? "#1f8d52" : "#b45f06" });
        const body = scene.add.text(54, 1012, message.message, { fontFamily: FONT, fontStyle: "600", fontSize: 13, color: "#26456f", wordWrap: { width: 810 } });
        container.add([box, title, body]);
    }

    private createActions() {
        const { scene, container } = this.context;
        const reset = new Button(scene, { x: 1128, y: 1012, width: 450, height: 56, text: "RESET PILIHAN", fillColor: 0x8592a6, strokeAlpha: 0, textColor: "#ffffff", fontFamily: FONT, fontStyle: "800", fontSize: 16, borderRadius: 28, hoverAnimation: "scale", hoverScale: 1.02 });
        reset.on("pointerdown", () => this.reset());
        const confirmed = this.locked;
        const confirm = new Button(scene, { x: 1616, y: 1012, width: 500, height: 56, text: confirmed ? "LANJUT KE PENGENDALIAN  →" : "✓  KONFIRMASI PERALATAN  →", fillColor: confirmed ? GREEN : BLUE, strokeAlpha: 0, fontFamily: FONT, fontStyle: "800", fontSize: 16, borderRadius: 28, hoverAnimation: "scale", hoverScale: 1.02 });
        confirm.on("pointerdown", () => (confirmed ? this.context.goToStep(4) : this.confirmSelection()));
        container.add([reset.view, confirm.view]);
    }

    // ── selection ────────────────────────────────────────────────

    private addEquipment(id: string) {
        const { state } = this.context;
        if (this.locked) return false;
        if (this.selected.includes(id)) return false;
        if (this.selected.length >= SLOT_COUNT) {
            this.notice = "Daftar peralatan sudah penuh. Hapus salah satu peralatan terlebih dahulu.";
            this.render();
            return false;
        }
        this.notice = "";
        state.addEquipment(id);
        this.render();
        this.slots[this.selected.length - 1]?.playPlace();
        return true;
    }

    private removeEquipment(id: string | undefined) {
        if (!id || this.locked) return;
        this.notice = "";
        this.context.state.removeEquipment(id);
        this.render();
    }

    private confirmSelection() {
        const { state } = this.context;
        const result = validateEquipmentSelection(this.selected, resolveScenario(state.data.incident));
        this.notice = "";
        state.setPreparationResult(result);
        if (result.status === "success") {
            state.confirmPreparation();
            this.context.completeCurrentStep();
            this.context.refreshSharedUi();
        }
        this.render();
        if (result.status === "success") this.pulseSlots();
        else this.shakeSlots();
    }

    // ── click / drag ─────────────────────────────────────────────

    private onCardPress(config: EquipmentConfig, pointer: Input.Pointer) {
        const local = this.toLocal(pointer);
        this.press = { config, startX: local.x, startY: local.y };
    }

    private readonly handleMove = (pointer: Input.Pointer) => {
        if (!this.press) return;
        const local = this.toLocal(pointer);
        if (!this.ghost) {
            const moved = Math.hypot(local.x - this.press.startX, local.y - this.press.startY);
            if (moved < DRAG_THRESHOLD || this.selected.includes(this.press.config.id)) return;
            this.startDrag(this.press.config, local);
        }
        this.ghost?.setPosition(local.x, local.y);
        this.highlightDropSlot(this.isOverList(local.x, local.y));
    };

    private readonly handleUp = (pointer: Input.Pointer) => {
        const press = this.press;
        this.press = null;
        if (!press) return;
        if (!this.ghost) {
            // Plain click/tap: toggle the equipment.
            if (this.selected.includes(press.config.id)) this.removeEquipment(press.config.id);
            else this.addEquipment(press.config.id);
            return;
        }
        const local = this.toLocal(pointer);
        const dropped = this.isOverList(local.x, local.y);
        this.endDrag();
        if (dropped) this.addEquipment(press.config.id);
    };

    private startDrag(config: EquipmentConfig, at: { x: number; y: number }) {
        const { scene, container } = this.context;
        this.ghost = scene.add.image(at.x, at.y, config.dragKey).setScale(1.06).setAlpha(0.9).setDepth(1000);
        container.add(this.ghost);
        container.bringToTop(this.ghost);
        scene.input.setDefaultCursor("grabbing");
    }

    private endDrag() {
        this.ghost?.destroy();
        this.ghost = null;
        this.context.scene.input.setDefaultCursor("default");
        this.highlightDropSlot(false);
    }

    private isOverList(x: number, y: number) {
        return x >= LIST.x && x <= LIST.x + LIST.width && y >= LIST.y && y <= LIST.y + LIST.height;
    }

    /** The first empty slot lights up: that is where a drop will land. */
    private highlightDropSlot(on: boolean) {
        this.slots.forEach((slot) => slot.setHighlight(false));
        if (on) this.slots.find((slot) => slot.isEmpty)?.setHighlight(true);
    }

    private toLocal(pointer: Input.Pointer) {
        return this.context.container.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    }

    // ── feedback animation ───────────────────────────────────────

    private pulseSlots() {
        if (!this.slotsView) return;
        this.slots.forEach((slot) => {
            if (slot.isEmpty) return;
            this.activeTweens.push(this.context.scene.tweens.add({ targets: slot.view, scale: 1.05, duration: 160, yoyo: true, ease: "Sine.InOut" }));
        });
    }

    private shakeSlots() {
        if (!this.slotsView) return;
        this.activeTweens.push(this.context.scene.tweens.add({ targets: this.slotsView, x: { from: -6, to: 6 }, duration: 55, yoyo: true, repeat: 2, onComplete: () => this.slotsView?.setX(0) }));
    }

    // ── lifecycle ────────────────────────────────────────────────

    private attachListeners() {
        if (this.listening) return;
        const input = this.context.scene.input;
        input.on("pointermove", this.handleMove);
        input.on("pointerup", this.handleUp);
        input.on("pointerupoutside", this.handleUp);
        this.listening = true;
    }

    private clearRuntime() {
        if (this.listening) {
            const input = this.context.scene.input;
            input.off("pointermove", this.handleMove);
            input.off("pointerup", this.handleUp);
            input.off("pointerupoutside", this.handleUp);
            this.listening = false;
        }
        this.press = null;
        this.endDrag();
        this.activeTweens.forEach((tween) => tween.stop());
        this.activeTweens = [];
    }
}
