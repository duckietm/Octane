import type { IHotelViewLandingScene, IHotelViewLandingSlot } from '@octane/renderer';
import {
    CreateLinkEvent,
    GetSessionDataManager,
    HotelViewLandingEvent,
    HotelViewLandingRequestComposer,
    HotelViewLandingResetVotesComposer,
    HotelViewLandingSaveComposer,
    HotelViewLandingSaveSceneComposer,
    HotelViewLandingVoteComposer
} from '@octane/renderer';
import { CSSProperties, FC, FormEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, SendMessageComposer } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { useMessageEvent } from '../../hooks';

interface HotelViewLandingData {
    canEdit: boolean;
    scene: IHotelViewLandingScene;
    slots: IHotelViewLandingSlot[];
}

interface HotelViewSlotConfig {
    positionX?: number;
    positionY?: number;
    secondaryButtonText?: string;
    secondaryLink?: string;
    endsAt?: string;
    catalogPage?: string;
    featuredSlot?: number;
    useServerLTD?: boolean;
    userVote?: number;
    voteOptions?: Array<{ id: number; label: string; badgeCode?: string; furniId?: number; currencyType?: number; currencyAmount?: number }>;
    voteCounts?: Record<string, number>;
}

interface HotelViewSlotDrag {
    slotId: number;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
}

// Left and right edge artwork is permanently pinned to the bottom corners via CSS and
// cannot be moved, so only the drape and Hall of Fame are draggable scene targets.
type HotelViewSceneDragTarget = 'drape' | 'hallOfFame';

interface HotelViewSceneDrag {
    target: HotelViewSceneDragTarget;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    scaled: boolean;
}

const HOTEL_VIEW_WIDTH = 1172;
const HOTEL_VIEW_HEIGHT = 822;
const EMPTY_SCENE: IHotelViewLandingScene = { backgroundUrl: '', leftUrl: '', rightUrl: '', drapeUrl: '', leftX: -1, leftY: -1, rightX: -1, rightY: -1, drapeX: -1, drapeY: -1, hallOfFameX: -1, hallOfFameY: -1, hallOfFameEnabled: false, hallOfFameMode: 'latest_registered', hallOfFameCurrencyType: 0, hallOfFameUsers: [] };
const HOTEL_VIEW_ACTIONS = [
    { value: 'catalog/open', label: 'Open catalogue' },
    { value: 'catalog/open/credits', label: 'Open credits catalogue' },
    { value: 'navigator/show', label: 'Open navigator' },
    { value: 'navigator/search/hotel_view', label: 'Find rooms' },
    { value: 'navigator/create', label: 'Create room' },
    { value: 'navigator/goto/home', label: 'Go to home room' },
    { value: 'avatar-editor/show', label: 'Open avatar editor' },
    { value: 'games/toggle', label: 'Open games' },
    { value: 'help/show', label: 'Open help' },
    { value: 'chat-history/show', label: 'Open chat history' },
    { value: 'achievements/show', label: 'Open achievements' }
] as const;
const CUSTOM_ACTION = '__custom__';
const LTD_COUNTDOWN_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAlCAMAAAAQnMtIAAAAPFBMVEX///8AAABYXl+zxs3d6u1IT1IAAACxu75HS0zR3eEqMDY5P0Lr8vSPnqRoeYeosbQ/Q1Oep89DR0hUWFqc27bXAAAAAnRSTlMAAHaTzTgAAAELSURBVHhehdTZbsQwCAXQDJuzztL+/78WrphWaBpyH0wsHwnkRJkmu4iLbZvnDZkjKNhmbDJVJVKEIij6G5AzUwmLoLBEWGPxFMJCUdIopymEid7Wg/JHvnUNojCwRMKMZVX9QiNag4RJSzFPLLRmoydOYNLGPDHzs8yiMGmdOI+lEpyBqJOcuRBEBIRFcmYqpN5hzkyzEwJBPu9QQYgK4dyHiUcQNyX1neLqLoxNYscY4yh574fHbpPty7Lv+1KS+zgQbySC0bgEe1SQ3gyQ1oD05nDCvQFpDcjC91NzZ344iSex/xImG71Oe71EQJATk/fSG5DeoFFvQHoD0hqQ8n1E6vfzsOt/3e0H5XQXxtNRv3EAAAAASUVORK5CYII=';
const SLOT_WIDGET_TYPES: Array<{ value: IHotelViewLandingSlot['type']; label: string; title: string; body: string; buttonText: string; link: string }> = [
    { value: 'bonus', label: 'Bonus Bag', title: 'Bonus Bag', body: '', buttonText: 'Get Credits', link: 'catalog/open/credits' },
    { value: 'promotion', label: 'Promotion', title: 'Promotion', body: '', buttonText: 'Learn more', link: '' },
    { value: 'catalogpromo', label: 'Catalog promotion', title: 'What\'s new?', body: 'Check out the latest furni, offers and activities.', buttonText: 'Open Catalogue', link: 'catalog/open' },
    { value: 'catalogpromosmall', label: 'Catalog promotion (small)', title: 'New in the catalogue', body: 'Discover the latest additions to the catalogue.', buttonText: 'Open Catalogue', link: 'catalog/open' },
    { value: 'expiringcatalogpage', label: 'Expiring catalog page', title: 'Limited offer', body: 'This offer is only available for a limited time.', buttonText: 'Open Catalogue', link: 'catalog/open' },
    { value: 'expiringcatalogpagesmall', label: 'Expiring catalog page (small)', title: 'Limited offer', body: 'This offer is only available for a limited time.', buttonText: 'Open Catalogue', link: 'catalog/open' },
    { value: 'communitygoal', label: 'Community goal / vote', title: 'Community goal', body: 'Work together with the community and vote for your favourite.', buttonText: 'View goal', link: '' },
    { value: 'dailyquest', label: 'Daily quest', title: 'Daily quest', body: 'Complete today\'s quest to earn your reward.', buttonText: 'Open achievements', link: 'achievements/show' },
    { value: 'nextlimitedrarecountdown', label: 'Limited rare countdown', title: 'Next limited rare', body: 'A new limited rare is coming soon.', buttonText: 'Open Catalogue', link: 'catalog/open' },
    { value: 'achievementcompetition_hall_of_fame', label: 'Achievement competition: hall of fame', title: 'Hall of fame', body: 'See the top achievement competitors.', buttonText: 'Open achievements', link: 'achievements/show' },
    { value: 'achievementcompetition_prizes', label: 'Achievement competition: prizes', title: 'Competition prizes', body: 'See the rewards for this achievement competition.', buttonText: 'Open achievements', link: 'achievements/show' },
    { value: 'habbotalentspromo', label: 'Habbo Talents promo', title: 'Habbo Talents', body: 'Learn more about Habbo Talents.', buttonText: 'Open Help', link: 'help/show' },
    { value: 'habbowaypromo', label: 'Habbo Way promo', title: 'Habbo Way', body: 'Learn how to make the hotel a better place.', buttonText: 'Open Help', link: 'help/show' },
    { value: 'safetyquizpromo', label: 'Safety quiz promo', title: 'Safety quiz', body: 'Take the safety quiz and learn how to stay safe.', buttonText: 'Open Help', link: 'help/show' },
    { value: 'habbomoderationpromo', label: 'Moderation promo', title: 'Hotel moderation', body: 'Learn more about hotel moderation and safety.', buttonText: 'Open Help', link: 'help/show' }
];

