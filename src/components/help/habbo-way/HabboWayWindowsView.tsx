import { FC } from 'react';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useHabboWay } from '../../../hooks';
import { HabboWayQuizView } from './HabboWayQuizView';
import { HabboWayView } from './HabboWayView';
import { SafetyBookletView } from './SafetyBookletView';

/** The Habbo Way, the safety booklet and their quiz (AIR HabboHelp showHabboWay / openSafetyBooklet). */
export const HabboWayWindowsView: FC = () => {
    const { habboWayPage, setHabboWayPage, bookletPage, setBookletPage, quiz, startQuiz, selectAnswer, moveQuestion, reviewQuiz, closeQuiz } = useHabboWay();

    return (
        <NativeTextTree>
            <>
                {habboWayPage >= 0 && <HabboWayView page={habboWayPage} setPage={setHabboWayPage} startQuiz={startQuiz} />}
                {bookletPage >= 0 && <SafetyBookletView page={bookletPage} setPage={setBookletPage} startQuiz={startQuiz} />}
                {quiz && <HabboWayQuizView closeQuiz={closeQuiz} moveQuestion={moveQuestion} quiz={quiz} reviewQuiz={reviewQuiz} selectAnswer={selectAnswer} />}
            </>
        </NativeTextTree>
    );
};
