import { GameObjects, Scale, Scene } from "phaser";
import { BgmToggleButton } from "../../../component/Button/BgmToggleButton";
import { ExitButton } from "../../../component/Button/ExitButton";
import { TentangButton } from "../../../component/Button/TentangButton";
import { TaglineBar } from "../../../component/TaglineBar/TaglineBar";
import { initBgm, isBgmEnabled, toggleBgm } from "../../BgmManager";
import { EventBus } from "../../EventBus";
import { SFX_KEYS, playSfx, playVoiceSfx, stopVoiceSfx } from "../../SfxManager";
import { isModuleUnlocked, ModuleId } from "../../ModuleProgress";
import { CharacterPanel } from "./CharacterPanel";
import { CardIntroStyle, MenuCard } from "./MenuCard";
import { ModalExit } from "./ModalExit";

const MENU_MODULES: ModuleId[] = [
    "simulator-ows",
    "simulator-stabilitas",
    "hasil-umpan-balik",
];

export class MainMenu extends Scene {
    private background!: GameObjects.Image;
    private logo!: GameObjects.Image;
    private welcomeCard!: GameObjects.Graphics;
    private welcomeIconBg!: GameObjects.Graphics;
    private welcomeIcon!: GameObjects.Text;
    private welcomeTitle!: GameObjects.Text;
    private welcomeSubtitle!: GameObjects.Text;

    private menuCards: MenuCard[] = [];
    private characterPanel!: CharacterPanel;
    private tagline!: TaglineBar;
    private exitModal!: ModalExit;
    private exitButton!: ExitButton;
    private bgmToggleButton!: BgmToggleButton;
    private tentangButton!: TentangButton;
    // The entrance animation itself replays every time MainMenu loads
    // (consistent with every other scene's enter transition) — only the
    // character greeting VO is gated to the very first visit per session.
    private hasPlayedGreeting = false;

    // The logo's layout position (updated on every resize) plus a small
    // side-to-side sway offset animated continuously on top of it.
    private logoBaseX = 0;
    private logoBaseY = 0;
    private logoSwayOffset = 0;

    constructor() {
        super("MainMenu");
    }

    create() {
        this.background = this.add.image(0, 0, "background.home");

        this.logo = this.add.image(0, 0, "logo");

        this.welcomeCard = this.add.graphics();

        this.welcomeIconBg = this.add.graphics();
        this.welcomeIcon = this.add
            .text(0, 0, "🛡️", { fontFamily: "Arial", fontSize: 22 })
            .setOrigin(0.5);

        this.welcomeTitle = this.add
            .text(0, 0, "Selamat Datang, Penjaga Laut!", {
                fontFamily: "Arial Black",
                fontSize: 34,
                color: "#143a84",
            })
            .setOrigin(0, 0.5);

        this.welcomeSubtitle = this.add
            .text(
                0,
                0,
                "Pilih modul untuk memulai pembelajaran interaktifmu menjaga laut dari pencemaran.",
                {
                    fontFamily: "Arial",
                    fontSize: 18,
                    color: "#244f89",
                },
            )
            .setOrigin(0, 0.5);

        this.menuCards = [
            new MenuCard(this, {
                texture: "home.card.anatomi.vertical",
                locked: !isModuleUnlocked("simulator-ows"),
                onHover: () => playVoiceSfx(this, SFX_KEYS.menuAnatomi),
                onSelect: () => {
                    playSfx(this, SFX_KEYS.click);
                    this.playExitAnimation(() => this.scene.start("OwsMateri"));
                },
            }),
            new MenuCard(this, {
                texture: "home.card.stabilitas.vertical",
                locked: !isModuleUnlocked("simulator-stabilitas"),
                onHover: () => playVoiceSfx(this, SFX_KEYS.menuSimulator),
                onSelect: () => {
                    playSfx(this, SFX_KEYS.click);
                    this.playExitAnimation(() => this.scene.start("StabilitasMateri"));
                },
            }),
            new MenuCard(this, {
                texture: "home.card.hasil.vertical",
                locked: !isModuleUnlocked("hasil-umpan-balik"),
                onHover: () => playVoiceSfx(this, SFX_KEYS.menuEvaluasi),
                onSelect: () => {
                    playSfx(this, SFX_KEYS.click);
                    this.playExitAnimation(() => this.scene.start("HasilUmpanBalik"));
                },
            }),
        ];

        this.characterPanel = new CharacterPanel(this);

        this.tagline = new TaglineBar(this, 0, 0, 640, 90);

        this.exitButton = new ExitButton(this, {
            size: 40,
            onClick: () => {
                playSfx(this, SFX_KEYS.click);
                playVoiceSfx(this, SFX_KEYS.menuKeluar);
                this.exitModal.open();
            },
        });

        this.bgmToggleButton = new BgmToggleButton(this, {
            height: 44,
            initialEnabled: isBgmEnabled(),
            onToggle: () => {
                playSfx(this, SFX_KEYS.click);
                return toggleBgm();
            },
        });
        initBgm(this);

        this.tentangButton = new TentangButton(this, {
            width: 350,
            height: 90,
            onClick: () => {
                playSfx(this, SFX_KEYS.click);
                this.playExitAnimation(() => this.scene.start("Tentang"));
            },
        });
        this.tentangButton.on("pointerover", () => playVoiceSfx(this, SFX_KEYS.menuTentang));

        this.exitModal = new ModalExit(this, () =>
            this.playExitAnimation(() => this.scene.start("Preloader")),
        );

        this.refreshModuleLocks();
        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);

