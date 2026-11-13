/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { publishPluginChannel } from '../../api/plugin-channel';
import { getRegisteredPlugins, type IOctanePluginApi, pluginApi, subscribePlugins } from './OctanePluginApi';

describe('plugin registration', () => {
    it('lists a plugin only once its onInit went through', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        pluginApi.register({
            name: 'broken-start',
            label: 'Broken start',
            onOpen: () => undefined,
            onInit: () => {
                throw new Error('boom');
            }
        });

        expect(getRegisteredPlugins().some((plugin) => plugin.name === 'broken-start')).toBe(false);
        error.mockRestore();
    });

    it('tells every listener about a change even when one of them throws', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const heard = vi.fn();
        const stopBroken = subscribePlugins(() => {
            throw new Error('listener');
        });
        const stopHeard = subscribePlugins(heard);

        pluginApi.register({ name: 'listener-check', label: 'Listener check', onOpen: () => undefined });

        expect(heard).toHaveBeenCalled();
        stopBroken();
        stopHeard();
        error.mockRestore();
    });

    it('closes the windows a plugin opened when it is removed', () => {
        let api: IOctanePluginApi = null;
        pluginApi.register({
            name: 'window-owner',
            label: 'Window owner',
            onOpen: () => undefined,
            onInit: (received) => {
                api = received;
            }
        });

        api.createWindow('owned', 'Owned', 200);
        expect(document.getElementById('octane-plugin-window-owned')).not.toBeNull();

        pluginApi.unregister('window-owner');

        expect(document.getElementById('octane-plugin-window-owned')).toBeNull();
    });

    it('closes the windows of a plugin whose onClose throws', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        pluginApi.register({
            name: 'broken-close',
            label: 'Broken close',
            onOpen: () => undefined,
            onInit: (api) => {
                api.createWindow('left-open', 'Left open', 200);
            },
            onClose: () => {
                throw new Error('close');
            }
        });

        pluginApi.unregister('broken-close');

        expect(document.getElementById('octane-plugin-window-left-open')).toBeNull();
        error.mockRestore();
    });

    it('hands a plugin what its server plugin sends on a channel, and stops when the plugin is removed', () => {
        const heard = vi.fn();
        pluginApi.register({
            name: 'channel-owner',
            label: 'Channel owner',
            onOpen: () => undefined,
            onInit: (api) => {
                api.onChannel('test.owner', heard);
            }
        });

        publishPluginChannel('test.owner', { n: 1 }, '{"n":1}');
        expect(heard).toHaveBeenCalledWith({ n: 1 }, '{"n":1}');

        pluginApi.unregister('channel-owner');
        publishPluginChannel('test.owner', { n: 2 }, '{"n":2}');

        expect(heard).toHaveBeenCalledTimes(1);
    });

    it('lets a plugin stop listening on its own', () => {
        const heard = vi.fn();
        let api: IOctanePluginApi = null;
        pluginApi.register({
            name: 'channel-stopper',
            label: 'Channel stopper',
            onOpen: () => undefined,
            onInit: (received) => {
                api = received;
            }
        });

        const stop = api.onChannel('test.stopper', heard);
        stop();
        publishPluginChannel('test.stopper', { n: 1 }, '{"n":1}');

        expect(heard).not.toHaveBeenCalled();
        pluginApi.unregister('channel-stopper');
    });
});
