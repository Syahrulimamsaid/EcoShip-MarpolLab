import { GameObjects, Tweens } from "phaser";

import { Button } from "../../../../../component/Button/Button";
import { createActionChecklist } from "../../components/ActionChecklist";
import { showFeedbackToast } from "../../components/FeedbackToast";
import { createHotspotCallout } from "../../components/HotspotCallout";
import { HotspotKeys, HotspotState, InteractiveHotspot } from "../../components/InteractiveHotspot";
import { createIncidentStatusPanel } from "../../components/IncidentStatusPanel";
import { SOPEP_STEP4_ASSET_KEYS } from "../../config/assetKeys";
import { SOPEPStep, SOPEPStepContext } from "../../core/StepTypes";
import { CHECKLIST_ITEMS, ControlHotspotConfig, NormalizedZone, SEQUENCE_WARNINGS, STEP4_EFFECTS, STEP4_HOTSPOTS, findBlockingFlag } from "./controlConfig";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const PANEL = { x: 1408, y: 251, width: 480, height: 784 };
const BLUE = 0x1774e8;
const GREEN = 0x1f8d52;
const ORANGE = 0xf59a23;
const TOAST = { x: 700, y: 300 };

const HOTSPOT_KEYS: HotspotKeys = {
    idle: SOPEP_STEP4_ASSET_KEYS.hotspot,
    active: SOPEP_STEP4_ASSET_KEYS.hotspotActive,
    pulse: SOPEP_STEP4_ASSET_KEYS.hotspotPulse,
};

/** Step 4 — point-and-click control procedure on the deck illustration.
 * Progress lives in `SimulationState.control`; the Phaser tree is rebuilt from
 * it, so leaving and returning to the step restores every completed action. */
export class ControlStep implements SOPEPStep {
    readonly id = 4;
    readonly key = "control";
    readonly title = "Pengendalian";

    private context!: SOPEPStepContext;
    private activeTweens: Tweens.Tween[] = [];

    create(context: SOPEPStepContext) { this.context = context; }
    enter() { this.render(); }
    exit() { this.clearRuntime(); }

    reset() {
        this.clearRuntime();
        this.context.state.resetControl();
        this.context.refreshSharedUi();
        this.render();
    }

    isComplete() { return this.context.state.isControlComplete(); }

    destroy() {
        this.clearRuntime();
        this.context.container.removeAll(true);
    }

    /** Normalized illustration coordinate → design pixels. */
    private px(x: number, y: number) { return { x: x * DESIGN_WIDTH, y: y * DESIGN_HEIGHT }; }

    private render(animate?: string) {
        const { scene, container, state } = this.context;
        this.stopTweens();
        container.removeAll(true);
        const control = state.data.control;

        container.add(scene.add.image(0, 0, SOPEP_STEP4_ASSET_KEYS.background).setOrigin(0, 0).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT));
        this.addOilEffects(animate === "absorbent");
        if (control.scupperClosed) this.addDrainCover(animate === "scupper");
        STEP4_HOTSPOTS.forEach((hotspot) => {
            if (control[hotspot.flag]) this.addZoneRing(hotspot.zone, animate === hotspot.id);
        });
        if (animate === "source") this.spinValveWheel();

