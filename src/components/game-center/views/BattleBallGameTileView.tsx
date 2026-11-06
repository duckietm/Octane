import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { bbt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import thumbsImage from '../../../assets/images/battleball/bb-thumbs.png';

/** BattleBall's card in the Game Center (the original's arena thumbnail): it opens the game. */
export const BattleBallGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('battleball/show');
    };

    return (
        <div className="game-tile game-tile--battleball">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${thumbsImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{bbt('tile.title', 'BattleBall')}</div>
                <div className="game-tile__desc">{bbt('tile.description', 'Bounce on your ball, colour the arena in your team\'s colour and lock the tiles before the others. Light bulb, cannon, bomb... the power-ups of the original!')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{bbt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
