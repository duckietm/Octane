import {
    FurnitureType,
    ItemDataStructure,
    IWiredTradeNode,
    IWiredTradeRule,
    WIRED_TRADE_NODE_FURNI,
    WIRED_TRADE_REQUIREMENT_ANY,
    WIRED_TRADE_REQUIREMENT_ANY_COINS,
    WIRED_TRADE_REQUIREMENT_ANY_FURNI,
    WIRED_TRADE_REQUIREMENT_RULES,
    WIRED_TRADE_RULES_AUTO,
    WIRED_TRADE_RULES_MULTIPLIER,
} from '@octane/renderer';
import { FC, Fragment, useMemo, useState } from 'react';
import { GroupItem, localizeWithFallback, ProductImageUtility } from '../../../../api';
import { AutoGrid, BaseButton, Button, Column, Flex, Grid, LayoutGridItem, Text } from '../../../../common';
import { useInventoryFurni, useWiredTrading } from '../../../../hooks';
import { WIRED_TRADING_STATE_ADDING_ITEMS, WIRED_TRADING_STATE_CONFIRMED, WIRED_TRADING_STATE_CONFIRMING, WIRED_TRADING_STATE_COUNTDOWN } from '../../../../hooks/inventory/useWiredTrading';

/** The window has room for nine, the same as the trade it is modelled on. */
const MAX_ITEMS_ON_TABLE = 9;

/** AIR OfferingRequirementsView anyCoinsText / anyFurniText / anyAllText for the plain requirement types. */
const ANY_REQUIREMENT_TEXTS: Record<number, [string, string]> = {
    [WIRED_TRADE_REQUIREMENT_ANY_COINS]: ['inventory.wired_trading.requirements.donation.coins', 'Any amount of credits'],
    [WIRED_TRADE_REQUIREMENT_ANY_FURNI]: ['inventory.wired_trading.requirements.donation.furni', 'Any amount of furni'],
    [WIRED_TRADE_REQUIREMENT_ANY]: ['inventory.wired_trading.requirements.donation.all', 'Anything'],
};

const itemImage = (item: ItemDataStructure) =>
    ProductImageUtility.getProductImageUrl(item.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR, item.spriteId, '');

/**
 * The wired trade window (AIR inventory/wired_trading): what you offer on one side, what you receive on the other,
 * and a bubble spelling out what the trade requires.
 *
 * <p>It lives inside the inventory rather than in a window of its own because items are dragged into
 * it — the same reason the ordinary trade lives here.
 */
