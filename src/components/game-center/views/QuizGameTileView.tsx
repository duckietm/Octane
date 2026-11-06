import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { hallt } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import bannerImage from '../../../assets/images/quiz/quiz-banner.png';

/** The quiz's card in the Game Center: it opens the game hall on the quiz. */
export const QuizGameTileView: FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const open = () => {
        onOpen();
        CreateLinkEvent('hall/show/quiz');
    };

    return (
        <div className="game-tile game-tile--quiz">
            <div className="game-tile__banner" style={{ backgroundImage: `url(${bannerImage})` }} />
            <div className="game-tile__body">
                <div className="game-tile__title">{hallt('quiz.tile.title', 'Habbi quiz')}</div>
                <div className="game-tile__desc">{hallt('quiz.tile.description', 'Ten questions on the hotel and the world: answer right and fast! Up to eight players, robots welcome.')}</div>
                <div className="game-tile__actions">
                    <BaseButton className="snowwar-button game-tile__play" type="button" onClick={open}>{hallt('tile.play', 'Play!')}</BaseButton>
                </div>
            </div>
        </div>
    );
};
