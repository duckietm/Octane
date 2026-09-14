import {
    AddLinkEventTracker,
    AuthenticatedEvent,
    BuyHabbiconCollectionComposer,
    BuyHabbiconComposer,
    ClaimHabbiconComposer,
    FavoriteHabbiconComposer,
    GetHabbiconInfoComposer,
    GetHabbiconShopDataComposer,
    HabbiconAction,
    HabbiconActionError,
    HabbiconActionResultEvent,
    HabbiconAssetManager,
    HabbiconCollectionData,
    HabbiconData,
    HabbiconInfoEvent,
    HabbiconShopDataEvent,
    HabbiconState,
    RemoveLinkEventTracker,
    UnfavoriteHabbiconComposer,
    UserHabbiconStatusChangedEvent,
    UserHabbiconsEvent
} from '@octane/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    GetConfigurationValue,
    getHabbiconsBaseUrl,
    HabbiconEntry,
    HabbiconSet,
    localizeHabbiconName,
    localizeHabbiconSetDescription,
    localizeHabbiconSetTitle,
    localizeWithFallback,
    NotificationBubbleType,
    SendMessageComposer
} from '../../api';
import { useMessageEvent } from '../events';
import { useInventoryUnseenTracker } from '../inventory/useInventoryUnseenTracker';
import { useNotification } from '../notification';

type HabbiconPurchase = { id: number; collection: boolean };

