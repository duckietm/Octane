import type { IHotelViewLandingSlot } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { WidgetErrorBoundary } from '../../../common/error-boundary/WidgetErrorBoundary';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { HotelViewBonusRareWidget } from './HotelViewBonusRareWidget';
import { HotelViewCommunityGoalWidget } from './HotelViewCommunityGoalWidget';
import { HotelViewCompetitionPrizesWidget } from './HotelViewCompetitionPrizesWidget';
import { HotelViewConcurrentUsersWidget } from './HotelViewConcurrentUsersWidget';
import { HotelViewDailyQuestWidget } from './HotelViewDailyQuestWidget';
import { HotelViewHallOfFameWidget } from './HotelViewHallOfFameWidget';
import { HotelViewNextLimitedRareWidget } from './HotelViewNextLimitedRareWidget';
import { HotelViewPromoArticleWidget } from './HotelViewPromoArticleWidget';

/** The switches of the slot config that pick the live widget over the staff's own texts. */
export interface HotelViewLiveSlotConfig {
    useServerLTD?: boolean;
    useServerBonusRare?: boolean;
    useServerGoal?: boolean;
    useServerQuest?: boolean;
    badgeCode?: string;
    /** The goal code of the competition hall of fame; empty = the client schedule or the active goal. */
    goalCode?: string;
}

interface HotelViewLiveSlotViewProps {
    slot: IHotelViewLandingSlot;
    config: HotelViewLiveSlotConfig;
    /** The slot as the staff configured it: shown while (or when) the server has nothing live. */
    fallback: ReactNode;
    onLink: (link: string) => void;
}

/**
 * The live AIR landing view widgets (LandingViewWidgetType) inside the admin-edited slots: the
 * type picks the widget, the server packets feed it, and the slot's own title / body / button stay
 * the fallback, so a hotel without the server feature keeps its static slot.
 */
export const HotelViewLiveSlotView: FC<HotelViewLiveSlotViewProps> = ({ slot, config, fallback, onLink }) => {
    const content = (() => {
        switch (slot.type) {
            case 'promoarticle':
                return <HotelViewPromoArticleWidget fallback={fallback} />;
            case 'bonus':
                if (config.useServerBonusRare === false) return fallback;

                return <HotelViewBonusRareWidget fallback={fallback} buttonText={slot.buttonText} link={slot.link} showPreview={!slot.imageUrl} onLink={onLink} />;
            case 'communitygoal':
                if (config.useServerGoal !== true) return fallback;

                return <HotelViewCommunityGoalWidget mode="goal" fallback={fallback} title={slot.title} body={slot.body} link={slot.link} onLink={onLink} />;
            case 'communitygoalvsmode':
                return <HotelViewCommunityGoalWidget mode="vs" fallback={fallback} title={slot.title} body={slot.body} link={slot.link} onLink={onLink} />;
            case 'communitygoalvsmodevote':
                return <HotelViewCommunityGoalWidget mode="vsvote" fallback={fallback} title={slot.title} body={slot.body} link={slot.link} onLink={onLink} />;
            case 'concurrentusersgoal':
                return <HotelViewConcurrentUsersWidget fallback={fallback} badgeCode={config.badgeCode ?? ''} />;
            case 'nextlimitedrarecountdown':
                if (config.useServerLTD === false) return fallback;

                return <HotelViewNextLimitedRareWidget fallback={fallback} title={slot.title} body={slot.body} />;
            case 'dailyquest':
                if (config.useServerQuest === false) return fallback;

                return <HotelViewDailyQuestWidget fallback={fallback} />;
            case 'achievementcompetition_hall_of_fame':
                return <HotelViewHallOfFameWidget fallback={fallback} title={slot.title} goalCode={config.goalCode?.trim() ?? ''} />;
            case 'achievementcompetition_prizes':
                return <HotelViewCompetitionPrizesWidget fallback={fallback} />;
            default:
                return fallback;
        }
    })();

    return (
        <NativeTextTree>
            <WidgetErrorBoundary name={`HotelViewSlot-${slot.type}`} fallback={fallback}>
                {content}
            </WidgetErrorBoundary>
        </NativeTextTree>
    );
};

