import {
    CfhSanctionMessageEvent,
    DefaultSanctionMessageComposer,
    GetConfiguration,
    ModAlertMessageComposer,
    ModBanMessageComposer,
    ModKickMessageComposer,
    ModMessageMessageComposer,
    ModMuteMessageComposer,
    ModTradingLockMessageComposer,
    ModeratorInitData
} from '@octane/renderer';
import { FC, useMemo, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, ModActionDefinition, SendMessageComposer } from '../../../api';
import { NativeText } from '../../../common/native-text/NativeText';
import { showModAlert, useMessageEvent, useModTools } from '../../../hooks';
import modActionXml from '../../../assets/mod-tools/xml/modact_summary.xml?raw';
import { Native100Dropmenu } from '../native/NativeDropmenu100';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Button, Native0Dropmenu, Native0Frame, Native0Input, Native0Text } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { ModConfirmView } from './ModConfirmView';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const FRAME_COLOR = 0x418db0;

// AIR ModActionCtrl sanction table. The id of a ban is the ban type the server reads (3, 4, 5, 7, 6 or 106); a trade lock carries its length in hours.
const SANCTIONS: ModActionDefinition[] = [
    new ModActionDefinition(1, 'Alert', ModActionDefinition.ALERT, 1, 0),
    new ModActionDefinition(2, 'Mute 1h', ModActionDefinition.MUTE, 2, 0),
    new ModActionDefinition(3, 'Ban 18h', ModActionDefinition.BAN, 3, 0),
    new ModActionDefinition(4, 'Ban 7 days', ModActionDefinition.BAN, 4, 0),
    new ModActionDefinition(5, 'Ban 30 days (step 1)', ModActionDefinition.BAN, 5, 0),
    new ModActionDefinition(7, 'Ban 30 days (step 2)', ModActionDefinition.BAN, 7, 0),
    new ModActionDefinition(6, 'Ban 100 years', ModActionDefinition.BAN, 6, 0),
    new ModActionDefinition(106, 'Ban avatar-only 100 years', ModActionDefinition.BAN, 6, 0),
    new ModActionDefinition(101, 'Kick', ModActionDefinition.KICK, 0, 0),
    new ModActionDefinition(102, 'Lock trade 1 week', ModActionDefinition.TRADE_LOCK, 0, 168),
    new ModActionDefinition(104, 'Lock trade permanent', ModActionDefinition.TRADE_LOCK, 0, 876000),
    new ModActionDefinition(105, 'Message', ModActionDefinition.MESSAGE, 0, 0)
];

// Ban, kick, mute and trade lock cannot be undone from this window, and the window shows one user while another may be selected behind it: a confirmation
// names who and what before anything leaves the client.
const NEEDS_CONFIRMATION = [ModActionDefinition.BAN, ModActionDefinition.KICK, ModActionDefinition.MUTE, ModActionDefinition.TRADE_LOCK];

// `cfh.topic_id.to.sanction_type_id`: "topic=sanction" pairs, key 0 being the fallback.
const readTopicSanctionMap = (): Map<number, number> => {
    const result = new Map<number, number>();
    const value = GetConfiguration().getValue<string>('cfh.topic_id.to.sanction_type_id', '') ?? '';

    for (const pair of value.split(',')) {
        const parts = pair.split('=');

        if (parts.length !== 2) continue;

        const topic = Number.parseInt(parts[0], 10);
        const sanction = Number.parseInt(parts[1], 10);

        if (!Number.isNaN(topic) && !Number.isNaN(sanction)) result.set(topic, sanction);
    }

    return result;
};

