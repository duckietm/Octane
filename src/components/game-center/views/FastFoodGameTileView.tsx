import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { fft } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import lobbyImage from '../../../assets/images/fastfood/ff-bg-lobby.jpg';
import logoImage from '../../../assets/images/fastfood/ff-logo.png';

/** Fast Food's card in the Game Center (the original's logo on its curtain): it opens the game. */
export const FastFoodGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('fastfood/show');
    };

    return (
        <div className="game-tile game-tile--fastfood">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${logoImage}), url(${lobbyImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{fft('tile.title', 'Fast Food')}</div>
                <div className="game-tile__desc">{fft('tile.description', 'Drop the plates from up high and open the parachute at the last moment: the diners are starving! Missiles, shields and big parachutes, as in the original.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{fft('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
