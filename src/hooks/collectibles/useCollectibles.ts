import {
    AddLinkEventTracker,
    ClaimCollectibleRewardsComposer,
    ClaimCollectionBonusComposer,
    ClaimCollectionRewardComposer,
    CollectibleClaimAllResultEvent,
    CollectibleCollectionData,
    CollectibleCollectionsEvent,
    CollectibleEmeraldBalanceEvent,
    CollectibleInventoryItemData,
    CollectibleMintableData,
    CollectibleMintingEnabledEvent,
    CollectibleMintResultEvent,
    CollectibleMintTokenOfferData,
    CollectibleMintTokenOffersEvent,
    CollectibleMintTokensEvent,
    CollectibleMintablesEvent,
    CollectibleProductData,
    CollectiblePurchaseResultEvent,
    CollectibleRewardBoxOpenedEvent,
    CollectibleRewardBoxResultEvent,
    CollectibleRewardClaimData,
    CollectibleRewardClaimsEvent,
    CollectibleShopOfferData,
    CollectibleShopOffersEvent,
    CollectibleSilverBalanceEvent,
    CollectibleTransferFeeEvent,
    CollectibleTransferResultEvent,
    CollectibleWalletsEvent,
    CollectiblesInventoryEvent,
    CollectiblesInventoryUpdateEvent,
    CollectionBonusClaimResultEvent,
    CollectionRewardClaimResultEvent,
    CollectorScoreEvent,
    GetCollectibleCollectionsComposer,
    GetCollectibleRewardClaimsComposer,
    GetCollectibleShopComposer,
    GetCollectibleTransferFeeComposer,
    GetCollectibleWalletsComposer,
    GetCollectiblesInventoryComposer,
    GetMintableItemsComposer,
    GetMintingEnabledComposer,
    GetMintTokenOffersComposer,
    GetMintTokensComposer,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    MintCollectibleComposer,
    NftEmeraldConvertResultEvent,
    OpenCollectibleRewardBoxComposer,
    PurchaseCollectibleComposer,
    PurchaseMintTokensComposer,
    RemoveLinkEventTracker,
    RoomEngineTriggerWidgetEvent,
    SelectCollectibleWalletComposer,
    TransferCollectiblesComposer
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, IsOwnerOfFurniture, LocalizeBadgeName, localizeWithFallback, NotificationBubbleType, SendMessageComposer } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useNotification } from '../notification';
import { applyCollectiblesUpdate, COLLECTIBLES_LINK_PREFIX, collectibleProductName, CollectiblesTab, PendingClaims, rarityColor } from './collectibles.helpers';
import curatorStampLarge from '../../assets/images/collectibles/collectables_icon_curator_stamp_large.png';

/** Whether the hotel runs collectibles (`collectibles.enabled`, the server needs `hotel.collectibles.enabled`). */
export const isCollectiblesEnabled = (): boolean => GetConfigurationValue<boolean>('collectibles.enabled', false) === true;

/** `CollectiblesController.getProductName`, against the furnidata and texts of this client. */
export const getCollectibleProductName = (product: CollectibleProductData): string =>
    collectibleProductName(product, {
        floorName: (id) => GetSessionDataManager().getFloorItemData(id)?.name ?? null,
        wallName: (id) => GetSessionDataManager().getWallItemData(id)?.name ?? null,
        badgeName: (code) => LocalizeBadgeName(code),
        localize: (key, fallback) => localizeWithFallback(key, fallback)
    });

export interface CollectorScore {
    score: number;
    highestScore: number;
    level: number;
}

/**
 * The collectibles hub and its data (`CollectiblesController`, `CollectiblesView` and its tabs), the
 * collectibles inventory, reward boxes and emerald furni. Every list is the server's answer to its
 * request, kept as it arrives.
 */
