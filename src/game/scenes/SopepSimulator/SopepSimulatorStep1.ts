import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { playSceneExit } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { StepManager } from "./core/StepManager";
import { createStepRegistry } from "./core/StepRegistry";
import { SimulationState } from "./core/SimulationState";
import { SimulatorHeader } from "./components/SimulatorHeader";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

/** Shared SOPEP shell. It owns Phaser lifecycle, responsive scaling, shared
 * header/progress and navigation. Learning behavior lives in registered steps. */
export class SopepSimulator extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private content!: GameObjects.Container;
    private header!: SimulatorHeader;
    private state!: SimulationState;
    private stepManager!: StepManager;

    constructor() {
        super("SopepSimulator");
    }

    create() {
        this.background = this.add.image(0, 0, "soped.background");
        this.root = this.add.container(0, 0);
        this.content = this.add.container(0, 0);
        this.root.add(this.content);
        this.state = new SimulationState();
        this.header = new SimulatorHeader(this, () => this.goTo("MainMenu"), () => this.goTo("SopepMateri"));
        this.root.add(this.header.view);
        this.stepManager = new StepManager(
            this,
            this.content,
            this.state,
            createStepRegistry(),
            () => this.refreshSharedUi(),
            (step) => this.showFutureStepPlaceholder(step),
        );
        this.stepManager.goToStep(1);

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        this.events.once("shutdown", () => {
            this.stepManager.destroy();
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
        EventBus.emit("current-scene-ready", this);
    }

    private refreshSharedUi() {
        this.header.setProgress(this.state.data.currentStep, this.state.data.completedSteps);
    }

    private showFutureStepPlaceholder(step: number) {
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.98);
        card.fillRoundedRect(430, 350, 1060, 360, 24);
        card.lineStyle(2, 0xbcd9ff, 1);
        card.strokeRoundedRect(430, 350, 1060, 360, 24);
        const stepText = this.add.text(960, 445, `STEP ${step}`, { fontFamily: FONT, fontStyle: "800", fontSize: 22, color: "#1774e8" }).setOrigin(0.5);
        const title = this.add.text(960, 500, step === 3 ? "PERSIAPAN PENANGANAN" : "MODUL BERIKUTNYA", { fontFamily: FONT, fontStyle: "800", fontSize: 34, color: "#112c7e" }).setOrigin(0.5);
        const note = this.add.text(960, 558, step === 3 ? "Step 3 akan dikembangkan pada tahap berikutnya." : "Modul ini akan dikembangkan pada tahap berikutnya.", { fontFamily: FONT, fontStyle: "600", fontSize: 17, color: "#31568f" }).setOrigin(0.5);
        const previousStep = Math.max(1, step - 1);
        const back = new Button(this, { x: 960, y: 640, width: 290, height: 54, text: `KEMBALI KE STEP ${previousStep}`, fillColor: 0x1774e8, strokeAlpha: 0, fontFamily: FONT, fontStyle: "800", fontSize: 14, borderRadius: 27 });
        back.on("pointerdown", () => this.stepManager.goToStep(previousStep));
        this.content.add([card, stepText, title, note, back.view]);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, [[this.root]], () => this.scene.start(sceneKey));
    }

    private handleResize(size: Phaser.Structs.Size) {
        this.layout(size.width, size.height);
    }

    private layout(width: number, height: number) {
        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        this.root.setPosition((width - DESIGN_WIDTH * scale) / 2, (height - DESIGN_HEIGHT * scale) / 2);
        this.background.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    }
}
