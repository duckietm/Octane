import { IWiredLeaderboardContext } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import {
    decodeLeaderboardConfig,
    defaultLeaderboardColumn,
    encodeLeaderboardConfig,
    ILeaderboardColumn,
    ILeaderboardConfig,
    LEADERBOARD_COLUMN_DEFAULT_LABELS,
    LEADERBOARD_COLUMN_KEYS,
    LEADERBOARD_COLUMN_MENU,
    LEADERBOARD_DESCRIPTION_MAX,
    LEADERBOARD_LABEL_MAX,
    LEADERBOARD_MAX_CHOICES,
    LEADERBOARD_MAX_COLUMNS,
    LEADERBOARD_MAX_OFFSET_X,
    LEADERBOARD_MIN_OFFSET_X,
    LEADERBOARD_OVERRIDE_MAX,
    LEADERBOARD_PAGE_SIZES,
    LEADERBOARD_SORT_KEYS,
    LEADERBOARD_TITLE_MAX,
    LEADERBOARD_WIDTH_KEYS,
    OPERAND_GLOBAL_VARIABLE,
    OPERAND_LITERAL,
    suggestLeaderboardName,
    validateLeaderboardConfig
} from '../../../../api/wired/WiredLeaderboard';
import { Text } from '../../../../common';
import { useWired, useWiredLeaderboardStore, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { withoutExecutionContextVariables } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';
import { BaseButton } from '../../../../common/BaseButton';

const P = 'wiredfurni.params.variable_leaderboard';
const SORT_FALLBACKS = [ 'Highest value first', 'Lowest value first', 'Oldest creation first', 'Latest creation first', 'Oldest update first', 'Latest update first' ];
const WIDTH_FALLBACKS = [ 'Small', 'Medium', 'Large', 'Extra large' ];
const COLUMN_FALLBACKS = [ 'Username', 'Value', 'Last update', 'Creation', 'Level', 'Text connection' ];
const ERROR_FALLBACKS: Record<string, string> = {
    'wiredfurni.error.variable_leaderboard.invalid_configuration': 'Invalid leaderboard configuration.',
    'wiredfurni.error.variable_leaderboard.missing_context': 'Leaderboard information is unavailable. Close and reopen this Wired box.',
    'wiredfurni.error.variable_leaderboard.title_required': 'Enter a leaderboard title.',
    'wiredfurni.error.variable_leaderboard.column_name_length': 'Column names must contain at least two characters.',
    'wiredfurni.error.variable_leaderboard.filter_required': 'Select a filtering variable.',
    'wiredfurni.error.variable_leaderboard.global_operand_required': 'Select a global comparison variable.'
};

const text = (key: string, fallback: string) => localizeWithFallback(`${ P }.${ key }`, fallback);
const toInt = (value: string, fallback: number) => {
    const parsed = parseInt(value, 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

/** When a column's type changes, its label and width follow only if they were still the old type's defaults. */
const retypeColumn = (column: ILeaderboardColumn, type: number): ILeaderboardColumn => {
    const previous = defaultLeaderboardColumn(column.type);
    const next = defaultLeaderboardColumn(type);

    return {
        type,
        label: (column.label === previous.label) ? next.label : column.label,
        width: (column.width === previous.width) ? next.width : column.width
    };
};

/**
 * Editor of the official variable leaderboard addon (code 1005). The config lives in the leaderboard
 * store while the box is open, so the room shows it on the panel (or a preview) as it is edited and
 * dragging the panel moves the location here.
 */
export const WiredExtraVariableLeaderboardView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const tools = useWiredTools();
    // AIR's leaderboard picker leaves pointers out: a leaderboard is read without a running stack.
    const userVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.userVariableDefinitions), [tools.userVariableDefinitions]);
    const roomVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.roomVariableDefinitions), [tools.roomVariableDefinitions]);
    const draft = useWiredLeaderboardStore((state) => state.editDraft);
    const beginEdit = useWiredLeaderboardStore((state) => state.beginEdit);
    const updateDraft = useWiredLeaderboardStore((state) => state.updateDraft);
    const endEdit = useWiredLeaderboardStore((state) => state.endEdit);
    const [ names, setNames ] = useState<Record<string, string>>({});
    const [ error, setError ] = useState<string>(null);

    const context: IWiredLeaderboardContext = (trigger && 'leaderboardContext' in trigger) ? (trigger as { leaderboardContext: IWiredLeaderboardContext }).leaderboardContext : null;
    const choices = useMemo(() => (context?.choices ?? []).slice(0, LEADERBOARD_MAX_CHOICES), [ context ]);

    useEffect(() => {
        if (!trigger) return;

        const config = decodeLeaderboardConfig(trigger.intData, trigger.stringData, context?.physicalTileX ?? 0, context?.physicalTileY ?? 0, trigger.variableIds ?? []);
        const initialNames: Record<string, string> = {};

        for (const choice of (context?.choices ?? []).slice(0, LEADERBOARD_MAX_CHOICES)) {
            initialNames[choice.variableId] = config.displayOverrides[choice.variableId] ?? suggestLeaderboardName(choice.technicalName);
        }

        setNames(initialNames);
        setError(null);
        beginEdit(context?.overlayInstanceId ?? 0, config);
    }, [ trigger, context, beginEdit ]);

    useEffect(() => () => endEdit(), [ endEdit ]);

    /** Only names that differ from the suggestion are stored, and only for variables still offered. */
    const withOverrides = (config: ILeaderboardConfig): ILeaderboardConfig => {
        const displayOverrides: Record<string, string> = {};

        for (const choice of choices) {
            const name = (names[choice.variableId] ?? '').trim();

            if (name.length && name !== suggestLeaderboardName(choice.technicalName)) displayOverrides[choice.variableId] = name;
        }

        return { ...config, displayOverrides };
    };

    const validate = () => {
        if (!draft) return false;

        const key = !context ? 'wiredfurni.error.variable_leaderboard.missing_context' : validateLeaderboardConfig(withOverrides(draft));

        setError(key ? localizeWithFallback(key, ERROR_FALLBACKS[key] ?? key) : null);

        return !key;
    };

    const save = () => {
        if (!draft) return;

        const { intParams, stringParam } = encodeLeaderboardConfig(withOverrides(draft));

        setIntParams(intParams);
        setStringParam(stringParam);
    };

    if (!draft) return null;

    const patch = (changes: Partial<ILeaderboardConfig>) => updateDraft(changes);
    const setColumns = (columns: ILeaderboardColumn[]) => patch({ columns });
    const setColumnCount = (count: number) => {
        const columns = draft.columns.slice(0, count);

        while (columns.length < count) {
            const type = LEADERBOARD_COLUMN_MENU.find((candidate) => !columns.some((column) => column.type === candidate)) ?? LEADERBOARD_COLUMN_MENU[0];

            columns.push(defaultLeaderboardColumn(type));
        }

        setColumns(columns);
    };
    const patchColumn = (index: number, column: ILeaderboardColumn) => setColumns(draft.columns.map((entry, i) => (i === index ? column : entry)));

    const warning = !context
        ? text('warning.missing_context', 'Leaderboard information is unavailable. Close and reopen this Wired box.')
        : !choices.some((choice) => choice.persistent)
            ? text('warning.no_persistent_user', 'Stack this box with a permanent user variable.')
            : (context.totalCandidateCount > LEADERBOARD_MAX_CHOICES)
                ? text('warning.too_many_choices', 'Only the first 10 variables are shown.')
                : null;
    const valueAvailable = choices.some((choice) => choice.persistent && choice.hasValue);
    const sortOptions = LEADERBOARD_SORT_KEYS.map((key, value) => ({ key, value })).filter((option) => valueAvailable || option.value > 1 || option.value === draft.sortMode);
    const filterDefinition = userVariableDefinitions.find((definition) => String(definition.itemId) === draft.filterVariableId);

    const select = (label: string, value: number | string, options: { value: number | string, label: string }[], onChange: (value: string) => void, testId?: string) => (
        <div className="flex items-center gap-2">
            {label && <Text>{label}</Text>}
            <Select className="form-select form-select-sm" data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
        </div>
    );

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} widthModifier={1.35}>
            <div className="flex flex-col gap-2 octane-wired-leaderboard-editor">
                {warning && <Text small className="text-red-500">{warning}</Text>}

                <Text bold>{text('section.general', 'General')}</Text>
                <Text small>{text('title', 'Title')}</Text>
                <OctaneInput inputSize="sm" data-testid="leaderboard-title" maxLength={LEADERBOARD_TITLE_MAX} value={draft.title} onChange={(event) => patch({ title: event.target.value.replace(/\t/g, ' ') })} />
                <Text small>{text('description', 'Description')}</Text>
                <OctaneInput inputSize="sm" maxLength={LEADERBOARD_DESCRIPTION_MAX} value={draft.description} onChange={(event) => patch({ description: event.target.value.replace(/\t/g, ' ') })} />
                {select(text('section.sorting', 'Sorting'), draft.sortMode, sortOptions.map((option) => ({ value: option.value, label: text(`sort.${ option.key }`, SORT_FALLBACKS[option.value]) })), (value) => patch({ sortMode: toInt(value, 0) }), 'leaderboard-sort')}
                {select(text('entries_per_page', 'Entries per page'), draft.pageSizeOption, LEADERBOARD_PAGE_SIZES.map((size, index) => ({ value: index, label: String(size) })), (value) => patch({ pageSizeOption: toInt(value, 0) }))}

                <Text bold>{text('section.columns', 'Columns')}</Text>
                {select(text('columns.count', 'Columns'), draft.columns.length, Array.from({ length: LEADERBOARD_MAX_COLUMNS }, (_, i) => ({ value: i + 1, label: String(i + 1) })), (value) => setColumnCount(toInt(value, 1)), 'leaderboard-column-count')}
                {draft.columns.map((column, index) => (
                    <div key={index} className="flex items-center gap-1">
                        <Select className="form-select form-select-sm" disabled={index === 0} value={column.type} onChange={(event) => patchColumn(index, retypeColumn(column, toInt(event.target.value, column.type)))}>
                            {(index === 0 ? [ 0 ] : LEADERBOARD_COLUMN_MENU).map((type) => <option key={type} value={type}>{text(`column.${ LEADERBOARD_COLUMN_KEYS[type] }`, COLUMN_FALLBACKS[type])}</option>)}
                        </Select>
                        <OctaneInput inputSize="sm" maxLength={LEADERBOARD_LABEL_MAX} placeholder={text('column_name', LEADERBOARD_COLUMN_DEFAULT_LABELS[column.type])} value={column.label} onChange={(event) => patchColumn(index, { ...column, label: event.target.value.replace(/\t/g, ' ') })} />
                        <Select className="form-select form-select-sm" value={column.width} onChange={(event) => patchColumn(index, { ...column, width: toInt(event.target.value, 0) })}>
                            {LEADERBOARD_WIDTH_KEYS.map((key, width) => <option key={key} value={width}>{text(`column_width.${ key }`, WIDTH_FALLBACKS[width])}</option>)}
                        </Select>
                    </div>
                ))}
                {draft.columns.some((column) => column.type === 4 || column.type === 5) && <Text small>{text('column_type_info', 'Level needs a level-up box and text a text connector on the variable.')}</Text>}
                {!valueAvailable && <Text small>{text('value_unavailable', 'No permanent variable with a value is stacked with this box.')}</Text>}

                {choices.length > 0 && (
                    <>
                        <Text bold>{text('section.multi_variable', 'Multiple variables')}</Text>
                        <Text small>{text('multi_variable_info', 'Players can switch between the variables stacked with this box. Name them here.')}</Text>
                        {choices.map((choice) => (
                            <div key={choice.variableId} className="flex items-center gap-1">
                                <Text small>{`${ choice.technicalName } =`}</Text>
                                <OctaneInput inputSize="sm" maxLength={LEADERBOARD_OVERRIDE_MAX} value={names[choice.variableId] ?? ''} onChange={(event) => setNames({ ...names, [choice.variableId]: event.target.value.replace(/\t/g, ' ') })} />
                            </div>
                        ))}
                        <BaseButton type="button" className="btn btn-sm btn-secondary self-start" onClick={() => setNames(Object.fromEntries(choices.map((choice) => [ choice.variableId, suggestLeaderboardName(choice.technicalName) ])))}>{text('suggest', 'Suggest')}</BaseButton>
                    </>
                )}

                <Text bold>{text('section.filter', 'Filter')}</Text>
                <label className="flex items-center gap-1">
                    <Checkbox data-testid="leaderboard-filter" checked={draft.filterEnabled} onCheckedChange={(nextChecked) => patch({ filterEnabled: nextChecked })} />
                    <Text>{text('filter.enabled', 'Only list users who have a variable')}</Text>
                </label>
                {draft.filterEnabled && (
                    <div className="flex flex-col gap-1 pl-4">
                        {select(text('filter.variable', 'Variable'), draft.filterVariableId, [ { value: '0', label: '-' }, ...userVariableDefinitions.map((definition) => ({ value: String(definition.itemId), label: definition.name })) ], (value) => patch({ filterVariableId: value }))}
                        <label className="flex items-center gap-1">
                            <Checkbox disabled={!filterDefinition?.hasValue} checked={draft.compareEnabled && !!filterDefinition?.hasValue} onCheckedChange={(nextChecked) => patch({ compareEnabled: nextChecked })} />
                            <Text>{text('filter.compare', 'Whose value equals')}</Text>
                        </label>
                        {draft.compareEnabled && !!filterDefinition?.hasValue && (
                            <div className="flex items-center gap-1">
                                <Select className="form-select form-select-sm" value={draft.operandKind} onChange={(event) => patch({ operandKind: toInt(event.target.value, OPERAND_LITERAL) })}>
                                    <option value={OPERAND_LITERAL}>{text('filter.operand.literal', 'Number')}</option>
                                    <option value={OPERAND_GLOBAL_VARIABLE}>{text('filter.operand.global', 'Global variable')}</option>
                                </Select>
                                {draft.operandKind === OPERAND_LITERAL
                                    ? <OctaneInput type="number" inputSize="sm" value={draft.comparisonLiteral} onChange={(event) => patch({ comparisonLiteral: event.target.value })} />
                                    : (
                                        <Select className="form-select form-select-sm" value={draft.operandVariableId} onChange={(event) => patch({ operandVariableId: event.target.value })}>
                                            <option value="0">-</option>
                                            {roomVariableDefinitions.map((definition) => <option key={definition.itemId} value={String(definition.itemId)}>{definition.name}</option>)}
                                        </Select>
                                    )}
                            </div>
                        )}
                    </div>
                )}

                <Text bold>{text('section.location', 'Location')}</Text>
                <Text small>{context?.overlayInstanceId ? text('location.drag_published', 'Drag the leaderboard in the room to move it.') : text('location.drag_status', 'Drag the preview in the room to place the leaderboard.')}</Text>
                <div className="flex items-center gap-1">
                    <Text>{text('location.tile', 'Tile')}</Text>
                    <OctaneInput type="number" inputSize="sm" value={draft.tileX} onChange={(event) => patch({ tileX: toInt(event.target.value, draft.tileX) })} />
                    <OctaneInput type="number" inputSize="sm" value={draft.tileY} onChange={(event) => patch({ tileY: toInt(event.target.value, draft.tileY) })} />
                </div>
                <div className="flex items-center gap-1">
                    <Text>{text('location.offset', 'Offset')}</Text>
                    <OctaneInput type="number" inputSize="sm" min={LEADERBOARD_MIN_OFFSET_X} max={LEADERBOARD_MAX_OFFSET_X} value={draft.offsetX} onChange={(event) => patch({ offsetX: Math.max(LEADERBOARD_MIN_OFFSET_X, Math.min(LEADERBOARD_MAX_OFFSET_X, toInt(event.target.value, 0))) })} />
                    <OctaneInput type="number" inputSize="sm" value={draft.altitude} onChange={(event) => patch({ altitude: toInt(event.target.value, 0) })} />
                </div>

                {error && <Text small className="text-red-500" data-testid="leaderboard-error">{error}</Text>}
            </div>
        </WiredExtraBaseView>
    );
};
