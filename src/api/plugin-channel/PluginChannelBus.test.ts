import { PluginChannelActionComposer } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../octane/SendMessageComposer', () => ({ SendMessageComposer: mocks.send }));

import {
    isValidPluginChannel,
    PLUGIN_CHANNEL_MAX_PAYLOAD,
    publishPluginChannel,
    resetPluginChannels,
    sendPluginChannel,
    subscribePluginChannel
} from './PluginChannelBus';

describe('plugin channel bus', () => {
    afterEach(() => {
        resetPluginChannels();
        mocks.send.mockClear();
    });

    it('hands a message only to the listeners of its channel', () => {
        const job = vi.fn();
        const shop = vi.fn();
        subscribePluginChannel('rp.job', job);
        subscribePluginChannel('rp.shop', shop);

        publishPluginChannel('rp.job', { open: true }, '{"open":true}');

        expect(job).toHaveBeenCalledWith({ open: true }, '{"open":true}');
        expect(shop).not.toHaveBeenCalled();
    });

    it('gives a late listener the last message at once', () => {
        publishPluginChannel('rp.status', { health: 40 }, '{"health":40}');
        const late = vi.fn();

        subscribePluginChannel('rp.status', late);

        expect(late).toHaveBeenCalledWith({ health: 40 }, '{"health":40}');
    });

    it('stops a listener that unsubscribed', () => {
        const heard = vi.fn();
        const stop = subscribePluginChannel('rp.job', heard);

        stop();
        publishPluginChannel('rp.job', {}, '{}');

        expect(heard).not.toHaveBeenCalled();
    });

    it('keeps telling the others when one listener throws', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const heard = vi.fn();
        subscribePluginChannel('rp.job', () => {
            throw new Error('panel');
        });
        subscribePluginChannel('rp.job', heard);

        publishPluginChannel('rp.job', {}, '{}');

        expect(heard).toHaveBeenCalledTimes(1);
        error.mockRestore();
    });

    it('sends an action as JSON on its channel', () => {
        expect(sendPluginChannel('rp.shop', { action: 'buy', item: 'bread', quantity: 2 })).toBe(true);

        const composer = mocks.send.mock.calls[0][0];
        expect(composer).toBeInstanceOf(PluginChannelActionComposer);
        expect(composer.channel).toBe('rp.shop');
        expect(JSON.parse(composer.payload)).toEqual({ action: 'buy', item: 'bread', quantity: 2 });
    });

    it('sends nothing on a bad channel or with a payload the server would drop', () => {
        expect(sendPluginChannel('RP job', {})).toBe(false);
        expect(sendPluginChannel('rp.job', 'x'.repeat(PLUGIN_CHANNEL_MAX_PAYLOAD))).toBe(false);
        expect(mocks.send).not.toHaveBeenCalled();
    });

    it('checks channel names like the emulator', () => {
        expect(isValidPluginChannel('rp.job')).toBe(true);
        expect(isValidPluginChannel('casino-table_2')).toBe(true);
        expect(isValidPluginChannel('a'.repeat(64))).toBe(true);
        expect(isValidPluginChannel('')).toBe(false);
        expect(isValidPluginChannel('.hidden')).toBe(false);
        expect(isValidPluginChannel('Rp.job')).toBe(false);
        expect(isValidPluginChannel('a'.repeat(65))).toBe(false);
    });
});
