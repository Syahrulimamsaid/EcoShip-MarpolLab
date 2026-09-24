export type IdentificationPointId = "location" | "source" | "pollutant" | "spillCondition" | "scupper";
export type ReportingFieldId = "dateTime" | "position" | "location" | "incidentType" | "pollutantType" | "estimatedQuantity" | "causeSource" | "actionTaken" | "assistanceNeeded" | "additionalInformation";

export interface IncidentData {
    location: string;
    incidentType: string;
    pollutantType: string;
    source: string;
    spillCondition: string;
    position: { latitude: string; longitude: string };
}

export type PreparationStatus = "success" | "incomplete" | "unnecessary";

export interface PreparationValidation {
    status: PreparationStatus;
    title: string;
    message: string;
}

export interface PreparationData {
    selectedEquipment: string[];
    confirmed: boolean;
    validationResult: PreparationValidation | null;
}

export interface ControlData {
    equipmentReady: boolean;
    sourceControlled: boolean;
    scupperClosed: boolean;
    boomInstalled: boolean;
    absorbentApplied: boolean;
    areaIsolated: boolean;
    wasteCollectionReady: boolean;
    completedAt: number | null;
}

export type ControlFlag = Exclude<keyof ControlData, "completedAt">;

export type DocumentChecklistId = "sopepReport" | "locationMap" | "handlingLog" | "equipmentList" | "documentationPhotos" | "finalReport";

export interface DocumentAttachment {
    id: string;
    label: string;
    fileName: string;
    source: "simulation" | "upload";
    kind: "image" | "pdf";
    sizeBytes: number;
    /** Texture key of the preview (simulated photo card or decoded upload). */
    previewKey?: string;
}

export interface DocumentationData {
    initialized: boolean;
    incidentDate: string;
    incidentTime: string;
    reportNumber: string;
    incidentType: string;
    location: string;
    description: string;
    additionalNotes: string;
    attachments: DocumentAttachment[];
    checklist: Record<DocumentChecklistId, boolean>;
    completed: boolean;
    completedAt: number | null;
}

export type ReportingData = Record<ReportingFieldId, string> & { submitted: boolean };

export interface SimulationSnapshot {
    currentStep: number;
    completedSteps: number[];
    identification: Record<IdentificationPointId, boolean>;
    incident: IncidentData;
    reporting: ReportingData;
    preparation: PreparationData;
    control: ControlData;
    documentation: DocumentationData;
    mistakes: number;
}

const INITIAL_IDENTIFICATION: Record<IdentificationPointId, boolean> = {
    location: false,
    source: false,
    pollutant: false,
    spillCondition: false,
    scupper: false,
};

const INCIDENT_DATA: IncidentData = {
    location: "Main Deck",
    incidentType: "Oil Spill",
    pollutantType: "Fuel Oil",
    source: "Kebocoran Pipa / Sambungan",
    spillCondition: "Sedang (terlokalisasi)",
    position: { latitude: "05° 23.4' S", longitude: "110° 29.8' E" },
};

const createReportingData = (): ReportingData => ({
    dateTime: "23 Sep 2026, 14:30",
    position: `${INCIDENT_DATA.position.latitude}, ${INCIDENT_DATA.position.longitude}`,
    location: INCIDENT_DATA.location,
    incidentType: INCIDENT_DATA.incidentType,
    pollutantType: INCIDENT_DATA.pollutantType,
    estimatedQuantity: "",
    causeSource: "Pipa / Sambungan",
    actionTaken: "",
    assistanceNeeded: "",
    additionalInformation: "",
    submitted: false,
});

const createPreparationData = (): PreparationData => ({ selectedEquipment: [], confirmed: false, validationResult: null });

const createControlData = (): ControlData => ({ equipmentReady: false, sourceControlled: false, scupperClosed: false, boomInstalled: false, absorbentApplied: false, areaIsolated: false, wasteCollectionReady: false, completedAt: null });

const MONTHS = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
const MONTH_ALIASES: Record<string, string> = { may: "mei", aug: "agu", oct: "okt", dec: "des" };

