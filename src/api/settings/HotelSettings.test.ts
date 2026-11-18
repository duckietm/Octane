import { HotelSettingsEvent } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { mockEventDispatcher } from '../../octane-renderer.mock';
import { HotelSettings, useHotelSettingsStore } from '../../state/hotelSettingsStore';
import { GetServerMentionAliases, ListenForHotelSettings, resolveMentionAliases, resolveServerLength } from './HotelSettings';

const settings = (overrides: Partial<HotelSettings> = {}): HotelSettings => ({
    cameraUrl: 'http://localhost/camera/',
    chatMaxLength: 120,
    mottoMaxLength: 40,
    botNameMaxLength: 0,
    petNameMaxLength: 16,
    mentionAliases: { everyone: ['all', 'tutti'], friends: [], room: ['stanza'] },
    ...overrides
});

describe('hotel settings from the server', () => {
    it('keeps the configured value until the server sent one, and when it sent 0', () => {
        expect(resolveServerLength(null, 'chatMaxLength', 100)).toBe(100);
        expect(resolveServerLength(settings(), 'chatMaxLength', 100)).toBe(120);
        expect(resolveServerLength(settings(), 'botNameMaxLength', 15)).toBe(15);
    });

    it('takes the server aliases of a scope, and the configured ones when the server has none', () => {
        expect(resolveMentionAliases(null, 'everyone', ['everyone'])).toEqual(['everyone']);
        expect(resolveMentionAliases(settings(), 'everyone', ['everyone'])).toEqual(['all', 'tutti']);
        expect(resolveMentionAliases(settings(), 'friends', ['friends'])).toEqual(['friends']);
    });

    it('stores what the login burst carries, once, however often it is asked to listen', () => {
        ListenForHotelSettings();
        ListenForHotelSettings();

        const parser = {
            cameraUrl: 'http://hotel/camera/',
            chatMaxLength: 90,
            mottoMaxLength: 38,
            botNameMaxLength: 15,
            petNameMaxLength: 16,
            everyoneAliases: ['all'],
            friendsAliases: ['amici'],
            roomAliases: ['room']
        };
        // The test build aliases the renderer to its mock, whose events take no callback and carry a type.
        const event = new (HotelSettingsEvent as unknown as new () => { type: string; getParser: () => typeof parser })();
        event.getParser = () => parser;

        mockEventDispatcher.dispatchEvent(event);

        expect(useHotelSettingsStore.getState().settings).toEqual({
            cameraUrl: 'http://hotel/camera/',
            chatMaxLength: 90,
            mottoMaxLength: 38,
            botNameMaxLength: 15,
            petNameMaxLength: 16,
            mentionAliases: { everyone: ['all'], friends: ['amici'], room: ['room'] }
        });
        expect(GetServerMentionAliases()).toEqual(['all', 'amici', 'room']);
    });
});
