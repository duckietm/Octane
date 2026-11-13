import { PluginChannelActionComposer } from '@octane/renderer';
import { SendMessageComposer } from '../octane/SendMessageComposer';

/** What a listener receives: the payload as a JSON object (null when it is not one) and as it was sent. */
export type PluginChannelListener = (data: Record<string, unknown> | null, payload: string) => void;

/** Lower case letters, digits, dots, dashes and underscores, 1 to 64 characters: the emulator's own rule. */
const CHANNEL = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/** The longest payload the emulator accepts, in characters. */
export const PLUGIN_CHANNEL_MAX_PAYLOAD = 16384;

const listeners = new Map<string, Set<PluginChannelListener>>();
const latest = new Map<string, { data: Record<string, unknown> | null; payload: string }>();

export const isValidPluginChannel = (channel: string): boolean => typeof channel === 'string' && CHANNEL.test(channel);

// One listener that throws must not stop the others from hearing the message.
const notify = (listener: PluginChannelListener, data: Record<string, unknown> | null, payload: string) => {
    try {
        listener(data, payload);
    } catch (error) {
        console.error('[plugin-channel] a listener failed', error);
    }
};

/**
 * Listens on a plugin channel. A panel mounted after the last message still gets it at once, so a panel that opens
 * late shows the current state instead of nothing. Returns the function that stops listening.
 */
export const subscribePluginChannel = (channel: string, listener: PluginChannelListener): (() => void) => {
    let set = listeners.get(channel);

    if (!set) {
        set = new Set();
        listeners.set(channel, set);
    }

    set.add(listener);

    const last = latest.get(channel);

    if (last) notify(listener, last.data, last.payload);

    return () => {
        const current = listeners.get(channel);

        current?.delete(listener);

        if (current && !current.size) listeners.delete(channel);
    };
};

/** Hands a message from the server to everything listening on its channel. */
export const publishPluginChannel = (channel: string, data: Record<string, unknown> | null, payload: string): void => {
    latest.set(channel, { data, payload });
    listeners.get(channel)?.forEach((listener) => notify(listener, data, payload));
};

/** Sends an action to the server plugin on a channel; false, sending nothing, for a bad channel or a payload too long. */
export const sendPluginChannel = (channel: string, data: unknown): boolean => {
    if (!isValidPluginChannel(channel)) return false;

    const payload = JSON.stringify(data ?? null);

    if (payload.length > PLUGIN_CHANNEL_MAX_PAYLOAD) return false;

    SendMessageComposer(new PluginChannelActionComposer(channel, payload));

    return true;
};

/** Forgets every listener and every last message: for tests, and when the connection starts over. */
export const resetPluginChannels = (): void => {
    listeners.clear();
    latest.clear();
};
