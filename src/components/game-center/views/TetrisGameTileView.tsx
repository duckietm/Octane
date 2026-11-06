import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { hallt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/tetris/tetris-banner.png';

/** The Tetris duel's card in the Game Center: it opens the game hall on Tetris. */
export const TetrisGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('hall/show/tetris');
    };

    return (
        <div className="game-tile game-tile--quiz game-tile--tetris">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{hallt('tetris.tile.title', 'Tetris duel')}</div>
                <div className="game-tile__desc">{hallt('tetris.tile.description', 'Clear lines to bury the others under rubbish: the last one standing wins! Two to four players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{hallt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
