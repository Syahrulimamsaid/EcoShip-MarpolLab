import { GameObjects, Scene } from "phaser";

const PILL_FILL = 0xe4f4fd;
const PILL_STROKE = 0xbfe0f7;
const SEA_FILL = 0x1f5fb0;
const SEA_CREST = 0x4f8fd8;
const GLOBE_OCEAN = 0x2f7fd1;
const GLOBE_LAND = 0x3fae4a;
const SHIP_COLOR = 0x123a75;
const TITLE_COLOR = "#0d2f5e";
const SUBTITLE_COLOR = "#1f6fd8";

/** A hand-drawn tagline banner (globe + wave + ship motif around a two-tone
 * headline), replacing the old `home.bar.info` image asset so its layout
 * and colors live in code instead of a static PNG. */
export class TaglineBar {
    private container: GameObjects.Container;
    private background: GameObjects.Graphics;
    private wave: GameObjects.Graphics;
    private globe: GameObjects.Graphics;
    private ship: GameObjects.Graphics;
    private titleText: GameObjects.Text;
    private subtitleText: GameObjects.Text;
    private width: number;
    private height: number;

    constructor(scene: Scene, x: number, y: number, width: number, height: number) {
        this.width = width;
        this.height = height;

        this.background = scene.add.graphics();
        this.wave = scene.add.graphics();
        this.globe = scene.add.graphics();
        this.ship = scene.add.graphics();

        this.titleText = scene.add
            .text(0, 0, "Laut Bersih,", {
                fontFamily: "Arial Black",
                color: TITLE_COLOR,
            })
            .setOrigin(1, 0.5);

        this.subtitleText = scene.add
            .text(0, 0, " Masa Depan Lebih Baik", {
                fontFamily: "Arial Black",
                color: SUBTITLE_COLOR,
            })
            .setOrigin(0, 0.5);

        this.container = scene.add.container(x, y, [
            this.background,
            this.wave,
            this.globe,
            this.ship,
            this.titleText,
            this.subtitleText,
        ]);

        this.draw();
    }

