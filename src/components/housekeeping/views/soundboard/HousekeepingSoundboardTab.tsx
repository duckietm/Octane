import { GetSoundManager, ISoundboardCatalogSound } from '@octane/renderer';
import { DragEvent, FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { useSoundboardCatalog, useSoundboardManifest } from '../../../../hooks';
import {
    filterCatalogSounds,
    reorderCatalog,
    SoundboardCatalogDraft,
    SoundboardCatalogFilter,
    validateCatalogDraft
} from '../../../../hooks/soundboard/soundboardCatalogState';
import { resolveSoundboardSoundUrl } from '../../../../hooks/soundboard/soundboardUrl';

const EMPTY_DRAFT: SoundboardCatalogDraft = { id: 0, name: '', classname: '', url: '', minRank: 1, enabled: true };
const RESULT_KEYS = [
    'success',
    'forbidden',
    'invalid_name',
    'invalid_url',
    'invalid_rank',
    'invalid_order',
    'not_found',
    'persistence_failure',
    'catalog_full'
];

export const HousekeepingSoundboardTab: FC = () => {
    const { sounds, lastResult, pendingOperation, request, upsert, reorder } = useSoundboardCatalog();
    const { manifest, classnames: knownClassnames } = useSoundboardManifest();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<SoundboardCatalogFilter>('all');
    const [draft, setDraft] = useState<SoundboardCatalogDraft>(EMPTY_DRAFT);
    const [orderedIds, setOrderedIds] = useState<number[]>([]);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [previewFailed, setPreviewFailed] = useState(false);

    useEffect(() => request(), [request]);
    useEffect(() => setOrderedIds(sounds.map((sound) => sound.id)), [sounds]);
    useEffect(() => {
        if (lastResult?.operation !== 1 || lastResult.resultCode !== 0 || lastResult.soundId <= 0) return;

        setDraft((current) => (current.id === 0 ? { ...current, id: lastResult.soundId } : current));
    }, [lastResult]);

    const orderedSounds = useMemo(
        () => orderedIds.map((id) => sounds.find((sound) => sound.id === id)).filter((sound): sound is ISoundboardCatalogSound => !!sound),
        [orderedIds, sounds]
    );
    const filteredSounds = useMemo(() => filterCatalogSounds(orderedSounds, query, filter), [orderedSounds, query, filter]);
    const validation = validateCatalogDraft(draft);
    const draftLocked = pendingOperation !== null;

    const editSound = (sound: ISoundboardCatalogSound) => {
        setDraft({
            id: sound.id,
            name: sound.name,
            classname: sound.classname ?? '',
            url: sound.url,
            minRank: sound.minRank,
            enabled: sound.enabled
        });
    };

    const preview = (candidate: SoundboardCatalogDraft) => {
        if (!validateCatalogDraft(candidate).valid) return;

        setPreviewFailed(false);
        void GetSoundManager()
            .playSoundboard(resolveSoundboardSoundUrl({ classname: candidate.classname?.trim() ?? '', url: candidate.url?.trim() ?? '' }, manifest))
            .then((played) => setPreviewFailed(!played));
    };

    const moveByOffset = (id: number, offset: number) => {
        setOrderedIds((current) => {
            const source = [...new Set(current)];
            const index = source.indexOf(id);
            const target = index + offset;
            if (index < 0 || target < 0 || target >= source.length) return source;

            [source[index], source[target]] = [source[target], source[index]];
            return source;
        });
    };

    const dropOn = (event: DragEvent, targetId: number) => {
        event.preventDefault();
        if (draggedId !== null) setOrderedIds((current) => reorderCatalog(current, draggedId, targetId));
        setDraggedId(null);
    };

    const resultKey = lastResult ? (RESULT_KEYS[lastResult.resultCode] ?? 'persistence_failure') : null;

    return (
        <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                    type="search"
                    aria-label={LocalizeText('housekeeping.soundboard.search')}
                    placeholder={LocalizeText('housekeeping.soundboard.search')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                />
                <select
                    aria-label={LocalizeText('housekeeping.soundboard.filter')}
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as SoundboardCatalogFilter)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                >
                    <option value="all">{LocalizeText('housekeeping.soundboard.filter.all')}</option>
                    <option value="enabled">{LocalizeText('housekeeping.soundboard.filter.enabled')}</option>
                    <option value="disabled">{LocalizeText('housekeeping.soundboard.filter.disabled')}</option>
                </select>
            </div>

            {resultKey && (
                <div
                    role="status"
                    className={`rounded border px-2 py-1 text-xs ${lastResult.resultCode === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}
                >
                    {LocalizeText(`housekeeping.soundboard.result.${resultKey}`)}
                </div>
            )}

            {previewFailed && (
                <div role="alert" className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs">
                    {LocalizeText('housekeeping.soundboard.preview_failed')}
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 rounded border border-sky-200 bg-sky-50/40 p-2">
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {LocalizeText('housekeeping.soundboard.name')}
                    <input
                        aria-label={LocalizeText('housekeeping.soundboard.name')}
                        disabled={draftLocked}
                        value={draft.name}
                        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-normal normal-case"
                    />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {LocalizeText('housekeeping.soundboard.classname')}
                    <input
                        aria-label={LocalizeText('housekeeping.soundboard.classname')}
                        disabled={draftLocked}
                        value={draft.classname}
                        list="soundboard-classnames"
                        placeholder={knownClassnames[0] ?? ''}
                        onChange={(event) => setDraft((current) => ({ ...current, classname: event.target.value }))}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-normal normal-case"
                    />
                    <datalist id="soundboard-classnames">
                        {knownClassnames.map((classname) => (
                            <option key={classname} value={classname} />
                        ))}
                    </datalist>
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {LocalizeText('housekeeping.soundboard.url')}
                    <input
                        aria-label={LocalizeText('housekeeping.soundboard.url')}
                        disabled={draftLocked}
                        value={draft.url}
                        onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-normal normal-case"
                    />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {LocalizeText('housekeeping.soundboard.min_rank')}
                    <input
                        type="number"
                        min={1}
                        step={1}
                        aria-label={LocalizeText('housekeeping.soundboard.min_rank')}
                        disabled={draftLocked}
                        value={draft.minRank}
                        onChange={(event) => setDraft((current) => ({ ...current, minRank: Number(event.target.value) }))}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-normal normal-case"
                    />
                </label>
                <label className="flex items-center gap-2 self-end py-1 text-xs font-semibold">
                    <input
                        type="checkbox"
                        checked={draft.enabled}
                        disabled={draftLocked}
                        onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    {LocalizeText('housekeeping.soundboard.enabled')}
                </label>
                {!validation.valid && (
                    <div role="alert" className="col-span-2 text-[10px] text-rose-700">
                        {Object.values(validation.errors)
                            .map((error) => LocalizeText(`housekeeping.soundboard.validation.${error}`))
                            .join(' · ')}
                    </div>
                )}
                <div className="col-span-2 flex flex-wrap justify-end gap-1.5">
                    <button
                        type="button"
                        disabled={draftLocked}
                        onClick={() => setDraft({ ...EMPTY_DRAFT })}
                        className="rounded bg-zinc-200 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                    >
                        {LocalizeText('housekeeping.soundboard.create')}
                    </button>
                    <button
                        type="button"
                        disabled={!validation.valid}
                        onClick={() => preview(draft)}
                        className="rounded bg-sky-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    >
                        {LocalizeText('housekeeping.soundboard.preview')}
                    </button>
                    <button
                        type="button"
                        disabled={!validation.valid || pendingOperation !== null}
                        onClick={() => upsert(draft)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    >
                        {LocalizeText('housekeeping.soundboard.save')}
                    </button>
                </div>
            </div>

            <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
                {filteredSounds.map((sound) => {
                    const orderIndex = orderedIds.indexOf(sound.id);

                    return (
                        <div
                            key={sound.id}
                            data-testid={`soundboard-catalog-row-${sound.id}`}
                            draggable
                            onDragStart={() => setDraggedId(sound.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => dropOn(event, sound.id)}
                            className="grid grid-cols-[1fr_auto] items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-xs font-semibold">
                                    {sound.name} <span className="font-normal text-zinc-400">#{sound.id}</span>
                                </div>
                                <div className="truncate text-[10px] text-zinc-500">
                                    {sound.classname || sound.url} · rank {sound.minRank} ·{' '}
                                    {sound.enabled
                                        ? LocalizeText('housekeeping.soundboard.filter.enabled')
                                        : LocalizeText('housekeeping.soundboard.filter.disabled')}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    aria-label={`${LocalizeText('housekeeping.soundboard.preview')} ${sound.name}`}
                                    onClick={() => preview(sound)}
                                    className="rounded bg-sky-100 px-1.5 py-1 text-[10px]"
                                >
                                    ▶
                                </button>
                                <button
                                    type="button"
                                    disabled={draftLocked}
                                    aria-label={`${LocalizeText('housekeeping.soundboard.edit')} ${sound.name}`}
                                    onClick={() => editSound(sound)}
                                    className="rounded bg-zinc-200 px-1.5 py-1 text-[10px] disabled:opacity-40"
                                >
                                    {LocalizeText('housekeeping.soundboard.edit')}
                                </button>
                                <button
                                    type="button"
                                    disabled={orderIndex <= 0}
                                    aria-label={`${LocalizeText('housekeeping.soundboard.move_up')} ${sound.name}`}
                                    onClick={() => moveByOffset(sound.id, -1)}
                                    className="rounded bg-zinc-100 px-1.5 py-1 text-[10px] disabled:opacity-30"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    disabled={orderIndex < 0 || orderIndex >= orderedIds.length - 1}
                                    aria-label={`${LocalizeText('housekeeping.soundboard.move_down')} ${sound.name}`}
                                    onClick={() => moveByOffset(sound.id, 1)}
                                    className="rounded bg-zinc-100 px-1.5 py-1 text-[10px] disabled:opacity-30"
                                >
                                    ↓
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                disabled={!orderedIds.length || pendingOperation !== null}
                onClick={() => reorder(orderedIds)}
                className="self-end rounded bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
                {LocalizeText('housekeeping.soundboard.save_order')}
            </button>
        </div>
    );
};
