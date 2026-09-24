import { GameObjects, Scene } from "phaser";

import { HomeBackButtons } from "../../../../component/Button/HomeBackButtons";
import { PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../../component/ModulePanel/ModulePanel";
import { StepProgress } from "./StepProgress";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;

const STEP_HEADINGS: Record<number, { title: string; description: string }> = {
    1: { title: "IDENTIFIKASI INSIDEN", description: "Periksa kondisi kejadian sebelum menentukan tindakan penanganan." },
    2: { title: "LAPORKAN INSIDEN", description: "Lengkapi informasi awal kejadian dan kirimkan laporan kepada pihak berwenang melalui radio." },
    3: { title: "PERSIAPAN PENANGANAN", description: "Pilih dan siapkan peralatan SOPEP yang diperlukan untuk menangani tumpahan minyak di area kejadian." },
    4: { title: "PENGENDALIAN", description: "Lakukan tindakan pengendalian untuk membatasi penyebaran tumpahan dan mencegah pencemaran meluas." },
    5: { title: "DOKUMENTASI", description: "Lengkapi dan susun dokumentasi penanganan tumpahan minyak sesuai prosedur SOPEP." },
};

export class SimulatorHeader {
    readonly view: GameObjects.Container;
    private readonly progress: StepProgress;
    private readonly stepLabel: GameObjects.Text;
    private readonly titleLabel: GameObjects.Text;
    private readonly descriptionLabel: GameObjects.Text;

    constructor(scene: Scene, onHome: () => void, onBack: () => void) {
        this.view = scene.add.container(0, 0);
        // Same joined breadcrumb geometry as the OWS / Pilah Sampah module headers.
        const nav = new HomeBackButtons(scene, { x: 32, y: 32, onHome, onBack });
        const crumbX = 32 + nav.width + 20;
        const crumbY = 38;
        const crumbHeight = nav.height - 10;
        const centerY = crumbY + crumbHeight / 2;
        const module = scene.add.text(0, 0, "MODUL SOPEP", { fontFamily: FONT, fontStyle: "600", fontSize: 15, color: "#ffffff" });
        const blueWidth = module.width + 48;
        const arrow = scene.add.text(0, 0, "›", { fontFamily: FONT, fontStyle: "600", fontSize: 20, color: PRIMARY_BLUE_HEX });
        const crumbText = scene.add.text(0, 0, "Simulasi Administrasi SOPEP", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: PRIMARY_BLUE_HEX });
        const whiteWidth = 22 + arrow.width + 10 + crumbText.width + 26;
        const crumb = scene.add.graphics();
        crumb.fillStyle(0xffffff, 1);
        crumb.fillRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        crumb.fillStyle(PRIMARY_BLUE, 1);
        crumb.fillRoundedRect(crumbX, crumbY, blueWidth, crumbHeight, { tl: crumbHeight / 2, bl: crumbHeight / 2, tr: 0, br: 0 });
        crumb.lineStyle(2, PRIMARY_BLUE, 1);
        crumb.strokeRoundedRect(crumbX, crumbY, blueWidth + whiteWidth, crumbHeight, crumbHeight / 2);
        module.setPosition(crumbX + blueWidth / 2, centerY).setOrigin(0.5);
        arrow.setPosition(crumbX + blueWidth + 22, centerY - 2).setOrigin(0, 0.5);
        crumbText.setPosition(arrow.x + arrow.width + 10, centerY).setOrigin(0, 0.5);

        const main = scene.add.graphics();
        main.fillStyle(0xffffff, 0.97);
        main.fillRoundedRect(32, 100, 1856, 126, 18);
        main.lineStyle(2, 0xbcd9ff, 1);
        main.strokeRoundedRect(32, 100, 1856, 126, 18);
        const pill = scene.add.graphics();
        pill.fillStyle(BLUE, 1);
        pill.fillRoundedRect(62, 119, 160, 48, 14);
        this.stepLabel = scene.add.text(142, 143, "STEP 1", { fontFamily: FONT, fontStyle: "800", fontSize: 23, color: "#ffffff" }).setOrigin(0.5);
        this.titleLabel = scene.add.text(252, 126, "IDENTIFIKASI INSIDEN", { fontFamily: FONT, fontStyle: "800", fontSize: 30, color: "#102b82" });
        this.descriptionLabel = scene.add.text(64, 180, "Periksa kondisi kejadian sebelum menentukan tindakan penanganan.", { fontFamily: FONT, fontStyle: "600", fontSize: 16, color: "#214e9e" });

        // Align the complete dot / label group with the centre of the main
        // header card, rather than its top edge.
        this.progress = new StepProgress(scene, 1288, 128);
        this.view.add([nav.view, crumb, module, arrow, crumbText, main, pill, this.stepLabel, this.titleLabel, this.descriptionLabel, this.progress.view]);
    }

    setProgress(currentStep: number, completedSteps: readonly number[]) {
        this.progress.setState(currentStep, completedSteps);
        const heading = STEP_HEADINGS[currentStep] ?? STEP_HEADINGS[1];
        this.stepLabel.setText(`STEP ${currentStep}`);
        this.titleLabel.setText(heading.title);
        this.descriptionLabel.setText(heading.description);
    }
}
