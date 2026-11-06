import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/lostmonkey/lm-banner.png';

/** Lost Monkey's card in the Game Center: it opens the jungle. */
export const LostMonkeyGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('lostmonkey/show');
    };

    return (
        <div className="game-tile game-tile--world">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})`, backgroundColor: '#0b3d1e' }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{localizeWithFallback('lostmonkey.tile.title', 'Lost Monkey')}</div>
                <div className="game-tile__desc">{localizeWithFallback('lostmonkey.tile.description', 'Copy Writer, from Habbo\'s Lost Monkey: repeat the parrot\'s row of letters, longer and longer. The last monkey awake wins!')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeWithFallback('minigame.tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
