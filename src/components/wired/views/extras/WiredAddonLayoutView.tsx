import { WIRED_FX_CATEGORY, WiredAddonLayoutCode } from '../../../../api';
import { WiredChestCurrencyView } from './WiredChestCurrencyView';
import { WiredChestFurniView } from './WiredChestFurniView';
import { WiredContractPaymentView } from './WiredContractPaymentView';
import { WiredContractRewardView } from './WiredContractRewardView';
import { WiredContractTradeView } from './WiredContractTradeView';
import { WiredCustomContractView } from './WiredCustomContractView';
import { WiredExtraAchievementEnablerView } from './WiredExtraAchievementEnablerView';
import { WiredExtraAnimationTimeView } from './WiredExtraAnimationTimeView';
import { WiredExtraArrayCaptureView } from './WiredExtraArrayCaptureView';
import { WiredExtraChestItemTypeScannerView } from './WiredExtraChestItemTypeScannerView';
import { WiredExtraExecuteInOrderView } from './WiredExtraExecuteInOrderView';
import { WiredExtraExecutionLimitView } from './WiredExtraExecutionLimitView';
import { WiredExtraFilterFurniByVariableView } from './WiredExtraFilterFurniByVariableView';
import { WiredExtraFilterFurniView } from './WiredExtraFilterFurniView';
import { WiredExtraFilterUserView } from './WiredExtraFilterUserView';
import { WiredExtraFilterUsersByVariableView } from './WiredExtraFilterUsersByVariableView';
import { WiredExtraGlobalPlaceholderView } from './WiredExtraGlobalPlaceholderView';
import { WiredExtraMoveCarryUsersView } from './WiredExtraMoveCarryUsersView';
import { WiredExtraMoveNoAnimationView } from './WiredExtraMoveNoAnimationView';
import { WiredExtraMovePhysicsView } from './WiredExtraMovePhysicsView';
import { WiredExtraLinkSpeakerView } from './WiredExtraLinkSpeakerView';
import { WiredExtraMovementCurveView } from './WiredExtraMovementCurveView';
import { WiredExtraOrEvalView } from './WiredExtraOrEvalView';
import { WiredExtraProjectileView } from './WiredExtraProjectileView';
import { WiredExtraRandomView } from './WiredExtraRandomView';
import { WiredExtraTextInputVariableView } from './WiredExtraTextInputVariableView';
import { WiredExtraTextOutputFurniNameView } from './WiredExtraTextOutputFurniNameView';
import { WiredExtraTextOutputUsernameView } from './WiredExtraTextOutputUsernameView';
import { WiredExtraTextOutputVariableView } from './WiredExtraTextOutputVariableView';
import { WiredExtraTimeUtilitiesView } from './WiredExtraTimeUtilitiesView';
import { WiredExtraUnseenView } from './WiredExtraUnseenView';
import { WiredExtraVariableAddonImportView, WiredExtraVariableAddonShareView } from './WiredExtraVariableAddonSharingView';
import { WiredExtraVariableFxView } from './WiredExtraVariableFxView';
import { WiredExtraVariableLeaderboardView } from './WiredExtraVariableLeaderboardView';
import { WiredExtraVariableLevelUpSystemView } from './WiredExtraVariableLevelUpSystemView';
import { WiredExtraVariableTextConnectorView } from './WiredExtraVariableTextConnectorView';
import { WiredExtraVariableWebApiView } from './WiredExtraVariableWebApiView';

