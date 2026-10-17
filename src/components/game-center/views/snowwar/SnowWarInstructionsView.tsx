import { FC, useEffect, useState } from 'react';
import {
    getInstructionFrame,
    isInstructionPageHighlighted,
    LocalizeText,
    SNOWWAR_INSTRUCTION_FRAME_MS,
    SNOWWAR_INSTRUCTION_PAGES,
    wrapInstructionPage
} from '../../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../../assets/images/snowstorm/air';
import { useGameCenter } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';

const localizeWithFallback = (key: string, fallback: string) =>
{
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

/**
 * AIR games_main "instructions_container", opened by the "How To Play" link:
 * one animated picture (the `move_` / `throw_N_` / `balls_` strips, one frame
 * per second), the page text `snowwar.instructions.N`, prev / next arrows,
 * five pagination balls lit up to the current page and a "Back" link.
 * The AIR bitmaps are bundled instead of loaded from the image library.
 */
export const SnowWarInstructionsView: FC = () =>
{
    const { setInstructionsOpen } = useGameCenter();
    const [ page, setPage ] = useState(0);
    const [ frame, setFrame ] = useState(0);

    const current = SNOWWAR_INSTRUCTION_PAGES[page];

    // Restart the strip from frame 0 whenever the page changes, then step once
    // per INSTRUCTION_FRAME_LENGTH like SnowWarAnimatedWindowElement.
    useEffect(() =>
    {
        const startedAt = Date.now();
        const reset = setTimeout(() => setFrame(0), 0);
        const interval = setInterval(() => setFrame(getInstructionFrame(Date.now() - startedAt, current.frames)), SNOWWAR_INSTRUCTION_FRAME_MS);

        return () =>
        {
            clearTimeout(reset);
            clearInterval(interval);
        };
    }, [ current ]);

    const goTo = (delta: number) =>
    {
        setFrame(0);
        setPage(previous => wrapInstructionPage(previous, delta));
    };

    const image = SNOWWAR_AIR_ASSETS[`${ current.asset }${ frame + 1 }`];

    return (
        <div className="snowwar-instructions">
            <BaseButton aria-label="previous" className="snowwar-instructions__arrow snowwar-instructions__arrow--prev" type="button" onClick={ () => goTo(-1) }>
                <img alt="" src={ SNOWWAR_AIR_ASSETS.scroll_left } />
            </BaseButton>
            <div className="snowwar-instructions__image">
                { image && <img alt="" src={ image } /> }
            </div>
            <BaseButton aria-label="next" className="snowwar-instructions__arrow snowwar-instructions__arrow--next" type="button" onClick={ () => goTo(1) }>
                <img alt="" src={ SNOWWAR_AIR_ASSETS.scroll_right } />
            </BaseButton>
            <div className="snowwar-instructions__pages">
                { SNOWWAR_INSTRUCTION_PAGES.map((_, index) => (
                    <BaseButton
                        key={ index }
                        aria-label={ `page ${ index + 1 }` }
                        className="snowwar-instructions__ball"
                        type="button"
                        onClick={ () =>
                        {
                            setFrame(0);
                            setPage(index);
                        } }>
                        <img alt="" src={ isInstructionPageHighlighted(index, page) ? SNOWWAR_AIR_ASSETS.pagination_ball_hilite : SNOWWAR_AIR_ASSETS.pagination_ball } />
                    </BaseButton>
                )) }
            </div>
            <div className="snowwar-instructions__text">{ localizeWithFallback(current.textKey, INSTRUCTION_FALLBACKS[page]) }</div>
            <BaseButton className="snowwar-instructions__back" type="button" onClick={ () => setInstructionsOpen(false) }>
                { localizeWithFallback('snowwar.instructions.back', 'Back') }
            </BaseButton>
        </div>
    );
};
