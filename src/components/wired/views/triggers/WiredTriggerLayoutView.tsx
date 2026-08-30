import { WiredTriggerLayout } from '../../../../api';
import { WiredTriggerAvatarEnterRoomView } from './WiredTriggerAvatarEnterRoomView';
import { WiredTriggerAvatarLeaveRoomView } from './WiredTriggerAvatarLeaveRoomView';
import { WiredTriggerAvatarSaysSomethingView } from './WiredTriggerAvatarSaysSomethingView';
import { WiredTriggerAvatarWalksOffFurniView } from './WiredTriggerAvatarWalksOffFurniView';
import { WiredTriggerAvatarWalksOnFurniView } from './WiredTriggerAvatarWalksOnFurni';
import { WiredTriggerBotReachedAvatarView } from './WiredTriggerBotReachedAvatarView';
import { WiredTriggerBotReachedStuffView } from './WiredTriggerBotReachedStuffView';
import { WiredTriggerClickFurniView } from './WiredTriggerClickFurniView';
import { WiredTriggerClickTileView } from './WiredTriggerClickTileView';
import { WiredTriggerClickUserView } from './WiredTriggerClickUserView';
import { WiredTriggerClockCounterView } from './WiredTriggerClockCounterView';
import { WiredTriggerCollisionView } from './WiredTriggerCollisionView';
import { WiredTriggerDiceRolledView } from './WiredTriggerDiceRolledView';
import { WiredTriggeExecuteOnceView } from './WiredTriggerExecuteOnceView';
import { WiredTriggeExecutePeriodicallyLongView } from './WiredTriggerExecutePeriodicallyLongView';
import { WiredTriggeExecutePeriodicallyShortView } from './WiredTriggerExecutePeriodicallyShortView';
import { WiredTriggeExecutePeriodicallyView } from './WiredTriggerExecutePeriodicallyView';
import { WiredTriggerGameEndsView } from './WiredTriggerGameEndsView';
import { WiredTriggerGameStartsView } from './WiredTriggerGameStartsView';
import { WiredTriggerPressKeybindView } from './WiredTriggerPressKeybindView';
import { WiredTriggerReceiveSignalView } from './WiredTriggerReceiveSignalView';
import { WiredTriggeScoreAchievedView } from './WiredTriggerScoreAchievedView';
import { WiredTriggerToggleFurniView } from './WiredTriggerToggleFurniView';
import { WiredTriggerTransactionCompleteView } from './WiredTriggerTransactionCompleteView';
import { WiredTriggerTransactionFailView } from './WiredTriggerTransactionFailView';
import { WiredTriggerUserGetsHandItemView } from './WiredTriggerUserGetsHandItemView';
import { WiredTriggerUserPerformsActionView } from './WiredTriggerUserPerformsActionView';
import { WiredTriggerVariableChangedView } from './WiredTriggerVariableChangedView';

export const WiredTriggerLayoutView = (code: number) => {
    switch (code) {
        case WiredTriggerLayout.AVATAR_ENTERS_ROOM:
            return <WiredTriggerAvatarEnterRoomView />;
        case WiredTriggerLayout.AVATAR_LEAVES_ROOM:
            return <WiredTriggerAvatarLeaveRoomView />;
        case WiredTriggerLayout.AVATAR_SAYS_SOMETHING:
            return <WiredTriggerAvatarSaysSomethingView />;
        case WiredTriggerLayout.AVATAR_WALKS_OFF_FURNI:
            return <WiredTriggerAvatarWalksOffFurniView />;
        case WiredTriggerLayout.AVATAR_WALKS_ON_FURNI:
            return <WiredTriggerAvatarWalksOnFurniView />;
        case WiredTriggerLayout.BOT_REACHED_AVATAR:
            return <WiredTriggerBotReachedAvatarView />;
        case WiredTriggerLayout.BOT_REACHED_STUFF:
            return <WiredTriggerBotReachedStuffView />;
        case WiredTriggerLayout.CLICK_FURNI:
            return <WiredTriggerClickFurniView />;
        case WiredTriggerLayout.CLICK_TILE:
            return <WiredTriggerClickTileView />;
        case WiredTriggerLayout.CLICK_USER:
            return <WiredTriggerClickUserView />;
        case WiredTriggerLayout.CLOCK_COUNTER:
            return <WiredTriggerClockCounterView />;
        case WiredTriggerLayout.VARIABLE_CHANGED:
            return <WiredTriggerVariableChangedView />;
        case WiredTriggerLayout.USER_PERFORMS_ACTION:
            return <WiredTriggerUserPerformsActionView />;
        case WiredTriggerLayout.COLLISION:
            return <WiredTriggerCollisionView />;
        case WiredTriggerLayout.EXECUTE_ONCE:
            return <WiredTriggeExecuteOnceView />;
        case WiredTriggerLayout.EXECUTE_PERIODICALLY:
            return <WiredTriggeExecutePeriodicallyView />;
        case WiredTriggerLayout.EXECUTE_PERIODICALLY_SHORT:
            return <WiredTriggeExecutePeriodicallyShortView />;
        case WiredTriggerLayout.EXECUTE_PERIODICALLY_LONG:
            return <WiredTriggeExecutePeriodicallyLongView />;
        case WiredTriggerLayout.GAME_ENDS:
            return <WiredTriggerGameEndsView />;
        case WiredTriggerLayout.TEAM_GAME_RESULT:
        case WiredTriggerLayout.GAME_STARTS:
            return <WiredTriggerGameStartsView />;
        case WiredTriggerLayout.SCORE_ACHIEVED:
            return <WiredTriggeScoreAchievedView />;
        case WiredTriggerLayout.TOGGLE_FURNI:
            return <WiredTriggerToggleFurniView />;
        case WiredTriggerLayout.RECEIVE_SIGNAL:
            return <WiredTriggerReceiveSignalView />;
        case WiredTriggerLayout.USER_GETS_HANDITEM:
            return <WiredTriggerUserGetsHandItemView />;
        case WiredTriggerLayout.DICE_ROLLED:
            return <WiredTriggerDiceRolledView />;
        case WiredTriggerLayout.PRESS_KEYBIND:
            return <WiredTriggerPressKeybindView />;
        case WiredTriggerLayout.TRANSACTION_COMPLETE:
            return <WiredTriggerTransactionCompleteView />;
        case WiredTriggerLayout.TRANSACTION_FAIL:
            return <WiredTriggerTransactionFailView />;
    }

    return null;
};
