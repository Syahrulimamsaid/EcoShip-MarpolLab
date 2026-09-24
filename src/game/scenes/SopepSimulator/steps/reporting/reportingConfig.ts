import { ReportingFieldId } from "../../core/SimulationState";

export interface ReportFieldConfig {
    id: ReportingFieldId;
    label: string;
    column: 0 | 1;
    options?: string[];
    multiline?: boolean;
}

export const REPORT_FIELDS: ReportFieldConfig[] = [
    { id: "dateTime", label: "DATE & TIME", column: 0 },
    { id: "position", label: "POSITION (LAT/LONG)", column: 0 },
    { id: "location", label: "LOCATION", column: 0, options: ["Main Deck", "Engine Room", "Pump Room", "Cargo Deck"] },
    { id: "incidentType", label: "TYPE OF INCIDENT", column: 0, options: ["Oil Spill", "Leakage", "Overflow", "Equipment Failure"] },
    { id: "pollutantType", label: "TYPE OF POLLUTANT", column: 0, options: ["Fuel Oil", "Lubricating Oil", "Bilge Oil", "Unknown Oil"] },
    { id: "estimatedQuantity", label: "ESTIMATED QUANTITY", column: 1, options: ["< 100 Liter", "100 – 500 Liter", "500 – 1000 Liter", "> 1000 Liter"] },
    { id: "causeSource", label: "CAUSE / SOURCE", column: 1, options: ["Pipa / Sambungan", "Valve", "Tangki", "Transfer Bunker", "Belum Diketahui"] },
    { id: "actionTaken", label: "ACTION TAKEN", column: 1, options: ["Isolasi sumber & penanganan awal", "Hentikan transfer minyak", "Tutup valve terkait", "Pasang oil boom", "Amankan area kejadian"] },
    { id: "assistanceNeeded", label: "ASSISTANCE NEEDED", column: 1, options: ["Monitoring dari pihak berwenang", "Bantuan penanggulangan tumpahan", "Bantuan kapal terdekat", "Bantuan pelabuhan", "Tidak diperlukan saat ini"] },
    { id: "additionalInformation", label: "ADDITIONAL INFORMATION", column: 1, multiline: true },
];

export const DEFAULT_REPORT_NOTE = "Tumpahan masih terlokalisasi di area deck.\nBelum mencapai laut.";

export const REQUIRED_REPORT_FIELDS: ReportingFieldId[] = ["estimatedQuantity", "actionTaken", "assistanceNeeded", "additionalInformation"];
