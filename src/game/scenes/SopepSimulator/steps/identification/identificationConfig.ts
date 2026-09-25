import { IdentificationPointId } from "../../core/SimulationState";

export interface IdentificationPointConfig {
    id: IdentificationPointId;
    title: string;
    prompt: string;
    result: string;
    anchor: { x: number; y: number };
    callout: { offsetX: number; offsetY: number };
}

/** Fixed procedure order — identical to the checklist in the "Kondisi Darurat" panel. */
export const IDENTIFICATION_POINTS: IdentificationPointConfig[] = [
    {
        id: "location",
        title: "LOKASI KEJADIAN",
        prompt: "Klik untuk memeriksa lokasi kejadian.",
        result: "Main Deck",
        // Clear deck area confirms the incident occurs on the Main Deck.
        anchor: { x: 0.70, y: 0.69 },
        callout: { offsetX: 80, offsetY: 75 },
    },
    {
        id: "source",
        title: "SUMBER TUMPAHAN",
        prompt: "Klik untuk memeriksa sumber tumpahan.",
        result: "Kebocoran pada sambungan pipa",
        // Oil flowing from the pipe joint.
        anchor: { x: 0.52, y: 0.52 },
        callout: { offsetX: 100, offsetY: -180 },
    },
    {
        id: "pollutant",
        title: "JENIS PENCEMAR",
        prompt: "Klik untuk memeriksa jenis tumpahan.",
        result: "Fuel Oil",
        // Fuel drums in the composite main-deck illustration.
        anchor: { x: 0.10, y: 0.47 },
        callout: { offsetX: 86, offsetY: -118 },
    },
    {
        id: "spillCondition",
        title: "KONDISI TUMPAHAN",
        prompt: "Klik untuk memeriksa luas dan penyebaran tumpahan.",
        result: "Tumpahan masih berada di area deck",
        // Centre of the oil pool, not the pipe or the drain.
        anchor: { x: 0.31, y: 0.68 },
        callout: { offsetX: 120, offsetY: 50 },
    },
    {
        id: "scupper",
        title: "SALURAN PEMBUANGAN",
        prompt: "Klik untuk memeriksa kondisi scupper.",
        result: "Scupper berisiko tercemar",
        anchor: { x: 0.16, y: 0.79 },
        callout: { offsetX: 70, offsetY: 40 },
    },
];
