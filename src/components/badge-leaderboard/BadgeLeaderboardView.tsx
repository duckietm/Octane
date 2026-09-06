import { AddLinkEventTracker, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { BadgeLeaderboardBoard, BadgeLeaderboardEntry, BadgeRarityKey, fetchBadgeLeaderboard, getCachedBadgeLeaderboard, LocalizeText } from '../../api';
import {
    badgeEmblemAchievement,
    badgeEmblemCommon,
    badgeEmblemDefault,
    badgeEmblemEpic,
    badgeEmblemLegendary,
    badgeEmblemMythical,
    badgeEmblemRare,
    badgeEmblemUnique,
    frameLeaderboardAchievement,
    frameLeaderboardRarityCommon,
    frameLeaderboardRarityEpic,
    frameLeaderboardRarityLegendary,
    frameLeaderboardRarityMythical,
    frameLeaderboardRarityRare,
    frameLeaderboardRarityUnique,
    frameLeaderboardTotal,
    leaderboardButtonCloseSwf,
    leaderboardDivider,
    leaderboardDropdownOpener
} from '../../assets/images/leaderboard_badge';
import { Column, DraggableWindow, DraggableWindowPosition, Flex, LayoutAvatarImageView, Text } from '../../common';

type LeaderboardPage =
    | { key: 'totalBadges'; board: BadgeLeaderboardBoard; frame: string; emblem: string; title: () => string; info: () => string; option: () => string }
    | { key: 'achievementLevel'; board: BadgeLeaderboardBoard; frame: string; emblem: string; title: () => string; info: () => string; option: () => string }
    | {
          key: `rarity-${BadgeRarityKey}`;
          rarity: BadgeRarityKey;
          board: BadgeLeaderboardBoard;
          frame: string;
          emblem: string;
          title: () => string;
          info: () => string;
          option: () => string;
      };

const RARITY_ASSETS: Record<BadgeRarityKey, { frame: string; emblem: string }> = {
    common: { frame: frameLeaderboardRarityCommon, emblem: badgeEmblemCommon },
    rare: { frame: frameLeaderboardRarityRare, emblem: badgeEmblemRare },
    epic: { frame: frameLeaderboardRarityEpic, emblem: badgeEmblemEpic },
    legendary: { frame: frameLeaderboardRarityLegendary, emblem: badgeEmblemLegendary },
    mythical: { frame: frameLeaderboardRarityMythical, emblem: badgeEmblemMythical },
    unique: { frame: frameLeaderboardRarityUnique, emblem: badgeEmblemUnique }
};

const RARITY_ORDER: BadgeRarityKey[] = ['common', 'rare', 'epic', 'legendary', 'mythical', 'unique'];
const PAGE_SIZE = 10;

export const BadgeLeaderboardView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string>(null);
    const [version, setVersion] = useState(0);
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [entryPageIndex, setEntryPageIndex] = useState(0);
    const [isCategoryMenuVisible, setIsCategoryMenuVisible] = useState(false);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((value) => !value);
                        return;
                    case 'refresh':
                        setVersion((value) => value + 1);
                        return;
                }
            },
            eventUrlPrefix: 'badge-leaderboard/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let cancelled = false;

        setIsLoading(true);
        setLoadError(null);

        fetchBadgeLeaderboard(version > 0)
            .then(() => {
                if (cancelled) return;

                setIsLoading(false);
            })
            .catch((error) => {
                if (cancelled) return;

                setLoadError(String((error as Error)?.message || error));
                setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isVisible, version]);

    const leaderboard = getCachedBadgeLeaderboard();

    const pages = useMemo<LeaderboardPage[]>(() => {
        if (!leaderboard) return [];

        const built: LeaderboardPage[] = [
            {
                key: 'totalBadges',
                board: leaderboard.leaderboards.totalBadges,
                frame: frameLeaderboardTotal,
                emblem: badgeEmblemDefault,
                title: () => LocalizeText('badge_leaderboard.title.total_badges'),
                info: () => LocalizeText('badge_leaderboard.info.total_badges'),
                option: () => LocalizeText('badge_leaderboard.option.total_badges')
            },
            {
                key: 'achievementLevel',
                board: leaderboard.leaderboards.achievementLevel,
                frame: frameLeaderboardAchievement,
                emblem: badgeEmblemAchievement,
                title: () => LocalizeText('badge_leaderboard.title.achievement_level'),
                info: () => LocalizeText('badge_leaderboard.info.achievement_level'),
                option: () => LocalizeText('badge_leaderboard.option.achievement_level')
            }
        ];

        for (const rarity of RARITY_ORDER) {
            const board = leaderboard.leaderboards.rarity?.[rarity];

            if (!board?.totalPlayers) continue;

            const assets = RARITY_ASSETS[rarity];
            const rarityText = LocalizeText(`badge.rarity.${rarity}`);

            built.push({
                key: `rarity-${rarity}`,
                rarity,
                board,
                frame: assets.frame,
                emblem: assets.emblem,
                title: () => LocalizeText('badge_leaderboard.title.rarity', ['rarity'], [rarityText]),
                info: () => LocalizeText(`badge_leaderboard.info.rarity.${rarity}`),
                option: () => LocalizeText('badge_leaderboard.option.rarity', ['rarity'], [rarityText])
            });
        }

        return built;
    }, [leaderboard]);

    useEffect(() => {
        if (!pages.length) return;
        if (categoryIndex < pages.length) return;

        setCategoryIndex(0);
    }, [categoryIndex, pages.length]);

    useEffect(() => setEntryPageIndex(0), [categoryIndex]);

    useEffect(() => {
        if (!isCategoryMenuVisible) return;

        const onWindowPointerDown = () => setIsCategoryMenuVisible(false);

        window.addEventListener('pointerdown', onWindowPointerDown);

        return () => window.removeEventListener('pointerdown', onWindowPointerDown);
    }, [isCategoryMenuVisible]);

    const currentPage = pages[categoryIndex] || null;
    const allEntries = currentPage?.board?.entries || [];
    const viewerEntry = useMemo(() => {
        const fromBoard = currentPage?.board?.viewerEntry as BadgeLeaderboardEntry;

        if (fromBoard?.userId) return fromBoard;
        if (!leaderboard?.viewerUserId) return null;

        const session = GetSessionDataManager();

        if (!session || session.userId !== leaderboard.viewerUserId) return null;

        return {
            userId: session.userId,
            username: session.userName || '',
            figure: session.figure || '',
            score: 0,
            rank: 0
        } as BadgeLeaderboardEntry;
    }, [currentPage?.board?.viewerEntry, leaderboard?.viewerUserId]);
    const rankedEntries = useMemo(() => {
        if (!allEntries.length) return [];
        if (!viewerEntry?.userId) return allEntries;

        return allEntries.filter((entry) => entry.userId !== viewerEntry.userId);
    }, [allEntries, viewerEntry?.userId]);
    const viewerHasRankedScore = (viewerEntry?.rank || 0) > 0;
    const rankedTotalPlayers = Math.max((currentPage?.board?.totalPlayers || 0) - (viewerHasRankedScore ? 1 : 0), rankedEntries.length);
    const totalEntryPages = Math.max(1, Math.ceil(rankedTotalPlayers / PAGE_SIZE));
    const clampedEntryPageIndex = Math.min(entryPageIndex, totalEntryPages - 1);
    const pageStart = clampedEntryPageIndex * PAGE_SIZE;
    const pageEntries = rankedEntries.slice(pageStart, pageStart + PAGE_SIZE);
    const showViewerEntry = !!viewerEntry?.userId;

    if (!isVisible) return null;

    return (
        <div className="octane-badge-leaderboard fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <DraggableWindow
                uniqueKey="badge-leaderboard"
                handleSelector=".octane-badge-leaderboard__drag-handle"
                windowPosition={DraggableWindowPosition.CENTER}
            >
                <div
                    className="octane-badge-leaderboard__window pointer-events-auto"
                    style={{ '--badge-leaderboard-frame': `url(${currentPage?.frame || frameLeaderboardTotal})` } as CSSProperties}
                >
                    <div className="octane-badge-leaderboard__frame" aria-hidden="true" />
                    <div className="octane-badge-leaderboard__drag-handle" />
                    <button
                        className="octane-badge-leaderboard__close"
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setIsVisible(false)}
                        aria-label="Close"
                    >
                        <span className="octane-badge-leaderboard__close-icon" style={{ backgroundImage: `url(${leaderboardButtonCloseSwf})` }} />
                    </button>
                    <div className="octane-badge-leaderboard__header">
                        <button
                            className="octane-badge-leaderboard__category-button"
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => setIsCategoryMenuVisible((value) => !value)}
                        >
                            <Text className="octane-badge-leaderboard__header-title">
                                {currentPage?.title() || LocalizeText('badge_leaderboard.title.total_badges')}
                            </Text>
                            <img className="octane-badge-leaderboard__header-arrow" src={leaderboardDropdownOpener} alt="" />
                        </button>
                        {isCategoryMenuVisible && (
                            <div className="octane-badge-leaderboard__category-menu" onPointerDown={(event) => event.stopPropagation()}>
                                {pages.map((page, index) => (
                                    <button
                                        key={page.key}
                                        className={`octane-badge-leaderboard__category-option ${index === categoryIndex ? 'is-active' : ''}`}
                                        type="button"
                                        onClick={() => {
                                            setCategoryIndex(index);
                                            setIsCategoryMenuVisible(false);
                                        }}
                                    >
                                        {page.option()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="octane-badge-leaderboard__content">
                        {isLoading && !leaderboard && <div className="octane-badge-leaderboard__state">{LocalizeText('generic.loading')}</div>}
                        {loadError && !leaderboard && <div className="octane-badge-leaderboard__state octane-badge-leaderboard__state--error">{loadError}</div>}
                        {currentPage && (
                            <>
                                <div className="octane-badge-leaderboard__info-card">
                                    <img className="octane-badge-leaderboard__info-icon" src={currentPage.emblem} alt="" />
                                    <Text className="octane-badge-leaderboard__info-text" small wrap>
                                        {currentPage.info()}
                                    </Text>
                                </div>
                                <div className="octane-badge-leaderboard__list">
                                    {pageEntries.map((entry, index) => (
                                        <LeaderboardRow
                                            key={`${currentPage.key}-${entry.userId}`}
                                            entry={entry}
                                            emblem={currentPage.emblem}
                                            rowIndex={pageStart + index}
                                            isCurrentUser={false}
                                        />
                                    ))}
                                    {showViewerEntry && (
                                        <LeaderboardRow entry={viewerEntry} emblem={currentPage.emblem} rowIndex={pageEntries.length} isCurrentUser={true} />
                                    )}
                                </div>
                                <img className="octane-badge-leaderboard__divider" src={leaderboardDivider} alt="" />
                                <Flex className="octane-badge-leaderboard__footer" justifyContent="between" alignItems="center">
                                    <button
                                        className="octane-badge-leaderboard__nav-button is-previous"
                                        disabled={clampedEntryPageIndex <= 0}
                                        onClick={() => setEntryPageIndex((value) => Math.max(0, value - 1))}
                                    >
                                        {LocalizeText('badge_leaderboard.previous')}
                                    </button>
                                    <Column gap={0} alignItems="center">
                                        <Text small bold>
                                            {currentPage.option()}
                                        </Text>
                                        <Text className="opacity-70" small>{`${clampedEntryPageIndex + 1} / ${totalEntryPages}`}</Text>
                                    </Column>
                                    <button
                                        className="octane-badge-leaderboard__nav-button is-next"
                                        disabled={clampedEntryPageIndex >= totalEntryPages - 1}
                                        onClick={() => setEntryPageIndex((value) => Math.min(totalEntryPages - 1, value + 1))}
                                    >
                                        {LocalizeText('badge_leaderboard.next')}
                                    </button>
                                </Flex>
                            </>
                        )}
                    </div>
                </div>
            </DraggableWindow>
        </div>
    );
};

interface LeaderboardRowProps {
    entry: BadgeLeaderboardEntry;
    emblem: string;
    rowIndex?: number;
    isCurrentUser?: boolean;
}

const LeaderboardRow: FC<LeaderboardRowProps> = (props) => {
    const { entry = null, emblem = null, rowIndex = 0, isCurrentUser = false } = props;

    if (!entry) return null;

    const rankClassName = entry.rank === 1 ? 'is-rank-1' : entry.rank === 2 ? 'is-rank-2' : entry.rank === 3 ? 'is-rank-3' : '';

    return (
        <div className={`octane-badge-leaderboard__row ${isCurrentUser ? 'is-current-user' : ''} ${rowIndex % 2 === 0 ? 'is-even' : 'is-odd'}`}>
            <div className={`octane-badge-leaderboard__rank ${rankClassName}`}>{entry.rank}</div>
            <div className="octane-badge-leaderboard__avatar">
                <LayoutAvatarImageView figure={entry.figure} headOnly direction={2} />
            </div>
            <Text className="octane-badge-leaderboard__username" bold>
                {entry.username}
            </Text>
            <Text className="octane-badge-leaderboard__score" bold>
                {entry.score}
            </Text>
            <img className="octane-badge-leaderboard__row-emblem" src={emblem} alt="" />
        </div>
    );
};