    get view() {
        return this.container;
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        return this;
    }

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.draw();
        return this;
    }

    private draw() {
        const width = this.width;
        const height = this.height;
        const half = height / 2;

        this.background.clear();
        this.background.fillStyle(PILL_FILL, 1);
        this.background.fillRoundedRect(-width / 2, -half, width, height, half);
        this.background.lineStyle(Math.max(2, height * 0.05), PILL_STROKE, 1);
        this.background.strokeRoundedRect(-width / 2, -half, width, height, half);

        // Wave band: confined to the flat middle section (inset by the cap
        // radius on each side) so its square corners never poke past the
        // pill's own rounded ends.
        const waveLeft = -width / 2 + half;
        const waveRight = width / 2 - half;
        const waveBaseY = half * 0.35;
        const waveAmplitude = height * 0.07;
        const waveSpan = Math.max(1, waveRight - waveLeft);
        const humpCount = Math.max(2, Math.round(waveSpan / (height * 1.4)));

        this.wave.clear();
        if (waveRight > waveLeft) {
            this.wave.fillStyle(SEA_FILL, 1);
            this.wave.beginPath();
            this.wave.moveTo(waveLeft, half);
            const steps = humpCount * 16;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = waveLeft + waveSpan * t;
                const y = waveBaseY - Math.sin(t * humpCount * Math.PI * 2) * waveAmplitude;
                this.wave.lineTo(x, y);
            }
            this.wave.lineTo(waveRight, half);
            this.wave.closePath();
            this.wave.fillPath();

            this.wave.lineStyle(Math.max(1.5, height * 0.025), SEA_CREST, 1);
            this.wave.beginPath();
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = waveLeft + waveSpan * t;
                const y = waveBaseY - Math.sin(t * humpCount * Math.PI * 2) * waveAmplitude;
                if (i === 0) {
                    this.wave.moveTo(x, y);
                } else {
                    this.wave.lineTo(x, y);
                }
            }
            this.wave.strokePath();
        }

        // Globe icon, left side.
        const globeR = height * 0.26;
        const globeX = -width / 2 + height * 0.62;
        const globeY = -height * 0.04;
        this.globe.clear();
        this.globe.fillStyle(GLOBE_OCEAN, 1);
        this.globe.fillCircle(globeX, globeY, globeR);
        this.globe.fillStyle(GLOBE_LAND, 1);
        this.globe.fillEllipse(globeX - globeR * 0.25, globeY - globeR * 0.2, globeR * 0.9, globeR * 0.55);
        this.globe.fillEllipse(globeX + globeR * 0.45, globeY + globeR * 0.35, globeR * 0.6, globeR * 0.4);

        // Two leaves sprouting from the top of the globe, drawn as rotated
        // ellipses (via the canvas transform stack) so they read as pointed
        // leaf shapes rather than plain round blobs.
        const leafH = globeR * 0.95;
        const leafW = globeR * 0.45;
        const leafBaseX = globeX - globeR * 0.1;
        const leafBaseY = globeY - globeR * 0.8;
        this.globe.fillStyle(GLOBE_LAND, 1);
        this.globe.save();
        this.globe.translateCanvas(leafBaseX - leafW * 0.3, leafBaseY);
        this.globe.rotateCanvas(-0.45);
        this.globe.fillEllipse(0, -leafH * 0.4, leafW, leafH);
        this.globe.restore();
        this.globe.save();
        this.globe.translateCanvas(leafBaseX + leafW * 0.3, leafBaseY);
        this.globe.rotateCanvas(0.25);
        this.globe.fillEllipse(0, -leafH * 0.45, leafW * 0.9, leafH * 1.05);
        this.globe.restore();

        // Ship silhouette, right side, sitting on the wave crest.
        const shipScale = height * 0.5;
        const shipX = width / 2 - height * 0.7;
        const shipY = waveBaseY - shipScale * 0.32;
        this.ship.clear();
        this.ship.fillStyle(SHIP_COLOR, 1);
        // Hull.
        this.ship.beginPath();
        this.ship.moveTo(shipX - shipScale * 0.9, shipY + shipScale * 0.3);
        this.ship.lineTo(shipX + shipScale * 0.9, shipY + shipScale * 0.3);
        this.ship.lineTo(shipX + shipScale * 0.65, shipY + shipScale * 0.55);
        this.ship.lineTo(shipX - shipScale * 0.65, shipY + shipScale * 0.55);
        this.ship.closePath();
        this.ship.fillPath();
        // Cabin blocks.
        this.ship.fillRoundedRect(shipX - shipScale * 0.15, shipY - shipScale * 0.35, shipScale * 0.55, shipScale * 0.4, 2);
        this.ship.fillRoundedRect(shipX + shipScale * 0.05, shipY - shipScale * 0.6, shipScale * 0.25, shipScale * 0.3, 2);
        // Mast/antenna.
        this.ship.fillRect(shipX + shipScale * 0.15, shipY - shipScale * 0.78, shipScale * 0.04, shipScale * 0.2);

        // Headline text, centered as a two-color pair — sized to fit the
        // gap between the globe and the ship rather than a flat fraction of
        // height, so a long headline shrinks instead of overlapping the icons.
        const gap = 4;
        const availableWidth = Math.max(60, width - height * 2.6);

        let fontSize = Math.max(12, height * 0.3);
        this.titleText.setFontSize(fontSize);
        this.subtitleText.setFontSize(fontSize);
        let totalWidth = this.titleText.width + gap + this.subtitleText.width;
        if (totalWidth > availableWidth) {
            fontSize = Math.max(10, fontSize * (availableWidth / totalWidth));
            this.titleText.setFontSize(fontSize);
            this.subtitleText.setFontSize(fontSize);
            totalWidth = this.titleText.width + gap + this.subtitleText.width;
        }

        const startX = -totalWidth / 2 + this.titleText.width;
        this.titleText.setPosition(startX, -height * 0.02);
        this.subtitleText.setPosition(startX + gap, -height * 0.02);
    }
}
