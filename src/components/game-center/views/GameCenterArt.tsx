import { CSSProperties, FC } from 'react';
import tokensData from '../../../assets/images/gamecenter/gc-tokens.json';
import tokensImage from '../../../assets/images/gamecenter/gc-tokens.png';
import { BaseButton } from '../../../common/BaseButton';

/** The Game Center's pictures of each game in SnowStorm's style (game-center-art.py). */
const leaderboards = import.meta.glob('../../../assets/images/gamecenter/gc-leaderboard-*.png', { eager: true, import: 'default' }) as Record<string, string>;

const TOKENS = tokensData as { cell: [number, number]; games: string[] };

/** A game's leaderboard background (SnowStorm's, in the game's colours). */
export const gameLeaderboardBackground = (game: string): string =>
    Object.entries(leaderboards).find(([ path ]) => path.endsWith(`gc-leaderboard-${ game }.png`))?.[1] ?? Object.values(leaderboards)[0] ?? '';

/** A "buy more games" button as SnowStorm's: the game's picture in the frame, "+N" on the band. */
export const GameTokenButton: FC<{ game: string; games: number; title: string; onClick: () => void }> = ({ game, games, title, onClick }) => {
    const [ width, height ] = TOKENS.cell;
    const row = Math.max(0, TOKENS.games.indexOf(game));
    const style = {
        '--token-sheet': `url(${ tokensImage })`,
        '--token-size': `${ width * 2 }px ${ height * TOKENS.games.length }px`,
        '--token-y': `${ -row * height }px`,
        '--token-x-hi': `${ -width }px`
    } as CSSProperties;

    return (
        <BaseButton aria-label={`+${ games }`} className="game-tile__token game-token" style={style} title={title} type="button" onClick={onClick}>
            <span className="game-token__count" data-browser-text>+{games}</span>
        </BaseButton>
    );
};
