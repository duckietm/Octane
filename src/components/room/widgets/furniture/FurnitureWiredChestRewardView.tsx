import { AddLinkEventTracker, CreateLinkEvent, FurnitureType, ILinkEventTracker, IWiredTradeNode, RemoveLinkEventTracker, WIRED_TRADE_NODE_COINS, WIRED_TRADE_NODE_FURNI } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { localizeWithFallback, ProductImageUtility, WIRED_CHEST_REWARD_LINK } from '../../../../api';
import { BaseButton, Button, Column, Flex, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useRoom } from '../../../../hooks';
import { IWiredRewardReceipt, useWiredRewardStore, WIRED_REWARD_MAX_OPEN } from '../../../../hooks/rooms/widgets/wiredRewardStore';
import '../../../../css/room/FurniWindowsCAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/** AIR RewardNotificationView: the frame is 276 px wide. */
const REWARD_WIDTH = 276;

/** AIR RewardNotificationView.hasCreditNode: coins of a reward wait in the earnings window. */
export const wiredRewardHasCredits = (nodes: IWiredTradeNode[]): boolean => (nodes ?? []).some(node => node.type === WIRED_TRADE_NODE_COINS);

/** AIR RewardNotificationController: each further window is pushed 25 px out, alternating sides. */
export const wiredRewardOffset = (index: number): number =>
{
    const slot = index % WIRED_REWARD_MAX_OPEN;

    if(slot <= 0) return 0;

    const step = 25 * Math.trunc((slot + 1) / 2);

    return ((slot + 1) % 2 === 0) ? step : -step;
};

/** `wiredrewards.earnings` is html with one `event:` link (the earnings window); it is drawn as text and a link. */
const EARNINGS_LINK = /^([\s\S]*?)<a\s+href="event:([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*)$/i;

const EarningsText: FC = () =>
{
    const text = localizeWithFallback('wiredrewards.earnings', 'You can claim the credits in the <a href="event:habboUI/open/vault">earnings window</a>');
    const match = EARNINGS_LINK.exec(text);

    if(!match) return <Text small>{ text.replace(/<[^>]+>/g, '') }</Text>;

    return (
        <NativeTextTree>
            <Text small className="octane-wired-chest-reward-earnings">
                { match[1] }
                <BaseButton className="octane-wired-chest-reward-link" onClick={ () => CreateLinkEvent(match[2]) }>{ match[3] }</BaseButton>
                { match[4] }
            </Text>
        </NativeTextTree>
    );
};

const RewardWindow: FC<{ receipt: IWiredRewardReceipt; index: number; onClose: () => void }> = ({ receipt, index, onClose }) =>
{
    const title = localizeWithFallback('wiredrewards.title', 'Rewards');
    const offset = wiredRewardOffset(index);

    return (
        <NativeTextTree>
            <OctaneCardView theme="primary-slim" className="octane-wired-chest-reward" uniqueKey={ `wired-reward-${ receipt.id }` } offsetLeft={ offset } offsetTop={ offset } style={ { width: REWARD_WIDTH } }>
                <OctaneCardHeaderView headerText={ title } onCloseClick={ onClose } />
                <OctaneCardContentView>
                    <Column gap={ 2 }>
                        <Text>{ receipt.text || localizeWithFallback('wiredrewards.desc_default', 'Congratulations! You received some stuff :)') }</Text>
                        <Flex gap={ 2 } className="flex-wrap">
                            { receipt.nodes.map((node, position) =>
                                // AIR onClickNode: coins open the earnings window, furni the inventory.
                                <BaseButton key={ position } className="octane-wired-chest-reward-node" aria-label={ `${ node.amount }` }
                                    onClick={ () => CreateLinkEvent(node.type === WIRED_TRADE_NODE_COINS ? 'habboUI/open/vault' : 'inventory/show') }>
                                    { node.type === WIRED_TRADE_NODE_FURNI && node.itemType
                                        ? <img alt="" width={ 40 } height={ 40 } src={ ProductImageUtility.getProductImageUrl(node.itemType.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR, node.itemType.typeId, node.itemType.legacyPosterId) } />
                                        : <LayoutCurrencyIcon type={ -1 } /> }
                                    <Text bold>{ node.amount }</Text>
                                </BaseButton>) }
                        </Flex>
                        { wiredRewardHasCredits(receipt.nodes) && <EarningsText /> }
                        <Button onClick={ onClose }>{ localizeWithFallback('wiredrewards.ok', 'Yayy') }</Button>
                    </Column>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};

/**
 * The reward popups of WiredTransactionSuccess (type 2), after AIR RewardNotificationController / RewardNotificationView:
 * every reward keeps its id, up to ten windows are open at once, a reward that opens by itself does, and the others
 * open from their own notification (`wiredchestreward/open/<id>`). They belong to the room they arrived in.
 */
export const FurnitureWiredChestRewardView: FC = () =>
{
    const { roomSession = null } = useRoom();
    const roomId = roomSession?.roomId ?? -1;
    const receipts = useWiredRewardStore(state => state.receipts);
    const open = useWiredRewardStore(state => state.open);

    useEffect(() =>
    {
        useWiredRewardStore.getState().clear();
    }, [ roomId ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                if(!url.startsWith(WIRED_CHEST_REWARD_LINK)) return;

                const id = Number(url.substring(WIRED_CHEST_REWARD_LINK.length + 1));

                if(Number.isInteger(id) && id > 0) useWiredRewardStore.getState().openReward(id);
            },
            eventUrlPrefix: 'wiredchestreward/',
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if(roomId === -1) return null;

    return (
        <>
            { open.map((id, index) => receipts[id] &&
                <RewardWindow key={ id } receipt={ receipts[id] } index={ index } onClose={ () => useWiredRewardStore.getState().closeReward(id) } />) }
        </>
    );
};
