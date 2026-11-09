import { IWiredVariableData } from '@octane/renderer';
import { localizeWithFallback } from '../../api';
import {
    WIRED_VARIABLE_TYPE_CREATED,
    WIRED_VARIABLE_TYPE_INTERNAL,
    wiredVariableBoxId,
    wiredVariableTextValues
} from '../../api/wired/WiredVariableCatalog';
import {
    WIRED_OFFICIAL_TARGET_CONTEXT,
    WIRED_OFFICIAL_TARGET_FURNI,
    WIRED_OFFICIAL_TARGET_GLOBAL,
    WIRED_OFFICIAL_TARGET_USER
} from '../../api/wired/WiredVariableTargets';
import { VariableDefinition, VariablesElementType } from './WiredCreatorTools.types';

/** The official variable target of each picker type. */
export const VARIABLES_TYPE_TARGET: Readonly<Record<VariablesElementType, number>> = {
    furni: WIRED_OFFICIAL_TARGET_FURNI,
    user: WIRED_OFFICIAL_TARGET_USER,
    global: WIRED_OFFICIAL_TARGET_GLOBAL,
    context: WIRED_OFFICIAL_TARGET_CONTEXT
};

const TARGET_NAMES: Readonly<Record<number, VariableDefinition['target']>> = {
    [WIRED_OFFICIAL_TARGET_FURNI]: 'Furni',
    [WIRED_OFFICIAL_TARGET_USER]: 'User',
    [WIRED_OFFICIAL_TARGET_GLOBAL]: 'Global',
    [WIRED_OFFICIAL_TARGET_CONTEXT]: 'Context'
};

/** AIR getAvailabilityString: the availability text, or the "misc" one for an id without its own text. */
export const wiredVariableAvailabilityLabel = (availabilityType: number): string =>
    localizeWithFallback(`wiredfurni.params.variables.availability.${availabilityType}`, localizeWithFallback('wiredfurni.params.variables.availability.misc', String(availabilityType)));

/** One catalogue variable as a picker row: every flag as the server sent it. */
export const wiredVariableToDefinition = (variable: IWiredVariableData): VariableDefinition => ({
    key: variable.variableName,
    variableId: variable.variableId,
    itemId: wiredVariableBoxId(variable.variableId) ?? undefined,
    target: TARGET_NAMES[variable.variableTarget] ?? 'User',
    variableTarget: variable.variableTarget,
    type: variable.variableType === WIRED_VARIABLE_TYPE_CREATED ? 'Custom' : variable.variableType === WIRED_VARIABLE_TYPE_INTERNAL ? 'Internal' : 'Other',
    variableType: variable.variableType,
    hasValue: variable.hasValue,
    isReadOnly: !variable.canWriteValue,
    availability: wiredVariableAvailabilityLabel(variable.availabilityType),
    availabilityType: variable.availabilityType,
    canWriteTo: variable.canWriteValue,
    canCreateDelete: variable.canCreateAndDelete,
    canIntercept: variable.canInterceptChanges,
    hasCreationTime: variable.canReadCreationTime,
    hasUpdateTime: variable.canReadLastUpdateTime,
    isTextConnected: variable.textConnector !== null,
    isAlwaysAvailable: variable.alwaysAvailable,
    textConnector: wiredVariableTextValues(variable),
    requiresExecutionContext: variable.requiresExecutionContext
});

/** AIR getTargetString. */
const targetLabel = (variableTarget: number): string => {
    switch (variableTarget) {
        case WIRED_OFFICIAL_TARGET_FURNI:
            return localizeWithFallback('wiredfurni.params.sourcetype.furni', 'Furni');
        case WIRED_OFFICIAL_TARGET_USER:
            return localizeWithFallback('wiredfurni.params.sourcetype.users', 'Users');
        case WIRED_OFFICIAL_TARGET_GLOBAL:
            return localizeWithFallback('wiredfurni.params.sourcetype.global', 'Global');
        case WIRED_OFFICIAL_TARGET_CONTEXT:
            return localizeWithFallback('wiredfurni.params.sourcetype.context', 'Context');
        default:
            return '';
    }
};

/** AIR updatePropertiesTableUI: the rows of the selected variable, every value from the server. */
export const wiredVariablePropertyRows = (definition: VariableDefinition | null): { key: string; value: string }[] => {
    if (!definition) return [];

    const row = (name: string, fallback: string, value: string) => ({
        key: localizeWithFallback(`wiredmenu.variable_overview.properties.${name}`, fallback),
        value
    });
    const bool = (value: boolean) => (value ? localizeWithFallback('wiredmenu.bool.yes', 'Yes') : localizeWithFallback('wiredmenu.bool.no', 'No'));

    return [
        row('name', 'Name', definition.key),
        row('type', 'Type', localizeWithFallback(`wiredfurni.params.variables.idtype.${definition.variableType}`, definition.type)),
        row('target', 'Target', targetLabel(definition.variableTarget)),
        row('availability', 'Availability', definition.availability),
        row('has_value', 'Has value', bool(definition.hasValue)),
        row('can_write_to', 'Can write to', bool(definition.canWriteTo)),
        row('can_create_delete', 'Can create/delete', bool(definition.canCreateDelete)),
        row('can_intercept', 'Can intercept', bool(definition.canIntercept)),
        row('is_always_available', 'Is always available', bool(!!definition.isAlwaysAvailable)),
        row('can_read_creation_time', 'Has creation time', bool(definition.hasCreationTime)),
        row('can_read_last_update_time', 'Has update time', bool(definition.hasUpdateTime)),
        row('is_text_connected', 'Is text connected', bool(definition.isTextConnected))
    ];
};
