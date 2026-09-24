import { SOPEP_STEP3_ASSET_KEYS } from "../../config/assetKeys";
import { IncidentData, PreparationValidation } from "../../core/SimulationState";

const EQ = SOPEP_STEP3_ASSET_KEYS.equipment;

export interface EquipmentConfig {
    id: string;
    name: string;
    category: string;
    assetKey: string;
    dragKey: string;
    placedKey: string;
    /** Duplicates are rejected unless a config explicitly opts in. */
    allowDuplicate?: boolean;
}

export const EQUIPMENT_CONFIG: EquipmentConfig[] = [
    { id: "oil-boom", name: "Oil Boom", category: "containment", assetKey: EQ.oilBoom.normal, dragKey: EQ.oilBoom.drag, placedKey: EQ.oilBoom.placed },
    { id: "absorbent-pad", name: "Absorbent Pad", category: "absorbent", assetKey: EQ.absorbentPad.normal, dragKey: EQ.absorbentPad.drag, placedKey: EQ.absorbentPad.placed },
    { id: "absorbent-roll", name: "Absorbent Roll", category: "absorbent", assetKey: EQ.absorbentRoll.normal, dragKey: EQ.absorbentRoll.drag, placedKey: EQ.absorbentRoll.placed },
    { id: "scupper-plug", name: "Scupper Plug", category: "drain-protection", assetKey: EQ.scupperPlug.normal, dragKey: EQ.scupperPlug.drag, placedKey: EQ.scupperPlug.placed },
    { id: "collection-container", name: "Collection Container", category: "collection", assetKey: EQ.collectionContainer.normal, dragKey: EQ.collectionContainer.drag, placedKey: EQ.collectionContainer.placed },
    { id: "dispersant", name: "Dispersant", category: "response", assetKey: EQ.dispersant.normal, dragKey: EQ.dispersant.drag, placedKey: EQ.dispersant.placed },
    { id: "ppe-set", name: "PPE Set", category: "safety", assetKey: EQ.ppeSet.normal, dragKey: EQ.ppeSet.drag, placedKey: EQ.ppeSet.placed },
    { id: "toolkit", name: "Toolkit", category: "tools", assetKey: EQ.toolkit.normal, dragKey: EQ.toolkit.drag, placedKey: EQ.toolkit.placed },
];

export const getEquipment = (id: string) => EQUIPMENT_CONFIG.find((item) => item.id === id);

export const SLOT_COUNT = 6;

export interface ScenarioConfig {
    id: string;
    matches: (incident: IncidentData) => boolean;
    required: string[];
    /** Each group is satisfied by any one of its members. */
    requiredOneOf: string[][];
    optional: string[];
    unnecessary: string[];
    /** Contextual hints only; they never list the whole answer. */
    missingHints: Record<string, string>;
    groupHints: string[];
    unnecessaryNotes: Record<string, string>;
}

export const SCENARIO_CONFIG: ScenarioConfig[] = [
    {
        id: "mainDeckFuelOil",
        matches: (incident) => incident.location === "Main Deck" && incident.pollutantType === "Fuel Oil",
        required: ["oil-boom", "scupper-plug", "collection-container", "ppe-set"],
        requiredOneOf: [["absorbent-pad", "absorbent-roll"]],
        optional: ["toolkit"],
        unnecessary: ["dispersant"],
        missingHints: {
            "oil-boom": "Pastikan penyebaran tumpahan dapat dikendalikan.",
            "scupper-plug": "Periksa kembali perlindungan saluran pembuangan.",
            "collection-container": "Pastikan limbah hasil penanganan memiliki tempat penampungan.",
            "ppe-set": "Keselamatan petugas belum terjamin sebelum penanganan.",
        },
        groupHints: ["Pastikan tersedia peralatan untuk menyerap tumpahan."],
        unnecessaryNotes: {
            dispersant: "Penggunaan dispersant tidak selalu diperlukan untuk tumpahan yang masih terlokalisasi di deck.",
        },
    },
];

/** Step 3 reads the case discovered in Step 1; the first scenario is the fallback. */
export function resolveScenario(incident: IncidentData): ScenarioConfig {
    return SCENARIO_CONFIG.find((scenario) => scenario.matches(incident)) ?? SCENARIO_CONFIG[0];
}

export function validateEquipmentSelection(selected: readonly string[], scenario: ScenarioConfig): PreparationValidation {
    const unnecessary = selected.find((id) => scenario.unnecessary.includes(id));
    if (unnecessary) {
        return {
            status: "unnecessary",
            title: "PERIKSA KEMBALI PILIHAN",
            message: scenario.unnecessaryNotes[unnecessary] ?? "Periksa kembali fungsi salah satu peralatan yang dipilih.",
        };
    }

    const missingRequired = scenario.required.find((id) => !selected.includes(id));
    const missingGroup = scenario.requiredOneOf.findIndex((group) => !group.some((id) => selected.includes(id)));
    if (missingRequired || missingGroup >= 0) {
        const hint = missingRequired ? scenario.missingHints[missingRequired] : scenario.groupHints[missingGroup];
        return {
            status: "incomplete",
            title: "PERALATAN BELUM LENGKAP",
            message: `Kondisi tumpahan belum dapat ditangani dengan aman. ${hint ?? ""}`.trim(),
        };
    }

    return {
        status: "success",
        title: "✓ PERALATAN SIAP",
        message: "Peralatan yang dipilih sesuai dengan kebutuhan penanganan tumpahan.",
    };
}

export const SELECTION_GUIDE = [
    "Kendalikan penyebaran (Oil Boom)",
    "Lindungi saluran pembuangan (Scupper Plug)",
    "Serap tumpahan (Absorbent Pad/Roll)",
    "Kumpulkan limbah (Collection Container)",
    "Gunakan APD sesuai prosedur",
];