const parseSlotConfig = (configJson: string): HotelViewSlotConfig => {
    try {
        const parsed = JSON.parse(configJson);

        return parsed && typeof parsed === 'object' ? parsed as HotelViewSlotConfig : {};
    } catch {
        return {};
    }
};

const serializeSlotConfig = (config: HotelViewSlotConfig) => JSON.stringify(config);

const withoutUserVote = (configJson: string) => {
    const { userVote: _userVote, ...config } = parseSlotConfig(configJson);

    return serializeSlotConfig(config);
};

const toDateTimeLocalValue = (value: string | undefined) => {
    if (!value) return '';

    const date = new Date(value);

    if (!Number.isFinite(date.getTime())) return value.slice(0, 16);

    const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));

    return offsetDate.toISOString().slice(0, 16);
};

const toEditableCountdownValue = (value: string | undefined) => {
    const localValue = toDateTimeLocalValue(value);

    return localValue ? `${localValue.slice(8, 10)}/${localValue.slice(5, 7)}/${localValue.slice(0, 4)} ${localValue.slice(11, 16)}` : '';
};

const parseEditableCountdownValue = (value: string) => {
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);

    if (!match) return null;

    const [, day, month, year, hour, minute] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || date.getHours() !== Number(hour) || date.getMinutes() !== Number(minute)) return null;

    return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getDefaultConfig = (type: IHotelViewLandingSlot['type']): HotelViewSlotConfig => {
    const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 16);

    switch (type) {
        case 'communitygoal': return { voteOptions: [{ id: 1, label: 'Vote option 1' }, { id: 2, label: 'Vote option 2' }] };
        case 'nextlimitedrarecountdown': return { useServerLTD: true };
        case 'expiringcatalogpage':
        case 'expiringcatalogpagesmall': return { endsAt: tomorrow() };
        case 'dailyquest': return { secondaryButtonText: 'Skip quest', secondaryLink: 'achievements/show' };
        case 'achievementcompetition_hall_of_fame': return { secondaryButtonText: 'View prizes', secondaryLink: 'achievements/show' };
        case 'habbowaypromo': return { secondaryButtonText: 'Open help', secondaryLink: 'help/show' };
        default: return {};
    }
};

const getSecondsRemaining = (endsAt: string | undefined, now: number) => {
    const timestamp = endsAt ? Date.parse(endsAt) : Number.NaN;

    return Number.isFinite(timestamp) ? Math.max(0, Math.ceil((timestamp - now) / 1000)) : null;
};

