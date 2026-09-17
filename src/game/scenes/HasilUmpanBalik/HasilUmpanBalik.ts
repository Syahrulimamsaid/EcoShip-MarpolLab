import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, DARK_NAVY, PRIMARY_BLUE, createHeaderBarCard } from "../../../component/ModulePanel/ModulePanel";
import { EnterStyleName, playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx } from "../../SfxManager";
import { FINAL_EVALUATION_QUIZ } from "./FinalQuizData";

// Authored at a fixed reference resolution and uniformly scaled to fit the
// window, same approach as the other module scenes.
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1060;
const MARGIN = 40;
const CARD_WIDTH = 900;
const CARD_HEIGHT = 580;
const CARD_X = DESIGN_WIDTH / 2 - CARD_WIDTH / 2;
const CARD_Y = 300;
const HEADER_HEIGHT = 64;

/**
 * Hasil & Umpan Balik's whole purpose is the cumulative final-evaluation
 * quiz — this scene is just its info/launch screen: what the quiz covers,
 * what finishing it earns, and a single "MULAI EVALUASI" button that hands
 * off to QuizScene (see FinalQuizData.ts for the actual 10 questions).
 */
export class HasilUmpanBalik extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];
    private transitionStyles: (EnterStyleName | undefined)[] = [];

    constructor() {
        super("HasilUmpanBalik");
    }

    create() {
        this.background = this.add.image(0, 0, "soped.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        const styles: (EnterStyleName | undefined)[] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        styles.push(undefined);
        trackGroup(this.root, groups, () => this.buildCardChrome());
        styles.push(undefined);
        trackGroup(this.root, groups, () => this.buildIcon());
        styles.push("bounce");
        trackGroup(this.root, groups, () => this.buildTitleAndDescription());
        styles.push(undefined);
        trackGroup(this.root, groups, () => this.buildStartButton());
        styles.push("up");
        this.transitionGroups = groups;
        this.transitionStyles = styles;

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        playSceneEnter(this, groups, styles);

        EventBus.emit("current-scene-ready", this);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private goTo(sceneKey: string) {
        playSceneExit(this, this.transitionGroups, () => this.scene.start(sceneKey), this.transitionStyles);
    }

    private buildHeader() {
        const header = new ModuleHeader(this, {
            x: MARGIN,
            badgeLabel: "MODUL HASIL & UMPAN BALIK",
            breadcrumbLabel: "Kuis Evaluasi Akhir",
            heading: "Hasil & Umpan Balik",
            subtitle: "Uji seluruh pemahamanmu lewat kuis evaluasi akhir sebelum menyelesaikan modul ini.",
            onBack: () => this.goTo("MainMenu"),
        });
        this.root.add(header.view);
    }

    private buildCardChrome() {
        const chrome = createHeaderBarCard(this, CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, "KUIS EVALUASI AKHIR", HEADER_HEIGHT);
        this.root.add(chrome);
    }

    private buildIcon() {
        const centerX = CARD_X + CARD_WIDTH / 2;
        const bodyTop = CARD_Y + HEADER_HEIGHT + 36;
        const icon = this.add.text(centerX, bodyTop, "🏁", { fontFamily: "Plus Jakarta Sans", fontStyle: "600", fontSize: 56 }).setOrigin(0.5, 0);
        this.root.add(icon);
    }

    private buildTitleAndDescription() {
        const centerX = CARD_X + CARD_WIDTH / 2;
        const contentWidth = CARD_WIDTH - 140;
        const bodyTop = CARD_Y + HEADER_HEIGHT + 36;

        const title = this.add
            .text(centerX, bodyTop + 88, "Evaluasi Akhir: Semua Materi", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 24,
                color: DARK_NAVY,
                align: "center",
            })
            .setOrigin(0.5, 0);

        const description = this.add
            .text(
                centerX,
                bodyTop + 138,
                'Kuis ini terdiri dari 10 soal yang merangkum seluruh materi — mulai dari struktur dasar berganda kapal dan SOP darurat kebocoran, hingga simulasi distribusi muatan & stabilitas kapal.\n\nUrutan soal dan pilihan jawaban diacak setiap kali kamu memulai. Jawablah seluruh soal dengan benar untuk mengklaim lencana "Master of Maritime Safety" dan menyelesaikan modul ini sepenuhnya.',
                {
                    fontFamily: "Plus Jakarta Sans",
                    fontStyle: "600",
                    fontSize: 15,
                    color: BODY_TEXT,
                    align: "center",
                    lineSpacing: 6,
                    wordWrap: { width: contentWidth },
                },
            )
            .setOrigin(0.5, 0);

        this.root.add([title, description]);
    }

    private buildStartButton() {
        const centerX = CARD_X + CARD_WIDTH / 2;
        const buttonWidth = 300;
        const buttonHeight = 56;
        const buttonY = CARD_Y + CARD_HEIGHT - 80;

        const button = new Button(this, {
            x: centerX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            text: "🚀 MULAI EVALUASI",
            fontSize: 16,
            borderRadius: 14,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        button.on("pointerdown", () => {
            playSfx(this, SFX_KEYS.click);
            this.startFinalQuiz();
        });

        this.root.add(button.view);
    }

    /** Launches the cumulative 10-question evaluation quiz covering every
     * module — see FinalQuizData.ts. */
    private startFinalQuiz() {
        playSceneExit(
            this,
            this.transitionGroups,
            () =>
                this.scene.start("QuizScene", {
                    config: FINAL_EVALUATION_QUIZ,
                    returnScene: "HasilUmpanBalik",
                    moduleId: "hasil-umpan-balik",
                }),
            this.transitionStyles,
        );
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
