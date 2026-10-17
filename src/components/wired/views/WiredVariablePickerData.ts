export type WiredVariablePickerTarget = 'user' | 'furni' | 'global' | 'context';
export type WiredVariablePickerUsage = 'give' | 'remove' | 'change-destination' | 'change-reference' | 'condition' | 'filter-main' | 'echo';

export interface IWiredVariableDefinitionLike {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    itemId: number;
    name: string;
    /** AIR WiredVariable.variableType: 0 user, 1 internal, 2 user derived, 3 smart. */
    variableType?: number;
    /** AIR WiredVariable.isInvisible: hidden from the picker unless it is the stored selection. */
    isInvisible?: boolean;
    /** AIR WiredVariable.requiresExecutionContext: the variable only exists while a stack runs. */
    requiresExecutionContext?: boolean;
}

export interface IWiredVariablePickerEntry {
    id: string;
    token: string;
    label: string;
    displayLabel: string;
    searchableText: string;
    selectable: boolean;
    hasValue: boolean;
    kind: 'internal' | 'custom';
    /** AIR WiredVariable.variableType, which decides the picker tab the variable is listed under. */
    variableType?: number;
    isInvisible?: boolean;
    target: WiredVariablePickerTarget;
    /** Older callers may still hand the picker pre-grouped entries; the picker reads leaves only. */
    children?: IWiredVariablePickerEntry[];
}

/** AIR variable types (WiredVariable.variableType). */
export const WIRED_VARIABLE_TYPE_USER = 0;
export const WIRED_VARIABLE_TYPE_INTERNAL = 1;
export const WIRED_VARIABLE_TYPE_USER_DERIVED = 2;
export const WIRED_VARIABLE_TYPE_DYNAMIC = 3;

interface IInternalVariableMeta {
    key: string;
    canUseAsDestination: boolean;
    canUseAsReference: boolean;
}

const INTERNAL_VARIABLE_ALIASES: Record<string, string> = {
    '@position.x': '@position_x',
    '@position.y': '@position_y',
    '@effect': '@effect_id',
    '@handitems': '@handitem_id',
    '@is_mute': '@is_muted',
    '@teams.red.score': '@team_red_score',
    '@teams.green.score': '@team_green_score',
    '@teams.blue.score': '@team_blue_score',
    '@teams.yellow.score': '@team_yellow_score',
    '@teams.red.size': '@team_red_size',
    '@teams.green.size': '@team_green_size',
    '@teams.blue.size': '@team_blue_size',
    '@teams.yellow.size': '@team_yellow_size'
};

const CUSTOM_TOKEN_PREFIX = 'custom:';
const INTERNAL_TOKEN_PREFIX = 'internal:';

const createInternalMeta = (key: string, canUseAsDestination = false, canUseAsReference = false): IInternalVariableMeta => ({
    key,
    canUseAsDestination,
    canUseAsReference
});

/**
 * The official client files variables of type 3 under "Smart variables" and strips both `@` and `~`
 * from names. Internal variables read a stored value and start with `@`; the ones computed from a
 * property of the furni (`~teleport.target_id`, `~recolorable_furni.color.rgb`) start with `~`.
 */
export const isSmartVariableKey = (key: string) => !!key && key.trim().startsWith('~');

const internalVariableType = (key: string) => (isSmartVariableKey(key) ? WIRED_VARIABLE_TYPE_DYNAMIC : WIRED_VARIABLE_TYPE_INTERNAL);

export const normalizeInternalVariableKey = (key: string) => {
    const normalizedKey = key?.trim();

    if (!normalizedKey) return '';

    return INTERNAL_VARIABLE_ALIASES[normalizedKey] || normalizedKey;
};

