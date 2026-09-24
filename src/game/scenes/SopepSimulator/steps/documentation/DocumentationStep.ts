import { Tweens } from "phaser";

import { Button } from "../../../../../component/Button/Button";
import { playSceneExit } from "../../../../../component/SceneTransition";
import { unlockNextModuleAfter } from "../../../../ModuleProgress";
import { createActivitySummary } from "../../components/ActivitySummary";
import { createAttachmentThumbnail } from "../../components/AttachmentThumbnail";
import { createConfirmDialog } from "../../components/ConfirmDialog";
import { createDocumentChecklist } from "../../components/DocumentChecklist";
import { BLUE, FONT, GREEN, ORANGE, addCardHeader, createFormField, drawCard } from "../../components/DocumentationUi";
import { DomTextEditor } from "../../components/DomTextEditor";
import { showFeedbackToast } from "../../components/FeedbackToast";
import { SOPEP_STEP5_ASSET_KEYS } from "../../config/assetKeys";
import { SOPEPStep, SOPEPStepContext } from "../../core/StepTypes";
import { DUMMY_ATTACHMENTS, MAX_TEXT_LENGTH, STEP5_DOCUMENTS, buildActivitySummary, computeChecklist, validateDocumentation } from "./documentationConfig";

const K = SOPEP_STEP5_ASSET_KEYS;
const FORM = { x: 778, y: 248, width: 495, height: 530 };
const ATTACH = { x: 1282, y: 248, width: 605, height: 530 };
const CHECKLIST = { x: 34, y: 790, width: 735, height: 205 };
const SUMMARY = { x: 778, y: 790, width: 532, height: 205 };
const NOTES = { x: 1319, y: 790, width: 568, height: 205 };
const TOAST = { x: 1090, y: 640 };
const THUMB = 176;

type TextField = "description" | "additionalNotes";
type DialogKind = "reset" | "success" | null;

/** Step 5 — consolidates Steps 1–4 into the final SOPEP documentation. All
 * content lives in `SimulationState.documentation`; the Phaser tree is rebuilt
 * from it, and only Step 5 data is touched by RESET. */
export class DocumentationStep implements SOPEPStep {
    readonly id = 5;
    readonly key = "documentation";
    readonly title = "Dokumentasi";

    private context!: SOPEPStepContext;
    private dialog: DialogKind = null;
    private invalid = new Set<string>();
    private editor: DomTextEditor | null = null;
    private renderTimer: Phaser.Time.TimerEvent | null = null;
    private activeTweens: Tweens.Tween[] = [];
    private previousChecklist = computeEmptyChecklist();
    private alive = false;

    create(context: SOPEPStepContext) { this.context = context; }

    enter() {
        this.alive = true;
        this.prepare();
        this.previousChecklist = computeChecklist(this.context.state);
        this.render();
    }

    exit() { this.clearRuntime(); }

    reset() {
        this.context.state.resetDocumentation();
        this.prepare();
        this.invalid.clear();
        this.dialog = null;
        this.previousChecklist = computeChecklist(this.context.state);
        this.context.refreshSharedUi();
        this.render();
    }

    isComplete() { return this.context.state.data.documentation.completed; }

    destroy() {
        this.clearRuntime();
        this.context.container.removeAll(true);
    }

    /** First open (or after RESET): auto-fill the form and attach the three dummy files. */
    private prepare() {
        const { state } = this.context;
        if (!state.prepareDocumentation()) return;
        DUMMY_ATTACHMENTS.forEach((attachment) => state.addAttachment({ ...attachment }));
    }

    // ── rendering ────────────────────────────────────────────────

    private render() {
        const { scene, container, state } = this.context;
        this.stopTweens();
        container.removeAll(true);
        state.prepareDocumentation();
        const checklist = computeChecklist(state);

        this.createFormCard();
        this.createAttachmentCard();
        createDocumentChecklist(scene, container, CHECKLIST.x, CHECKLIST.y, CHECKLIST.width, CHECKLIST.height, STEP5_DOCUMENTS.map((item) => ({
            label: item.label,
            done: checklist[item.id],
            invalid: this.invalid.has(item.id),
            justCompleted: checklist[item.id] && !this.previousChecklist[item.id],
        })));
        createActivitySummary(scene, container, SUMMARY.x, SUMMARY.y, SUMMARY.width, SUMMARY.height, buildActivitySummary(state));
        this.createNotesCard();
        this.createButtons();
        this.previousChecklist = checklist;

        if (this.dialog === "reset") this.showResetDialog();
        if (this.dialog === "success") this.showSuccessDialog();
    }

    private get locked() { return this.context.state.data.documentation.completed; }

