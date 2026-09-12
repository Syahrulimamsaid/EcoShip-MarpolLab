import { GameObjects, Scene } from "phaser";

const PRIMARY_BLUE = 0x2f68d8;
const PRIMARY_BLUE_HEX = "#2f68d8";
const DARK_NAVY = "#143a84";
const BORDER_BLUE = 0xbcd4f5;

export interface SceneProgressFooterConfig {
    x: number;
    y: number;
    width: number;
    sceneLabel: string;
    sceneTitle: string;
    progressLabel: string;
    total: number;
}

/** Bottom-left footer card: "SCENE N / Title" plus a segmented progress bar. */
export class SceneProgressFooter {
    readonly view: GameObjects.GameObject[];

    private progressBar: GameObjects.Graphics;
    private progressFraction: GameObjects.Text;
    private total: number;

    constructor(scene: Scene, config: SceneProgressFooterConfig) {
        const { x, y, width } = config;
        const height = 100;
        const radius = 18;
        this.total = config.total;

        const card = scene.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(x, y, width, height, radius);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(x, y, width, height, radius);

        const sceneLabel = scene.add.text(x + 28, y + 34, config.sceneLabel, {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: PRIMARY_BLUE_HEX,
        });
        const sceneTitle = scene.add.text(x + 28, y + 58, config.sceneTitle, {
            fontFamily: "Arial Black",
            fontSize: 18,
            color: DARK_NAVY,
        });

        const progressX = x + 285;
        const progressLabel = scene.add.text(
            progressX,
            y + 29,
            config.progressLabel,
            {
                fontFamily: "Arial Black",
                fontSize: 13,
                color: PRIMARY_BLUE_HEX,
            },
        );

        this.progressBar = scene.add.graphics();
        this.progressBar.setPosition(progressX, y + 56);

        this.progressFraction = scene.add
            .text(progressX + 452, y + 62, "", {
                fontFamily: "Arial Black",
                fontSize: 17,
                color: DARK_NAVY,
            })
            .setOrigin(0, 0.5);

        this.view = [
            card,
            sceneLabel,
            sceneTitle,
            progressLabel,
            this.progressBar,
            this.progressFraction,
        ];

        this.setProgress(0);
    }

    setProgress(current: number) {
        const totalWidth = 420;
        const gap = 8;
        const segmentWidth = (totalWidth - gap * (this.total - 1)) / this.total;

        this.progressBar.clear();
        for (let i = 0; i < this.total; i++) {
            const filled = i < current;
            this.progressBar.fillStyle(filled ? PRIMARY_BLUE : 0xdce6f5, 1);
            this.progressBar.fillRoundedRect(
                i * (segmentWidth + gap),
                0,
                segmentWidth,
                10,
                5,
            );
        }

        this.progressFraction.setText(`${current} / ${this.total}`);
    }
}