/** The editor of an addon, by its official addon code. */
export const WiredAddonLayoutView = (code: number) =>
{
    switch(code)
    {
        case WiredAddonLayoutCode.CONDITION_EVALUATION:
            return <WiredExtraOrEvalView />;
        case WiredAddonLayoutCode.RANDOM:
            return <WiredExtraRandomView />;
        case WiredAddonLayoutCode.UNSEEN:
            return <WiredExtraUnseenView />;
        case WiredAddonLayoutCode.EXECUTION_LIMIT:
            return <WiredExtraExecutionLimitView />;
        case WiredAddonLayoutCode.NO_MOVE_ANIMATION:
            return <WiredExtraMoveNoAnimationView />;
        case WiredAddonLayoutCode.MOVE_PHYSICS:
            return <WiredExtraMovePhysicsView />;
        case WiredAddonLayoutCode.CARRY_USERS:
            return <WiredExtraMoveCarryUsersView />;
        case WiredAddonLayoutCode.ANIMATION_TIME:
            return <WiredExtraAnimationTimeView />;
        case WiredAddonLayoutCode.FURNI_SELECTOR_FILTER:
            return <WiredExtraFilterFurniView />;
        case WiredAddonLayoutCode.USER_SELECTOR_FILTER:
            return <WiredExtraFilterUserView />;
        case WiredAddonLayoutCode.FURNI_VARIABLE_FILTER:
            return <WiredExtraFilterFurniByVariableView />;
        case WiredAddonLayoutCode.USER_VARIABLE_FILTER:
            return <WiredExtraFilterUsersByVariableView />;
        case WiredAddonLayoutCode.USERNAME_PLACEHOLDER:
            return <WiredExtraTextOutputUsernameView />;
        case WiredAddonLayoutCode.VARIABLE_PLACEHOLDER:
            return <WiredExtraTextOutputVariableView />;
        case WiredAddonLayoutCode.VARIABLE_CAPTURER:
            return <WiredExtraTextInputVariableView />;
        case WiredAddonLayoutCode.EXECUTE_IN_ORDER:
            return <WiredExtraExecuteInOrderView />;
        case WiredAddonLayoutCode.CHEST_ITEM_TYPE_SCANNER:
            return <WiredExtraChestItemTypeScannerView />;
        case WiredAddonLayoutCode.FURNI_NAME_PLACEHOLDER:
            return <WiredExtraTextOutputFurniNameView />;
        case WiredAddonLayoutCode.CUSTOM_CONTRACT:
            return <WiredCustomContractView />;
        case WiredAddonLayoutCode.PROJECTILE:
            return <WiredExtraProjectileView />;
        case WiredAddonLayoutCode.VARIABLE_TEXT_CONVERTER:
            return <WiredExtraVariableTextConnectorView />;
        case WiredAddonLayoutCode.VARIABLE_LEVEL_UP:
            return <WiredExtraVariableLevelUpSystemView />;
        case WiredAddonLayoutCode.VARIABLE_TIME_UTIL:
            return <WiredExtraTimeUtilitiesView />;
        case WiredAddonLayoutCode.VARIABLE_ADDON_SHARE:
            return <WiredExtraVariableAddonShareView />;
        case WiredAddonLayoutCode.VARIABLE_ADDON_IMPORT:
            return <WiredExtraVariableAddonImportView />;
        case WiredAddonLayoutCode.VARIABLE_LEADERBOARD:
            return <WiredExtraVariableLeaderboardView />;
        case WiredAddonLayoutCode.VARIABLE_FX_HEALTH_POINTS:
            return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.HEALTH_POINTS} />;
        case WiredAddonLayoutCode.VARIABLE_FX_PROGRESS_BAR:
            return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />;
        case WiredAddonLayoutCode.VARIABLE_FX_LEVELLING_PROGRESS:
            return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.LEVELLING_PROGRESS} />;
        case WiredAddonLayoutCode.VARIABLE_FX_STATUS_BAR:
            return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.STATUS_BAR} />;
        case WiredAddonLayoutCode.VARIABLE_FX_BOSS_BAR:
            return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.BOSS_BAR} />;
        case WiredAddonLayoutCode.VARIABLE_FX_NUMBER_DISPLAY:
            return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.NUMBER_DISPLAY} />;
        case WiredAddonLayoutCode.GLOBAL_PLACEHOLDER:
            return <WiredExtraGlobalPlaceholderView />;
        case WiredAddonLayoutCode.ACHIEVEMENT_ENABLER:
            return <WiredExtraAchievementEnablerView />;
        case WiredAddonLayoutCode.VARIABLES_WEB_API:
            return <WiredExtraVariableWebApiView />;
        case WiredAddonLayoutCode.LINK_SPEAKER:
            return <WiredExtraLinkSpeakerView />;
        case WiredAddonLayoutCode.MOVEMENT_CURVE:
            return <WiredExtraMovementCurveView />;
        case WiredAddonLayoutCode.CURRENCY_CHEST:
            return <WiredChestCurrencyView />;
        case WiredAddonLayoutCode.FURNI_CHEST:
            return <WiredChestFurniView />;
        case WiredAddonLayoutCode.CONTRACT_PAYMENT:
            return <WiredContractPaymentView />;
        case WiredAddonLayoutCode.CONTRACT_REWARD:
            return <WiredContractRewardView />;
        case WiredAddonLayoutCode.CONTRACT_TRADE:
            return <WiredContractTradeView />;
        case WiredAddonLayoutCode.ARRAY_CAPTURE_VARIABLE:
            return <WiredExtraArrayCaptureView />;
    }

    return null;
};
