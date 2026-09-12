import { MOMENT_TOLERANCE, ROW_HEIGHT_FACTOR } from "./StabilityCalculator";
import { CargoContainer, CargoPlacement, CargoSlot, CaseNumber, Side, StabilityScenario } from "./types";

const ROWS = 3;
const WEIGHT_POOL = [5, 10, 15, 20, 25, 30];

interface ColumnDef {
    column: number;
    side: Side;
    arm: number;
}

// port outer -> port inner -> center -> starboard inner -> starboard outer.
const COLUMN_DEFS: ColumnDef[] = [
    { column: 0, side: "port", arm: -2 },
    { column: 1, side: "port", arm: -1 },
    { column: 2, side: "center", arm: 0 },
    { column: 3, side: "starboard", arm: 1 },
    { column: 4, side: "starboard", arm: 2 },
];

interface CaseConfig {
    initialColumnKinds: Array<"outer" | "inner">;
    initialCountRange: [number, number];
    answerTokenRange: [number, number];
    distractorCountRange: [number, number];
    hasVerticalTrap: boolean;
}

const CASE_CONFIG: Record<CaseNumber, CaseConfig> = {
    1: {
        initialColumnKinds: ["outer"],
        initialCountRange: [2, 3],
        answerTokenRange: [1, 2],
        distractorCountRange: [1, 2],
        hasVerticalTrap: false,
    },
    2: {
        initialColumnKinds: ["outer", "inner"],
        initialCountRange: [2, 3],
        answerTokenRange: [2, 3],
        distractorCountRange: [2, 3],
        hasVerticalTrap: false,
    },
    3: {
        initialColumnKinds: ["outer", "inner"],
        initialCountRange: [3, 4],
        answerTokenRange: [2, 3],
        distractorCountRange: [2, 3],
        hasVerticalTrap: true,
    },
};

/** mulberry32 — tiny seeded PRNG so a scenario can be reproduced from its
 * seed for debugging, without pulling in a dependency. */
function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function rng() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickInt(rng: () => number, min: number, max: number) {
    return min + Math.floor(rng() * (max - min + 1));
}

function pickFrom<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildSlots(): CargoSlot[] {
    const slots: CargoSlot[] = [];
    for (const def of COLUMN_DEFS) {
        for (let row = 1; row <= ROWS; row++) {
            slots.push({
                id: `c${def.column}-r${row}`,
                side: def.side,
                x: def.column,
                y: row,
                arm: def.arm,
                row,
                column: def.column,
            });
        }
    }
    return slots;
}

function columnFor(side: Side, kind: "outer" | "inner"): ColumnDef {
    const wantedArm = kind === "outer" ? 2 : 1;
    return COLUMN_DEFS.find((c) => c.side === side && Math.abs(c.arm) === wantedArm)!;
}

interface WeightedToken {
    columnKind: "outer" | "inner";
    weight: number;
}

/** Distributes `count` random-weight tokens across the given column kinds
 * (round-robin), one at a time so both columns fill up evenly. */
function distributeTokens(rng: () => number, count: number, kinds: Array<"outer" | "inner">): WeightedToken[] {
    const tokens: WeightedToken[] = [];
    for (let i = 0; i < count; i++) {
        tokens.push({ columnKind: kinds[i % kinds.length], weight: pickFrom(rng, WEIGHT_POOL) });
    }
    return tokens;
}

/** Places tokens into a side's columns bottom-up (row 1 first), returning
 * both the resulting containers/placements and the next-free-row per
 * column so a caller can keep stacking on top afterwards if needed. */
function placeTokens(
    tokens: WeightedToken[],
    side: Side,
    idPrefix: string,
    slots: CargoSlot[],
): { containers: CargoContainer[]; placements: CargoPlacement[] } {
    const nextRowByColumn = new Map<number, number>();
    const containers: CargoContainer[] = [];
    const placements: CargoPlacement[] = [];

    tokens.forEach((token, index) => {
        const columnDef = columnFor(side, token.columnKind);
        const row = nextRowByColumn.get(columnDef.column) ?? 1;
        nextRowByColumn.set(columnDef.column, row + 1);

        const slot = slots.find((s) => s.column === columnDef.column && s.row === row);
        if (!slot) return; // ran out of rows for this column — silently skip, shouldn't happen at these counts

        const container: CargoContainer = {
            id: `${idPrefix}-${index}`,
            weight: token.weight,
            widthUnits: 1,
            heightUnits: 1,
        };
        containers.push(container);
        placements.push({ containerId: container.id, slotId: slot.id });
        slot.occupiedBy = container.id;
    });

    return { containers, placements };
}