    private createFormCard() {
        const { scene, container, state } = this.context;
        const doc = state.data.documentation;
        drawCard(scene, container, FORM.x, FORM.y, FORM.width, FORM.height);
        addCardHeader(scene, container, FORM.x, FORM.y, K.iconDocument, "LENGKAPI DOKUMEN", "Lengkapi informasi dokumentasi penanganan tumpahan minyak berdasarkan aktivitas yang telah dilakukan pada langkah sebelumnya.", FORM.width - 96);

        const rows: Array<[string, string, string, boolean]> = [
            [K.iconCalendar, "TANGGAL KEJADIAN", doc.incidentDate, false],
            [K.iconClock, "WAKTU KEJADIAN", doc.incidentTime, true],
            [K.iconReport, "NOMOR LAPORAN", doc.reportNumber, false],
            [K.iconIncident, "JENIS INSIDEN", doc.incidentType, true],
            [K.iconLocation, "LOKASI KEJADIAN", doc.location, true],
        ];
        rows.forEach(([iconKey, label, value, select], index) => {
            createFormField(scene, container, { x: FORM.x + 18, y: FORM.y + 96 + index * 52, width: FORM.width - 36, labelWidth: 175, iconKey, label, value, select });
        });
        this.createTextBox("description", FORM.x + 18, FORM.y + 362, FORM.width - 36, 130, "DESKRIPSI KEJADIAN", "Klik untuk menuliskan deskripsi kejadian...", 190);
    }

    private createNotesCard() {
        const { scene, container } = this.context;
        drawCard(scene, container, NOTES.x, NOTES.y, NOTES.width, NOTES.height);
        addCardHeader(scene, container, NOTES.x, NOTES.y, K.iconDescription, "CATATAN TAMBAHAN");
        this.createTextBox("additionalNotes", NOTES.x + 18, NOTES.y + 68, NOTES.width - 36, 100, "", "Tambahkan catatan akhir penanganan...", 250);
    }

