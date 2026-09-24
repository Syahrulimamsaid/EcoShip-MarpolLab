import { GameObjects, Scene } from "phaser";

import { DocumentAttachment } from "../core/SimulationState";

/** Attachment card art (caption and filename are part of the supplied image). */
export function createAttachmentThumbnail(scene: Scene, parent: GameObjects.Container, x: number, y: number, size: number, attachment: DocumentAttachment) {
    const image = scene.add.image(x + size / 2, y + size / 2, attachment.previewKey ?? "").setDisplaySize(size, size * (119 / 118));
    parent.add(image);
    return image;
}
