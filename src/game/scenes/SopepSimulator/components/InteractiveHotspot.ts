import { GameObjects, Scene } from "phaser";

import { SOPEP_ASSET_KEYS } from "../config/assetKeys";

export type HotspotState = "idle" | "active" | "complete";

export interface HotspotKeys {
    idle: string;
    active: string;
    pulse: string;
    /** When omitted, completed hotspots are drawn as a green check badge. */
    complete?: string;
}

const STEP1_HOTSPOT_KEYS: HotspotKeys = { idle: SOPEP_ASSET_KEYS.hotspot, active: SOPEP_ASSET_KEYS.hotspotActive, pulse: SOPEP_ASSET_KEYS.hotspotPulse, complete: SOPEP_ASSET_KEYS.hotspotChecked };

export class InteractiveHotspot {
    readonly view: GameObjects.Container;

    constructor(scene: Scene, x: number, y: number, state: HotspotState, onClick: () => void, keys: HotspotKeys = STEP1_HOTSPOT_KEYS) {
        this.view = scene.add.container(x, y);
        const key = state === "active" ? keys.active : state === "complete" ? keys.complete : keys.idle;
        if (key) this.view.add(scene.add.image(0, 0, key).setDisplaySize(52, 52));
        else this.view.add(scene.add.circle(0, 0, 21, 0x1f8d52, 1).setStrokeStyle(3, 0xffffff, 1));
        if (state === "idle") {
            const pulse = scene.add.image(0, 0, keys.pulse).setDisplaySize(68, 68).setAlpha(0.7);
            this.view.addAt(pulse, 0);
            scene.tweens.add({ targets: pulse, scaleX: 1.18, scaleY: 1.18, alpha: 0.16, duration: 1000, ease: "Sine.InOut", yoyo: true, repeat: -1 });
        }
        if (state === "complete") this.view.add(scene.add.text(0, 0, "✓", { fontFamily: "Plus Jakarta Sans", fontStyle: "800", fontSize: 19, color: keys.complete ? "#1f8d52" : "#ffffff" }).setOrigin(0.5));
        const hit = scene.add.rectangle(0, 0, 62, 62, 0xffffff, 0).setInteractive({ useHandCursor: state !== "complete" });
        this.view.add(hit);
        if (state !== "complete") {
            hit.on("pointerover", () => scene.tweens.add({ targets: this.view, scaleX: 1.1, scaleY: 1.1, duration: 120, ease: "Back.Out" }));
            hit.on("pointerout", () => scene.tweens.add({ targets: this.view, scaleX: 1, scaleY: 1, duration: 120, ease: "Quad.Out" }));
            hit.on("pointerdown", onClick);
        }
    }
}
