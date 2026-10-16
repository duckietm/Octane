import { WiredGenerateWebApiKeyComposer, WiredWebApiKeyResultEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import {
    buildWebApiBoxParams,
    canAllowBulkDelete,
    CopyToClipboard,
    expandLocalizedText,
    GetRoomSession,
    GetWebApiDocsUrl,
    IsOwnerOfFloorFurniture,
    localizeWithFallback,
    NotificationBubbleType,
    OpenUrl,
    parseWebApiBoxParams,
    SendMessageComposer,
    WiredFurniType
} from '../../../../api';
import { Button, Text } from '../../../../common';
import { useMessageEvent, useNotification, useWired } from '../../../../hooks';
import { useVariablesExplorerStore } from '../../../../state/variablesExplorer';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';

/** The server takes one key request per box every 2 s. */
const GENERATE_COOLDOWN_MS = 2000;

const localizeText = (key: string, fallback: string): string =>
    expandLocalizedText(localizeWithFallback(key, fallback), (nested) => localizeWithFallback(nested, '') || null);

/**
 * The keys are minted by the server (2819 / 59) and only shown here. Save sends back the keys the
 * box already holds, or an empty one to clear it; the server ignores anything else.
 */
export const WiredExtraVariableWebApiView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { showSingleBubble = null, showConfirm = null } = useNotification();
    const openExplorer = useVariablesExplorerStore((s) => s.open);
    const [readKey, setReadKey] = useState('');
    const [writeKey, setWriteKey] = useState('');
    const [bulkDelete, setBulkDelete] = useState(false);
    const [pendingKey, setPendingKey] = useState<'read' | 'write' | null>(null);
    const lastRequestAt = useRef(0);

    useEffect(() => {
        if (!trigger) return;

        const params = parseWebApiBoxParams(trigger.stringData, trigger.intData);

        setReadKey(params.readKey);
        setWriteKey(params.writeKey);
        setBulkDelete(params.bulkDelete);
        setPendingKey(null);
    }, [trigger]);

    useMessageEvent<WiredWebApiKeyResultEvent>(WiredWebApiKeyResultEvent, (event) => {
        const parser = event.getParser();

        if (!trigger || parser.itemId !== trigger.id) return;

        if (parser.isReadKey) setReadKey(parser.key ?? '');
        else setWriteKey(parser.key ?? '');

        setPendingKey(null);
    });

    const isOwner = !!trigger && IsOwnerOfFloorFurniture(trigger.id);

    const generate = (isReadKey: boolean) => {
        if (!trigger || !isOwner) return;

        const now = Date.now();

        if (now - lastRequestAt.current < GENERATE_COOLDOWN_MS) return;

        lastRequestAt.current = now;
        setPendingKey(isReadKey ? 'read' : 'write');
        SendMessageComposer(new WiredGenerateWebApiKeyComposer(trigger.id, isReadKey));
        window.setTimeout(() => setPendingKey((current) => (current === (isReadKey ? 'read' : 'write') ? null : current)), GENERATE_COOLDOWN_MS);
    };

    const clearKey = (isReadKey: boolean) => {
        if (isReadKey) {
            setReadKey('');
            return;
        }

        setWriteKey('');
        setBulkDelete(false);
    };

    const copyKey = async (key: string) => {
        if (!key || !(await CopyToClipboard(key))) return;

        showSingleBubble?.(localizeText('notification.wired.copied_api_key', 'Successfully copied API key to clipboard'), NotificationBubbleType.INFO);
    };

    const toggleBulkDelete = (checked: boolean) => {
        if (!checked) {
            setBulkDelete(false);
            return;
        }

        if (!canAllowBulkDelete(writeKey)) return;

        showConfirm(
            localizeText(
                'wiredfurni.params.web_api.permissions.bulk_delete.warning.desc',
                'Enabling this option is dangerous.\nAccidentally calling the "/variables/bulk-delete" endpoint irreversibly deletes all contents of variables.\n\nMake sure to test your application on test variables in a different room first.'
            ),
            () => setBulkDelete(true),
            null,
            null,
            null,
            localizeText('wiredfurni.params.web_api.permissions.bulk_delete.warning.title', 'Are you sure?')
        );
    };

    const save = () => {
        const params = buildWebApiBoxParams({ readKey, writeKey, bulkDelete });

        setStringParam(params.stringParam);
        setIntParams(params.intParams);
    };

    const keySection = (isReadKey: boolean) => {
        const key = isReadKey ? readKey : writeKey;
        const pending = pendingKey === (isReadKey ? 'read' : 'write');

        return (
            <div className="flex flex-col gap-1">
                <Text bold>
                    {isReadKey
                        ? localizeText('wiredfurni.params.web_api.read.title', 'API key for reading:')
                        : localizeText('wiredfurni.params.web_api.write.title', 'API key for writing:')}
                </Text>
                <input
                    aria-label={isReadKey ? 'Read key' : 'Write key'}
                    className="form-control form-control-sm font-mono"
                    readOnly
                    spellCheck={false}
                    type="text"
                    value={key}
                    onFocus={(event) => event.currentTarget.select()}
                />
                <div className="flex gap-1">
                    <Button disabled={!isOwner || pending} fullWidth variant="secondary" onClick={() => generate(isReadKey)}>
                        {key
                            ? localizeText('wiredfurni.params.web_api.regenerate', 'Regenerate')
                            : localizeText('wiredfurni.params.web_api.generate', 'Generate')}
                    </Button>
                    <Button disabled={!key} fullWidth variant="secondary" onClick={() => clearKey(isReadKey)}>
                        {localizeText('wiredfurni.params.web_api.clear', 'Clear')}
                    </Button>
                    <Button disabled={!key} fullWidth variant="secondary" onClick={() => void copyKey(key)}>
                        {localizeText('wiredfurni.params.web_api.copy', 'Copy')}
                    </Button>
                </div>
            </div>
        );
    };

    const docsUrl = GetWebApiDocsUrl();

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            widthModifier={1.4}
            footerCollapsible={false}
            footer={
                <div className="flex gap-1">
                    <Button disabled={!docsUrl} fullWidth variant="secondary" onClick={() => OpenUrl(docsUrl)}>
                        {localizeText('wiredfurni.params.web_api.link', 'Open API documentation')}
                    </Button>
                    <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => openExplorer({ roomId: GetRoomSession()?.roomId, readKey: readKey || undefined, writeKey: writeKey || undefined })}
                    >
                        {localizeText('wiredfurni.params.web_api.open_explorer', 'Open explorer')}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-2">
                <Text className="whitespace-pre-line">
                    {localizeText(
                        'wiredfurni.params.web_api.usage_info',
                        "Create API keys for reading and writing variables from dedicated HTTPS endpoints.\nNobody else can see the contents of this box, and you should not share these keys with anyone you don't trust.\n\nAfter changing variable configurations in the room, you may need to reload the room for the API to work properly."
                    )}
                </Text>
                <div className="octane-wired__divider" />
                {keySection(true)}
                <div className="octane-wired__divider" />
                {keySection(false)}
                <div className="octane-wired__divider" />
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeText('wiredfurni.params.web_api.permissions', 'Extra permissions:')}</Text>
                    <label className={`flex items-center gap-1 ${canAllowBulkDelete(writeKey) ? 'cursor-pointer' : 'opacity-60'}`}>
                        <Checkbox checked={bulkDelete && canAllowBulkDelete(writeKey)} disabled={!canAllowBulkDelete(writeKey)} onCheckedChange={(nextChecked) => toggleBulkDelete(nextChecked)} />
                        <Text>{localizeText('wiredfurni.params.web_api.permissions.bulk_delete', 'Allow mass deletion')}</Text>
                    </label>
                    <Text small className="text-[#6b6659]">
                        {localizeText(
                            'wiredfurni.params.web_api.permissions.bulk_delete.info',
                            'Enables access to the /variables/bulk-delete endpoint. Use with caution!'
                        )}
                    </Text>
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
