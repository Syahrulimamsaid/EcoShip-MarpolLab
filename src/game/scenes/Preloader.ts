import { GameObjects, Scene, Scale } from "phaser";
import { SOPEP_STEP1_ASSETS, SOPEP_STEP2_ASSETS, SOPEP_STEP3_ASSETS, SOPEP_STEP4_ASSETS, SOPEP_STEP5_ASSETS } from "./SopepSimulator/config/assetKeys";

// Boot.ts only loads the handful of assets this scene needs to render
// itself (background, logo, touch button) — everything else loads below in
// preload(), while this screen is already visible, so the progress bar
// reflects real loading progress instead of a canvas sitting on a flat
// background color. This is just a floor so the screen doesn't flash by
// instantly if everything happens to load from cache in a few milliseconds.
const MIN_DISPLAY_DURATION = 500;

export class Preloader extends Scene {
    private background!: GameObjects.Image;
    private logo!: GameObjects.Image;
    private progressFrame!: Phaser.GameObjects.Graphics;
    private progressFill!: Phaser.GameObjects.Graphics;
    private progressText!: GameObjects.Text;
    private continueTextBg!: Phaser.GameObjects.Graphics;
    private continueText!: GameObjects.Text;
    private touchButton!: GameObjects.Image;
    private isReadyToContinue = false;
    private progressValue = 0;
    private hasPlayedIntro = false;
    private progressIntroScale = 1;
    private realLoadComplete = false;
    private minDurationElapsed = false;

    constructor() {
        super("Preloader");
    }

    init() {
        this.background = this.add.image(0, 0, "background");
        this.logo = this.add.image(0, 0, "logo").setDepth(20);

        this.progressFrame = this.add.graphics();
        this.progressFill = this.add.graphics();

        this.progressText = this.add
            .text(0, 0, "0% Memuat Konten", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 28,
                color: "#d4f0ff",
            })
            .setOrigin(0.5);

        // A rounded pill behind the "click anywhere" text — drawn as its
        // own Graphics object (rather than a text stroke) so it reads as a
        // real container: rounded corners, light-blue fill, dark-blue border.
        this.continueTextBg = this.add.graphics().setAlpha(0);

        this.continueText = this.add
            .text(0, 0, "Klik di mana saja untuk lanjut", {
                fontFamily: "Plus Jakarta Sans",
                fontStyle: "600",
                fontSize: 22,
                color: "#0b4f7a",
            })
            .setOrigin(0.5)
            .setAlpha(0);