const useCollectiblesStore = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<CollectiblesTab>('rewards');
    const [collectorWallet, setCollectorWallet] = useState('');
    const [wallets, setWallets] = useState<string[]>(null);
    const [emeralds, setEmeralds] = useState(0);
    const [silver, setSilver] = useState(0);
    const [score, setScore] = useState<CollectorScore>({ score: 0, highestScore: 0, level: 0 });
    const [collections, setCollections] = useState<CollectibleCollectionData[]>(null);
    const [pendingClaims, setPendingClaims] = useState<Record<string, PendingClaims>>({});
    const [shopOffers, setShopOffers] = useState<CollectibleShopOfferData[]>(null);
    const [purchasePending, setPurchasePending] = useState(false);
    const [inventory, setInventory] = useState<CollectibleInventoryItemData[]>(null);
    const [rewardClaims, setRewardClaims] = useState<CollectibleRewardClaimData[]>(null);
    const [claimAllPending, setClaimAllPending] = useState(false);
    const [transferFee, setTransferFee] = useState<number>(null);
    const [transferPending, setTransferPending] = useState(false);
    const [mintingEnabled, setMintingEnabled] = useState(false);
    const [mintables, setMintables] = useState<CollectibleMintableData[]>(null);
    const [mintTokenOffers, setMintTokenOffers] = useState<CollectibleMintTokenOfferData[]>([]);
    const [mintTokens, setMintTokens] = useState<number>(null);
    const [mintPending, setMintPending] = useState(false);
    const [rewardQueue, setRewardQueue] = useState<CollectibleProductData[]>([]);
    const purchaseNameRef = useRef('');
    const visibleRef = useRef(false);

    useEffect(() => {
        visibleRef.current = isVisible;
    }, [isVisible]);
    const { simpleAlert = null, showSingleBubble = null, showConfirm = null } = useNotification();

    const activeWallet = wallets && wallets.length ? wallets[0] : null;

    const notify = useCallback(
        (message: string) => showSingleBubble?.(message, NotificationBubbleType.INFO, curatorStampLarge),
        [showSingleBubble]
    );

    const requestWalletData = useCallback((wallet: string) => {
        SendMessageComposer(new SelectCollectibleWalletComposer(wallet));
        SendMessageComposer(new GetCollectibleCollectionsComposer(wallet));
        SendMessageComposer(new GetCollectibleRewardClaimsComposer(wallet));
        if (GetConfigurationValue<boolean>('nft.minting.enabled', false)) SendMessageComposer(new GetMintTokensComposer(wallet));
    }, []);

    /** `CollectiblesView` constructor: every tab asks for its data when the hub opens. */
    const openHub = useCallback((tab: CollectiblesTab = null) => {
        if (!isCollectiblesEnabled()) return;

        if (tab) setCurrentTab(tab);
        setIsVisible(true);
        SendMessageComposer(new GetCollectibleWalletsComposer());
        if (GetConfigurationValue<boolean>('nft.shop.enabled', false)) SendMessageComposer(new GetCollectibleShopComposer());
        if (GetConfigurationValue<boolean>('collectibles.transfer.enabled', false)) SendMessageComposer(new GetCollectibleTransferFeeComposer());
        if (GetConfigurationValue<boolean>('nft.minting.enabled', false)) {
            SendMessageComposer(new GetMintableItemsComposer());
            SendMessageComposer(new GetMintingEnabledComposer());
            SendMessageComposer(new GetMintTokenOffersComposer());
        }
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                if (parts[1] === 'open') openHub((parts[2] as CollectiblesTab) || null);
                if (parts[1] === 'close') setIsVisible(false);
                if (parts[1] === 'toggle') {
                    if (visibleRef.current) setIsVisible(false);
                    else openHub();
                }
            },
            eventUrlPrefix: COLLECTIBLES_LINK_PREFIX
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [openHub]);

    useMessageEvent<CollectibleWalletsEvent>(CollectibleWalletsEvent, (event) => {
        const parser = event.getParser();

        setCollectorWallet(parser.collectorWallet);
        setWallets([...parser.wallets]);

        if (parser.wallets.length) requestWalletData(parser.wallets[0]);
    });

    useMessageEvent<CollectibleEmeraldBalanceEvent>(CollectibleEmeraldBalanceEvent, (event) => setEmeralds(event.getParser().amount));

    useMessageEvent<CollectibleSilverBalanceEvent>(CollectibleSilverBalanceEvent, (event) => setSilver(event.getParser().amount));

    useMessageEvent<CollectorScoreEvent>(CollectorScoreEvent, (event) => {
        const parser = event.getParser();

        setScore({ score: parser.score, highestScore: parser.highestScore, level: parser.level });
    });

    useMessageEvent<CollectibleCollectionsEvent>(CollectibleCollectionsEvent, (event) => {
        setCollections([...event.getParser().collections]);
        setPendingClaims({});
    });

    const onClaimResult = (collectionId: string, wallet: string, success: boolean) => {
        notify(success
            ? localizeWithFallback('collectibles.claiming.success', 'Reward claimed!')
            : localizeWithFallback('collectibles.claiming.failed', 'Claim failed, please try again.', ['id'], ['']));

        if (wallet && wallet === activeWallet) SendMessageComposer(new GetCollectibleCollectionsComposer(wallet));
        else setPendingClaims((current) => ({ ...current, [collectionId]: { bonus: false, reward: false } }));
    };

    useMessageEvent<CollectionBonusClaimResultEvent>(CollectionBonusClaimResultEvent, (event) => {
        const parser = event.getParser();

        onClaimResult(parser.collectionId, parser.wallet, parser.success);
    });

    useMessageEvent<CollectionRewardClaimResultEvent>(CollectionRewardClaimResultEvent, (event) => {
        const parser = event.getParser();

        onClaimResult(parser.collectionId, parser.wallet, parser.success);
    });

    useMessageEvent<CollectibleShopOffersEvent>(CollectibleShopOffersEvent, (event) => setShopOffers([...event.getParser().offers]));

    useMessageEvent<CollectiblePurchaseResultEvent>(CollectiblePurchaseResultEvent, (event) => {
        setPurchasePending(false);

        if (event.getParser().result === 1) {
            simpleAlert?.(
                localizeWithFallback('notification.nft.purchase.error', 'An error occurred during the payment'),
                null,
                null,
                null,
                localizeWithFallback('catalog.alert.purchaseerror.title', 'Purchase error')
            );
            return;
        }

        const name = purchaseNameRef.current || 'unknown';

        notify(localizeWithFallback('notifications.text.purchase.ok', `Purchased ${name}`, ['productName'], [name]));
    });

    useMessageEvent<CollectiblesInventoryEvent>(CollectiblesInventoryEvent, (event) => setInventory([...event.getParser().items]));

    useMessageEvent<CollectiblesInventoryUpdateEvent>(CollectiblesInventoryUpdateEvent, (event) => {
        const parser = event.getParser();

        setInventory((current) => (current ? applyCollectiblesUpdate(current, parser.added, parser.removed) : current));

        if (activeWallet) SendMessageComposer(new GetCollectibleCollectionsComposer(activeWallet));
    });

    useMessageEvent<CollectibleTransferFeeEvent>(CollectibleTransferFeeEvent, (event) => setTransferFee(event.getParser().amount));

    useMessageEvent<CollectibleTransferResultEvent>(CollectibleTransferResultEvent, (event) => {
        const result = event.getParser().result;

        setTransferPending(false);
        notify(result === 0
            ? localizeWithFallback('collectibles.transfer.success', 'Transfer completed')
            : localizeWithFallback('collectibles.transfer.error', `Something went wrong with the transfer. (Error: ${result})`, ['id'], [String(result)]));

        if (result === 0) SendMessageComposer(new GetCollectibleTransferFeeComposer());
    });

    useMessageEvent<CollectibleRewardClaimsEvent>(CollectibleRewardClaimsEvent, (event) => {
        setRewardClaims(event.getParser().claims.filter((claim) => claim.claimedAmount < claim.claimLimit));
    });

    useMessageEvent<CollectibleClaimAllResultEvent>(CollectibleClaimAllResultEvent, (event) => {
        const success = event.getParser().result === 0;

        setClaimAllPending(false);
        notify(success
            ? localizeWithFallback('collectibles.claiming.success', 'Reward claimed!')
            : localizeWithFallback('collectibles.claiming.failed', 'Claim failed, please try again.', ['id'], [String(event.getParser().result)]));

        if (success) setRewardClaims([]);
    });

    /**
     * `CollectiblesController._rb7f9a9bbfc500a`: a box opened in the room. The opener gets the reward window; anyone
     * else an `nft_opening` bubble with the reward's icon and rarity, as AIR passes them to the notification.
     */
    useMessageEvent<CollectibleRewardBoxOpenedEvent>(CollectibleRewardBoxOpenedEvent, (event) => {
        const parser = event.getParser();

        if (parser.state === 0 || !parser.reward) return;

        if (parser.openerId === GetSessionDataManager().userId) {
            setRewardQueue((queue) => [...queue, parser.reward]);
            return;
        }

        if (!isCollectiblesEnabled()) return;

        showSingleBubble?.(
            localizeWithFallback(
                'collectibles.reward_box.notif.desc',
                `${localizeWithFallback('generic.someone', 'Someone')} received a ${getCollectibleProductName(parser.reward)}`,
                ['name', 'item'],
                [localizeWithFallback('generic.someone', 'Someone'), getCollectibleProductName(parser.reward)]
            ),
            NotificationBubbleType.NFT_OPENING,
            null,
            null,
            '',
            { product: parser.reward, rarity: parser.reward.rarity, rarityColor: rarityColor(parser.reward.rarity) }
        );
    });

    useMessageEvent<CollectibleRewardBoxResultEvent>(CollectibleRewardBoxResultEvent, (event) => {
        const result = event.getParser().result;

        if (result === 1) notify(localizeWithFallback('generic.error', 'Error'));
        if (result === 2) notify(localizeWithFallback('collectibles.reward_box.wrong_wallet', 'To open this reward box, it needs to be in your Collector Wallet.'));
    });

    useMessageEvent<CollectibleMintingEnabledEvent>(CollectibleMintingEnabledEvent, (event) => setMintingEnabled(event.getParser().enabled));

    useMessageEvent<CollectibleMintablesEvent>(CollectibleMintablesEvent, (event) => setMintables([...event.getParser().mintables]));

    useMessageEvent<CollectibleMintTokenOffersEvent>(CollectibleMintTokenOffersEvent, (event) => setMintTokenOffers([...event.getParser().offers]));

    useMessageEvent<CollectibleMintTokensEvent>(CollectibleMintTokensEvent, (event) => setMintTokens(event.getParser().amount));

    useMessageEvent<CollectibleMintResultEvent>(CollectibleMintResultEvent, (event) => {
        setMintPending(false);

        if (event.getParser().result !== 1) notify(localizeWithFallback('shop.minting.failed', 'Collecting failed'));
    });

    useMessageEvent<NftEmeraldConvertResultEvent>(NftEmeraldConvertResultEvent, (event) => {
        const result = event.getParser().result;

        if (result === 0) return;

        notify(result === 5
            ? localizeWithFallback('notification.nft.emerald_convert.not_in_collector', 'To convert this Emerald furni, it needs to be in your Collector Wallet')
            : localizeWithFallback('notification.nft.emerald_convert_failed', 'Converting emeralds failed'));
    });

    const claimCollection = useCallback(
        (collectionId: string, bonus: boolean) => {
            if (!activeWallet) return;

            setPendingClaims((current) => {
                const previous = current[collectionId] ?? { bonus: false, reward: false };

                return { ...current, [collectionId]: bonus ? { ...previous, bonus: true } : { ...previous, reward: true } };
            });

            SendMessageComposer(bonus ? new ClaimCollectionBonusComposer(collectionId, activeWallet) : new ClaimCollectionRewardComposer(collectionId, activeWallet));
        },
        [activeWallet]
    );

    const purchase = useCallback(
        (offer: CollectibleShopOfferData) => {
            if (!offer || purchasePending) return;

            purchaseNameRef.current = getCollectibleProductName(offer.product);
            setPurchasePending(true);
            SendMessageComposer(new PurchaseCollectibleComposer(offer.productCode, activeWallet ?? ''));
        },
        [activeWallet, purchasePending]
    );

    const transfer = useCallback(
        (recipient: string) => {
            if (transferPending || !recipient?.trim().length) return;

            setTransferPending(true);
            SendMessageComposer(new TransferCollectiblesComposer(recipient.trim()));
        },
        [transferPending]
    );

    const claimAllRewards = useCallback(() => {
        if (claimAllPending) return;

        setClaimAllPending(true);
        SendMessageComposer(new ClaimCollectibleRewardsComposer('', ''));
    }, [claimAllPending]);

    const buyMintTokens = useCallback(
        (offer: CollectibleMintTokenOfferData) => {
            if (!offer || !activeWallet || purchasePending) return;

            purchaseNameRef.current = localizeWithFallback('shop.minting.tokens', 'Stamps');
            setPurchasePending(true);
            SendMessageComposer(new PurchaseMintTokensComposer(offer.offerId, activeWallet));
        },
        [activeWallet, purchasePending]
    );

    const mint = useCallback(
        (itemId: number) => {
            if (!activeWallet || mintPending) return;

            setMintPending(true);
            SendMessageComposer(new MintCollectibleComposer(itemId, activeWallet));
        },
        [activeWallet, mintPending]
    );

    const requestInventory = useCallback(() => {
        if (!isCollectiblesEnabled()) return;

        SendMessageComposer(new GetCollectiblesInventoryComposer());
    }, []);

    const openRewardBox = useCallback((objectId: number) => SendMessageComposer(new OpenCollectibleRewardBoxComposer(objectId)), []);

    const dismissReward = useCallback(() => setRewardQueue((queue) => queue.slice(1)), []);

    /** `furniture_nft_reward_box` double-click: the room engine asks to confirm opening the box. */
    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_NFT_REWARD_BOX, (event) => {
        if (!isCollectiblesEnabled()) return;

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject || !IsOwnerOfFurniture(roomObject)) return;

        showConfirm?.(
            localizeWithFallback('collectibles.reward_box.confirm_description', 'Do you want to open this reward box?'),
            () => openRewardBox(event.objectId),
            null,
            null,
            null,
            localizeWithFallback('collectibles.reward_box.confirm_title', 'Open the reward box')
        );
    });

    return {
        isVisible,
        currentTab,
        setCurrentTab,
        closeHub: () => setIsVisible(false),
        openHub,
        collectorWallet,
        wallets,
        activeWallet,
        emeralds,
        silver,
        score,
        collections,
        pendingClaims,
        claimCollection,
        shopOffers,
        purchasePending,
        purchase,
        inventory,
        requestInventory,
        rewardClaims,
        claimAllPending,
        claimAllRewards,
        transferFee,
        transferPending,
        transfer,
        mintingEnabled,
        mintables,
        mintTokenOffers,
        mintTokens,
        mintPending,
        buyMintTokens,
        mint,
        rewardQueue,
        dismissReward,
        openRewardBox
    };
};

export const useCollectibles = () => useSharedHook(useCollectiblesStore);

registerSharedHook(useCollectiblesStore);
