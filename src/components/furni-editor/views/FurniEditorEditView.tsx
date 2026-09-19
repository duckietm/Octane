import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CopyToClipboard } from '../../../api';
import { Button, Flex, LayoutFurniIconImageView, LayoutFurniImageView, Text } from '../../../common';
import { CatalogRef, FurniDetail, FurniItem } from '../../../hooks/furni-editor';
import { readAssetStateCount } from '../furniAssetStates';
import { AssetPresence, AssetPresenceReport, checkAssetPresence } from '../furniAssetPresence';
import {
    Suggestion,
    expectationsForType,
    multiheightMismatch,
    relateRows,
    RelatedRow,
    spriteIdMismatch,
    suggestFromFurnidata,
    suggestFromSiblings,
    suggestInteractionType
} from '../furniEditorSuggestions';

interface FurniEditorEditViewProps {
    item: FurniDetail;
    catalogItems: CatalogRef[];
    furniDataEntry: Record<string, unknown> | null;
    furniDataDiagnostic: Record<string, unknown> | null;
    interactions: string[];
    relatedItems: FurniItem[];
    loading: boolean;
    onUpdate: (id: number, fields: Record<string, unknown>) => void;
    onDelete: (id: number) => void;
    onBack: () => void;
    onUpdateFurnidata: (id: number, name: string, description: string) => void;
    onRevertFurnidata: (id: number) => void;
    onUpdateFurnidataStructure: (id: number, structure: Record<string, number | boolean>) => void;
    onSyncPublicName: (id: number, name: string) => void;
    onImportText: (id: number) => void;
    importResult: { found: boolean; name: string; description: string; classname: string; nonce: number } | null;
}

const FIELD_TIPS: Record<string, string> = {
    stackHeight: 'Visual height when items are stacked on top of this furniture',
    interactionType: 'Defines behavior when user interacts (e.g. default, gate, teleport, vendingmachine)',
    customparams: 'Extra parameters for the interaction type (format depends on interaction)',
    interactionModesCount: 'Number of visual states/animations this furniture has',
    vendingIds: 'Handitem ids a vending machine hands out, comma separated',
    multiheight: 'Comma separated stack heights, one per state, for adjustable-height furniture',
    effectIdMale: 'Avatar effect applied to male avatars on use (0 = none)',
    effectIdFemale: 'Avatar effect applied to female avatars on use (0 = none)',
    clothingOnWalk: 'Figure parts worn while walking on this furniture (clothing items)',
    description: 'Server-side note kept in items_base; clients show the furnidata description instead'
};

// The editable subset of items_base. Identity columns (id, classname, sprite,
// type) are deliberately absent: the server drops them from an update, so
// keeping them in the form would only make the dirty check lie.
const editableForm = (item: FurniDetail) => ({
    width: item.width || 1,
    length: item.length || 1,
    stackHeight: item.stackHeight || 0,
    allowStack: !!item.allowStack,
    allowWalk: !!item.allowWalk,
    allowSit: !!item.allowSit,
    allowLay: !!item.allowLay,
    allowGift: !!item.allowGift,
    allowTrade: !!item.allowTrade,
    allowRecycle: !!item.allowRecycle,
    allowMarketplaceSell: !!item.allowMarketplaceSell,
    allowInventoryStack: !!item.allowInventoryStack,
    interactionType: item.interactionType || '',
    interactionModesCount: item.interactionModesCount || 0,
    customparams: item.customparams || '',
    vendingIds: item.vendingIds || '',
    multiheight: item.multiheight || '',
    effectIdMale: item.effectIdMale || 0,
    effectIdFemale: item.effectIdFemale || 0,
    clothingOnWalk: item.clothingOnWalk || '',
    description: item.description || ''
});

type EditForm = ReturnType<typeof editableForm>;
type EditField = keyof EditForm;

const FIELD_LABELS: Record<EditField, string> = {
    width: 'Width',
    length: 'Length',
    stackHeight: 'Stack Height',
    allowStack: 'Stack',
    allowWalk: 'Walk',
    allowSit: 'Sit',
    allowLay: 'Lay',
    allowGift: 'Gift',
    allowTrade: 'Trade',
    allowRecycle: 'Recycle',
    allowMarketplaceSell: 'MarketplaceSell',
    allowInventoryStack: 'InventoryStack',
    interactionType: 'Interaction type',
    interactionModesCount: 'Modes',
    customparams: 'Custom Params',
    vendingIds: 'Vending IDs',
    multiheight: 'Multiheight',
    effectIdMale: 'Effect ID (male)',
    effectIdFemale: 'Effect ID (female)',
    clothingOnWalk: 'Clothing on walk',
    description: 'Description (DB)'
};

// Mirrors FurniEditorUpdatePayload.validateValue on the emulator: a value the
// server would reject is flagged here instead of failing silently after Save.
const validateForm = (form: EditForm): Partial<Record<EditField, string>> => {
    const errors: Partial<Record<EditField, string>> = {};
    const maxLen = (field: EditField, max: number) => {
        if (String(form[field]).length > max) errors[field] = `Max ${max} chars`;
    };

    if (form.width < 1 || form.width > 64) errors.width = '1 to 64';
    if (form.length < 1 || form.length > 64) errors.length = '1 to 64';
    if (form.stackHeight < 0 || form.stackHeight > 99.99) errors.stackHeight = '0 to 99.99';
    if (form.interactionModesCount < 0 || form.interactionModesCount > 100) errors.interactionModesCount = '0 to 100';
    if (form.effectIdMale < 0) errors.effectIdMale = 'Min 0';
    if (form.effectIdFemale < 0) errors.effectIdFemale = 'Min 0';
    maxLen('interactionType', 500);
    maxLen('customparams', 256);
    maxLen('vendingIds', 255);
    maxLen('clothingOnWalk', 255);
    maxLen('multiheight', 50);
    maxLen('description', 500);

    return errors;
};

const formatValue = (value: unknown) => {
    if (typeof value === 'boolean') return value ? 'on' : 'off';
    const text = String(value);
    return text === '' ? '(empty)' : text;
};

const formatPrice = (ref: CatalogRef) => {
    const parts: string[] = [];
    if (ref.costCredits > 0) parts.push(`${ref.costCredits} credits`);
    if (ref.costPoints > 0) parts.push(`${ref.costPoints} points (type ${ref.pointsType})`);
    return parts.length ? parts.join(' + ') : 'free';
};

const PERM_GROUPS: { label: string; keys: EditField[] }[] = [
    { label: 'Gameplay', keys: ['allowStack', 'allowWalk', 'allowSit', 'allowLay', 'allowInventoryStack'] },
    { label: 'Trading', keys: ['allowGift', 'allowTrade', 'allowRecycle', 'allowMarketplaceSell'] }
];

// The right-hand pane shows one group of fields at a time. Every editable field
// belongs to exactly one group so the chips can count unsaved changes per group.
type GroupId = 'names' | 'behaviour' | 'placement' | 'catalogue' | 'data';

const GROUPS: { id: GroupId; label: string }[] = [
    { id: 'names', label: 'Names' },
    { id: 'behaviour', label: 'Behaviour' },
    { id: 'placement', label: 'Placement' },
    { id: 'catalogue', label: 'Catalogue' },
    { id: 'data', label: 'Data' }
];

const FIELD_GROUP: Record<EditField, GroupId> = {
    width: 'placement',
    length: 'placement',
    stackHeight: 'placement',
    allowStack: 'placement',
    allowWalk: 'placement',
    allowSit: 'placement',
    allowLay: 'placement',
    allowGift: 'placement',
    allowTrade: 'placement',
    allowRecycle: 'placement',
    allowMarketplaceSell: 'placement',
    allowInventoryStack: 'placement',
    interactionType: 'behaviour',
    interactionModesCount: 'behaviour',
    customparams: 'behaviour',
    vendingIds: 'behaviour',
    multiheight: 'behaviour',
    effectIdMale: 'behaviour',
    effectIdFemale: 'behaviour',
    clothingOnWalk: 'behaviour',
    description: 'names'
};

interface InteractionTypePickerProps {
    id: string;
    value: string;
    options: string[];
    className: string;
    onChange: (value: string) => void;
}