export const InventoryWiredTradeView: FC<{}> = () => {
    const {
        requirementType,
        youGetText,
        giveRules,
        getRule,
        rulesType,
        multiplier,
        showRequirements,
        setShowRequirements,
        state,
        canAccept,
        extra,
        secondsLeft,
        countdown,
        offeredItems,
        rewardItems,
        rewardCredits,
        offerItems,
        withdrawItem,
        progress,
        cancel,
    } = useWiredTrading();

    const hasRules = requirementType === WIRED_TRADE_REQUIREMENT_RULES;
    const hasReceiveSide = !!getRule || !!youGetText || rewardItems.length > 0 || rewardCredits > 0;
    const title = hasRules
        ? (getRule
            ? localizeWithFallback('inventory.wired_trading.trade', 'Trade')
            : localizeWithFallback('inventory.wired_trading.payment', 'Payment'))
        : localizeWithFallback('inventory.wired_trading.chest_deposit', 'Fill the chest');

    const { groupItems = [] } = useInventoryFurni();
    const [selected, setSelected] = useState<GroupItem>(null);
    const [quantity, setQuantity] = useState(1);

    const canChangeOffer = state === WIRED_TRADING_STATE_ADDING_ITEMS;
    const waitingOnCountdown = state === WIRED_TRADING_STATE_COUNTDOWN;

    /** AIR requirement indicator: multiplier rules count the times met, auto rules number a repeated match. */
    const indicatorText = (() => {
        if (rulesType === WIRED_TRADE_RULES_MULTIPLIER) {
            return localizeWithFallback('inventory.wired_trading.requirements.indicator.multi', 'Requirements met %amount%/%times% times',
                ['times', 'amount'], [String(multiplier), String(extra)]);
        }
        if (rulesType === WIRED_TRADE_RULES_AUTO && canAccept && extra > 1) {
            return localizeWithFallback('inventory.wired_trading.requirements.indicator.met_numbered', 'Requirements met %amount% times',
                ['amount'], [String(extra)]);
        }
        return canAccept
            ? localizeWithFallback('inventory.wired_trading.requirements.indicator.met', 'Requirements met')
            : localizeWithFallback('inventory.wired_trading.requirements.indicator.not_met', 'Requirements not met');
    })();

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
        node.type === WIRED_TRADE_NODE_FURNI
            ? localizeWithFallback('inventory.wired_trading.node.furni', '%amount%x furni', ['amount'], [String(node.amount)])
            : localizeWithFallback('inventory.wired_trading.node.coins', '%amount%x coins', ['amount'], [String(node.amount)]);

    const renderNode = (node: IWiredTradeNode, key: string) => (
        <span key={key} className="inline-flex items-center gap-1 rounded border border-[#cbcbcb] bg-white px-1 py-[1px]">
            {node.type === WIRED_TRADE_NODE_FURNI && !!node.itemType && (
                <img
                    alt=""
                    className="max-h-[20px] max-w-[20px] object-contain"
                    src={ProductImageUtility.getProductImageUrl(
                        node.itemType.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
                        node.itemType.typeId,
                        node.itemType.legacyPosterId,
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
        if (state === WIRED_TRADING_STATE_CONFIRMING || state === WIRED_TRADING_STATE_CONFIRMED) {
            return localizeWithFallback('inventory.wired_trading.confirm', 'Confirm');
        }
        return localizeWithFallback('inventory.trading.accept', 'Accept');
    };

    return (
        <Column overflow="hidden" gap={1}>
            <div className="flex items-center justify-between gap-2">
                <Text bold>{title}</Text>
                <div className="flex items-center gap-2">
                    {secondsLeft > 0 && secondsLeft < 120 && (
                        <span className="text-[11px] tabular-nums text-[#96631f]">
                            {localizeWithFallback('inventory.wired_trading.seconds_left', 'Time left %time%', ['time'], [clock])}
                        </span>
                    )}
                    <Button variant="secondary" onClick={() => setShowRequirements(!showRequirements)}>
                        {localizeWithFallback('inventory.wired_trading.requirements.title', 'Requirements')}
                    </Button>
                </div>
            </div>

            {showRequirements && (
                <div className="rounded border border-[#b9b3a5] bg-[#f7f5ee] p-2 flex flex-col gap-1">
                    <Text small bold>
                        {localizeWithFallback('inventory.wired_trading.requirements.offering', 'You give')}
                    </Text>
                    {hasRules
                        ? giveRules.map(renderRule)
                        : (
                            <div className="text-[11px]">
                                {localizeWithFallback(...(ANY_REQUIREMENT_TEXTS[requirementType] ?? ANY_REQUIREMENT_TEXTS[WIRED_TRADE_REQUIREMENT_ANY]))}
                            </div>
                        )}
                    {(!!getRule || !!youGetText) && (
                        <>
                            <Text small bold>
                                {localizeWithFallback('inventory.wired_trading.requirements.receiving', 'You receive')}
                            </Text>
                            {!!getRule && renderRule(getRule, 0)}
                            {!!youGetText && <div className="text-[11px] text-[#6b6659]">{youGetText}</div>}
                        </>
                    )}
                    <div className={`text-[11px] ${ canAccept ? 'text-[#4a7237]' : 'text-[#8f3527]' }`}>
                        {indicatorText}
                    </div>
                </div>
            )}

            <Grid overflow="hidden">
                <Column overflow="hidden" size={4}>
                    <Text small>{localizeWithFallback('inventory.wired_trading.your_inventory', 'Your furni')}</Text>
                    <AutoGrid columnCount={3}>
                        {groupItems.map((group, index) => (
                            <LayoutGridItem
                                key={index}
                                aria-pressed={selected === group}
                                component={BaseButton}
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

                <Column overflow="hidden" size={hasReceiveSide ? 4 : 8}>
                    <Text small>
                        {hasReceiveSide
                            ? localizeWithFallback('inventory.wired_trading.offering', 'You offer')
                            : localizeWithFallback('inventory.wired_trading.depositing', 'Going into the chest')}
                    </Text>
                    <AutoGrid columnCount={3}>
                        {Array.from(Array(MAX_ITEMS_ON_TABLE), (unused, index) => {
                            const item = offeredItems[index] ?? null;

                            if (!item) return <LayoutGridItem key={index} />;

                            return (
                                <LayoutGridItem
                                    key={index}
                                    itemImage={itemImage(item)}
                                    onDoubleClick={() => canChangeOffer && withdrawItem(item.itemId)}
                                />
                            );
                        })}
                    </AutoGrid>
                </Column>

                <Column overflow="hidden" size={4} className={hasReceiveSide ? undefined : 'hidden'}>
                    <Text small>{localizeWithFallback('inventory.wired_trading.receiving', 'You receive')}</Text>
                    <AutoGrid columnCount={3}>
                        {rewardItems.map((item, index) => (
                            <LayoutGridItem key={index} itemImage={itemImage(item)} />
                        ))}
                    </AutoGrid>
                    {rewardCredits > 0 && (
                        <div className="text-[11px] tabular-nums text-[#6b6659]">
                            {localizeWithFallback(
                                'inventory.wired_trading.reward.coins',
                                '%amount% coins',
                                ['amount'],
                                [String(rewardCredits)],
                            )}
                        </div>
                    )}
                </Column>
            </Grid>

            <Flex justifyContent="between" gap={1}>
                <Button variant="danger" onClick={cancel}>
                    {localizeWithFallback('generic.cancel', 'Cancel')}
                </Button>
                <Button
                    disabled={!canAccept || waitingOnCountdown || state === WIRED_TRADING_STATE_CONFIRMED}
                    variant="success"
                    onClick={progress}
                >
                    {acceptLabel()}
                </Button>
            </Flex>
        </Column>
    );
};
