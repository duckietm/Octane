import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/quiz/quiz-banner.png';

/** The quiz's card in the Game Center: it opens the quiz's studio. */
export const QuizGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('habbiquiz/show');
    };

    return (
        <div className="game-tile game-tile--world">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})`, backgroundColor: '#f5b400' }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{localizeWithFallback('habbiquiz.tile.title', 'The Habbi quiz')}</div>
                <div className="game-tile__desc">{localizeWithFallback('habbiquiz.tile.description', 'Ten questions on the hotel and the world: answer right and fast! Up to eight players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{localizeWithFallback('minigame.tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
