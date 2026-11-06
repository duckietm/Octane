import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/kart/kart-banner.png';

/** HabboKart's card in the Game Center: it opens the Lido. */
export const KartGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('kart/show');
    };

    return (
        <div className="game-tile game-tile--world">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})`, backgroundColor: '#5ca834' }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{localizeWithFallback('kart.tile.title', 'HabboKart')}</div>
                <div className="game-tile__desc">{localizeWithFallback('kart.tile.description', 'Three laps at the wheel of a hotel car on the track: the first across the line wins! Up to eight players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeWithFallback('minigame.tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
