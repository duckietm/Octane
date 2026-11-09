import { ConditionDefinition, TriggerDefinition, Triggerable, WiredActionDefinition, WiredAddonDefinition, WiredSelectorDefinition, WiredVariableDefinition } from '@octane/renderer';

/** Which of the three holders a box belongs to; a clipboard entry only pastes into the same holder and code. */
export type WiredHolder = 'action' | 'condition' | 'trigger' | 'addon' | 'selector' | 'variable' | 'unknown';

/**
 * What a box's settings look like off the box (the official ClipboardWiredEntry): what the save
 * packet carries, the second picks, the sources and the variable ids, plus the delay, quantifier or
 * selector switches of the holders that have them.
 */
export interface WiredClipboardEntry {
    key: string;
    intParams: number[];
    stringParam: string;
    furniIds: number[];
    delayInPulses: number;
    furniIds2?: number[];
    furniSourceTypes?: number[];
    userSourceTypes?: number[];
    variableIds?: string[];
    quantifierCode?: number;
    selectorFilter?: boolean;
    selectorInvert?: boolean;
}

export interface WiredTriggerableData {
    intParams?: number[];
    stringParam?: string;
    furniIds?: number[];
    delayInPulses?: number;
    furniIds2?: number[];
    furniSourceTypes?: number[];
    userSourceTypes?: number[];
    variableIds?: string[];
    quantifierCode?: number;
    selectorFilter?: boolean;
    selectorInvert?: boolean;
}

export const wiredHolderOf = (triggerable: Triggerable): WiredHolder => {
    if (triggerable instanceof WiredAddonDefinition) return 'addon';
    if (triggerable instanceof WiredSelectorDefinition) return 'selector';
    if (triggerable instanceof WiredVariableDefinition) return 'variable';
    if (triggerable instanceof WiredActionDefinition) return 'action';
    if (triggerable instanceof TriggerDefinition) return 'trigger';
    if (triggerable instanceof ConditionDefinition) return 'condition';

    return 'unknown';
};

/** The clipboard slot of a box: one per holder and code, so a copied "give score" only pastes into a "give score". */
export const wiredClipboardKeyOf = (triggerable: Triggerable): string => `${wiredHolderOf(triggerable)}:${triggerable?.code ?? 0}`;

/**
 * The same box with other settings. The definition classes keep their fields private behind
 * getters, so the copy keeps the prototype (every `instanceof` still holds) and only the four
 * data fields are replaced; the views re-read them because the object identity changed.
 */
export const withTriggerableData = <T extends Triggerable>(triggerable: T, data: WiredTriggerableData): T => {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(triggerable)), triggerable) as T;
    const fields = clone as unknown as Record<string, unknown>;

    if (data.intParams !== undefined) fields._intParams = [...data.intParams];
    if (data.stringParam !== undefined) fields._stringParam = data.stringParam;
    if (data.furniIds !== undefined) fields._stuffIds = [...data.furniIds];
    if (data.delayInPulses !== undefined && wiredHolderOf(triggerable) === 'action') fields._delayInPulses = data.delayInPulses;
    if (data.furniIds2 !== undefined) fields._stuffIds2 = [...data.furniIds2];
    if (data.furniSourceTypes !== undefined) fields._furniSourceTypes = [...data.furniSourceTypes];
    if (data.userSourceTypes !== undefined) fields._userSourceTypes = [...data.userSourceTypes];
    if (data.variableIds !== undefined) fields._variableIds = [...data.variableIds];
    if (data.quantifierCode !== undefined && wiredHolderOf(triggerable) === 'condition') fields._quantifierCode = data.quantifierCode;
    if (data.selectorFilter !== undefined && wiredHolderOf(triggerable) === 'selector') fields._isFilter = data.selectorFilter;
    if (data.selectorInvert !== undefined && wiredHolderOf(triggerable) === 'selector') fields._isInvert = data.selectorInvert;

    return clone;
};

/**
 * The official "reset to default" (UserDefinedRoomEventsCtrl.resetToDefault): the int params the server sent as the
 * box's defaults, no text, no picks in either list, the default sources of its input sources conf, no variables, no
 * delay, quantifier "all" and a plain selector.
 */
export const resetTriggerableData = <T extends Triggerable>(triggerable: T): T =>
    withTriggerableData(triggerable, {
        intParams: triggerable.defaultIntParams ?? [],
        stringParam: '',
        furniIds: [],
        furniIds2: [],
        furniSourceTypes: triggerable.inputSourcesConf?.furniDefaults ?? [],
        userSourceTypes: triggerable.inputSourcesConf?.userDefaults ?? [],
        variableIds: [],
        delayInPulses: 0,
        quantifierCode: 0,
        selectorFilter: false,
        selectorInvert: false
    });

/**
 * A box that sent no int params opens on the defaults the server sent for it (its official defaultIntParams), so a
 * fresh box starts where the official editor does. A box with params of its own is left alone.
 */
export const withServerDefaultIntParams = <T extends Triggerable>(triggerable: T): T => {
    if (!triggerable || triggerable.intData?.length || !triggerable.defaultIntParams?.length) return triggerable;

    return withTriggerableData(triggerable, { intParams: triggerable.defaultIntParams });
};

/**
 * The box with a clipboard entry pasted in. A paste takes everything the official one restores: the
 * settings, both pick lists, the sources, the variable ids, and the delay, quantifier or selector
 * switches. "Paste into" keeps the box's own furni picks and delay and takes only the settings: the int params, the
 * string and the variable ids (where the variable boxes keep their variables, as AIR).
 */
export const pasteTriggerableData = <T extends Triggerable>(triggerable: T, entry: WiredClipboardEntry, pasteInto: boolean): T =>
    pasteInto
        ? withTriggerableData(triggerable, { intParams: entry.intParams, stringParam: entry.stringParam, variableIds: entry.variableIds })
        : withTriggerableData(triggerable, {
              intParams: entry.intParams,
              stringParam: entry.stringParam,
              furniIds: entry.furniIds,
              delayInPulses: entry.delayInPulses,
              furniIds2: entry.furniIds2,
              furniSourceTypes: entry.furniSourceTypes,
              userSourceTypes: entry.userSourceTypes,
              variableIds: entry.variableIds,
              quantifierCode: entry.quantifierCode,
              selectorFilter: entry.selectorFilter,
              selectorInvert: entry.selectorInvert
          });

/** The two pick lists of an open box after a furni left the room. */
export interface WiredPicksAfterRemoval {
    /** The open box itself was removed: the editor closes. */
    closesEditor: boolean;
    furniIds: number[];
    furniIds2: number[];
    /** Whether either list lost the furni. */
    changed: boolean;
}

/**
 * Official stuffRemoved: the removed furni closes the editor when it is the open box, and otherwise
 * drops out of both pick lists.
 */
export const removeFurniFromWiredPicks = (openBoxId: number, furniIds: number[], furniIds2: number[], removedId: number): WiredPicksAfterRemoval => {
    if (openBoxId === removedId) return { closesEditor: true, furniIds, furniIds2, changed: false };

    const nextFurniIds = furniIds.filter((id) => id !== removedId);
    const nextFurniIds2 = furniIds2.filter((id) => id !== removedId);
    const changed = nextFurniIds.length !== furniIds.length || nextFurniIds2.length !== furniIds2.length;

    return { closesEditor: false, furniIds: changed ? nextFurniIds : furniIds, furniIds2: changed ? nextFurniIds2 : furniIds2, changed };
};
