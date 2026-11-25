import {
    CatalogRuntimeConfigurationComposer,
    CatalogRuntimeConfigurationEvent,
    FurnitureListComposer,
    GetRoomEngine,
    GetRecyclerStatusMessageComposer,
    PurchaseErrorMessageEvent,
    RecycleItemsEntry,
    RecycleItemsMessageComposer,
    RecyclerFinishedMessageEvent,
    RecyclerStatusMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cancelRoomObjectPlacement, CreateLinkEvent, GetConfigurationValue, GroupItem, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../../api';
import frankDontKnow from '../../../../../../assets/images/catalog/air/recycler/frank-dont-know.png';
import recyclerIndicator from '../../../../../../assets/images/catalog/air/recycler/indicator.png';
import recyclerMachine from '../../../../../../assets/images/catalog/air/recycler/machine.png';
import recyclerPointerArrow from '../../../../../../assets/images/catalog/air/recycler/pointer-arrow.png';
import recyclerPointerBase from '../../../../../../assets/images/catalog/air/recycler/pointer-base.png';
import recyclerTitle from '../../../../../../assets/images/catalog/air/recycler/title.png';
import { BaseButton } from '../../../../../../common/BaseButton';
import { LayoutCurrencyIcon } from '../../../../../../common/layout/LayoutCurrencyIcon';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useInventoryFurni, useInventoryTrade, useMessageEvent, useNotification, usePurse, useRoom } from '../../../../../../hooks';
import { useRecyclerEngineAnimation } from '../../../../../../hooks/catalog/useRecyclerEngineAnimation';
import { useRecyclerSessionStore } from '../../../../../../state/recyclerSessionStore';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import {
    addRecyclerSlot,
    getRecyclerEligibleItemIds,
    getRecyclerInventoryChoices,
    getRecyclerLockedRefs,
    normalizeRecyclerSlotCount,
    pickRecyclerChoiceForPlacedItem,
    placeRecyclerSlot,
    RecyclerInventoryChoice,
    reconcileRecyclerSlots
} from './recycler.helpers';

const OPERATION_TIMEOUT_MS = 12000;
// RecyclerCatalogWidget: the needle swings back 650 ms after an abort and 1 s after a finished run.
const ABORT_RESET_MS = 650;
const FINISH_RESET_MS = 1000;
const DUCKETS = 0;
// RoomObjectOperationType.OBJECT_PLACE: a furni being placed from the inventory.
const OBJECT_PLACE = 'OBJECT_PLACE';

/** AIR recyclerWidget_xml: the slot rows sit 0, 44 and 90 px down the slots box, four 37 px apart per row. */
const SLOT_ROWS = [0, 44, 90];

