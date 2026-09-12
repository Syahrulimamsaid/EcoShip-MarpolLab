export type ModuleId = "simulator-ows" | "simulator-stabilitas" | "hasil-umpan-balik";

const COOKIE_NAME = "ecoship_marpollab_unlocked_modules";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const MODULE_ORDER: ModuleId[] = [
    "simulator-ows",
    "simulator-stabilitas",
    "hasil-umpan-balik",
];

function getDefaultUnlockedModules(): ModuleId[] {
    return ["simulator-ows"];
}

function isBrowser() {
    return typeof document !== "undefined";
}

function parseUnlockedModules(raw: string | null): ModuleId[] {
    if (!raw) {
        return getDefaultUnlockedModules();
    }

    const unlocked = new Set<ModuleId>(getDefaultUnlockedModules());
    raw.split(",")
        .map((value) => value.trim())
        .forEach((value) => {
            if (MODULE_ORDER.includes(value as ModuleId)) {
                unlocked.add(value as ModuleId);
            }
        });

    return MODULE_ORDER.filter((moduleId) => unlocked.has(moduleId));
}

function serializeUnlockedModules(modules: ModuleId[]) {
    return MODULE_ORDER.filter((moduleId) => modules.includes(moduleId)).join(",");
}

function readCookieValue(name: string) {
    if (!isBrowser()) {
        return null;
    }

    const prefix = `${name}=`;
    const parts = document.cookie.split(";");

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith(prefix)) {
            return decodeURIComponent(trimmed.slice(prefix.length));
        }
    }

    return null;
}

function writeCookieValue(name: string, value: string) {
    if (!isBrowser()) {
        return;
    }

    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export function getUnlockedModules(): ModuleId[] {
    const modules = parseUnlockedModules(readCookieValue(COOKIE_NAME));
    writeCookieValue(COOKIE_NAME, serializeUnlockedModules(modules));
    return modules;
}

export function isModuleUnlocked(moduleId: ModuleId) {
    return getUnlockedModules().includes(moduleId);
}

export function unlockModule(moduleId: ModuleId) {
    const unlocked = new Set<ModuleId>(getUnlockedModules());
    unlocked.add(moduleId);
    const normalized = MODULE_ORDER.filter((id) => unlocked.has(id));
    writeCookieValue(COOKIE_NAME, serializeUnlockedModules(normalized));
}

export function unlockNextModuleAfter(moduleId: ModuleId) {
    const currentIndex = MODULE_ORDER.indexOf(moduleId);
    if (currentIndex === -1) {
        return;
    }

    const nextModule = MODULE_ORDER[currentIndex + 1];
    if (nextModule) {
        unlockModule(nextModule);
    }
}

export function resetModuleProgress() {
    writeCookieValue(COOKIE_NAME, serializeUnlockedModules(getDefaultUnlockedModules()));
}

/** True for the last module in the unlock chain — completing it means
 * every module has now been finished. */
export function isFinalModule(moduleId: ModuleId) {
    return MODULE_ORDER[MODULE_ORDER.length - 1] === moduleId;
}
