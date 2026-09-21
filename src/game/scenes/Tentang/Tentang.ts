import { GameObjects, Scale, Scene } from "phaser";

import { DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";

// Authored at a fixed reference resolution and uniformly scaled to fit the
// window, same approach as the other module scenes.
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1060;
const MARGIN = 40;

const CARD_WIDTH = 1000;
const CARD_HEIGHT = 570;
const CARD_X = (DESIGN_WIDTH - CARD_WIDTH) / 2;
const CARD_Y = 214;
const PALE_BLUE = 0xeaf4ff;

/**
 * A single-panel "Tentang" (about) info page — developer profile, asset
 * credits, and bibliography — reached from MainMenu's Tentang button.
 * Purely informational: no interactive gameplay of its own.
 */
export class Tentang extends Scene {
    private background!: GameObjects.Image;
    private root!: GameObjects.Container;
    private transitionGroups: GameObjects.GameObject[][] = [];

    constructor() {
        super("Tentang");
    }

    create() {
        this.background = this.add.image(0, 0, "background.home");
        this.root = this.add.container(0, 0);

        const groups: GameObjects.GameObject[][] = [];
        trackGroup(this.root, groups, () => this.buildTopBar());
        trackGroup(this.root, groups, () => this.buildContentCard());
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

    // ---- Title + back button --------------------------------------------------

    private buildTopBar() {
        const backButton = this.add
            .image(MARGIN + 29, 68, "btn_back")
            .setDisplaySize(58, 58)
            .setInteractive({ useHandCursor: true })
            .on("pointerup", () => this.goTo("MainMenu"));

        const title = this.add
            .text(MARGIN + 86, 66, "TENTANG", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "800",
                fontSize: 38,
                color: DARK_NAVY,
            })
            .setOrigin(0, 0.5);

        const underline = this.add.graphics();
        underline.fillStyle(PRIMARY_BLUE, 1);
        underline.fillRoundedRect(MARGIN + 88, 94, 56, 7, 4);

        this.root.add([backButton, title, underline]);
    }

    // ---- Content card -----------------------------------------------------------

    private buildContentCard() {
        const cardContainer = this.add.container(CARD_X, CARD_Y);

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 0.97);
        card.fillRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 22);
        card.lineStyle(2, PRIMARY_BLUE, 0.94);
        card.strokeRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 22);
        cardContainer.addAt(card, 0);

        const divider = this.add.graphics();
        divider.lineStyle(2, PRIMARY_BLUE, 0.22);
        divider.lineBetween(360, 44, 360, 402);
        cardContainer.add(divider);

        const logo = this.add.image(184, 190, "logo").setDisplaySize(298, 118);
        const logoCaption = this.add
            .text(184, 294, "Kepedulian Lingkungan dan\nPencegahan Polusi Kelautan", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "500",
                fontSize: 16,
                color: PRIMARY_BLUE_HEX,
                align: "center",
                lineSpacing: 5,
            })
            .setOrigin(0.5, 0);
        cardContainer.add([logo, logoCaption]);

        const fieldX = 384;
        const fieldWidth = 584;
        const fields: Array<[string, string]> = [
            ["Judul", "EcoShip–MarpolLab"],
            ["Pengembang", "Muhamad Slamet Riyadi, S.Kom, M.Kom"],
            ["Programmer &\nDesain Asset", "Syahrul Imam Said"],
            ["Program Keahlian", "Nautika Kapal Niaga"],
            ["Instansi", "SMK Negeri 2 Kudus"],
        ];
        fields.forEach(([label, value], index) => {
            const y = 44 + index * 68;
            const row = this.add.graphics();
            row.fillStyle(PALE_BLUE, 1);
            row.fillRoundedRect(fieldX, y, fieldWidth, 58, 13);
            const labelText = this.add
                .text(fieldX + 16, y + 29, label, {
                    fontFamily: "Plus Jakarta Sans",
                    fontStyle: "700",
                    fontSize: 15,
                    color: DARK_NAVY,
                    lineSpacing: 2,
                })
                .setOrigin(0, 0.5);
            const colon = this.add
                .text(fieldX + 192, y + 29, ":", {
                    fontFamily: "Plus Jakarta Sans",
                    fontStyle: "700",
                    fontSize: 16,
                    color: DARK_NAVY,
                })
                .setOrigin(0.5);
            const valueText = this.add
                .text(fieldX + 220, y + 29, value, {
                    fontFamily: "Plus Jakarta Sans",
                    fontStyle: "500",
                    fontSize: 15,
                    color: DARK_NAVY,
                    wordWrap: { width: fieldWidth - 238 },
                })
                .setOrigin(0, 0.5);
            cardContainer.add([row, labelText, colon, valueText]);
        });

        this.buildInformationPanel(cardContainer);

        this.root.add(cardContainer);
    }

    private buildInformationPanel(container: GameObjects.Container) {
        const x = 32;
        const y = 430;
        const width = CARD_WIDTH - x * 2;
        const height = 108;
        const panel = this.add.graphics();
        panel.fillStyle(PALE_BLUE, 1);
        panel.fillRoundedRect(x, y, width, height, 16);

        const infoCircle = this.add.graphics();
        infoCircle.fillStyle(PRIMARY_BLUE, 1);
        infoCircle.fillCircle(x + 52, y + height / 2, 25);
        const infoText = this.add
            .text(x + 52, y + height / 2 + 1, "i", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "800",
                fontSize: 34,
                color: "#ffffff",
            })
            .setOrigin(0.5);
        const panelDivider = this.add.graphics();
        panelDivider.lineStyle(2, PRIMARY_BLUE, 0.24);
        panelDivider.lineBetween(x + 110, y + 20, x + 110, y + height - 20);
        const description = this.add
            .text(
                x + 140,
                y + height / 2,
                "Media pembelajaran interaktif ini dikembangkan untuk meningkatkan pemahaman siswa\nmengenai pengelolaan sampah kapal dan pencegahan polusi laut.",
                {
                    fontFamily: "Plus Jakarta Sans",
                    fontStyle: "500",
                    fontSize: 16,
                    color: DARK_NAVY,
                    lineSpacing: 7,
                },
            )
            .setOrigin(0, 0.5);
        container.add([panel, infoCircle, infoText, panelDivider, description]);
    }

    // ---- Layout -------------------------------------------------------------

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
