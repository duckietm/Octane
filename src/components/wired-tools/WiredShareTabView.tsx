import {
    GetSessionDataManager,
    IWiredSetupImportReport,
    WiredSetupExportComposer,
    WiredSetupExportResultEvent,
    WiredSetupImportComposer,
    WiredSetupImportResultEvent
} from '@octane/renderer';
import { ChangeEvent, FC, useRef, useState } from 'react';
import {
    CopyToClipboard,
    isWiredShareCode,
    LocalizeText,
    localizeWithFallback,
    normalizeWiredShareCode,
    SendMessageComposer,
    WIRED_SHARE_ANCHOR_AVATAR,
    WIRED_SHARE_ANCHOR_ORIGINAL,
    WIRED_SHARE_MAX_CODE_LENGTH,
    WIRED_SHARE_STATUS_OK,
    wiredImportEntryText,
    wiredImportReasonText,
    wiredShareErrorText,
    wiredShareFileName
} from '../../api';
import { Button, Text } from '../../common';
import { useMessageEvent, useNotification, useRoom, useWiredTools } from '../../hooks';
import { Checkbox } from '../../common/Checkbox';
import { Radio } from '../../common/Radio';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const furniName = (type: string): string => GetSessionDataManager()?.getFloorItemDataByName?.(type)?.name || type;

/**
 * Wired setup share and import. Share asks the server for a code of every wired box in the room
 * (copy it or save it as a file); import pastes or loads a code, previews where every box lands and
 * applies it after a confirm. The server validates the whole code and only configures boxes the
 * importer placed, or places from their own inventory; nothing here is trusted.
 */
