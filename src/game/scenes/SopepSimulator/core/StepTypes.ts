import { GameObjects, Scene } from "phaser";

import { SimulationState } from "./SimulationState";

export interface SOPEPStepContext {
    scene: Scene;
    container: GameObjects.Container;
    state: SimulationState;
    completeCurrentStep: () => void;
    goToStep: (step: number) => void;
    refreshSharedUi: () => void;
}

export interface SOPEPStep {
    readonly id: number;
    readonly key: string;
    readonly title: string;
    create(context: SOPEPStepContext): void;
    enter(): void;
    exit(): void;
    reset(): void;
    isComplete(): boolean;
    destroy(): void;
}
