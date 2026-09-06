import {
    CatalogRuntimeConfigurationComposer,
    CatalogRuntimeConfigurationEvent,
    FurnitureListComposer,
    GetRecyclerStatusMessageComposer,
    RecycleItemsEntry,
    RecycleItemsMessageComposer,
    RecyclerFinishedMessageEvent,
    RecyclerStatusMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../../api';
import { useInventoryFurni, useMessageEvent } from '../../../../../../hooks';
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

export const CatalogLayoutRecyclerView: FC<CatalogLayoutProps> = ({ page }) => {
    const { groupItems = [] } = useInventoryFurni();
    const [slots, setSlots] = useState<RecyclerInventoryChoice[]>([]);
    const [status, setStatus] = useState(RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [finished, setFinished] = useState(false);
    const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const configurationRequestIdRef = useRef(`recycler-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const [slotCount, setSlotCount] = useState(() => normalizeRecyclerSlotCount(8));
    const selectedIds = useMemo(() => new Set(slots.map((slot) => slot.itemId)), [slots]);
    const eligibleIds = useMemo(() => getRecyclerEligibleItemIds(groupItems), [groupItems]);
    const choices = useMemo(() => getRecyclerInventoryChoices(groupItems, selectedIds), [groupItems, selectedIds]);
    const enabled = status !== RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED;

    const clearOperationTimeout = useCallback(() => {
        if (!operationTimeoutRef.current) return;

        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
    }, []);

    useMessageEvent<RecyclerStatusMessageEvent>(RecyclerStatusMessageEvent, (event) => {
        const parser = event.getParser();

        setStatus(parser.recyclerStatus);
        setSecondsLeft(Math.max(0, parser.recyclerTimeoutSeconds));
    });

    useMessageEvent<CatalogRuntimeConfigurationEvent>(CatalogRuntimeConfigurationEvent, (event) => {
        const parser = event.getParser();

        if (parser.protocolVersion !== 1 || parser.requestId !== configurationRequestIdRef.current) return;

        setSlotCount(normalizeRecyclerSlotCount(parser.recyclerSlotCount));
    });

    useMessageEvent<RecyclerFinishedMessageEvent>(RecyclerFinishedMessageEvent, (event) => {
        clearOperationTimeout();
        setProcessing(false);

        if (event.getParser().recyclerFinishedStatus === RecyclerFinishedMessageEvent.FINISHED_OK) {
            setSlots([]);
            setFinished(true);
        }

        SendMessageComposer(new GetRecyclerStatusMessageComposer());
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
        if (processing) return;

        setFinished(false);
        setSlots((current) => addRecyclerSlot(current, choice, slotCount, eligibleIds));
    };

    const recycle = () => {
        if (processing || !enabled || secondsLeft > 0) return;

        const validSlots = reconcileRecyclerSlots(slots, eligibleIds);

        if (validSlots.length !== slotCount) {
            setSlots(validSlots);
            return;
        }

        setFinished(false);
        setProcessing(true);
        SendMessageComposer(new RecycleItemsMessageComposer(...validSlots.map((slot) => new RecycleItemsEntry(slot.itemId))));
        clearOperationTimeout();
        operationTimeoutRef.current = setTimeout(() => setProcessing(false), OPERATION_TIMEOUT_MS);
    };

    const statusText = !enabled
        ? LocalizeText('recycler.info.closed')
        : processing
          ? LocalizeText('recycler.info.processing')
          : finished
            ? LocalizeText('recycler.info.finished')
            : LocalizeText('recycler.info.ready');

    return (
        <div className="octane-catalog-recycler-layout">
            <header className="octane-catalog-recycler-header">
                {!!page.localization.getImage(0) && <img alt="" src={page.localization.getImage(0)} />}
                <p>{statusText}</p>
            </header>

            <div aria-label={LocalizeText('catalog.recycler.button.recycle')} className="octane-catalog-recycler-slots" role="list">
                {Array.from({ length: slotCount }, (_, index) => {
                    const slot = slots[index];

                    return (
                        <button
                            key={index}
                            aria-label={slot?.name ?? `${index + 1}`}
                            className={`octane-catalog-recycler-slot${slot ? ' is-filled' : ''}`}
                            disabled={processing || !slot}
                            role="listitem"
                            type="button"
                            onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))}
                        >
                            {slot?.iconUrl && <img alt="" src={slot.iconUrl} />}
                        </button>
                    );
                })}
            </div>

            <div className="octane-catalog-recycler-inventory">
                {choices.length ? (
                    choices.map((choice) => (
                        <button key={choice.itemId} disabled={processing || slots.length >= slotCount} type="button" onClick={() => addChoice(choice)}>
                            {choice.iconUrl && <img alt="" src={choice.iconUrl} />}
                            <span>{choice.name}</span>
                        </button>
                    ))
                ) : (
                    <span className="octane-catalog-specialized-empty">{LocalizeText('inventory.furni.preview.not_recyclable')}</span>
                )}
            </div>

            <button
                className="octane-catalog-standard-button octane-catalog-recycler-action"
                disabled={processing || !enabled || secondsLeft > 0 || slots.length !== slotCount}
                type="button"
                onClick={recycle}
            >
                {secondsLeft > 0
                    ? LocalizeText('catalog.recycler.button.wait', ['s'], [secondsLeft.toString()])
                    : LocalizeText('catalog.recycler.button.recycle')}
            </button>
        </div>
    );
};