const INTERNAL_VARIABLES: Record<'user' | 'furni' | 'global' | 'context', IInternalVariableMeta[]> = {
    furni: [
        createInternalMeta('~teleport.target_id', false, true),
        createInternalMeta('@id', false, true),
        createInternalMeta('@class_id', false, true),
        createInternalMeta('@height', false, true),
        createInternalMeta('@state', true, true),
        createInternalMeta('@position_x', true, true),
        createInternalMeta('@position_y', true, true),
        createInternalMeta('@rotation', true, true),
        createInternalMeta('@altitude', true, true),
        createInternalMeta('@opacity', true, true),
        createInternalMeta('@gravity', true, true),
        createInternalMeta('@is_invisible', false, true),
        createInternalMeta('@type', false, true),
        createInternalMeta('@is_stackable', false, true),
        createInternalMeta('@can_stand_on', false, true),
        createInternalMeta('@can_sit_on', false, true),
        createInternalMeta('@can_lay_on', false, true),
        createInternalMeta('@wallitem_offset', false, true),
        createInternalMeta('@dimensions.x', false, true),
        createInternalMeta('@dimensions.y', false, true),
        createInternalMeta('@owner_id', false, true),
        createInternalMeta('@projectile.animation.position.x', false, true),
        createInternalMeta('@projectile.animation.position.y', false, true),
        createInternalMeta('@projectile.animation.position.altitude', false, true),
        createInternalMeta('@projectile.animation.is_traveling', false, false),
        createInternalMeta('@projectile.animation.tiles_traveled', false, true),
        createInternalMeta('@projectile.animation.furni_collisions', false, true),
        createInternalMeta('@projectile.animation.user_collisions', false, true)
    ],
    user: [
        createInternalMeta('@index', false, true),
        createInternalMeta('@type', false, true),
        createInternalMeta('@gender', false, true),
        createInternalMeta('@level', false, true),
        createInternalMeta('@achievement_score', false, true),
        createInternalMeta('@is_hc', false, true),
        createInternalMeta('@has_rights', false, true),
        createInternalMeta('@is_group_admin', false, true),
        createInternalMeta('@is_owner', false, true),
        createInternalMeta('@is_muted', false, true),
        createInternalMeta('@is_trading', false, true),
        createInternalMeta('@is_frozen', false, true),
        createInternalMeta('@effect_id', false, true),
        createInternalMeta('@team_score', false, true),
        createInternalMeta('@team_color', false, true),
        createInternalMeta('@team_type', false, true),
        createInternalMeta('@sign', false, true),
        createInternalMeta('@dance', false, true),
        createInternalMeta('@is_idle', false, true),
        createInternalMeta('@handitem_id', false, true),
        createInternalMeta('@position_x', true, true),
        createInternalMeta('@position_y', true, true),
        createInternalMeta('@direction', true, true),
        createInternalMeta('@altitude', false, true),
        createInternalMeta('@favourite_group_id', false, true),
        createInternalMeta('@room_entry.method', false, true),
        createInternalMeta('@room_entry.teleport_id', false, true),
        createInternalMeta('@user_id', false, true),
        createInternalMeta('@bot_id', false, true),
        createInternalMeta('@pet_id', false, true),
        createInternalMeta('@pet_owner_id', false, true)
    ],
    global: [
        createInternalMeta('@furni_count', false, true),
        createInternalMeta('@user_count', false, true),
        createInternalMeta('@wired_timer', false, true),
        createInternalMeta('@team_red_score', false, true),
        createInternalMeta('@team_green_score', false, true),
        createInternalMeta('@team_blue_score', false, true),
        createInternalMeta('@team_yellow_score', false, true),
        createInternalMeta('@team_red_size', false, true),
        createInternalMeta('@team_green_size', false, true),
        createInternalMeta('@team_blue_size', false, true),
        createInternalMeta('@team_yellow_size', false, true),
        createInternalMeta('@room_id', false, true),
        createInternalMeta('@group_id', false, true),
        createInternalMeta('@timezone_server', false, true),
        createInternalMeta('@timezone_client', false, true),
        createInternalMeta('@current_time', false, true),
        createInternalMeta('@current_time.millisecond_of_second', false, true),
        createInternalMeta('@current_time.seconds_of_minute', false, true),
        createInternalMeta('@current_time.minute_of_hour', false, true),
        createInternalMeta('@current_time.hour_of_day', false, true),
        createInternalMeta('@current_time.day_of_week', false, true),
        createInternalMeta('@current_time.day_of_month', false, true),
        createInternalMeta('@current_time.day_of_year', false, true),
        createInternalMeta('@current_time.week_of_year', false, true),
        createInternalMeta('@current_time.month_of_year', false, true),
        createInternalMeta('@current_time.year', false, true)
    ],
    context: [
        createInternalMeta('@selector_furni_count', false, true),
        createInternalMeta('@selector_user_count', false, true),
        createInternalMeta('@signal_furni_count', false, true),
        createInternalMeta('@signal_user_count', false, true),
        createInternalMeta('@antenna_id', false, true),
        createInternalMeta('@chat_type', false, true),
        createInternalMeta('@chat_style', false, true)
    ]
};