/** "23 Sep 2026" -> "SOPEP/OP/2026/09/23-001". */
function createReportNumber(date: string) {
    const match = /(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/.exec(date);
    if (!match) return "SOPEP/OP/0000/00/00-001";
    const key = match[2].toLowerCase();
    const month = MONTHS.indexOf(MONTH_ALIASES[key] ?? key) + 1;
    return `SOPEP/OP/${match[3]}/${String(month).padStart(2, "0")}/${match[1].padStart(2, "0")}-001`;
}

const createDocumentationData = (): DocumentationData => ({
    initialized: false, incidentDate: "", incidentTime: "", reportNumber: "", incidentType: "", location: "", description: "", additionalNotes: "",
    attachments: [],
    checklist: { sopepReport: false, locationMap: false, handlingLog: false, equipmentList: false, documentationPhotos: false, finalReport: false },
    completed: false, completedAt: null,
});

/** State contains learning progress only. Phaser display objects read from it
 * and may be safely rebuilt without losing the learner's discoveries. */
export class SimulationState {
    private snapshot: SimulationSnapshot = {
        currentStep: 1,
        completedSteps: [],
        identification: { ...INITIAL_IDENTIFICATION },
        incident: { ...INCIDENT_DATA, position: { ...INCIDENT_DATA.position } },
        reporting: createReportingData(),
        preparation: createPreparationData(),
        control: createControlData(),
        documentation: createDocumentationData(),
        mistakes: 0,
    };

    get data(): Readonly<SimulationSnapshot> {
        return this.snapshot;
    }

    setCurrentStep(step: number) {
        this.snapshot.currentStep = step;
    }

    markIdentification(point: IdentificationPointId) {
        this.snapshot.identification[point] = true;
    }

    isIdentified(point: IdentificationPointId) {
        return this.snapshot.identification[point];
    }

    isIdentificationComplete() {
        return Object.values(this.snapshot.identification).every(Boolean);
    }

    setReportingField(field: ReportingFieldId, value: string) {
        this.snapshot.reporting[field] = value;
    }

    submitReport() {
        this.snapshot.reporting.submitted = true;
    }

    resetReporting() {
        this.snapshot.reporting = createReportingData();
        this.snapshot.completedSteps = this.snapshot.completedSteps.filter((step) => step !== 2);
    }

    isReportComplete() {
        return this.snapshot.reporting.submitted;
    }

    /** Selection is locked once the equipment list has been confirmed. */
    addEquipment(id: string) {
        const preparation = this.snapshot.preparation;
        if (preparation.confirmed || preparation.selectedEquipment.includes(id)) return;
        preparation.selectedEquipment.push(id);
        preparation.validationResult = null;
    }

    removeEquipment(id: string) {
        const preparation = this.snapshot.preparation;
        if (preparation.confirmed) return;
        preparation.selectedEquipment = preparation.selectedEquipment.filter((item) => item !== id);
        preparation.validationResult = null;
    }

    setPreparationResult(result: PreparationValidation) {
        this.snapshot.preparation.validationResult = result;
    }

    confirmPreparation() {
        this.snapshot.preparation.confirmed = true;
    }

    resetPreparation() {
        this.snapshot.preparation = createPreparationData();
        this.snapshot.completedSteps = this.snapshot.completedSteps.filter((step) => step !== 3);
    }

    isPreparationComplete() {
        return this.snapshot.preparation.confirmed;
    }

    setControlFlag(flag: ControlFlag) {
        this.snapshot.control[flag] = true;
    }

    /** Step 4 is done once every procedural action is complete. */
    isControlComplete() {
        const control = this.snapshot.control;
        return control.equipmentReady && control.sourceControlled && control.scupperClosed && control.boomInstalled && control.absorbentApplied && control.areaIsolated && control.wasteCollectionReady;
    }

    markControlCompleted() {
        if (this.snapshot.control.completedAt === null) this.snapshot.control.completedAt = Date.now();
    }

    resetControl() {
        this.snapshot.control = createControlData();
        this.snapshot.completedSteps = this.snapshot.completedSteps.filter((step) => step !== 4);
    }

    /** Fills the documentation form from Steps 1–2 the first time Step 5 opens. */
    /** Returns true when the form was just initialized. */
    prepareDocumentation() {
        const documentation = this.snapshot.documentation;
        if (documentation.initialized) return false;
        const { incident, reporting } = this.snapshot;
        const [date, time] = reporting.dateTime.split(",").map((part) => part.trim());
        documentation.incidentDate = date ?? "";
        documentation.incidentTime = time ?? "";
        documentation.reportNumber = createReportNumber(date ?? "");
        documentation.incidentType = incident.incidentType;
        documentation.location = incident.location;
        documentation.description = `Terjadi tumpahan minyak (${incident.pollutantType}) akibat ${incident.source.toLowerCase()} di area ${incident.location.toLowerCase()}. Tumpahan ${incident.spillCondition.toLowerCase()}.`;
        documentation.additionalNotes = "Seluruh kegiatan penanganan tumpahan minyak telah dilakukan sesuai prosedur SOPEP. Tidak terdapat penyebaran ke laut. Limbah telah dikumpulkan dan disimpan di container yang sesuai.";
        documentation.initialized = true;
        return true;
    }

    setDocumentationText(field: "description" | "additionalNotes", value: string) {
        if (!this.snapshot.documentation.completed) this.snapshot.documentation[field] = value;
    }

    addAttachment(attachment: DocumentAttachment) {
        const documentation = this.snapshot.documentation;
        if (documentation.completed || documentation.attachments.some((item) => item.id === attachment.id)) return;
        documentation.attachments.push(attachment);
    }

    removeAttachment(id: string) {
        const documentation = this.snapshot.documentation;
        if (documentation.completed) return;
        documentation.attachments = documentation.attachments.filter((item) => item.id !== id);
    }

    saveDocumentation(checklist: Record<DocumentChecklistId, boolean>) {
        const documentation = this.snapshot.documentation;
        documentation.checklist = { ...checklist };
        documentation.completed = true;
        documentation.completedAt = Date.now();
    }

    /** Resets Step 5 only; Steps 1–4 keep their data. */
    resetDocumentation() {
        this.snapshot.documentation = createDocumentationData();
        this.snapshot.completedSteps = this.snapshot.completedSteps.filter((step) => step !== 5);
    }

    completeStep(step: number) {
        if (!this.snapshot.completedSteps.includes(step)) this.snapshot.completedSteps.push(step);
    }

    resetIdentification() {
        this.snapshot.identification = { ...INITIAL_IDENTIFICATION };
        this.snapshot.completedSteps = this.snapshot.completedSteps.filter((step) => step !== 1);
    }

    resetSimulation() {
        this.snapshot = { currentStep: 1, completedSteps: [], identification: { ...INITIAL_IDENTIFICATION }, incident: { ...INCIDENT_DATA, position: { ...INCIDENT_DATA.position } }, reporting: createReportingData(), preparation: createPreparationData(), control: createControlData(), documentation: createDocumentationData(), mistakes: 0 };
    }
}
