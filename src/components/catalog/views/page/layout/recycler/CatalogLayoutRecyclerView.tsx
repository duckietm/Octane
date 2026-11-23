import {
    CatalogRuntimeConfigurationComposer,
    CatalogRuntimeConfigurationEvent,
    FurnitureListComposer,
    GetRecyclerStatusMessageComposer,
    PurchaseErrorMessageEvent,
    RecycleItemsEntry,
    RecycleItemsMessageComposer,
    RecyclerFinishedMessageEvent,
    RecyclerStatusMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../../api';
import frankDontKnow from '../../../../../../assets/images/catalog/air/recycler/frank-dont-know.png';
import recyclerIndicator from '../../../../../../assets/images/catalog/air/recycler/indicator.png';
import recyclerMachine from '../../../../../../assets/images/catalog/air/recycler/machine.png';
import recyclerPointerArrow from '../../../../../../assets/images/catalog/air/recycler/pointer-arrow.png';
import recyclerPointerBase from '../../../../../../assets/images/catalog/air/recycler/pointer-base.png';
import recyclerTitle from '../../../../../../assets/images/catalog/air/recycler/title.png';
import { BaseButton } from '../../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useInventoryFurni, useInventoryTrade, useMessageEvent, useNotification, usePurse, useRoom } from '../../../../../../hooks';
import { useRecyclerEngineAnimation } from '../../../../../../hooks/catalog/useRecyclerEngineAnimation';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import {
    addRecyclerSlot,
    getRecyclerEligibleItemIds,
    getRecyclerInventoryChoices,
    normalizeRecyclerSlotCount,
    RecyclerInventoryChoice,
    reconcileRecyclerSlots
} from './recycler.helpers';

const OPERATION_TIMEOUT_MS = 12000;
// RecyclerCatalogWidget: the needle swings back 650 ms after an abort and 1 s after a finished run.
const ABORT_RESET_MS = 650;
const FINISH_RESET_MS = 1000;
const DUCKETS = 0;

/** AIR recyclerWidget_xml: the slot rows sit 0, 44 and 90 px down the slots box, four 37 px apart per row. */
const SLOT_ROWS = [0, 44, 90];

export const CatalogLayoutRecyclerView: FC<CatalogLayoutProps> = () => {
    const { groupItems = [] } = useInventoryFurni();
    const [slots, setSlots] = useState<RecyclerInventoryChoice[]>([]);
    const [status, setStatus] = useState(RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [finished, setFinished] = useState(false);
    const [failed, setFailed] = useState(false);
    const [chooserOpen, setChooserOpen] = useState(false);
    const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const configurationRequestIdRef = useRef(`recycler-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const [slotCount, setSlotCount] = useState(() => normalizeRecyclerSlotCount(8));
    const slotsRef = useRef(slots);

    useLayoutEffect(() => {
        slotsRef.current = slots;
    });

    const selectedIds = useMemo(() => new Set(slots.map((slot) => slot.itemId)), [slots]);
    const eligibleIds = useMemo(() => getRecyclerEligibleItemIds(groupItems), [groupItems]);
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
        setSlots((current) => reconcileRecyclerSlots(current, eligibleIds));
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

    const onSlot = (index: number) => {
        if (slotsLocked) return;

        if (slots[index]) {
            setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
            return;
        }

        setChooserOpen(true);
    };

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
                            <div className="octane-catalog-air-recycler__status" role="status">
                                {statusText}
                            </div>
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
                                                onClick={() => onSlot(index)}
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
