// In-memory badge unlock tracking, shared across scenes for the lifetime of
// the page (module-level singleton). Resets on a full reload — there's no
// save/localStorage layer yet, so this is intentionally session-only.
export type BadgeId = "ship-construction-surveyor" | "master-of-maritime-safety";

const unlockedBadges = new Set<BadgeId>();

export function unlockBadge(id: BadgeId) {
    unlockedBadges.add(id);
}

export function isBadgeUnlocked(id: BadgeId) {
    return unlockedBadges.has(id);
}
