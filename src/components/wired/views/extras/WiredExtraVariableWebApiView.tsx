import { FC, useEffect, useMemo, useState } from 'react';
import { CopyToClipboard, GetConfigurationValue, localizeWithFallback, NotificationBubbleType, OpenUrl, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useNotification, useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const FIELD_SEPARATOR = '\t';
const DOCS_LINK_CONFIGURATION_KEY = 'wired.api.docs.link';

/**
 * The keys are minted by the server and shown here read-only. Letting the room owner type one would
 * not make it theirs: the server ignores whatever arrives in those fields, because a key a client
 * chooses is not a credential. The only say this window has over them is asking for a fresh pair.
 */
export const WiredExtraVariableWebApiView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { roomVariableDefinitions = [] } = useWiredTools();
    const { showSingleBubble = null } = useNotification();
    const [variableToken, setVariableToken] = useState('');
    const [readKey, setReadKey] = useState('');
    const [writeKey, setWriteKey] = useState('');
    const [writeEnabled, setWriteEnabled] = useState(false);
    const [rotate, setRotate] = useState(false);

    const variableEntries = useMemo(
        // change-destination, not change-reference: this box can write the variable when the owner
        // enables it, so the picker must only offer variables that are legitimately writable.
        () => buildWiredVariablePickerEntries('global', 'change-destination', roomVariableDefinitions),
        [roomVariableDefinitions]
    );

    // A hotel that publishes its API reference sets the link in the client configuration; without
    // one there is nothing to open, so the button stays away rather than leading nowhere.
    const docsLink = GetConfigurationValue<string>(DOCS_LINK_CONFIGURATION_KEY, '') ?? '';

    useEffect(() => {
        if (!trigger) return;

        const fields = (trigger.stringData ?? '').split(FIELD_SEPARATOR);
        setVariableToken(fields[0] ?? '');
        setReadKey(fields[1] ?? '');
        setWriteKey(fields[2] ?? '');
        setWriteEnabled(trigger.intData?.length > 0 && trigger.intData[0] === 1);
        // Rotating is an action, not a stored setting, so it always starts off: reopening the window
        // and saving again must not silently invalidate the keys the owner has already handed out.
        setRotate(false);
    }, [trigger]);

    const save = () => {
        setIntParams([writeEnabled ? 1 : 0, rotate ? 1 : 0]);
        // Only the first field is read server-side; the keys ride along so the window can round-trip
        // what it was given without the server ever trusting it.
        setStringParam([variableToken, readKey, writeKey].join(FIELD_SEPARATOR));
    };

    const validate = () => !!variableToken;

    const copyKey = async (key: string) => {
        if (!(await CopyToClipboard(key))) return;

        showSingleBubble?.(localizeWithFallback('notification.wired.copied_api_key', 'API key copied to clipboard'), NotificationBubbleType.INFO);
    };

    const hasKeys = !!readKey && !!writeKey;
    const copyLabel = localizeWithFallback('wiredfurni.params.web_api.copy', 'Copy');

    const keyRow = (label: string, key: string) => (
        <div className="flex flex-col gap-1">
            <Text>{label}</Text>
            <div className="flex items-center gap-1">
                <OctaneInput readOnly={true} type="text" value={key} />
                <button type="button" className="btn btn-sm btn-primary" onClick={() => void copyKey(key)}>
                    {copyLabel}
                </button>
            </div>
        </div>
    );

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            cardStyle={{ width: 400 }}
        >
            <div className="flex flex-col gap-2">
                <Text>{localizeWithFallback('wiredfurni.params.web_api.variable', 'Variable to expose')}</Text>
                <WiredVariablePicker
                    entries={variableEntries}
                    recentScope="variable-web-api"
                    selectedToken={variableToken}
                    onSelect={(entry) => setVariableToken(entry.token)}
                />

                {hasKeys && (
                    <>
                        {keyRow(localizeWithFallback('wiredfurni.params.web_api.read_key', 'Read key'), readKey)}
                        {keyRow(localizeWithFallback('wiredfurni.params.web_api.write_key', 'Write key'), writeKey)}
                    </>
                )}

                {!hasKeys && (
                    <Text small={true}>{localizeWithFallback('wiredfurni.params.web_api.no_keys', 'The server creates the keys on the first save.')}</Text>
                )}

                <label className="flex items-center gap-1 cursor-pointer">
                    <input checked={writeEnabled} className="form-check-input" type="checkbox" onChange={(event) => setWriteEnabled(event.target.checked)} />
                    <Text>{localizeWithFallback('wiredfurni.params.web_api.allow_write', 'Allow writing with the write key')}</Text>
                </label>

                {hasKeys && (
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input checked={rotate} className="form-check-input" type="checkbox" onChange={(event) => setRotate(event.target.checked)} />
                        <Text>{localizeWithFallback('wiredfurni.params.web_api.rotate_keys', 'Issue a new pair on save (the old keys stop working)')}</Text>
                    </label>
                )}

                {!!docsLink && (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => OpenUrl(docsLink)}>
                        {localizeWithFallback('wiredfurni.params.web_api.link', 'API documentation')}
                    </button>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
