import { GameObjects, Scene } from "phaser";

export type EnterStyleName = "down" | "up" | "right" | "left" | "bounce";

interface GroupStyle {
    dx: number;
    dy: number;
    /** When set, the group also scales in/out from this value (a "pop"/
     * bounce reveal) instead of only fading + sliding. */
    scaleFrom?: number;
    enterEase: string;
}

// Varied per-group entrance directions cycling in order, so a scene's
// components don't all animate in as one uniform block — "bounce" (a
// scale pop with a bouncy ease) is mixed in alongside the directional
// slides for extra variety.
const NAMED_STYLES: Record<EnterStyleName, GroupStyle> = {
    down: { dx: 0, dy: -36, enterEase: "Back.Out" },
    up: { dx: 0, dy: 36, enterEase: "Back.Out" },
    right: { dx: -36, dy: 0, enterEase: "Back.Out" },
    left: { dx: 36, dy: 0, enterEase: "Back.Out" },
    bounce: { dx: 0, dy: -14, scaleFrom: 0.55, enterEase: "Bounce.Out" },
};

const AUTO_CYCLE: EnterStyleName[] = ["down", "up", "right", "left", "bounce"];

/**
 * Records everything added to `root` while `build` runs as one animatable
 * group. Call once per logical component (a header, a card, a panel) around
 * its `this.buildX()` call in `create()`, collecting into a `groups` array
 * that's then handed to playSceneEnter/playSceneExit — this only reads
 * `root.list`'s length before/after, so it needs no changes inside the
 * build method itself (nested `root.add(...)` calls are all captured).
 */
export function trackGroup(root: GameObjects.Container, groups: GameObjects.GameObject[][], build: () => void) {
    const start = root.list.length;
    build();
    const added = root.list.slice(start) as GameObjects.GameObject[];
    if (added.length > 0) {
        groups.push(added);
    }
}

/**
 * Fades (+ slides, or scale-pops for "bounce") each tracked group into
 * place with a staggered delay. Without an explicit `styles` array, the
 * style cycles automatically per group index; pass one to pin specific
 * groups to a specific style (e.g. a result icon that should always bounce).
 */
export function playSceneEnter(scene: Scene, groups: GameObjects.GameObject[][], styles?: (EnterStyleName | undefined)[]) {
    groups.forEach((group, index) => {
        if (group.length === 0) return;
        const style = NAMED_STYLES[styles?.[index] ?? AUTO_CYCLE[index % AUTO_CYCLE.length]];

        group.forEach((obj) => {
            const g = obj as unknown as { x: number; y: number; alpha: number; scaleX: number; scaleY: number };
            g.x += style.dx;
            g.y += style.dy;
            g.alpha = 0;
            if (style.scaleFrom !== undefined) {
                g.scaleX = style.scaleFrom;
                g.scaleY = style.scaleFrom;
            }
        });

        const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
            targets: group,
            x: `-=${style.dx}`,
            y: `-=${style.dy}`,
            alpha: 1,
            duration: style.scaleFrom !== undefined ? 550 : 450,
            delay: index * 70,
            ease: style.enterEase,
        };
        if (style.scaleFrom !== undefined) {
            tweenConfig.scaleX = 1;
            tweenConfig.scaleY = 1;
        }

        scene.tweens.add(tweenConfig);
    });
}

/**
 * The reverse of playSceneEnter — each group fades (+ slides/scales back
 * down) before `onComplete` (typically a `scene.start(...)` call) fires,
 * once every group's tween has finished. Accepts the same optional
 * `styles` override so an exit mirrors a deliberately-styled entrance.
 */
export function playSceneExit(
    scene: Scene,
    groups: GameObjects.GameObject[][],
    onComplete: () => void,
    styles?: (EnterStyleName | undefined)[],
) {
    let maxEnd = 0;

    groups.forEach((group, index) => {
        if (group.length === 0) return;
        const style = NAMED_STYLES[styles?.[index] ?? AUTO_CYCLE[index % AUTO_CYCLE.length]];
        const duration = 260;
        const delay = index * 40;

        const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
            targets: group,
            x: `+=${style.dx}`,
            y: `+=${style.dy}`,
            alpha: 0,
            duration,
            delay,
            ease: "Quad.In",
        };
        if (style.scaleFrom !== undefined) {
            tweenConfig.scaleX = style.scaleFrom;
            tweenConfig.scaleY = style.scaleFrom;
        }

        scene.tweens.add(tweenConfig);

        maxEnd = Math.max(maxEnd, delay + duration);
    });

    scene.time.delayedCall(maxEnd, onComplete);
}
