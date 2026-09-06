import * as PIXI from 'pixi.js';

type AnyFn = (...args: unknown[]) => unknown;

interface MethodHost {
    [key: string]: unknown;
}

declare global {
    interface Window {
        __octanePixiBatcherPatched__?: boolean;
    }
}

const NULL_TEXTURE_MARKERS = /alphaMode|reading 'uid'|reading 'destroyed'|reading 'source'/;

const isNullTextureCrash = (err: unknown): boolean => {
    if (!(err instanceof TypeError)) return false;
    return NULL_TEXTURE_MARKERS.test(err.message ?? '');
};

const guardMethod = (proto: MethodHost, methodName: string, label: string): boolean => {
    const original = proto[methodName];
    if (typeof original !== 'function') return false;
    if ((original as { __octaneGuarded__?: boolean }).__octaneGuarded__) return false;

    const guarded = function (this: unknown, ...args: unknown[]) {
        try {
            return (original as AnyFn).apply(this, args);
        } catch (err) {
            if (isNullTextureCrash(err)) return undefined;
            throw err;
        }
    };

    (guarded as { __octaneGuarded__?: boolean }).__octaneGuarded__ = true;
    proto[methodName] = guarded;

    console.info(`[OctanePixiPatch] guarded ${label}.prototype.${methodName} against null textureSource`);
    return true;
};

const installPatch = (): void => {
    if (typeof window === 'undefined') return;
    if (window.__octanePixiBatcherPatched__) return;

    const candidates: Array<[string, unknown]> = [
        ['DefaultBatcher', (PIXI as Record<string, unknown>).DefaultBatcher],
        ['Batcher', (PIXI as Record<string, unknown>).Batcher]
    ];

    let patched = false;

    for (const [name, ctor] of candidates) {
        const proto = (ctor as { prototype?: MethodHost } | undefined)?.prototype;
        if (!proto) continue;

        if (guardMethod(proto, 'break', name)) patched = true;
        if (guardMethod(proto, 'checkAndUpdateTexture', name)) patched = true;
    }

    window.__octanePixiBatcherPatched__ = patched;

    if (!patched) {
        console.warn('[OctanePixiPatch] could not locate Batcher.prototype methods - is pixi.js export shape unchanged?');
    }
};

installPatch();
