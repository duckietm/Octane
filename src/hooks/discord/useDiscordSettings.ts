import { DiscordPreferencesEvent, GetDiscordPreferencesComposer, UpdateDiscordPreferencesComposer } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { GetConfigurationValue, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * Client-side model of the Discord Rich Presence preferences.
 *
 * Ported from the official `DiscordPreferences` value object
 * (`com.sulake.habbo.discord.settings`) and now kept on the server the way the official
 * `DiscordSettingsController` does it: `initComponent` asks for the stored set (composer 1055),
 * the server answers with the preferences (official event 1600, ours 9472) and every change is
 * written back with `updatePreferences` (composer 2774), which also carries the global preference
 * version. Version 0 means the user never saved, so the official falls back to the all-on
 * defaults; we do the same.
 */
export interface DiscordPreferences {
    /** Show the Habbo Rich Presence on the user's Discord profile (master toggle). */
    showHabbo: boolean;
    /** Share what the user is doing (room name / activity) in the presence. */
    shareActivity: boolean;
    /** Hide room details while in a hidden room. */
    hideInHiddenRooms: boolean;
    /** Expose a "Visit room" join button on the presence. */
    allowJoining: boolean;
}

export const DISCORD_PREFERENCES_DEFAULT: DiscordPreferences = {
    showHabbo: true,
    shareActivity: true,
    hideInHiddenRooms: true,
    allowJoining: true
};

/** Official `DiscordSettingsController.preferenceGlobalVersion`. */
const getPreferenceVersion = () => GetConfigurationValue<number>('discord_activity.settings.version', 1);

export const useDiscordSettings = () => {
    const [preferences, setPreferences] = useState<DiscordPreferences>(DISCORD_PREFERENCES_DEFAULT);
    const [preferenceVersion, setPreferenceVersion] = useState(0);

    useMessageEvent<DiscordPreferencesEvent>(DiscordPreferencesEvent, (event) => {
        const parser = event.getParser();

        setPreferenceVersion(parser.version);

        // Official onDiscordPreferences: an unsaved set (version 0) shows the defaults.
        if (!parser.version) {
            setPreferences(DISCORD_PREFERENCES_DEFAULT);
            return;
        }

        setPreferences({
            showHabbo: parser.showHabbo,
            shareActivity: parser.shareActivity,
            hideInHiddenRooms: parser.hideInHiddenRooms,
            allowJoining: parser.allowJoining
        });
    });

    // Official DiscordSettingsController.initComponent().
    useEffect(() => {
        SendMessageComposer(new GetDiscordPreferencesComposer());
    }, []);

    const updatePreferences = useCallback((partial: Partial<DiscordPreferences>) => {
        setPreferences((prev) => {
            const next = { ...prev, ...partial };

            SendMessageComposer(
                new UpdateDiscordPreferencesComposer(
                    getPreferenceVersion(),
                    next.showHabbo,
                    next.shareActivity,
                    next.hideInHiddenRooms,
                    next.allowJoining
                )
            );

            return next;
        });
    }, []);

    const resetPreferences = useCallback(() => updatePreferences(DISCORD_PREFERENCES_DEFAULT), [updatePreferences]);

    return { preferences, updatePreferences, resetPreferences, preferenceVersion };
};
