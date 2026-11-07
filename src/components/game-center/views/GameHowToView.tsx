import { FC, ReactNode, useState } from 'react';
import { gct } from '../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../assets/images/snowstorm/air';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

/** How to play each game, a step a page (`gamecenter.<game>.howto.<n>`). */
export const GAME_HOW_TO: Record<string, string[]> = {
    uno: [
        'Play a card of the same colour or the same number as the top of the pile.',
        'No card to play? Draw one. +2 and +4 make the next player draw, Skip and Reverse change the turn.',
        'A wild card lets you choose the colour.',
        'One card left: press UNO! before somebody catches you.',
        'The first with an empty hand wins.'
    ],
    werewolf: [
        'Everybody gets a secret role: villagers, werewolves, and a few loners.',
        'At night the werewolves choose a victim, and the roles with a power use it.',
        'In the day the village talks and votes to eliminate a suspect.',
        'The village wins when every werewolf is dead, the wolves when they are as many as the villagers.',
        'When it is your turn to act, click the name of a player to choose them.'
    ],
    wobble: [
        'Two players face each other on the buoys over the pool.',
        'Hold Q or E to lean left or right and keep your balance.',
        'A and D push the other player, N and M move you along the buoys.',
        'Space puts you straight again, once a round.',
        'The one who falls in the water loses the round.'
    ],
    wobblenext: [
        'Two players face each other on the buoys over the pool.',
        'Hold Q or E to lean left or right: watch the dial and keep the needle in the middle.',
        'A and D push the other player, N and M move you along the buoys.',
        'Space puts you straight again, once a round.',
        'The one who falls in the water loses the round.'
    ],
    battleball: [
        'Click a tile to bounce there: each tile you land on takes your team\'s colour.',
        'Land on it again to make it brighter, up to 14 points a tile.',
        'Close an area with your colour to fill it all at once.',
        'Pick up the power-ups and use them with Space.',
        'The team with the most points when the time is up wins.'
    ],
    fastfood: [
        'Press Space to drop your plate from the kitchen.',
        'Press Space again to open the parachute: too late, or too fast, and the plate breaks!',
        'Each plate served gives you a star.',
        'A plate served may give a power-up: use it with E (missile, shield, big parachute).',
        'The first to serve all the plates wins.'
    ],
    hall: [
        'The five games of the old game hall: tic-tac-toe (five in a row), Connect 4, battleships, chess and poker.',
        'Choose a game, then sit at a table or open one.',
        'Play in turn: you have 60 seconds for each move.',
        'Nobody around? Add robots.'
    ],
    snails: [
        'Up to six snails race along their lanes.',
        'Press Space to cheer your snail on: it goes faster.',
        'Cheer too much and it gets tired: find the right rhythm!',
        'The first snail across the line wins.'
    ],
    quiz: [
        'Ten questions about Habbo and the hotel, four answers each.',
        'Click A, B, C or D before the time runs out.',
        'A right answer is worth 500 points, plus a bonus for speed.',
        'The best score after ten questions wins.'
    ],
    tetris: [
        'Arrows to move and turn the pieces, down to drop them faster, Space to drop them at once.',
        'Fill a whole line to clear it.',
        'Clear 2, 3 or 4 lines at once to send lines of rubble to the others.',
        'The last one standing wins, or the best score after 4 minutes.'
    ],
    diving: [
        'Each player dives in turn from the top of the tower.',
        'Run with A and D, jump with Space.',
        'In the air, do figures with the keys W, E, A, S, D, X and Z.',
        'The others give your dive a mark from 0 to 10.',
        'The best total of marks wins.'
    ],
    kart: [
        'Choose your kart, then race online or against robots.',
        'Arrows: the direction to go on the screen. The kart turns and drives on its own.',
        'Hold Shift in the bends to drift, then let go for a turbo.',
        'Drive through the ? boxes and use your item with Space: turbo, banana peel, shell.',
        'Three laps: the first across the line wins!'
    ],
    copywriter: [
        'Your monkey lives on its island: feed it, wash it, let it sleep and have fun.',
        'Pick the bananas from the trees and use the island\'s objects.',
        'Play Jungle Jam and Banana Drama to win coins.',
        'Build the rocket piece by piece, then launch it!',
        'At the typewriter, Copy Writer: type the parrot\'s letters again, the last monkey awake wins.'
    ]
};

/**
 * A game's "How to play", a small window over the games list in SnowStorm's way: the game's banner, a step a page,
 * the arrows and the balls of the pages, Back.
 */
export const GameHowToView: FC<{ game: string; title: string; banner: ReactNode; onClose: () => void }> = ({ game, title, banner, onClose }) => {
    const steps = GAME_HOW_TO[game] ?? [];
    const [ page, setPage ] = useState(0);
    const go = (step: number) => setPage((step + steps.length) % steps.length);

    if (!steps.length) return null;

    return (
        <NativeTextTree>
            <div className="game-howto-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
                <div className="game-howto" data-game-theme={game} role="dialog" aria-label={title}>
                    <div className="game-howto__title">
                        <span>{gct('howto.title', '%game%: how to play', [ 'game' ], [ title ])}</span>
                        <BaseButton aria-label={gct('close', 'Close')} className="game-howto__close" type="button" onClick={onClose}>×</BaseButton>
                    </div>
                    <div className="game-howto__banner">{banner}</div>
                    <div className="game-howto__page">
                        <BaseButton aria-label="Previous" className="game-howto__arrow is-previous" style={{ backgroundImage: `url(${ SNOWWAR_AIR_ASSETS.scroll_left })` }} type="button" onClick={() => go(page - 1)} />
                        <div className="game-howto__text" data-browser-text>
                            <span className="game-howto__number">{page + 1}</span>
                            {gct(`${ game }.howto.${ page + 1 }`, steps[page])}
                        </div>
                        <BaseButton aria-label="Next" className="game-howto__arrow is-next" style={{ backgroundImage: `url(${ SNOWWAR_AIR_ASSETS.scroll_right })` }} type="button" onClick={() => go(page + 1)} />
                    </div>
                    <div className="game-howto__balls">
                        {steps.map((step, index) => (
                            <BaseButton key={step} aria-label={String(index + 1)} className="game-howto__ball" type="button" style={{ backgroundImage: `url(${ SNOWWAR_AIR_ASSETS[index === page ? 'pagination_ball_hilite' : 'pagination_ball'] })` }} onClick={() => setPage(index)} />
                        ))}
                    </div>
                    <BaseButton className="game-howto__back" type="button" onClick={onClose} data-browser-text>{gct('howto.back', 'Back')}</BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
