import { Math as PhaserMath } from "phaser";

import { BORDER_BLUE } from "../../../../../component/ModulePanel/ModulePanel";
import { SOPEP_ASSET_KEYS } from "../../config/assetKeys";
import { IdentificationPointId } from "../../core/SimulationState";
import { SOPEPStep, SOPEPStepContext } from "../../core/StepTypes";
import { createEmergencyPanel } from "../../components/EmergencyPanel";
import { showFeedbackToast } from "../../components/FeedbackToast";
import { createHotspotCallout } from "../../components/HotspotCallout";
import { HotspotState, InteractiveHotspot } from "../../components/InteractiveHotspot";
import { IDENTIFICATION_POINTS } from "./identificationConfig";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

/** Step 1 owns only its state transitions and visual tree. The simulator
 * scene owns navigation, shared header/progress, and the global state. */
export class IdentificationStep implements SOPEPStep {
    readonly id = 1;
    readonly key = "identification";
    readonly title = "Identifikasi Insiden";

    private context!: SOPEPStepContext;
    private started = false;
    private activePoint: IdentificationPointId | null = null;
    private pendingTimers: Phaser.Time.TimerEvent[] = [];

    create(context: SOPEPStepContext) {
        this.context = context;
    }

    enter() {
        this.started = this.started || this.context.state.data.completedSteps.includes(this.id);
        this.render();
    }

    exit() {
        this.clearTimers();
    }

    reset() {
        this.clearTimers();
        this.context.state.resetIdentification();
        this.started = false;
        this.activePoint = null;
        this.context.refreshSharedUi();
        this.render();
    }

    isComplete() {
        return this.context.state.isIdentificationComplete();
    }

    destroy() {
        this.clearTimers();
        this.context.container.removeAll(true);
    }

    private render() {
        const { scene, container } = this.context;
        container.removeAll(true);
        const panelWidth = 450;
        const padding = 28;
        const visualX = padding;
        const visualY = 248;
        const visualW = DESIGN_WIDTH - panelWidth - padding * 3;
        const visualH = DESIGN_HEIGHT - visualY - 34;
        const panelX = visualX + visualW + padding;

        this.createDeckScene(visualX, visualY, visualW, visualH);
        createEmergencyPanel(scene, container, panelX, visualY, panelWidth, visualH, this.context.state, {
            started: this.started,
            onStart: () => {
                this.started = true;
                this.render();
            },
            onNext: () => {
                this.context.completeCurrentStep();
                this.context.goToStep(2);
            },
        });
    }

    private createDeckScene(x: number, y: number, width: number, height: number) {
        const { scene, container } = this.context;
        const frame = scene.add.graphics();
        frame.fillStyle(0xffffff, 1);
        frame.fillRoundedRect(x, y, width, height, 18);
        frame.lineStyle(2, BORDER_BLUE, 1);
        frame.strokeRoundedRect(x, y, width, height, 18);
        container.add(frame);

        const inset = 14;
        const deckX = x + inset;
        const deckY = y + inset;
        const deckW = width - inset * 2;
        const deckH = height - inset * 2;
        // The supplied main-deck illustration already contains the fuel drums,
        // leaking pipe, oil pool, scupper and lifebuoy. Keep it as one visual
        // composition and layer only the learning UI above it.
        this.addAsset(SOPEP_ASSET_KEYS.background, deckX, deckY, deckW, deckH);

        if (!this.started) {
            const notice = scene.add.text(x + width / 2, y + height / 2, "AMATI AREA KEJADIAN\nSEBELUM MEMULAI IDENTIFIKASI", {
                fontFamily: '"Plus Jakarta Sans", Arial, sans-serif', fontStyle: "800", fontSize: 22, color: "#ffffff", align: "center", lineSpacing: 8,
                backgroundColor: "#143a84cc", padding: { left: 30, right: 30, top: 20, bottom: 20 },
            }).setOrigin(0.5);
            container.add(notice);
            return;
        }

        IDENTIFICATION_POINTS.forEach((point) => {
            const targetX = deckX + point.anchor.x * deckW;
            const targetY = deckY + point.anchor.y * deckH;
            const complete = this.context.state.isIdentified(point.id);
            const active = this.activePoint === point.id;
            const state: HotspotState = complete ? "complete" : active ? "active" : "idle";
            const hotspot = new InteractiveHotspot(scene, targetX, targetY, state, () => this.inspect(point.id));
            container.add(hotspot.view);

            const calloutX = PhaserMath.Clamp(targetX + point.callout.offsetX, deckX + 10, deckX + deckW - 246);
            const calloutY = PhaserMath.Clamp(targetY + point.callout.offsetY, deckY + 10, deckY + deckH - 94);
            const description = active ? "Memeriksa informasi…" : complete ? `Ditemukan: ${point.result}` : point.prompt;
            container.add(createHotspotCallout(scene, {
                x: calloutX, y: calloutY, targetX, targetY, title: point.title, description, complete,
                onClick: () => this.inspect(point.id),
            }));
        });
    }

    private inspect(pointId: IdentificationPointId) {
        if (this.activePoint || this.context.state.isIdentified(pointId)) return;
        this.activePoint = pointId;
        this.render();
        const timer = this.context.scene.time.delayedCall(220, () => {
            this.pendingTimers = this.pendingTimers.filter((entry) => entry !== timer);
            this.context.state.markIdentification(pointId);
            this.activePoint = null;
            this.context.refreshSharedUi();
            this.render();
            const point = IDENTIFICATION_POINTS.find((item) => item.id === pointId);
            if (point) showFeedbackToast(this.context.scene, this.context.container, 700, 330, point.title, point.result);
        });
        this.pendingTimers.push(timer);
    }

    private addAsset(key: string, x: number, y: number, width: number, height: number) {
        const { scene, container } = this.context;
        if (scene.textures.exists(key)) {
            container.add(scene.add.image(x + width / 2, y + height / 2, key).setDisplaySize(width, height));
            return;
        }
        const placeholder = scene.add.graphics();
        placeholder.fillStyle(0xffffff, 0.45);
        placeholder.fillRoundedRect(x, y, width, height, 12);
        placeholder.lineStyle(2, 0x1774e8, 0.7);
        placeholder.strokeRoundedRect(x, y, width, height, 12);
        const plus = scene.add.text(x + width / 2, y + height / 2, "+", { fontFamily: "Arial", fontSize: 30, color: "#1774e8" }).setOrigin(0.5);
        const label = scene.add.text(x + width / 2, y + height + 6, key, { fontFamily: "Arial", fontSize: 10, color: "#143a84" }).setOrigin(0.5);
        container.add([placeholder, plus, label]);
    }

    private clearTimers() {
        this.pendingTimers.forEach((timer) => timer.remove(false));
        this.pendingTimers = [];
    }
}
