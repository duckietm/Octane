import {
    FurnitureType,
    GetSessionDataManager,
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
import { FC, Fragment, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
    canOfferToWiredTrade,
    FurniCategory,
    groupWiredTradeItems,
    GroupItem,
    isWiredTradePaymentOnly,
    IWiredTradeSlot,
    LocalizeText,
    localizeWithFallback,
    ProductImageUtility,
    SanitizeHtml,
    wiredTradePaymentLayout,
    wiredTradeTimeLeft,
} from '../../../../api';
import { AutoGrid, BaseButton, Button, Column, Flex, LayoutGridItem } from '../../../../common';
import { NumberInput } from '../../../../common/NumberInput';
import { useInventoryFurni, useWiredTrading } from '../../../../hooks';
import {
    WIRED_TRADING_STATE_ADDING_ITEMS,
    WIRED_TRADING_STATE_CONFIRMED,
    WIRED_TRADING_STATE_CONFIRMING,
    WIRED_TRADING_STATE_COUNTDOWN,
} from '../../../../hooks/inventory/useWiredTrading';
import arrowIcon from '../../../../assets/images/inventory/air/trading-arrow-icon.png';
import lockedIcon from '../../../../assets/images/inventory/air/trading-locked-icon.png';
import splitIcon from '../../../../assets/images/inventory/air/trading-split-icon.png';
import unlockedIcon from '../../../../assets/images/inventory/air/trading-unlocked-icon.png';
import gamesPayments from '../../../../assets/images/inventory/air/wired-trading-games-payments.png';
import genericPayments from '../../../../assets/images/inventory/air/wired-trading-generic-payments.png';
import requirementsIcon from '../../../../assets/images/inventory/air/wired-trading-requirements-icon.png';
import requirementsMetIcon from '../../../../assets/images/inventory/air/wired-trading-requirements-met.png';
import requirementsNotMetIcon from '../../../../assets/images/inventory/air/wired-trading-requirements-not-met.png';
import { InventoryFurnitureSearchView } from './InventoryFurnitureSearchView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/** AIR inventory_trading_wired: both grids are 3 x 3 slots of one kind each. */
const GRID_SLOTS = 9;

/** AIR highlights the requirements of a trade that replaced the open one for half a second. */
const REQUIREMENTS_HIGHLIGHT_MS = 500;

const PAYMENT_IMAGES = { generic: genericPayments, games: gamesPayments };

/** AIR OfferingRequirementsView anyCoinsText / anyFurniText / anyAllText for the plain requirement types. */
const ANY_REQUIREMENT_TEXTS: Record<number, [string, string]> = {
    [WIRED_TRADE_REQUIREMENT_ANY_COINS]: ['inventory.wired_trading.requirements.donation.coins', 'Any amount of credits'],
    [WIRED_TRADE_REQUIREMENT_ANY_FURNI]: ['inventory.wired_trading.requirements.donation.furni', 'Any amount of furni'],
    [WIRED_TRADE_REQUIREMENT_ANY]: ['inventory.wired_trading.requirements.donation.all', 'Anything'],
};

const furniClassName = (isWallItem: boolean, typeId: number): string =>
    (isWallItem ? GetSessionDataManager().getWallItemData(typeId) : GetSessionDataManager().getFloorItemData(typeId))?.className ?? '';

/** A table item with its poster id, which the server's trade item does not flag as a poster. */
const tableItem = (item: ItemDataStructure) => ({
    itemId: item.itemId,
    isWallItem: item.isWallItem,
    spriteId: item.spriteId,
    isGroupable: item.isGroupable,
    posterId: item.isWallItem && furniClassName(true, item.spriteId) === 'poster' ? item.stuffData?.getLegacyString() ?? '' : '',
    item,
});

type TableItem = ReturnType<typeof tableItem>;

const tableImage = (entry: TableItem) =>
    ProductImageUtility.getProductImageUrl(
        entry.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
        entry.spriteId,
        entry.isWallItem ? entry.item.stuffData?.getLegacyString() ?? '' : '',
    );

/**
 * The wired trade panel (AIR inventory/wired_trading, layout `inventory_trading_wired`): how anything goes into a
 * chest (a deposit or a donation) and how a contract is paid. It is hosted in the inventory window like a user trade:
 * the furni come from the inventory grid on the left (double click or the offer button with its amount, as AIR's furni
 * view offers them) and land on the table on the right.
 *
 * <p>The table follows AIR's 478 x 274 panel: the info text on top with the requirements button and its bubble at the
 * right, "you offer" (3 x 3 slots) with its item and credit counts, the lock, the splitter, then either "you receive"
 * or, for a payment (every chest deposit), the payment picture, and the accept button with the time left and cancel.
 */
export const InventoryWiredTradeView: FC<{}> = () => {
    const {
        requirementType,
        youGetText,
        layoutType,
        giveRules,
        getRule,
        rulesType,
        multiplier,
        autoMultiplierMax,
        showRequirements,
        setShowRequirements,
        requirementsHighlight,
        state,
        canAccept,
        extra,
        secondsLeft,
        countdown,
        offeredItems,
        offeredCredits,
        rewardItems,
        rewardCredits,
        offerItems,
        withdrawItem,
        progress,
        cancel,
    } = useWiredTrading();
    const { groupItems = [] } = useInventoryFurni();
    const [filteredGroupItems, setFilteredGroupItems] = useState<GroupItem[]>([]);
    const [groupItem, setGroupItem] = useState<GroupItem>(null);
    const [quantity, setQuantity] = useState(1);
    const [ownSlotKey, setOwnSlotKey] = useState('');

    const paymentOnly = isWiredTradePaymentOnly(requirementType, getRule);
    const hasRules = requirementType === WIRED_TRADE_REQUIREMENT_RULES;
    const canChangeOffer = state === WIRED_TRADING_STATE_ADDING_ITEMS;

    // AIR WiredTradingModel.tradeTypeLocalization: a payment (deposit, donation, contract without reward) or a trade.
    const tradeType = paymentOnly
        ? localizeWithFallback('inventory.wired_trading.payment', 'Payment')
        : localizeWithFallback('inventory.wired_trading.trade', 'Trade');
    const tradeTypeLower = tradeType.toLowerCase();

    const candidate = (group: GroupItem) => ({
        className: furniClassName(group.isWallItem, group.type),
        isWallItem: group.isWallItem,
        typeId: group.type,
        posterId: group.category === FurniCategory.POSTER ? group.stuffData?.getLegacyString() ?? '' : '',
        isPoster: group.category === FurniCategory.POSTER,
        unlockedCount: group.getUnlockedCount(),
    });
    const canOffer = (group: GroupItem) => !!group && canOfferToWiredTrade(requirementType, giveRules, candidate(group));

    useEffect(() => {
        setQuantity(1);
    }, [groupItem]);

    // AIR FurniModel.requestSelectedFurniToTrading: the amount is clamped to what the group can still offer.
    const offer = (group: GroupItem, count: number) => {
        if (!canChangeOffer || !canOffer(group)) return;

        const wanted = Math.max(1, Math.min(Number.isFinite(count) ? count : 1, group.getUnlockedCount()));
        const items = group.getTradeItems(wanted);

        if (items.length) offerItems(items.map((item) => item.id));
    };

    const ownSlots = useMemo(() => groupWiredTradeItems(offeredItems.map(tableItem)), [offeredItems]);
    const rewardSlots = useMemo(() => groupWiredTradeItems(rewardItems.map(tableItem)), [rewardItems]);

    const withdrawOne = (key: string) => {
        const slot = ownSlots.find((entry) => entry.key === key);
        const last = slot?.items[slot.items.length - 1];

        if (canChangeOffer && last) withdrawItem(last.itemId);
    };

    // AIR WiredTradeRequirementsView.highlight(): a 500 ms border flash when a replacing trade swaps the requirements.
    const [highlighted, setHighlighted] = useState(false);
    useEffect(() => {
        if (!requirementsHighlight) return;
        setHighlighted(true);
        const handle = window.setTimeout(() => setHighlighted(false), REQUIREMENTS_HIGHLIGHT_MS);
        return () => window.clearTimeout(handle);
    }, [requirementsHighlight]);

    // AIR WiredTradingView.updateStateUI.
    const infoText = (() => {
        if (state === WIRED_TRADING_STATE_COUNTDOWN) {
            return localizeWithFallback('inventory.wired_trading.note.countdown', 'Counting down...');
        }
        if (state === WIRED_TRADING_STATE_CONFIRMING || state === WIRED_TRADING_STATE_CONFIRMED) {
            return localizeWithFallback('inventory.wired_trading.note.verify', `Check that the ${ tradeTypeLower } is right.`, ['type'], [tradeTypeLower]);
        }
        return localizeWithFallback('inventory.wired_trading.note.add_items', `Add items to the ${ tradeTypeLower }`, ['type'], [tradeTypeLower]);
    })();

    const acceptCaption = (() => {
        if (state === WIRED_TRADING_STATE_COUNTDOWN) {
            return localizeWithFallback('inventory.trading.countdown', `Wait... ${ countdown }`, ['counter'], [String(countdown)]);
        }
        if (state === WIRED_TRADING_STATE_CONFIRMING || state === WIRED_TRADING_STATE_CONFIRMED) {
            return localizeWithFallback('inventory.trading.confirm', 'Confirm');
        }
        return localizeWithFallback('inventory.trading.accept', 'Accept');
    })();

    const acceptDisabled = state === WIRED_TRADING_STATE_COUNTDOWN
        || state === WIRED_TRADING_STATE_CONFIRMED
        || (state === WIRED_TRADING_STATE_ADDING_ITEMS && !canAccept);

    const timeLeft = wiredTradeTimeLeft(secondsLeft);

    /** AIR requirement indicator: multiplier rules count the times met, auto rules number a repeated match. */
    const indicatorText = (() => {
        if (rulesType === WIRED_TRADE_RULES_MULTIPLIER) {
            return localizeWithFallback('inventory.wired_trading.requirements.indicator.multi', `Requirements met ${ extra }/${ multiplier } times`,
                ['times', 'amount'], [String(multiplier), String(extra)]);
        }
        if (canAccept && rulesType === WIRED_TRADE_RULES_AUTO && extra > 1) {
            return localizeWithFallback('inventory.wired_trading.requirements.indicator.met_numbered', `Requirements met ${ extra } times`,
                ['amount'], [String(extra)]);
        }
        return canAccept
            ? localizeWithFallback('inventory.wired_trading.requirements.indicator.met', 'Requirements met')
            : localizeWithFallback('inventory.wired_trading.requirements.indicator.not_met', 'Requirements not met');
    })();

    const nodeLabel = (node: IWiredTradeNode) =>
        node.type === WIRED_TRADE_NODE_FURNI
            ? localizeWithFallback('inventory.wired_trading.node.furni', `${ node.amount }x furni`, ['amount'], [String(node.amount)])
            : localizeWithFallback('inventory.wired_trading.node.coins', `${ node.amount }x coins`, ['amount'], [String(node.amount)]);

    const renderNode = (node: IWiredTradeNode, key: string) => (
        <span key={key} className="octane-wired-trade-node">
            {node.type === WIRED_TRADE_NODE_FURNI && !!node.itemType && (
                <img
                    alt=""
                    src={ProductImageUtility.getProductImageUrl(
                        node.itemType.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
                        node.itemType.typeId,
                        node.itemType.legacyPosterId,
                    )}
                />
            )}
            <span>{nodeLabel(node)}</span>
        </span>
    );

    /** Rules are alternatives, so they read with `or` between them and `&` inside one. */
    const renderRule = (rule: IWiredTradeRule, index: number) => (
        <Fragment key={index}>
            {index > 0 && <div className="octane-wired-trade-or">{localizeWithFallback('inventory.wired_trading.requirements.or', 'or')}</div>}
            <div className="octane-wired-trade-rule">
                {rule.nodes.map((node, position) => (
                    <Fragment key={position}>
                        {position > 0 && <span className="octane-wired-trade-and">&amp;</span>}
                        {renderNode(node, `${ index }-${ position }`)}
                    </Fragment>
                ))}
            </div>
        </Fragment>
    );

    // AIR WiredTradeRequirementsView.requirementsUpdated: the "you get" column shows for a trade, or a payment with text.
    const showYouGet = !paymentOnly || !!youGetText;

    const renderSlots = (slots: IWiredTradeSlot<TableItem>[], own: boolean) => (
        <div className="octane-wired-trade-grid">
            {Array.from(Array(GRID_SLOTS), (unused, index) => {
                const slot = slots[index];

                if (!slot) return <div key={index} className="octane-wired-trade-slot" />;

                const active = own && ownSlotKey === slot.key;

                return (
                    <BaseButton
                        key={slot.key}
                        aria-pressed={active}
                        className={`octane-wired-trade-slot is-filled${ active ? ' is-active' : '' }`}
                        style={{ backgroundImage: `url(${ tableImage(slot.items[0]) })` }}
                        onClick={() => own && setOwnSlotKey(slot.key)}
                        onDoubleClick={() => own && withdrawOne(slot.key)}
                    >
                        {slot.items.length > 1 && <span className="octane-wired-trade-slot-count">{slot.items.length}</span>}
                        {active && canChangeOffer && (
                            <span
                                className="octane-wired-trade-slot-remove"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    withdrawOne(slot.key);
                                }}
                            >
                                <FaChevronLeft className="fa-icon" />
                            </span>
                        )}
                    </BaseButton>
                );
            })}
        </div>
    );

    const countTexts = (items: number, credits: number) => (
        <>
            <div className="octane-wired-trade-count is-items">
                {localizeWithFallback('inventory.trading.info.itemcount', `${ items } items`, ['value'], [String(items)])}
            </div>
            <div className="octane-wired-trade-count is-credits">
                {localizeWithFallback('inventory.trading.info.creditvalue', `${ credits } credits`, ['value'], [String(credits)])}
            </div>
        </>
    );

    return (
        <NativeTextTree>
            <div className="octane-wired-trade">
                <Column className="octane-wired-trade-inventory" overflow="hidden" gap={1}>
                    <InventoryFurnitureSearchView groupItems={groupItems} setGroupItems={setFilteredGroupItems} />
                    <Flex column fullHeight gap={2} justifyContent="between" overflow="hidden">
                        <AutoGrid columnCount={3}>
                            {filteredGroupItems.map((group, index) => {
                                const offerable = canOffer(group);
                                const count = group.getUnlockedCount();

                                return (
                                    <LayoutGridItem
                                        key={index}
                                        className={offerable ? '' : 'opacity-50'}
                                        component="div"
                                        itemActive={groupItem === group}
                                        itemCount={count}
                                        itemImage={group.iconUrl}
                                        itemUniqueNumber={group.stuffData.uniqueNumber}
                                        onClick={() => offerable && setGroupItem(group)}
                                        onDoubleClick={() => offer(group, 1)}
                                    >
                                        {offerable && groupItem === group && canChangeOffer && (
                                            <Button
                                                className="bottom-1 inset-e-1 z-[5] min-h-0 text-[8px] px-[2px] py-[1px]"
                                                position="absolute"
                                                variant="success"
                                                onClick={() => offer(group, 1)}
                                            >
                                                <FaChevronRight className="fa-icon" />
                                            </Button>
                                        )}
                                    </LayoutGridItem>
                                );
                            })}
                        </AutoGrid>
                        <Column gap={1}>
                            <Flex gap={1} alignItems="center">
                                <NumberInput
                                    className="octane-wired-trade-amount form-control-sm"
                                    disabled={!canOffer(groupItem) || !canChangeOffer}
                                    min={1}
                                    max={Math.max(1, groupItem?.getUnlockedCount() ?? 1)}
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.valueAsNumber)}
                                />
                                <Button
                                    className="grow"
                                    disabled={!canOffer(groupItem) || !canChangeOffer}
                                    variant="secondary"
                                    onClick={() => offer(groupItem, quantity)}
                                >
                                    {localizeWithFallback('inventory.trading.offer', 'Offer')}
                                </Button>
                            </Flex>
                            <div className="badge bg-muted w-full truncate">{groupItem ? groupItem.name : LocalizeText('catalog_selectproduct')}</div>
                        </Column>
                    </Flex>
                </Column>

                <div className="octane-wired-trade-panel">
                    <div className="octane-wired-trade-container">
                        <div className="octane-wired-trade-info">{infoText}</div>
                        <BaseButton
                            aria-label={localizeWithFallback('inventory.wired_trading.requirements.title', `${ tradeType } requirements`, ['type'], [tradeType])}
                            aria-pressed={showRequirements}
                            className={`octane-wired-trade-requirements-button${ highlighted ? ' is-highlighted' : '' }`}
                            data-highlighted={highlighted ? 'true' : undefined}
                            onClick={() => setShowRequirements(!showRequirements)}
                        >
                            <img alt="" src={requirementsIcon} />
                        </BaseButton>

                        <div className="octane-wired-trade-offers is-own">
                            <div className="octane-wired-trade-title">{localizeWithFallback('inventory.wired_trading.offering', 'You offer')}</div>
                            {renderSlots(ownSlots, true)}
                            {countTexts(offeredItems.length, offeredCredits)}
                        </div>

                        <img alt="" className="octane-wired-trade-lock" src={canChangeOffer ? unlockedIcon : lockedIcon} />
                        <img alt="" className="octane-wired-trade-splitter" src={paymentOnly ? arrowIcon : splitIcon} />

                        {paymentOnly
                            ? (
                                <div className="octane-wired-trade-offers is-payment">
                                    <img alt="" src={PAYMENT_IMAGES[wiredTradePaymentLayout(layoutType)]} />
                                </div>
                            )
                            : (
                                <div className="octane-wired-trade-offers is-receive">
                                    <div className="octane-wired-trade-title">{localizeWithFallback('inventory.wired_trading.receiving', 'You receive')}</div>
                                    {renderSlots(rewardSlots, false)}
                                    {countTexts(rewardItems.length, rewardCredits)}
                                </div>
                            )}

                        {showRequirements && (
                            <div className={`octane-wired-trade-bubble${ highlighted ? ' is-highlighted' : '' }`} role="dialog">
                                <div className="octane-wired-trade-bubble-title">
                                    {localizeWithFallback('inventory.wired_trading.requirements.title', `${ tradeType } requirements`, ['type'], [tradeType])}
                                </div>
                                <div className="octane-wired-trade-bubble-columns">
                                    <div className="octane-wired-trade-bubble-column">
                                        <div className="octane-wired-trade-bubble-heading">
                                            {localizeWithFallback('inventory.wired_trading.requirements.offering', 'You give:')}
                                        </div>
                                        <div className="octane-wired-trade-bubble-definition">
                                            {hasRules
                                                ? giveRules.map(renderRule)
                                                : localizeWithFallback(...(ANY_REQUIREMENT_TEXTS[requirementType] ?? ANY_REQUIREMENT_TEXTS[WIRED_TRADE_REQUIREMENT_ANY]))}
                                        </div>
                                    </div>
                                    {showYouGet && (
                                        <div className="octane-wired-trade-bubble-column">
                                            <div className="octane-wired-trade-bubble-heading">
                                                {localizeWithFallback('inventory.wired_trading.requirements.receiving', 'You receive:')}
                                            </div>
                                            <div className="octane-wired-trade-bubble-definition">
                                                {getRule && getRule.nodes.length > 0 ? renderRule(getRule, 0) : youGetText}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="octane-wired-trade-bubble-met">
                                    <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(indicatorText) }} />
                                    <img alt="" src={canAccept ? requirementsMetIcon : requirementsNotMetIcon} />
                                </div>
                                {rulesType === WIRED_TRADE_RULES_AUTO && (
                                    <div
                                        className="octane-wired-trade-bubble-note"
                                        dangerouslySetInnerHTML={{
                                            __html: SanitizeHtml(localizeWithFallback(
                                                paymentOnly
                                                    ? 'inventory.wired_trading.requirements.auto_mode_hint_payment'
                                                    : 'inventory.wired_trading.requirements.auto_mode_hint_trade',
                                                `You can keep adding items to run this ${ tradeTypeLower } several times (max ${ autoMultiplierMax }x)`,
                                                ['amount'],
                                                [String(autoMultiplierMax)],
                                            )),
                                        }}
                                    />
                                )}
                                {paymentOnly && showYouGet && (
                                    <div
                                        className="octane-wired-trade-bubble-note is-disclaimer"
                                        dangerouslySetInnerHTML={{
                                            __html: SanitizeHtml(localizeWithFallback(
                                                'inventory.wired_trading.requirements.receive_text_disclaimer',
                                                'Disclaimer: the creator can write any text in the "you receive" box.',
                                                ['you_get_name'],
                                                [localizeWithFallback('inventory.wired_trading.requirements.receiving', 'You receive')],
                                            )),
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="octane-wired-trade-buttons">
                        <Button className="octane-wired-trade-accept" disabled={acceptDisabled} variant="secondary" onClick={progress}>
                            {acceptCaption}
                        </Button>
                        {timeLeft && (
                            <span className="octane-wired-trade-time">
                                {localizeWithFallback(
                                    'inventory.wired_trading.seconds_left',
                                    `Time left: ${ timeLeft.time }`,
                                    ['minutes', 'seconds', 'time'],
                                    [timeLeft.minutes, timeLeft.seconds, timeLeft.time],
                                )}
                            </span>
                        )}
                        <Button className="octane-wired-trade-cancel" variant="secondary" onClick={cancel}>
                            {localizeWithFallback('generic.cancel', 'Cancel')}
                        </Button>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
