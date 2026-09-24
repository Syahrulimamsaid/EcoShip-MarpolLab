import { Button } from "../../../../../component/Button/Button";
import { ReportForm } from "../../components/ReportForm";
import { SOPEP_STEP2_ASSET_KEYS } from "../../config/assetKeys";
import { ReportingFieldId } from "../../core/SimulationState";
import { SOPEPStep, SOPEPStepContext } from "../../core/StepTypes";
import { REQUIRED_REPORT_FIELDS } from "./reportingConfig";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;
const GREEN = 0x1f8d52;

/** Step 2 uses the incident record discovered in Step 1 and collects only
 * reporting-specific choices. No visual object owns learning state. */
export class ReportingStep implements SOPEPStep {
    readonly id = 2;
    readonly key = "reporting";
    readonly title = "Laporkan Insiden";

    private context!: SOPEPStepContext;
    private form: ReportForm | null = null;
    private transmitting = false;
    private invalid: ReportingFieldId[] = [];
    private feedback = "";
    private timers: Phaser.Time.TimerEvent[] = [];
    private activeTweens: Phaser.Tweens.Tween[] = [];

    create(context: SOPEPStepContext) { this.context = context; }
    enter() { this.render(); }
    exit() { this.clearRuntime(); }
    reset() {
        this.clearRuntime();
        this.context.state.resetReporting();
        this.invalid = [];
        this.feedback = "Form laporan dikembalikan ke data awal dari Step 1.";
        this.render();
    }
    isComplete() { return this.context.state.isReportComplete(); }
    destroy() { this.clearRuntime(); this.form?.destroy(); this.form = null; this.context.container.removeAll(true); }

    private render() {
        const { container, state } = this.context;
        this.form?.destroy();
        this.form = null;
        container.removeAll(true);

        this.createPositionPanel(28, 248, 420, 315);
        this.createStep1Summary(28, 575, 420, 283);
        this.createReportPanel(470, 248, 1418, 610);
        this.createRadioGuide(28, 884, 1860, 160);

        if (state.data.reporting.submitted) this.createSuccessPanel(1148, 525, 560, 230);
    }

    private addCard(x: number, y: number, width: number, height: number, title: string, accent = BLUE) {
        const { scene, container } = this.context;
        const card = scene.add.graphics();
        card.fillStyle(0xffffff, 0.98);
        card.fillRoundedRect(x, y, width, height, 18);
        card.lineStyle(2, 0xbcd9ff, 1);
        card.strokeRoundedRect(x, y, width, height, 18);
        const header = scene.add.graphics();
        header.fillStyle(accent, 1);
        header.fillRoundedRect(x + 16, y + 14, width - 32, 42, 10);
        const text = scene.add.text(x + 32, y + 35, title, { fontFamily: FONT, fontStyle: "800", fontSize: 16, color: "#ffffff" }).setOrigin(0, 0.5);
        container.add(card); container.add(header); container.add(text);
    }

    private addImage(key: string, x: number, y: number, width: number, height: number) {
        const image = this.context.scene.add.image(x, y, key).setDisplaySize(width, height);
        this.context.container.add(image);
        return image;
    }

    private createPositionPanel(x: number, y: number, width: number, height: number) {
        this.addCard(x, y, width, height, "POSISI KAPAL");
        // Keep the supplied map at its native 358 × 221 ratio. Its own map
        // artwork already communicates position, so no extra ship/compass
        // overlays are layered above it.
        this.addImage(SOPEP_STEP2_ASSET_KEYS.map, x + 210, y + 181, 358, 221);
    }

    private createStep1Summary(x: number, y: number, width: number, height: number) {
        const { scene, container, state } = this.context;
        this.addCard(x, y, width, height, "INFORMASI DARI STEP 1");
        const incident = state.data.incident;
        const rows: Array<[string, string]> = [
            ["Lokasi Kejadian", incident.location], ["Jenis Insiden", incident.incidentType], ["Jenis Pencemar", incident.pollutantType], ["Sumber Tumpahan", incident.source], ["Kondisi Tumpahan", incident.spillCondition],
        ];
        rows.forEach(([label, value], index) => {
            const rowY = y + 68 + index * 41;
            const rowX = x + 18;
            const rowWidth = width - 36;
            const rowHeight = 36;
            const row = scene.add.graphics(); row.fillStyle(0xeaf3ff, 1); row.fillRoundedRect(rowX, rowY, rowWidth, rowHeight, 8);
            // Anchor the indicator from the row itself, not the outer card,
            // so it remains vertically centered when panel dimensions change.
            const bullet = scene.add.circle(rowX + 20, rowY + rowHeight / 2, 6, GREEN, 1);
            const text = scene.add.text(rowX + 36, rowY + 10, `${label}: `, { fontFamily: FONT, fontStyle: "700", fontSize: 11, color: "#46699d" }).setOrigin(0, 0.5);
            const valueText = scene.add.text(rowX + 36, rowY + 25, value, { fontFamily: FONT, fontStyle: "800", fontSize: 12, color: "#143a84" }).setOrigin(0, 0.5);
            container.add(row); container.add(bullet); container.add(text); container.add(valueText);
        });
    }