        this.startLogoSwayAnimation();
        this.playIntroAnimation();

        EventBus.emit("current-scene-ready", this);

        this.events.on("wake", () => this.refreshModuleLocks());

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private updateLogoPosition() {
        this.logo.setPosition(this.logoBaseX + this.logoSwayOffset, this.logoBaseY);
    }

    private startLogoSwayAnimation() {
        const swayAmplitude = 16;

        this.tweens.add({
            targets: this,
            logoSwayOffset: { from: -swayAmplitude, to: swayAmplitude },
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            onUpdate: () => this.updateLogoPosition(),
        });
    }

    private refreshModuleLocks() {
        this.menuCards.forEach((card, index) => {
            card.setLocked(!isModuleUnlocked(MENU_MODULES[index]));
        });
    }

    /** Every component gets its own entrance — mixed slide directions plus
     * a couple of bounces — rather than the whole screen rising in as one
     * uniform block. */
    private playIntroAnimation() {
        // A one-shot character greeting VO, layered on top of the looping
        // bgm.main (already started via initBgm() above) rather than
        // replacing it — only on this very first MainMenu load per session,
        // unlike the animation below which replays every visit.
        if (!this.hasPlayedGreeting) {
            this.hasPlayedGreeting = true;
            // playVoiceSfx (not playSfx) so this VO gets cut off the moment
            // any other voice line starts — a menu hover, the exit modal,
            // or the destination scene's own narration — instead of
            // bleeding on past the point the player has already navigated
            // away from MainMenu.
            playVoiceSfx(this, SFX_KEYS.greeting, 0.9);
        }

        // Logo: a fade + pop, not a position slide — its x is already
        // continuously driven by the sway animation.
        const logoScaleX = this.logo.scaleX;
        const logoScaleY = this.logo.scaleY;
        this.logo.alpha = 0;
        this.logo.scaleX = logoScaleX * 0.9;
        this.logo.scaleY = logoScaleY * 0.9;
        this.tweens.add({
            targets: this.logo,
            alpha: 1,
            scaleX: logoScaleX,
            scaleY: logoScaleY,
            duration: 550,
            ease: "Back.Out",
        });

        // Welcome card + text: slides down from above.
        const headerItems: Array<GameObjects.GameObject & { alpha: number; y: number }> = [
            this.welcomeCard,
            this.welcomeIconBg,
            this.welcomeIcon,
            this.welcomeTitle,
            this.welcomeSubtitle,
        ];
        headerItems.forEach((item, index) => {
            const baseY = item.y;
            item.alpha = 0;
            item.y = baseY - 30;
            this.tweens.add({
                targets: item,
                alpha: 1,
                y: baseY,
                duration: 500,
                delay: 80 + index * 60,
                ease: "Back.Out",
            });
        });

        // Menu cards: a different style per card so the row of three
        // doesn't read as one uniform block.
        const cardStyles: CardIntroStyle[] = ["slideUp", "bounce", "slideDown"];
        this.menuCards.forEach((card, index) => {
            card.playIntroAnimation(260 + index * 90, cardStyles[index % cardStyles.length]);
        });

        this.characterPanel.playIntroAnimation(320);

        // Bottom bar, the Tentang button, and the top-right controls rise
        // in last, after the main content is in place.
        this.introSlideUp(this.tagline.view, 560);
        this.introSlideUp(this.tentangButton.view, 620);
        this.introFadeScale(this.exitButton.view, 200);
        this.introFadeScale(this.bgmToggleButton.view, 260);
    }

