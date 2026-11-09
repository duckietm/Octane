import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveSoundboardUrl } from './soundboardUrl';

const mocks = vi.hoisted(() => ({ configuration: new Map<string, string>() }));

vi.mock('../../api', () => ({
    GetConfigurationValue: (key: string) => mocks.configuration.get(key) || ''
}));

describe('resolveSoundboardUrl', () => {
    beforeEach(() => mocks.configuration.clear());

    it('resolves relative paths through the configured Soundboard asset prefix', () => {
        mocks.configuration.set('soundboard.url.prefix', 'https://cdn.example.test/audio/');

        expect(resolveSoundboardUrl('sounds/click.ogg')).toBe('https://cdn.example.test/audio/sounds/click.ogg');
    });

    it('leaves absolute and root-relative URLs unchanged', () => {
        expect(resolveSoundboardUrl('https://cdn.example.test/click.ogg')).toBe('https://cdn.example.test/click.ogg');
        expect(resolveSoundboardUrl('/sounds/click.ogg')).toBe('/sounds/click.ogg');
    });
});
