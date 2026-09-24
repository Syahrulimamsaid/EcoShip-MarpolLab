import { StepFactory } from "./StepManager";
import { IdentificationStep } from "../steps/identification/IdentificationStep";
import { ReportingStep } from "../steps/reporting/ReportingStep";
import { PreparationStep } from "../steps/preparation/PreparationStep";
import { ControlStep } from "../steps/control/ControlStep";
import { DocumentationStep } from "../steps/documentation/DocumentationStep";

/** Add future modules here only: `registry.set(2, () => new ReportingStep())`. */
export function createStepRegistry(): ReadonlyMap<number, StepFactory> {
    return new Map<number, StepFactory>([
        [1, () => new IdentificationStep()],
        [2, () => new ReportingStep()],
        [3, () => new PreparationStep()],
        [4, () => new ControlStep()],
        [5, () => new DocumentationStep()],
    ]);
}