// A text field with a filtered list underneath: typing narrows the registered
// types, Enter takes the first match, Escape closes. The stored value is kept
// as typed even when nothing matches, so an unregistered type stays visible.
const InteractionTypePicker: FC<InteractionTypePickerProps> = ({ id, value, options, className, onChange }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState<string | null>(null);
    const shown = query ?? value;
    const needle = shown.trim().toLowerCase();
    const matches = useMemo(() => {
        const list = needle ? options.filter((type) => type.toLowerCase().includes(needle)) : options;
        return list.slice(0, 12);
    }, [options, needle]);

    const pick = (type: string) => {
        onChange(type);
        setQuery(null);
        setOpen(false);
    };

    return (
        <div className="relative">
            <input
                id={id}
                role="combobox"
                aria-label={FIELD_LABELS.interactionType}
                aria-expanded={open}
                aria-autocomplete="list"
                aria-controls={`${id}-list`}
                className={`${className} font-mono pr-7`}
                value={shown}
                placeholder="none"
                spellCheck={false}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                    if (query !== null) onChange(query.trim());
                    setQuery(null);
                    setOpen(false);
                }}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && matches.length && open) {
                        e.preventDefault();
                        pick(matches[0]);
                    } else if (e.key === 'Escape' && open) {
                        e.stopPropagation();
                        setQuery(null);
                        setOpen(false);
                    }
                }}
            />
            <span aria-hidden="true" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                ▾
            </span>
            {open && (
                <ul
                    id={`${id}-list`}
                    role="listbox"
                    className="absolute z-20 mt-0.5 left-0 right-0 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-[#ffffff] shadow-lg text-[11px] font-mono py-0.5"
                >
                    {!needle && (
                        <li
                            role="option"
                            aria-selected={value === ''}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pick('')}
                            className="px-2 py-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                        >
                            none (default behaviour)
                        </li>
                    )}
                    {matches.map((type) => (
                        <li
                            key={type}
                            role="option"
                            aria-selected={type === value}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pick(type)}
                            className={`px-2 py-1 cursor-pointer hover:bg-slate-100 ${type === value ? 'text-primary font-semibold' : 'text-slate-700'}`}
                        >
                            {type}
                        </li>
                    ))}
                    {needle && matches.length === 0 && <li className="px-2 py-1 text-amber-700">No registered type matches</li>}
                </ul>
            )}
        </div>
    );
};

interface FurniPreviewProps {
    item: FurniDetail;
    width: number;
    length: number;
    modes: number;
}

// Rendered through the room engine, so what shows here is what a room shows:
// rotation walks the four floor directions (two for wall items), the state
// stepper drives the visualization state the way a click in the room would,
// and the footprint grid draws width × length as stored in items_base.
const FurniPreview: FC<FurniPreviewProps> = ({ item, width, length, modes }) => {
    const directions = item.type === 'i' ? [2, 4] : [0, 2, 4, 6];
    const [directionIndex, setDirectionIndex] = useState(1);
    const [state, setState] = useState(-1);
    const direction = directions[directionIndex % directions.length];
    const stateCount = Math.max(0, modes);
    const cols = Math.min(Math.max(width, 1), 8);
    const rows = Math.min(Math.max(length, 1), 8);
    const clipped = width > 8 || length > 8;

    useEffect(() => {
        setDirectionIndex(1);
        setState(-1);
    }, [item.id]);

    const nextState = () => setState((prev) => (stateCount === 0 ? -1 : prev + 1 >= stateCount ? -1 : prev + 1));

    return (
        <div
            className="relative h-28 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center"
            data-testid="furni-editor-preview"
        >
            <LayoutFurniIconImageView productType={item.type} productClassId={item.spriteId} className="absolute opacity-20" />
            <LayoutFurniImageView productType={item.type} productClassId={item.spriteId} direction={direction} state={state} className="relative" />
            <div
                className="absolute top-1 right-1 grid gap-px"
                style={{ gridTemplateColumns: `repeat(${cols}, 6px)` }}
                aria-label={`Footprint ${width} by ${length}`}
                title={`Footprint ${width}×${length}${clipped ? ' (clipped)' : ''}`}
            >
                {Array.from({ length: cols * rows }, (_, i) => (
                    <span key={i} className="h-1.5 w-1.5 bg-[#418db0] opacity-60" />
                ))}
            </div>
            <span className="absolute bottom-1 right-1 text-[9px] font-mono text-slate-500">
                {width}×{length}
            </span>
            <div className="absolute bottom-1 left-1 flex gap-1">
                <button
                    type="button"
                    onClick={() => setDirectionIndex((prev) => prev + 1)}
                    aria-label={`Rotate, facing ${direction}`}
                    title="Rotate"
                    className="inline-flex items-center gap-0.5 text-[9px] rounded-full border border-slate-200 bg-[#ffffff] px-1.5 py-px text-slate-600 hover:border-slate-300"
                >
                    <span aria-hidden="true">⟳</span> {direction}
                </button>
                {stateCount > 1 && (
                    <button
                        type="button"
                        onClick={nextState}
                        aria-label={`Next state, showing ${state < 0 ? 'base' : state + 1} of ${stateCount}`}
                        title="Next state"
                        className="inline-flex items-center gap-0.5 text-[9px] rounded-full border border-slate-200 bg-[#ffffff] px-1.5 py-px text-slate-600 hover:border-slate-300"
                    >
                        <span aria-hidden="true">▸</span> {state < 0 ? 'base' : `${state + 1}/${stateCount}`}
                    </button>
                )}
            </div>
        </div>
    );
};

interface ConfirmModalProps {
    title: string;
    confirmLabel: string;
    confirmVariant: 'success' | 'danger';
    onConfirm: () => void;
    onCancel: () => void;
    children: React.ReactNode;
}

const ConfirmModal: FC<ConfirmModalProps> = ({ title, confirmLabel, confirmVariant, onConfirm, onCancel, children }) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCancel();
            }
        };

        window.addEventListener('keydown', handler, true);

        return () => window.removeEventListener('keydown', handler, true);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 bg-[#00000080] flex items-center justify-center z-[60]" onClick={onCancel}>
            <div role="dialog" aria-label={title} className="bg-[#ffffff] rounded-lg shadow-xl p-4 w-[340px]" onClick={(e) => e.stopPropagation()}>
                <Text bold className="text-[14px] mb-2 block">
                    {title}
                </Text>
                <div className="mb-3">{children}</div>
                <Flex gap={1} justifyContent="end">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant={confirmVariant} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </Flex>
            </div>
        </div>
    );
};