/** Tries `attempts` random combinations of (column-kind, pool weight) pairs
 * on `side` looking for one whose signed moment exactly cancels
 * `targetMoment`. Returns null if nothing lands exactly — the caller falls
 * back to mirroring the initial cargo, which always works. */
function searchExactCombo(
    rng: () => number,
    targetMoment: number,
    side: Side,
    tokenCount: number,
    attempts: number,
): WeightedToken[] | null {
    const kinds: Array<"outer" | "inner"> = ["outer", "inner"];

    for (let attempt = 0; attempt < attempts; attempt++) {
        const tokens: WeightedToken[] = [];
        let sum = 0;
        for (let i = 0; i < tokenCount; i++) {
            const kind = pickFrom(rng, kinds);
            const weight = pickFrom(rng, WEIGHT_POOL);
            const arm = columnFor(side, kind).arm;
            tokens.push({ columnKind: kind, weight });
            sum += weight * arm;
        }
        if (sum === targetMoment) {
            return tokens;
        }
    }
    return null;
}

/**
 * Builds a fully solvable scenario: an initial (already-tilting) cargo
 * configuration plus a shuffled pool of weight tokens that always contains
 * at least one exact combination able to zero out the net moment — per the
 * "generate the solution first" approach, this never relies on hoping a
 * random total happens to work out.
 */
export function generateScenario(caseNumber: CaseNumber, seed: number = Date.now() + caseNumber * 7919): StabilityScenario {
    const rng = mulberry32(seed);
    const config = CASE_CONFIG[caseNumber];
    const slots = buildSlots();

    const heavySide: Side = rng() < 0.5 ? "port" : "starboard";
    const oppositeSide: Side = heavySide === "port" ? "starboard" : "port";

    const initialCount = pickInt(rng, config.initialCountRange[0], config.initialCountRange[1]);
    const initialTokens = distributeTokens(rng, initialCount, config.initialColumnKinds);
    const initial = placeTokens(initialTokens, heavySide, "init", slots);

    const initialMoment = initial.containers.reduce((sum, container, index) => {
        const slot = slots.find((s) => s.id === initial.placements[index].slotId)!;
        return sum + container.weight * slot.arm;
    }, 0);

    const targetMoment = -initialMoment;
    const answerTokenCount = pickInt(rng, config.answerTokenRange[0], config.answerTokenRange[1]);

    let answerTokens = searchExactCombo(rng, targetMoment, oppositeSide, answerTokenCount, 200);
    if (!answerTokens) {
        // Guaranteed fallback: mirror the initial tokens onto the opposite
        // side's matching column kind — signs flip, magnitude cancels exactly.
        answerTokens = initialTokens.map((token) => ({ columnKind: token.columnKind, weight: token.weight }));
    }

    const answer = placeTokens(answerTokens, oppositeSide, "sol", slots);
    // The answer containers are the *solution pool*, not pre-placed on the
    // ship — free their slots again and only keep them as available cargo.
    for (const placement of answer.placements) {
        const slot = slots.find((s) => s.id === placement.slotId);
        if (slot) slot.occupiedBy = undefined;
    }

    const distractorCount = pickInt(rng, config.distractorCountRange[0], config.distractorCountRange[1]);
    const distractors: CargoContainer[] = Array.from({ length: distractorCount }, (_, index) => ({
        id: `dist-${index}`,
        weight: pickFrom(rng, WEIGHT_POOL),
        widthUnits: 1,
        heightUnits: 1,
    }));

    const availableCargo = shuffle(rng, [...answer.containers, ...distractors]);

    let maxVerticalPenalty = Number.POSITIVE_INFINITY;
    if (config.hasVerticalTrap) {
        const initialPenalty = initial.placements.reduce((sum, placement) => {
            const slot = slots.find((s) => s.id === placement.slotId)!;
            const container = initial.containers.find((c) => c.id === placement.containerId)!;
            return sum + container.weight * ROW_HEIGHT_FACTOR(slot.row);
        }, 0);
        const answerPenalty = answer.placements.reduce((sum, placement, index) => {
            // answer.placements used the lowest free row in its column when
            // it was generated above, so this is the "safe" placement cost.
            const originalSlot = slots.find((s) => s.id === placement.slotId) ?? slots[0];
            const row = originalSlot.row;
            return sum + answer.containers[index].weight * ROW_HEIGHT_FACTOR(row);
        }, 0);
        maxVerticalPenalty = initialPenalty + answerPenalty + 20;
    }

    return {
        id: `case-${caseNumber}-${seed}`,
        caseNumber,
        slots,
        initialCargo: initial.placements,
        initialCargoContainers: initial.containers,
        availableCargo,
        targetMomentRange: { min: -MOMENT_TOLERANCE, max: MOMENT_TOLERANCE },
        maxVerticalPenalty,
        solutionIds: answer.containers.map((c) => c.id),
    };
}