const formatCountdown = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${days ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getCountdownParts = (seconds: number) => ({
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60
});

const resolveImageUrl = (url: string, imageLibraryUrl: string, assetUrl: string) => url
    .replaceAll('${image.library.url}', imageLibraryUrl)
    .replaceAll('${asset.url}', assetUrl);

export const HotelView: FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hotelViewRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [landingData, setLandingData] = useState<HotelViewLandingData>({ canEdit: false, scene: EMPTY_SCENE, slots: [] });
    const [editingSlot, setEditingSlot] = useState<IHotelViewLandingSlot | null>(null);
    const [countdownInput, setCountdownInput] = useState('');
    const [editingScene, setEditingScene] = useState<IHotelViewLandingScene | null>(null);
    const [slotDrag, setSlotDrag] = useState<HotelViewSlotDrag | null>(null);
    const [dragPosition, setDragPosition] = useState<{ slotId: number; x: number; y: number } | null>(null);
    const dragPositionRef = useRef<{ slotId: number; x: number; y: number } | null>(null);
    const [sceneDrag, setSceneDrag] = useState<HotelViewSceneDrag | null>(null);
    const [sceneDragPosition, setSceneDragPosition] = useState<{ target: HotelViewSceneDragTarget; x: number; y: number } | null>(null);
    const sceneDragPositionRef = useRef<{ target: HotelViewSceneDragTarget; x: number; y: number } | null>(null);
    const [now, setNow] = useState(Date.now());
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const assetUrl = GetConfigurationValue<string>('asset.url', '');

    useMessageEvent<HotelViewLandingEvent>(HotelViewLandingEvent, (event) => {
        const parser = event.getParser();

        setLandingData({ canEdit: parser.canEdit, scene: parser.scene, slots: parser.slots });
    });

    useEffect(() => {
        SendMessageComposer(new HotelViewLandingRequestComposer());
    }, []);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) return;

        const updateScale = () => {
            const { width, height } = container.getBoundingClientRect();

            if (!width || !height) return;

            setScale(Math.min(width / HOTEL_VIEW_WIDTH, height / HOTEL_VIEW_HEIGHT));
        };

        const observer = new ResizeObserver(updateScale);

        observer.observe(container);
        updateScale();

        return () => observer.disconnect();
    }, []);

    const scene = landingData.scene ?? EMPTY_SCENE;
    const backgroundImage = scene.backgroundUrl ? `url("${resolveImageUrl(scene.backgroundUrl, imageLibraryUrl, assetUrl)}")` : 'none';
    const stageStyle = {
        '--hotel-view-scale': scale,
        '--hotel-view-scaled-height': `${HOTEL_VIEW_HEIGHT * scale}px`,
        '--hotel-view-scaled-width': `${HOTEL_VIEW_WIDTH * scale}px`
    } as CSSProperties;
    const containerStyle = {
        '--hotel-view-background': backgroundImage,
        overflow: 'hidden'
    } as CSSProperties;

    const handleSlotClick = (link: string) => {
        if (!link) return;

        if (link.startsWith('http://') || link.startsWith('https://')) {
            window.open(link, '_blank', 'noopener,noreferrer');
            return;
        }

        CreateLinkEvent(link);
    };

    const getCatalogLink = (slot: IHotelViewLandingSlot) => {
        const page = parseSlotConfig(slot.configJson).catalogPage?.trim();

        return page ? `catalog/open/${page}` : slot.link;
    };

    const getSelectedAction = (link: string) => HOTEL_VIEW_ACTIONS.some((action) => action.value === link) ? link : CUSTOM_ACTION;

    const selectSlotWidgetType = (type: IHotelViewLandingSlot['type']) => {
        const preset = SLOT_WIDGET_TYPES.find((widget) => widget.value === type);

        if (!preset || !editingSlot) return;

        setEditingSlot({ ...editingSlot, type, title: preset.title, body: preset.body, buttonText: preset.buttonText, link: preset.link, progress: type === 'bonus' ? editingSlot.progress : 0, progressLabel: type === 'bonus' ? editingSlot.progressLabel : '', configJson: serializeSlotConfig(getDefaultConfig(type)) });
    };

    const updateEditingConfig = (callback: (config: HotelViewSlotConfig) => HotelViewSlotConfig) => {
        if (!editingSlot) return;

        setEditingSlot({ ...editingSlot, configJson: serializeSlotConfig(callback(parseSlotConfig(editingSlot.configJson))) });
    };

    const resetCommunityGoalVotes = (slotId: number) => {
        const clearVote = (slot: IHotelViewLandingSlot) => slot.id === slotId
            ? { ...slot, configJson: withoutUserVote(slot.configJson) }
            : slot;

        setLandingData((current) => ({ ...current, slots: current.slots.map(clearVote) }));
        setEditingSlot((current) => current?.id === slotId ? clearVote(current) : current);
        SendMessageComposer(new HotelViewLandingResetVotesComposer(slotId));
        SendMessageComposer(new HotelViewLandingRequestComposer());
    };

    const saveSlot = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingSlot) return;

        const isCountdown = editingSlot.type === 'nextlimitedrarecountdown' || editingSlot.type === 'expiringcatalogpage' || editingSlot.type === 'expiringcatalogpagesmall';
        const endsAt = isCountdown && countdownInput ? parseEditableCountdownValue(countdownInput) : null;

        if (isCountdown && countdownInput && !endsAt) return;

        const slotToSave = endsAt
            ? {
                ...editingSlot,
                configJson: serializeSlotConfig({
                    ...parseSlotConfig(editingSlot.configJson),
                    endsAt,
                    ...(editingSlot.type === 'nextlimitedrarecountdown' ? { useServerLTD: false } : {})
                })
            }
            : editingSlot;

        SendMessageComposer(new HotelViewLandingSaveComposer(slotToSave));
        setEditingSlot(null);
        setCountdownInput('');
    };

    const saveScene = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingScene) return;

        SendMessageComposer(new HotelViewLandingSaveSceneComposer(editingScene));
        setEditingScene(null);
    };

    const getSlotPositionStyle = (slot: IHotelViewLandingSlot) => {
        const config = parseSlotConfig(slot.configJson);
        const position = dragPosition?.slotId === slot.id
            ? dragPosition
            : (Number.isFinite(config.positionX) && Number.isFinite(config.positionY) ? { x: config.positionX as number, y: config.positionY as number } : null);

        return position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined;
    };

    const startSlotDrag = (event: PointerEvent<HTMLButtonElement>, slot: IHotelViewLandingSlot) => {
        if (!landingData.canEdit || !hotelViewRef.current) return;

        const slotElement = event.currentTarget.closest<HTMLElement>('.hotelview-slot');
        const hotelRect = hotelViewRef.current.getBoundingClientRect();
        const slotRect = slotElement?.getBoundingClientRect();

        if (!slotRect || !hotelRect) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragPositionRef.current = null;
        setSlotDrag({
            slotId: slot.id,
            pointerId: event.pointerId,
            offsetX: (event.clientX - slotRect.left) / scale,
            offsetY: (event.clientY - slotRect.top) / scale,
            width: slotRect.width / scale,
            height: slotRect.height / scale
        });
    };

    const moveSlotDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!slotDrag || slotDrag.pointerId !== event.pointerId || !hotelViewRef.current) return;

        const hotelRect = hotelViewRef.current.getBoundingClientRect();
        const x = Math.round(Math.max(0, Math.min(HOTEL_VIEW_WIDTH - slotDrag.width, ((event.clientX - hotelRect.left) / scale) - slotDrag.offsetX)));
        const y = Math.round(Math.max(0, Math.min(HOTEL_VIEW_HEIGHT - slotDrag.height, ((event.clientY - hotelRect.top) / scale) - slotDrag.offsetY)));

        const position = { slotId: slotDrag.slotId, x, y };

        dragPositionRef.current = position;
        setDragPosition(position);
    };

    const finishSlotDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!slotDrag || slotDrag.pointerId !== event.pointerId) return;

        const position = dragPositionRef.current?.slotId === slotDrag.slotId ? dragPositionRef.current : null;
        const slot = landingData.slots.find((value) => value.id === slotDrag.slotId);

        if (position && slot) {
            const updatedSlot = {
                ...slot,
                configJson: serializeSlotConfig({ ...parseSlotConfig(slot.configJson), positionX: position.x, positionY: position.y })
            };

            setLandingData((current) => ({ ...current, slots: current.slots.map((value) => value.id === updatedSlot.id ? updatedSlot : value) }));
            SendMessageComposer(new HotelViewLandingSaveComposer(updatedSlot));
        }

        setSlotDrag(null);
        dragPositionRef.current = null;
        setDragPosition(null);
    };

    const getSceneCoordinates = (target: HotelViewSceneDragTarget) => {
        const key = target === 'hallOfFame' ? 'hallOfFame' : target;
        const x = scene[`${key}X` as keyof IHotelViewLandingScene] as number;
        const y = scene[`${key}Y` as keyof IHotelViewLandingScene] as number;

        return sceneDragPosition?.target === target ? sceneDragPosition : { x, y };
    };

    const getScenePositionStyle = (target: HotelViewSceneDragTarget) => {
        const position = getSceneCoordinates(target);

        if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || position.x < 0 || position.y < 0) return undefined;

        // Hall of Fame lives inside the fixed 1172x822 stage (uniformly scaled), so its
        // coordinates are plain design-space pixels.
        if (target === 'hallOfFame') {
            return { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto', transform: 'none' } as CSSProperties;
        }

        // The edge artwork is a fixed-size image anchored to the viewport-sized container.
        // Store it as a fraction of the FREE space (permille, 0-1000): 0 hugs the left/top,
        // 1000 hugs the right/bottom, 500 centres it. `left: P%` positions relative to the
        // container while `translate(-P%)` pulls back by the same fraction of the image's
        // own size, so the two compose into P * (container - image). That keeps a corner
        // placement pinned to the same corner at any screen size, instead of drifting as a
        // plain top-left percentage would.
        const percentX = position.x / 10;
        const percentY = position.y / 10;

        return { left: `${percentX}%`, top: `${percentY}%`, right: 'auto', bottom: 'auto', transform: `translate(-${percentX}%, -${percentY}%)` } as CSSProperties;
    };

    const startSceneDrag = (event: PointerEvent<HTMLButtonElement>, target: HotelViewSceneDragTarget) => {
        const isScaled = target === 'hallOfFame';
        const dragRoot = isScaled ? hotelViewRef.current : containerRef.current;
        const element = event.currentTarget.closest<HTMLElement>(target === 'hallOfFame' ? '.hotelview-hall-of-fame' : '.hotelview-edge');
        const rootRect = dragRoot?.getBoundingClientRect();
        const elementRect = element?.getBoundingClientRect();

        if (!landingData.canEdit || !rootRect || !elementRect) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        sceneDragPositionRef.current = null;
        setSceneDrag({
            target,
            pointerId: event.pointerId,
            offsetX: (event.clientX - elementRect.left) / (isScaled ? scale : 1),
            offsetY: (event.clientY - elementRect.top) / (isScaled ? scale : 1),
            width: elementRect.width / (isScaled ? scale : 1),
            height: elementRect.height / (isScaled ? scale : 1),
            scaled: isScaled
        });
    };

    const moveSceneDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!sceneDrag || sceneDrag.pointerId !== event.pointerId) return;

        const dragRoot = sceneDrag.scaled ? hotelViewRef.current : containerRef.current;
        const rootRect = dragRoot?.getBoundingClientRect();

        if (!rootRect) return;

        const dragScale = sceneDrag.scaled ? scale : 1;
        const rootWidth = sceneDrag.scaled ? HOTEL_VIEW_WIDTH : rootRect.width;
        const rootHeight = sceneDrag.scaled ? HOTEL_VIEW_HEIGHT : rootRect.height;
        const freeWidth = rootWidth - sceneDrag.width;
        const freeHeight = rootHeight - sceneDrag.height;
        const pixelX = Math.max(0, Math.min(freeWidth, ((event.clientX - rootRect.left) / dragScale) - sceneDrag.offsetX));
        const pixelY = Math.max(0, Math.min(freeHeight, ((event.clientY - rootRect.top) / dragScale) - sceneDrag.offsetY));

        // Hall of Fame is in the fixed design space (scale-invariant) so it keeps pixel
        // coordinates. The container-anchored edges are stored as a fraction of the free
        // space in permille (0-1000) — pixelX / (container - image) — so a corner or centre
        // placement lands in the same relative spot when reopened at a different screen size
        // (see getScenePositionStyle for how it is applied).
        const x = sceneDrag.scaled ? Math.round(pixelX) : Math.round(freeWidth > 0 ? (pixelX / freeWidth) * 1000 : 0);
        const y = sceneDrag.scaled ? Math.round(pixelY) : Math.round(freeHeight > 0 ? (pixelY / freeHeight) * 1000 : 0);
        const position = { target: sceneDrag.target, x, y };

        sceneDragPositionRef.current = position;
        setSceneDragPosition(position);
    };

    const finishSceneDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!sceneDrag || sceneDrag.pointerId !== event.pointerId) return;

        const position = sceneDragPositionRef.current?.target === sceneDrag.target ? sceneDragPositionRef.current : null;

        if (position) {
            const key = position.target === 'hallOfFame' ? 'hallOfFame' : position.target;
            const updatedScene = {
                ...scene,
                [`${key}X`]: position.x,
                [`${key}Y`]: position.y
            } as IHotelViewLandingScene;

            setLandingData((current) => ({ ...current, scene: updatedScene }));
            SendMessageComposer(new HotelViewLandingSaveSceneComposer(updatedScene));
        }

        setSceneDrag(null);
        sceneDragPositionRef.current = null;
        setSceneDragPosition(null);
    };

    return (
        <div ref={containerRef} className="octane-hotel-view block fixed w-full h-[calc(100%-55px)]" style={containerStyle}>
            {scene.leftUrl
                ? <div className="hotelview-edge hotelview-edge-left"><img src={resolveImageUrl(scene.leftUrl, imageLibraryUrl, assetUrl)} alt="" /><LayoutAvatarImageView classNames={['hotelview-avatar']} figure={GetSessionDataManager().figure} gender={GetSessionDataManager().gender} direction={2} /></div>
                : <LayoutAvatarImageView classNames={['hotelview-avatar hotelview-avatar-fallback']} figure={GetSessionDataManager().figure} gender={GetSessionDataManager().gender} direction={2} />}
            {scene.rightUrl && <div className="hotelview-edge hotelview-edge-right"><img src={resolveImageUrl(scene.rightUrl, imageLibraryUrl, assetUrl)} alt="" /></div>}
            {scene.drapeUrl && <div className="hotelview-edge hotelview-edge-drape" style={getScenePositionStyle('drape')}><img src={resolveImageUrl(scene.drapeUrl, imageLibraryUrl, assetUrl)} alt="" />{landingData.canEdit && <button type="button" className="hotelview-scene-drag-handle" onPointerDown={(event) => startSceneDrag(event, 'drape')} onPointerMove={moveSceneDrag} onPointerUp={finishSceneDrag} onPointerCancel={finishSceneDrag} title="Drag drape">↕</button>}</div>}
            <div className="hotelview-stage" style={stageStyle}>
                <div ref={hotelViewRef} className="hotelview">
                    <div className="hotelview-background" />
                    {landingData.canEdit && <button type="button" className="hotelview-scene-edit hotelview-scene-edit-left" onClick={() => setEditingScene(scene)} aria-label="Edit left image">✎</button>}
                    {landingData.canEdit && <button type="button" className="hotelview-scene-edit hotelview-scene-edit-right" onClick={() => setEditingScene(scene)} aria-label="Edit right image">✎</button>}
                    {landingData.canEdit && <button type="button" className="hotelview-scene-edit hotelview-scene-edit-drape" onClick={() => setEditingScene(scene)} aria-label="Edit drape image">✎</button>}
                    {landingData.canEdit && <button type="button" className="hotelview-scene-edit hotelview-scene-edit-background" onClick={() => setEditingScene(scene)} aria-label="Edit HotelView background" title="Edit HotelView background">BG</button>}
                    <main className="hotelview-slots">
                        {landingData.slots.filter((slot) => slot.enabled || landingData.canEdit).map((slot) => (
                            <section key={slot.id} className={`hotelview-slot hotelview-slot-${slot.id} hotelview-slot-${slot.type}${slot.enabled ? '' : ' hotelview-slot-disabled'}`} style={getSlotPositionStyle(slot)}>
                                {slot.enabled && <>
                                    {slot.imageUrl && <img className="hotelview-slot-image" src={resolveImageUrl(slot.imageUrl, imageLibraryUrl, assetUrl)} alt="" />}
                                    {!slot.imageUrl && slot.type === 'nextlimitedrarecountdown' && <img className="hotelview-slot-image hotelview-ltd-countdown-icon" src={LTD_COUNTDOWN_ICON} alt="" />}
                                    <div className="hotelview-slot-copy">
                                        {(() => {
                                            const config = parseSlotConfig(slot.configJson);
                                            const isCountdown = slot.type === 'nextlimitedrarecountdown' || slot.type === 'expiringcatalogpage' || slot.type === 'expiringcatalogpagesmall';
                                            const seconds = isCountdown ? getSecondsRemaining(config.endsAt, now) : null;
                                            const isLtdPending = slot.type === 'nextlimitedrarecountdown' && seconds !== null && seconds > 0;
                                            const isExpired = (slot.type === 'expiringcatalogpage' || slot.type === 'expiringcatalogpagesmall') && seconds === 0;
                                            const voteOptions = config.voteOptions || [];
                                            const voteTotal = voteOptions.reduce((total, option) => total + (config.voteCounts?.[String(option.id)] || 0), 0);
                                            const countdown = seconds === null ? null : getCountdownParts(seconds);

                                            return <>
                                        {slot.title && <h2>{slot.title}</h2>}
                                        {slot.body && <p>{slot.body}</p>}
                                        {slot.type === 'bonus' && <div className="hotelview-progress"><span style={{ width: `${Math.min(100, Math.max(0, slot.progress))}%` }} /></div>}
                                        {slot.type === 'communitygoal' && <div className="hotelview-progress hotelview-community-progress" aria-label={`${voteTotal} votes`}>{voteOptions.slice(0, 2).map((option, index) => <span key={option.id} className={`hotelview-community-progress-option-${index + 1}`} style={{ width: `${voteTotal ? ((config.voteCounts?.[String(option.id)] || 0) / voteTotal) * 100 : 0}%` }} />)}</div>}
                                        {seconds !== null && (slot.type === 'nextlimitedrarecountdown'
                                            ? <strong className="hotelview-countdown hotelview-ltd-countdown">{seconds ? <><span className="hotelview-ltd-countdown-values">{countdown?.days.toString().padStart(2, '0')}:{countdown?.hours.toString().padStart(2, '0')}:{countdown?.minutes.toString().padStart(2, '0')}:{countdown?.seconds.toString().padStart(2, '0')}</span><small>Days Hours Minutes Seconds</small></> : 'Available now'}</strong>
                                            : <strong className="hotelview-countdown">{isExpired ? 'Expired' : (seconds ? formatCountdown(seconds) : 'Available now')}</strong>)}
                                        {slot.progressLabel && <strong>{slot.progressLabel}</strong>}
                                        {slot.type === 'communitygoal'
                                            ? <div className="hotelview-vote-options">{voteOptions.map((option) => <button key={option.id} className={config.userVote === option.id ? 'hotelview-vote-selected' : ''} type="button" disabled={config.userVote !== undefined} onClick={() => SendMessageComposer(new HotelViewLandingVoteComposer(slot.id, option.id))}>{option.label} <span>{config.voteCounts?.[String(option.id)] || 0}</span></button>)}</div>
                                            : <>{slot.buttonText && <button type="button" disabled={isLtdPending || isExpired} onClick={() => handleSlotClick(getCatalogLink(slot))}>{isLtdPending ? 'Coming soon' : slot.buttonText}</button>}{config.secondaryButtonText && <button type="button" onClick={() => handleSlotClick(config.secondaryLink || '')}>{config.secondaryButtonText}</button>}</>}
                                            </>;
                                        })()}
                                    </div>
                                </>}
                                {!slot.enabled && <span>Disabled slot</span>}
                                {landingData.canEdit && <button type="button" className="hotelview-slot-drag-handle" onPointerDown={(event) => startSlotDrag(event, slot)} onPointerMove={moveSlotDrag} onPointerUp={finishSlotDrag} onPointerCancel={finishSlotDrag} aria-label={`Move slot ${slot.id}`} title="Drag to move">↕</button>}
                                {landingData.canEdit && <button type="button" className="hotelview-slot-edit" onClick={() => { setEditingSlot(slot); setCountdownInput(toEditableCountdownValue(parseSlotConfig(slot.configJson).endsAt)); }} aria-label={`Edit slot ${slot.id}`}>✎</button>}
                            </section>
                        ))}
                    </main>
                    {scene.hallOfFameEnabled && scene.hallOfFameUsers.length > 0 && <div className="hotelview-hall-of-fame" style={getScenePositionStyle('hallOfFame')} aria-label="Hall of Fame">
                        <header>
                            <h2>Hall of Fame</h2>
                            <p>Celebrating the hotel’s standout Habbos</p>
                        </header>
                        {scene.hallOfFameUsers.map((user, index) => <div key={user.id} className="hotelview-hall-of-fame-user" title={user.username}>
                            <LayoutAvatarImageView classNames={['hotelview-hall-of-fame-avatar']} figure={user.figure} gender={user.gender} direction={[2, 4][index % 2]} />
                            <span>{user.username}</span>
                        </div>)}
                        {landingData.canEdit && <button type="button" className="hotelview-hall-of-fame-drag-handle" onPointerDown={(event) => startSceneDrag(event, 'hallOfFame')} onPointerMove={moveSceneDrag} onPointerUp={finishSceneDrag} onPointerCancel={finishSceneDrag} title="Drag Hall of Fame">↕</button>}
                    </div>}
                    {editingSlot && (
                        <form className="hotelview-editor" onSubmit={saveSlot}>
                            <header>Edit slot {editingSlot.id}</header>
                            <div className={`hotelview-editor-preview hotelview-editor-slot-preview${editingSlot.enabled ? '' : ' hotelview-slot-disabled'}`}>
                                <span className="hotelview-editor-preview-label">Preview</span>
                                {editingSlot.imageUrl && <img src={resolveImageUrl(editingSlot.imageUrl, imageLibraryUrl, assetUrl)} alt="" />}
                                <div>
                                    {editingSlot.title && <strong>{editingSlot.title}</strong>}
                                    {editingSlot.body && <p>{editingSlot.body}</p>}
                                    {editingSlot.type === 'communitygoal'
                                        ? <div className="hotelview-editor-preview-votes">{(parseSlotConfig(editingSlot.configJson).voteOptions || []).slice(0, 2).map((option) => <button key={option.id} type="button">{option.label || `Vote ${option.id}`}</button>)}</div>
                                        : editingSlot.buttonText && <button type="button">{editingSlot.buttonText}</button>}
                                </div>
                                {!editingSlot.enabled && <em>Disabled slot</em>}
                            </div>
                            <label className="hotelview-editor-toggle"><input type="checkbox" checked={editingSlot.enabled} onChange={(event) => setEditingSlot({ ...editingSlot, enabled: event.target.checked })} /><span>Enabled: {editingSlot.enabled ? 'Yes' : 'No'}</span></label>
                            <label>Widget type<select value={editingSlot.type} onChange={(event) => selectSlotWidgetType(event.target.value as IHotelViewLandingSlot['type'])}>{SLOT_WIDGET_TYPES.map((widget) => <option key={widget.value} value={widget.value}>{widget.label}</option>)}</select></label>
                            <label>Title<input value={editingSlot.title} onChange={(event) => setEditingSlot({ ...editingSlot, title: event.target.value })} /></label>
                            <label>Body<textarea value={editingSlot.body} onChange={(event) => setEditingSlot({ ...editingSlot, body: event.target.value })} /></label>
                            <label>Image URL<input value={editingSlot.imageUrl} onChange={(event) => setEditingSlot({ ...editingSlot, imageUrl: event.target.value })} /></label>
                            <label>Button<input value={editingSlot.buttonText} onChange={(event) => setEditingSlot({ ...editingSlot, buttonText: event.target.value })} /></label>
                            <label>Button action<select value={getSelectedAction(editingSlot.link)} onChange={(event) => setEditingSlot({ ...editingSlot, link: event.target.value === CUSTOM_ACTION ? '' : event.target.value })}><option value={CUSTOM_ACTION}>Custom link</option>{HOTEL_VIEW_ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</select></label>
                            <label>Custom link<input value={editingSlot.link} placeholder="navigator/goto/123" onChange={(event) => setEditingSlot({ ...editingSlot, link: event.target.value })} /></label>
                            {['catalogpromo', 'catalogpromosmall', 'expiringcatalogpage', 'expiringcatalogpagesmall', 'nextlimitedrarecountdown'].includes(editingSlot.type) && <label>Catalog page name / ID<input value={parseSlotConfig(editingSlot.configJson).catalogPage || ''} placeholder="limited_rares" onChange={(event) => updateEditingConfig((config) => ({ ...config, catalogPage: event.target.value }))} /></label>}
                            {(editingSlot.type === 'expiringcatalogpage' || editingSlot.type === 'expiringcatalogpagesmall') && <label>Featured catalog slot<input type="number" min="1" value={parseSlotConfig(editingSlot.configJson).featuredSlot || ''} placeholder="Optional" onChange={(event) => updateEditingConfig((config) => ({ ...config, featuredSlot: Number(event.target.value) || undefined }))} /></label>}
                            {editingSlot.type !== 'communitygoal' && <><label>Progress<input type="number" min="0" max="100" value={editingSlot.progress} onChange={(event) => setEditingSlot({ ...editingSlot, progress: Number(event.target.value) })} /></label><label>Progress label<input value={editingSlot.progressLabel} onChange={(event) => setEditingSlot({ ...editingSlot, progressLabel: event.target.value })} /></label></>}
                            {editingSlot.type === 'nextlimitedrarecountdown' && <label className="hotelview-editor-toggle"><input type="checkbox" checked={parseSlotConfig(editingSlot.configJson).useServerLTD !== false} onChange={(event) => updateEditingConfig((config) => ({ ...config, useServerLTD: event.target.checked }))} /><span>Use emulator LTD configuration: {parseSlotConfig(editingSlot.configJson).useServerLTD !== false ? 'Yes' : 'No'}</span></label>}
                            {(editingSlot.type === 'nextlimitedrarecountdown' || editingSlot.type === 'expiringcatalogpage' || editingSlot.type === 'expiringcatalogpagesmall') && <label>Countdown ends<input className="hotelview-countdown-editor-input" value={countdownInput} placeholder="DD/MM/YYYY HH:mm" onChange={(event) => {
                                setCountdownInput(event.target.value);

                                if (editingSlot.type === 'nextlimitedrarecountdown' && event.target.value.trim()) updateEditingConfig((config) => ({ ...config, useServerLTD: false }));
                            }} /></label>}
                            {editingSlot.type === 'communitygoal' && <>
                                <div className="hotelview-vote-rewards">
                                <fieldset className="hotelview-vote-reward-panel"><legend>Vote option 1</legend>
                                    <label>Label<input value={parseSlotConfig(editingSlot.configJson).voteOptions?.[0]?.label || ''} onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [{ ...(config.voteOptions?.[0] || { id: 1 }), label: event.target.value }, config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }] }))} /></label>
                                    <label>Badge code<input value={parseSlotConfig(editingSlot.configJson).voteOptions?.[0]?.badgeCode || ''} placeholder="badge_code" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [{ ...(config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }), badgeCode: event.target.value }, config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }] }))} /></label>
                                    <label>Furni item ID<input type="number" min="1" value={parseSlotConfig(editingSlot.configJson).voteOptions?.[0]?.furniId || ''} placeholder="Optional" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [{ ...(config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }), furniId: event.target.value ? Number(event.target.value) : undefined }, config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }] }))} /></label>
                                    <label>Currency type<input type="number" min="0" value={parseSlotConfig(editingSlot.configJson).voteOptions?.[0]?.currencyType ?? ''} placeholder="0 = pixels" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [{ ...(config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }), currencyType: event.target.value === '' ? undefined : Number(event.target.value) }, config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }] }))} /></label>
                                    <label>Currency quantity<input type="number" min="1" value={parseSlotConfig(editingSlot.configJson).voteOptions?.[0]?.currencyAmount || ''} placeholder="Optional" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [{ ...(config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }), currencyAmount: event.target.value ? Number(event.target.value) : undefined }, config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }] }))} /></label>
                                </fieldset>
                                <fieldset className="hotelview-vote-reward-panel"><legend>Vote option 2</legend>
                                    <label>Label<input value={parseSlotConfig(editingSlot.configJson).voteOptions?.[1]?.label || ''} onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }, { ...(config.voteOptions?.[1] || { id: 2 }), label: event.target.value }] }))} /></label>
                                    <label>Badge code<input value={parseSlotConfig(editingSlot.configJson).voteOptions?.[1]?.badgeCode || ''} placeholder="badge_code" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }, { ...(config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }), badgeCode: event.target.value }] }))} /></label>
                                    <label>Furni item ID<input type="number" min="1" value={parseSlotConfig(editingSlot.configJson).voteOptions?.[1]?.furniId || ''} placeholder="Optional" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }, { ...(config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }), furniId: event.target.value ? Number(event.target.value) : undefined }] }))} /></label>
                                    <label>Currency type<input type="number" min="0" value={parseSlotConfig(editingSlot.configJson).voteOptions?.[1]?.currencyType ?? ''} placeholder="0 = pixels" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }, { ...(config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }), currencyType: event.target.value === '' ? undefined : Number(event.target.value) }] }))} /></label>
                                    <label>Currency quantity<input type="number" min="1" value={parseSlotConfig(editingSlot.configJson).voteOptions?.[1]?.currencyAmount || ''} placeholder="Optional" onChange={(event) => updateEditingConfig((config) => ({ ...config, voteOptions: [config.voteOptions?.[0] || { id: 1, label: 'Vote option 1' }, { ...(config.voteOptions?.[1] || { id: 2, label: 'Vote option 2' }), currencyAmount: event.target.value ? Number(event.target.value) : undefined }] }))} /></label>
                                </fieldset>
                                </div>
                                <button className="hotelview-reset-votes" type="button" onClick={() => resetCommunityGoalVotes(editingSlot.id)}>Reset all community votes</button>
                            </>}
                            {editingSlot.type !== 'communitygoal' && <>
                                <label>Secondary button<input value={parseSlotConfig(editingSlot.configJson).secondaryButtonText || ''} onChange={(event) => updateEditingConfig((config) => ({ ...config, secondaryButtonText: event.target.value }))} /></label>
                                <label>Secondary action<select value={getSelectedAction(parseSlotConfig(editingSlot.configJson).secondaryLink || '')} onChange={(event) => updateEditingConfig((config) => ({ ...config, secondaryLink: event.target.value === CUSTOM_ACTION ? '' : event.target.value }))}><option value={CUSTOM_ACTION}>Custom link</option>{HOTEL_VIEW_ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</select></label>
                                <label>Secondary custom link<input value={parseSlotConfig(editingSlot.configJson).secondaryLink || ''} onChange={(event) => updateEditingConfig((config) => ({ ...config, secondaryLink: event.target.value }))} /></label>
                            </>}
                            <footer><button type="button" onClick={() => { setEditingSlot(null); setCountdownInput(''); }}>Cancel</button><button type="submit">Save</button></footer>
                        </form>
                    )}
                    {editingScene && (
                        <form className="hotelview-editor hotelview-scene-editor" onSubmit={saveScene}>
                            <header>Edit HotelView images</header>
                            <div className="hotelview-editor-preview hotelview-editor-scene-preview">
                                <span className="hotelview-editor-preview-label">Background preview</span>
                                <div className="hotelview-editor-scene-canvas" style={{ backgroundImage: editingScene.backgroundUrl ? `url(${resolveImageUrl(editingScene.backgroundUrl, imageLibraryUrl, assetUrl)})` : undefined }}>
                                    {editingScene.leftUrl && <img className="hotelview-editor-scene-left" src={resolveImageUrl(editingScene.leftUrl, imageLibraryUrl, assetUrl)} alt="" />}
                                    {editingScene.drapeUrl && <img className="hotelview-editor-scene-drape" src={resolveImageUrl(editingScene.drapeUrl, imageLibraryUrl, assetUrl)} alt="" />}
                                    {editingScene.rightUrl && <img className="hotelview-editor-scene-right" src={resolveImageUrl(editingScene.rightUrl, imageLibraryUrl, assetUrl)} alt="" />}
                                </div>
                            </div>
                            <label>Background URL<input value={editingScene.backgroundUrl} onChange={(event) => setEditingScene({ ...editingScene, backgroundUrl: event.target.value })} /></label>
                            <label>Drape URL<input value={editingScene.drapeUrl} onChange={(event) => setEditingScene({ ...editingScene, drapeUrl: event.target.value })} /></label>
                            <label>Left image URL<input value={editingScene.leftUrl} onChange={(event) => setEditingScene({ ...editingScene, leftUrl: event.target.value })} /></label>
                            <label>Right image URL<input value={editingScene.rightUrl} onChange={(event) => setEditingScene({ ...editingScene, rightUrl: event.target.value })} /></label>
                            <label className="hotelview-editor-toggle"><input type="checkbox" checked={editingScene.hallOfFameEnabled} onChange={(event) => setEditingScene({ ...editingScene, hallOfFameEnabled: event.target.checked })} /><span>Hall of Fame: {editingScene.hallOfFameEnabled ? 'Enabled' : 'Disabled'}</span></label>
                            {editingScene.hallOfFameEnabled && <>
                                <label>Hall of Fame ranking<select value={editingScene.hallOfFameMode} onChange={(event) => setEditingScene({ ...editingScene, hallOfFameMode: event.target.value })}><option value="latest_registered">Latest registered users</option><option value="online_time">Most online time</option><option value="achievement_score">Highest achievement score</option><option value="currency">Highest currency balance</option></select></label>
                                {editingScene.hallOfFameMode === 'currency' && <label>Currency type<input type="number" min="0" value={editingScene.hallOfFameCurrencyType} onChange={(event) => setEditingScene({ ...editingScene, hallOfFameCurrencyType: Math.max(0, Number(event.target.value) || 0) })} /></label>}
                            </>}
                            <footer><button type="button" onClick={() => setEditingScene(null)}>Cancel</button><button type="submit">Save</button></footer>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