export const WiredShareTabView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const { roomSettings } = useWiredTools();
    const canModify = roomSettings.isLoaded && roomSettings.canModify;

    const [exportCode, setExportCode] = useState('');
    const [exportCount, setExportCount] = useState(0);
    const [exportError, setExportError] = useState(0);
    const [exportBusy, setExportBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    const [importCode, setImportCode] = useState('');
    const [anchorMode, setAnchorMode] = useState(WIRED_SHARE_ANCHOR_AVATAR);
    const [placeFromInventory, setPlaceFromInventory] = useState(false);
    const [importBusy, setImportBusy] = useState(false);
    const [report, setReport] = useState<IWiredSetupImportReport | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    useMessageEvent<WiredSetupExportResultEvent>(WiredSetupExportResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setExportBusy(false);
        setCopied(false);
        setExportError(parser.status);
        setExportCount(parser.boxCount);
        setExportCode(parser.status === WIRED_SHARE_STATUS_OK ? parser.code : '');
    });

    useMessageEvent<WiredSetupImportResultEvent>(WiredSetupImportResultEvent, (event) => {
        const parsed = event.getParser()?.report ?? null;

        setImportBusy(false);
        setReport(parsed);
    });

    const requestExport = () => {
        if (!canModify || exportBusy) return;

        setExportBusy(true);
        SendMessageComposer(new WiredSetupExportComposer(1));
    };

    const copyCode = () => {
        if (!exportCode) return;

        void CopyToClipboard(exportCode).then((ok) => setCopied(ok));
    };

    const downloadCode = () => {
        if (!exportCode || typeof URL === 'undefined' || !URL.createObjectURL) return;

        const url = URL.createObjectURL(new Blob([ exportCode ], { type: 'text/plain' }));
        const link = document.createElement('a');

        link.href = url;
        link.download = wiredShareFileName(roomSession?.roomId ?? 0);
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        event.target.value = '';
        if (!file || file.size > WIRED_SHARE_MAX_CODE_LENGTH * 2) return;

        void file.text().then((text) => {
            setImportCode(normalizeWiredShareCode(text));
            setReport(null);
        });
    };

    const sendImport = (confirm: boolean) => {
        const code = normalizeWiredShareCode(importCode);

        if (!canModify || importBusy || !isWiredShareCode(code)) return;

        setImportBusy(true);
        SendMessageComposer(new WiredSetupImportComposer(code, anchorMode, placeFromInventory, confirm));
    };

    const confirmImport = () => {
        if (!showConfirm) {
            sendImport(true);
            return;
        }

        showConfirm(
            localizeWithFallback(
                'wiredmenu.share.import.confirm.warning',
                'Import this wired? The settings of the boxes it finds are overwritten.'
            ),
            () => sendImport(true),
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            LocalizeText('generic.alert.title')
        );
    };

    const counts = report ? [ String(report.configured), String(report.placed), String(report.missing), String(report.refused) ] : [];
    const countKeys = [ 'configured', 'placed', 'missing', 'refused' ];
    const codeIsValid = isWiredShareCode(importCode);

    return (
        <NativeTextTree>
            <div className="p-3 min-h-[360px] flex flex-col gap-3">
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        {localizeWithFallback('wiredmenu.share.export.title', 'Share wired:')}
                    </Text>
                    <Text small>
                        {localizeWithFallback(
                            'wiredmenu.share.export.info',
                            'Make a code of all wired in this room. Someone else can import it in their own room. No furni go with it, only the settings.'
                        )}
                    </Text>
                    <div className="flex gap-2">
                        <Button disabled={!canModify || exportBusy} variant="secondary" onClick={requestExport}>
                            {localizeWithFallback('wiredmenu.share.export.create', 'Make code')}
                        </Button>
                        <Button disabled={!exportCode} variant="secondary" onClick={copyCode}>
                            {copied ? localizeWithFallback('wiredmenu.share.export.copied', 'Code copied') : localizeWithFallback('wiredmenu.share.export.copy', 'Copy')}
                        </Button>
                        <Button disabled={!exportCode} variant="secondary" onClick={downloadCode}>
                            {localizeWithFallback('wiredmenu.share.export.download', 'Save as file')}
                        </Button>
                    </div>
                    {exportError !== WIRED_SHARE_STATUS_OK && <Text small className="text-[#a40000]">{wiredShareErrorText(exportError)}</Text>}
                    {exportCode && (
                        <>
                            <Text small>{localizeWithFallback('wiredmenu.share.export.count', '%count% wired boxes in this code.', [ 'count' ], [ String(exportCount) ])}</Text>
                            <textarea
                                readOnly
                                aria-label="Wired code"
                                className="w-full h-[60px] rounded border border-[#9d998e] bg-[#f4f0e8] p-1 text-[10px] font-mono break-all"
                                value={exportCode}
                                onFocus={(event) => event.target.select()}
                            />
                        </>
                    )}
                </div>
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        {localizeWithFallback('wiredmenu.share.import.title', 'Import wired:')}
                    </Text>
                    <Text small>
                        {localizeWithFallback(
                            'wiredmenu.share.import.info',
                            'Paste a code or open a file. Only wired boxes you placed in this room, or have placed from your own inventory, get the settings.'
                        )}
                    </Text>
                    <textarea
                        aria-label="Wired code to import"
                        className="w-full h-[60px] rounded border border-[#9d998e] bg-[#f4f0e8] p-1 text-[10px] font-mono break-all"
                        maxLength={WIRED_SHARE_MAX_CODE_LENGTH * 2}
                        placeholder={localizeWithFallback('wiredmenu.share.import.paste', 'Paste the wired code here')}
                        value={importCode}
                        onChange={(event) => {
                            setImportCode(event.target.value);
                            setReport(null);
                        }}
                    />
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                            {localizeWithFallback('wiredmenu.share.import.open_file', 'Open file')}
                        </Button>
                        <input ref={fileInput} accept=".txt,text/plain" className="hidden" type="file" onChange={loadFile} />
                    </div>
                    <div className="flex flex-col gap-1 text-[12px] text-[#222]">
                        <span>{localizeWithFallback('wiredmenu.share.import.anchor', 'Position:')}</span>
                        <label className="flex items-center gap-2">
                            <Radio checked={anchorMode === WIRED_SHARE_ANCHOR_AVATAR} name="wired-share-anchor" onCheckedChange={ () => {
                                    setAnchorMode(WIRED_SHARE_ANCHOR_AVATAR);
                                    setReport(null);
                                } } />
                            <span>{localizeWithFallback('wiredmenu.share.import.anchor.avatar', 'From the tile I am standing on')}</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <Radio checked={anchorMode === WIRED_SHARE_ANCHOR_ORIGINAL} name="wired-share-anchor" onCheckedChange={ () => {
                                    setAnchorMode(WIRED_SHARE_ANCHOR_ORIGINAL);
                                    setReport(null);
                                } } />
                            <span>{localizeWithFallback('wiredmenu.share.import.anchor.original', 'On the same tiles as in the original room')}</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <Checkbox checked={placeFromInventory} onCheckedChange={ nextChecked => {
                                    setPlaceFromInventory(nextChecked);
                                    setReport(null);
                                } } />
                            <span>{localizeWithFallback('wiredmenu.share.import.place_from_inventory', 'Place missing boxes from my inventory')}</span>
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <Button disabled={!canModify || importBusy || !codeIsValid} variant="secondary" onClick={() => sendImport(false)}>
                            {localizeWithFallback('wiredmenu.share.import.preview', 'Preview')}
                        </Button>
                        <Button
                            disabled={!canModify || importBusy || !codeIsValid || !report || report.confirmed || report.status !== WIRED_SHARE_STATUS_OK}
                            variant="success"
                            onClick={confirmImport}
                        >
                            {localizeWithFallback('wiredmenu.share.import.confirm', 'Import')}
                        </Button>
                    </div>
                    {report && report.status !== WIRED_SHARE_STATUS_OK && <Text small className="text-[#a40000]">{wiredShareErrorText(report.status)}</Text>}
                    {report && report.status === WIRED_SHARE_STATUS_OK && (
                        <>
                            <Text small bold>
                                {report.confirmed
                                    ? localizeWithFallback(
                                          'wiredmenu.share.import.done',
                                          'Import done: %configured% configured, %placed% placed, %missing% missing, %refused% failed.',
                                          countKeys,
                                          counts
                                      )
                                    : localizeWithFallback(
                                          'wiredmenu.share.import.summary',
                                          '%configured% to configure, %placed% to place, %missing% missing, %refused% not possible.',
                                          countKeys,
                                          counts
                                      )}
                            </Text>
                            <div className="max-h-[160px] overflow-y-auto rounded border border-[#9d998e] bg-[#f4f0e8]">
                                <table className="w-full text-[12px]">
                                    <thead>
                                        <tr className="text-left">
                                            <th className="px-1">{localizeWithFallback('wiredmenu.share.col.box', 'Box')}</th>
                                            <th className="px-1">{localizeWithFallback('wiredmenu.share.col.tile', 'Tile')}</th>
                                            <th className="px-1">{localizeWithFallback('wiredmenu.share.col.status', 'Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.entries.map((entry) => (
                                            <tr key={entry.index} className="border-t border-[#d6d1c4] align-top">
                                                <td className="px-1">{furniName(entry.type)}</td>
                                                <td className="px-1 whitespace-nowrap">
                                                    {entry.x},{entry.y}
                                                </td>
                                                <td className="px-1">
                                                    {wiredImportEntryText(entry.status)}
                                                    {entry.reason && <span className="text-[#7a2f00]"> — {wiredImportReasonText(entry.reason)}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
