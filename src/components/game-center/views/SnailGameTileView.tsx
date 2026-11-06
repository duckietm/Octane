import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/snails/snail-banner.png';

/** The snail race's card in the Game Center: it opens the race's garden. */
export const SnailGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('snailrace/show');
    };

    return (
        <div className="game-tile game-tile--world">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})`, backgroundColor: '#5ca834' }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{localizeWithFallback('snailrace.tile.title', 'The snail race')}</div>
                <div className="game-tile__desc">{localizeWithFallback('snailrace.tile.description', 'Choose your snail and cheer it on to the finish line! Up to six players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeWithFallback('minigame.tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
