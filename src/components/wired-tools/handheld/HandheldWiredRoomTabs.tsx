import { IWiredChestTransactionRow, IWiredSetupImportReport } from '@octane/renderer';
import { ChangeEvent, FC, RefObject } from 'react';
import { localizeWithFallback } from '../../../api';
import { Checkbox } from '../../../common/Checkbox';
import { Radio } from '../../../common/Radio';
import { Select } from '../../../common/Select';
import { HandheldWiredButton, HandheldWiredCard, HandheldWiredEmpty, HandheldWiredField, HandheldWiredPair } from './HandheldWiredParts';

export interface HandheldWiredCheckRow {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}

export interface HandheldWiredOption {
    value: string;
    label: string;
}

const CheckRows: FC<{ rows: HandheldWiredCheckRow[] }> = ({ rows }) => (
    <div className="octane-handheld-wired__checks">
        {rows.map((row) => (
            <label key={row.label} className={`octane-handheld-wired__check is-row${row.disabled ? ' is-disabled' : ''}`}>
                <Checkbox checked={row.checked} disabled={row.disabled} onCheckedChange={(nextChecked) => row.onChange(nextChecked)} />
                <span>{row.label}</span>
            </label>
        ))}
    </div>
);

export interface HandheldWiredSettingsTabProps {
    modifyRows: HandheldWiredCheckRow[];
    inspectRows: HandheldWiredCheckRow[];
    timezone: string;
    timezoneOptions: HandheldWiredOption[];
    timezoneDisabled: boolean;
    onTimezoneChange: (zone: string) => void;
    canReload: boolean;
    onReload: () => void;
    canRollBack: boolean;
    onRollBack: () => void;
    preferenceRows: HandheldWiredCheckRow[];
    wiredStyle: string;
    wiredStyleOptions: HandheldWiredOption[];
    onWiredStyleChange: (style: string) => void;
    /** The sandbox donation tool, when it is switched on. */
    onOpenSelfDonation: (() => void) | null;
}

