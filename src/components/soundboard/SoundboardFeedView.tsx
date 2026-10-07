import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useMemo } from 'react';
import { FaVolumeMute } from 'react-icons/fa';
import { LocalizeText } from '../../api';
import { useSoundboard } from '../../hooks';
import { SOUNDBOARD_FEED_DURATION_MS, SoundboardFeedEntry, useSoundboardFeedStore } from '../../hooks/soundboard/soundboardFeedStore';
import { SoundboardTone } from '../../hooks/soundboard/soundboardPresentation';
import { SOUNDBOARD_TONE_CLASSES } from './SoundboardPadView';

interface SoundboardFeedItemViewProps {
    entry: SoundboardFeedEntry;
    tone: SoundboardTone;
    canSilence: boolean;
    onSilence: (userId: number) => void;
}

export const SoundboardFeedItemView: FC<SoundboardFeedItemViewProps> = ({ entry, tone, canSilence, onSilence }) => {
    const dismiss = useSoundboardFeedStore((state) => state.dismiss);

    useEffect(() => {
        const timer = window.setTimeout(() => dismiss(entry.key), SOUNDBOARD_FEED_DURATION_MS);

        return () => window.clearTimeout(timer);
    }, [dismiss, entry.key]);

    return (
        <div className="soundboard-feed__item" role="status" onClick={() => dismiss(entry.key)}>
            <div aria-hidden="true" className={`soundboard-feed__icon ${SOUNDBOARD_TONE_CLASSES[tone]}`}>♪</div>
            <div className="min-w-0 flex-1">
                <div className="soundboard-feed__user">{entry.username}</div>
                <div className="soundboard-feed__sound">{LocalizeText('soundboard.feed.played', ['sound'], [entry.soundName])}</div>
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
        </div>
    );
};

/** Who played what, stacked at the side of the room instead of in room chat. */
export const SoundboardFeedView: FC<{}> = () => {
    const entries = useSoundboardFeedStore((state) => state.entries);
    const { sounds, silenceUser } = useSoundboard();
    const toneById = useMemo(() => new Map(sounds.map((sound) => [sound.id, sound.tone])), [sounds]);
    const ownUserId = GetSessionDataManager().userId;

    if (!entries.length) return null;

    return (
        <div className="soundboard-feed" aria-live="polite">
            {entries.map((entry) => (
                <SoundboardFeedItemView
                    key={entry.key}
                    entry={entry}
                    tone={toneById.get(entry.soundId) ?? 'blue'}
                    canSilence={entry.userId > 0 && entry.userId !== ownUserId}
                    onSilence={silenceUser}
                />
            ))}
        </div>
    );
};