    /** Click-to-edit text area with a live character counter. */
    private createTextBox(field: TextField, x: number, y: number, width: number, height: number, caption: string, placeholder: string, capacity: number) {
        const { scene, container, state } = this.context;
        const value = state.data.documentation[field];
        const flagged = this.invalid.has(field === "description" ? "description" : "notes") || (field === "additionalNotes" && this.invalid.has("finalReport") && value.trim().length < 20);
        const box = scene.add.graphics();
        box.fillStyle(0xffffff, 1);
        box.fillRoundedRect(x, y, width, height, 10);
        box.lineStyle(2, flagged ? ORANGE : 0xbcd9ff, 1);
        box.strokeRoundedRect(x, y, width, height, 10);
        container.add(box);
        let textY = y + 12;
        if (caption) {
            container.add(scene.add.text(x + 14, y + 10, caption, { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: "#234a87" }));
            textY = y + 32;
        }
        const shown = value.length > capacity ? `${value.slice(0, capacity - 1)}…` : value;
        container.add(scene.add.text(x + 14, textY, shown || placeholder, { fontFamily: FONT, fontStyle: "500", fontSize: 13, color: shown ? "#153b7a" : "#7d97bc", wordWrap: { width: width - 28 }, lineSpacing: 3 }));
        if (flagged) container.add(scene.add.text(x + width - 14, y + 10, "! Lengkapi", { fontFamily: FONT, fontStyle: "800", fontSize: 11, color: "#b45f06" }).setOrigin(1, 0));
        container.add(scene.add.text(x + width - 4, y + height + 8, `${value.length}/${MAX_TEXT_LENGTH}`, { fontFamily: FONT, fontStyle: "500", fontSize: 12, color: value.length >= MAX_TEXT_LENGTH ? "#b45f06" : "#5575a5" }).setOrigin(1, 0));

        if (this.locked) return;
        const hit = scene.add.zone(x + width / 2, y + height / 2, width, height).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => this.openEditor(field, x, y, width, height, value));
        container.add(hit);
    }

    /** No upload: the three dummy files stand in for the attached documentation. */
    private createAttachmentCard() {
        const { scene, container, state } = this.context;
        const attachments = state.data.documentation.attachments;
        drawCard(scene, container, ATTACH.x, ATTACH.y, ATTACH.width, ATTACH.height);
        addCardHeader(scene, container, ATTACH.x, ATTACH.y, K.iconAttachment, "LAMPIRAN DOKUMENTASI", "Foto dan dokumen pendukung penanganan tumpahan minyak yang telah dilampirkan.", ATTACH.width - 96);

        const gap = 18;
        const total = attachments.length * THUMB + (attachments.length - 1) * gap;
        const startX = ATTACH.x + (ATTACH.width - total) / 2;
        const top = ATTACH.y + 230;
        attachments.forEach((attachment, index) => {
            createAttachmentThumbnail(scene, container, startX + index * (THUMB + gap), top, THUMB, attachment);
        });
        container.add(scene.add.text(ATTACH.x + ATTACH.width / 2, top + THUMB + 44, `${attachments.length} file dokumentasi terlampir`, { fontFamily: FONT, fontStyle: "700", fontSize: 14, color: "#1f8d52" }).setOrigin(0.5));
    }

    private createButtons() {
        const { scene, container, state } = this.context;
        const completed = this.locked;
        const ready = validateDocumentation(state).length === 0;
        const reset = new Button(scene, { x: 1202, y: 1033, width: 429, height: 54, text: "RESET DOKUMEN", fillColor: 0x8592a6, strokeAlpha: 0, textColor: "#ffffff", fontFamily: FONT, fontStyle: "800", fontSize: 16, borderRadius: 27, hoverAnimation: "scale", hoverScale: 1.02 });
        reset.on("pointerdown", () => { this.editor?.close(); this.dialog = "reset"; this.render(); });
        // Not `disabled`: a grey-but-clickable SIMPAN lets a failed attempt highlight what is missing.
        const save = new Button(scene, { x: 1650, y: 1033, width: 447, height: 54, text: completed ? "✓  DOKUMENTASI TERSIMPAN" : "✓  SIMPAN DOKUMENTASI  →", fillColor: completed ? GREEN : ready ? BLUE : 0xa7adb8, strokeAlpha: 0, fontFamily: FONT, fontStyle: "800", fontSize: 16, borderRadius: 27, hoverAnimation: "scale", hoverScale: 1.02 });
        save.on("pointerdown", () => this.save());
        container.add([reset.view, save.view]);
    }

    // ── dialogs ──────────────────────────────────────────────────

    private showResetDialog() {
        createConfirmDialog(this.context.scene, this.context.container, {
            title: "Reset dokumentasi?",
            message: "Kelengkapan dokumen dan lampiran pada Step 5 akan dikembalikan ke kondisi awal. Data Step 1–4 tidak berubah.",
            tone: "warning",
            buttons: [
                { text: "BATAL", onClick: () => { this.dialog = null; this.render(); } },
                { text: "RESET", primary: true, onClick: () => this.reset() },
            ],
        });
    }

    private showSuccessDialog() {
        createConfirmDialog(this.context.scene, this.context.container, {
            title: "✓ DOKUMENTASI BERHASIL DISIMPAN",
            message: "Dokumentasi penanganan tumpahan telah lengkap dan tersimpan. Seluruh simulasi Administrasi SOPEP telah selesai.",
            tone: "success",
            buttons: [{ text: "MAIN MENU", primary: true, onClick: () => this.exitToMainMenu() }],
        });
    }

    // ── actions ──────────────────────────────────────────────────

    private save() {
        const { state } = this.context;
        this.editor?.close();
        if (this.locked) { this.dialog = "success"; this.render(); return; }
        const issues = validateDocumentation(state);
        if (issues.length > 0) {
            this.invalid = new Set(issues.map((issue) => issue.target));
            this.render();
            this.toast("DOKUMEN BELUM LENGKAP", issues[0].message, ORANGE);
            return;
        }
        state.saveDocumentation(computeChecklist(state));
        this.context.completeCurrentStep();
        this.context.refreshSharedUi();
        // Finishing the SOPEP simulation opens the Evaluasi menu.
        unlockNextModuleAfter("hasil-umpan-balik");
        this.invalid.clear();
        this.dialog = "success";
        this.render();
    }

    private openEditor(field: TextField, x: number, y: number, width: number, height: number, value: string) {
        const { scene, container, state } = this.context;
        this.editor?.close();
        this.editor = new DomTextEditor({
            scene, anchor: container, x, y, width, height, value, maxLength: MAX_TEXT_LENGTH, fontSize: 13,
            onInput: (next) => {
                state.setDocumentationText(field, next);
                this.invalid.clear();
                this.scheduleRender();
            },
            onClose: () => { this.editor = null; this.renderTimer?.remove(false); this.renderTimer = null; if (this.alive) this.render(); },
        });
    }

    private scheduleRender() {
        this.renderTimer?.remove(false);
        this.renderTimer = this.context.scene.time.delayedCall(140, () => { this.renderTimer = null; this.render(); });
    }

    private exitToMainMenu() {
        const { scene, container } = this.context;
        playSceneExit(scene, [[container]], () => scene.scene.start("MainMenu"));
    }

    private toast(title: string, message: string, color: number) {
        showFeedbackToast(this.context.scene, this.context.container, TOAST.x, TOAST.y, title, message, color);
    }

    // ── lifecycle ────────────────────────────────────────────────

    private stopTweens() {
        this.activeTweens.forEach((tween) => tween.stop());
        this.activeTweens = [];
    }

    private clearRuntime() {
        this.alive = false;
        this.renderTimer?.remove(false);
        this.renderTimer = null;
        const editor = this.editor;
        this.editor = null;
        editor?.close();
        this.stopTweens();
    }
}

function computeEmptyChecklist() {
    return { sopepReport: false, locationMap: false, handlingLog: false, equipmentList: false, documentationPhotos: false, finalReport: false };
}
