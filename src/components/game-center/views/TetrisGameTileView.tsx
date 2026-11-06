import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/tetris/tetris-banner.png';

/** The blocks duel's card in the Game Center: it opens the arcade. */
export const TetrisGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('tetrisduel/show');
    };

    return (
        <div className="game-tile game-tile--world">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})`, backgroundColor: '#003163' }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{localizeWithFallback('tetrisduel.tile.title', 'Blocks duel')}</div>
                <div className="game-tile__desc">{localizeWithFallback('tetrisduel.tile.description', 'Clear rows to bury the others under rubbish: the last one standing wins! Two to four players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeWithFallback('minigame.tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
