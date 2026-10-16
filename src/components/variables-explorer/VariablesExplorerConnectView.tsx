import { FC, useMemo, useState } from 'react';
import {
    createVariablesWebApiClient,
    ExplorerConnectField,
    ExplorerConnection,
    explorerErrorMessage,
    GetWebApiHotels,
    loadRememberedKeys,
    localizeWithFallback,
    sanitizeRoomIdInput,
    saveRememberedKeys,
    validateExplorerConnect,
    WebApiVariable
} from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { VariablesExplorerPrefill } from '../../state/variablesExplorer';
import { Checkbox } from '../../common/Checkbox';

export interface VariablesExplorerConnectViewProps {
    prefill: VariablesExplorerPrefill | null;
    onConnected: (connection: ExplorerConnection, variables: WebApiVariable[]) => void;
    onClose: () => void;
}

const LABEL_CLASS = 'text-[11px] font-bold uppercase tracking-[0.08em] text-[#5b5648]';
const FIELD_CLASS = 'w-full rounded border border-[#b8b2a4] bg-white px-2 py-[5px] text-[12px] text-black';

export const VariablesExplorerConnectView: FC<VariablesExplorerConnectViewProps> = ({ prefill, onConnected, onClose }) => {
    const hotels = useMemo(() => GetWebApiHotels(), []);
    const [hotelUrl, setHotelUrl] = useState(hotels[0]?.url ?? '');
    const [roomId, setRoomId] = useState(prefill?.roomId ? String(prefill.roomId) : '');
    const [remembered] = useState(() => (prefill?.readKey || prefill?.writeKey ? null : loadRememberedKeys(hotels[0]?.url ?? '', prefill?.roomId ?? 0)));
    const [readKey, setReadKey] = useState(prefill?.readKey ?? remembered?.readKey ?? '');
    const [writeKey, setWriteKey] = useState(prefill?.writeKey ?? remembered?.writeKey ?? '');
    const [remember, setRemember] = useState(!!remembered);
    const [errors, setErrors] = useState<Partial<Record<ExplorerConnectField, string>>>({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const fillRememberedKeys = () => {
        if (readKey || writeKey) return;

        const keys = loadRememberedKeys(hotelUrl, Number(roomId) || 0);

        if (!keys) return;

        setReadKey(keys.readKey);
        setWriteKey(keys.writeKey);
        setRemember(true);
    };

    const submit = async () => {
        if (busy) return;

        const result = validateExplorerConnect({ hotelUrl, roomId, readKey, writeKey }, hotels);

        setErrors(result.errors);
        setMessage('');

        if (!result.connection) return;

        setBusy(true);

        try {
            const variables = await createVariablesWebApiClient({ ...result.connection, baseUrl: result.connection.hotelUrl }).listVariables();

            saveRememberedKeys(result.connection, remember);
            onConnected(result.connection, variables);
        } catch (error) {
            setMessage(explorerErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const fieldError = (field: ExplorerConnectField) =>
        errors[field] ? (
            <span className="text-[11px] text-[#a32a2a]" role="alert">
                {errors[field]}
            </span>
        ) : null;

    return (
        <OctaneCardView
            className="min-w-[380px] max-w-[380px]"
            theme="primary-slim"
            uniqueKey="variables-explorer"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
            offsetLeft={120}
            offsetTop={60}
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.variables_explorer.title', 'Variables Explorer')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black bg-[#f4efe3] p-3" overflow="auto">
                <form
                    className="rounded border border-[#c8c2b2] bg-white p-4 flex flex-col gap-3"
                    noValidate
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.target.type === 'checkbox') return;

                        event.preventDefault();
                        void submit();
                    }}
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a8476]">
                            {localizeWithFallback('wiredmenu.variables_explorer.eyebrow', 'Variables Explorer')}
                        </span>
                        <Text bold className="text-[18px]">
                            {localizeWithFallback('wiredmenu.variables_explorer.connect.title', 'Connect to a room')}
                        </Text>
                        <Text className="text-[#555]">
                            {localizeWithFallback(
                                'wiredmenu.variables_explorer.connect.desc',
                                'Browse and manage variables and variable holders in your room, making use of the Variables Web API.'
                            )}
                        </Text>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className={LABEL_CLASS}>{localizeWithFallback('wiredmenu.variables_explorer.hotel', 'Hotel')}</span>
                        <select className={FIELD_CLASS} value={hotelUrl} onChange={(event) => setHotelUrl(event.target.value)}>
                            {!hotels.length && <option value="">-</option>}
                            {hotels.map((hotel) => (
                                <option key={hotel.url} value={hotel.url}>
                                    {hotel.name}
                                </option>
                            ))}
                        </select>
                        {fieldError('hotelUrl')}
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={LABEL_CLASS}>{localizeWithFallback('wiredmenu.variables_explorer.room_id', 'Room ID')}</span>
                        <input
                            className={FIELD_CLASS}
                            inputMode="numeric"
                            type="text"
                            value={roomId}
                            onBlur={fillRememberedKeys}
                            onChange={(event) => setRoomId(sanitizeRoomIdInput(event.target.value))}
                        />
                        {fieldError('roomId')}
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={LABEL_CLASS}>{localizeWithFallback('wiredmenu.variables_explorer.read_key', 'Wired read key')}</span>
                        <input
                            autoComplete="off"
                            className={`${FIELD_CLASS} font-mono`}
                            spellCheck={false}
                            type="password"
                            value={readKey}
                            onChange={(event) => setReadKey(event.target.value.trim())}
                        />
                        {fieldError('readKey')}
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={LABEL_CLASS}>{localizeWithFallback('wiredmenu.variables_explorer.write_key', 'Wired write key')}</span>
                        <input
                            autoComplete="off"
                            className={`${FIELD_CLASS} font-mono`}
                            spellCheck={false}
                            type="password"
                            value={writeKey}
                            onChange={(event) => setWriteKey(event.target.value.trim())}
                        />
                        {fieldError('writeKey')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={remember} onCheckedChange={(nextChecked) => setRemember(nextChecked)} />
                        <Text small>{localizeWithFallback('wiredmenu.variables_explorer.remember', 'Remember the keys for this room on this device')}</Text>
                    </label>
                    {!!message && (
                        <div className="rounded border border-[#d9a3a3] bg-[#fbeaea] px-2 py-1 text-[12px] text-[#8c2424]" role="alert">
                            {message}
                        </div>
                    )}
                    <Button disabled={busy || !hotels.length} variant="success" onClick={() => void submit()}>
                        {localizeWithFallback('wiredmenu.variables_explorer.open', 'Open explorer')}
                    </Button>
                </form>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
