import {
    FurnitureType,
    IWiredTradeNode,
    IWiredTradeRule,
    WIRED_TRADE_NODE_FURNI,
    WIRED_TRADE_STATE_ADDING_ITEMS,
    WIRED_TRADE_STATE_CONFIRMING,
    WIRED_TRADE_STATE_COUNTDOWN,
} from '@octane/renderer';
import { FC, Fragment, useMemo, useState } from 'react';
import { GroupItem, localizeWithFallback, ProductImageUtility } from '../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutGridItem, Text } from '../../../../common';
import { useInventoryFurni, useWiredTrading } from '../../../../hooks';

/** The window has room for nine, the same as the trade it is modelled on. */
const MAX_ITEMS_ON_TABLE = 9;

const CONTRACT_TITLES = [
    'inventory.wired_trading.payment',
    'inventory.wired_trading.trade',
    'inventory.wired_trading.payment',
    'inventory.wired_trading.chest_deposit',
];
const CONTRACT_FALLBACKS = ['Payment', 'Trade', 'Payment', 'Fill the chest'];

/** A table opened to fill a chest: nothing is required of the player, and nothing comes back. */
const CONTRACT_TYPE_CHEST_DEPOSIT = 3;

/**
 * The negotiation a wired contract opens: what you offer on one side, what you receive on the other,
 * and a bubble spelling out which combinations the contract will accept.
 *
 * <p>It lives inside the inventory rather than in a window of its own because items are dragged into
 * it — the same reason the ordinary trade lives here.
 */
