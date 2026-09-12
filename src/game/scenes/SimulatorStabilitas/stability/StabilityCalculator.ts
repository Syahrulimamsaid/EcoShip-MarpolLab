import { CargoContainer, CargoPlacement, CargoSlot, StabilityResult, StabilityStatus } from "./types";

/** Tuning constants for the educational (not full naval-architecture) model. */
export const MAX_HEEL_DEGREES = 9;
export const MOMENT_TOLERANCE = 2.5;
export const ALMOST_STABLE_MOMENT = MOMENT_TOLERANCE * 3;
/** A moment of this magnitude maps to the full ±9° heel; tuned against the
 * scenario generator's weight pool (5-30 ton) times the widest arm (±2). */
const MAX_MOMENT_REFERENCE = 90;
/** How much extra moment/vertical weight each row of stacking is worth —
 * row 1 (deck level) contributes nothing, row 3 contributes the most. */
export const ROW_HEIGHT_FACTOR = (row: number) => Math.max(0, row - 1);

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function resolvePlacement(placement: CargoPlacement, slots: CargoSlot[], containers: CargoContainer[]) {
    const slot = slots.find((s) => s.id === placement.slotId);
    const container = containers.find((c) => c.id === placement.containerId);
    if (!slot || !container) return null;
    return { slot, container };
}

/** Σ(weight × arm) split into port/starboard magnitudes plus the signed net
 * total used for the heel calculation. Center-column cargo (arm 0) doesn't
 * affect either side's displayed moment. */
export function calculateMoment(
    placements: CargoPlacement[],
    slots: CargoSlot[],
    containers: CargoContainer[],
) {
    let portMoment = 0;
    let starboardMoment = 0;
    let netMoment = 0;

    for (const placement of placements) {
        const resolved = resolvePlacement(placement, slots, containers);
        if (!resolved) continue;
        const { slot, container } = resolved;
        const moment = container.weight * slot.arm;
        netMoment += moment;
        if (slot.arm < 0) portMoment += container.weight * Math.abs(slot.arm);
        else if (slot.arm > 0) starboardMoment += container.weight * slot.arm;
    }

    return { portMoment, starboardMoment, netMoment };
}

/** Pure orthographic-style mapping from net moment to a heel angle, clamped
 * to ±MAX_HEEL_DEGREES — no iterative physics, just a normalized ratio. */
export function calculateHeelAngle(netMoment: number, maxMoment = MAX_MOMENT_REFERENCE): number {
    const normalized = clamp(netMoment / maxMoment, -1, 1);
    return normalized * MAX_HEEL_DEGREES;
}

/** Σ(weight × rowHeightFactor) — a simple stand-in for "how high up the
 * heavy cargo sits", not a real vertical center of gravity/GM computation. */
export function calculateVerticalPenalty(
    placements: CargoPlacement[],
    slots: CargoSlot[],
    containers: CargoContainer[],
): number {
    let penalty = 0;
    for (const placement of placements) {
        const resolved = resolvePlacement(placement, slots, containers);
        if (!resolved) continue;
        penalty += resolved.container.weight * ROW_HEIGHT_FACTOR(resolved.slot.row);
    }
    return penalty;
}

function resolveStatus(netMoment: number, verticalPenalty: number, maxVerticalPenalty: number): StabilityStatus {
    const magnitude = Math.abs(netMoment);

    if (magnitude <= MOMENT_TOLERANCE) {
        return verticalPenalty > maxVerticalPenalty ? "high-center-of-gravity" : "stable";
    }
    if (magnitude <= ALMOST_STABLE_MOMENT) {
        return "almost-stable";
    }
    return netMoment > 0 ? "starboard-heavy" : "port-heavy";
}

/** The single entry point the scene/HUD needs: given everything currently
 * placed on the deck, derive moment, heel angle, vertical penalty and the
 * resulting status in one pass. */
export function evaluateStability(
    placements: CargoPlacement[],
    slots: CargoSlot[],
    containers: CargoContainer[],
    maxVerticalPenalty: number,
): StabilityResult {
    const { portMoment, starboardMoment, netMoment } = calculateMoment(placements, slots, containers);
    const verticalPenalty = calculateVerticalPenalty(placements, slots, containers);
    const heelAngle = calculateHeelAngle(netMoment);
    const status = resolveStatus(netMoment, verticalPenalty, maxVerticalPenalty);

    return { portMoment, starboardMoment, netMoment, heelAngle, verticalPenalty, status };
}

/** Stacking rule: a slot can only be filled once every slot below it (same
 * column, lower row) is already occupied, and it must itself be empty. */
export function validatePlacement(
    slot: CargoSlot,
    slots: CargoSlot[],
    placements: CargoPlacement[],
): { valid: boolean; reason?: string } {
    if (placements.some((p) => p.slotId === slot.id)) {
        return { valid: false, reason: "Slot ini sudah terisi." };
    }

    const isOccupied = (row: number) =>
        slots.some((s) => s.column === slot.column && s.row === row) &&
        placements.some((p) => {
            const target = slots.find((s) => s.id === p.slotId);
            return target?.column === slot.column && target?.row === row;
        });

    for (let row = 1; row < slot.row; row++) {
        if (!isOccupied(row)) {
            return { valid: false, reason: "Isi posisi di bawah terlebih dahulu." };
        }
    }

    return { valid: true };
}
