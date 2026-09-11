import {
    AchievementData,
    AchievementEvent,
    AchievementsEvent,
    AchievementsScoreEvent,
    AuthenticatedEvent,
    RequestAchievementsMessageComposer,
    RoomSessionEvent,
    WiredEnvironmentEvent
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { AchievementCategory, AchievementUtilities, GetOptionalConfigurationValue, SendMessageComposer } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';

const copyAchievement = (achievement: AchievementData): AchievementData => Object.assign(Object.create(AchievementData.prototype), achievement);

const useAchievementsState = () => {
    const [achievements, setAchievements] = useState<AchievementData[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(null);
    const [selectedAchievementId, setSelectedAchievementId] = useState(-1);
    const [achievementScore, setAchievementScore] = useState(0);
    const [enabledWiredAchievements, setEnabledWiredAchievements] = useState<string[]>([]);
    const pendingLevel = useRef<{ achievement: AchievementData; timeout: ReturnType<typeof setTimeout> }>(null);

    const achievementCategories = useMemo(() => {
        const categories = new Map<string, AchievementCategory>();
        const archive = new AchievementCategory('archive');
        const wiredGames = new AchievementCategory('wired_games');
        const newAchievements = new AchievementCategory('new');
        const newCodes = GetOptionalConfigurationValue<string>('achievements.new', '').split(',');
        categories.set(archive.code, archive);
        categories.set(wiredGames.code, wiredGames);

        for (const achievement of achievements) {
            if (!achievement.category || (achievement.state === AchievementData.STATE_CONTROLLED_BY_WIRED && achievement.category !== 'wired_games')) continue;

            const code = achievement.state === AchievementData.STATE_ARCHIVED ? archive.code : achievement.category;
            if (!categories.has(code)) categories.set(code, new AchievementCategory(code));

            categories.get(code).achievements.push(achievement);
            if (newCodes.includes(achievement.code)) newAchievements.achievements.push(achievement);
        }

        const regular = [...categories.values()].filter((category) => !['archive', 'wired_games', 'misc'].includes(category.code));
        if (categories.has('misc')) regular.push(categories.get('misc'));
        regular.push(archive, wiredGames);
        if (newAchievements.achievements.length) regular.push(newAchievements);

        return regular;
    }, [achievements]);

    const selectedCategory = achievementCategories.find((category) => category.code === selectedCategoryCode) ?? null;
    const visibleAchievements =
        selectedCategory?.achievements.filter(
            (achievement) =>
                selectedCategory.code !== 'wired_games' || (achievement.code.startsWith('WF_') && enabledWiredAchievements.includes(achievement.code.slice(3)))
        ) ?? [];
    const selectedAchievement =
        visibleAchievements.find((achievement) => achievement.achievementId === selectedAchievementId) ?? visibleAchievements[0] ?? null;
    const getTotalUnseen = achievements.filter((achievement) => achievement.unseen && !AchievementUtilities.getAchievementIsIgnored(achievement)).length;
    const getProgress = achievementCategories.reduce((total, category) => total + category.getProgress(), 0);
    const getMaxProgress = achievementCategories.reduce((total, category) => total + category.getMaxProgress(), 0);

    const updateAchievement = useCallback((achievement: AchievementData) => {
        setAchievements((previous) =>
            previous.some((entry) => entry.achievementId === achievement.achievementId)
                ? previous.map((entry) => (entry.achievementId === achievement.achievementId ? achievement : entry))
                : [...previous, achievement]
        );
    }, []);

    const clearUnseen = useCallback((categoryCode?: string) => {
        setAchievements((previous) =>
            previous.map((achievement) => {
                if (
                    !achievement.unseen ||
                    (categoryCode &&
                        achievement.category !== categoryCode &&
                        !(categoryCode === 'archive' && achievement.state === AchievementData.STATE_ARCHIVED))
                )
                    return achievement;

                const seen = copyAchievement(achievement);
                seen.unseen = 0;
                return seen;
            })
        );
    }, []);

    const close = useCallback(() => {
        setIsVisible(false);
        if (pendingLevel.current) pendingLevel.current.achievement.unseen = 0;
        clearUnseen();
    }, [clearUnseen]);

    const selectCategory = useCallback(
        (code: string) => {
            if (!code) clearUnseen(selectedCategoryCode);
            setSelectedCategoryCode(code);
            setSelectedAchievementId(-1);
        },
        [clearUnseen, selectedCategoryCode]
    );

    const show = useCallback(
        (categoryCode?: string) => {
            if (!isLoaded) SendMessageComposer(new RequestAchievementsMessageComposer());
            if (categoryCode) selectCategory(categoryCode);
            setIsVisible(true);
        },
        [isLoaded, selectCategory]
    );

    const clearPendingLevel = useCallback(() => {
        if (pendingLevel.current) clearTimeout(pendingLevel.current.timeout);
        pendingLevel.current = null;
    }, []);

    useMessageEvent<AchievementEvent>(AchievementEvent, (event) => {
        const achievement = event.getParser().achievement;
        const previous = achievements.find((entry) => entry.achievementId === achievement.achievementId);
        achievement.unseen = previous?.unseen || (selectedAchievement?.achievementId !== achievement.achievementId ? 1 : 0);

        if (pendingLevel.current?.achievement.achievementId === achievement.achievementId) {
            pendingLevel.current.achievement = achievement;
            return;
        }

        if (isVisible && selectedAchievement?.achievementId === achievement.achievementId && achievement.level > selectedAchievement.level) {
            if (pendingLevel.current) updateAchievement(pendingLevel.current.achievement);
            clearPendingLevel();
            const completed = copyAchievement(selectedAchievement);
            completed.setMaxProgress();
            updateAchievement(completed);
            pendingLevel.current = {
                achievement,
                timeout: setTimeout(() => {
                    updateAchievement(pendingLevel.current.achievement);
                    pendingLevel.current = null;
                }, 2000)
            };
            return;
        }

        updateAchievement(achievement);
    });

    useMessageEvent<AchievementsEvent>(AchievementsEvent, (event) => {
        const parser = event.getParser();
        clearPendingLevel();
        setAchievements(parser.achievements);
        setIsLoaded(true);
        if (isVisible && !selectedCategoryCode && parser.defaultCategory) selectCategory(parser.defaultCategory);
    });

    useMessageEvent<AchievementsScoreEvent>(AchievementsScoreEvent, (event) => setAchievementScore(event.getParser().score));

    useMessageEvent<AuthenticatedEvent>(AuthenticatedEvent, () => {
        clearPendingLevel();
        setAchievements([]);
        setAchievementScore(0);
        setEnabledWiredAchievements([]);
        setIsLoaded(false);
        setIsVisible(false);
        setSelectedCategoryCode(null);
        setSelectedAchievementId(-1);
        SendMessageComposer(new RequestAchievementsMessageComposer());
    });

    useMessageEvent<WiredEnvironmentEvent>(WiredEnvironmentEvent, (event) => setEnabledWiredAchievements(event.getParser().enabledAchievements));

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => {
        setEnabledWiredAchievements([]);
        close();
    });

    useEffect(() => {
        SendMessageComposer(new RequestAchievementsMessageComposer());
        return clearPendingLevel;
    }, [clearPendingLevel]);

    return {
        achievementCategories,
        selectedCategoryCode,
        setSelectedCategoryCode: selectCategory,
        selectedAchievementId,
        setSelectedAchievementId,
        achievementScore,
        getTotalUnseen,
        getProgress,
        getMaxProgress,
        scaledProgressPercent: getMaxProgress ? Math.floor((getProgress / getMaxProgress) * 100) : 0,
        selectedCategory,
        selectedAchievement,
        visibleAchievements,
        hasWiredAchievements: enabledWiredAchievements.length > 0,
        isLoaded,
        isVisible,
        show,
        close
    };
};

export const useAchievements = () => useSharedHook(useAchievementsState);

registerSharedHook(useAchievementsState);
