import { FC, useEffect, useMemo } from 'react';
import { LocalizeText } from '../../api';
import { useSoundboard } from '../../hooks';
import { SOUNDBOARD_FEED_DURATION_MS, SoundboardFeedEntry, useSoundboardFeedStore } from '../../hooks/soundboard/soundboardFeedStore';
import { SoundboardTone } from '../../hooks/soundboard/soundboardPresentation';
import { SOUNDBOARD_TONE_CLASSES } from './SoundboardPadView';

const SoundboardFeedItemView: FC<{ entry: SoundboardFeedEntry; tone: SoundboardTone }> = ({ entry, tone }) => {
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
        </div>
    );
};

/** Who played what, stacked at the side of the room instead of in room chat. */
export const SoundboardFeedView: FC<{}> = () => {
    const entries = useSoundboardFeedStore((state) => state.entries);
    const { sounds } = useSoundboard();
    const toneById = useMemo(() => new Map(sounds.map((sound) => [sound.id, sound.tone])), [sounds]);

    if (!entries.length) return null;

    return (
        <div className="soundboard-feed" aria-live="polite">
            {entries.map((entry) => (
                <SoundboardFeedItemView key={entry.key} entry={entry} tone={toneById.get(entry.soundId) ?? 'blue'} />
            ))}
        </div>
    );
};