const formatSanctionTime = (at: number) => {
    try {
        return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

export interface ModActionProps {
    userId: number;
    userName: string;
    settings: ModeratorInitData;
    x: number;
    y: number;
    onClose: () => void;
}

// Classic v75 mod action window (modact_summary): a CFH topic and a sanction type (picking a topic selects the sanction type configured for it), an optional
// message, "Default sanction" and "Custom sanction" (the chosen type, checked against the moderator's permissions). Either one sends the sanction and closes the
// window. Kept from the earlier mod action window: an empty message falls back to the topic's text, a template menu fills the message, the irreversible sanctions
// ask for confirmation first and what this moderator already applied to the user this session is listed under the buttons.
export const ModActionView: FC<ModActionProps> = ({ userId, userName, settings, x, y, onClose }) => {
    const root = useMemo(() => parseNativeLayout(modActionXml), []);
    const topicMenu = rectOf(findNativeNode(root, 'cfh_topics'));
    const sanctionMenu = rectOf(findNativeNode(root, 'sanction_type'));
    const info = rectOf(findNativeNode(root, 'message_info'));
    const input = rectOf(findNativeNode(root, 'message_input'));
    const defaultButton = findNativeNode(root, 'default_sanction_button');
    const customButton = findNativeNode(root, 'custom_sanction_button');
    const label = rectOf(findNativeNode(root, 'default_sanction_label'));
    const { cfhCategories = [], sanctionLog = null, recordSanction = null } = useModTools();
    const topics = useMemo(() => cfhCategories.flatMap((category) => category.topics ?? []), [cfhCategories]);
    const topicMap = useMemo(readTopicSanctionMap, []);
    const [topicIndex, setTopicIndex] = useState(-1);
    const [sanctionIndex, setSanctionIndex] = useState(-1);
    const [message, setMessage] = useState('');
    const [inputActive, setInputActive] = useState(false);
    const [defaultLabel, setDefaultLabel] = useState(nativeCaption(findNativeNode(root, 'default_sanction_label')));
    const [pending, setPending] = useState<ModActionDefinition>(null);
    // the window is disposed by its first send: a second click before it is gone must not send again
    const sentRef = useRef(false);
    const templates = settings?.messageTemplates ?? [];
    const applied = sanctionLog?.[userId] ?? [];

    // the default sanction for this user arrives as "<name>[ (avatar) ]<length> & <trade lock> & <machine ban>"
    useMessageEvent<CfhSanctionMessageEvent>(CfhSanctionMessageEvent, (event) => {
        const parser = event.getParser();
        const sanction = parser?.sanctionType;

        if (!sanction || parser.accountId !== userId || parser.issueId > 0) return;

        let text = `${sanction.name}${sanction.avatarOnly ? ' (avatar) ' : ' '}`;

        text += sanction.sanctionLengthInHours > 24 ? `${sanction.sanctionLengthInHours / 24} days` : `${sanction.sanctionLengthInHours}h`;

        if (sanction.tradeLockInfo) text += ` & ${sanction.tradeLockInfo}`;
        if (sanction.machineBanInfo) text += ` & ${sanction.machineBanInfo}`;

        setDefaultLabel(text);
    });

    const topicNames = topics.map((topic) => LocalizeText(`help.cfh.topic.${topic.id}`));

    const selectTopic = (index: number) => {
        const topicId = topics[index]?.id ?? 0;
        let sanctionId = topicMap.get(topicId) ?? 0;

        if (!sanctionId) sanctionId = topicMap.get(0) ?? 0;

        setTopicIndex(index);

        if (sanctionId) setSanctionIndex(SANCTIONS.findIndex((sanction) => sanction.actionId === sanctionId));
    };

    // an empty message falls back to the text of the chosen topic
    const messageOrDefault = (topicId: number) => (message.trim().length === 0 ? LocalizeText(`help.cfh.topic.${topicId}`) : message);

    const onDefault = () => {
        if (sentRef.current) return;

        if (topicIndex < 0) {
            showModAlert('Please select a topic.');

            return;
        }

        const topicId = topics[topicIndex].id;

        sentRef.current = true;
        SendMessageComposer(new DefaultSanctionMessageComposer(userId, topicId, messageOrDefault(topicId)));
        onClose();
    };

    const send = (sanction: ModActionDefinition) => {
        if (sentRef.current) return;

        const topicId = topics[topicIndex].id;
        const text = messageOrDefault(topicId);
        const denied = () => showModAlert('You have insufficient permissions.');

        switch (sanction.actionType) {
            case ModActionDefinition.ALERT:
                if (!settings.alertPermission) return denied();

                SendMessageComposer(new ModAlertMessageComposer(userId, text, topicId));
                break;
            case ModActionDefinition.MUTE:
                SendMessageComposer(new ModMuteMessageComposer(userId, text, topicId));
                break;
            case ModActionDefinition.BAN:
                if (!settings.banPermission) return denied();

                SendMessageComposer(new ModBanMessageComposer(userId, text, topicId, sanction.actionId, sanction.actionId === 106));
                break;
            case ModActionDefinition.KICK:
                if (!settings.kickPermission) return denied();

                SendMessageComposer(new ModKickMessageComposer(userId, text, topicId));
                break;
            case ModActionDefinition.TRADE_LOCK:
                SendMessageComposer(new ModTradingLockMessageComposer(userId, text, sanction.actionLengthHours * 60, topicId));
                break;
            case ModActionDefinition.MESSAGE:
                if (message.trim().length === 0) {
                    showModAlert('Please write a message to user.');

                    return;
                }

                SendMessageComposer(new ModMessageMessageComposer(userId, message, topicId));
                break;
        }

        sentRef.current = true;
        recordSanction?.(userId, sanction.name);
        onClose();
    };

    const onCustom = () => {
        if (sentRef.current) return;

        if (topicIndex < 0) {
            showModAlert('Please select a topic.');

            return;
        }

        if (sanctionIndex < 0) {
            showModAlert('Please select a sanction.');

            return;
        }

        if (!settings?.cfhPermission) {
            showModAlert('You have insufficient permissions.');

            return;
        }

        const sanction = SANCTIONS[sanctionIndex];

        if (NEEDS_CONFIRMATION.includes(sanction.actionType)) {
            setPending(sanction);

            return;
        }

        send(sanction);
    };

    const custom = rectOf(customButton);

    return (
        <>
        <NativeWindowShell type="modAction" windowKey={userName} x={x} y={y}>
            <Native0Frame caption={`Mod action on: ${userName}`} height={nativeNumber(root, 'height')} width={nativeNumber(root, 'width')} onClose={onClose}>
                <div style={{ position: 'absolute', left: info.x, top: info.y, width: info.width, height: info.height, fontSize: 0, lineHeight: 0 }}>
                    <NativeText background={FRAME_COLOR} maxWidth={info.width} overrides={{ color: 0xffffff, size: 11 }} text={nativeCaption(findNativeNode(root, 'message_info'))} textStyle="u_regular" />
                </div>
                <Native0Input active={inputActive} height={input.height} value={message} width={input.width} x={input.x} y={input.y} onChange={setMessage} onFocus={() => setInputActive(true)} />
                <Native0Button enabled={topicIndex >= 0} height={21} label={nativeCaption(defaultButton)} width={100} x={nativeNumber(defaultButton, 'x')} y={nativeNumber(defaultButton, 'y')} onClick={onDefault} />
                <div style={{ position: 'absolute', left: label.x, top: label.y, width: label.width, height: label.height, fontSize: 0, lineHeight: 0 }}>
                    <NativeText background={FRAME_COLOR} maxWidth={label.width} overrides={{ color: 0xffffff, size: 11 }} text={defaultLabel} textStyle="u_regular" />
                </div>
                <Native0Button height={21} label={nativeCaption(customButton)} width={100} x={custom.x} y={custom.y} onClick={onCustom} />
                {applied.length > 0 && (
                    <>
                        <Native0Text bold color={0xffffff} text={localizeWithFallback('modtools.native.applied', 'Applied this session:')} width={320} x={custom.x} y={custom.y + 27} />
                        {applied.slice(-2).map((entry, index) => (
                            <Native0Text key={index} color={0xffffff} text={`${formatSanctionTime(entry.at)}  ${entry.label}`} width={320} x={custom.x} y={custom.y + 37 + index * 10} />
                        ))}
                    </>
                )}
                {templates.length > 0 && (
                    <Native0Dropmenu
                        caption="Select from message templates"
                        height={20}
                        items={templates.map((template) => (template.length > 50 ? `${template.slice(0, 47)}...` : template))}
                        width={210}
                        x={custom.x + 110}
                        y={custom.y}
                        onSelect={(index) => {
                            setMessage(templates[index]);
                            setInputActive(true);
                        }}
                    />
                )}
                <Native100Dropmenu
                    caption={sanctionIndex >= 0 ? SANCTIONS[sanctionIndex].name : nativeCaption(findNativeNode(root, 'sanction_type'))}
                    height={sanctionMenu.height}
                    items={SANCTIONS.map((sanction) => sanction.name)}
                    selectedIndex={sanctionIndex}
                    width={sanctionMenu.width}
                    x={sanctionMenu.x}
                    y={sanctionMenu.y}
                    onSelect={(index) => {
                        setSanctionIndex(index);
                    }}
                />
                <Native100Dropmenu
                    caption={topicIndex >= 0 ? topicNames[topicIndex] : nativeCaption(findNativeNode(root, 'cfh_topics'))}
                    height={topicMenu.height}
                    items={topicNames}
                    selectedIndex={topicIndex}
                    width={topicMenu.width}
                    x={topicMenu.x}
                    y={topicMenu.y}
                    onSelect={selectTopic}
                />
            </Native0Frame>
        </NativeWindowShell>
            {pending && (
                <ModConfirmView
                    cancelLabel={LocalizeText('generic.cancel')}
                    confirmLabel={localizeWithFallback('modtools.native.confirm.apply', 'Apply')}
                    message={localizeWithFallback('modtools.native.confirm.body', `${pending.name}: ${userName}`, ['sanction', 'username'], [pending.name, userName])}
                    title={localizeWithFallback('modtools.native.confirm.title', 'Confirm')}
                    onCancel={() => setPending(null)}
                    onConfirm={() => {
                        const sanction = pending;

                        setPending(null);
                        send(sanction);
                    }}
                />
            )}
        </>
    );
};
