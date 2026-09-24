import { GameObjects, Scale, Scene } from "phaser";

const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

export interface DomTextEditorOptions {
    scene: Scene;
    /** Container whose design-space coordinates `x`/`y` are expressed in. */
    anchor: GameObjects.Container;
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
    maxLength: number;
    fontSize: number;
    onInput: (value: string) => void;
    onClose: () => void;
}

/** Phaser has no native text input, so a short-lived textarea is laid exactly
 * over the Phaser box being edited and removed as soon as it loses focus. */
export class DomTextEditor {
    private readonly element: HTMLTextAreaElement;
    private closed = false;

    constructor(private readonly options: DomTextEditorOptions) {
        const element = document.createElement("textarea");
        element.value = options.value;
        element.maxLength = options.maxLength;
        element.setAttribute("aria-label", "Isi teks dokumentasi");
        Object.assign(element.style, {
            position: "fixed", zIndex: "20", boxSizing: "border-box", resize: "none", outline: "none", background: "#ffffff",
            border: "2px solid #1774e8", borderRadius: "8px", padding: "8px 10px", color: "#153b7a", fontFamily: FONT, fontWeight: "500", lineHeight: "1.4",
        } as Partial<CSSStyleDeclaration>);
        element.addEventListener("input", () => options.onInput(element.value));
        element.addEventListener("blur", () => this.close());
        element.addEventListener("keydown", (event) => { if (event.key === "Escape") this.close(); });
        document.body.appendChild(element);
        this.element = element;
        this.reposition();
        options.scene.scale.on(Scale.Events.RESIZE, this.reposition, this);
        element.focus();
        element.setSelectionRange(element.value.length, element.value.length);
    }

    close() {
        if (this.closed) return;
        this.closed = true;
        this.options.scene.scale.off(Scale.Events.RESIZE, this.reposition, this);
        this.element.remove();
        this.options.onClose();
    }

    /** Maps the design-space rectangle to screen pixels (root scale × canvas CSS scale). */
    private reposition() {
        const { scene, anchor, x, y, width, height, fontSize } = this.options;
        const rect = scene.game.canvas.getBoundingClientRect();
        const matrix = anchor.getWorldTransformMatrix();
        const point = matrix.transformPoint(x, y);
        const cssScale = rect.width / scene.scale.width;
        const scale = matrix.scaleX * cssScale;
        Object.assign(this.element.style, {
            left: `${rect.left + point.x * cssScale}px`, top: `${rect.top + point.y * cssScale}px`,
            width: `${width * scale}px`, height: `${height * scale}px`, fontSize: `${fontSize * scale}px`,
        });
    }
}