    private createReportPanel(x: number, y: number, width: number, height: number) {
        const { scene, container, state } = this.context;
        this.addCard(x, y, width, height, "OIL POLLUTION REPORT");
        this.addImage(SOPEP_STEP2_ASSET_KEYS.badgeMayday, x + width - 106, y + 35, 164, 27);
        const instruction = scene.add.text(x + 26, y + 68, this.transmitting ? "TRANSMITTING... Mengirim laporan melalui Channel 16." : "Lengkapi laporan sebelum dikirim melalui radio VHF.", { fontFamily: FONT, fontStyle: this.transmitting ? "800" : "600", fontSize: 12, color: this.transmitting ? "#1f8d52" : "#5575a5" });
        container.add(instruction);
        if (this.feedback) {
            const message = scene.add.text(x + 26, y + 580, this.feedback, { fontFamily: FONT, fontStyle: "700", fontSize: 12, color: this.invalid.length ? "#d97706" : "#1f8d52" });
            container.add(message);
        }
        if (!state.data.reporting.submitted) {
            this.form = new ReportForm(scene, x, y, width, state.data.reporting, this.invalid, {
                onChange: (field, value) => { state.setReportingField(field, value); this.invalid = this.invalid.filter((id) => id !== field); this.feedback = ""; this.render(); },
                onReset: () => this.reset(),
                onSubmit: () => this.submit(),
            });
            container.add(this.form.view);
        }
    }

    private createRadioGuide(x: number, y: number, width: number, height: number) {
        const { scene, container } = this.context;
        this.addCard(x, y, width, height, "PANDUAN PELAPORAN MELALUI RADIO");
        const guide = [
            "Gunakan Channel 16\n(VHF)", "Sampaikan informasi\nsesuai format laporan", "Sebutkan posisi kapal\n(Latitude/Longitude)", "Jelaskan jenis, jumlah,\ndan tindakan awal", "Ikuti instruksi dari\npihak berwenang",
        ];
        guide.forEach((text, index) => {
            const itemX = x + 160 + index * 350;
            if (index < guide.length - 1) { const line = scene.add.rectangle(itemX + 175, y + 96, 290, 2, 0xbcd9ff, 1); container.add(line); }
            const circle = scene.add.circle(itemX, y + 96, 22, index === 0 ? BLUE : 0xeaf3ff, 1).setStrokeStyle(2, BLUE, 1);
            const number = scene.add.text(itemX, y + 96, String(index + 1), { fontFamily: FONT, fontStyle: "800", fontSize: 15, color: index === 0 ? "#ffffff" : "#1764c8" }).setOrigin(0.5);
            const label = scene.add.text(itemX, y + 124, text, { fontFamily: FONT, fontStyle: "600", fontSize: 12, color: "#234a87", align: "center", wordWrap: { width: 270 }, lineSpacing: 3 }).setOrigin(0.5, 0);
            container.add(circle); container.add(number); container.add(label);
        });
    }

    private createSuccessPanel(x: number, y: number, width: number, height: number) {
        const { scene, container } = this.context;
        const panel = scene.add.graphics(); panel.fillStyle(0xebf8ef, 0.98); panel.fillRoundedRect(x, y, width, height, 18); panel.lineStyle(2, GREEN, 1); panel.strokeRoundedRect(x, y, width, height, 18);
        const mark = scene.add.circle(x + 54, y + 58, 29, GREEN, 1);
        const check = scene.add.text(x + 54, y + 58, "✓", { fontFamily: FONT, fontStyle: "800", fontSize: 30, color: "#ffffff" }).setOrigin(0.5);
        const title = scene.add.text(x + 100, y + 34, "LAPORAN BERHASIL DIKIRIM", { fontFamily: FONT, fontStyle: "800", fontSize: 20, color: "#1f8d52" });
        const note = scene.add.text(x + 100, y + 70, "Informasi awal kejadian telah dicatat dan\ndisampaikan kepada pihak berwenang.", { fontFamily: FONT, fontStyle: "600", fontSize: 13, color: "#315f88", lineSpacing: 5 });
        const next = new Button(scene, { x: x + width - 156, y: y + 178, width: 256, height: 48, text: "LANJUT KE PERSIAPAN  →", fillColor: BLUE, strokeAlpha: 0, fontFamily: FONT, fontStyle: "800", fontSize: 13, borderRadius: 12, hoverAnimation: "scale", hoverScale: 1.03 });
        next.on("pointerdown", () => this.context.goToStep(3));
        container.add(panel); container.add(mark); container.add(check); container.add(title); container.add(note); container.add(next.view);
    }

    private submit() {
        const reporting = this.context.state.data.reporting;
        this.invalid = REQUIRED_REPORT_FIELDS.filter((field) => !reporting[field].trim());
        if (this.invalid.length) { this.feedback = "Lengkapi informasi laporan sebelum dikirim."; this.render(); return; }
        this.transmitting = true; this.feedback = "Mengirim laporan melalui Channel 16..."; this.render();
        const timer = this.context.scene.time.delayedCall(850, () => {
            this.timers = this.timers.filter((item) => item !== timer);
            this.transmitting = false;
            this.context.state.submitReport();
            this.context.completeCurrentStep();
            this.context.refreshSharedUi();
            this.feedback = "";
            this.render();
        });
        this.timers.push(timer);
    }

    private clearRuntime() {
        this.timers.forEach((timer) => timer.remove(false)); this.timers = [];
        this.activeTweens.forEach((tween) => tween.stop()); this.activeTweens = [];
        this.transmitting = false;
    }
}