interface SectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const Section: FC<SectionProps> = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-[#ffffff] rounded-xl border border-slate-200 shadow-sm">
            <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-xl ${open ? '' : 'rounded-b-xl'}`}
                onClick={() => setOpen((p) => !p)}
            >
                <Text className="text-[12px] font-semibold text-slate-700">{title}</Text>
                <span className="text-[11px] text-slate-400 transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                    ▾
                </span>
            </button>
            {open && <div className="px-3 pb-2.5 pt-0.5">{children}</div>}
        </div>
    );
};

const Tip: FC<{ field: string }> = ({ field }) => {
    const tip = FIELD_TIPS[field];
    const ref = useRef<HTMLSpanElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

    const show = useCallback(() => {
        const r = ref.current?.getBoundingClientRect();
        if (r) setPos({ left: r.left + r.width / 2, top: r.top - 6 });
    }, []);
    const hide = useCallback(() => setPos(null), []);

    if (!tip) return null;

    return (
        <span
            ref={ref}
            onMouseEnter={show}
            onMouseLeave={hide}
            className="ml-0.5 inline-flex w-3 h-3 rounded-full bg-[#418db0] text-white text-[8px] items-center justify-center cursor-help font-bold align-middle"
        >
            ?
            {pos &&
                createPortal(
                    <span
                        style={{ position: 'fixed', left: pos.left, top: pos.top, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
                        className="px-2 py-1 bg-[#333] text-white text-[10px] rounded w-44 whitespace-normal text-center leading-snug shadow-lg pointer-events-none"
                    >
                        {tip}
                    </span>,
                    document.body
                )}
        </span>
    );
};

const CopyValue: FC<{ value: string | number; compact?: boolean }> = ({ value, compact = false }) => {
    const [copied, setCopied] = useState(false);

    const copy = useCallback(() => {
        void CopyToClipboard(String(value)).then((ok) => setCopied(ok));
    }, [value]);

    useEffect(() => {
        if (!copied) return;

        const handle = window.setTimeout(() => setCopied(false), 1000);

        return () => window.clearTimeout(handle);
    }, [copied]);

    return (
        <div
            role="button"
            title="Click to copy"
            onClick={copy}
            className={`group relative cursor-pointer w-full font-mono rounded-lg border transition ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1.5 text-sm'} ${copied ? 'border-primary/50 bg-primary/5 text-primary' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}
        >
            <span className={`block truncate ${compact ? 'pr-8' : 'pr-12'}`}>{String(value)}</span>
            <span
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wide pointer-events-none ${copied ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`}
            >
                {copied ? 'copied!' : 'copy'}
            </span>
        </div>
    );
};

export const FurniEditorEditView: FC<FurniEditorEditViewProps> = (props) => {
    const {
        item,
        catalogItems,
        furniDataEntry,
        furniDataDiagnostic,
        interactions,
        relatedItems,
        loading,
        onUpdate,
        onDelete,
        onBack,
        onUpdateFurnidata,
        onRevertFurnidata,
        onUpdateFurnidataStructure,
        onSyncPublicName,
        onImportText,
        importResult
    } = props;
    const saveRef = useRef<() => void>(null);

    const stored = useMemo(() => editableForm(item), [item]);
    const [form, setForm] = useState<EditForm>(stored);

    const [group, setGroup] = useState<GroupId>('names');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmSave, setConfirmSave] = useState(false);
    const [confirmBack, setConfirmBack] = useState(false);
    const [furniName, setFurniName] = useState('');
    const [furniDescription, setFurniDescription] = useState('');
    const [confirmFurnidata, setConfirmFurnidata] = useState(false);
    const [importNote, setImportNote] = useState('');
    const appliedImportNonce = useRef(0);

    useEffect(() => {
        if (!item) return;

        setForm(stored);
        setShowDeleteDialog(false);
        setConfirmSave(false);
        setConfirmBack(false);
        setFurniName(String(furniDataEntry?.name ?? ''));
        setFurniDescription(String(furniDataEntry?.description ?? ''));
        setConfirmFurnidata(false);
        setImportNote('');
    }, [item, stored, furniDataEntry]);

    const setField = useCallback(<K extends EditField>(key: K, value: EditForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const changedFields = useMemo(() => (Object.keys(stored) as EditField[]).filter((key) => form[key] !== stored[key]), [form, stored]);
    const isDirty = changedFields.length > 0;
    const isChanged = useCallback((field: EditField) => form[field] !== stored[field], [form, stored]);

    const validation = useMemo(() => validateForm(form), [form]);

    // The server lists the interaction types it has a class for; a stored type
    // outside that list is one the item manager silently maps to default, and
    // one the server now refuses to save, so the select keeps it visible and flags it.
    const interactionUnregistered = useMemo(() => {
        const type = form.interactionType.trim().toLowerCase();
        return type !== '' && !interactions.some((known) => known.toLowerCase() === type);
    }, [form.interactionType, interactions]);
    const isValid = useMemo(() => Object.keys(validation).length === 0, [validation]);

    // Most classnames carry their interaction type: wired boxes are named after
    // it, and many furni start with or contain a registered type. Offer that as
    // a one-click suggestion whenever it differs from what is stored.
    const suggestedType = useMemo(() => {
        const match = suggestInteractionType(item.itemName, interactions);
        if (!match || match.type.toLowerCase() === form.interactionType.trim().toLowerCase()) return null;
        return match;
    }, [item.itemName, interactions, form.interactionType]);

    const changedByGroup = useMemo(() => {
        const counts: Record<GroupId, number> = { names: 0, behaviour: 0, placement: 0, catalogue: 0, data: 0 };
        for (const field of changedFields) counts[FIELD_GROUP[field]] += 1;
        return counts;
    }, [changedFields]);

    const invalidByGroup = useMemo(() => {
        const flags: Record<GroupId, boolean> = { names: false, behaviour: false, placement: false, catalogue: false, data: false };
        for (const field of Object.keys(validation) as EditField[]) flags[FIELD_GROUP[field]] = true;
        return flags;
    }, [validation]);

    // Furnidata name editing only works when the furni has a matching furnidata
    // entry: the server writer is edit-only and refuses classnames absent from
    // furnidata (pets, custom items, …). furniDataEntry is the entry resolved by
    // the server (by id); guard on it + a classname match so we never trigger the
    // cryptic "Classname not found in furnidata" error on save.
    const furnidataEditable = useMemo(() => {
        if (!furniDataEntry) return false;
        const cn = String((furniDataEntry as { classname?: unknown }).classname ?? '')
            .trim()
            .toLowerCase();
        const itemCn = String(item?.itemName ?? '')
            .trim()
            .toLowerCase();
        return cn ? cn === itemCn : true;
    }, [furniDataEntry, item]);

    // No furnidata entry at all → the editor can CREATE one (the server upserts:
    // it builds a complete entry from items_base on save). Distinct from the
    // classname-mismatch case (an entry resolved by id but for a different
    // classname), which stays locked to avoid an id collision.
    const furnidataCreatable = useMemo(() => !furniDataEntry, [furniDataEntry]);

    // Show a one-click "sync" when the DB public_name is empty but the (matching)
    // furnidata entry already has a name — fills items_base.public_name from the
    // stored furnidata name so the DB fallback stops being blank.
    const canSyncPublicName = useMemo(
        () => furnidataEditable && !String(item.publicName ?? '').trim() && !!String(furniDataEntry?.name ?? '').trim(),
        [furnidataEditable, item.publicName, furniDataEntry]
    );

    // True only when the name/description actually differ from the stored furnidata
    // entry. Used to gate the Save button: saving an unchanged value makes the
    // server writer return false, which the handler misreports as "Classname not
    // found in furnidata" — so we never let an unchanged save fire.
    const furnidataDirty = useMemo(
        () => furniName !== String(furniDataEntry?.name ?? '') || furniDescription !== String(furniDataEntry?.description ?? ''),
        [furniName, furniDescription, furniDataEntry]
    );

    // Rows the line probe brought back, split into the furni of the same line
    // and the rows that duplicate this classname or sprite id.
    const related = useMemo(() => relateRows(relatedItems, item), [relatedItems, item]);
    const duplicates = useMemo(() => {
        const byId = new Map<number, RelatedRow>();
        for (const row of [...related.duplicateNames, ...related.duplicateSprites]) byId.set(row.id, row);
        return [...byId.values()];
    }, [related]);
    const openFurni = useCallback((spriteId: number) => window.dispatchEvent(new CustomEvent('furni-editor:open', { detail: { spriteId } })), []);

    // The asset's own state count, read once the room engine has the furni
    // loaded (the preview triggers that). Retried a few times because the load
    // is asynchronous and the loader has no completion hook the client can use.
    const [assetStates, setAssetStates] = useState<number | null>(null);
    useEffect(() => {
        setAssetStates(null);
        let tries = 0;
        let handle = 0;
        const attempt = () => {
            const count = readAssetStateCount(item.itemName);
            if (count !== null) {
                setAssetStates(count);
                return;
            }
            if (++tries < 8) handle = window.setTimeout(attempt, 700);
        };
        attempt();
        return () => window.clearTimeout(handle);
    }, [item.itemName]);

    // Everything the editor can propose from data it already has. Furnidata is
    // trusted only when its entry matches this classname; the type table and
    // the asset count apply to whatever type is in the form right now.
    const { suggestions, warnings } = useMemo(() => {
        const all: Suggestion[] = furnidataEditable ? suggestFromFurnidata(furniDataEntry, form) : [];
        const typed = expectationsForType(form);
        all.push(...typed.suggestions);
        for (const s of suggestFromSiblings(related.siblings, form)) {
            if (!all.some((existing) => existing.field === s.field)) all.push(s);
        }
        if (assetStates !== null && assetStates > 0 && assetStates !== form.interactionModesCount) {
            const alreadyFromType = typed.suggestions.some((s) => s.field === 'interactionModesCount' && s.value === assetStates);
            if (!alreadyFromType) all.push({ field: 'interactionModesCount', value: assetStates, reason: `asset defines ${assetStates} states` });
        }
        const warnings = [...typed.warnings];
        const mh = multiheightMismatch(form, assetStates);
        if (mh) warnings.push(mh);
        return { suggestions: all, warnings };
    }, [furnidataEditable, furniDataEntry, form, assetStates, related.siblings]);

    // A furnidata entry found by classname but carrying another id: the room
    // resolves the sprite through that id, so it draws a different furni.
    const furnidataIdMismatch = useMemo(
        () => (furnidataEditable ? spriteIdMismatch(furniDataEntry, item.spriteId) : null),
        [furnidataEditable, furniDataEntry, item.spriteId]
    );

    // Whether the icon and the bundle actually exist where the renderer looks.
    const [assets, setAssets] = useState<AssetPresenceReport | null>(null);
    useEffect(() => {
        setAssets(null);
        const controller = new AbortController();
        checkAssetPresence(item.itemName, controller.signal).then((report) => {
            if (!controller.signal.aborted) setAssets(report);
        });
        return () => controller.abort();
    }, [item.itemName]);

    // The values a save replaced, kept so one click can put them back into
    // the form while the sheet stays open. Cleared when another furni opens.
    const [lastSave, setLastSave] = useState<{ id: number; previous: EditForm } | null>(null);
    const undoAvailable = lastSave !== null && lastSave.id === item.id && (Object.keys(stored) as EditField[]).some((k) => stored[k] !== lastSave.previous[k]);
    const undoLastSave = useCallback(() => {
        if (lastSave) setForm(lastSave.previous);
    }, [lastSave]);

    // Fields whose change reshapes furni already standing in rooms.
    const placementFields: EditField[] = ['width', 'length', 'stackHeight', 'allowWalk', 'allowStack', 'allowSit', 'allowLay'];

    const applySuggestion = useCallback((s: Suggestion) => setForm((prev) => ({ ...prev, [s.field]: s.value })), []);
    const applyAllSuggestions = useCallback(() => setForm((prev) => suggestions.reduce((next, s) => ({ ...next, [s.field]: s.value }), prev)), [suggestions]);

    const furnidataMissReason = useMemo(() => {
        const reason = String(furniDataDiagnostic?.reason ?? '');
        return reason || 'not_found';
    }, [furniDataDiagnostic]);

    const furnidataSourcePath = String(furniDataDiagnostic?.sourcePath ?? '');

    // Apply an "Import from Habbo" result into the editable fields (review then Save).
    useEffect(() => {
        if (!importResult || importResult.nonce === appliedImportNonce.current) return;
        appliedImportNonce.current = importResult.nonce;

        // Ignore a result that belongs to a different furni (user navigated away).
        if (
            importResult.classname &&
            importResult.classname.trim().toLowerCase() !==
                String(item?.itemName ?? '')
                    .trim()
                    .toLowerCase()
        )
            return;

        if (importResult.found) {
            setFurniName(importResult.name);
            setFurniDescription(importResult.description);
            setImportNote('Imported from Habbo — review and Save');
        } else {
            setImportNote('Not found on Habbo for this classname');
        }
    }, [importResult, item]);

    // Save opens a diff of the changed fields; the packet only fires on Confirm.
    const handleSave = useCallback(() => {
        if (!isValid || !isDirty) return;

        setConfirmSave(true);
    }, [isValid, isDirty]);

    const handleSaveConfirm = useCallback(() => {
        setConfirmSave(false);
        setLastSave({ id: item.id, previous: stored });
        onUpdate(item.id, form);
    }, [item, form, stored, onUpdate]);

    // Expose save for keyboard shortcut
    saveRef.current = handleSave;

    const handleBack = useCallback(() => {
        if (isDirty) {
            setConfirmBack(true);
            return;
        }

        onBack();
    }, [isDirty, onBack]);

    const handleDiscard = useCallback(() => setForm(stored), [stored]);
    const closeSave = useCallback(() => setConfirmSave(false), []);
    const closeBack = useCallback(() => setConfirmBack(false), []);
    const closeDelete = useCallback(() => setShowDeleteDialog(false), []);
    const closeFurnidata = useCallback(() => setConfirmFurnidata(false), []);

    // The reverse of the furnidata chips: when items_base is right and the entry
    // is wrong, push the DB values into the entry. Only fields the entry carries
    // and that differ are offered; the save is confirmed like every other write.
    const [confirmStructure, setConfirmStructure] = useState(false);
    const structureDiff = useMemo(() => {
        if (!furnidataEditable || !furniDataEntry) return [] as { key: string; label: string; from: unknown; to: number | boolean }[];
        const rows: { key: string; label: string; from: unknown; to: number | boolean }[] = [];
        const consider = (key: string, label: string, to: number | boolean) => {
            if (!(key in furniDataEntry)) return;
            const from = furniDataEntry[key];
            if (String(from) !== String(to)) rows.push({ key, label, from, to });
        };
        consider('xdim', 'xdim', stored.width);
        consider('ydim', 'ydim', stored.length);
        consider('height', 'height', stored.stackHeight);
        consider('canstandon', 'canstandon', stored.allowWalk);
        consider('cansiton', 'cansiton', stored.allowSit);
        consider('canlayon', 'canlayon', stored.allowLay);
        return rows;
    }, [furnidataEditable, furniDataEntry, stored]);
    const closeStructure = useCallback(() => setConfirmStructure(false), []);
    const writeStructure = useCallback(() => {
        setConfirmStructure(false);
        onUpdateFurnidataStructure(item.id, Object.fromEntries(structureDiff.map((row) => [row.key, row.to])));
    }, [item.id, structureDiff, onUpdateFurnidataStructure]);

    const handleDeleteConfirm = useCallback(() => {
        onDelete(item.id);
        setShowDeleteDialog(false);
    }, [item, onDelete]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveRef.current?.();
            }
        };

        window.addEventListener('keydown', handler);

        return () => window.removeEventListener('keydown', handler);
    }, []);

    // A changed field carries an amber edge until it is saved or discarded, an
    // invalid one a red edge; red wins because it blocks the save.
    const inputClass = (field?: EditField) => {
        const state = field && validation[field] ? ' border-red-400 bg-red-50' : field && isChanged(field) ? ' border-amber-400 bg-amber-50/40' : '';
        return `w-full px-3 py-1.5 text-sm leading-normal rounded-lg border border-slate-300 bg-[#ffffff] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition${state}`;
    };
    const labelClass = 'text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-0.5';
    const fieldError = (field: EditField) => validation[field] && <span className="text-[9px] text-red-500">{validation[field]}</span>;

    // Groups stay mounted and only toggle visibility, so a field can be focused
    // right after its group is switched in.
    const jumpToField = useCallback((field: EditField) => {
        setGroup(FIELD_GROUP[field]);
        window.setTimeout(() => document.getElementById(`furni-editor-${field}`)?.focus(), 0);
    }, []);

    const [jumpQuery, setJumpQuery] = useState('');
    const handleJump = useCallback(
        (query: string) => {
            setJumpQuery(query);
            const needle = query.trim().toLowerCase();
            if (!needle) return;
            const fields = Object.keys(FIELD_LABELS) as EditField[];
            const match = fields.find((f) => FIELD_LABELS[f].toLowerCase() === needle) ?? fields.find((f) => FIELD_LABELS[f].toLowerCase().startsWith(needle));
            if (!match) return;
            setJumpQuery('');
            jumpToField(match);
        },
        [jumpToField]
    );

    // "was X" next to a changed field's label: one click puts the stored value back.
    const revert = (field: EditField) =>
        isChanged(field) && (
            <button
                type="button"
                onClick={() => setField(field, stored[field])}
                title="Put the stored value back"
                aria-label={`Revert ${FIELD_LABELS[field]}`}
                className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-normal text-amber-600 hover:text-amber-800 transition"
            >
                <span aria-hidden="true">↺</span> was {formatValue(stored[field])}
            </button>
        );

    const chipClass = 'mt-1 inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-0.5 transition';
    const suggestionChip = (s: Suggestion) => (
        <button
            key={`${s.field}:${String(s.value)}`}
            type="button"
            onClick={() => applySuggestion(s)}
            title={s.reason}
            aria-label={`Apply ${FIELD_LABELS[s.field]} ${formatValue(s.value)}`}
            className={`${chipClass} text-primary bg-primary/10 border border-primary/20 hover:bg-primary/15 mr-1`}
        >
            <span aria-hidden="true">✦</span> Suggested: <span className="font-mono">{formatValue(s.value)}</span>
            <span className="text-primary/70 font-normal">· {s.reason}</span>
        </button>
    );
    const warningChip = (w: { field: EditField; message: string }) => (
        <span key={w.field} role="note" className={`${chipClass} text-amber-700 bg-amber-100 border border-amber-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> {w.message}
        </span>
    );
    const chipsFor = (field: EditField) => (
        <>
            {suggestions.filter((s) => s.field === field).map(suggestionChip)}
            {warnings.filter((w) => w.field === field).map(warningChip)}
        </>
    );
    const permissionSuggestions = suggestions.filter((s) => s.field.startsWith('allow'));
    const permissionChips = permissionSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-0.5">
            {permissionSuggestions.map((s) => (
                <button
                    key={s.field}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    title={s.reason}
                    aria-label={`Apply ${FIELD_LABELS[s.field]} ${formatValue(s.value)}`}
                    className={`${chipClass} mt-0 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/15`}
                >
                    <span aria-hidden="true">✦</span> {FIELD_LABELS[s.field]} {formatValue(s.value)}
                    <span className="text-primary/70 font-normal">· {s.reason}</span>
                </button>
            ))}
        </div>
    );

    const groupClass = (id: GroupId) => (group === id ? 'flex flex-col gap-1' : 'hidden');
    const statusRow = 'flex items-center justify-between gap-1 text-[10px] py-1 border-t border-slate-200';
    const statusLink = 'text-primary hover:underline cursor-pointer whitespace-nowrap';

    return (
        <div className="h-full min-h-0 grid grid-cols-[176px_minmax(0,1fr)] gap-2">
            {/* Sidebar: who this furni is, what state it is in, and the actions. Never scrolls away. */}
            <aside className="min-h-0 flex flex-col gap-2 bg-[#ffffff] rounded-xl border border-slate-200 shadow-sm p-2 overflow-y-auto">
                <button
                    type="button"
                    onClick={handleBack}
                    className="self-start inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-800 transition"
                >
                    <span aria-hidden="true">‹</span> Back
                </button>
                <FurniPreview item={item} width={form.width} length={form.length} modes={form.interactionModesCount} />
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        <Text bold className="truncate text-slate-800 text-[13px] leading-tight flex-1 min-w-0">
                            {furniName || item.publicName || item.itemName}
                        </Text>
                        {furnidataEditable ? (
                            <span className="text-[8px] font-semibold text-primary bg-primary/10 rounded px-1 py-px">LIVE</span>
                        ) : furnidataCreatable ? (
                            <span className="text-[8px] font-semibold text-emerald-700 bg-emerald-100 rounded px-1 py-px">NEW</span>
                        ) : (
                            <span className="text-[8px] font-semibold text-amber-700 bg-amber-100 rounded px-1 py-px">LOCKED</span>
                        )}
                    </div>
                    <CopyValue value={`${item.itemName} · #${item.id} · s${item.spriteId}`} compact />
                </div>
                <div>
                    <div className={statusRow}>
                        <span className="text-slate-500">Type</span>
                        <span className="text-slate-700">{item.type === 's' ? 'Floor' : 'Wall'}</span>
                    </div>
                    <div className={statusRow}>
                        <span className="text-slate-500">Catalogue</span>
                        <button type="button" className={statusLink} onClick={() => setGroup('catalogue')}>
                            {catalogItems.length === 0 ? 'not listed' : `${catalogItems.length} offer${catalogItems.length === 1 ? '' : 's'}`} ›
                        </button>
                    </div>
                    <div className={statusRow}>
                        <span className="text-slate-500">Placed in rooms</span>
                        <span className={item.usageCount > 0 ? 'text-emerald-700' : 'text-slate-400'}>{item.usageCount}</span>
                    </div>
                    {(suggestions.length > 0 || warnings.length > 0) && (
                        <div className={`${statusRow} text-primary`}>
                            <button type="button" className={statusLink} onClick={() => jumpToField((suggestions[0] ?? warnings[0]).field)}>
                                {suggestions.length > 0
                                    ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`
                                    : `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}{' '}
                                ›
                            </button>
                            {suggestions.length > 1 && (
                                <button type="button" className={statusLink} onClick={applyAllSuggestions}>
                                    apply all
                                </button>
                            )}
                        </div>
                    )}
                    {duplicates.length > 0 && (
                        <div className={`${statusRow} text-amber-700`} role="note">
                            <span>
                                {duplicates.length} duplicate{duplicates.length === 1 ? '' : 's'}
                            </span>
                            <button type="button" className={statusLink} onClick={() => setGroup('data')}>
                                see ›
                            </button>
                        </div>
                    )}
                    {related.siblings.length > 0 && (
                        <div className={statusRow}>
                            <span className="text-slate-500">Same line</span>
                            <button type="button" className={statusLink} onClick={() => setGroup('data')}>
                                {related.siblings.length} furni ›
                            </button>
                        </div>
                    )}
                    {furnidataIdMismatch !== null && (
                        <div className={`${statusRow} text-amber-700`} role="note">
                            <span
                                title={`furnidata id ${furnidataIdMismatch}, sprite id ${item.spriteId}: rooms draw the furni that owns id ${furnidataIdMismatch}`}
                            >
                                Furnidata id {furnidataIdMismatch} ≠ sprite
                            </span>
                            <button type="button" className={statusLink} onClick={() => setGroup('data')}>
                                see ›
                            </button>
                        </div>
                    )}
                    <div className={statusRow}>
                        <span className="text-slate-500">Assets</span>
                        <span className="flex items-center gap-1.5" aria-label={assets ? `icon ${assets.icon}, bundle ${assets.bundle}` : 'checking assets'}>
                            {(['icon', 'bundle'] as const).map((kind) => {
                                const state: AssetPresence | 'checking' = assets ? assets[kind] : 'checking';
                                const tone = state === 'present' ? 'bg-[#10b981]' : state === 'missing' ? 'bg-[#ef4444]' : 'bg-slate-300';
                                const url = assets ? (kind === 'icon' ? assets.iconUrl : assets.bundleUrl) : '';
                                return (
                                    <span key={kind} className="inline-flex items-center gap-0.5" title={url ? `${kind} ${state}: ${url}` : `${kind} ${state}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />
                                        <span className={state === 'missing' ? 'text-red-600' : 'text-slate-600'}>{kind}</span>
                                    </span>
                                );
                            })}
                        </span>
                    </div>
                    {interactionUnregistered && (
                        <div className={`${statusRow} text-amber-700`}>
                            <span>Type has no class</span>
                            <button type="button" className={statusLink} onClick={() => setGroup('behaviour')}>
                                fix ›
                            </button>
                        </div>
                    )}
                    <div className={`${statusRow} border-b`}>
                        <span className="text-slate-500">Furnidata</span>
                        <button type="button" className={statusLink} onClick={() => setGroup('data')}>
                            {furnidataMissReason === 'not_found' && !furniDataEntry
                                ? 'missing'
                                : furnidataEditable
                                  ? 'resolved'
                                  : furnidataMissReason.replace(/_/g, ' ')}{' '}
                            ›
                        </button>
                    </div>
                </div>
                {isDirty && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] text-amber-800">
                        <div className="font-medium">
                            {changedFields.length} unsaved change{changedFields.length === 1 ? '' : 's'}
                        </div>
                        <ul className="mt-0.5 space-y-px leading-snug">
                            {changedFields.map((field) => (
                                <li key={field} className="truncate">
                                    <button type="button" className="text-amber-700 hover:underline" onClick={() => jumpToField(field)}>
                                        {FIELD_LABELS[field]}
                                    </button>{' '}
                                    · {formatValue(stored[field])} → {formatValue(form[field])}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="mt-auto flex flex-col gap-1">
                    <Button variant="success" disabled={loading || !isValid || !isDirty} onClick={handleSave} className="w-full">
                        {loading ? 'Saving...' : isDirty ? `Save (${changedFields.length})` : 'Save'}
                    </Button>
                    <div className="flex gap-1">
                        {isDirty && (
                            <Button variant="secondary" disabled={loading} onClick={handleDiscard} className="flex-1">
                                Discard changes
                            </Button>
                        )}
                        <Button
                            variant="danger"
                            disabled={loading || item.usageCount > 0}
                            onClick={() => setShowDeleteDialog(true)}
                            className="flex-1"
                            title={item.usageCount > 0 ? 'Placed furni cannot be deleted' : undefined}
                        >
                            Delete
                        </Button>
                    </div>
                    {undoAvailable && (
                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={undoLastSave}
                            className="w-full"
                            title="Put the values the last save replaced back into the form"
                        >
                            Undo last save
                        </Button>
                    )}
                    <span className="text-[9px] text-slate-400 text-center">Ctrl+S saves</span>
                </div>
            </aside>

            {/* Field groups: one at a time, chips carry a dot when a group holds unsaved changes. */}
            <div className="min-h-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div
                        className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 border border-slate-200 p-0.5"
                        role="tablist"
                        aria-label="Field groups"
                    >
                        {GROUPS.map(({ id, label }) => {
                            const changed = changedByGroup[id];
                            const invalid = invalidByGroup[id];
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={group === id}
                                    onClick={() => setGroup(id)}
                                    className={`relative inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md transition ${group === id ? 'bg-[#ffffff] text-slate-800 font-semibold shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'}`}
                                >
                                    {label}
                                    {(changed > 0 || invalid) && (
                                        <span
                                            aria-label={invalid ? 'has invalid fields' : `${changed} unsaved`}
                                            className={`w-1.5 h-1.5 rounded-full ring-2 ring-[#ffffff] ${invalid ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'}`}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        list="furni-editor-fields"
                        value={jumpQuery}
                        onChange={(e) => handleJump(e.target.value)}
                        placeholder="Jump to field"
                        aria-label="Jump to field"
                        className="ml-auto w-28 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-[#ffffff] text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition"
                    />
                    <datalist id="furni-editor-fields">
                        {(Object.keys(FIELD_LABELS) as EditField[]).map((field) => (
                            <option key={field} value={FIELD_LABELS[field]} />
                        ))}
                    </datalist>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                    <div className={groupClass('names')}>
                        {/* Primary edit surface: furnidata display name + description (server-authoritative, live) */}
                        <div className="bg-[#ffffff] rounded-xl border border-slate-200 shadow-sm p-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Text className="text-[12px] font-semibold text-slate-700">Display name &amp; description</Text>
                                {furnidataEditable ? (
                                    <span className="text-[9px] font-semibold text-primary bg-primary/10 rounded-md px-1.5 py-0.5">LIVE</span>
                                ) : furnidataCreatable ? (
                                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 rounded-md px-1.5 py-0.5">NEW</span>
                                ) : (
                                    <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 rounded-md px-1.5 py-0.5">NO FURNIDATA</span>
                                )}
                                {furnidataEditable && furnidataDirty && <span className="ml-auto text-[10px] text-amber-600 font-medium">Unsaved</span>}
                            </div>
                            {furnidataEditable || furnidataCreatable ? (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={labelClass}>Display Name (furnidata)</label>
                                            <input
                                                className={inputClass()}
                                                value={furniName}
                                                onChange={(e) => setFurniName(e.target.value)}
                                                maxLength={256}
                                                placeholder={furnidataCreatable ? item.publicName || item.itemName : undefined}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Description</label>
                                            <input
                                                className={inputClass()}
                                                value={furniDescription}
                                                onChange={(e) => setFurniDescription(e.target.value)}
                                                maxLength={256}
                                            />
                                        </div>
                                    </div>
                                    <Flex gap={1} className="mt-1.5" alignItems="center">
                                        <Button
                                            variant="success"
                                            disabled={furnidataEditable ? loading || !furnidataDirty : loading}
                                            onClick={() => setConfirmFurnidata(true)}
                                        >
                                            {furnidataEditable ? 'Save name/desc' : 'Create entry'}
                                        </Button>
                                        {furnidataEditable && (
                                            <>
                                                <Button variant="secondary" disabled={loading} onClick={() => onRevertFurnidata(item.id)}>
                                                    Revert
                                                </Button>
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => onImportText(item.id)}
                                                    title="Fetch the official name &amp; description from Habbo"
                                                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 bg-[#ffffff] text-slate-600 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition"
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5"
                                                        viewBox="0 0 20 20"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M10 3v9" />
                                                        <path d="m6.5 8.5 3.5 3.5 3.5-3.5" />
                                                        <path d="M4 16h12" />
                                                    </svg>
                                                    Import from Habbo
                                                </button>
                                            </>
                                        )}
                                    </Flex>
                                    {furnidataCreatable && (
                                        <Text className="mt-1 text-[10px] text-emerald-600">
                                            No furnidata entry yet — saving creates a complete one from the item data.
                                        </Text>
                                    )}
                                    {importNote && (
                                        <Text className={`mt-1 text-[10px] ${importNote.startsWith('Not found') ? 'text-amber-600' : 'text-primary'}`}>
                                            {importNote}
                                        </Text>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 leading-snug">
                                    <span className="text-[#f59e0b] text-sm leading-none mt-px">⚠</span>
                                    <span>
                                        A furnidata entry resolved by id but for a <b>different classname</b> ({furnidataMissReason.replace(/_/g, ' ')}) — name
                                        editing is locked to avoid an id collision. Clients fall back to the DB <b>Public Name</b> below.
                                    </span>
                                </div>
                            )}
                        </div>

                        <Section title="Basic Info">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelClass}>Classname</label>
                                    <CopyValue value={item.itemName} />
                                </div>
                                <div>
                                    <label className={labelClass}>Public Name (DB fallback)</label>
                                    <CopyValue value={item.publicName} />
                                    {canSyncPublicName && (
                                        <Button
                                            variant="secondary"
                                            disabled={loading}
                                            className="mt-1 w-full"
                                            onClick={() => onSyncPublicName(item.id, String(furniDataEntry?.name ?? ''))}
                                        >
                                            Sync from furnidata
                                        </Button>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>Sprite ID</label>
                                    <CopyValue value={item.spriteId} />
                                </div>
                                <div>
                                    <label className={labelClass}>Type</label>
                                    <CopyValue value={item.type === 's' ? 'Floor (s)' : 'Wall (i)'} />
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className={labelClass} htmlFor="furni-editor-description">
                                    Description (DB)
                                    <Tip field="description" />
                                    {revert('description')}
                                </label>
                                <textarea
                                    id="furni-editor-description"
                                    aria-label={FIELD_LABELS.description}
                                    rows={2}
                                    className={`${inputClass('description')} resize-y min-h-[2.25rem]`}
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                />
                                {fieldError('description')}
                                {chipsFor('description')}
                            </div>
                        </Section>
                    </div>

                    <div className={groupClass('catalogue')}>
                        <Section title={`Catalogue (${catalogItems.length})`}>
                            <div data-testid="furni-editor-catalog">
                                {catalogItems.length === 0 ? (
                                    <Text className="text-[11px] text-slate-400">Not in the catalogue</Text>
                                ) : (
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="text-left text-[9px] uppercase tracking-wide text-slate-400">
                                                <th className="font-semibold pb-1">Page</th>
                                                <th className="font-semibold pb-1">Offer</th>
                                                <th className="font-semibold pb-1 text-right">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catalogItems.map((ref) => (
                                                <tr key={ref.id} className="border-t border-slate-100">
                                                    <td className="py-1 pr-2 text-slate-700">
                                                        <span>{ref.pageName}</span>
                                                        <span className="ml-1 font-mono text-slate-400">#{ref.pageId}</span>
                                                    </td>
                                                    <td className="py-1 pr-2 font-mono text-slate-600 truncate max-w-[180px]">
                                                        {ref.catalogName}
                                                        <span className="ml-1 text-slate-400">#{ref.id}</span>
                                                    </td>
                                                    <td className="py-1 text-right text-slate-700 whitespace-nowrap">{formatPrice(ref)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </Section>
                    </div>

                    <div className={groupClass('data')}>
                        {furniDataEntry && (
                            <>
                                <Section title="Furnidata structure">
                                    {structureDiff.length === 0 ? (
                                        <Text className="text-[11px] text-slate-400">
                                            {furnidataEditable
                                                ? 'Footprint, height and walk, sit, lay flags agree with the DB.'
                                                : 'No matching entry to compare.'}
                                        </Text>
                                    ) : (
                                        <>
                                            <Text className="text-[10px] text-slate-400 mb-1 block">
                                                Where the entry disagrees with items_base. The chips under the fields take the furnidata side; this takes the DB
                                                side and rewrites the entry for every client.
                                            </Text>
                                            <div data-testid="furni-editor-structure" className="flex flex-col gap-0.5 mb-1.5">
                                                {structureDiff.map((row) => (
                                                    <div
                                                        key={row.key}
                                                        className="text-[11px] grid grid-cols-[1fr_auto_1fr] items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                                                    >
                                                        <span className="font-mono text-slate-700">{row.label}</span>
                                                        <span className="text-slate-400">→</span>
                                                        <span className="font-mono text-right">
                                                            <span className="text-slate-400 line-through mr-1">{formatValue(row.from)}</span>
                                                            <span className="text-slate-800">{formatValue(row.to)}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button variant="secondary" disabled={loading} onClick={() => setConfirmStructure(true)}>
                                                Write DB values into furnidata
                                            </Button>
                                        </>
                                    )}
                                </Section>
                                <Section title="FurniData.json" defaultOpen={false}>
                                    <Text className="text-[10px] text-slate-400 mb-1 block">
                                        Read-only — how this furni resolves from the furnidata JSON (source of truth for the display name).
                                    </Text>
                                    <pre className="text-[10px] leading-snug text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-52 whitespace-pre-wrap break-all font-mono">
                                        {JSON.stringify(furniDataEntry, null, 2)}
                                    </pre>
                                </Section>
                            </>
                        )}

                        {duplicates.length > 0 && (
                            <Section title={`Duplicates (${duplicates.length})`}>
                                <Text className="text-[10px] text-amber-700 mb-1 block">
                                    Other items_base rows with this classname or sprite id. Two rows for one furni usually means an import ran twice; keep the
                                    one placed in rooms.
                                </Text>
                                <div data-testid="furni-editor-duplicates" className="flex flex-col gap-0.5">
                                    {duplicates.map((row) => (
                                        <button
                                            key={row.id}
                                            type="button"
                                            onClick={() => openFurni(row.spriteId)}
                                            className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100 text-left"
                                        >
                                            <span className="font-mono text-slate-700">{row.itemName}</span>
                                            <span className="font-mono text-slate-500">
                                                #{row.id} · s{row.spriteId}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </Section>
                        )}
                        {related.siblings.length > 0 && (
                            <Section title={`Same line (${related.siblings.length})`}>
                                <Text className="text-[10px] text-slate-400 mb-1 block">
                                    Furni sharing the classname prefix. When most of them agree on a value, it is offered under the matching field.
                                </Text>
                                <div data-testid="furni-editor-siblings" className="flex flex-col gap-0.5">
                                    {related.siblings.map((row) => (
                                        <button
                                            key={row.id}
                                            type="button"
                                            onClick={() => openFurni(row.spriteId)}
                                            className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left"
                                        >
                                            <span className="font-mono text-slate-700 truncate flex-1">{row.itemName}</span>
                                            <span className="text-slate-500">
                                                {row.width}×{row.length}
                                            </span>
                                            <span className="font-mono text-slate-400">{row.interactionType || 'none'}</span>
                                        </button>
                                    ))}
                                </div>
                            </Section>
                        )}
                        {furnidataIdMismatch !== null && (
                            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-snug">
                                <span className="text-[#f59e0b] text-sm leading-none mt-px">⚠</span>
                                <span>
                                    This entry was matched by classname but carries id <b>{furnidataIdMismatch}</b>, while the DB sprite id is{' '}
                                    <b>{item.spriteId}</b>. Rooms resolve the sprite through the furnidata id, so they draw whichever furni owns{' '}
                                    {furnidataIdMismatch}. Fix by repointing the furnidata id to the sprite id, or the sprite id to the entry.
                                </span>
                            </div>
                        )}
                        <Section title="Furnidata Debug" defaultOpen={false}>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label className={labelClass}>Resolution</label>
                                    <CopyValue value={furnidataMissReason} />
                                </div>
                                <div>
                                    <label className={labelClass}>Source</label>
                                    <CopyValue value={furnidataSourcePath || 'unresolved'} />
                                </div>
                            </div>
                            <pre className="text-[10px] leading-snug text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all font-mono">
                                {JSON.stringify(furniDataDiagnostic ?? {}, null, 2)}
                            </pre>
                        </Section>
                    </div>

                    <div className={groupClass('placement')}>
                        <Section title="Dimensions">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-width">
                                        Width{revert('width')}
                                    </label>
                                    <input
                                        id="furni-editor-width"
                                        aria-label={FIELD_LABELS.width}
                                        type="number"
                                        className={inputClass('width')}
                                        value={form.width}
                                        onChange={(e) => setField('width', Number(e.target.value))}
                                    />
                                    {validation.width && <span className="text-[9px] text-red-500">{validation.width}</span>}
                                    {chipsFor('width')}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-length">
                                        Length{revert('length')}
                                    </label>
                                    <input
                                        id="furni-editor-length"
                                        aria-label={FIELD_LABELS.length}
                                        type="number"
                                        className={inputClass('length')}
                                        value={form.length}
                                        onChange={(e) => setField('length', Number(e.target.value))}
                                    />
                                    {validation.length && <span className="text-[9px] text-red-500">{validation.length}</span>}
                                    {chipsFor('length')}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Stack Height
                                        <Tip field="stackHeight" />
                                        {revert('stackHeight')}
                                    </label>
                                    <input
                                        id="furni-editor-stackHeight"
                                        aria-label={FIELD_LABELS.stackHeight}
                                        type="number"
                                        step="0.01"
                                        className={inputClass('stackHeight')}
                                        value={form.stackHeight}
                                        onChange={(e) => setField('stackHeight', Number(e.target.value))}
                                    />
                                    {validation.stackHeight && <span className="text-[9px] text-red-500">{validation.stackHeight}</span>}
                                    {chipsFor('stackHeight')}
                                </div>
                            </div>
                        </Section>

                        <Section title="Permissions">
                            <div className="flex flex-col gap-2">
                                {PERM_GROUPS.map((group) => (
                                    <div key={group.label}>
                                        <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">{group.label}</Text>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.keys.map((key) => {
                                                const on = form[key] === true;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setField(key, !on)}
                                                        aria-pressed={on}
                                                        title={on ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                                                        className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${on ? 'bg-[#418db0] border-[#418db0] text-[#ffffff] shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}${isChanged(key) ? ' ring-2 ring-amber-300' : ''}`}
                                                    >
                                                        <span
                                                            className={`inline-block w-2 h-2 rounded-full ring-1 ${on ? 'bg-[#22c55e] ring-[#ffffff]/70' : 'bg-[#ef4444] ring-[#00000014]'}`}
                                                        />
                                                        {key.replace('allow', '')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>

                    <div className={groupClass('behaviour')}>
                        <Section title="Interaction">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className={labelClass}>
                                        Type
                                        <Tip field="interactionType" />
                                        {revert('interactionType')}
                                    </label>
                                    <InteractionTypePicker
                                        id="furni-editor-interactionType"
                                        value={form.interactionType}
                                        options={interactions}
                                        className={inputClass('interactionType')}
                                        onChange={(value) => setField('interactionType', value)}
                                    />
                                    {suggestedType && (
                                        <button
                                            type="button"
                                            onClick={() => setField('interactionType', suggestedType.type)}
                                            title={suggestedType.reason}
                                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 hover:bg-primary/15 transition"
                                        >
                                            <span aria-hidden="true">✦</span> Suggested: <span className="font-mono">{suggestedType.type}</span>
                                            <span className="text-primary/70 font-normal">· {suggestedType.reason}</span>
                                        </button>
                                    )}
                                    {interactionUnregistered && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-md px-2 py-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                                            No class registered for this type: the furni behaves as default
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-interactionModesCount">
                                        Modes
                                        <Tip field="interactionModesCount" />
                                        {revert('interactionModesCount')}
                                    </label>
                                    <input
                                        id="furni-editor-interactionModesCount"
                                        aria-label={FIELD_LABELS.interactionModesCount}
                                        type="number"
                                        className={inputClass('interactionModesCount')}
                                        value={form.interactionModesCount}
                                        onChange={(e) => setField('interactionModesCount', Number(e.target.value))}
                                    />
                                    {fieldError('interactionModesCount')}
                                    {chipsFor('interactionModesCount')}
                                </div>
                            </div>
                            <div className="mt-1">
                                <label className={labelClass} htmlFor="furni-editor-customparams">
                                    Custom Params
                                    <Tip field="customparams" />
                                    {revert('customparams')}
                                </label>
                                <input
                                    id="furni-editor-customparams"
                                    aria-label={FIELD_LABELS.customparams}
                                    className={inputClass('customparams')}
                                    value={form.customparams}
                                    onChange={(e) => setField('customparams', e.target.value)}
                                />
                                {fieldError('customparams')}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-vendingIds">
                                        Vending IDs
                                        <Tip field="vendingIds" />
                                        {revert('vendingIds')}
                                    </label>
                                    <input
                                        id="furni-editor-vendingIds"
                                        aria-label={FIELD_LABELS.vendingIds}
                                        className={inputClass('vendingIds')}
                                        value={form.vendingIds}
                                        onChange={(e) => setField('vendingIds', e.target.value)}
                                    />
                                    {fieldError('vendingIds')}
                                    {chipsFor('vendingIds')}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-multiheight">
                                        Multiheight
                                        <Tip field="multiheight" />
                                        {revert('multiheight')}
                                    </label>
                                    <input
                                        id="furni-editor-multiheight"
                                        aria-label={FIELD_LABELS.multiheight}
                                        className={inputClass('multiheight')}
                                        value={form.multiheight}
                                        onChange={(e) => setField('multiheight', e.target.value)}
                                    />
                                    {fieldError('multiheight')}
                                    {chipsFor('multiheight')}
                                </div>
                            </div>
                        </Section>

                        <Section title="Effects &amp; clothing">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-effectIdMale">
                                        Effect ID (male)
                                        <Tip field="effectIdMale" />
                                        {revert('effectIdMale')}
                                    </label>
                                    <input
                                        id="furni-editor-effectIdMale"
                                        aria-label={FIELD_LABELS.effectIdMale}
                                        type="number"
                                        min={0}
                                        className={inputClass('effectIdMale')}
                                        value={form.effectIdMale}
                                        onChange={(e) => setField('effectIdMale', Number(e.target.value))}
                                    />
                                    {fieldError('effectIdMale')}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-effectIdFemale">
                                        Effect ID (female)
                                        <Tip field="effectIdFemale" />
                                        {revert('effectIdFemale')}
                                    </label>
                                    <input
                                        id="furni-editor-effectIdFemale"
                                        aria-label={FIELD_LABELS.effectIdFemale}
                                        type="number"
                                        min={0}
                                        className={inputClass('effectIdFemale')}
                                        value={form.effectIdFemale}
                                        onChange={(e) => setField('effectIdFemale', Number(e.target.value))}
                                    />
                                    {fieldError('effectIdFemale')}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="furni-editor-clothingOnWalk">
                                        Clothing on walk
                                        <Tip field="clothingOnWalk" />
                                        {revert('clothingOnWalk')}
                                    </label>
                                    <input
                                        id="furni-editor-clothingOnWalk"
                                        aria-label={FIELD_LABELS.clothingOnWalk}
                                        className={inputClass('clothingOnWalk')}
                                        value={form.clothingOnWalk}
                                        onChange={(e) => setField('clothingOnWalk', e.target.value)}
                                    />
                                    {fieldError('clothingOnWalk')}
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>

            {confirmSave && (
                <ConfirmModal title="Confirm changes" confirmLabel="Confirm" confirmVariant="success" onConfirm={handleSaveConfirm} onCancel={closeSave}>
                    <Text small className="mb-2 block text-[#666]">
                        {changedFields.length} field{changedFields.length === 1 ? '' : 's'} of <strong>{item.publicName || item.itemName}</strong> (ID:{' '}
                        {item.id}) will change. Rooms pick the new values up on their next reload.
                    </Text>
                    {item.usageCount > 0 && changedFields.some((f) => placementFields.includes(f)) && (
                        <div
                            role="note"
                            className="mb-2 flex items-start gap-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 leading-snug"
                        >
                            <span className="text-[#f59e0b] leading-none mt-px">⚠</span>
                            <span>
                                {item.usageCount} placed furni will take the new footprint or walk rules when their room reloads. Check for overlaps and blocked
                                paths afterwards.
                            </span>
                        </div>
                    )}
                    <div className="max-h-48 overflow-auto flex flex-col gap-1">
                        {changedFields.map((field) => (
                            <div
                                key={field}
                                className="text-xs grid grid-cols-[1fr_auto_1fr] items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                            >
                                <span className="font-medium text-slate-700 truncate">{FIELD_LABELS[field]}</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-mono text-right truncate">
                                    <span className="text-slate-400 line-through mr-1">{formatValue(stored[field])}</span>
                                    <span className="text-slate-800">{formatValue(form[field])}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </ConfirmModal>
            )}

            {confirmBack && (
                <ConfirmModal title="Unsaved changes" confirmLabel="Discard" confirmVariant="danger" onConfirm={onBack} onCancel={closeBack}>
                    <Text small className="block text-[#666]">
                        {changedFields.length} unsaved change{changedFields.length === 1 ? '' : 's'} will be lost if you go back now.
                    </Text>
                </ConfirmModal>
            )}

            {showDeleteDialog && (
                <ConfirmModal title="Delete Item?" confirmLabel="Delete" confirmVariant="danger" onConfirm={handleDeleteConfirm} onCancel={closeDelete}>
                    <Text small className="block text-[#666]">
                        Are you sure you want to delete <strong>{item.publicName || item.itemName}</strong> (ID: {item.id})? This action cannot be undone.
                    </Text>
                </ConfirmModal>
            )}

            {confirmStructure && (
                <ConfirmModal
                    title="Rewrite furnidata structure?"
                    confirmLabel="Write"
                    confirmVariant="success"
                    onConfirm={writeStructure}
                    onCancel={closeStructure}
                >
                    <Text small className="mb-2 block text-[#666]">
                        {structureDiff.length} field{structureDiff.length === 1 ? '' : 's'} of the furnidata entry for <strong>{item.itemName}</strong> will
                        take the DB values. Every client reloads its furnidata afterwards.
                    </Text>
                    <div className="flex flex-col gap-1">
                        {structureDiff.map((row) => (
                            <div key={row.key} className="text-xs font-mono">
                                <b>{row.label}:</b> {formatValue(row.from)} → {formatValue(row.to)}
                            </div>
                        ))}
                    </div>
                </ConfirmModal>
            )}

            {confirmFurnidata && (
                <ConfirmModal
                    title="Apply furnidata change to ALL clients?"
                    confirmLabel="Confirm"
                    confirmVariant="success"
                    onConfirm={() => {
                        onUpdateFurnidata(item.id, furniName, furniDescription);
                        setConfirmFurnidata(false);
                    }}
                    onCancel={closeFurnidata}
                >
                    <div className="text-xs mb-1">
                        <b>Name:</b> {String(furniDataEntry?.name ?? '')} → {furniName}
                    </div>
                    <div className="text-xs">
                        <b>Desc:</b> {String(furniDataEntry?.description ?? '')} → {furniDescription}
                    </div>
                </ConfirmModal>
            )}
        </div>
    );
};
