import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { wt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { WerewolfRoleIcon } from '../../werewolf/WerewolfRoleIcon';

/** The werewolf game's card in the Game Center: it opens the village's clearing. */
export const WerewolfGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('werewolf/show');
    };

    return (
        <div className="game-tile game-tile--werewolf">
            <div className="game-tile__banner">
                <WerewolfRoleIcon role="seer" zoom={3} />
                <WerewolfRoleIcon role="werewolf" zoom={4} />
                <WerewolfRoleIcon role="witch" zoom={3} />
            </div>
            <div className="game-tile__body">
                <div className="game-tile__title">{wt('tile.title', 'Werewolf')}</div>
                <div className="game-tile__desc">{wt('tile.description', 'Werewolves hide in the village. Seer, witch, hunter, Cupid: find them and vote them out before they devour everybody!')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{wt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
