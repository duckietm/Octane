import { CreateLinkEvent, GetSecondsUntilMessageComposer, SecondsUntilMessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../api/octane/GetConfigurationValue';
import { OpenUrl } from '../../api/octane/OpenUrl';
import { SendMessageComposer } from '../../api/octane/SendMessageComposer';
import {
    getActiveNewFeatureKeys,
    getNewFeatureConditionState,
    getNewFeaturePendingTimes,
    NEW_FEATURE_CONDITION_WAIT_MS,
    NEW_FEATURE_TYPE_COUNTDOWN,
    NEW_FEATURE_TYPE_NORMAL,
    NEW_FEATURE_TYPE_PROMO,
    NewFeatureConditionState,
    NewFeatureNotificationConfig,
    NewFeaturePropertyReader,
    readNewFeatureConfig
} from '../../api/notification/NewFeatureNotification';
import { useMessageEvent } from '../events';
import { useRewardTracks } from '../quests/useRewardTracks';

export interface NewFeatureNotificationEntry {
    config: NewFeatureNotificationConfig;
    /** Waiting for the server's seconds until the expiry time. */
    expiryPending: boolean;
    /** Countdown type: waiting for the server's seconds until the count-down time. */
    countdownPending: boolean;
    countdownSeconds: number;
    /** Date.now() when the countdown seconds arrived. */
    countdownReceivedAt: number;
    /** cancel_link_region: shown from the start except on the promo layout, which shows it after "open". */
    cancelVisible: boolean;
}

const KNOWN_TYPES = [NEW_FEATURE_TYPE_NORMAL, NEW_FEATURE_TYPE_PROMO, NEW_FEATURE_TYPE_COUNTDOWN];

/** AIR reads these from the hotel's external variables; Octane from its configuration. */
export const readNewFeatureConfigurationProperty: NewFeaturePropertyReader = (key: string) => {
    const value = GetConfigurationValue<unknown>(key, '');

    return value === null || value === undefined ? '' : String(value);
};

/**
 * SingularNotificationController.maybeShowNewFeatureNotification() + NewFeatureNotification: when the hotel
 * shows, every active key whose condition holds becomes a notification in the toolbar extension area (AIR's
 * 2 s start delay passes during its loading screen); a key waiting for its reward track is shown as soon as
 * the track arrives, for up to 8 s. An expiry or
 * count-down time first asks the server how many seconds are left (GetSecondsUntil); an expired one is
 * dropped. "Cancel" removes it for this session only: AIR stores nothing.
 */
export const useNewFeatureNotifications = (property: NewFeaturePropertyReader = readNewFeatureConfigurationProperty) => {
    const { tracks = [] } = useRewardTracks();
    const [entries, setEntries] = useState<NewFeatureNotificationEntry[]>([]);
    const tracksRef = useRef(tracks);
    const pendingKeysRef = useRef<string[]>([]);
    const checkPendingRef = useRef<(() => void) | null>(null);

    useLayoutEffect(() => {
        tracksRef.current = tracks;
    }, [tracks]);

    // The reward tracks arrived or changed: a key that waited for its track is decided now.
    useEffect(() => {
        checkPendingRef.current?.();
    }, [tracks]);

    useEffect(() => {
        const timers = new Set<ReturnType<typeof setTimeout>>();
        let disposed = false;

        const later = (callback: () => void, delay: number) => {
            const timer = setTimeout(() => {
                timers.delete(timer);

                if (!disposed) callback();
            }, delay);

            timers.add(timer);
        };

        const create = (key: string) => {
            const config = readNewFeatureConfig(key, property);

            // AIR builds new_feature_notification_<type>_xml: a type without a layout shows nothing.
            if (!KNOWN_TYPES.includes(config.type)) return;

            const pending = getNewFeaturePendingTimes(config);

            setEntries((previous) => [
                ...previous.filter((entry) => entry.config.key !== key),
                {
                    config,
                    expiryPending: pending.expiry,
                    countdownPending: pending.countdown,
                    countdownSeconds: 0,
                    countdownReceivedAt: 0,
                    cancelVisible: config.type !== NEW_FEATURE_TYPE_PROMO
                }
            ]);

            if (pending.expiry) SendMessageComposer(new GetSecondsUntilMessageComposer(config.expiry));

            if (pending.countdown) SendMessageComposer(new GetSecondsUntilMessageComposer(config.countDownTo));
        };

        // Keys whose reward track is not known yet: checked again whenever the tracks change, until the wait is over.
        const checkPending = () => {
            const waiting: string[] = [];

            for (const key of pendingKeysRef.current) {
                const state = getNewFeatureConditionState(property(`notifications.new_feature.condition.${key}`), tracksRef.current);

                if (state === NewFeatureConditionState.VISIBLE) create(key);
                else if (state === NewFeatureConditionState.UNAVAILABLE) waiting.push(key);
            }

            pendingKeysRef.current = waiting;
        };

        pendingKeysRef.current = getActiveNewFeatureKeys(property);
        checkPendingRef.current = checkPending;
        checkPending();

        later(() => {
            pendingKeysRef.current = [];
        }, NEW_FEATURE_CONDITION_WAIT_MS);

        return () => {
            disposed = true;
            pendingKeysRef.current = [];
            checkPendingRef.current = null;

            for (const timer of timers) clearTimeout(timer);

            timers.clear();
        };
    }, [property]);

    useMessageEvent<SecondsUntilMessageEvent>(SecondsUntilMessageEvent, (event) => {
        const parser = event.getParser();
        const receivedAt = Date.now();

        // NewFeatureNotification.onTime(): an expiry already passed disposes it before it ever shows.
        setEntries((previous) => {
            let changed = false;
            const next: NewFeatureNotificationEntry[] = [];

            for (const entry of previous) {
                let updated = entry;

                if (updated.expiryPending && parser.timeStr === updated.config.expiry) {
                    changed = true;

                    if (parser.secondsUntil <= 0) continue;

                    updated = { ...updated, expiryPending: false };
                }

                if (updated.countdownPending && parser.timeStr === updated.config.countDownTo) {
                    changed = true;
                    updated = { ...updated, countdownPending: false, countdownSeconds: Math.max(0, parser.secondsUntil), countdownReceivedAt: receivedAt };
                }

                next.push(updated);
            }

            return changed ? next : previous;
        });
    });

    /** cancel_link / cancel_link_region. */
    const dismiss = useCallback((key: string) => setEntries((previous) => previous.filter((entry) => entry.config.key !== key)), []);

    /** open_button / main_region: the internal link, else the external one; the cancel link shows from then on. */
    const open = useCallback((key: string) => {
        setEntries((previous) => previous.map((entry) => (entry.config.key === key && !entry.cancelVisible ? { ...entry, cancelVisible: true } : entry)));

        const internalLink = property(`notifications.new_feature.internal_link.${key}`);

        if (internalLink !== '') {
            CreateLinkEvent(internalLink);

            return;
        }

        const externalLink = property(`notifications.new_feature.external_link.${key}`);

        if (externalLink !== '') OpenUrl(externalLink);
    }, [property]);

    const visible = entries.filter((entry) => !entry.expiryPending && !entry.countdownPending);

    return { notifications: visible, dismiss, open };
};
