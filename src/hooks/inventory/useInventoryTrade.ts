import {
    AdvancedMap,
    GetSessionDataManager,
    RoomObjectType,
    TradingAcceptComposer,
    TradingAcceptEvent,
    TradingCancelComposer,
    TradingCloseComposer,
    TradingCloseEvent,
    TradingCloseParser,
    TradingCompletedEvent,
    TradingConfirmationComposer,
    TradingConfirmationEvent,
    TradingListItemEvent,
    TradingListItemRemoveComposer,
    TradingNotOpenEvent,
    TradingOpenEvent,
    TradingOpenFailedEvent,
    TradingOtherNotAllowedEvent,
    TradingUnacceptComposer,
    TradingYouAreNotAllowedEvent
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    CloneObject,
    detectTradingNameScam,
    GetRoomSession,
    GroupItem,
    ITradingNameScamWarning,
    LocalizeText,
    parseTradeItems,
    SendMessageComposer,
    TradeState,
    TradeUserData,
    TradingNotificationType
} from '../../api';
import { useMessageEvent } from '../events';
import { useFriends } from '../friends';
import { useNotification } from '../notification';
import { useInventoryFurni } from './useInventoryFurni';

const useInventoryTradeState = () => {
    const [ownUser, setOwnUser] = useState<TradeUserData>(null);
    const [otherUser, setOtherUser] = useState<TradeUserData>(null);
    const [tradeState, setTradeState] = useState(TradeState.TRADING_STATE_READY);
    const [nameScamWarning, setNameScamWarning] = useState<ITradingNameScamWarning>(null);
    const { groupItems = [], setGroupItems = null, activate = null, deactivate = null } = useInventoryFurni();
    const { simpleAlert = null, showTradeAlert = null } = useNotification();
    const { friends = [] } = useFriends();
    const isTrading = tradeState >= TradeState.TRADING_STATE_RUNNING;

    const dismissNameScamWarning = () => setNameScamWarning(null);

    // TradingModel.startTrading: compare the partner's name with every other user in the room
    // (both traders excluded) and with the friend list; a look-alike opens the warning window.
    const detectNameScam = (ownUserId: number, otherUserId: number, otherUserName: string, otherUserFigure: string) => {
        const roomUserNames: string[] = [];

        for (const userData of GetRoomSession()?.userDataManager?.getRoomUserListSnapshot() ?? []) {
            if (!userData || userData.type !== RoomObjectType.USER) continue;

            if (userData.webID === ownUserId || userData.webID === otherUserId || !userData.name) continue;

            roomUserNames.push(userData.name);
        }

        const friendNames = friends.map((friend) => friend.name).filter(Boolean);
        const result = detectTradingNameScam(otherUserName, roomUserNames, friendNames);

        if (!result.nameScamDetected) return null;

        return {
            tradedUserId: otherUserId,
            tradedUserName: otherUserName,
            tradedUserFigure: otherUserFigure ?? '',
            similarInRoom: result.similarInRoom,
            similarInFriends: result.similarInFriends
        } as ITradingNameScamWarning;
    };

    const progressTrade = () => {
        switch (tradeState) {
            case TradeState.TRADING_STATE_RUNNING:
                if (!otherUser.itemCount && !ownUser.accepts) {
                    simpleAlert(LocalizeText('inventory.trading.warning.other_not_offering'), null, null, null);
                }

                if (ownUser.accepts) {
                    SendMessageComposer(new TradingUnacceptComposer());
                } else {
                    SendMessageComposer(new TradingAcceptComposer());
                }
                return;
            case TradeState.TRADING_STATE_CONFIRMING:
                SendMessageComposer(new TradingConfirmationComposer());

                setTradeState(TradeState.TRADING_STATE_CONFIRMED);
                return;
        }
    };

    const removeItem = (group: GroupItem) => {
        const item = group.getLastItem();

        if (!item) return;

        SendMessageComposer(new TradingListItemRemoveComposer(item.id));
    };

    const stopTrading = () => {
        if (!isTrading) return;

        switch (tradeState) {
            case TradeState.TRADING_STATE_RUNNING:
                SendMessageComposer(new TradingCloseComposer());
                return;
            default:
                SendMessageComposer(new TradingCancelComposer());
                return;
        }
    };

    useMessageEvent<TradingAcceptEvent>(TradingAcceptEvent, (event) => {
        const parser = event.getParser();

        if (!ownUser || !otherUser) return;

        if (ownUser.userId === parser.userID) {
            setOwnUser((prevValue) => {
                const newValue = CloneObject(prevValue);

                newValue.accepts = parser.userAccepts;

                return newValue;
            });
        } else if (otherUser.userId === parser.userID) {
            setOtherUser((prevValue) => {
                const newValue = CloneObject(prevValue);

                newValue.accepts = parser.userAccepts;

                return newValue;
            });
        }
    });

    useMessageEvent<TradingCloseEvent>(TradingCloseEvent, (event) => {
        const parser = event.getParser();

        if (parser.reason === TradingCloseParser.ERROR_WHILE_COMMIT) {
            showTradeAlert(TradingNotificationType.ERROR_WHILE_COMMIT);
        } else {
            if (ownUser && parser.userID !== ownUser.userId) {
                showTradeAlert(TradingNotificationType.THEY_CANCELLED);
            }
        }

        setOwnUser(null);
        setOtherUser(null);
        setNameScamWarning(null);
        setTradeState(TradeState.TRADING_STATE_READY);
    });

    useMessageEvent<TradingCompletedEvent>(TradingCompletedEvent, (event) => {
        const parser = event.getParser();

        setOwnUser(null);
        setOtherUser(null);
        setNameScamWarning(null);
        setTradeState(TradeState.TRADING_STATE_READY);
    });

    useMessageEvent<TradingConfirmationEvent>(TradingConfirmationEvent, (event) => {
        const parser = event.getParser();

        setTradeState(TradeState.TRADING_STATE_COUNTDOWN);
    });

    useMessageEvent<TradingListItemEvent>(TradingListItemEvent, (event) => {
        const parser = event.getParser();
        const firstUserItems = parseTradeItems(parser.firstUserItemArray);
        const secondUserItems = parseTradeItems(parser.secondUserItemArray);

        setOwnUser((prevValue) => {
            const newValue = CloneObject(prevValue);

            if (newValue.userId === parser.firstUserID) {
                newValue.creditsCount = parser.firstUserNumCredits;
                newValue.itemCount = parser.firstUserNumItems;
                newValue.userItems = firstUserItems;
            } else {
                newValue.creditsCount = parser.secondUserNumCredits;
                newValue.itemCount = parser.secondUserNumItems;
                newValue.userItems = secondUserItems;
            }

            const tradeIds: number[] = [];

            for (const groupItem of newValue.userItems.getValues()) {
                let i = 0;

                while (i < groupItem.getTotalCount()) {
                    const item = groupItem.getItemByIndex(i);

                    if (item) tradeIds.push(item.ref);

                    i++;
                }
            }

            setGroupItems((prevValue) => {
                const newValue = [...prevValue];

                for (const groupItem of newValue) groupItem.lockItemIds(tradeIds);

                return newValue;
            });

            return newValue;
        });

        setOtherUser((prevValue) => {
            const newValue = CloneObject(prevValue);

            if (newValue.userId === parser.firstUserID) {
                newValue.creditsCount = parser.firstUserNumCredits;
                newValue.itemCount = parser.firstUserNumItems;
                newValue.userItems = firstUserItems;
            } else {
                newValue.creditsCount = parser.secondUserNumCredits;
                newValue.itemCount = parser.secondUserNumItems;
                newValue.userItems = secondUserItems;
            }

            return newValue;
        });
    });

    useMessageEvent<TradingNotOpenEvent>(TradingNotOpenEvent, (event) => {
        const parser = event.getParser();
    });

    useMessageEvent<TradingOpenEvent>(TradingOpenEvent, (event) => {
        const parser = event.getParser();

        const firstUser = new TradeUserData();
        const firstUserData = GetRoomSession().userDataManager.getUserData(parser.userID);

        firstUser.userItems = new AdvancedMap();

        const secondUser = new TradeUserData();
        const secondUserData = GetRoomSession().userDataManager.getUserData(parser.otherUserID);

        secondUser.userItems = new AdvancedMap();

        if (firstUserData.webID === GetSessionDataManager().userId) {
            firstUser.userId = firstUserData.webID;
            firstUser.userName = firstUserData.name;
            firstUser.canTrade = parser.userCanTrade;

            secondUser.userId = secondUserData.webID;
            secondUser.userName = secondUserData.name;
            secondUser.canTrade = parser.otherUserCanTrade;
        } else if (secondUserData.webID === GetSessionDataManager().userId) {
            firstUser.userId = secondUserData.webID;
            firstUser.userName = secondUserData.name;
            firstUser.canTrade = parser.otherUserCanTrade;

            secondUser.userId = firstUserData.webID;
            secondUser.userName = firstUserData.name;
            secondUser.canTrade = parser.userCanTrade;
        }

        setOwnUser(firstUser);
        setOtherUser(secondUser);
        setTradeState(TradeState.TRADING_STATE_RUNNING);

        const otherUserData = firstUser.userId === firstUserData?.webID ? secondUserData : firstUserData;

        setNameScamWarning(detectNameScam(firstUser.userId, secondUser.userId, secondUser.userName, otherUserData?.figure));
    });

    useMessageEvent<TradingOpenFailedEvent>(TradingOpenFailedEvent, (event) => {
        const parser = event.getParser();

        showTradeAlert(parser.reason, parser.otherUserName);
    });

    useMessageEvent<TradingOtherNotAllowedEvent>(TradingOtherNotAllowedEvent, (event) => {
        const parser = event.getParser();

        showTradeAlert(TradingNotificationType.THEY_NOT_ALLOWED);
    });

    useMessageEvent<TradingYouAreNotAllowedEvent>(TradingYouAreNotAllowedEvent, (event) => {
        const parser = event.getParser();

        showTradeAlert(TradingNotificationType.YOU_NOT_ALLOWED);
    });

    useEffect(() => {
        if (tradeState === TradeState.TRADING_STATE_READY) return;

        const id = activate();

        return () => deactivate(id);
    }, [tradeState, activate, deactivate]);

    return {
        ownUser,
        otherUser,
        tradeState,
        setTradeState,
        isTrading,
        groupItems,
        progressTrade,
        removeItem,
        stopTrading,
        nameScamWarning,
        dismissNameScamWarning
    };
};

export const useInventoryTrade = () => useSharedHook(useInventoryTradeState);

registerSharedHook(useInventoryTradeState);
