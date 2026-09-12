import { GameObjects, Scale, Scene } from "phaser";

import { createBackButton } from "../../../component/ModuleHeader/ModuleHeader";
import { BODY_TEXT, DARK_NAVY, PRIMARY_BLUE, PRIMARY_BLUE_HEX } from "../../../component/ModulePanel/ModulePanel";
import { playSceneEnter, playSceneExit, trackGroup } from "../../../component/SceneTransition";
import { EventBus } from "../../EventBus";

// Authored at a fixed reference resolution and uniformly scaled to fit the
// window, same approach as the other module scenes.
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1060;
const MARGIN = 40;

const CARD_WIDTH = 1000;

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
        this.background = this.add.image(0, 0, "AnatomiStructure.background");
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
        const backButton = createBackButton(this, MARGIN, 40, () => this.goTo("MainMenu"));

        const title = this.add
            .text(DESIGN_WIDTH / 2, 67, "TENTANG", {
                fontFamily: "Arial Black",
                fontSize: 32,
                color: DARK_NAVY,
            })
            .setOrigin(0.5);

        this.root.add([backButton, title]);
    }

    // ---- Content card -----------------------------------------------------------

    private buildContentCard() {
        const paddingX = 36;
        const paddingY = 32;
        const textWidth = CARD_WIDTH - paddingX * 2;

        const cardContainer = this.add.container(0, 0);

        let cursorY = paddingY;
        cursorY += this.buildProfilPengembang(paddingX, cursorY, textWidth, cardContainer) + 28;
        cursorY +=
            this.buildLabeledParagraph(
                paddingX,
                cursorY,
                textWidth,
                "Aset gambar",
                "Ilustrasi, karakter, dan ikon dibuat dengan bantuan ChatGPT (OpenAI).",
                cardContainer,
            ) + 28;
        cursorY += this.buildLabeledParagraph(paddingX, cursorY, textWidth, "Music", "Pixabay — pixabay.com (Free License)", cardContainer) + 28;
        cursorY += this.buildDaftarPustaka(paddingX, cursorY, textWidth, cardContainer);
        cursorY += paddingY;

        const cardHeight = cursorY;

        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1);
        card.fillRoundedRect(0, 0, CARD_WIDTH, cardHeight, 20);
        card.lineStyle(2, PRIMARY_BLUE, 0.9);
        card.strokeRoundedRect(0, 0, CARD_WIDTH, cardHeight, 20);
        cardContainer.addAt(card, 0);

        cardContainer.setPosition((DESIGN_WIDTH - CARD_WIDTH) / 2, (DESIGN_HEIGHT - cardHeight) / 2);
        this.root.add(cardContainer);
    }

    private buildProfilPengembang(x: number, y: number, width: number, container: GameObjects.Container): number {
        const header = this.add.text(x, y, "Profil Pengembang :", {
            fontFamily: "Arial Black",
            fontSize: 17,
            color: PRIMARY_BLUE_HEX,
        });
        container.add(header);

        const rows: Array<[string, string]> = [
            ["Judul", "Stabilitas Kapal Niaga dan Rangka Lambung"],
            ["Pengembang", "Creator (Muhamad Slamet Riyadi, S.Kom, M.Kom), Programmer dan Design Asset (Syahrul Imam Said)"],
            ["Program Keahlian", "Nautika Kapal Niaga"],
            ["Instansi", "SMK Negeri 2 Kudus"],
        ];

        const labelWidth = 170;
        const rowGap = 10;
        let rowY = y + header.height + 12;

        rows.forEach(([label, value]) => {
            const labelText = this.add.text(x, rowY, label, {
                fontFamily: "Arial Black",
                fontSize: 14,
                color: DARK_NAVY,
            });
            const colonText = this.add.text(x + labelWidth, rowY, ":", {
                fontFamily: "Arial Black",
                fontSize: 14,
                color: DARK_NAVY,
            });
            const valueText = this.add.text(x + labelWidth + 16, rowY, value, {
                fontFamily: "Arial",
                fontSize: 14,
                color: BODY_TEXT,
                lineSpacing: 4,
                wordWrap: { width: width - labelWidth - 16 },
            });
            container.add([labelText, colonText, valueText]);
            rowY += Math.max(labelText.height, valueText.height) + rowGap;
        });

        return rowY - rowGap - y;
    }

    private buildLabeledParagraph(x: number, y: number, width: number, label: string, body: string, container: GameObjects.Container): number {
        const header = this.add.text(x, y, `${label} :`, {
            fontFamily: "Arial Black",
            fontSize: 17,
            color: PRIMARY_BLUE_HEX,
        });

        const bodyText = this.add.text(x, y + header.height + 10, body, {
            fontFamily: "Arial",
            fontSize: 14,
            color: BODY_TEXT,
            lineSpacing: 4,
            wordWrap: { width },
        });

        container.add([header, bodyText]);
        return header.height + 10 + bodyText.height;
    }

    private buildDaftarPustaka(x: number, y: number, width: number, container: GameObjects.Container): number {
        const header = this.add.text(x, y, "Daftar Pustaka", {
            fontFamily: "Arial Black",
            fontSize: 17,
            color: PRIMARY_BLUE_HEX,
        });

        const bodyText = this.add.text(
            x,
            y + header.height + 10,
            "Referensi materi mengacu pada standar International Maritime Organization (IMO), Biro Klasifikasi Indonesia (BKI), dan sumber pembelajaran maritim terbuka lainnya.",
            {
                fontFamily: "Arial",
                fontSize: 14,
                color: BODY_TEXT,
                lineSpacing: 4,
                wordWrap: { width },
            },
        );

        container.add([header, bodyText]);
        return header.height + 10 + bodyText.height;
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
