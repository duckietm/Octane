import { RoomObjectCategory, RoomObjectVariable, WiredFurniOpacityUpdate } from '@octane/renderer';

export interface WiredOpacityObjectModel {
    getValue<T>(key: string): T;
    setValue<T>(key: string, value: T): void;
}

export interface WiredOpacityObject {
    model?: WiredOpacityObjectModel;
}

export interface WiredOpacityObjectSource {
    getObject(roomId: number, itemId: number, category: number): WiredOpacityObject;
}

export interface WiredOpacityFrameScheduler {
    now(): number;
    request(callback: (time: number) => void): number;
    cancel(handle: number): void;
}

interface TargetState {
    itemId: number;
    category: number;
    opacity: number;
    clickThrough: boolean;
}

interface AnimationState extends TargetState {
    startOpacity: number;
    startedAt: number;
    durationMs: number;
    easing: number;
}

const MAXIMUM_UPDATES = 1000;

const stateKey = (category: number, itemId: number) => `${category}:${itemId}`;

export const clampWiredOpacity = (value: number): number => {
    if (!Number.isFinite(value)) return 100;

    return Math.max(0, Math.min(100, value));
};

export const wiredOpacityEasing = (progress: number, easing: number): number => {
    const normalized = Math.max(0, Math.min(1, progress));

    switch (easing) {
        case 2:
            return normalized * normalized * normalized;
        case 3:
            return 1 - Math.pow(1 - normalized, 3);
        case 4:
            return normalized < 0.5 ? 4 * normalized * normalized * normalized : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
        case 1:
        default:
            return normalized;
    }
};

/** One bounded animation owner for every wired-opacity object in the active room. */
export class WiredFurniOpacityController {
    private activeRoomId = 0;
    private readonly targets = new Map<string, TargetState>();
    private readonly animations = new Map<string, AnimationState>();
    private frameHandle: number = null;

    constructor(
        private readonly objects: WiredOpacityObjectSource,
        private readonly frames: WiredOpacityFrameScheduler
    ) {}

    public setRoom(roomId: number): void {
        const normalized = Math.max(0, roomId || 0);

        if (normalized === this.activeRoomId) return;

        this.clear(true);
        this.activeRoomId = normalized;
    }

    public apply(roomId: number, updates: readonly WiredFurniOpacityUpdate[]): void {
        if (roomId <= 0 || roomId !== this.activeRoomId || !updates?.length) return;

        const deduplicated = new Map<string, WiredFurniOpacityUpdate>();

        for (const update of updates.slice(0, MAXIMUM_UPDATES)) {
            if (!update || update.itemId <= 0) continue;

            const category = update.wallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
            deduplicated.set(stateKey(category, update.itemId), update);
        }

        for (const [key, update] of [...deduplicated.entries()].sort(([left], [right]) => left.localeCompare(right))) {
            this.applyOne(key, update);
        }

        this.scheduleFrame();
    }

    public objectAdded(roomId: number, itemId: number, category: number): void {
        if (roomId !== this.activeRoomId) return;

        const target = this.targets.get(stateKey(category, itemId));

        if (!target) return;

        this.animations.delete(stateKey(category, itemId));
        this.applyModel(target, target.opacity);
    }

    public objectRemoved(roomId: number, itemId: number, category: number): void {
        if (roomId !== this.activeRoomId) return;

        const key = stateKey(category, itemId);
        this.targets.delete(key);
        this.animations.delete(key);
        this.cancelFrameWhenIdle();
    }

    public dispose(): void {
        this.clear(true);
        this.activeRoomId = 0;
    }

    public pendingAnimationCount(): number {
        return this.animations.size;
    }

    private applyOne(key: string, update: WiredFurniOpacityUpdate): void {
        const target: TargetState = {
            itemId: update.itemId,
            category: update.wallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR,
            opacity: clampWiredOpacity(update.opacity),
            clickThrough: update.clickThrough === true
        };
        this.targets.set(key, target);
        this.animations.delete(key);

        const model = this.model(target);

        if (!model) return;

        model.setValue(RoomObjectVariable.FURNITURE_WIRED_CLICK_THROUGH, target.clickThrough ? 1 : 0);
        const current = model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY);
        const startOpacity = Number.isFinite(current) ? clampWiredOpacity(current * 100) : 100;
        const durationMs = Math.max(0, Math.min(10000, update.durationMs));
        const easing = Math.max(0, Math.min(4, update.easing));

        if (easing === 0 || durationMs === 0 || startOpacity === target.opacity) {
            this.setOpacity(model, target.opacity);
            return;
        }

        this.animations.set(key, {
            ...target,
            startOpacity,
            startedAt: this.frames.now(),
            durationMs,
            easing
        });
    }

    private scheduleFrame(): void {
        if (this.frameHandle !== null || !this.animations.size) return;

        this.frameHandle = this.frames.request((time) => this.onFrame(time));
    }

    private onFrame(time: number): void {
        this.frameHandle = null;

        for (const [key, animation] of this.animations) {
            const model = this.model(animation);

            if (!model) {
                this.animations.delete(key);
                continue;
            }

            const progress = Math.max(0, Math.min(1, (time - animation.startedAt) / animation.durationMs));
            const eased = wiredOpacityEasing(progress, animation.easing);
            const opacity = animation.startOpacity + (animation.opacity - animation.startOpacity) * eased;
            this.setOpacity(model, progress >= 1 ? animation.opacity : opacity);

            if (progress >= 1) this.animations.delete(key);
        }

        this.scheduleFrame();
    }

    private model(target: TargetState): WiredOpacityObjectModel {
        return this.objects.getObject(this.activeRoomId, target.itemId, target.category)?.model ?? null;
    }

    private applyModel(target: TargetState, opacity: number): void {
        const model = this.model(target);

        if (!model) return;

        model.setValue(RoomObjectVariable.FURNITURE_WIRED_CLICK_THROUGH, target.clickThrough ? 1 : 0);
        this.setOpacity(model, opacity);
    }

    private setOpacity(model: WiredOpacityObjectModel, opacity: number): void {
        model.setValue(RoomObjectVariable.FURNITURE_WIRED_OPACITY, clampWiredOpacity(opacity) / 100);
    }

    private clear(resetModels: boolean): void {
        if (this.frameHandle !== null) {
            this.frames.cancel(this.frameHandle);
            this.frameHandle = null;
        }

        if (resetModels) {
            for (const target of this.targets.values()) {
                const model = this.model(target);

                if (!model) continue;

                model.setValue(RoomObjectVariable.FURNITURE_WIRED_OPACITY, 1);
                model.setValue(RoomObjectVariable.FURNITURE_WIRED_CLICK_THROUGH, 0);
            }
        }

        this.animations.clear();
        this.targets.clear();
    }

    private cancelFrameWhenIdle(): void {
        if (this.animations.size || this.frameHandle === null) return;

        this.frames.cancel(this.frameHandle);
        this.frameHandle = null;
    }
}
