import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { ut } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { UnoCardView } from '../../uno/UnoCardView';

/** UNO's card in the Game Center: it opens the UNO window (a game of Habbi, not one of the server's game list). */
export const UnoGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('uno/show');
    };

    return (
        <div className="game-tile game-tile--uno">
            <div className="game-tile__banner">
                <UnoCardView code="R7" zoom={2} />
                <UnoCardView code="WC" zoom={2} />
                <UnoCardView code="BD" zoom={2} />
            </div>
            <div className="game-tile__body">
                <div className="game-tile__title">UNO</div>
                <div className="game-tile__desc">{ut('tile.description', 'Match the colour or the value, pile up the +2 and +4, and be the first to have no cards left. Against your friends or robots!')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeTile()}</BaseButton>
                </div>
            </div>
        </div>
    );
};

const localizeTile = (): string => ut('tile.play', 'Play!');