const getNormalizedInternalTarget = (target: WiredVariablePickerTarget): 'user' | 'furni' | 'global' | 'context' => {
    if (target === 'furni') return 'furni';
    if (target === 'user') return 'user';
    if (target === 'context') return 'context';

    return 'global';
};

const getInternalSelectable = (usage: WiredVariablePickerUsage, meta: IInternalVariableMeta, target: WiredVariablePickerTarget) => {
    switch (usage) {
        case 'condition':
            return true;
        case 'filter-main':
            return meta.canUseAsReference;
        case 'echo':
            // Official echo filter: any variable that can be read outside a running stack; context ones cannot.
            return target !== 'context';
        case 'change-destination':
            return meta.canUseAsDestination;
        case 'change-reference':
            return meta.canUseAsReference;
        default:
            return false;
    }
};

const getCustomSelectable = (usage: WiredVariablePickerUsage, definition: IWiredVariableDefinitionLike, target: WiredVariablePickerTarget) => {
    switch (usage) {
        case 'condition':
        case 'filter-main':
            return true;
        case 'echo':
            return target !== 'context' && !definition.requiresExecutionContext;
        case 'change-reference':
            return !!definition.hasValue;
        case 'change-destination':
            return !!definition.hasValue && !definition.isReadOnly;
        default:
            return !definition.isReadOnly;
    }
};

const createInternalEntry = (target: WiredVariablePickerTarget, usage: WiredVariablePickerUsage, meta: IInternalVariableMeta): IWiredVariablePickerEntry => ({
    id: `${INTERNAL_TOKEN_PREFIX}${meta.key}`,
    token: `${INTERNAL_TOKEN_PREFIX}${meta.key}`,
    label: meta.key,
    displayLabel: meta.key,
    searchableText: meta.key,
    selectable: getInternalSelectable(usage, meta, target),
    hasValue: meta.canUseAsReference,
    kind: 'internal',
    variableType: internalVariableType(meta.key),
    target
});

const createCustomEntry = (
    target: WiredVariablePickerTarget,
    usage: WiredVariablePickerUsage,
    definition: IWiredVariableDefinitionLike
): IWiredVariablePickerEntry => ({
    id: `${CUSTOM_TOKEN_PREFIX}${definition.itemId}`,
    token: `${CUSTOM_TOKEN_PREFIX}${definition.itemId}`,
    label: definition.name,
    displayLabel: definition.name,
    searchableText: definition.name,
    selectable: getCustomSelectable(usage, definition, target),
    hasValue: !!definition.hasValue,
    kind: 'custom',
    variableType: definition.variableType ?? WIRED_VARIABLE_TYPE_USER,
    isInvisible: !!definition.isInvisible,
    target
});

export const createCustomVariableToken = (itemId: number) => (itemId > 0 ? `${CUSTOM_TOKEN_PREFIX}${itemId}` : '');
export const createInternalVariableToken = (key: string) => {
    const normalizedKey = normalizeInternalVariableKey(key);

    return normalizedKey ? `${INTERNAL_TOKEN_PREFIX}${normalizedKey}` : '';
};
export const isCustomVariableToken = (token: string) => !!token && token.startsWith(CUSTOM_TOKEN_PREFIX);
export const isInternalVariableToken = (token: string) => !!token && token.startsWith(INTERNAL_TOKEN_PREFIX);
export const getCustomVariableItemId = (token: string) => (isCustomVariableToken(token) ? parseInt(token.slice(CUSTOM_TOKEN_PREFIX.length), 10) || 0 : 0);
export const getInternalVariableKey = (token: string) =>
    isInternalVariableToken(token) ? normalizeInternalVariableKey(token.slice(INTERNAL_TOKEN_PREFIX.length)) : '';

export const normalizeVariableTokenFromWire = (value: string) => {
    const normalizedValue = value?.trim();

    if (!normalizedValue) return '';
    if (isCustomVariableToken(normalizedValue)) return normalizedValue;
    if (isInternalVariableToken(normalizedValue)) return createInternalVariableToken(normalizedValue.slice(INTERNAL_TOKEN_PREFIX.length));

    const parsedValue = parseInt(normalizedValue, 10);

    return !Number.isNaN(parsedValue) && parsedValue > 0 ? createCustomVariableToken(parsedValue) : '';
};

