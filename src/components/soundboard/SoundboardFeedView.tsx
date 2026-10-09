import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { LocalizeText } from '../../api';
import { useSoundboard } from '../../hooks';
import { SOUNDBOARD_FEED_DURATION_MS, SoundboardFeedEntry, useSoundboardFeedStore } from '../../hooks/soundboard/soundboardFeedStore';

interface SoundboardFeedItemViewProps {
    entry: SoundboardFeedEntry;
    canSilence: boolean;
    onSilence: (userId: number) => void;
}

export const SoundboardFeedItemView: FC<SoundboardFeedItemViewProps> = ({ entry, canSilence, onSilence }) => {
    const dismiss = useSoundboardFeedStore((state) => state.dismiss);

    useEffect(() => {
        const timer = window.setTimeout(() => dismiss(entry.key), SOUNDBOARD_FEED_DURATION_MS);

        return () => window.clearTimeout(timer);
    }, [dismiss, entry.key]);

    return (
        <div className="soundboard-feed__item octane-notification-bubble octane-swf-notification-bubble" role="status" onClick={() => dismiss(entry.key)}>
            <FaVolumeUp aria-hidden="true" className="soundboard-feed__icon" />
            <div className="min-w-0 flex-1">
                <span className="soundboard-feed__user">{entry.username}</span>{' '}
                <span className="soundboard-feed__sound">{LocalizeText('soundboard.feed.played', ['sound'], [entry.soundName])}</span>
            </div>
            {canSilence && (
                <button
                    type="button"
                    className="soundboard-feed__silence"
                    title={LocalizeText('soundboard.feed.silence', ['user'], [entry.username])}
                    aria-label={LocalizeText('soundboard.feed.silence', ['user'], [entry.username])}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSilence(entry.userId);
                        dismiss(entry.key);
                    }}
                >
                    <FaVolumeMute aria-hidden="true" />
                </button>
            )}
            <span aria-hidden="true" className="soundboard-feed__timer" style={{ animationDuration: `${SOUNDBOARD_FEED_DURATION_MS}ms` }} />
        </div>
    );
};

/** Who played what, stacked at the side of the room instead of in room chat. */
export const SoundboardFeedView: FC<{}> = () => {
    const entries = useSoundboardFeedStore((state) => state.entries);
    const { silenceUser } = useSoundboard();
    const ownUserId = GetSessionDataManager().userId;

    if (!entries.length) return null;

    return (
        <div className="soundboard-feed" aria-live="polite">
            {entries.map((entry) => (
                <SoundboardFeedItemView
                    key={entry.key}
                    entry={entry}
                    canSilence={entry.userId > 0 && entry.userId !== ownUserId}
                    onSilence={silenceUser}
                />
            ))}
        </div>
    );
};