        this.touchButton = this.add
            .image(0, 0, "btn.touch")
            .setOrigin(0.5)
            .setAlpha(0);

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);

        this.load.on("progress", (value: number) => {
            this.progressValue = value;
            this.updateProgressDisplay();
        });
        this.load.once("complete", () => {
            this.realLoadComplete = true;
            this.tryFinishLoading();
        });
    }

    preload() {
        this.load.image("star", "assets/star.png");
        this.load.image("profile.human", "assets/profile.png");
        this.load.image("character", "assets/character.png");
        this.load.audio("bgm.main", "assets/bgm/mangmaru-shameless-child-327092.mp3");
        this.load.audio("sfx.menuClick", "assets/soundeffect/menu-click.mp3");
        this.load.audio("bgm.dubbing_greeting", "assets/soundeffect/dashboard_archilab.mp3");
        this.load.audio("bgm.quizThinking", "assets/bgm/sonican-thinking-time.mp3");
        this.load.audio("sfx.quizWrong", "assets/soundeffect/quiz_wrong.webm");
        this.load.audio("sfx.quizCorrect", "assets/soundeffect/complete_evaluation.ogg");

        // Materi narration/hover/result voice lines.
        this.load.audio("sfx.keterangan.stabilitas", "assets/soundeffect/materi/keterangan_stabilitas_kapal.mp3");
        this.load.audio("sfx.menu.anatomi", "assets/soundeffect/materi/menu_anatomi_struktur_kapal.mp3");
        this.load.audio("sfx.menu.simulator", "assets/soundeffect/materi/menu_simulator_struktur_kapal.mp3");
        this.load.audio("sfx.menu.evaluasi", "assets/soundeffect/materi/menu_evaluasi_umpan_balik.mp3");
        this.load.audio("sfx.menu.tentang", "assets/soundeffect/materi/menu_tentang.mp3");
        this.load.audio("sfx.menu.keluar", "assets/soundeffect/materi/menu_keluar.mp3");
        this.load.audio("sfx.menu.kuis", "assets/soundeffect/materi/menu_kuis.mp3");
        this.load.audio("sfx.nilai.baik", "assets/soundeffect/materi/nilai_baik.mp3");
        this.load.audio("sfx.nilai.kurang", "assets/soundeffect/materi/nilai_kurang.mp3");

        this.load.image("background.home", "assets/home/bg.png");
        this.load.image(
            "home.card.anatomi",
            "assets/home/card-anatomi-struktur_new.png",
        );
        this.load.image(
            "home.card.stabilitas",
            "assets/home/card-simulator-stablitas-new.png",
        );
        this.load.image(
            "home.card.hasil",
            "assets/home/card-hasil_new.png",
        );
        this.load.image(
            "home.card.anatomi.vertical",
            "assets/home/card-anatomi-struktur-ver.png",
        );
        this.load.image(
            "home.card.stabilitas.vertical",
            "assets/home/card-simulator-stablitas-ver.png",
        );
        this.load.image(
            "home.card.hasil.vertical",
            "assets/home/card-hasil-ver.png",
        );
        this.load.image(
            "home.card.evaluasi.vertical",
            "assets/home/card-evaluasi-ver.png",
        );
        this.load.image("home.card.profile", "assets/home/card_profile.png");
        this.load.image("home.btn.settings", "assets/home/btn_settings.png");
        this.load.image(
            "home.btn.achievements",
            "assets/home/btn_achievements.png",
        );
        this.load.image("home.btn.power", "assets/home/btn_power.png");
        this.load.image("home.btn.mulai", "assets/home/btn-mulai_modul.png");
        this.load.image("home.btn.exit", "assets/home/btn_exit.png");
        this.load.image("home.bottom.banner", "assets/bottom_banner.png");

        // Shared backdrop for every module content scene (materi/hub/quiz/
        // result screens across all modules, not anatomi-specific despite
        // the texture key name).
        this.load.image(
            "AnatomiStructure.background",
            "assets/bg-sub.png",
        );

        this.load.image(
            "ows.background",
            "assets/ows/bg.png",
        );

        this.load.image(
            "soped.background",
            "assets/soped/bg.png",
        );
        this.load.image("soped.illustration.administrasi", "assets/soped/img-pertugas-memeriksa.png");
        this.load.image("soped.illustration.dokumen", "assets/soped/img-susunan-doc.png");
        this.load.image("soped.illustration.pelaporan", "assets/soped/img-komunikasi-radio.png");
        this.load.image("soped.illustration.pencatatan", "assets/soped/img-review-drill.png");

        // SOPEP Step 1 assets use the user-provided simulator/1 folder.
        SOPEP_STEP1_ASSETS.forEach(([key, path]) => this.load.image(key, path));
        SOPEP_STEP2_ASSETS.forEach(([key, path]) => this.load.image(key, path));
        SOPEP_STEP3_ASSETS.forEach(([key, path]) => this.load.image(key, path));
        SOPEP_STEP4_ASSETS.forEach(([key, path]) => this.load.image(key, path));
        SOPEP_STEP5_ASSETS.forEach(([key, path]) => this.load.image(key, path));

        // Shared header nav icons — Home (always present) and Back (only on
        // pages reached beyond a module's first-level materi/hub screen).
        this.load.image("btn_home", "assets/btn_home.png");
        this.load.image("btn_back", "assets/btn_back.png");

        this.load.image("ows.cardSimulator", "assets/ows/card_menu_simulasi_ows.png");
        this.load.image("ows.cardKuis", "assets/ows/card_menu_kuis_marpol.png");
        this.load.image("ows.deskripsiMenu", "assets/ows/deskripsi_menu.png");
        this.load.image("ows.component", "assets/ows/component_ows.png");
        this.load.image("ows.cardIndikator", "assets/ows/card_indikator_simulasi.png");
        this.load.image("ows.cardInstruksi", "assets/ows/card_intruksi_simulasi.png");

        this.load.image("pilah_sampah.background", "assets/pilah_sampah/bg.png");
        this.load.image("pilah_sampah.instruksi", "assets/pilah_sampah/intruksi.png");
        this.load.svg("pilah_sampah.icon.incinerator", "assets/pilah_sampah/icons/incinerator.svg", { width: 128, height: 128 });
        this.load.svg("pilah_sampah.icon.comminutor", "assets/pilah_sampah/icons/comminutor.svg", { width: 128, height: 128 });
        this.load.svg("pilah_sampah.icon.recycling", "assets/pilah_sampah/icons/recycling.svg", { width: 128, height: 128 });
        this.load.image("pilah_sampah.waste.plastik", "assets/pilah_sampah/sampah/01_plastik_botol.png");
        this.load.image("pilah_sampah.waste.kalengMerah", "assets/pilah_sampah/sampah/02_kaleng_merah.png");
        this.load.image("pilah_sampah.waste.organik", "assets/pilah_sampah/sampah/03_organik_kulit_pisang.png");
        this.load.image("pilah_sampah.waste.kertas", "assets/pilah_sampah/sampah/04_kertas.png");
        this.load.image("pilah_sampah.waste.kardus", "assets/pilah_sampah/sampah/05_kardus.png");
        this.load.image("pilah_sampah.waste.logam", "assets/pilah_sampah/sampah/06_kaleng_logam.png");
        this.load.image("pilah_sampah.waste.styrofoam", "assets/pilah_sampah/sampah/07_styrofoam.png");
        this.load.image("pilah_sampah.waste.kaca", "assets/pilah_sampah/sampah/08_botol_kaca.png");
        this.load.image("pilah_sampah.waste.taliJaring", "assets/pilah_sampah/sampah/09_tali_jaring.png");
        this.load.image("pilah_sampah.waste.daun", "assets/pilah_sampah/sampah/10_daun.png");
        this.load.image("pilah_sampah.waste.kue", "assets/pilah_sampah/sampah/11_kue.png");
        this.load.image("pilah_sampah.waste.paperBag", "assets/pilah_sampah/sampah/12_paper_bag.png");
        this.load.image("pilah_sampah.waste.sisaNasi", "assets/pilah_sampah/sampah/13_rice.png");
        this.load.image("pilah_sampah.waste.kulitJeruk", "assets/pilah_sampah/sampah/14_orange.png");
        this.load.image("pilah_sampah.waste.sisaIkan", "assets/pilah_sampah/sampah/15_fish_bone.png");
        this.load.image("pilah_sampah.waste.sisaRoti", "assets/pilah_sampah/sampah/16_bread.png");
        this.load.image("pilah_sampah.materi.circleShip", "assets/pilah_sampah/materi/circle-ship.png");
        this.load.image("pilah_sampah.materi.circleSea", "assets/pilah_sampah/materi/circle-sea.png");
        this.load.image("pilah_sampah.materi.circleLeaf", "assets/pilah_sampah/materi/circle-leaf.png");
        this.load.image("pilah_sampah.materi.circleTrash", "assets/pilah_sampah/materi/circle-trash.png");
        this.load.image("pilah_sampah.materi.trashFoodwaste", "assets/pilah_sampah/materi/trash-foodwaste.png");
        this.load.image("pilah_sampah.materi.trashPlastic", "assets/pilah_sampah/materi/trash-plastic.png");
        this.load.image("pilah_sampah.materi.trashPaper", "assets/pilah_sampah/materi/trash-paper.png");
        this.load.image("pilah_sampah.materi.trashLogam", "assets/pilah_sampah/materi/trash-logam.png");
        this.load.image("pilah_sampah.materi.trashGlass", "assets/pilah_sampah/materi/trash-glass.png");
        this.load.image("pilah_sampah.materi.trashOil", "assets/pilah_sampah/materi/trash-oil.png");
        this.load.image("pilah_sampah.materi.trashDanger", "assets/pilah_sampah/materi/trash-danger.png");
        this.load.image("pilah_sampah.materi.imgMarpol", "assets/pilah_sampah/materi/img-marpol.png");
        this.load.image("pilah_sampah.materi.imgIncinerator", "assets/pilah_sampah/materi/img-incinerator.png");
        this.load.image("pilah_sampah.materi.imgComminutor", "assets/pilah_sampah/materi/img-comminutor.png");
        this.load.image("pilah_sampah.materi.imgBakSampah", "assets/pilah_sampah/materi/img-bak-sampah.png");
        this.load.image("pilah_sampah.materi.iconComminutorTrash", "assets/pilah_sampah/materi/icon-comminutor-trash.png");
        this.load.image("pilah_sampah.materi.iconComminutor", "assets/pilah_sampah/materi/icon-comminutor.png");
        this.load.image("pilah_sampah.materi.iconComminutorResult", "assets/pilah_sampah/materi/icon-comminutor-result.png");
        this.load.image("pilah_sampah.materi.imgKesimpulan", "assets/pilah_sampah/materi/img-kesimpulan.png");
        this.load.image("pilah_sampah.materi.iconAlurPemilahan", "assets/pilah_sampah/materi/icon-alur-pemilahan.png");
        this.load.image("pilah_sampah.materi.iconAlurPengelolaan", "assets/pilah_sampah/materi/icon-alur-pengelolaan.png");
        this.load.image("pilah_sampah.materi.iconAlurPenyimpanan", "assets/pilah_sampah/materi/icon-alur-penyimpanan.png");
        this.load.image("pilah_sampah.materi.iconAlurPencatatan", "assets/pilah_sampah/materi/icon-alur-pencatatan.png");
        this.load.image("pilah_sampah.materi.iconAlurPenyerahan", "assets/pilah_sampah/materi/icon-alur-penyerahan.png");
    }

    create() {
        this.playIntroAnimation();

        // Started here, once the scene has actually reached create() rather
        // than from init() (which runs before preload()'s loading queue
        // even starts), so it can't ever race ahead of the scene being
        // fully up and running.
        this.time.delayedCall(MIN_DISPLAY_DURATION, () => {
            this.minDurationElapsed = true;
            this.tryFinishLoading();
        });

        // `on`, not `once` — a click while still loading must not consume
        // the listener (isReadyToContinue is false, so it's a no-op), or
        // every click after loading actually finishes would silently do
        // nothing. Remove it manually the one time it actually proceeds.
        const handlePointerDown = () => {
            if (!this.isReadyToContinue) {
                return;
            }

            this.input.off("pointerdown", handlePointerDown);

            // Fullscreen requires a user gesture, so it must be requested
            // here (inside the click handler), not later in MainMenu.
            if (this.scale.fullscreen.available && !this.scale.isFullscreen) {
                this.scale.startFullscreen();
            }
            this.scene.start("MainMenu");
        };
        this.input.on("pointerdown", handlePointerDown);

        this.events.once("shutdown", () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.layout(gameSize.width, gameSize.height);
    }

    private updateProgressDisplay() {
        const percent = Math.round(this.progressValue * 100);
        this.progressText.setText(`${percent}% Memuat Konten`);
        this.layout(this.scale.width, this.scale.height);
    }

    /** Only reveals "tap to continue" once both the minimum display floor
     * has elapsed AND assets are actually loaded — whichever takes longer. */
    private tryFinishLoading() {
        if (!this.minDurationElapsed || !this.realLoadComplete || this.isReadyToContinue) {
            return;
        }

        this.isReadyToContinue = true;
        this.progressValue = 1;
        this.progressText.setText("100% Memuat Konten");
        this.layout(this.scale.width, this.scale.height);

        this.tweens.add({
            targets: [this.progressText, this.progressFrame, this.progressFill],
            alpha: 0,
            duration: 240,
            ease: "Power2",
        });

        this.tweens.add({
            targets: [this.continueText, this.continueTextBg],
            alpha: 1,
            duration: 300,
            ease: "Power2",
        });

        this.tweens.add({
            targets: this.touchButton,
            alpha: 1,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
                this.touchButton.setData("baseY", this.touchButton.y);
                this.tweens.add({
                    targets: this.touchButton,
                    y: this.touchButton.y - 6,
                    duration: 650,
                    ease: "Sine.InOut",
                    yoyo: true,
                    repeat: -1,
                });
            },
        });
    }

    private playIntroAnimation() {
        if (this.hasPlayedIntro) {
            return;
        }

        this.hasPlayedIntro = true;

        const logoFinalScaleX = this.logo.scaleX;
        const logoFinalScaleY = this.logo.scaleY ;

        this.logo.setAlpha(0);
        this.logo.setScale(logoFinalScaleX, logoFinalScaleY);
        this.logo.setAngle(-4);

        this.progressFrame.setAlpha(0);
        this.progressFill.setAlpha(0);
        this.progressIntroScale = 0.9;

        this.tweens.add({
            targets: this.logo,
            alpha: 1,
            scaleX: logoFinalScaleX,
            scaleY: logoFinalScaleY,
            angle: 0,
            duration: 1000,
            ease: "Back.Out",
            delay: 0,
        });

        this.tweens.add({
            targets: this,
            progressIntroScale: 1,
            duration: 1000,
            ease: "Back.Out",
            delay: 100,
            onStart: () => {
                this.progressFrame.setAlpha(1);
                this.progressFill.setAlpha(1);
            },
            onUpdate: () => {
                this.layout(this.scale.width, this.scale.height);
            },
        });
    }

    private layout(width: number, height: number) {
        const centerX = width / 2;
        const centerY = height / 2;
        const frameWidth =
            Math.min(width * 0.62, 680) * this.progressIntroScale;
        const frameHeight = 38 * this.progressIntroScale;
        const cornerRadius = frameHeight / 2;
        const innerPadding = 3;
        const fillWidth = Math.max(
            0,
            (frameWidth - innerPadding * 2) * this.progressValue,
        );
        const barX = centerX - frameWidth / 2;
        const barY = centerY + 40;
        const centerWindowWidth = Math.min(width * 0.48, 760);
        const centerWindowHeight = Math.min(height * 0.34, 320);
        const logoMaxWidth = centerWindowWidth * 0.92;
        const logoMaxHeight = centerWindowHeight * 0.78;

        this.background.setPosition(centerX, centerY);
        this.background.setDisplaySize(width, height);

        this.logo.setPosition(centerX, centerY - 120);
        this.logo.setDisplaySize(logoMaxWidth, logoMaxHeight);

        this.progressFrame.clear();
        this.progressFrame.lineStyle(3, 0x2c8fb8, 1);
        this.progressFrame.fillStyle(0xffffff, 0.92);
        this.progressFrame.fillRoundedRect(
            barX,
            barY,
            frameWidth,
            frameHeight,
            cornerRadius,
        );
        this.progressFrame.strokeRoundedRect(
            barX,
            barY,
            frameWidth,
            frameHeight,
            cornerRadius,
        );

        this.progressFill.clear();
        if (fillWidth > 0) {
            const fillHeight = frameHeight - innerPadding * 2;
            const fillRadius = Math.max(8, cornerRadius - innerPadding);
            this.progressFill.fillStyle(0x0a2f6b, 1);
            this.progressFill.fillRoundedRect(
                barX + innerPadding,
                barY + innerPadding,
                fillWidth,
                fillHeight,
                fillRadius,
            );
            this.progressFill.lineStyle(2, 0xffffff, 1);
            this.progressFill.strokeRoundedRect(
                barX + innerPadding,
                barY + innerPadding,
                fillWidth,
                fillHeight,
                fillRadius,
            );
        }

        this.progressText.setPosition(centerX, barY + frameHeight + 42);

        const touchButtonSizeW = 250;
        const touchButtonSizeH = 270;
        const touchButtonGap = 32;
        const continueTextGap = 28;

        const touchBaseY =
            barY + frameHeight + touchButtonGap + touchButtonSizeW / 2;
        const currentTouchAlpha = this.touchButton.alpha;
        const isTouchAnimating = this.tweens.isTweening(this.touchButton);

        if (!isTouchAnimating || currentTouchAlpha <= 0) {
            this.touchButton.setPosition(centerX, touchBaseY);
        } else {
            const animatedOffsetY =
                this.touchButton.y -
                ((this.touchButton.getData("baseY") as number) ?? touchBaseY);
            this.touchButton.setPosition(centerX, touchBaseY + animatedOffsetY);
        }

        this.touchButton.setData("baseY", touchBaseY);
        this.touchButton.setDisplaySize(touchButtonSizeW, touchButtonSizeH);

        const continueTextY = touchBaseY + touchButtonSizeW / 2 + continueTextGap;
        this.continueText.setPosition(centerX, continueTextY);

        const paddingX = 20;
        const paddingY = 12;
        const bgWidth = this.continueText.width + paddingX * 2;
        const bgHeight = this.continueText.height + paddingY * 2;
        this.continueTextBg.clear();
        this.continueTextBg.fillStyle(0xd4f0ff, 1);
        this.continueTextBg.lineStyle(3, 0x0b4f7a, 1);
        this.continueTextBg.fillRoundedRect(
            centerX - bgWidth / 2,
            continueTextY - bgHeight / 2,
            bgWidth,
            bgHeight,
            15,
        );
        this.continueTextBg.strokeRoundedRect(
            centerX - bgWidth / 2,
            continueTextY - bgHeight / 2,
            bgWidth,
            bgHeight,
            15,
        );
    }
}
