import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { hallt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/snails/snail-banner.png';

/** The snail race's card in the Game Center: it opens the game hall on the race. */
export const SnailGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('hall/show/snails');
    };

    return (
        <div className="game-tile game-tile--snails">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{hallt('snails.tile.title', 'Snail race')}</div>
                <div className="game-tile__desc">{hallt('snails.tile.description', 'Choose your snail and cheer it on to the finish line! Up to six players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{hallt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