    private introSlideUp(target: GameObjects.GameObject & { alpha: number; y: number }, delay: number) {
        const baseY = target.y;
        target.alpha = 0;
        target.y = baseY + 30;
        this.tweens.add({
            targets: target,
            alpha: 1,
            y: baseY,
            duration: 450,
            delay,
            ease: "Back.Out",
        });
    }

    private introFadeScale(target: GameObjects.GameObject & { alpha: number; scaleX: number; scaleY: number }, delay: number) {
        target.alpha = 0;
        target.scaleX = 0.8;
        target.scaleY = 0.8;
        this.tweens.add({
            targets: target,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            delay,
            ease: "Back.Out",
        });
    }

    /** The reverse of playIntroAnimation — every component animates out
     * individually before the next scene actually starts, instead of the
     * screen just cutting away. */
    private playExitAnimation(onComplete: () => void) {
        this.tweens.killTweensOf(this); // stop the logo sway from fighting the fade-out below
        // Guarantees the character greeting (or any other voice line) never
        // bleeds past the point the player has chosen to leave MainMenu,
        // even on a path that doesn't happen to trigger a replacement
        // voice line of its own.
        stopVoiceSfx();

        let maxEnd = 0;
        this.menuCards.forEach((card, index) => {
            maxEnd = Math.max(maxEnd, card.playExitAnimation(index * 40));
        });
        maxEnd = Math.max(maxEnd, this.characterPanel.playExitAnimation(40));

        const headerItems: Array<GameObjects.GameObject & { x: number; y: number; alpha: number }> = [
            this.logo,
            this.welcomeCard,
            this.welcomeIconBg,
            this.welcomeIcon,
            this.welcomeTitle,
            this.welcomeSubtitle,
        ];
        headerItems.forEach((item) => {
            maxEnd = Math.max(maxEnd, this.exitFade(item, -20, 0));
        });

        maxEnd = Math.max(maxEnd, this.exitFade(this.tagline.view, 20, 0));
        maxEnd = Math.max(maxEnd, this.exitFade(this.tentangButton.view, 20, 0));
        maxEnd = Math.max(maxEnd, this.exitFade(this.exitButton.view, 0, 0));
        maxEnd = Math.max(maxEnd, this.exitFade(this.bgmToggleButton.view, 0, 0));

        this.time.delayedCall(maxEnd, onComplete);
    }

    private exitFade(target: GameObjects.GameObject & { y: number; alpha: number }, dy: number, delay: number): number {
        const duration = 280;
        this.tweens.add({
            targets: target,
            y: target.y + dy,
            alpha: 0,
            duration,
            delay,
            ease: "Quad.In",
        });
        return delay + duration;
    }

