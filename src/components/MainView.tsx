import { HabbiconHubView } from './room/widgets/chat-input/HabbiconHubView';
import {
    AddLinkEventTracker,
    GetCommunication,
    GetRoomSessionManager,
    HabboWebTools,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomSessionEvent
} from '@octane/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, IsTouchDevice } from '../api';
import { useMentionMessages, useOctaneEventReducer } from '../hooks';
import { AchievementsView } from './achievements/AchievementsView';
import { GoogleAdsView } from './ads/GoogleAdsView';
import { AvatarEditorView } from './avatar-editor';
import { AvatarEffectsView } from './avatar-effects';
import { BadgeCreatorView } from './badge-creator';
import { BadgeLeaderboardView } from './badge-leaderboard/BadgeLeaderboardView';
import { CameraWidgetView } from './camera/CameraWidgetView';
import { CampaignView } from './campaign/CampaignView';
import { CatalogView } from './catalog/CatalogView';
import { ChatHistoryView } from './chat-history/ChatHistoryView';
import { CustomizeNickIconView } from './customize/CustomizeNickIconView';
import { DiscordSettingsView } from './discord/DiscordSettingsView';
import { EmuStatsView } from './emustats/EmuStatsView';
import { FloorplanEditorView } from './floorplan-editor/FloorplanEditorView';
import { FortuneWheelView } from './fortune-wheel/FortuneWheelView';
import { FriendsView } from './friends/FriendsView';
import { FurniEditorView } from './furni-editor/FurniEditorView';
import { GameCenterView } from './game-center/GameCenterView';
import { SnowWarView } from './game-center/views/snowwar/SnowWarView';
import { GroupsView } from './groups/GroupsView';
import { GroupForumView } from './groups/views/forums/GroupForumView';
import { GuideToolView } from './guide-tool/GuideToolView';
import { ChatReviewReporterFeedbackView } from './guide-tool/views/ChatReviewReporterFeedbackView';
import { HcCenterView } from './hc-center/HcCenterView';
import { VipBenefitsView } from './hc-center/VipBenefitsView';
import { HelpView } from './help/HelpView';
import { HotelView } from './hotel-view/HotelView';
import { HousekeepingView } from './housekeeping/HousekeepingView';
import { InventoryView } from './inventory/InventoryView';
import { ModToolsView } from './mod-tools/ModToolsView';
import { NavigatorView } from './navigator/NavigatorView';
import { NuxView } from './nux/NuxView';
import { OctanebubbleHiddenView } from './octanebubblehidden/OctanebubbleHiddenView';
import { OctanepediaView } from './octanepedia/OctanepediaView';
import { ExternalPluginLoader } from './plugins/ExternalPluginLoader';
import { RadioView } from './radio/RadioView';
import { RareValuesView } from './rare-values/RareValuesView';
import { SelfDonationToolView } from './wired-tools/SelfDonationToolView';
import { RightSideView } from './right-side/RightSideView';
import { RoomQueueView } from './room/RoomQueueView';
import { RoomView } from './room/RoomView';
import { SoundboardView } from './soundboard/SoundboardView';
import { CitizenshipWelcomeView, TalentLevelUpView, TalentTrackView } from './talent';
import { ToolbarView } from './toolbar/ToolbarView';
import { TranslationBootstrap } from './translation/TranslationBootstrap';
import { TranslationSettingsView } from './translation/TranslationSettingsView';
import { TraxEditorView } from './trax-editor/TraxEditorView';
import { UserProfileView } from './user-profile/UserProfileView';
import { UserAccountSettingsView } from './user-settings/UserAccountSettingsView';
import { WordFilterSettingsView } from './user-settings/wordfilter/WordFilterSettingsView';
import { UserSettingsView } from './user-settings/UserSettingsView';
import { VaultView } from './vault/VaultView';
import { DailyTasksView, QuestCompletedView, QuestsView, QuestTrackerView, RewardTrackView } from './quests';
import { WiredView } from './wired/WiredView';
import { WiredCreatorToolsView } from './wired-tools/WiredCreatorToolsView';