export const CatalogLayoutRecyclerView: FC<CatalogLayoutProps> = () => {
    const { groupItems = [], setGroupItems = null } = useInventoryFurni();
    const [slots, setSlots] = useState<RecyclerInventoryChoice[]>([]);
    const [status, setStatus] = useState(RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [finished, setFinished] = useState(false);
    const [failed, setFailed] = useState(false);
    const [chooserOpen, setChooserOpen] = useState(false);
    const [heldIcon, setHeldIcon] = useState<{ url: string; x: number; y: number } | null>(null);
    const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const configurationRequestIdRef = useRef(`recycler-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const [slotCount, setSlotCount] = useState(() => normalizeRecyclerSlotCount(8));
    const slotsRef = useRef(slots);

    useLayoutEffect(() => {
        slotsRef.current = slots;
    });

    const selectedIds = useMemo(() => new Set(slots.map((slot) => slot.itemId)), [slots]);
    const eligibleIds = useMemo(() => getRecyclerEligibleItemIds(groupItems, selectedIds), [groupItems, selectedIds]);
    const choices = useMemo(() => getRecyclerInventoryChoices(groupItems, selectedIds), [groupItems, selectedIds]);
    const enabled = status !== RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED;
    const { roomSession = null } = useRoom();
    const { isTrading = false } = useInventoryTrade();
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null } = useNotification();
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // RecyclerLogic.ducketCost / timeout: what a run costs and how long the button waits after one.
    const ducketCost = Math.max(0, Number(GetConfigurationValue<number>('recycler.ducket_cost', 0)) || 0);
    const waitSeconds = Math.max(0, Number(GetConfigurationValue<number>('recycler.timeout_seconds', 10)) || 0);

    const clearOperationTimeout = useCallback(() => {
        if (!operationTimeoutRef.current) return;

        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
    }, []);

    useMessageEvent<RecyclerStatusMessageEvent>(RecyclerStatusMessageEvent, (event) => {
        const parser = event.getParser();

        setStatus(parser.recyclerStatus);
        // The wait the button already counts down (setNextRecycleAllowedTimestamp) is not cut short by the status.
        setSecondsLeft((current) => Math.max(current, parser.recyclerTimeoutSeconds, 0));
    });

    useMessageEvent<CatalogRuntimeConfigurationEvent>(CatalogRuntimeConfigurationEvent, (event) => {
        const parser = event.getParser();

        if (parser.protocolVersion !== 1 || parser.requestId !== configurationRequestIdRef.current) return;

        setSlotCount(normalizeRecyclerSlotCount(parser.recyclerSlotCount));
    });

    useMessageEvent<RecyclerFinishedMessageEvent>(RecyclerFinishedMessageEvent, (event) => {
        clearOperationTimeout();
        setProcessing(false);

        // FINISHED_FAIL: nothing was recycled, the furni stay in their slots.
        if (event.getParser().recyclerFinishedStatus === RecyclerFinishedMessageEvent.FINISHED_OK) {
            setSlots([]);
            setFinished(true);
        } else {
            setFailed(true);
        }

        SendMessageComposer(new GetRecyclerStatusMessageComposer());
    });

    // An emulator that only answers a failed recycle with the purchase error still ends the run.
    const processingRef = useRef(false);

    useLayoutEffect(() => {
        processingRef.current = processing;
    });

    useMessageEvent<PurchaseErrorMessageEvent>(PurchaseErrorMessageEvent, () => {
        if (!processingRef.current) return;

        clearOperationTimeout();
        setProcessing(false);
        setFailed(true);
    });

    useEffect(() => {
        SendMessageComposer(new FurnitureListComposer());
        SendMessageComposer(new GetRecyclerStatusMessageComposer());
        SendMessageComposer(new CatalogRuntimeConfigurationComposer(configurationRequestIdRef.current));

        return clearOperationTimeout;
    }, [clearOperationTimeout]);

    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);

        return () => clearInterval(timer);
    }, [secondsLeft > 0]);

    useEffect(() => {
        // Only when a slot really loses its furni: the eligible ids follow the slots, so a new array each time would
        // run this again and again.
        setSlots((current) => {
            const kept = reconcileRecyclerSlots(current, eligibleIds);

            return kept.length === current.length ? current : kept;
        });
    }, [eligibleIds]);

    const addChoice = (choice: RecyclerInventoryChoice) => {
        if (processing || engine.busy) return;

        setFinished(false);
        setFailed(false);
        setSlots((current) => addRecyclerSlot(current, choice, slotCount, eligibleIds));
    };

    // RecyclerCatalogWidget.onAnimationComplete: the slots are sent when the machine has run, the button then waits.
    const sendRecycle = () => {
        const validSlots = reconcileRecyclerSlots(slotsRef.current, eligibleIds);

        scheduleReset(FINISH_RESET_MS);

        if (validSlots.length !== slotCount) {
            setSlots(validSlots);
            return;
        }

        setProcessing(true);
        setSecondsLeft(waitSeconds);
        SendMessageComposer(new RecycleItemsMessageComposer(...validSlots.map((slot) => new RecycleItemsEntry(slot.itemId))));
        clearOperationTimeout();
        operationTimeoutRef.current = setTimeout(() => setProcessing(false), OPERATION_TIMEOUT_MS);
    };

    const engine = useRecyclerEngineAnimation(sendRecycle);

    const scheduleReset = (delay: number) => {
        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

        resetTimeoutRef.current = setTimeout(engine.reset, delay);
    };

    useEffect(
        () => () => {
            if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
        },
        []
    );

    // AIR RecyclerModel.lockSelectedFurni / releaseFurni / stopRecycler: a furni in a slot is locked in the inventory
    // (its stack counts one less and fades when none is left), released when it leaves the slot, and all of them when
    // the page is left. During a trade the inventory's locks are the trade's, so they are left alone.
    const isTradingRef = useRef(isTrading);

    useLayoutEffect(() => {
        isTradingRef.current = isTrading;
    });

    const lockInInventory = useCallback(
        (ownIds: ReadonlySet<number>) => {
            if (!setGroupItems || isTradingRef.current) return;

            setGroupItems((previous: GroupItem[]) => {
                const refs = getRecyclerLockedRefs(previous, ownIds);
                let changed = false;
                const next = previous.map((group) => {
                    const copy = group.clone();

                    if (!copy.lockItemIds(refs)) return group;

                    changed = true;
                    return copy;
                });

                return changed ? next : previous;
            });
        },
        [setGroupItems]
    );

    useEffect(() => {
        lockInInventory(selectedIds);
    }, [lockInInventory, selectedIds, groupItems]);

    useEffect(() => () => lockInInventory(new Set()), [lockInInventory]);

    // RecyclerLogic.isReadyToRecycle: only in a room, with every slot filled.
    const canStart = enabled && !!roomSession && !processing && !engine.busy && secondsLeft <= 0 && slots.length === slotCount;

    // RecyclerCatalogWidget.onRecycleButtonClick: an open trade and the ducket cost are checked, then the machine runs.
    const recycle = () => {
        if (!canStart) return;

        const validSlots = reconcileRecyclerSlots(slots, eligibleIds);

        if (validSlots.length !== slotCount) {
            setSlots(validSlots);
            return;
        }

        if (isTrading) {
            simpleAlert?.(LocalizeText('recycler.alert.trading'), null, null, null, LocalizeText('generic.alert.title'));
            return;
        }

        if (ducketCost > 0 && (getCurrencyAmount?.(DUCKETS) ?? 0) < ducketCost) {
            simpleAlert?.(LocalizeText('catalog.alert.notenough.activitypoints.title.0'), null, null, null, LocalizeText('generic.alert.title'));
            return;
        }

        setFinished(false);
        setFailed(false);
        engine.start();
    };

    // onAbortClick: the run stops where it is and nothing is sent.
    const abort = () => {
        engine.stop();
        scheduleReset(ABORT_RESET_MS);
    };

    const statusText = !enabled
        ? LocalizeText('recycler.info.closed')
        : processing || engine.busy
          ? LocalizeText('recycler.info.processing')
          : finished
            ? LocalizeText('recycler.info.finished')
            : failed
              ? localizeWithFallback('recycler.info.failed', 'Recycling failed. Your furni are still in the recycler.')
              : LocalizeText('recycler.info.ready');

    const slotsLocked = processing || engine.busy || !enabled;

    // The furni being placed from the inventory, if any (AIR roomEngine.getSelectedObjectData).
    const getHeldObject = () => {
        const roomEngine = GetRoomEngine();
        const data = roomEngine?.getSelectedRoomObjectData?.(roomEngine.activeRoomId);

        return data && typeof data.operation === 'string' ? data : null;
    };

    const alertUser = (key: string) => simpleAlert?.(LocalizeText(key), null, null, null, LocalizeText('generic.alert.title'));

    // AIR RecyclerCatalogWidget.onSlotMouseEvent (mouse up on a slot): a furni held from the inventory goes into the
    // slot, one being moved in the room is refused, and with nothing held the slot is emptied. Opening the list of
    // recyclable furni from an empty slot is ours, for the keyboard.
    const onSlot = (index: number, fromKeyboard: boolean) => {
        if (slotsLocked) return;

        const held = getHeldObject();

        if (held) {
            if (held.operation !== OBJECT_PLACE) {
                alertUser('catalog.alert.recycler.inventory');
                return;
            }

            const others = new Set(slots.filter((_, slotIndex) => slotIndex !== index).map((slot) => slot.itemId));
            const choice = pickRecyclerChoiceForPlacedItem(groupItems, held.id, others, selectedIds);

            if (choice) {
                setFinished(false);
                setFailed(false);
                setSlots((current) => placeRecyclerSlot(current, index, choice, slotCount));
            } else {
                alertUser('recycler.alert.non.recyclable');
            }

            // The furni leaves the pointer and the inventory, hidden while a furni is held, comes back for the next one.
            cancelRoomObjectPlacement();
            GetRoomEngine().cancelRoomObjectInsert();
            CreateLinkEvent('inventory/show');
            setHeldIcon(null);
            return;
        }

        if (slots[index]) {
            setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
            return;
        }

        if (fromKeyboard) setChooserOpen(true);
    };

    // AIR HabboInventory.recycleSelectedFurni (a double click in the inventory while this page is open): one furni of
    // the stack goes into the next free slot; a stack with nothing to recycle gets the same alert as a drop.
    const placeFromInventory = (group: GroupItem) => {
        if (slotsLocked || !group?.items?.length) return;

        const choice = pickRecyclerChoiceForPlacedItem(groupItems, group.items[0].id, selectedIds);

        if (!choice) {
            alertUser('recycler.alert.non.recyclable');
            return;
        }

        setFinished(false);
        setFailed(false);
        setSlots((current) => placeRecyclerSlot(current, -1, choice, slotCount));
    };

    const placeFromInventoryRef = useRef(placeFromInventory);

    useLayoutEffect(() => {
        placeFromInventoryRef.current = placeFromInventory;
    });

    // The inventory knows the recycler is open (AIR RecyclerModel.startRecycler / stopRecycler).
    useEffect(() => {
        const place = (group: GroupItem) => placeFromInventoryRef.current(group);

        useRecyclerSessionStore.getState().start(place);

        return () => useRecyclerSessionStore.getState().stop(place);
    }, []);

    // AIR CatalogObjectMover: anywhere over the catalog window the furni held from the inventory is drawn as its icon
    // at the pointer (the room's own mover only shows over the room). The window and all its parents listen in AIR,
    // so this follows the whole catalog window, not only this page.
    const groupItemsRef = useRef(groupItems);

    useLayoutEffect(() => {
        groupItemsRef.current = groupItems;
    });

    useEffect(() => {
        const onMove = (event: MouseEvent) => {
            const held = getHeldObject();
            const overCatalog = !!(event.target as Element | null)?.closest?.('.octane-catalog-window');

            if (!held || held.operation !== OBJECT_PLACE || !overCatalog) {
                setHeldIcon((current) => (current ? null : current));
                return;
            }

            const id = Math.abs(held.id);
            const group = groupItemsRef.current.find((candidate) => candidate.items.some((item) => item.id === id));

            GetRoomEngine().setObjectMoverIconSpriteVisible?.(false);
            setHeldIcon(group?.iconUrl ? { url: group.iconUrl, x: event.clientX, y: event.clientY } : null);
        };

        document.addEventListener('mousemove', onMove);

        return () => document.removeEventListener('mousemove', onMove);
    }, []);

    const choose = (choice: RecyclerInventoryChoice) => {
        addChoice(choice);

        if (slots.length + 1 >= slotCount) setChooserOpen(false);
    };

    // AIR layout_recycler_xml + recyclerWidget_xml, centred on the catalog page: the Furnimatic title and machine at the
    // top (shaking while it runs), and at the bottom the status, the recycle button, the slots in the Furnimatic frame
    // and the dial; when the recycler is closed, Frank says so instead.
    return (
        <NativeTextTree>
            <div className="octane-catalog-air-recycler">
                {/* On the body: the catalog window is moved with a transform, which would shift a fixed element inside it. */}
                {heldIcon &&
                    createPortal(
                        <img alt="" className="octane-catalog-air-recycler__held" draggable={false} src={heldIcon.url} style={{ left: heldIcon.x, top: heldIcon.y }} />,
                        document.body
                    )}
                <img alt="" draggable={false} className="octane-catalog-air-recycler__title" src={recyclerTitle} />
                <img
                    alt=""
                    draggable={false}
                    className="octane-catalog-air-recycler__machine"
                    src={recyclerMachine}
                    style={{ transform: `translate(${engine.frame.shakeX}px, ${engine.frame.shakeY}px)` }}
                />
                <div className="octane-catalog-air-recycler__widget">
                    {enabled ? (
                        <>
                            {/* AIR writes recycler.info.ready in the catalog header; the run's state is only announced. */}
                            <div className="octane-catalog-air-recycler__status" role="status">
                                {statusText}
                            </div>
                            {/* ducket_cost + ducket_icon: the price of a run, hidden when it is free. */}
                            {ducketCost > 0 && (
                                <div className="octane-catalog-air-recycler__cost">
                                    <span>{ducketCost}</span>
                                    <LayoutCurrencyIcon type={DUCKETS} />
                                </div>
                            )}
                            <BaseButton
                                className="octane-catalog-standard-button octane-catalog-air-recycler__recycle"
                                disabled={!canStart}
                                type="button"
                                onClick={recycle}
                            >
                                {secondsLeft > 0
                                    ? LocalizeText('catalog.recycler.button.wait', ['s'], [secondsLeft.toString()])
                                    : LocalizeText('catalog.recycler.button.recycle')}
                            </BaseButton>
                            <div className="octane-catalog-air-recycler__frame is-slots">
                                <div aria-label={LocalizeText('catalog.recycler.button.recycle')} className="octane-catalog-air-recycler__slots" role="list">
                                    {Array.from({ length: slotCount }, (_, index) => {
                                        const slot = slots[index];

                                        return (
                                            <BaseButton
                                                key={index}
                                                aria-label={slot?.name ?? `${index + 1}`}
                                                className={`octane-catalog-air-recycler__slot${slot ? ' is-filled' : ''}`}
                                                disabled={slotsLocked}
                                                role="listitem"
                                                style={{ left: (index % 4) * 37, top: SLOT_ROWS[Math.floor(index / 4)] ?? 0 }}
                                                type="button"
                                                onClick={(event) => {
                                                    // A mouse click was handled on mouse up; this is the keyboard.
                                                    if (event.detail === 0) onSlot(index, true);
                                                }}
                                                onMouseUp={(event) => {
                                                    if (event.button === 0) onSlot(index, false);
                                                }}
                                            >
                                                {slot?.iconUrl && <img alt="" draggable={false} src={slot.iconUrl} />}
                                            </BaseButton>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="octane-catalog-air-recycler__frame is-indicator">
                                <img alt="" draggable={false} className="octane-catalog-air-recycler__dial" src={recyclerIndicator} />
                                <div className="octane-catalog-air-recycler__pointer">
                                    <img alt="" draggable={false} src={recyclerPointerArrow} style={{ transform: `rotate(${engine.frame.angle}deg)` }} />
                                    <img alt="" draggable={false} src={recyclerPointerBase} />
                                </div>
                                {engine.busy && (
                                    <BaseButton className="octane-catalog-air-recycler__abort" type="button" onClick={abort}>
                                        {LocalizeText('catalog.recycler.button.abort')}
                                    </BaseButton>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="octane-catalog-air-recycler__closed">
                            <div className="octane-catalog-air-recycler__bubble" role="status">
                                {localizeWithFallback('recycler.broken', statusText)}
                            </div>
                            <img alt="" draggable={false} className="octane-catalog-air-recycler__frank" src={frankDontKnow} />
                        </div>
                    )}
                </div>
                {chooserOpen && enabled && (
                    <div className="octane-catalog-air-recycler__chooser" role="dialog" aria-label={LocalizeText('catalog.recycler.button.recycle')}>
                        <div className="octane-catalog-air-recycler__chooser-head">
                            <span>{LocalizeText('inventory.furni.tab.furni')}</span>
                            <BaseButton
                                aria-label={LocalizeText('generic.close')}
                                className="octane-catalog-air-recycler__chooser-close"
                                onClick={() => setChooserOpen(false)}
                            >
                                ×
                            </BaseButton>
                        </div>
                        {choices.length ? (
                            <div className="octane-catalog-air-recycler__choices">
                                {choices.map((choice) => (
                                    <BaseButton
                                        key={choice.itemId}
                                        aria-label={choice.name}
                                        className="octane-catalog-air-recycler__choice"
                                        disabled={processing || engine.busy || slots.length >= slotCount}
                                        type="button"
                                        onClick={() => choose(choice)}
                                    >
                                        {choice.iconUrl && <img alt="" draggable={false} src={choice.iconUrl} />}
                                    </BaseButton>
                                ))}
                            </div>
                        ) : (
                            <span className="octane-catalog-specialized-empty">{LocalizeText('inventory.furni.preview.not_recyclable')}</span>
                        )}
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
