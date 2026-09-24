import { GameObjects, Scene } from "phaser";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

export function showFeedbackToast(scene: Scene, parent: GameObjects.Container, x: number, y: number, title: string, result: string, color = 0x1f8d52) {
    const css = `#${color.toString(16).padStart(6, "0")}`;
    const view = scene.add.container(x, y);
    const box = scene.add.graphics();
    box.fillStyle(0xffffff, 0.97);
    box.fillRoundedRect(-190, -42, 380, 84, 14);
    box.lineStyle(2, color, 0.9);
    box.strokeRoundedRect(-190, -42, 380, 84, 14);
    const heading = scene.add.text(-165, -24, title, { fontFamily: FONT, fontStyle: "800", fontSize: 13, color: css });
    const body = scene.add.text(-165, 2, result, { fontFamily: FONT, fontStyle: "600", fontSize: 13, color: "#143a84", wordWrap: { width: 320 } });
    view.add([box, heading, body]);
    parent.add(view);
    view.setAlpha(0);
    scene.tweens.add({ targets: view, alpha: 1, y: y - 8, duration: 180, ease: "Sine.Out" });
    scene.time.delayedCall(1900, () => {
        scene.tweens.add({ targets: view, alpha: 0, duration: 180, onComplete: () => view.destroy() });
    });
}
