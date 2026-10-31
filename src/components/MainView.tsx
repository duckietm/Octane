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
import { BadgeCreatorView } from './badge-creator';
import { BadgeLeaderboardView } from './badge-leaderboard/BadgeLeaderboardView';
import { CameraWidgetView } from './camera/CameraWidgetView';
import { CampaignView } from './campaign/CampaignView';
import { CatalogView } from './catalog/CatalogView';
import { SpecialItemsDisplayView } from './catalog/special-items/SpecialItemsDisplayView';
import { ChatHistoryView } from './chat-history/ChatHistoryView';
import { CollectiblesHubView } from './collectibles/CollectiblesHubView';
import { CollectiblesRewardBoxView } from './collectibles/CollectiblesRewardBoxView';
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
import { HcCenterView } from './hc-center/HcCenterView';
import { HelpView } from './help/HelpView';
import { HotelView } from './hotel-view/HotelView';
import { HousekeepingView } from './housekeeping/HousekeepingView';
import { InventoryView } from './inventory/InventoryView';
import { MentionsView } from './mentions';
import { ModToolsView } from './mod-tools/ModToolsView';
import { NavigatorView } from './navigator/NavigatorView';
import { NuxView } from './nux/NuxView';
import { OctanebubbleHiddenView } from './octanebubblehidden/OctanebubbleHiddenView';
import { OctanepediaView } from './octanepedia/OctanepediaView';
import { ExternalPluginLoader } from './plugins/ExternalPluginLoader';
import { DailyTasksView, NextQuestTimerView, QuestCompletedView, QuestsView, QuestTrackerView, RewardTrackView, SeasonalCalendarView } from './quests';
import { RadioView } from './radio/RadioView';
import { RareValuesView } from './rare-values/RareValuesView';
import { RightSideView } from './right-side/RightSideView';
import { RoomView } from './room/RoomView';
import { RoomQueueWidgetView } from './room/widgets/room-queue/RoomQueueWidgetView';
import { SoundboardView } from './soundboard/SoundboardView';
import { TalentView } from './talent/TalentView';
import { ToolbarView } from './toolbar/ToolbarView';
import { WidgetErrorBoundary } from '../common/error-boundary/WidgetErrorBoundary';
import { TranslationBootstrap } from './translation/TranslationBootstrap';
import { TranslationSettingsView } from './translation/TranslationSettingsView';
import { TraxEditorView } from './trax-editor/TraxEditorView';
import { UserProfileView } from './user-profile/UserProfileView';
import { UserAccountSettingsView } from './user-settings/UserAccountSettingsView';
import { UserSettingsView } from './user-settings/UserSettingsView';
import { VariablesExplorerView } from './variables-explorer/VariablesExplorerView';
import { VaultView } from './vault/VaultView';
import { WiredView } from './wired/WiredView';
import { WiredCreatorToolsView } from './wired-tools/WiredCreatorToolsView';
import { NativeTextTree } from '../common/native-text/NativeTextTree';

export const MainView: FC<{}> = (props) =>
{
    const [isReady, setIsReady] = useState(false);
    const [localizationVersion, setLocalizationVersion] = useState(0);
    const [mentionsVisible, setMentionsVisible] = useState(false);

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
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1])
                {
                    case 'show':
                        setMentionsVisible(true);
                        return;
                    case 'hide':
                        setMentionsVisible(false);
                        return;
                    case 'toggle':
                        setMentionsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'mentions/'
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
        <NativeTextTree>
            <>
                <div className="hidden" data-localization-version={localizationVersion} />
                <AnimatePresence>
                    {landingViewVisible && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <WidgetErrorBoundary name="HotelView">
                                <HotelView />
                            </WidgetErrorBoundary>
                        </motion.div>
                    )}
                </AnimatePresence>
                <WidgetErrorBoundary name="ToolbarView"><ToolbarView isInRoom={!landingViewVisible} /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="TranslationBootstrap">
                    <TranslationBootstrap />
                </WidgetErrorBoundary>
                <WidgetErrorBoundary name="GoogleAdsView"><GoogleAdsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="ModToolsView"><ModToolsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="HousekeepingView"><HousekeepingView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="WiredCreatorToolsView"><WiredCreatorToolsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="VariablesExplorerView"><VariablesExplorerView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="RoomView"><RoomView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="RoomQueueWidgetView"><RoomQueueWidgetView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="ChatHistoryView"><ChatHistoryView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="CustomizeNickIconView"><CustomizeNickIconView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="WiredView"><WiredView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="AvatarEditorView"><AvatarEditorView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="BadgeCreatorView"><BadgeCreatorView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="BadgeLeaderboardView"><BadgeLeaderboardView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="EmuStatsView"><EmuStatsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="AchievementsView"><AchievementsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="HabbiconHubView"><HabbiconHubView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="NavigatorView"><NavigatorView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="OctanebubbleHiddenView"><OctanebubbleHiddenView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="InventoryView"><InventoryView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="CatalogView"><CatalogView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="SpecialItemsDisplayView"><SpecialItemsDisplayView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="CollectiblesHubView"><CollectiblesHubView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="CollectiblesRewardBoxView"><CollectiblesRewardBoxView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="FriendsView"><FriendsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="RightSideView"><RightSideView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="UserSettingsView"><UserSettingsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="UserAccountSettingsView"><UserAccountSettingsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="DiscordSettingsView"><DiscordSettingsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="VaultView"><VaultView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="QuestsView"><QuestsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="SeasonalCalendarView"><SeasonalCalendarView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="QuestTrackerView"><QuestTrackerView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="NextQuestTimerView"><NextQuestTimerView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="QuestCompletedView"><QuestCompletedView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="DailyTasksView"><DailyTasksView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="RewardTrackView"><RewardTrackView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="TranslationSettingsView"><TranslationSettingsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="UserProfileView"><UserProfileView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="GroupsView"><GroupsView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="GroupForumView"><GroupForumView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="CameraWidgetView"><CameraWidgetView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="HelpView"><HelpView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="TalentView"><TalentView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="NuxView"><NuxView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="OctanepediaView"><OctanepediaView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="GuideToolView"><GuideToolView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="HcCenterView"><HcCenterView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="CampaignView"><CampaignView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="GameCenterView"><GameCenterView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="SnowWarView"><SnowWarView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="FloorplanEditorView"><FloorplanEditorView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="FurniEditorView"><FurniEditorView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="RareValuesView"><RareValuesView /></WidgetErrorBoundary>
                {GetConfigurationValue<boolean>('toolbar.fortunewheel.enabled', true) && (
                    <WidgetErrorBoundary name="FortuneWheelView">
                        <FortuneWheelView />
                    </WidgetErrorBoundary>
                )}
                <WidgetErrorBoundary name="SoundboardView"><SoundboardView /></WidgetErrorBoundary>
                <WidgetErrorBoundary name="TraxEditorView"><TraxEditorView /></WidgetErrorBoundary>
                {GetConfigurationValue<boolean>('radio_ui.enabled', false) && !IsTouchDevice() && (
                    <WidgetErrorBoundary name="RadioView">
                        <RadioView />
                    </WidgetErrorBoundary>
                )}
                {GetConfigurationValue<boolean>('mentions_ui.enabled', true) && mentionsVisible && (
                    <WidgetErrorBoundary name="MentionsView">
                        <MentionsView onClose={() => setMentionsVisible(false)} />
                    </WidgetErrorBoundary>
                )}
                <WidgetErrorBoundary name="ExternalPluginLoader">
                    <ExternalPluginLoader />
                </WidgetErrorBoundary>
            </>
        </NativeTextTree>
    );
};
