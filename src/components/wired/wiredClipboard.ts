import { Triggerable } from '@octane/renderer';
import { WiredConfigSeed } from '../../hooks/wired/useWired';

/**
 * The wired clipboard lives in the client, exactly as it does in the official one: copying a
 * configuration sends nothing to the server, and the entry is keyed by box kind and code so a
 * configuration can only ever be pasted into a box of the same type.
 */
const entries = new Map<string, WiredConfigSeed>();

export const wiredClipboardKey = (trigger: Triggerable): string => (trigger ? `${trigger.constructor.name}-${trigger.code}` : '');

export const copyWiredConfig = (trigger: Triggerable, seed: WiredConfigSeed): void => {
    const key = wiredClipboardKey(trigger);

    if (!key) return;

    entries.set(key, {
        intParams: [...(seed.intParams ?? [])],
        stringParam: seed.stringParam ?? '',
        furniIds: [...(seed.furniIds ?? [])]
    });
};

export const readWiredConfig = (trigger: Triggerable): WiredConfigSeed => entries.get(wiredClipboardKey(trigger)) ?? null;

export const hasWiredConfig = (trigger: Triggerable): boolean => entries.has(wiredClipboardKey(trigger));
