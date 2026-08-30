import { WiredConditionlayout } from '../../../../api';
import { WiredConditionActorDirView } from './WiredConditionActorDirView';
import { WiredConditionActorHasHandItemView } from './WiredConditionActorHasHandItem';
import { WiredConditionActorIsGroupMemberView } from './WiredConditionActorIsGroupMemberView';
import { WiredConditionActorIsOnFurniView } from './WiredConditionActorIsOnFurniView';
import { WiredConditionActorIsTeamMemberView } from './WiredConditionActorIsTeamMemberView';
import { WiredConditionActorIsWearingBadgeView } from './WiredConditionActorIsWearingBadgeView';
import { WiredConditionActorIsWearingEffectView } from './WiredConditionActorIsWearingEffectView';
import { WiredConditionChestHasItemsView } from './WiredConditionChestHasItemsView';
import { WiredConditionChestHasItemTypeView } from './WiredConditionChestHasItemTypeView';
import { WiredConditionCounterTimeMatchesView } from './WiredConditionCounterTimeMatchesView';
import { WiredConditionDateRangeView } from './WiredConditionDateRangeView';
import { WiredConditionFurniHasAvatarOnView } from './WiredConditionFurniHasAvatarOnView';
import { WiredConditionFurniHasFurniOnView } from './WiredConditionFurniHasFurniOnView';
import { WiredConditionFurniHasNotFurniOnView } from './WiredConditionFurniHasNotFurniOnView';
import { WiredConditionFurniIsOfTypeView } from './WiredConditionFurniIsOfTypeView';
import { WiredConditionFurniMatchesSnapshotView } from './WiredConditionFurniMatchesSnapshotView';
import { WiredConditionHasAltitudeView } from './WiredConditionHasAltitudeView';
import { WiredConditionHasVariableView } from './WiredConditionHasVariableView';
import { WiredConditionMatchDateView } from './WiredConditionMatchDateView';
import { WiredConditionMatchTimeView } from './WiredConditionMatchTimeView';
import { WiredConditionMovementValidationView } from './WiredConditionMovementValidationView';
import { WiredConditionNoBattleBanzaiView } from './WiredConditionNoBattleBanzaiView';
import { WiredConditionSelectionQuantityView } from './WiredConditionSelectionQuantityView';
import { WiredConditionTeamHasRankView } from './WiredConditionTeamHasRankView';
import { WiredConditionTeamHasScoreView } from './WiredConditionTeamHasScoreView';
import { WiredConditionTimeElapsedLessView } from './WiredConditionTimeElapsedLessView';
import { WiredConditionTimeElapsedMoreView } from './WiredConditionTimeElapsedMoreView';
import { WiredConditionTriggererMatchView } from './WiredConditionTriggererMatchView';
import { WiredConditionTriggerFurniAdjacentStateView } from './WiredConditionTriggerFurniAdjacentStateView';
import { WiredConditionUserCountInRoomView } from './WiredConditionUserCountInRoomView';
import { WiredConditionUserOnFurniWithStateView } from './WiredConditionUserOnFurniWithStateView';
import { WiredConditionUserPerformsActionView } from './WiredConditionUserPerformsActionView';
import { WiredConditionVariableAgeMatchView } from './WiredConditionVariableAgeMatchView';
import { WiredConditionVariableValueMatchView } from './WiredConditionVariableValueMatchView';

