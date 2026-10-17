import {
    ConditionDefinition,
    GetRoomEngine,
    GetSessionDataManager,
    IFurnitureData,
    IRoomObject,
    OpenMessageComposer,
    RoomObjectCategory,
    RoomObjectVariable,
    Triggerable,
    TriggerDefinition,
    UpdateActionMessageComposer,
    UpdateAddonMessageComposer,
    UpdateConditionMessageComposer,
    UpdateSelectorMessageComposer,
    UpdateTriggerMessageComposer,
    UpdateVariableMessageComposer,
    WiredActionDefinition,
    WiredAddonDefinition,
    WiredFurniActionEvent,
    WiredFurniAddonEvent,
    WiredFurniConditionEvent,
    WiredFurniSelectorEvent,
    WiredFurniTriggerEvent,
    WiredFurniVariableEvent,
    WiredOpenEvent,
    WiredSelectorDefinition,
    WiredVariableDefinition,
    WiredSaveSuccessEvent,
    WiredValidationErrorEvent
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    GetRoomSession,
    IsOwnerOfFloorFurniture,
    LocalizeText,
    localizeWithFallback,
    NotificationBubbleType,
    pasteTriggerableData,
    resetTriggerableData,
    SendMessageComposer,
    WiredClipboardEntry,
    wiredClipboardKeyOf,
    WiredFurniType,
    WiredSelectionVisualizer
} from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { useLiveState } from '../useLiveState';
import { useWiredTools } from '../wired-tools/useWiredTools';

/** English for server error keys a hotel's texts may not have yet. */
const WIRED_ERROR_FALLBACKS: Record<string, string> = {
    'wiredfurni.error.invalid_api_keys': 'Invalid Web API keys',
    'wiredfurni.error.variable_leaderboard.invalid_configuration': 'Invalid leaderboard configuration.',
    'wiredfurni.error.variable_leaderboard.missing_context': 'Leaderboard information is unavailable. Close and reopen this Wired box.',
    'wiredfurni.error.variable_leaderboard.title_required': 'Enter a leaderboard title.',
    'wiredfurni.error.variable_leaderboard.column_name_length': 'Column names must contain at least two characters.',
    'wiredfurni.error.variable_leaderboard.filter_required': 'Select a filtering variable.',
    'wiredfurni.error.variable_leaderboard.global_operand_required': 'Select a global comparison variable.'
};

/** Whether a clicked floor furni may be picked, from its room object and furnidata. */
export type WiredFurniPickCheck = (roomObject: IRoomObject, furniData: IFurnitureData) => boolean;

