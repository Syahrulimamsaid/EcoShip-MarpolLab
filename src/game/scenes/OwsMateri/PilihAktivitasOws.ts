import { GameObjects, Scale, Scene } from "phaser";

import {
    playSceneEnter,
    playSceneExit,
    trackGroup,
} from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx, playVoiceSfx } from "../../SfxManager";

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 980;
const MARGIN = 40;

// Every visual on this screen (back button, header banner, both activity
// cards) is a fully pre-composed illustration asset — no hand-drawn
// chrome/text — so layout here is just placement + an invisible hit area
// per interactive image, matching the codebase's MenuCard.ts convention.
const DESKRIPSI_WIDTH = 400;
const CARD_GAP = 28;
const CARD_WIDTH = ((DESIGN_WIDTH - MARGIN * 2 - CARD_GAP) / 2) * 0.8;

interface ActivityCardConfig {
    x: number;
    texture: string;
    hoverSfxKey: string;
    onStart: () => void;
}

/**
 * The non-linear activity picker between Materi OWS and its two downstream
 * activities (Simulator OWS / Kuis MARPOL Annex I) — a hub, reached after
 * finishing the material and returned to after either activity's result
 * screen.
 */
export class PilihAktivitasOws extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    constructor() {
        super("PilihAktivitasOws");
    }

    create() {
        this.background = this.add.image(0, 0, "ows.background");
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

    // ---- Header (back button + "Pilih Aktivitas" banner, both pre-composed images) ----

    private buildHeader() {
        const backHeight = 56;
        const backButton = this.buildImageButton(
            "btn_home",
            MARGIN + backHeight / 2,
            MARGIN + backHeight / 2,
            backHeight,
            backHeight,
            () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("MainMenu");
            },
        );

        const deskripsiHeight = DESKRIPSI_WIDTH * (400 / 1450);
        const deskripsiTop = MARGIN + backHeight + 14;
        const deskripsi = this.add
            .image(MARGIN, deskripsiTop, "ows.deskripsiMenu")
            .setOrigin(0, 0)
            .setDisplaySize(DESKRIPSI_WIDTH, deskripsiHeight);

        this.root.add([deskripsi, backButton]);
    }

    // ---- Cards (fully pre-composed illustration assets) ------------------------------

    private buildCards() {
        this.buildActivityCard({
            x: MARGIN * 5,
            texture: "ows.cardSimulator",
            hoverSfxKey: SFX_KEYS.menuAnatomi,
            onStart: () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("SimulatorOws");
            },
        });

        this.buildActivityCard({
            x: (MARGIN * 5) + CARD_WIDTH + CARD_GAP,
            texture: "ows.cardKuis",
            hoverSfxKey: SFX_KEYS.menuKuis,
            onStart: () => {
                playSfx(this, SFX_KEYS.click);
                this.goTo("OwsQuiz");
            },
        });
    }

    private buildActivityCard(cfg: ActivityCardConfig) {
        const texture = this.textures.get(cfg.texture).getSourceImage();
        const cardHeight = CARD_WIDTH * (texture.height / texture.width);
        const centerX = cfg.x + CARD_WIDTH / 2;
        const centerY = DESIGN_HEIGHT / 2;

        const card = this.add
            .image(centerX, centerY, cfg.texture)
            .setDisplaySize(CARD_WIDTH, cardHeight)
            .setInteractive({ useHandCursor: true });
        card.setData("baseX", centerX);
        card.setData("baseY", centerY);

        let hoverTween: Phaser.Tweens.Tween | null = null;
        card.on("pointerover", () => {
            playVoiceSfx(this, cfg.hoverSfxKey);
            hoverTween?.stop();
            hoverTween = this.tweens.add({
                targets: card,
                scaleX: card.scaleX * 1.03,
                scaleY: card.scaleY * 1.03,
                y: centerY - 6,
                duration: 160,
                ease: "Quad.Out",
            });
        });
        card.on("pointerout", () => {
            hoverTween?.stop();
            hoverTween = this.tweens.add({
                targets: card,
                scaleX: CARD_WIDTH / texture.width,
                scaleY: cardHeight / texture.height,
                y: centerY,
                duration: 160,
                ease: "Quad.Out",
            });
        });
        card.on("pointerdown", cfg.onStart);

        this.root.add(card);
    }

    /** A fully pre-composed image acting as a button — an invisible hit
     * area sized to the image plus a small hover lift, mirroring MenuCard's
     * whole-image-is-the-button convention. */
    private buildImageButton(
        texture: string,
        x: number,
        y: number,
        width: number,
        height: number,
        onClick: () => void,
    ): GameObjects.Image {
        const image = this.add
            .image(x, y, texture)
            .setDisplaySize(width, height)
            .setInteractive({ useHandCursor: true });
        image.setData("baseY", y);

        let hoverTween: Phaser.Tweens.Tween | null = null;
        image.on("pointerover", () => {
            hoverTween?.stop();
            hoverTween = this.tweens.add({
                targets: image,
                y: y - 3,
                duration: 140,
                ease: "Quad.Out",
            });
        });
        image.on("pointerout", () => {
            hoverTween?.stop();
            hoverTween = this.tweens.add({
                targets: image,
                y,
                duration: 140,
                ease: "Quad.Out",
            });
        });
        image.on("pointerdown", onClick);

        return image;
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
