import { SOPEP_STEP5_ASSET_KEYS } from "../../config/assetKeys";
import { DocumentAttachment, DocumentChecklistId, SimulationState } from "../../core/SimulationState";
import { getEquipment } from "../preparation/preparationConfig";

export const MIN_ATTACHMENTS = 3;
export const MAX_TEXT_LENGTH = 500;
export const MIN_TEXT_LENGTH = 20;

export interface DocumentItemConfig {
    id: DocumentChecklistId;
    label: string;
    required: boolean;
    /** Feedback shown when the item is still missing on save. */
    missing: string;
}

/** Spec order: rendered row-major in two columns. */
export const STEP5_DOCUMENTS: DocumentItemConfig[] = [
    { id: "sopepReport", label: "Formulir laporan SOPEP", required: true, missing: "Kirim laporan insiden pada Step 2 terlebih dahulu." },
    { id: "locationMap", label: "Peta lokasi kejadian", required: true, missing: "Data posisi kejadian belum tersedia." },
    { id: "handlingLog", label: "Log kegiatan penanganan", required: true, missing: "Selesaikan seluruh tindakan pengendalian pada Step 4." },
    { id: "equipmentList", label: "Daftar peralatan yang digunakan", required: true, missing: "Pilih peralatan SOPEP pada Step 3." },
    { id: "documentationPhotos", label: "Foto dokumentasi", required: true, missing: `Tambahkan minimal ${MIN_ATTACHMENTS} foto dokumentasi penanganan.` },
    { id: "finalReport", label: "Laporan akhir penanganan", required: true, missing: "Lengkapi laporan akhir penanganan." },
];

/** Three dummy documentation photos: Step 5 has no real upload, these stand in for the files. */
export const DUMMY_ATTACHMENTS: DocumentAttachment[] = [
    { id: "sim-photo-1", label: "Foto Lokasi Awal", fileName: "IMG_001.jpg", source: "simulation", kind: "image", sizeBytes: 0, previewKey: SOPEP_STEP5_ASSET_KEYS.fileCards[0] },
    { id: "sim-photo-2", label: "Kondisi Tumpahan", fileName: "IMG_002.jpg", source: "simulation", kind: "image", sizeBytes: 0, previewKey: SOPEP_STEP5_ASSET_KEYS.fileCards[1] },
    { id: "sim-photo-3", label: "Pemasangan Oil Boom", fileName: "IMG_003.jpg", source: "simulation", kind: "image", sizeBytes: 0, previewKey: SOPEP_STEP5_ASSET_KEYS.fileCards[2] },
];

/** Checklist is derived from the results of Steps 1–4 plus the Step 5 form. */
export function computeChecklist(state: SimulationState): Record<DocumentChecklistId, boolean> {
    const { reporting, incident, preparation, documentation } = state.data;
    return {
        sopepReport: reporting.submitted,
        locationMap: Boolean(incident.position.latitude && incident.position.longitude),
        handlingLog: state.isControlComplete(),
        equipmentList: preparation.selectedEquipment.length > 0,
        documentationPhotos: documentation.attachments.length >= MIN_ATTACHMENTS,
        finalReport: documentation.description.trim().length >= MIN_TEXT_LENGTH && documentation.additionalNotes.trim().length >= MIN_TEXT_LENGTH,
    };
}

export interface DocumentationIssue {
    /** A checklist id, or "description" for the incident description box. */
    target: DocumentChecklistId | "description" | "notes";
    message: string;
}

export function validateDocumentation(state: SimulationState): DocumentationIssue[] {
    const documentation = state.data.documentation;
    const issues: DocumentationIssue[] = [];
    if (!documentation.incidentDate || !documentation.incidentTime || !documentation.reportNumber || !documentation.incidentType || !documentation.location) {
        issues.push({ target: "description", message: "Data kejadian belum lengkap." });
    }
    if (documentation.description.trim().length < MIN_TEXT_LENGTH) issues.push({ target: "description", message: "Deskripsi kejadian belum lengkap." });
    const checklist = computeChecklist(state);
    STEP5_DOCUMENTS.forEach((item) => {
        if (item.required && !checklist[item.id]) issues.push({ target: item.id, message: item.missing });
    });
    if (documentation.additionalNotes.trim().length < MIN_TEXT_LENGTH) issues.push({ target: "notes", message: "Catatan tambahan belum lengkap." });
    return issues;
}

export function buildActivitySummary(state: SimulationState): Array<[string, string]> {
    const { incident, preparation } = state.data;
    const equipment = preparation.selectedEquipment.map((id) => getEquipment(id)?.name ?? id).join(", ");
    return [
        ["Insiden", `${incident.incidentType} (${incident.pollutantType})`],
        ["Lokasi", incident.location],
        ["Penanganan", equipment || "Belum ada peralatan dipilih"],
        ["Status", state.isControlComplete() ? "Penanganan selesai, belum mencapai laut." : "Penanganan belum selesai."],
    ];
}