export const MainView: FC<{}> = (props) =>
{
    const [isReady, setIsReady] = useState(false);
    const [localizationVersion, setLocalizationVersion] = useState(0);

    useMentionMessages();

    const { landingViewVisible } = useOctaneEventReducer<{ sessionId: number | null; landingViewVisible: boolean }, RoomSessionEvent>(
        [RoomSessionEvent.CREATED, RoomSessionEvent.ENDED],
        (state, event) =>
        {
            if (event.type === RoomSessionEvent.CREATED)
            {
                return { sessionId: event.session.roomId, landingViewVisible: false };
            }

            if (state.sessionId !== null && event.session.roomId !== state.sessionId)
            {
                return state;
            }

            return { sessionId: null, landingViewVisible: event.openLandingView };
        },
        { sessionId: null, landingViewVisible: true }
    );

    useEffect(() =>
    {
        setIsReady(true);

        GetRoomSessionManager().tryRestoreSession();

        GetCommunication().connection.ready();
    }, []);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1])
                {
                    case 'open':
                        if (parts.length > 2)
                        {
                            switch (parts[2])
                            {
                                case 'credits':
                                    //HabboWebTools.openWebPageAndMinimizeClient(this._windowManager.getProperty(ExternalVariables.WEB_SHOP_RELATIVE_URL));
                                    break;
                                default: {
                                    const name = parts[2];
                                    HabboWebTools.openHabblet(name);
                                }
                            }
                        }
                        return;
                }
            },
            eventUrlPrefix: 'habblet/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() =>
    {
        const refreshLocalization = () => setLocalizationVersion((value) => value + 1);

        window.addEventListener('octane-localization-updated', refreshLocalization);

        return () => window.removeEventListener('octane-localization-updated', refreshLocalization);
    }, []);

    return (
        <>
            <div className="hidden" data-localization-version={localizationVersion} />
            <AnimatePresence>
                {landingViewVisible && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <HotelView />
                    </motion.div>
                )}
            </AnimatePresence>
            <ToolbarView isInRoom={!landingViewVisible} />
            <TranslationBootstrap />
            <GoogleAdsView />
            <ModToolsView />
            <HousekeepingView />
            <WiredCreatorToolsView />
            <RoomView />
            <RoomQueueView />
            <ChatHistoryView />
            <CustomizeNickIconView />
            <WiredView />
            <AvatarEditorView />
            <BadgeCreatorView />
            <BadgeLeaderboardView />
            <EmuStatsView />
            <AvatarEffectsView />
            <AchievementsView />
            <HabbiconHubView />
            <NavigatorView />
            <OctanebubbleHiddenView />
            <InventoryView />
            <CatalogView />
            <FriendsView />
            <RightSideView />
            <UserSettingsView />
            <UserAccountSettingsView />
            <WordFilterSettingsView />
            <DiscordSettingsView />
            <VaultView />
            <QuestsView />
            <QuestTrackerView />
            <QuestCompletedView />
            <DailyTasksView />
            <RewardTrackView />
            <TranslationSettingsView />
            <UserProfileView />
            <GroupsView />
            <GroupForumView />
            <CameraWidgetView />
            <HelpView />
            <NuxView />
            <OctanepediaView />
            <GuideToolView />
            <ChatReviewReporterFeedbackView />
            <HcCenterView />
            <VipBenefitsView />
            <CampaignView />
            <GameCenterView />
            <SnowWarView />
            <FloorplanEditorView />
            <FurniEditorView />
            <RareValuesView />
            <SelfDonationToolView />
            <FortuneWheelView />
            <SoundboardView />
            <TalentTrackView />
            <TalentLevelUpView />
            <CitizenshipWelcomeView />
            <TraxEditorView />
            {GetConfigurationValue<boolean>('radio_ui.enabled', false) && !IsTouchDevice() && <RadioView />}
            <ExternalPluginLoader />
        </>
    );
};
