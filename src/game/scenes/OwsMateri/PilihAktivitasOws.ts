import { GameObjects, Scale, Scene } from "phaser";

import { Button } from "../../../component/Button/Button";
import { ModuleHeader } from "../../../component/ModuleHeader/ModuleHeader";
import {
    BODY_TEXT,
    BORDER_BLUE,
    DARK_NAVY,
    PRIMARY_BLUE,
} from "../../../component/ModulePanel/ModulePanel";
import {
    playSceneEnter,
    playSceneExit,
    trackGroup,
} from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx, playVoiceSfx } from "../../SfxManager";
import { getOwsModuleProgress } from "../../OwsModuleState";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;

const CARD_Y = 300;
const CARD_HEIGHT = 560;
const CARD_GAP = 32;
const CARD_WIDTH = (DESIGN_WIDTH - MARGIN * 2 - CARD_GAP) / 2;

const GREEN_HEX = "#1f8d52";

interface ActivityCardConfig {
    x: number;
    icon: string;
    title: string;
    description: string;
    infoPill: string;
    statusLabel: string;
    statusColor: string;
    buttonLabel: string;
    hoverSfxKey: string;
    onStart: () => void;
}

/**
 * The non-linear activity picker between Materi OWS and its two downstream
 * activities (Simulator OWS / Kuis MARPOL Annex I) — a hub, reached after
 * finishing the material and returned to after either activity's result
 * screen. Structurally a twin of PilihAktivitasStabilitas.
 */
export class PilihAktivitasOws extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    constructor() {
        super("PilihAktivitasOws");
    }

    create() {
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildHeader());
        trackGroup(this.root, groups, () => this.buildCards());
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
        playSceneExit(this, this.transitionGroups, () =>
            this.scene.start(sceneKey),
        );
    }

    // ---- Header ---------------------------------------------------------------

    private buildHeader() {
        const header = new ModuleHeader(this, {
            x: MARGIN,
            badgeLabel: "MODUL SIMULATOR OWS",
            breadcrumbLabel: "Pilih Aktivitas",
            heading: "PILIH AKTIVITAS",
            subtitle: "Terapkan pemahamanmu melalui simulasi atau kuis.",
            onBack: () => this.goTo("MainMenu"),
        });
        this.root.add(header.view);
    }

    // ---- Cards ------------------------------------------------------------------

    private buildCards() {
        const progress = getOwsModuleProgress();

        this.buildActivityCard({
            x: MARGIN,
            icon: "🛢️",
            title: "SIMULATOR OWS",
            description:
                "Operasikan katup Oily Water Separator untuk menurunkan kadar minyak sebelum batas waktu habis.",
            infoPill: "TIME ATTACK",
            statusLabel: progress.simulatorCompleted
                ? "✓ SELESAI"
                : "BELUM DIKERJAKAN",
            statusColor: progress.simulatorCompleted ? GREEN_HEX : BODY_TEXT,
            buttonLabel: "MULAI SIMULATOR",
            hoverSfxKey: SFX_KEYS.menuAnatomi,
            onStart: () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("SimulatorOws");
            },
        });

        this.buildActivityCard({
            x: MARGIN + CARD_WIDTH + CARD_GAP,
            icon: "📝",
            title: "KUIS MARPOL ANNEX I",
            description:
                "Uji pemahaman konsep pencegahan pencemaran minyak dari kapal (MARPOL Annex I).",
            infoPill: "5 SOAL",
            statusLabel: progress.quizCompleted
                ? `✓ SELESAI · Skor: ${progress.quizScore}`
                : "BELUM DIKERJAKAN",
            statusColor: progress.quizCompleted ? GREEN_HEX : BODY_TEXT,
            buttonLabel: "MULAI KUIS",
            hoverSfxKey: SFX_KEYS.menuKuis,
            onStart: () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("OwsQuiz");
            },
        });
    }

    private buildActivityCard(cfg: ActivityCardConfig) {
        const { x } = cfg;
        const paddingX = 36;
        const centerX = x + CARD_WIDTH / 2;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(x, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 20);
        card.lineStyle(2, BORDER_BLUE, 1);
        card.strokeRoundedRect(x, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 20);
        this.root.add(card);

        const icon = this.add
            .text(centerX, CARD_Y + 70, cfg.icon, {
                fontFamily: "Arial",
                fontSize: 48,
            })
            .setOrigin(0.5);

        const title = this.add
            .text(centerX, CARD_Y + 140, cfg.title, {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: DARK_NAVY,
            })
            .setOrigin(0.5);

        const description = this.add
            .text(x + paddingX, CARD_Y + 190, cfg.description, {
                fontFamily: "Arial",
                fontSize: 14,
                color: BODY_TEXT,
                align: "center",
                lineSpacing: 6,
                wordWrap: { width: CARD_WIDTH - paddingX * 2 },
            })
            .setOrigin(0, 0);
        description.setX(centerX - description.width / 2);

        const pillY = CARD_Y + 270;
        const pillText = this.add.text(0, 0, cfg.infoPill, {
            fontFamily: "Arial Black",
            fontSize: 13,
            color: "#ffffff",
        });
        const pillWidth = pillText.width + 36;
        const pillBg = this.add.graphics();
        pillBg.fillStyle(PRIMARY_BLUE, 1);
        pillBg.fillRoundedRect(
            centerX - pillWidth / 2,
            pillY - 17,
            pillWidth,
            34,
            17,
        );
        pillText.setPosition(centerX, pillY);
        pillText.setOrigin(0.5);

        const statusText = this.add
            .text(centerX, CARD_Y + 330, cfg.statusLabel, {
                fontFamily: "Arial Black",
                fontSize: 14,
                color: cfg.statusColor,
            })
            .setOrigin(0.5);

        const buttonWidth = 240;
        const buttonHeight = 54;
        const buttonY = CARD_Y + CARD_HEIGHT - 70;
        const button = new Button(this, {
            x: centerX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            text: cfg.buttonLabel,
            fontSize: 15,
            borderRadius: 14,
            fillColor: PRIMARY_BLUE,
            strokeAlpha: 0,
            textColor: "#ffffff",
        });
        button.on("pointerdown", cfg.onStart);
        button.on("pointerover", () => playVoiceSfx(this, cfg.hoverSfxKey));

        this.root.add([
            icon,
            title,
            description,
            pillBg,
            pillText,
            statusText,
            button.view,
        ]);
    }

    // ---- Layout -------------------------------------------------------------------

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
