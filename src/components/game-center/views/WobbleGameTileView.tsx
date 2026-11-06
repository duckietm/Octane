import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { wbt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import poolImage from '../../../assets/images/wobble/wobble-rooftop.png';

/** Wobble Squabble's card in the Game Center: it opens the rooftop pool. */
export const WobbleGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('wobble/show');
    };

    return (
        <div className="game-tile game-tile--wobble">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${poolImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{wbt('tile.title', 'Wobble Squabble')}</div>
                <div className="game-tile__desc">{wbt('tile.description', 'Two fighters on a beam over the rooftop pool: keep your balance and knock your opponent into the water!')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{wbt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
