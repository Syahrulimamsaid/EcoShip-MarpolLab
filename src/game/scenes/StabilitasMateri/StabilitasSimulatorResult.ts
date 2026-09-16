import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, PRIMARY_BLUE } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { getStabilityModuleProgress } from "../../StabilityModuleState";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;
const GREEN_HEX = "#1f8d52";

/**
 * "Hasil Simulator" — shown once the existing SimulatorStabilitas scene
 * finishes its 3rd case, mirroring StabilitasQuiz's result screen so both
 * activities end on a matching results page before returning to the
 * Pilih Aktivitas hub.
 */
export class StabilitasSimulatorResult extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    constructor() {
        super("StabilitasSimulatorResult");
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildResultCard());
        this.transitionGroups = groups;

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey));
    }

    private buildHeader() {
        const header = new ModuleHeader(this, {
            x: MARGIN,
            badgeLabel: "MODUL SIMULATOR STABILITAS",
            breadcrumbLabel: "Hasil Simulator",
            heading: "HASIL SIMULATOR",
            subtitle: "Ringkasan hasil simulasi distribusi muatan yang telah kamu selesaikan.",
            onBack: () => this.goTo("PilihAktivitasStabilitas"),
        });
        this.root.add(header.view);
    }

    private buildResultCard() {
        const progress = getStabilityModuleProgress();
        const cardX = MARGIN;
        const cardY = 300;
        const cardWidth = DESIGN_WIDTH - MARGIN * 2;
        const cardHeight = 420;
        const centerX = cardX + cardWidth / 2;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        card.lineStyle(2, PRIMARY_BLUE, 0.9);
        card.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        this.root.add(card);

        const icon = this.add.text(centerX, cardY + 70, "✓", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 52, color: GREEN_HEX }).setOrigin(0.5);
        const title = this.add
            .text(centerX, cardY + 140, "3/3 CASE BERHASIL DISELESAIKAN", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 24, color: GREEN_HEX })
            .setOrigin(0.5);
        const subtitle = this.add
            .text(centerX, cardY + 178, "Kapal berhasil dikembalikan ke kondisi stabil pada setiap studi kasus.", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 14,
                color: BODY_TEXT,
            })
            .setOrigin(0.5);
        this.root.add([icon, title, subtitle]);

        const needsQuizCta = !progress.quizCompleted;
        const buttonWidth = 260;
        const buttonHeight = 52;
        const buttonsTop = cardY + 250;
        const gap = 20;

        if (needsQuizCta) {
            const returnButton = new Button(this, {
                x: centerX - buttonWidth / 2 - gap / 2,
                y: buttonsTop + buttonHeight / 2,
                width: buttonWidth,
                height: buttonHeight,
                text: "KEMBALI KE PILIH AKTIVITAS",
                fontSize: 12,
                borderRadius: 14,
                fillColor: 0xffffff,
                strokeColor: PRIMARY_BLUE,
                strokeAlpha: 1,
                textColor: "#2f68d8",
                wordWrapWidth: buttonWidth - 24,
            });
            returnButton.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("PilihAktivitasStabilitas");
            });

            const quizButton = new Button(this, {
                x: centerX + buttonWidth / 2 + gap / 2,
                y: buttonsTop + buttonHeight / 2,
                width: buttonWidth,
                height: buttonHeight,
                text: "KERJAKAN KUIS →",
                fontSize: 14,
                borderRadius: 14,
                fillColor: PRIMARY_BLUE,
                strokeAlpha: 0,
                textColor: "#ffffff",
            });
            quizButton.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("StabilitasQuiz");
            });

            this.root.add([returnButton.view, quizButton.view]);
        } else {
            const returnButton = new Button(this, {
                x: centerX,
                y: buttonsTop + buttonHeight / 2,
                width: buttonWidth,
                height: buttonHeight,
                text: "KEMBALI KE PILIH AKTIVITAS",
                fontSize: 13,
                borderRadius: 14,
                fillColor: PRIMARY_BLUE,
                strokeAlpha: 0,
                textColor: "#ffffff",
                wordWrapWidth: buttonWidth - 24,
            });
            returnButton.on("pointerdown", () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("PilihAktivitasStabilitas");
            });
            this.root.add(returnButton.view);
        }
    }

    private layout(width: number, height: number) {
        this.background.setPosition(width / 2, height / 2);
        this.background.setDisplaySize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this.root.setScale(scale);
        const rootX = (width - DESIGN_WIDTH * scale) / 2;
        const rootY = (height - DESIGN_HEIGHT * scale) / 2;
        this.root.setPosition(rootX, rootY);
    }
}