    private layout(width: number, height: number) {
        const centerX = width / 2;
        const centerY = height / 2;

        this.background.setPosition(centerX, centerY);
        this.background.setDisplaySize(width, height);

        const headerPaddingX = Math.max(12, width * 0.012);
        // No top bar anymore — just a small top-right padding for the
        // floating exit button, and a flat top margin for the content below.
        const topEdgePaddingX = Math.max(16, width * 0.015);
        const topEdgePaddingY = Math.max(20, height * 0.03);
        // Shared height for the exit button and the BGM switch, so they're
        // proportioned to match each other exactly.
        const headerButtonHeight = Math.max(52, Math.min(68, height * 0.04));

        const cardsZoneLeft = Math.max(headerPaddingX, width * 0.01);
        // Reference zone used only to size the "normal" card grid before the
        // 1.2x enlargement below — the actual right edge is derived from the
        // final (bigger) card block further down, so it never overlaps the
        // character column.
        const cardsZoneWidthRef = width * 0.64 - cardsZoneLeft;

        // Left column stacks top-to-bottom: logo, then the welcome card
        // directly beneath it (same left edge), then the menu grid — matching
        // the sketch layout instead of floating the welcome text beside the logo.
        const logoMaxWidth = Math.min(width * 0.5, 660);
        const logoScale = logoMaxWidth / this.logo.width;
        const logoHeight = this.logo.height * logoScale;
        const logoTop = topEdgePaddingY;

        const welcomeCardGap = Math.max(10, height * 0.015);
        const welcomeCardTop = logoTop + logoHeight + welcomeCardGap;
        // Just an estimate for reserving vertical space — the welcome card is
        // actually sized to hug its text further down, once font sizes are known.
        // Kept slightly generous (rather than pixel-exact) since the margin
        // below it also has to absorb the menu cards' hover pop-out.
        const welcomeCardEstimatedHeight = Math.max(80, height * 0.09);

        // Cards (and the character column) are sized to fit the vertical band
        // that's actually free — below the welcome card, above the bottom bar —
        // rather than a flat % of window height, so shrinking the welcome card
        // directly reclaims room for the content below it.
        const bottomBarHeight = Math.max(45, height * 0.2);
        const bottomBarTopY = height - 60 - bottomBarHeight / 2;

        // Extra breathing room so a card's hover pop-out (scales up and lifts
        // slightly) doesn't collide with the welcome card above it.
        const welcomeCardToGridGap = Math.max(34, height * 0.045);
        const bandTop =
            welcomeCardTop + welcomeCardEstimatedHeight + welcomeCardToGridGap;
        const bandBottom = bottomBarTopY - 28;
        const availableBandHeight = Math.max(220, bandBottom - bandTop);

        const cardGapX = Math.max(22, width * 0.014);
        const cardGapY = Math.max(18, height * 0.02);
        // Portrait cards now (matches the *-ver.png assets, ~1024x1536), a
        // single row of 3 instead of the old 2-column wrapping landscape grid.
        const cardAspect = 3 / 2;
        const gridColumns = 3;
        const gridRows = Math.ceil(this.menuCards.length / gridColumns);

        const targetCardWidth = Math.min(
            460,
            (cardsZoneWidthRef - cardGapX * (gridColumns - 1)) / gridColumns,
        );
        let cardWidth = targetCardWidth;
        let cardHeight = cardWidth * cardAspect;

        const maxGridHeight =
            (availableBandHeight - cardGapY * (gridRows - 1)) / gridRows;
        if (cardHeight > maxGridHeight) {
            cardHeight = maxGridHeight;
            cardWidth = cardHeight / cardAspect;
        }

        // Menu cards enlarged ~1.2x, then re-clamped so the bigger cards still
        // fit the vertical band above the bottom bar.
        const cardSizeBoost = 1.2;
        cardWidth *= cardSizeBoost;
        cardHeight *= cardSizeBoost;
        if (cardHeight > maxGridHeight) {
            cardHeight = maxGridHeight;
            cardWidth = cardHeight / cardAspect;
        }
        cardHeight += 15;

        const cardScale = cardWidth / 460;
        const cardsBlockWidth =
            cardWidth * gridColumns + cardGapX * (gridColumns - 1);
        const cardsBlockHeight =
            cardHeight * gridRows + cardGapY * (gridRows - 1);
        const cardsBlockLeft =
            cardsZoneLeft +
            Math.max(0, (cardsZoneWidthRef - cardsBlockWidth) / 2);
        const cardsBlockCenterX = cardsBlockLeft + cardsBlockWidth / 2;
        const cardsBlockTop = bandTop;

        const rightColumnMargin = 15;
        const rightColumnLeft =
            Math.max(width * 0.64, cardsBlockLeft + cardsBlockWidth) +
            Math.max(16, width * 0.015);
        const rightColumnWidth = width - rightColumnLeft - rightColumnMargin;
        const rightColumnCenterX = rightColumnLeft + rightColumnWidth / 2;

        // Exit button and BGM switch float at the top-right corner directly
        // on the background now that there's no bar behind them, sized to
        // match each other via headerButtonHeight.
        const headerButtonCenterY = topEdgePaddingY + headerButtonHeight / 2;
        let currentRightX = width - topEdgePaddingX;

        this.exitButton.setSize(headerButtonHeight);
        this.exitButton.setPosition(
            currentRightX - headerButtonHeight / 2,
            headerButtonCenterY,
        );
        currentRightX -= headerButtonHeight;

        const bgmButtonGap = Math.max(10, width * 0.008);
        this.bgmToggleButton.setSize(headerButtonHeight);
        currentRightX -= bgmButtonGap;
        this.bgmToggleButton.setPosition(
            currentRightX - this.bgmToggleButton.width / 2,
            headerButtonCenterY,
        );

        // Centered over the menu grid's width, like the welcome card below it.
        this.logoBaseX = cardsBlockCenterX;
        this.logoBaseY = logoTop + logoHeight / 2;
        this.updateLogoPosition();
        this.logo.setDisplaySize(logoMaxWidth, logoHeight);

        // Size fonts first so the card can shrink-wrap to the actual text
        // extent instead of a fixed width/height.
        this.welcomeTitle.setFontSize(Math.max(20, 26 * cardScale));
        this.welcomeSubtitle.setFontSize(Math.max(13, 15 * cardScale));
        this.welcomeSubtitle.setWordWrapWidth(0);

        const welcomeCardPaddingX = Math.max(20, 22 * cardScale);
        const welcomeCardPaddingY = Math.max(14, 16 * cardScale);
        const welcomeTextGap = Math.max(6, 8 * cardScale);
        const welcomeCardRadius = 18;

        const welcomeContentWidth = Math.max(
            this.welcomeTitle.width,
            this.welcomeSubtitle.width,
        );
        const welcomeIconSize = Math.max(38, 46 * cardScale);
        const welcomeIconGap = Math.max(12, 14 * cardScale);

        // Just wide enough for the icon + text, but never wider than the
        // menu grid it's centered over.
        const welcomeCardWidth = Math.min(
            welcomeIconSize + welcomeIconGap + welcomeContentWidth + welcomeCardPaddingX * 2,
            cardsBlockWidth,
        );
        const welcomeCardHeight = Math.max(
            welcomeIconSize + welcomeCardPaddingY * 1.4,
            welcomeCardPaddingY * 2 +
                this.welcomeTitle.height +
                welcomeTextGap +
                this.welcomeSubtitle.height,
        );
        const welcomeCardX = cardsBlockCenterX - welcomeCardWidth / 2;

        this.welcomeCard.clear();
        this.welcomeCard.fillStyle(0xffffff, 0.92);
        this.welcomeCard.fillRoundedRect(
            welcomeCardX,
            welcomeCardTop,
            welcomeCardWidth,
            welcomeCardHeight,
            welcomeCardRadius,
        );
        this.welcomeCard.lineStyle(2, 0x2f68d8, 0.9);
        this.welcomeCard.strokeRoundedRect(
            welcomeCardX,
            welcomeCardTop,
            welcomeCardWidth,
            welcomeCardHeight,
            welcomeCardRadius,
        );

        const welcomeCardCenterY = welcomeCardTop + welcomeCardHeight / 2;
        const welcomeIconCenterX = welcomeCardX + welcomeCardPaddingX + welcomeIconSize / 2;

        this.welcomeIconBg.clear();
        this.welcomeIconBg.fillStyle(0x2f68d8, 1);
        this.welcomeIconBg.fillCircle(welcomeIconCenterX, welcomeCardCenterY, welcomeIconSize / 2);
        this.welcomeIcon.setFontSize(Math.max(18, 22 * cardScale));
        this.welcomeIcon.setPosition(welcomeIconCenterX, welcomeCardCenterY);

        const welcomeTextX = welcomeCardX + welcomeCardPaddingX + welcomeIconSize + welcomeIconGap;

        this.welcomeTitle.setPosition(
            welcomeTextX,
            welcomeCardTop + welcomeCardPaddingY + this.welcomeTitle.height / 2,
        );

        this.welcomeSubtitle.setPosition(
            welcomeTextX,
            welcomeCardTop +
                welcomeCardPaddingY +
                this.welcomeTitle.height +
                welcomeTextGap +
                this.welcomeSubtitle.height / 2,
        );

        this.menuCards.forEach((card, index) => {
            const column = index % gridColumns;
            const row = Math.floor(index / gridColumns);
            const cardX =
                cardsBlockLeft +
                cardWidth / 2 +
                column * (cardWidth + cardGapX);
            const cardY =
                cardsBlockTop + cardHeight / 2 + row * (cardHeight + cardGapY);
            card.layout(cardX, cardY, cardWidth, cardHeight);
        });

        this.characterPanel.layout(
            rightColumnCenterX - 150,
            logoTop + 130,
            cardsBlockTop + cardsBlockHeight - logoTop - 160,
            rightColumnWidth - rightColumnMargin - 160,
        );

        const taglineWidth = Math.min(width * 0.26, 480);
        const taglineHeight = Math.max(32, height * 0.13);
        this.tagline.setPosition(width * 0.47, height - 60);
        this.tagline.setSize(taglineWidth, taglineHeight);

        const bottomButtonScale = Math.max(0.68, cardScale * 0.74);
        const bottomButtonWidth = 300 * bottomButtonScale;
        const bottomButtonHeight = 78 * bottomButtonScale;

        // Flush against the true right edge (a small fixed margin, not a
        // percentage of the character column) so it never drifts into the
        // character artwork or the centered tagline bar at other aspect ratios.
        const bottomButtonMargin = 24;
        this.tentangButton.setPosition(width - bottomButtonMargin - bottomButtonWidth / 2, height - 60);
        this.tentangButton.setSize(bottomButtonWidth, bottomButtonHeight);

        this.exitModal.layout(centerX, centerY, width, height);
    }
}