export const InventoryWiredTradeView: FC<{}> = () => {
    const {
        contractType,
        rewardText,
        giveRules,
        rewardRule,
        showRequirements,
        setShowRequirements,
        state,
        canAccept,
        secondsLeft,
        countdown,
        offeredItems,
        rewardFurni,
        rewardCurrency,
        missing,
        offerItems,
        withdrawItem,
        progress,
        cancel,
    } = useWiredTrading();

    const isChestDeposit = contractType === CONTRACT_TYPE_CHEST_DEPOSIT;

    const { groupItems = [] } = useInventoryFurni();
    const [selected, setSelected] = useState<GroupItem>(null);
    const [quantity, setQuantity] = useState(1);

    const canChangeOffer = state === WIRED_TRADE_STATE_ADDING_ITEMS;
    const waitingOnCountdown = state === WIRED_TRADE_STATE_COUNTDOWN && countdown > 0;
    const requirementsMet = !missing.length;

    const clock = useMemo(() => {
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        return `${ minutes }:${ seconds < 10 ? '0' : '' }${ seconds }`;
    }, [secondsLeft]);

    /** How many more the table will take. The server holds the same ceiling, so asking for more
     * than this would simply be dropped on the other side without explanation. */
    const roomLeft = Math.max(0, MAX_ITEMS_ON_TABLE - offeredItems.length);

    const put = (group: GroupItem, count: number) => {
        if (!canChangeOffer || !group || roomLeft <= 0) return;

        const wanted = Math.min(Math.max(1, count), group.getUnlockedCount(), roomLeft);
        const items = group.getTradeItems(wanted);

        if (!items || !items.length) return;

        offerItems(items.map((item) => item.id));
    };

    /** Clamp as the field is typed, so the button never carries a number the group cannot honour. */
    const changeQuantity = (value: string) => {
        const parsed = parseInt(value.replace(/\D/g, ''), 10);
        const ceiling = selected ? Math.min(selected.getUnlockedCount(), Math.max(1, roomLeft)) : 1;

        setQuantity(Math.min(Math.max(isNaN(parsed) ? 1 : parsed, 1), ceiling));
    };

    const nodeLabel = (node: IWiredTradeNode) =>
        node.kind === WIRED_TRADE_NODE_FURNI
            ? localizeWithFallback('inventory.wired_trading.node.furni', '%amount%x furni', ['amount'], [String(node.amount)])
            : localizeWithFallback('inventory.wired_trading.node.coins', '%amount%x coins', ['amount'], [String(node.amount)]);

    const renderNode = (node: IWiredTradeNode, key: string) => (
        <span key={key} className="inline-flex items-center gap-1 rounded border border-[#cbcbcb] bg-white px-1 py-[1px]">
            {node.kind === WIRED_TRADE_NODE_FURNI && (
                <img
                    alt=""
                    className="max-h-[20px] max-w-[20px] object-contain"
                    src={ProductImageUtility.getProductImageUrl(
                        node.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
                        node.spriteId,
                        '',
                    )}
                />
            )}
            <span className="text-[11px] tabular-nums">{nodeLabel(node)}</span>
        </span>
    );

    /** Rules are alternatives, so they read with `or` between them and `&` inside one. */
    const renderRule = (rule: IWiredTradeRule, index: number) => (
        <Fragment key={index}>
            {index > 0 && (
                <div className="text-[10px] uppercase tracking-wide text-[#8c877d]">
                    {localizeWithFallback('inventory.wired_trading.requirements.or', 'or')}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-1">
                {rule.nodes.map((node, position) => (
                    <Fragment key={position}>
                        {position > 0 && <span className="text-[11px] text-[#8c877d]">&amp;</span>}
                        {renderNode(node, `${ index }-${ position }`)}
                    </Fragment>
                ))}
            </div>
        </Fragment>
    );

    const acceptLabel = () => {
        if (waitingOnCountdown) {
            return localizeWithFallback('inventory.trading.countdown', 'Wait %counter%', ['counter'], [String(countdown)]);
        }
        if (state === WIRED_TRADE_STATE_CONFIRMING || state === WIRED_TRADE_STATE_COUNTDOWN) {
            return localizeWithFallback('inventory.wired_trading.confirm', 'Confirm');
        }
        return localizeWithFallback('inventory.trading.accept', 'Accept');
    };

    return (
        <Column overflow="hidden" gap={1}>
            <div className="flex items-center justify-between gap-2">
                <Text bold>
                    {localizeWithFallback(
                        CONTRACT_TITLES[contractType] ?? CONTRACT_TITLES[0],
                        CONTRACT_FALLBACKS[contractType] ?? CONTRACT_FALLBACKS[0],
                    )}
                </Text>
                <div className="flex items-center gap-2">
                    {secondsLeft > 0 && secondsLeft < 120 && (
                        <span className="text-[11px] tabular-nums text-[#96631f]">
                            {localizeWithFallback('inventory.wired_trading.seconds_left', 'Time left %time%', ['time'], [clock])}
                        </span>
                    )}
                    {!isChestDeposit && (
                        <Button variant="secondary" onClick={() => setShowRequirements(!showRequirements)}>
                            {localizeWithFallback('inventory.wired_trading.requirements.title', 'Requirements')}
                        </Button>
                    )}
                </div>
            </div>

            {showRequirements && !isChestDeposit && (
                <div className="rounded border border-[#b9b3a5] bg-[#f7f5ee] p-2 flex flex-col gap-1">
                    <Text small bold>
                        {localizeWithFallback('inventory.wired_trading.requirements.offering', 'You give')}
                    </Text>
                    {giveRules.map(renderRule)}
                    {!!rewardRule && (
                        <>
                            <Text small bold>
                                {localizeWithFallback('inventory.wired_trading.requirements.receiving', 'You receive')}
                            </Text>
                            {renderRule(rewardRule, 0)}
                        </>
                    )}
                    <div className={`text-[11px] ${ requirementsMet ? 'text-[#4a7237]' : 'text-[#8f3527]' }`}>
                        {requirementsMet
                            ? localizeWithFallback('inventory.wired_trading.requirements.indicator.met', 'Requirements met')
                            : localizeWithFallback('inventory.wired_trading.requirements.indicator.not_met', 'Requirements not met')}
                    </div>
                    {!!rewardText && <div className="text-[11px] text-[#6b6659]">{rewardText}</div>}
                </div>
            )}

            <Grid overflow="hidden">
                <Column overflow="hidden" size={4}>
                    <Text small>{localizeWithFallback('inventory.wired_trading.your_inventory', 'Your furni')}</Text>
                    <AutoGrid columnCount={3}>
                        {groupItems.map((group, index) => (
                            <LayoutGridItem
                                key={index}
                                itemActive={selected === group}
                                itemCount={group.getUnlockedCount()}
                                itemImage={group.iconUrl}
                                onClick={() => {
                                    setSelected(group);
                                    setQuantity(1);
                                }}
                                onDoubleClick={() => put(group, 1)}
                            />
                        ))}
                    </AutoGrid>
                    <Flex gap={1} alignItems="center">
                        <input
                            className="form-control form-control-sm w-[52px] text-center"
                            disabled={!canChangeOffer || !selected}
                            inputMode="numeric"
                            type="text"
                            value={quantity}
                            onChange={(event) => changeQuantity(event.target.value)}
                        />
                        <Button
                            disabled={!canChangeOffer || !selected || roomLeft <= 0}
                            variant="secondary"
                            onClick={() => put(selected, quantity)}
                        >
                            {localizeWithFallback('inventory.wired_trading.put_on_table', 'Offer')}
                        </Button>
                        <Button
                            disabled={!canChangeOffer || !selected || roomLeft <= 0}
                            variant="secondary"
                            onClick={() => put(selected, roomLeft)}
                        >
                            {localizeWithFallback('inventory.wired_trading.put_all', 'All')}
                        </Button>
                    </Flex>
                    {!!selected && roomLeft <= 0 && (
                        <div className="text-[11px] text-[#8f3527]">
                            {localizeWithFallback('inventory.wired_trading.table_full', 'The table is full.')}
                        </div>
                    )}
                </Column>

                <Column overflow="hidden" size={isChestDeposit ? 8 : 4}>
                    <Text small>
                        {isChestDeposit
                            ? localizeWithFallback('inventory.wired_trading.depositing', 'Going into the chest')
                            : localizeWithFallback('inventory.wired_trading.offering', 'You offer')}
                    </Text>
                    <AutoGrid columnCount={3}>
                        {Array.from(Array(MAX_ITEMS_ON_TABLE), (unused, index) => {
                            const item = offeredItems[index] ?? null;

                            if (!item) return <LayoutGridItem key={index} />;

                            return (
                                <LayoutGridItem
                                    key={index}
                                    itemImage={ProductImageUtility.getProductImageUrl(
                                        item.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
                                        item.spriteId,
                                        '',
                                    )}
                                    onDoubleClick={() => canChangeOffer && withdrawItem(item.itemId)}
                                />
                            );
                        })}
                    </AutoGrid>
                </Column>

                <Column overflow="hidden" size={4} className={isChestDeposit ? 'hidden' : undefined}>
                    <Text small>{localizeWithFallback('inventory.wired_trading.receiving', 'You receive')}</Text>
                    <AutoGrid columnCount={3}>
                        {rewardFurni.map((reward, index) => (
                            <LayoutGridItem
                                key={index}
                                itemCount={reward.amount}
                                itemImage={ProductImageUtility.getProductImageUrl(FurnitureType.FLOOR, reward.spriteId, '')}
                            />
                        ))}
                    </AutoGrid>
                    {rewardCurrency.map((reward, index) => (
                        <div key={index} className="text-[11px] tabular-nums text-[#6b6659]">
                            {localizeWithFallback(
                                'inventory.wired_trading.reward.coins',
                                '%amount% coins',
                                ['amount'],
                                [String(reward.amount)],
                            )}
                        </div>
                    ))}
                </Column>
            </Grid>

            <Flex justifyContent="between" gap={1}>
                <Button variant="danger" onClick={cancel}>
                    {localizeWithFallback('generic.cancel', 'Cancel')}
                </Button>
                {/* A deposit asks for nothing, so the offer always "satisfies" it -- but confirming an
                    empty table would just close the window, which is not what the button promises. */}
                <Button
                    disabled={!canAccept || waitingOnCountdown || (isChestDeposit && !offeredItems.length)}
                    variant="success"
                    onClick={progress}
                >
                    {acceptLabel()}
                </Button>
            </Flex>
        </Column>
    );
};
