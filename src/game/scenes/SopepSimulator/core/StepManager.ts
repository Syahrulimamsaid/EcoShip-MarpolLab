import { GameObjects, Scene } from "phaser";

import { SimulationState } from "./SimulationState";
import { SOPEPStep, SOPEPStepContext } from "./StepTypes";

export type StepFactory = () => SOPEPStep;

export class StepManager {
    private activeStep: SOPEPStep | null = null;

    constructor(
        private readonly scene: Scene,
        private readonly container: GameObjects.Container,
        private readonly state: SimulationState,
        private readonly registry: ReadonlyMap<number, StepFactory>,
        private readonly refreshSharedUi: () => void,
        private readonly showUnavailableStep: (step: number) => void,
    ) {}

    goToStep(stepNumber: number) {
        this.activeStep?.exit();
        this.activeStep?.destroy();
        this.container.removeAll(true);
        this.state.setCurrentStep(stepNumber);
        this.refreshSharedUi();

        const factory = this.registry.get(stepNumber);
        if (!factory) {
            this.activeStep = null;
            this.showUnavailableStep(stepNumber);
            return;
        }

        this.activeStep = factory();
        this.activeStep.create(this.contextForActiveStep());
        this.activeStep.enter();
    }

    completeCurrentStep() {
        if (!this.activeStep || !this.activeStep.isComplete()) return;
        this.state.completeStep(this.activeStep.id);
        this.refreshSharedUi();
    }

    resetStep() {
        this.activeStep?.reset();
    }

    resetSimulation() {
        this.activeStep?.destroy();
        this.state.resetSimulation();
        this.goToStep(1);
    }

    destroy() {
        this.activeStep?.destroy();
        this.activeStep = null;
    }

    private contextForActiveStep(): SOPEPStepContext {
        return {
            scene: this.scene,
            container: this.container,
            state: this.state,
            completeCurrentStep: () => this.completeCurrentStep(),
            goToStep: (step) => this.goToStep(step),
            refreshSharedUi: this.refreshSharedUi,
        };
    }
}