export const createFallbackVariableEntry = (target: WiredVariablePickerTarget, token: string): IWiredVariablePickerEntry | null => {
    if (!token) return null;

    if (isCustomVariableToken(token)) {
        const itemId = getCustomVariableItemId(token);

        if (itemId <= 0) return null;

        return {
            id: token,
            token,
            label: `#${itemId}`,
            displayLabel: `#${itemId}`,
            searchableText: `#${itemId}`,
            selectable: true,
            hasValue: false,
            kind: 'custom',
            variableType: WIRED_VARIABLE_TYPE_USER,
            target
        };
    }

    if (isInternalVariableToken(token)) {
        const key = getInternalVariableKey(token);

        if (!key) return null;

        return {
            id: token,
            token,
            label: key,
            displayLabel: key,
            searchableText: key,
            selectable: false,
            hasValue: false,
            kind: 'internal',
            variableType: internalVariableType(key),
            target
        };
    }

    return null;
};

/**
 * One entry per variable, in catalogue order: the room's own variables as the server lists them, then the built-in
 * ones. AIR keeps the server order and builds its '.' tree in insertion order, so nothing is sorted or grouped here;
 * the picker builds the tree itself.
 */
export const buildWiredVariablePickerEntries = (
    target: WiredVariablePickerTarget,
    usage: WiredVariablePickerUsage,
    customDefinitions: IWiredVariableDefinitionLike[]
) => {
    const internalTarget = getNormalizedInternalTarget(target);
    const entries = [
        ...(customDefinitions || []).map((definition) => createCustomEntry(target, usage, definition)),
        ...INTERNAL_VARIABLES[internalTarget].map((meta) => createInternalEntry(target, usage, meta))
    ];
    const seen = new Set<string>();

    return entries.filter((entry) => {
        if (!entry.displayLabel?.trim() || seen.has(entry.token)) return false;

        seen.add(entry.token);

        return true;
    });
};

export const flattenWiredVariablePickerEntries = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => {
    const flattened: IWiredVariablePickerEntry[] = [];

    for (const entry of entries) {
        flattened.push(entry);

        if (entry.children?.length) flattened.push(...flattenWiredVariablePickerEntries(entry.children));
    }

    return flattened;
};

/** One node of the picker tree: a name segment, the variable it ends (if any) and its child segments. */
export interface IWiredVariableNode {
    name: string;
    entry: IWiredVariablePickerEntry | null;
    children: Map<string, IWiredVariableNode>;
}

const createNode = (entry: IWiredVariablePickerEntry | null, name: string): IWiredVariableNode => ({ name, entry, children: new Map() });

export const splitWiredVariableName = (name: string) => name.split('.');

/**
 * A node without a variable whose only child flattens to a leaf takes that leaf's variable and drops its children.
 * With `useFullName` a resulting leaf shows the variable's full name.
 */
export const flattenWiredVariableNode = (node: IWiredVariableNode, useFullName = false): boolean => {
    if (node.children.size === 1 && node.entry === null) {
        const onlyChild = node.children.values().next().value as IWiredVariableNode;

        if (flattenWiredVariableNode(onlyChild)) {
            node.entry = onlyChild.entry;
            node.children = new Map();
        }
    }

    const isLeaf = node.entry !== null && node.children.size === 0;

    if (useFullName && isLeaf) node.name = node.entry.displayLabel;

    return isLeaf;
};

/**
 * One node per name segment, nested to any depth, in the order the variables come in. Only the last segment carries
 * the variable and an existing node is reused as it is. With `flatten` every root child is flattened with full names
 * (the recent and search tabs).
 */
export const buildWiredVariableNodes = (entries: IWiredVariablePickerEntry[], flatten = false): IWiredVariableNode => {
    const root = createNode(null, null);

    for (const entry of entries) {
        const segments = splitWiredVariableName(entry.displayLabel);
        let parent = root;

        segments.forEach((segment, index) => {
            let node = parent.children.get(segment);

            if (!node) {
                node = createNode(index === segments.length - 1 ? entry : null, segment);
                parent.children.set(segment, node);
            }

            parent = node;
        });
    }

    if (flatten) for (const child of root.children.values()) flattenWiredVariableNode(child, true);

    return root;
};

/** A node can be picked when it ends a variable the editor accepts. */
export const canSelectWiredVariableNode = (node: IWiredVariableNode) => !!node.entry && node.entry.selectable;

/** A node is drawn disabled when neither it nor any descendant can be picked. */
export const isWiredVariableNodeDisabled = (node: IWiredVariableNode): boolean => {
    if (canSelectWiredVariableNode(node)) return false;

    for (const child of node.children.values()) if (!isWiredVariableNodeDisabled(child)) return false;

    return true;
};