        STEP4_HOTSPOTS.forEach((hotspot) => this.addHotspot(hotspot));
        this.createSidePanel();
    }

    // ── scene effects ────────────────────────────────────────────

    private addOilEffects(fadeLighten: boolean) {
        const { scene, container, state } = this.context;
        const pool = STEP4_EFFECTS.pool;
        const center = this.px(pool.x, pool.y);
        const shimmer = scene.add.ellipse(center.x, center.y, pool.rx * 2 * DESIGN_WIDTH, pool.ry * 2 * DESIGN_HEIGHT, 0xffffff, 0.05);
        container.add(shimmer);
        this.activeTweens.push(scene.tweens.add({ targets: shimmer, alpha: 0.16, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.InOut" }));
        if (state.data.control.absorbentApplied) {
            // The pool is only lightened, never removed: absorbing is not cleaning up.
            const lighten = scene.add.ellipse(center.x, center.y, pool.rx * 2 * DESIGN_WIDTH * 0.9, pool.ry * 2 * DESIGN_HEIGHT * 0.9, 0xcfe0f2, fadeLighten ? 0 : 0.2);
            container.add(lighten);
            if (fadeLighten) this.activeTweens.push(scene.tweens.add({ targets: lighten, alpha: 0.2, duration: 900, ease: "Sine.Out" }));
        }
    }

    private addDrainCover(animate: boolean) {
        const { scene, container } = this.context;
        const cover = STEP4_EFFECTS.drainCover;
        const target = this.px(cover.x, cover.y);
        const image = scene.add.image(target.x, target.y, SOPEP_STEP4_ASSET_KEYS.drainCover);
        image.setScale((cover.width * DESIGN_WIDTH) / image.width);
        container.add(image);
        if (animate) {
            const scale = image.scale;
            image.setAlpha(0).setY(target.y - 60).setScale(scale * 1.15);
            this.activeTweens.push(scene.tweens.add({ targets: image, alpha: 1, y: target.y, scale, duration: 420, ease: "Bounce.Out" }));
        }
    }

    /** A green outline is drawn around the completed area, progressively when it was just completed. */
    private addZoneRing(zone: NormalizedZone, animate: boolean) {
        const { scene, container } = this.context;
        const center = this.px(zone.x, zone.y);
        const rx = zone.rx * DESIGN_WIDTH;
        const ry = zone.ry * DESIGN_HEIGHT;
        const ring = scene.add.graphics({ x: center.x, y: center.y });
        container.add(ring);
        const draw = (progress: number) => {
            const steps = 72;
            ring.clear();
            ring.lineStyle(4, GREEN, 0.85);
            ring.beginPath();
            for (let i = 0; i <= steps * progress; i++) {
                const angle = -Math.PI / 2 + (i / steps) * Math.PI * 2;
                const x = Math.cos(angle) * rx;
                const y = Math.sin(angle) * ry;
                if (i === 0) ring.moveTo(x, y); else ring.lineTo(x, y);
            }
            ring.strokePath();
        };
        if (!animate) { draw(1); return; }
        draw(0);
        this.activeTweens.push(this.context.scene.tweens.addCounter({ from: 0, to: 1, duration: 800, ease: "Sine.Out", onUpdate: (tween) => draw(tween.getValue() ?? 1) }));
    }

    private spinValveWheel() {
        const { scene, container } = this.context;
        const wheel = STEP4_EFFECTS.valveWheel;
        const at = this.px(wheel.x, wheel.y);
        const image = scene.add.ellipse(at.x, at.y, 88, 26, 0xd62f2f, 0.9).setStrokeStyle(3, 0xffffff, 0.9);
        container.add(image);
        this.activeTweens.push(scene.tweens.add({ targets: image, scaleX: 0.25, duration: 220, yoyo: true, repeat: 3, ease: "Sine.InOut", onComplete: () => image.destroy() }));
    }

    // ── hotspots ─────────────────────────────────────────────────

    private addHotspot(hotspot: ControlHotspotConfig) {
        const { scene, container, state } = this.context;
        const target = this.px(hotspot.anchor.x, hotspot.anchor.y);
        const complete = state.data.control[hotspot.flag];
        const hotspotState: HotspotState = complete ? "complete" : "idle";
        const calloutX = Math.max(10, Math.min(target.x + hotspot.callout.dx, PANEL.x - 236 - 16));
        const calloutY = Math.max(240, Math.min(target.y + hotspot.callout.dy, DESIGN_HEIGHT - 94));
        container.add(createHotspotCallout(scene, {
            x: calloutX, y: calloutY, targetX: target.x, targetY: target.y,
            title: hotspot.title, description: complete ? hotspot.doneText : hotspot.description, complete,
            onClick: () => this.perform(hotspot),
        }));
        container.add(new InteractiveHotspot(scene, target.x, target.y, hotspotState, () => this.perform(hotspot), HOTSPOT_KEYS).view);
    }

    private perform(hotspot: ControlHotspotConfig) {
        const { state } = this.context;
        if (state.data.control[hotspot.flag]) return;
        const blocker = findBlockingFlag(state.data.control, hotspot.flag);
        if (blocker) {
            this.toast("URUTAN PROSEDUR", SEQUENCE_WARNINGS[blocker] ?? "Selesaikan tindakan sebelumnya terlebih dahulu.", ORANGE);
            return;
        }

        state.setControlFlag(hotspot.flag);
        const finished = state.isControlComplete();
        if (finished) {
            state.markControlCompleted();
            this.context.completeCurrentStep();
        }
        this.context.refreshSharedUi();
        this.render(hotspot.id);
        this.popHotspot(hotspot);

        if (finished) this.toast("PENGENDALIAN SELESAI", "Seluruh tindakan pengendalian telah dilakukan.", GREEN);
        else this.toast(hotspot.title, `✓ ${this.successMessage(hotspot)}`, GREEN);
    }

    private successMessage(hotspot: ControlHotspotConfig) {
        if (hotspot.action !== "equipment") return hotspot.success;
        const count = this.context.state.data.preparation.selectedEquipment.length;
        return count > 0 ? `${count} peralatan dari Step 3 siap digunakan.` : hotspot.success;
    }

    private popHotspot(hotspot: ControlHotspotConfig) {
        // The last-added hotspot view for this config is found by position.
        const target = this.px(hotspot.anchor.x, hotspot.anchor.y);
        const view = this.context.container.list.find((item) => item instanceof GameObjects.Container && Math.abs(item.x - target.x) < 1 && Math.abs(item.y - target.y) < 1) as GameObjects.Container | undefined;
        if (view) this.activeTweens.push(this.context.scene.tweens.add({ targets: view, scale: { from: 1.3, to: 1 }, duration: 260, ease: "Back.Out" }));
    }

    private toast(title: string, message: string, color: number) {
        showFeedbackToast(this.context.scene, this.context.container, TOAST.x, TOAST.y, title, message, color);
    }

    // ── side panel ───────────────────────────────────────────────

    private createSidePanel() {
        const { scene, container, state } = this.context;
        const done = state.isControlComplete();
        const panel = scene.add.graphics();
        panel.fillStyle(0xffffff, 0.97);
        panel.fillRoundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 18);
        panel.lineStyle(2, 0xbcd9ff, 1);
        panel.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 18);
        container.add(panel);

        const x = PANEL.x + 16;
        const width = PANEL.width - 32;
        createIncidentStatusPanel(scene, container, x, PANEL.y + 16, width, state.data.incident, done ? { text: "PENGENDALIAN SELESAI", color: "#1f8d52" } : { text: "DALAM PENGENDALIAN", color: "#e88a00" });
        const control = state.data.control;
        createActionChecklist(scene, container, x, PANEL.y + 274, width, "TINDAKAN PENGENDALIAN", CHECKLIST_ITEMS.map((item) => ({ label: item.label, done: control[item.flag] })));

        const next = new Button(scene, { x: PANEL.x + PANEL.width / 2, y: PANEL.y + PANEL.height - 58, width: width, height: 66, text: "LANJUT  →", fillColor: done ? BLUE : 0xa7adb8, strokeAlpha: 0, fontFamily: '"Plus Jakarta Sans", Arial, sans-serif', fontStyle: "800", fontSize: 22, borderRadius: 33, hoverAnimation: done ? "scale" : "none", hoverScale: 1.02, disabled: !done });
        if (done) next.on("pointerdown", () => { this.context.completeCurrentStep(); this.context.goToStep(5); });
        container.add(next.view);
    }

    private stopTweens() {
        this.activeTweens.forEach((tween) => tween.stop());
        this.activeTweens = [];
    }

    private clearRuntime() {
        this.stopTweens();
    }
}
