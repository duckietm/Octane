import { holderScopeOfKind, targetKindLabel, WebApiHolderScope, WebApiProfile, WebApiTargetKind, WebApiUserTargetKind, WebApiVariable, WebApiVariableScope } from '../../api';
import { VARIABLES_ELEMENTS } from '../wired-tools/WiredCreatorTools.constants';
import { VariableDefinition, VariablesElementButton, VariablesElementType } from '../wired-tools/WiredCreatorTools.types';

/** The API exposes no context variables. */
export const EXPLORER_VARIABLE_ELEMENTS: VariablesElementButton[] = VARIABLES_ELEMENTS.filter((element) => element.key !== 'context');

export type ExplorerVariablesType = Exclude<VariablesElementType, 'context'>;

export const scopeOfVariablesType = (type: VariablesElementType): WebApiVariableScope => (type === 'furni' ? 'furni' : type === 'global' ? 'global' : 'user');

const TARGET_OF_SCOPE: Record<WebApiVariableScope, VariableDefinition['target']> = { user: 'User', furni: 'Furni', global: 'Global' };

/** A web api variable as the creator tools' variable picker lists it. Everything the API shows is permanent. */
export const toVariableDefinition = (variable: WebApiVariable, canWrite: boolean): VariableDefinition => ({
    key: variable.name,
    target: TARGET_OF_SCOPE[variable.scope] ?? 'User',
    type: 'Custom',
    hasValue: variable.hasValue,
    availability: 'Permanent',
    canWriteTo: canWrite && variable.hasValue,
    canCreateDelete: canWrite && variable.scope !== 'global',
    canIntercept: false,
    hasCreationTime: true,
    hasUpdateTime: true,
    isTextConnected: variable.textConnected
});

export const variableProperties = (definition: VariableDefinition | null): { key: string; value: string }[] => {
    if (!definition) return [];

    const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

    return [
        { key: 'Name', value: definition.key },
        { key: 'Type', value: definition.type },
        { key: 'Target', value: definition.target },
        { key: 'Availability', value: definition.availability },
        { key: 'Has value', value: yesNo(definition.hasValue) },
        { key: 'Can write to', value: yesNo(definition.canWriteTo) },
        { key: 'Can create/delete', value: yesNo(definition.canCreateDelete) },
        { key: 'Is text connected', value: yesNo(definition.isTextConnected) }
    ];
};

/** Whose variables the holder window shows. A user looked up by name gets their id from the profile. */
export type ExplorerHolderTarget =
    | { scope: WebApiHolderScope; kind: WebApiTargetKind; entityId: number }
    | { scope: 'user'; kind: 'users'; username: string }
    | { scope: 'global' };

export type ExplorerLookupKind = 'username' | WebApiTargetKind;

export const EXPLORER_LOOKUP_KINDS: { value: ExplorerLookupKind; label: string }[] = [
    { value: 'username', label: 'User name' },
    { value: 'users', label: 'User id' },
    { value: 'pets', label: 'Pet id' },
    { value: 'bots', label: 'Bot id' },
    { value: 'furni', label: 'Floor furni id' },
    { value: 'wall-items', label: 'Wall furni id' },
    { value: 'furni-bc', label: 'Builders Club floor furni id' },
    { value: 'wall-items-bc', label: 'Builders Club wall furni id' }
];

/** The lookup field's target, or `null` when the input does not fit the kind. */
export const lookupTarget = (kind: ExplorerLookupKind, input: string): ExplorerHolderTarget | null => {
    const text = (input ?? '').trim();

    if (!text) return null;

    if (kind === 'username') return text.length <= 64 ? { scope: 'user', kind: 'users', username: text } : null;
    if (!/^[0-9]{1,10}$/.test(text)) return null;

    const entityId = Number(text);

    if (entityId <= 0 || entityId > 2147483647) return null;

    return { scope: holderScopeOfKind(kind), kind, entityId };
};

/** The id writes go to: the target's own, or the one a name lookup resolved to. */
export const resolvedEntityId = (target: ExplorerHolderTarget, profile: WebApiProfile | null): number | null => {
    if (target.scope === 'global') return null;
    if ('entityId' in target) return target.entityId;

    return typeof profile?.entityId === 'number' ? profile.entityId : null;
};

/** A holders row: the kind and the name the API sent (also for users who are not in the room), else the id. */
export const explorerHolderDescription = (kind: WebApiTargetKind, entityId: number, entityName: string): { categoryLabel: string; entityName: string } => {
    const categoryLabel = targetKindLabel(kind);
    const named = !!entityName && entityName !== `${categoryLabel} #${entityId}`;

    return { categoryLabel, entityName: named ? entityName : `#${entityId}` };
};

export const holderPanelTitle = (target: ExplorerHolderTarget): string => {
    switch (target.scope) {
        case 'furni':
            return 'Manage Furni Variables';
        case 'global':
            return 'Manage Global Variables';
        default:
            return 'Manage User Variables';
    }
};

/** The same lines as the creator tools' holder window; `localName` is what the room you stand in knows. */
export const holderInfoLines = (target: ExplorerHolderTarget, profile: WebApiProfile | null, roomId: number, localName = '', localOwner = ''): string[] => {
    if (target.scope === 'global') return ['Scope: Room', `Room id: ${roomId}`];

    const entityId = resolvedEntityId(target, profile);
    const idText = entityId === null ? '?' : String(entityId);

    if (target.scope === 'furni') {
        return [
            `Furni type: ${targetKindLabel(target.kind)}`,
            ...(localName ? [`Name: ${localName}`] : []),
            ...(localOwner ? [`Owner: ${localOwner}`] : []),
            `Furni id: ${idText}`
        ];
    }

    const name = profile?.name || localName || ('username' in target ? target.username : '');

    return [
        `User type: ${targetKindLabel(target.kind as WebApiUserTargetKind)}`,
        ...(name ? [`Name: ${name}`] : []),
        ...(localOwner ? [`Owner: ${localOwner}`] : []),
        `${target.kind === 'pets' ? 'Pet' : target.kind === 'bots' ? 'Bot' : 'User'} id: ${idText}`
    ];
};