/** The settings tab on a phone: who may change and inspect the wired, the timezone, the room state and the account's preferences as cards of finger-sized rows. */
export const HandheldWiredSettingsTab: FC<HandheldWiredSettingsTabProps> = (props) => {
    const {
        modifyRows,
        inspectRows,
        timezone,
        timezoneOptions,
        timezoneDisabled,
        onTimezoneChange,
        canReload,
        onReload,
        canRollBack,
        onRollBack,
        preferenceRows,
        wiredStyle,
        wiredStyleOptions,
        onWiredStyleChange,
        onOpenSelfDonation
    } = props;

    return (
        <div className="octane-handheld-wired__flow" data-testid="wired-settings">
            <div className="octane-handheld-wired__heading">{localizeWithFallback('wiredmenu.settings.room_settings', 'Room settings:')}</div>
            <div className="octane-handheld-wired__cards">
                <HandheldWiredCard title={localizeWithFallback('wiredmenu.settings.room_settings.modify_rights', 'Who can modify Wired:')}>
                    <CheckRows rows={modifyRows} />
                </HandheldWiredCard>
                <HandheldWiredCard title={localizeWithFallback('wiredmenu.settings.room_settings.read_rights', 'Who can inspect Wired:')}>
                    <CheckRows rows={inspectRows} />
                </HandheldWiredCard>
                <HandheldWiredCard title={localizeWithFallback('wiredmenu.settings.room_settings.timezone', 'Timezone:')}>
                    <Select
                        aria-label={localizeWithFallback('octane.wired_tools.timezone', 'Timezone')}
                        disabled={timezoneDisabled}
                        value={timezone}
                        onChange={(event) => onTimezoneChange(event.target.value)}
                    >
                        {timezoneOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </HandheldWiredCard>
                <HandheldWiredCard title={localizeWithFallback('wiredmenu.settings.room_settings.room_state', 'Room state:')}>
                    <div className="octane-handheld-wired__actions">
                        <HandheldWiredButton disabled={!canReload} testId="wired-reload" onClick={onReload}>
                            {localizeWithFallback('wiredmenu.settings.room_state.reload', 'Reload')}
                        </HandheldWiredButton>
                        <HandheldWiredButton disabled={!canRollBack} testId="wired-rollback" tone="danger" onClick={onRollBack}>
                            {localizeWithFallback('wiredmenu.settings.room_state.roll_back', 'Rollback')}
                        </HandheldWiredButton>
                    </div>
                </HandheldWiredCard>
            </div>
            <div className="octane-handheld-wired__heading">{localizeWithFallback('wiredmenu.settings.preferences', 'Account preferences:')}</div>
            <HandheldWiredCard title={localizeWithFallback('wiredmenu.settings.preferences.general', 'General:')}>
                <CheckRows rows={preferenceRows} />
                <HandheldWiredField label={localizeWithFallback('wiredmenu.settings.preferences.wired_style', 'Wired UI style:')}>
                    <Select value={wiredStyle} onChange={(event) => onWiredStyleChange(event.target.value)}>
                        {wiredStyleOptions.map((option) => (
                            <option key={option.value || 'default'} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </HandheldWiredField>
            </HandheldWiredCard>
            {!!onOpenSelfDonation && (
                <HandheldWiredCard title={localizeWithFallback('selfdonation.section', 'Sandbox tools:')}>
                    <p className="octane-handheld-wired__text">
                        {localizeWithFallback(
                            'selfdonation.info',
                            'Give yourself furni to test wired with. Only staff with the sandbox permission can use it.'
                        )}
                    </p>
                    <HandheldWiredButton testId="wired-self-donation" onClick={onOpenSelfDonation}>
                        {localizeWithFallback('selfdonation.title', 'Sandbox donation tool')}
                    </HandheldWiredButton>
                </HandheldWiredCard>
            )}
        </div>
    );
};

export interface HandheldWiredShareTabProps {
    canModify: boolean;
    exportBusy: boolean;
    exportCode: string;
    exportCount: number;
    exportErrorText: string | null;
    copied: boolean;
    onExport: () => void;
    onCopy: () => void;
    onDownload: () => void;
    importCode: string;
    onImportCodeChange: (code: string) => void;
    maxCodeLength: number;
    fileInput: RefObject<HTMLInputElement>;
    onLoadFile: (event: ChangeEvent<HTMLInputElement>) => void;
    anchorAvatar: boolean;
    onAnchorAvatar: () => void;
    onAnchorOriginal: () => void;
    placeFromInventory: boolean;
    onPlaceFromInventoryChange: (checked: boolean) => void;
    canPreview: boolean;
    onPreview: () => void;
    canImport: boolean;
    onImport: () => void;
    report: IWiredSetupImportReport | null;
    reportErrorText: string | null;
    reportSummary: string;
    describeEntry: (entry: IWiredSetupImportReport['entries'][number]) => { box: string; status: string; reason: string };
}

/** The share tab on a phone: make a code of the room's wired (copy, save), and import one with a preview of where every box lands, as two cards. */
export const HandheldWiredShareTab: FC<HandheldWiredShareTabProps> = (props) => {
    const {
        canModify,
        exportBusy,
        exportCode,
        exportCount,
        exportErrorText,
        copied,
        onExport,
        onCopy,
        onDownload,
        importCode,
        onImportCodeChange,
        maxCodeLength,
        fileInput,
        onLoadFile,
        anchorAvatar,
        onAnchorAvatar,
        onAnchorOriginal,
        placeFromInventory,
        onPlaceFromInventoryChange,
        canPreview,
        onPreview,
        canImport,
        onImport,
        report,
        reportErrorText,
        reportSummary,
        describeEntry
    } = props;

    return (
        <div className="octane-handheld-wired__flow is-two" data-testid="wired-share">
            <HandheldWiredCard title={localizeWithFallback('wiredmenu.share.export.title', 'Share wired:')}>
                <p className="octane-handheld-wired__text">
                    {localizeWithFallback(
                        'wiredmenu.share.export.info',
                        'Make a code of all wired in this room. Someone else can import it in their own room. No furni go with it, only the settings.'
                    )}
                </p>
                <div className="octane-handheld-wired__actions is-grid">
                    <HandheldWiredButton disabled={!canModify || exportBusy} testId="wired-share-export" tone="primary" onClick={onExport}>
                        {localizeWithFallback('wiredmenu.share.export.create', 'Make code')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={!exportCode} testId="wired-share-copy" onClick={onCopy}>
                        {copied
                            ? localizeWithFallback('wiredmenu.share.export.copied', 'Code copied')
                            : localizeWithFallback('wiredmenu.share.export.copy', 'Copy')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={!exportCode} onClick={onDownload}>
                        {localizeWithFallback('wiredmenu.share.export.download', 'Save as file')}
                    </HandheldWiredButton>
                </div>
                {exportErrorText && <p className="octane-handheld-wired__text is-error">{exportErrorText}</p>}
                {!!exportCode && (
                    <>
                        <p className="octane-handheld-wired__text">
                            {localizeWithFallback('wiredmenu.share.export.count', '%count% wired boxes in this code.', ['count'], [String(exportCount)])}
                        </p>
                        <textarea
                            readOnly
                            aria-label={localizeWithFallback('octane.wired_tools.wired_code', 'Wired code')}
                            className="octane-handheld-wired__code"
                            value={exportCode}
                            onFocus={(event) => event.target.select()}
                        />
                    </>
                )}
            </HandheldWiredCard>
            <HandheldWiredCard title={localizeWithFallback('wiredmenu.share.import.title', 'Import wired:')}>
                <p className="octane-handheld-wired__text">
                    {localizeWithFallback(
                        'wiredmenu.share.import.info',
                        'Paste a code or open a file. Only wired boxes you placed in this room, or have placed from your own inventory, get the settings.'
                    )}
                </p>
                <textarea
                    aria-label={localizeWithFallback('octane.wired_tools.wired_code_to_import', 'Wired code to import')}
                    className="octane-handheld-wired__code"
                    maxLength={maxCodeLength}
                    placeholder={localizeWithFallback('wiredmenu.share.import.paste', 'Paste the wired code here')}
                    value={importCode}
                    onChange={(event) => onImportCodeChange(event.target.value)}
                />
                <HandheldWiredButton onClick={() => fileInput.current?.click()}>
                    {localizeWithFallback('wiredmenu.share.import.open_file', 'Open file')}
                </HandheldWiredButton>
                <input ref={fileInput} accept=".txt,text/plain" className="octane-handheld-wired__file" type="file" onChange={onLoadFile} />
                <div className="octane-handheld-wired__field-label">{localizeWithFallback('wiredmenu.share.import.anchor', 'Position:')}</div>
                <div className="octane-handheld-wired__checks">
                    <label className="octane-handheld-wired__check is-row">
                        <Radio checked={anchorAvatar} name="wired-share-anchor-phone" onCheckedChange={onAnchorAvatar} />
                        <span>{localizeWithFallback('wiredmenu.share.import.anchor.avatar', 'From the tile I am standing on')}</span>
                    </label>
                    <label className="octane-handheld-wired__check is-row">
                        <Radio checked={!anchorAvatar} name="wired-share-anchor-phone" onCheckedChange={onAnchorOriginal} />
                        <span>{localizeWithFallback('wiredmenu.share.import.anchor.original', 'On the same tiles as in the original room')}</span>
                    </label>
                    <label className="octane-handheld-wired__check is-row">
                        <Checkbox checked={placeFromInventory} onCheckedChange={onPlaceFromInventoryChange} />
                        <span>{localizeWithFallback('wiredmenu.share.import.place_from_inventory', 'Place missing boxes from my inventory')}</span>
                    </label>
                </div>
                <div className="octane-handheld-wired__actions">
                    <HandheldWiredButton disabled={!canPreview} testId="wired-share-preview" onClick={onPreview}>
                        {localizeWithFallback('wiredmenu.share.import.preview', 'Preview')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={!canImport} testId="wired-share-import" tone="primary" onClick={onImport}>
                        {localizeWithFallback('wiredmenu.share.import.confirm', 'Import')}
                    </HandheldWiredButton>
                </div>
                {reportErrorText && <p className="octane-handheld-wired__text is-error">{reportErrorText}</p>}
                {!!report && !reportErrorText && (
                    <>
                        <p className="octane-handheld-wired__text is-strong">{reportSummary}</p>
                        <div className="octane-handheld-wired__rows">
                            {report.entries.map((entry) => {
                                const shown = describeEntry(entry);

                                return (
                                    <article key={entry.index} className="octane-handheld-wired__entry">
                                        <div className="octane-handheld-wired__entry-title">{shown.box}</div>
                                        <HandheldWiredPair label={localizeWithFallback('wiredmenu.share.col.tile', 'Tile')} value={`${entry.x},${entry.y}`} />
                                        <HandheldWiredPair
                                            label={localizeWithFallback('wiredmenu.share.col.status', 'Status')}
                                            value={shown.reason ? `${shown.status} — ${shown.reason}` : shown.status}
                                        />
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </HandheldWiredCard>
        </div>
    );
};

export interface HandheldWiredChestsTabProps {
    filter: number;
    filterOptions: HandheldWiredOption[];
    onFilterChange: (filter: number) => void;
    loaded: boolean;
    rows: IWiredChestTransactionRow[];
    describeRow: (row: IWiredChestTransactionRow) => { method: string; withdrawn: string; deposited: string };
    totalRows: number;
    onViewDetails: () => void;
    canManageOwn: boolean;
    canManageAll: boolean;
    lockBusy: boolean;
    onLockOwn: () => void;
    onUnlockOwn: () => void;
    onLockAll: () => void;
}

/** The chests tab on a phone: the room's latest transactions as cards (the full log opens as a page) and the chest locks as big buttons. */
export const HandheldWiredChestsTab: FC<HandheldWiredChestsTabProps> = (props) => {
    const {
        filter,
        filterOptions,
        onFilterChange,
        loaded,
        rows,
        describeRow,
        totalRows,
        onViewDetails,
        canManageOwn,
        canManageAll,
        lockBusy,
        onLockOwn,
        onUnlockOwn,
        onLockAll
    } = props;

    return (
        <div className="octane-handheld-wired__flow is-two" data-testid="wired-chests">
            <HandheldWiredCard title={localizeWithFallback('wiredmenu.chests.room_logs.title', 'Room transaction log')}>
                <Select
                    aria-label={localizeWithFallback('wiredchests.logs.item_type_filter', 'Filter item type:')}
                    value={String(filter)}
                    onChange={(event) => onFilterChange(parseInt(event.target.value, 10))}
                >
                    {filterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                {loaded && !rows.length && (
                    <HandheldWiredEmpty>{localizeWithFallback('wiredmenu.chests.room_logs.empty', 'No transactions yet.')}</HandheldWiredEmpty>
                )}
                <div className="octane-handheld-wired__rows">
                    {rows.map((row) => {
                        const shown = describeRow(row);

                        return (
                            <article key={row.transactionId} className="octane-handheld-wired__entry" data-testid="wired-chest-row">
                                <div className="octane-handheld-wired__entry-title">
                                    <span>{shown.method}</span>
                                    <span className="octane-handheld-wired__entry-sub">{row.userName || '-'}</span>
                                </div>
                                <HandheldWiredPair
                                    label={localizeWithFallback('wiredmenu.chests.room_logs.column.withdraws', 'Withdrawals')}
                                    value={shown.withdrawn}
                                />
                                <HandheldWiredPair
                                    label={localizeWithFallback('wiredmenu.chests.room_logs.column.deposits', 'Deposits')}
                                    value={shown.deposited}
                                />
                            </article>
                        );
                    })}
                </div>
                <div className="octane-handheld-wired__card-foot">
                    <span className="octane-handheld-wired__muted">
                        {localizeWithFallback('wiredmenu.chests.room_logs.total', '%count% transactions', ['count'], [String(totalRows)])}
                    </span>
                    <HandheldWiredButton disabled={!totalRows} testId="wired-chests-details" onClick={onViewDetails}>
                        {localizeWithFallback('wiredmenu.chests.room_logs.view_in_detail', 'View in detail')}
                    </HandheldWiredButton>
                </div>
            </HandheldWiredCard>
            <HandheldWiredCard title={localizeWithFallback('wiredmenu.chests.chest_control.title', 'Chest control')}>
                <p className="octane-handheld-wired__text">
                    {localizeWithFallback(
                        'wiredmenu.chests.chest_control.hint',
                        'A locked chest still answers wired - only what people do by hand is blocked, in both directions.'
                    )}
                </p>
                <div className="octane-handheld-wired__actions is-stack">
                    <HandheldWiredButton disabled={!canManageOwn || lockBusy} testId="wired-chests-lock-own" onClick={onLockOwn}>
                        {localizeWithFallback('wiredmenu.chests.chest_control.lock_own', 'Lock my chests')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={!canManageOwn || lockBusy} testId="wired-chests-unlock-own" onClick={onUnlockOwn}>
                        {localizeWithFallback('wiredmenu.chests.chest_control.unlock_own', 'Unlock my chests')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={!canManageAll || lockBusy} testId="wired-chests-lock-all" tone="danger" onClick={onLockAll}>
                        {localizeWithFallback('wiredmenu.chests.chest_control.lock_all', 'Lock every chest')}
                    </HandheldWiredButton>
                </div>
                {!canManageAll && (
                    <p className="octane-handheld-wired__muted">
                        {localizeWithFallback('wiredmenu.chests.chest_control.owner_only', 'Only the room owner can lock every chest.')}
                    </p>
                )}
            </HandheldWiredCard>
        </div>
    );
};
