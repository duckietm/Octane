/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { getRegisteredPlugins, pluginApi, subscribePlugins } from './OctanePluginApi';

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
});
