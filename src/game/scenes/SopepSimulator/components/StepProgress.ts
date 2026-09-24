import { GameObjects, Scene } from "phaser";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';
const BLUE = 0x1774e8;
const GREEN = 0x1f8d52;

const LABELS = ["Identifikasi", "Pelaporan", "Persiapan", "Pengendalian", "Dokumentasi"];

export class StepProgress {
    readonly view: GameObjects.Container;

    constructor(private readonly scene: Scene, x: number, y: number) {
        this.view = scene.add.container(x, y);
    }

    setState(currentStep: number, completedSteps: readonly number[]) {
        this.view.removeAll(true);
        const gap = 126;
        LABELS.forEach((label, index) => {
            const step = index + 1;
            const x = index * gap;
            const complete = completedSteps.includes(step);
            const active = currentStep === step && !complete;
            const color = complete ? GREEN : active ? BLUE : 0xbed9ff;
            if (index < LABELS.length - 1) {
                const line = this.scene.add.graphics();
                line.lineStyle(3, complete ? GREEN : BLUE, complete || active ? 1 : 0.75);
                line.lineBetween(x + 24, 14, x + gap - 20, 14);
                this.view.add(line);
            }
            const dot = this.scene.add.circle(x + 14, 14, 13, 0xffffff, 1).setStrokeStyle(3, color, 1);
            const marker = this.scene.add.text(x + 14, 14, complete ? "✓" : "", { fontFamily: FONT, fontStyle: "800", fontSize: 14, color: "#1f8d52" }).setOrigin(0.5);
            if (active) dot.setFillStyle(BLUE, 1);
            const number = this.scene.add.text(x + 14, 38, String(step), { fontFamily: FONT, fontStyle: "800", fontSize: 12, color: active ? "#1261d2" : "#235097" }).setOrigin(0.5);
            const text = this.scene.add.text(x + 14, 56, label, { fontFamily: FONT, fontStyle: active ? "800" : "600", fontSize: 11, color: active ? "#1261d2" : "#235097" }).setOrigin(0.5);
            this.view.add([dot, marker, number, text]);
        });
    }
}
