export type Side = "port" | "starboard" | "center";

/** A draggable weight token the student can place on the deck. Position is
 * decided by the student (via which slot they drop it on) — the container
 * itself only carries its weight. */
export interface CargoContainer {
    id: string;
    weight: number; // ton
    widthUnits: number;
    heightUnits: number;
}

/** One cell of the deck grid. `arm` is the moment arm for this column
 * (negative = port, positive = starboard, 0 = center); `row` is 1-based
 * from the bottom so stacking rules are simple `row > 1` checks. */
export interface CargoSlot {
    id: string;
    side: Side;
    x: number;
    y: number;
    arm: number;
    row: number;
    column: number;
    occupiedBy?: string;
}

export interface CargoPlacement {
    containerId: string;
    slotId: string;
}

export type CaseNumber = 1 | 2 | 3;

export interface StabilityScenario {
    id: string;
    caseNumber: CaseNumber;
    slots: CargoSlot[];
    initialCargo: CargoPlacement[];
    /** The CargoContainer objects referenced by initialCargo's placements —
     * kept separate from availableCargo since these are already on the
     * ship, not draggable from the palette. */
    initialCargoContainers: CargoContainer[];
    availableCargo: CargoContainer[];
    targetMomentRange: { min: number; max: number };
    maxVerticalPenalty: number;
    solutionIds: string[];
}

export type StabilityStatus =
    | "stable"
    | "almost-stable"
    | "port-heavy"
    | "starboard-heavy"
    | "high-center-of-gravity";

export interface StabilityResult {
    portMoment: number;
    starboardMoment: number;
    netMoment: number;
    heelAngle: number;
    verticalPenalty: number;
    status: StabilityStatus;
}