export const WiredConditionLayoutView = (code: number) => {
    switch (code) {
        case WiredConditionlayout.ACTOR_HAS_HANDITEM:
            return <WiredConditionActorHasHandItemView />;
        case WiredConditionlayout.NOT_ACTOR_HAS_HANDITEM:
            return <WiredConditionActorHasHandItemView negative={true} />;
        case WiredConditionlayout.ACTOR_DIR:
            return <WiredConditionActorDirView />;
        case WiredConditionlayout.SLC_QUANTITY:
            return <WiredConditionSelectionQuantityView />;
        case WiredConditionlayout.HAS_VAR:
            return <WiredConditionHasVariableView />;
        case WiredConditionlayout.NEG_HAS_VAR:
            return <WiredConditionHasVariableView negative={true} />;
        case WiredConditionlayout.VAR_VAL_MATCH:
            return <WiredConditionVariableValueMatchView />;
        case WiredConditionlayout.VAR_AGE_MATCH:
            return <WiredConditionVariableAgeMatchView />;
        case WiredConditionlayout.TRIGGERER_MATCH:
            return <WiredConditionTriggererMatchView />;
        case WiredConditionlayout.NOT_TRIGGERER_MATCH:
            return <WiredConditionTriggererMatchView negative={true} />;
        case WiredConditionlayout.ACTOR_IS_GROUP_MEMBER:
            return <WiredConditionActorIsGroupMemberView />;
        case WiredConditionlayout.NOT_ACTOR_IN_GROUP:
            return <WiredConditionActorIsGroupMemberView negative={true} />;
        case WiredConditionlayout.ACTOR_IS_ON_FURNI:
            return <WiredConditionActorIsOnFurniView />;
        case WiredConditionlayout.NOT_ACTOR_ON_FURNI:
            return <WiredConditionActorIsOnFurniView negative={true} />;
        case WiredConditionlayout.ACTOR_IS_IN_TEAM:
            return <WiredConditionActorIsTeamMemberView />;
        case WiredConditionlayout.NOT_ACTOR_IN_TEAM:
            return <WiredConditionActorIsTeamMemberView negative={true} />;
        case WiredConditionlayout.ACTOR_IS_WEARING_BADGE:
            return <WiredConditionActorIsWearingBadgeView />;
        case WiredConditionlayout.NOT_ACTOR_WEARS_BADGE:
            return <WiredConditionActorIsWearingBadgeView negative={true} />;
        case WiredConditionlayout.USER_STATE:
            return <WiredConditionActorIsWearingEffectView showEffect={false} />;
        case WiredConditionlayout.NOT_USER_STATE:
            return <WiredConditionActorIsWearingEffectView negative={true} showEffect={false} />;
        case WiredConditionlayout.USER_AMOUNT:
            return <WiredConditionTeamHasScoreView scoped={false} />;
        case WiredConditionlayout.USER_ATTRIBUTE:
            return <WiredConditionActorIsWearingBadgeView showBadge={false} />;
        case WiredConditionlayout.NOT_USER_ATTRIBUTE:
            return <WiredConditionActorIsWearingBadgeView negative={true} showBadge={false} />;
        case WiredConditionlayout.ACTOR_IS_WEARING_EFFECT:
            return <WiredConditionActorIsWearingEffectView />;
        case WiredConditionlayout.NOT_ACTOR_WEARING_EFFECT:
            return <WiredConditionActorIsWearingEffectView negative={true} />;
        case WiredConditionlayout.DATE_RANGE_ACTIVE:
            return <WiredConditionDateRangeView />;
        case WiredConditionlayout.MOVEMENT_VALIDATION:
            return <WiredConditionMovementValidationView />;
        case WiredConditionlayout.MATCH_TIME:
            return <WiredConditionMatchTimeView />;
        case WiredConditionlayout.MATCH_DATE:
            return <WiredConditionMatchDateView />;
        case WiredConditionlayout.FURNIS_HAVE_AVATARS:
            return <WiredConditionFurniHasAvatarOnView />;
        case WiredConditionlayout.FURNI_NOT_HAVE_HABBO:
            return <WiredConditionFurniHasAvatarOnView negative={true} />;
        case WiredConditionlayout.HAS_STACKED_FURNIS:
            return <WiredConditionFurniHasFurniOnView />;
        case WiredConditionlayout.NOT_HAS_STACKED_FURNIS:
            return <WiredConditionFurniHasNotFurniOnView />;
        case WiredConditionlayout.STUFF_TYPE_MATCHES:
            return <WiredConditionFurniIsOfTypeView />;
        case WiredConditionlayout.NOT_FURNI_IS_OF_TYPE:
            return <WiredConditionFurniIsOfTypeView negative={true} />;
        case WiredConditionlayout.STATES_MATCH:
            return <WiredConditionFurniMatchesSnapshotView />;
        case WiredConditionlayout.NOT_STATES_MATCH:
            return <WiredConditionFurniMatchesSnapshotView negative={true} />;
        case WiredConditionlayout.TIME_ELAPSED_LESS:
            return <WiredConditionTimeElapsedLessView />;
        case WiredConditionlayout.TIME_ELAPSED_MORE:
            return <WiredConditionTimeElapsedMoreView />;
        case WiredConditionlayout.USER_COUNT_IN:
        case WiredConditionlayout.NOT_USER_COUNT_IN:
            return <WiredConditionUserCountInRoomView />;
        case WiredConditionlayout.COUNTER_TIME_MATCHES:
            return <WiredConditionCounterTimeMatchesView />;
        case WiredConditionlayout.USER_PERFORMS_ACTION:
            return <WiredConditionUserPerformsActionView />;
        case WiredConditionlayout.NOT_USER_PERFORMS_ACTION:
            return <WiredConditionUserPerformsActionView negative={true} />;
        case WiredConditionlayout.HAS_ALTITUDE:
            return <WiredConditionHasAltitudeView />;
        case WiredConditionlayout.TEAM_HAS_SCORE:
            return <WiredConditionTeamHasScoreView />;
        case WiredConditionlayout.TEAM_HAS_RANK:
            return <WiredConditionTeamHasRankView />;
        case WiredConditionlayout.NO_BATTLEBANZAI:
            return <WiredConditionNoBattleBanzaiView />;
        case WiredConditionlayout.USER_ON_FURNI_WITH_STATE:
            return <WiredConditionUserOnFurniWithStateView />;
        case WiredConditionlayout.TRG_FURNI_ADJACENT_STATE:
            return <WiredConditionTriggerFurniAdjacentStateView />;
        case WiredConditionlayout.CHEST_HAS_ITEMS:
            return <WiredConditionChestHasItemsView />;
        case WiredConditionlayout.CHEST_HAS_ITEM_TYPE:
            return <WiredConditionChestHasItemTypeView />;
    }

    return null;
};
