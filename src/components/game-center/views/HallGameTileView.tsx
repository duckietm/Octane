import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { hallt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/hall/hall-banner.png';

/** The game hall's card in the Game Center (made of the Cunning Fox Gamehall's pieces): it opens the hall. */
export const HallGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('hall/show');
    };

    return (
        <div className="game-tile game-tile--hall">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{hallt('tile.title', 'The game hall')}</div>
                <div className="game-tile__desc">{hallt('tile.description', 'Tic-tac-toe, four in a row, battleships, chess and poker, as in the Cunning Fox Gamehall of 2004. Against your friends or robots.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{hallt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