const useWiredState = () => {
    const [trigger, setTrigger, triggerRef] = useLiveState<Triggerable>(null);
    const [intParams, setIntParams, intParamsRef] = useLiveState<number[]>([]);
    const [stringParam, setStringParam, stringParamRef] = useLiveState<string>('');
    const [furniIds, setFurniIds, furniIdsRef] = useLiveState<number[]>([]);
    const [actionDelay, setActionDelay, actionDelayRef] = useLiveState<number>(0);
    // Set by an editor that writes the official source fields and selector switches itself; until then
    // the save passes back what the box sent.
    const [, setSourceTypes, sourceTypesRef] = useLiveState<{ furni: number[]; users: number[] } | null>(null);
    // The official second pick list (stuffIds2); null sends back what the box sent.
    const [, setFurniIds2, furniIds2Ref] = useLiveState<number[] | null>(null);
    // The official definition variable ids; null sends back what the box sent.
    const [, setVariableIds, variableIdsRef] = useLiveState<string[] | null>(null);
    const [, setSelectorOptions, selectorOptionsRef] = useLiveState<{ filter: boolean; invert: boolean } | null>(null);
    const [allowsFurni, setAllowsFurni] = useState<number>(WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    const selectByType = false;
    const [neighborhoodTiles, setNeighborhoodTiles] = useState<{ x: number; y: number }[] | null>(null);
    const [neighborhoodInvert, setNeighborhoodInvert] = useState<boolean>(false);
    const [allowedInteractionTypes, setAllowedInteractionTypes] = useState<string[] | null>(null);
    const [allowedInteractionErrorKey, setAllowedInteractionErrorKey] = useState<string | null>(null);
    // A view's own test for a floor furni pick, next to the interaction names.
    const [allowedFurniCheck, setAllowedFurniCheckState] = useState<WiredFurniPickCheck | null>(null);
    const setAllowedFurniCheck = useCallback((check: WiredFurniPickCheck | null) => setAllowedFurniCheckState(() => check), []);
    const { showConfirm = null, simpleAlert = null, showSingleBubble = null } = useNotification();
    const { requestUserVariables = null, roomSettings = null } = useWiredTools();
    // The quick menu's clipboard: one entry per holder and code, kept for the session.
    const [clipboard, setClipboard] = useState<Map<string, WiredClipboardEntry>>(() => new Map());
    // "Save without closing": the next save success leaves the window open.
    const keepOpenAfterSaveRef = useRef(false);
    // The non-owner confirmation, once answered, holds for the rest of the session.
    const nonOwnerConfirmedRef = useRef(false);
    // Official "paste into": while on, opening another box of the same element saves the open
    // configuration into it instead of opening it.
    const [pasteIntoMode, setPasteIntoModeState] = useState(false);
    const pasteIntoModeRef = useRef(false);
    const setPasteIntoMode = useCallback((value: boolean) => {
        pasteIntoModeRef.current = value;
        setPasteIntoModeState(value);
    }, []);

    /**
     * Saves the open configuration. With a target, it goes into that box instead (paste into): the
     * target keeps its own furni picks.
     */
    const saveWired = (target: Triggerable = null) => {
        const save = (trigger: Triggerable) => {
            if (!trigger) return;

            const intParams = intParamsRef.current;
            const stringParam = stringParamRef.current;
            const furniIds = target ? (target.selectedItems ?? []) : furniIdsRef.current;
            const actionDelay = actionDelayRef.current;

            // Official save layout: the source types, variable ids and second picks go back as the box
            // sent them until its editor sets them itself.
            const furniSources = sourceTypesRef.current?.furni ?? trigger.furniSourceTypes ?? [];
            const userSources = sourceTypesRef.current?.users ?? trigger.userSourceTypes ?? [];
            const variableIds = variableIdsRef.current ?? trigger.variableIds ?? [];
            const furniIds2 = target ? (target.selectedItems2 ?? []) : (furniIds2Ref.current ?? trigger.selectedItems2 ?? []);
            const id = target ? target.id : trigger.id;

            // Addons, selectors and variables have their own official save packets.
            if (trigger instanceof WiredAddonDefinition) {
                SendMessageComposer(
                    new UpdateAddonMessageComposer(id, intParams, stringParam, furniIds, furniSources, userSources, variableIds, furniIds2)
                );
            } else if (trigger instanceof WiredSelectorDefinition) {
                SendMessageComposer(
                    new UpdateSelectorMessageComposer(
                        id,
                        intParams,
                        stringParam,
                        furniIds,
                        selectorOptionsRef.current?.filter ?? trigger.isFilter ?? false,
                        selectorOptionsRef.current?.invert ?? trigger.isInvert ?? false,
                        furniSources,
                        userSources,
                        variableIds,
                        furniIds2
                    )
                );
            } else if (trigger instanceof WiredVariableDefinition) {
                SendMessageComposer(
                    new UpdateVariableMessageComposer(id, intParams, stringParam, furniIds, furniSources, userSources, variableIds, furniIds2)
                );
            } else if (trigger instanceof WiredActionDefinition) {
                SendMessageComposer(
                    new UpdateActionMessageComposer(id, intParams, stringParam, furniIds, actionDelay, furniSources, userSources, variableIds, furniIds2)
                );
            } else if (trigger instanceof TriggerDefinition) {
                SendMessageComposer(
                    new UpdateTriggerMessageComposer(id, intParams, stringParam, furniIds, furniSources, userSources, variableIds, furniIds2)
                );
            } else if (trigger instanceof ConditionDefinition) {
                SendMessageComposer(
                    new UpdateConditionMessageComposer(
                        id,
                        intParams,
                        stringParam,
                        furniIds,
                        trigger.quantifierCode ?? 0,
                        furniSources,
                        userSources,
                        variableIds,
                        furniIds2
                    )
                );
            }
        };

        const trigger = triggerRef.current;

        // Official: editing someone else's wired asks once per session.
        if (!nonOwnerConfirmedRef.current && !IsOwnerOfFloorFurniture(target ? target.id : trigger.id)) {
            showConfirm(
                LocalizeText('wiredfurni.nonowner.change.confirm.body'),
                () => {
                    nonOwnerConfirmedRef.current = true;
                    save(trigger);
                },
                null,
                null,
                null,
                LocalizeText('wiredfurni.nonowner.change.confirm.title')
            );
        } else {
            save(trigger);
        }
    };

    const selectObjectForWired = (objectId: number, category: number) => {
        if (!trigger || !allowsFurni) return;

        // Official: furni picking is off while paste-into is on.
        if (pasteIntoModeRef.current) return;

        if (objectId <= 0) return;

        // Official: wall items are picked only when the box allows wall furni. A box the server sends no input
        // sources conf for keeps accepting them.
        const inputSources = trigger.inputSourcesConf;
        const hasInputSourcesConf = !!(inputSources?.furniAllowed?.length || inputSources?.userAllowed?.length);

        if (category === RoomObjectCategory.WALL && hasInputSourcesConf && !trigger.allowWallFurni) return;

        const getInteractionTypeName = (furniData: any): string => {
            if (!furniData) return null;

            const rawValue = furniData.interactionType ?? furniData.interactionTypeName ?? furniData.interactionTypeId;

            if (rawValue === undefined || rawValue === null) return null;
            if (typeof rawValue !== 'string') return null;

            return rawValue.toLowerCase();
        };

        const getComparableInteractionNames = (furniData: any): string[] => {
            if (!furniData) return [];

            const values = [
                getInteractionTypeName(furniData),
                typeof furniData.className === 'string' ? furniData.className.toLowerCase() : null,
                typeof furniData.fullName === 'string' ? furniData.fullName.toLowerCase() : null,
                typeof furniData.name === 'string' ? furniData.name.toLowerCase() : null
            ];

            return values.filter((value, index, array): value is string => !!value && array.indexOf(value) === index);
        };

        const matchesAllowedPattern = (value: string, pattern: string) => {
            const normalizedPattern = pattern.toLowerCase();

            if (normalizedPattern.endsWith('*')) return value.startsWith(normalizedPattern.slice(0, -1));

            return normalizedPattern === value;
        };

        const isAllowedInteraction = (furniData: any): boolean => {
            if (!allowedInteractionTypes || !allowedInteractionTypes.length) return true;

            const comparableNames = getComparableInteractionNames(furniData);
            if (!comparableNames.length) return true;

            return comparableNames.some((value) => allowedInteractionTypes.some((type) => !!type && matchesAllowedPattern(value, type)));
        };

        const handleDisallowedInteraction = () => {
            if (!allowedInteractionErrorKey) return;

            const message = /^[a-z0-9_.]+$/i.test(allowedInteractionErrorKey) ? LocalizeText(allowedInteractionErrorKey) : allowedInteractionErrorKey;

            simpleAlert(message, null, null, null, LocalizeText('wiredfurni.title'));
        };

        if (selectByType && category === RoomObjectCategory.FLOOR) {
            const roomId = GetRoomSession().roomId;
            const clickedObject = GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR);

            if (!clickedObject) return;

            const typeId = clickedObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
            const sourceFurniData = GetSessionDataManager().getFloorItemData(typeId);

            if (!sourceFurniData) return;
            if (!isAllowedInteraction(sourceFurniData)) {
                handleDisallowedInteraction();
                setFurniIds((prevValue) => {
                    if (!prevValue.includes(objectId)) return prevValue;

                    const remaining = prevValue.filter((id) => id !== objectId);

                    WiredSelectionVisualizer.hide(objectId);

                    return remaining;
                });

                return;
            }

            const matchFurniLine = sourceFurniData.furniLine;
            const matchName = sourceFurniData.name;

            const isSameGroup = (id: number): boolean => {
                const obj = GetRoomEngine().getRoomObject(roomId, id, RoomObjectCategory.FLOOR);
                if (!obj) return false;

                const tId = obj.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
                const fd = GetSessionDataManager().getFloorItemData(tId);
                if (!fd) return false;

                if (!isAllowedInteraction(fd)) return false;

                const furniLineMatch = matchFurniLine && matchFurniLine.length > 0 && fd.furniLine === matchFurniLine;
                return furniLineMatch || fd.name === matchName;
            };

            setFurniIds((prevValue) => {
                // ── Click on already-selected furni: deselect the whole group ──
                if (prevValue.includes(objectId)) {
                    const toRemove = prevValue.filter((id) => isSameGroup(id));
                    const remaining = prevValue.filter((id) => !toRemove.includes(id));

                    WiredSelectionVisualizer.clearSelectionShaderFromFurni(toRemove);

                    return remaining;
                }

                // ── Select a new group ──────────────────────────────────────
                const allFloorObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR);
                const newIds = [...prevValue];
                const limit = trigger.maximumItemSelectionCount;

                for (const obj of allFloorObjects) {
                    if (newIds.length >= limit) break;
                    if (obj.id < 0) continue;

                    const tId = obj.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
                    const fd = GetSessionDataManager().getFloorItemData(tId);
                    if (!fd) continue;
                    if (!isAllowedInteraction(fd)) continue;

                    const furniLineMatch = matchFurniLine && matchFurniLine.length > 0 && fd.furniLine === matchFurniLine;
                    const matches = furniLineMatch || fd.name === matchName;

                    if (matches && !newIds.includes(obj.id)) newIds.push(obj.id);
                }

                const addedIds = newIds.filter((id) => !prevValue.includes(id));
                if (addedIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(addedIds);

                return newIds;
            });

            return;
        }

        if (category === RoomObjectCategory.FLOOR && ((allowedInteractionTypes && allowedInteractionTypes.length) || allowedFurniCheck)) {
            const roomId = GetRoomSession().roomId;
            const clickedObject = GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR);

            if (!clickedObject) return;

            const typeId = clickedObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
            const sourceFurniData = GetSessionDataManager().getFloorItemData(typeId);

            if (!sourceFurniData) return;
            if (!isAllowedInteraction(sourceFurniData) || (allowedFurniCheck && !allowedFurniCheck(clickedObject, sourceFurniData))) {
                handleDisallowedInteraction();
                setFurniIds((prevValue) => {
                    if (!prevValue.includes(objectId)) return prevValue;

                    const remaining = prevValue.filter((id) => id !== objectId);

                    WiredSelectionVisualizer.hide(objectId);

                    return remaining;
                });

                return;
            }
        }

        setFurniIds((prevValue) => {
            const newFurniIds = [...prevValue];

            const index = prevValue.indexOf(objectId);

            if (index >= 0) {
                newFurniIds.splice(index, 1);

                WiredSelectionVisualizer.hide(objectId);
            } else if (newFurniIds.length < trigger.maximumItemSelectionCount) {
                newFurniIds.push(objectId);

                WiredSelectionVisualizer.show(objectId);
            }

            return newFurniIds;
        });
    };

    useMessageEvent<WiredOpenEvent>(WiredOpenEvent, (event) => {
        const parser = event.getParser();

        SendMessageComposer(new OpenMessageComposer(parser.stuffId));
    });

    useMessageEvent<WiredSaveSuccessEvent>(WiredSaveSuccessEvent, (event) => {
        const parser = event.getParser();

        if (roomSettings?.canInspect && requestUserVariables) requestUserVariables();

        if (keepOpenAfterSaveRef.current) {
            // Saved without closing: the picks stay highlighted and the window stays up.
            keepOpenAfterSaveRef.current = false;
            return;
        }

        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    });

    /** The selector's filter/invert as its editor last set them, or as the box sent them. */
    const getSelectorOptions = useCallback((): { filter: boolean; invert: boolean } => {
        const current = triggerRef.current;
        const sent = current instanceof WiredSelectorDefinition ? { filter: !!current.isFilter, invert: !!current.isInvert } : { filter: false, invert: false };

        return selectorOptionsRef.current ?? sent;
    }, []);

    /** Saves the box and keeps the window open, so the next change starts from what was saved. */
    const saveWiredAndKeepOpen = useCallback(() => {
        keepOpenAfterSaveRef.current = true;
        saveWired();
    }, [saveWired]);

    /**
     * Copies the box's current settings (what the view just pushed into the hook) to the
     * clipboard slot of its holder and code.
     */
    const copyWiredToClipboard = useCallback(() => {
        const current = triggerRef.current;

        if (!current) return;

        const entry: WiredClipboardEntry = {
            key: wiredClipboardKeyOf(current),
            intParams: [...(intParamsRef.current ?? [])],
            stringParam: stringParamRef.current ?? '',
            furniIds: [...(furniIdsRef.current ?? [])],
            delayInPulses: actionDelayRef.current ?? 0
        };

        setClipboard((prevValue) => {
            const next = new Map(prevValue);

            next.set(entry.key, entry);

            return next;
        });
    }, []);

    /** The clipboard entry that fits the open box, if any. */
    const clipboardEntry = trigger ? (clipboard.get(wiredClipboardKeyOf(trigger)) ?? null) : null;

    /**
     * Pastes the fitting clipboard entry into the open box. The views re-read the box because it
     * is a new object; "paste into" keeps the box's own furni picks and delay.
     */
    const pasteWiredFromClipboard = useCallback(
        (pasteInto: boolean = false) => {
            const current = triggerRef.current;

            if (!current) return;

            const entry = clipboard.get(wiredClipboardKeyOf(current));

            if (!entry) return;

            setTrigger(pasteTriggerableData(current, entry, pasteInto));
        },
        [clipboard, setTrigger]
    );

    /** Puts the open box back to its catalog defaults; nothing is saved until "ready". */
    const resetWiredToDefault = useCallback(() => {
        const current = triggerRef.current;

        if (!current) return;

        setTrigger(resetTriggerableData(current));
    }, [setTrigger]);

    /** Drops every furni pick of the open box. */
    const clearWiredPicks = useCallback(() => {
        setFurniIds((prevValue) => {
            if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

            return [];
        });
    }, [setFurniIds]);

    useMessageEvent<WiredValidationErrorEvent>(WiredValidationErrorEvent, (event) => {
        const parser = event.getParser();

        if (parser.info && parser.info.length) {
            const message = /^[a-z0-9_.]+$/i.test(parser.info)
                ? localizeWithFallback(parser.info, WIRED_ERROR_FALLBACKS[parser.info] ?? parser.info)
                : parser.info;

            simpleAlert(message, null, null, null, LocalizeText('wiredfurni.title'));
        }
    });

    /**
     * A box the server opened. In paste-into mode, another box of the same element gets the open
     * configuration saved into it (the open window stays); a different element is refused.
     */
    const openDefinition = (definition: Triggerable) => {
        const current = triggerRef.current;

        if (pasteIntoModeRef.current && current && definition && definition.id !== current.id) {
            if (wiredClipboardKeyOf(definition) === wiredClipboardKeyOf(current)) {
                keepOpenAfterSaveRef.current = true;
                saveWired(definition);
                showSingleBubble?.(localizeWithFallback('notification.wired.pasted_into', 'The settings were applied'), NotificationBubbleType.INFO);
            } else {
                showSingleBubble?.(
                    localizeWithFallback('notification.wired.pasted_into_fail', 'This configuration does not fit that wired box'),
                    NotificationBubbleType.INFO
                );
            }

            return;
        }

        // Official: every newly opened box starts with paste-into off.
        setPasteIntoMode(false);
        setTrigger(definition);
    };

    useMessageEvent<WiredFurniAddonEvent>(WiredFurniAddonEvent, (event) => openDefinition(event.getParser().definition));

    useMessageEvent<WiredFurniSelectorEvent>(WiredFurniSelectorEvent, (event) => openDefinition(event.getParser().definition));

    useMessageEvent<WiredFurniVariableEvent>(WiredFurniVariableEvent, (event) => openDefinition(event.getParser().definition));

    useMessageEvent<WiredFurniActionEvent>(WiredFurniActionEvent, (event) => openDefinition(event.getParser().definition));

    useMessageEvent<WiredFurniConditionEvent>(WiredFurniConditionEvent, (event) => openDefinition(event.getParser().definition));

    useMessageEvent<WiredFurniTriggerEvent>(WiredFurniTriggerEvent, (event) => openDefinition(event.getParser().definition));

    // While an editor is open its picks stay highlighted, even when a furni's sprites are rebuilt
    // (a state change, an animation); after it closes, late redraws are swept once more.
    useEffect(() => {
        if (!trigger) return;

        const interval = setInterval(() => WiredSelectionVisualizer.refresh(), 250);

        return () => {
            clearInterval(interval);
            setTimeout(() => {
                if (!triggerRef.current) WiredSelectionVisualizer.clearAllSelectionShaders();
            }, 300);
        };
    }, [trigger]);

    useEffect(() => {
        if (!trigger) return;

        return () => {
            WiredSelectionVisualizer.clearAllSelectionShaders();
            setIntParams([]);
            setStringParam('');
            setActionDelay(0);
            setFurniIds((prevValue) => {
                if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

                return [];
            });
            setAllowsFurni(WiredFurniType.STUFF_SELECTION_OPTION_NONE);
            setNeighborhoodTiles(null);
            setNeighborhoodInvert(false);
            setSourceTypes(null);
            setFurniIds2(null);
            setVariableIds(null);
            setSelectorOptions(null);
            setAllowedInteractionTypes(null);
            setAllowedInteractionErrorKey(null);
            setAllowedFurniCheckState(null);
        };
    }, [trigger]);

    return {
        trigger,
        setTrigger,
        intParams,
        setIntParams,
        stringParam,
        setStringParam,
        furniIds,
        setFurniIds,
        actionDelay,
        setActionDelay,
        setAllowsFurni,
        saveWired,
        saveWiredAndKeepOpen,
        clipboardEntry,
        copyWiredToClipboard,
        pasteWiredFromClipboard,
        pasteIntoMode,
        setPasteIntoMode,
        getSelectorOptions,
        resetWiredToDefault,
        clearWiredPicks,
        selectObjectForWired,
        setNeighborhoodTiles,
        setNeighborhoodInvert,
        setSourceTypes,
        setFurniIds2,
        setVariableIds,
        setSelectorOptions,
        setAllowedInteractionTypes,
        setAllowedInteractionErrorKey,
        setAllowedFurniCheck
    };
};

export const useWired = () => useSharedHook(useWiredState);

registerSharedHook(useWiredState);
