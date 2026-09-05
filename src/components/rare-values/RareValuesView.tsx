import { AddLinkEventTracker, GetRoomEngine, GetSessionDataManager, ILinkEventTracker, IRareValue, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeFormattedNumber, LocalizeText } from '../../api';
import { Column, Flex, LayoutCurrencyIcon, LayoutImage, Text } from '../../common';
import { useRareValues } from '../../hooks';
import { OctaneCard, OctaneInput } from '../../layout';

const PAGE_SIZE = 50;

interface RareValueRow {
    spriteId: number;
    name: string;
    iconUrl: string;
    value: IRareValue;
}

export const RareValuesView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const { values = null, loaded = false } = useRareValues();
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

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
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'rare-values/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    const rows = useMemo<RareValueRow[]>(() => {
        if (!values) return [];

        const list: RareValueRow[] = [];

        values.forEach((value, spriteId) => {
            if (value.points <= 0) return;

            const floorData = GetSessionDataManager().getFloorItemData(spriteId);
            const wallData = floorData ? null : GetSessionDataManager().getWallItemData(spriteId);
            const data = floorData ?? wallData;

            if (!data) return;

            const iconUrl = floorData ? GetRoomEngine().getFurnitureFloorIconUrl(spriteId) : GetRoomEngine().getFurnitureWallIconUrl(spriteId);

            list.push({ spriteId, name: data.name || data.className || `#${spriteId}`, iconUrl, value });
        });

        list.sort((a, b) => b.value.points - a.value.points);

        return list;
    }, [values]);

    const filtered = useMemo<RareValueRow[]>(() => {
        const query = searchValue.trim().toLocaleLowerCase();

        if (!query) return rows;

        return rows.filter((row) => row.name.toLocaleLowerCase().includes(query));
    }, [rows, searchValue]);

    // Reset paging when the underlying list changes (typed in search, data loaded).
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [filtered]);

    // Infinite scroll: grow visibleCount by PAGE_SIZE whenever the sentinel
    // enters the viewport. The root is the scroll container so the trigger
    // fires reliably inside an in-app modal (no document scroll).
    useEffect(() => {
        if (!isVisible) return;
        if (visibleCount >= filtered.length) return;

        const sentinel = sentinelRef.current;
        const root = scrollRef.current;
        if (!sentinel || !root) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
                }
            },
            { root, rootMargin: '120px 0px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [isVisible, visibleCount, filtered.length]);

    if (!isVisible) return null;

    const visibleRows = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    return (
        <OctaneCard className="w-[460px] h-[520px]" uniqueKey="rare-values">
            <OctaneCard.Header headerText={LocalizeText('rarevalues.title')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCard.Content>
                <Column gap={2} className="h-full p-2">
                    <Flex alignItems="center" gap={2} className="rounded border border-black/10 bg-white px-2 py-1 shadow-inner">
                        <span className="text-black/40">🔍</span>
                        <OctaneInput
                            placeholder={LocalizeText('generic.search')}
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            className="grow !border-0 !bg-transparent !p-0 !shadow-none focus:!ring-0"
                        />
                    </Flex>
                    {loaded && (
                        <Flex alignItems="center" justifyContent="between" className="px-1 text-[11px] text-black/55">
                            <span>
                                {filtered.length} {LocalizeText('rarevalues.title').toLowerCase()}
                            </span>
                            {hasMore && (
                                <span>
                                    {visibleRows.length} / {filtered.length}
                                </span>
                            )}
                        </Flex>
                    )}
                    <div
                        ref={scrollRef}
                        className="grow overflow-auto rounded border border-black/10 bg-gradient-to-b from-[#f6f8fb] to-[#eaf1f6] shadow-inner"
                    >
                        {!loaded && (
                            <div className="p-6 text-center">
                                <Text className="text-black/55">{LocalizeText('rarevalues.loading')}</Text>
                            </div>
                        )}
                        {loaded && !filtered.length && (
                            <div className="p-6 text-center">
                                <Text className="text-black/55">{LocalizeText('rarevalues.empty')}</Text>
                            </div>
                        )}
                        {visibleRows.map((row, index) => (
                            <Flex
                                key={row.spriteId}
                                alignItems="center"
                                gap={2}
                                className={`border-b border-black/[0.06] px-2 py-1.5 transition-colors hover:bg-[#cfe4f1] ${index % 2 ? 'bg-white/60' : 'bg-[#e9f1f7]'}`}
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-black/10 bg-white shadow-sm">
                                    <LayoutImage imageUrl={row.iconUrl} className="h-9 w-9 bg-contain bg-center bg-no-repeat" />
                                </div>
                                <Text truncate className="grow text-[13px] font-medium text-[#1f2d34]">
                                    {row.name}
                                </Text>
                                <Flex alignItems="center" gap={1} className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 shadow-sm">
                                    <Text bold textEnd className="text-[13px] text-[#2f6f95]">
                                        {LocalizeFormattedNumber(row.value.points)}
                                    </Text>
                                    <LayoutCurrencyIcon type={row.value.pointsType} />
                                </Flex>
                            </Flex>
                        ))}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex items-center justify-center py-3">
                                <Text small className="text-black/45">
                                    {LocalizeText('rarevalues.loading.more')}
                                </Text>
                            </div>
                        )}
                    </div>
                </Column>
            </OctaneCard.Content>
        </OctaneCard>
    );
};
