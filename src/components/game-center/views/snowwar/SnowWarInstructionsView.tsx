import { FC, useEffect, useState } from 'react';
import {
    GetConfigurationValue,
    getInstructionFrame,
    isInstructionPageHighlighted,
    LocalizeText,
    SNOWWAR_INSTRUCTION_FRAME_MS,
    SNOWWAR_INSTRUCTION_PAGES,
    wrapInstructionPage
} from '../../../../api';
import { useGameCenter } from '../../../../hooks';

const localizeWithFallback = (key: string, fallback: string) => {
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

const INSTRUCTION_FALLBACKS = [
    'Click on empty tiles to move.',
    'Click an opponent to throw a snowball at them.',
    'Hold SHIFT key down to throw to an empty tile.',
    'Hold ALT key down to throw over obstacles.',
    'You have limited snowballs. Make more with the green button.'
];

const getInstructionFrameUrl = (asset: string, frame: number) => {
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const baseUrl = imageLibraryUrl && !imageLibraryUrl.endsWith('/') ? `${imageLibraryUrl}/` : imageLibraryUrl;
    return `${baseUrl}snowstorm_client/${asset}${frame}.png`;
};

/**
 * AIR games_main "instructions_container", opened by the "How To Play" link:
 * one animated picture (the `move_` / `throw_N_` / `balls_` frame strips, one
 * frame per second), the page text `snowwar.instructions.N`, prev / next
 * arrows either side, five pagination balls lit up to the current page and a
 * "Back" link to the teaser. AIR has no "don't show again" — the pages are
 * only ever reached through the link.
 */
export const SnowWarInstructionsView: FC = () => {
    const { setInstructionsOpen } = useGameCenter();
    const [page, setPage] = useState(0);
    const [frame, setFrame] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);

    const current = SNOWWAR_INSTRUCTION_PAGES[page];

    // Restart the strip from frame 0 whenever the page changes, then step once
    // per INSTRUCTION_FRAME_LENGTH like SnowWarAnimatedWindowElement.
    useEffect(() => {
        const startedAt = Date.now();
        setFrame(0);
        setImageFailed(false);
        const interval = window.setInterval(() => setFrame(getInstructionFrame(Date.now() - startedAt, current.frames)), SNOWWAR_INSTRUCTION_FRAME_MS);
        return () => window.clearInterval(interval);
    }, [current]);

    const goTo = (delta: number) => setPage((previous) => wrapInstructionPage(previous, delta));

    return (
        <div className="snowwar-instructions">
            <button type="button" className="snowwar-instructions__arrow snowwar-instructions__arrow--prev" aria-label="previous" onClick={() => goTo(-1)} />
            <div className="snowwar-instructions__image">
                {!imageFailed && <img alt="" src={getInstructionFrameUrl(current.asset, frame)} onError={() => setImageFailed(true)} />}
            </div>
            <button type="button" className="snowwar-instructions__arrow snowwar-instructions__arrow--next" aria-label="next" onClick={() => goTo(1)} />
            <div className="snowwar-instructions__pages">
                {SNOWWAR_INSTRUCTION_PAGES.map((_, index) => (
                    <button
                        key={index}
                        type="button"
                        aria-label={`page ${index + 1}`}
                        className={`snowwar-instructions__ball${isInstructionPageHighlighted(index, page) ? ' snowwar-instructions__ball--hilite' : ''}`}
                        onClick={() => setPage(index)}
                    />
                ))}
            </div>
            <div className="snowwar-instructions__text">{localizeWithFallback(current.textKey, INSTRUCTION_FALLBACKS[page])}</div>
            <button type="button" className="snowwar-instructions__back" onClick={() => setInstructionsOpen(false)}>
                {localizeWithFallback('snowwar.instructions.back', 'Back')}
            </button>
        </div>
    );
};