const useHabbiconCatalogState = () => {
    const enabled = GetConfigurationValue<boolean>('habbicons.enabled', false);
    const baseUrl = getHabbiconsBaseUrl();
    const assetManager = HabbiconAssetManager.getInstance();
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const [collections, setCollections] = useState<HabbiconCollectionData[]>([]);
    const [states, setStates] = useState<Map<number, HabbiconState>>(new Map());
    const [recentIds, setRecentIds] = useState<number[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [bookVisible, setBookVisible] = useState(false);
    const [purchase, setPurchase] = useState<HabbiconPurchase | null>(null);
    const [pending, setPending] = useState<{ action: HabbiconAction; id: number } | null>(null);
    const [error, setError] = useState('');
    const pendingRef = useRef(pending);
    pendingRef.current = pending;
    const hasOwnedSnapshot = useRef(false);
    const notificationSession = useRef(0);
    const statesRef = useRef(states);
    statesRef.current = states;
    const { showSingleBubble } = useNotification();
    const { getCount, resetCategory, resetItems, isUnseen } = useInventoryUnseenTracker();

    const refresh = () => SendMessageComposer(new GetHabbiconShopDataComposer());

    useEffect(() => {
        if (!enabled || (loaded && assetsLoaded) || error) return;

        const timer = setTimeout(() => setError(localizeWithFallback('habbicons.load.failed', 'Habicons could not be loaded. Please try again.')), 10000);
        return () => clearTimeout(timer);
    }, [enabled, loaded, assetsLoaded, error]);

    useEffect(() => {
        if (!enabled || !baseUrl) return;

        let disposed = false;
        void assetManager.preload().then(() => {
            if (!disposed) setAssetsLoaded(true);
        });
        refresh();

        return () => {
            disposed = true;
        };
    }, [enabled, baseUrl, assetManager]);

    useEffect(() => {
        const tracker = {
            eventUrlPrefix: 'habbicons/',
            linkReceived: () => {
                if (enabled) setBookVisible(true);
            }
        };
        AddLinkEventTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, [enabled]);

    useEffect(() => {
        if (!pending) return;

        const timer = setTimeout(() => {
            pendingRef.current = null;
            setPending(null);
            setError(localizeWithFallback('habbicon.purchase.timeout', 'No response received. Please try again.'));
            refresh();
        }, 10000);
        return () => clearTimeout(timer);
    }, [pending]);

    const notifyAcquisition = (habbiconId: number, state: HabbiconState, previous?: HabbiconState) => {
        const storedStates = [HabbiconState.Claimable, HabbiconState.Owned, HabbiconState.Favorite];
        if (!storedStates.includes(state) || (storedStates.includes(previous) && !(previous === HabbiconState.Claimable && state !== HabbiconState.Claimable)))
            return;

        const session = notificationSession.current;
        void assetManager.preload().then(() => {
            if (session !== notificationSession.current) return;

            const entry = entries.find((item) => item.id === habbiconId);
            const name = entry ? localizeHabbiconName({ ...entry, nameKey: assetManager.getNameKey(habbiconId) || entry.nameKey }) : String(habbiconId);
            showSingleBubble(
                localizeWithFallback('notification.new.habbicon', `You received ${name}!`, ['habbicon_name'], [name]),
                NotificationBubbleType.INFO,
                assetManager.getPreviewUrl(habbiconId),
                'habbicons/open'
            );
        });
    };

    useMessageEvent<AuthenticatedEvent>(AuthenticatedEvent, () => {
        if (!enabled) return;

        hasOwnedSnapshot.current = false;
        notificationSession.current++;
        statesRef.current = new Map();
        pendingRef.current = null;
        setStates(statesRef.current);
        setCollections([]);
        setRecentIds([]);
        setLoaded(false);
        setPurchase(null);
        setPending(null);
        setError('');
        refresh();
    });

    useMessageEvent<UserHabbiconsEvent>(UserHabbiconsEvent, (event) => {
        const parser = event.getParser();
        if (hasOwnedSnapshot.current) {
            for (const item of parser.habbicons) notifyAcquisition(item.habbiconId, item.state, statesRef.current.get(item.habbiconId));
        }
        hasOwnedSnapshot.current = true;
        statesRef.current = new Map(parser.habbicons.map((item) => [item.habbiconId, item.state]));
        setStates(statesRef.current);
        setRecentIds(parser.recentHabbiconIds);
    });

    useMessageEvent<UserHabbiconStatusChangedEvent>(UserHabbiconStatusChangedEvent, (event) => {
        const { habbiconId, state } = event.getParser();
        const previous = statesRef.current.get(habbiconId);
        statesRef.current = new Map(statesRef.current).set(habbiconId, state);
        setStates(statesRef.current);
        notifyAcquisition(habbiconId, state, previous);
    });

    useMessageEvent<HabbiconShopDataEvent>(HabbiconShopDataEvent, (event) => {
        setCollections(event.getParser().collections);
        setLoaded(true);
    });

    useMessageEvent<HabbiconInfoEvent>(HabbiconInfoEvent, (event) => {
        const item = event.getParser().habbicon;
        setCollections((current) =>
            current.map((collection) =>
                collection.collectionId === item.collectionId
                    ? { ...collection, habbicons: collection.habbicons.map((existing) => (existing.habbiconId === item.habbiconId ? item : existing)) }
                    : collection
            )
        );
        statesRef.current = new Map(statesRef.current).set(item.habbiconId, item.state);
        setStates(statesRef.current);
    });

    useMessageEvent<HabbiconActionResultEvent>(HabbiconActionResultEvent, (event) => {
        const result = event.getParser();
        if (pendingRef.current?.action !== result.action || pendingRef.current?.id !== result.id) return;

        pendingRef.current = null;
        setPending(null);
        if (result.error === HabbiconActionError.None) {
            setPurchase(null);
            setError('');
        } else {
            const messages = [
                'Unavailable',
                'This Habicon is unavailable.',
                'You do not have enough credits.',
                'You do not have enough activity points.',
                'This Habicon cannot be claimed or purchased yet.',
                'The action failed. Please try again.'
            ];
            setError(localizeWithFallback(`habbicon.error.${result.error}`, messages[result.error] || messages[5]));
        }
        refresh();
    });

    const sets = useMemo<HabbiconSet[]>(
        () =>
            collections.map((collection) => {
                const toEntry = (item: HabbiconData, isReward = false): HabbiconEntry => {
                    const state = states.get(item.habbiconId) ?? item.state;
                    return {
                        id: item.habbiconId,
                        dir: assetManager.getDirection(item.habbiconId),
                        nameKey: assetManager.getNameKey(item.habbiconId) || item.name,
                        collectionId: collection.collectionId,
                        state,
                        owned: state === HabbiconState.Owned || state === HabbiconState.Favorite,
                        favorite: state === HabbiconState.Favorite,
                        claimable: state === HabbiconState.Claimable,
                        purchasable: !isReward && state === HabbiconState.NotOwned && (item.priceCredits > 0 || item.priceActivityPoints > 0),
                        isReward,
                        priceCredits: item.priceCredits,
                        priceActivityPoints: item.priceActivityPoints,
                        activityPointType: item.activityPointType
                    };
                };
                const entries = collection.habbicons.map((item) => toEntry(item));
                const completed = entries.filter((item) => item.owned || item.claimable).length;
                const reward =
                    collection.rewardHabbiconId > 0
                        ? toEntry(
                              {
                                  habbiconId: collection.rewardHabbiconId,
                                  collectionId: collection.collectionId,
                                  name: '',
                                  state: collection.rewardState,
                                  priceCredits: 0,
                                  priceActivityPoints: 0,
                                  activityPointType: 0
                              },
                              true
                          )
                        : null;
                return {
                    id: String(collection.collectionId),
                    collectionId: collection.collectionId,
                    title: localizeHabbiconSetTitle(collection.name),
                    description: localizeHabbiconSetDescription(collection.name),
                    entries,
                    reward,
                    completed,
                    total: entries.length,
                    priceCredits: collection.priceCredits,
                    priceActivityPoints: collection.priceActivityPoints,
                    activityPointType: collection.activityPointType,
                    canBuy: (collection.priceCredits > 0 || collection.priceActivityPoints > 0) && !collection.completed
                };
            }),
        [collections, assetsLoaded, assetManager, states]
    );
    const assetError = useMemo(
        () =>
            assetsLoaded &&
            collections.some(
                (collection) =>
                    !assetManager.getCollectionIconUrl(collection.collectionId) ||
                    collection.habbicons.some((item) => !assetManager.getPreviewUrl(item.habbiconId)) ||
                    (collection.rewardHabbiconId > 0 && !assetManager.getPreviewUrl(collection.rewardHabbiconId))
            ),
        [assetsLoaded, collections, assetManager]
    );
    const entries = useMemo(() => sets.flatMap((set) => (set.reward ? [...set.entries, set.reward] : set.entries)), [sets]);
    const ownedEntries = useMemo(() => entries.filter((item) => item.owned), [entries]);
    const favoriteIds = useMemo(() => ownedEntries.filter((item) => item.favorite).map((item) => item.id), [ownedEntries]);
    const ownedSets = useMemo(
        () =>
            sets.map((set) => ({ ...set, entries: ownedEntries.filter((item) => item.collectionId === set.collectionId) })).filter((set) => set.entries.length),
        [sets, ownedEntries]
    );
    const lastUsedCollectionId = entries.find((entry) => entry.id === recentIds[0])?.collectionId ?? sets[0]?.collectionId ?? 0;

    const act = (action: HabbiconAction, id: number) => {
        if (pendingRef.current) return;

        setError('');
        const next = { action, id };
        pendingRef.current = next;
        setPending(next);
        const composers = [BuyHabbiconComposer, BuyHabbiconCollectionComposer, ClaimHabbiconComposer, FavoriteHabbiconComposer, UnfavoriteHabbiconComposer];
        SendMessageComposer(new composers[action](id));
    };

    return {
        enabled,
        baseUrl,
        entries,
        ownedEntries,
        sets,
        ownedSets,
        recentIds,
        favoriteIds,
        lastUsedCollectionId,
        loaded: loaded && assetsLoaded,
        assetError,
        bookVisible,
        setBookVisible,
        purchase,
        setPurchase: (value: HabbiconPurchase | null) => {
            setError('');
            setPurchase(value);
        },
        pending,
        error,
        refresh,
        retry: () => {
            setError('');
            refresh();
        },
        unseenCount: getCount(8),
        isUnseen: (id: number) => isUnseen(8, id),
        clearUnseen: (id?: number) => (id === undefined ? resetCategory(8) : resetItems(8, [id])),
        getInfo: (id: number) => SendMessageComposer(new GetHabbiconInfoComposer(id)),
        toggleFavorite: (id: number) => act(favoriteIds.includes(id) ? HabbiconAction.Unfavorite : HabbiconAction.Favorite, id),
        claim: (id: number) => act(HabbiconAction.Claim, id),
        buy: () => {
            if (purchase) act(purchase.collection ? HabbiconAction.BuyCollection : HabbiconAction.Buy, purchase.id);
        }
    };
};

export const useHabbiconCatalog = () => useSharedHook(useHabbiconCatalogState);
registerSharedHook(useHabbiconCatalogState);
