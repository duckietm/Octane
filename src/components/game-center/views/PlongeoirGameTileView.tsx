import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/plongeoir/pl-banner.png';

/** The diving board's card in the Game Center: it opens the Lido. */
export const PlongeoirGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('plongeoir/show');
    };

    return (
        <div className="game-tile game-tile--world">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})`, backgroundColor: '#99ccff' }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{localizeWithFallback('plongeoir.tile.title', 'The diving board')}</div>
                <div className="game-tile__desc">{localizeWithFallback('plongeoir.tile.description', 'Climb the tower of the Lido, run, jump and dive: the others give you a mark! Up to eight players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeWithFallback('minigame.tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
