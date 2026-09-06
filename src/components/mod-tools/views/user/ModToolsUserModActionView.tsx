import {
    CallForHelpTopicData,
    DefaultSanctionMessageComposer,
    ModAlertMessageComposer,
    ModBanMessageComposer,
    ModKickMessageComposer,
    ModMessageMessageComposer,
    ModMuteMessageComposer,
    ModTradingLockMessageComposer
} from '@octane/renderer';
import { FC, useMemo, useRef, useState } from 'react';
import { FaBan, FaBolt, FaEnvelope, FaExclamationTriangle, FaGavel, FaHistory, FaUserSlash, FaVolumeMute } from 'react-icons/fa';
import { ISelectedUser, LocalizeText, ModActionDefinition, NotificationAlertType, SendMessageComposer } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useModTools, useNotification } from '../../../../hooks';

interface ModToolsUserModActionViewProps {
    user: ISelectedUser;
    onCloseClick: () => void;
}

const MOD_ACTION_DEFINITIONS = [
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

const ACTION_ICONS: Record<number, React.ReactNode> = {
    [ModActionDefinition.ALERT]: <FaExclamationTriangle size={10} />,
    [ModActionDefinition.MUTE]: <FaVolumeMute size={10} />,
    [ModActionDefinition.BAN]: <FaBan size={10} />,
    [ModActionDefinition.KICK]: <FaUserSlash size={10} />,
    [ModActionDefinition.TRADE_LOCK]: <FaGavel size={10} />,
    [ModActionDefinition.MESSAGE]: <FaEnvelope size={10} />
};

const ACTION_TONE: Record<number, string> = {
    [ModActionDefinition.ALERT]: 'bg-amber-100 text-amber-800 border-amber-200',
    [ModActionDefinition.MUTE]: 'bg-sky-100 text-sky-800 border-sky-200',
    [ModActionDefinition.BAN]: 'bg-rose-100 text-rose-800 border-rose-200',
    [ModActionDefinition.KICK]: 'bg-orange-100 text-orange-800 border-orange-200',
    [ModActionDefinition.TRADE_LOCK]: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    [ModActionDefinition.MESSAGE]: 'bg-zinc-100 text-zinc-800 border-zinc-200'
};

const formatSanctionTime = (at: number) => {
    try {
        return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

export const ModToolsUserModActionView: FC<ModToolsUserModActionViewProps> = (props) => {
    const { user = null, onCloseClick = null } = props;
    const [selectedTopic, setSelectedTopic] = useState(-1);
    const [selectedAction, setSelectedAction] = useState(-1);
    const [message, setMessage] = useState<string>('');
    const [pendingSanction, setPendingSanction] = useState<ModActionDefinition>(null);
    const { cfhCategories = null, settings = null, sanctionLog = null, recordSanction = null } = useModTools();
    const { simpleAlert = null } = useNotification();
    const isSendingRef = useRef<boolean>(false);
    const appliedThisSession = sanctionLog?.[user?.userId] ?? [];

    const topics = useMemo(() => {
        const values: CallForHelpTopicData[] = [];

        if (cfhCategories && cfhCategories.length) {
            for (const category of cfhCategories) {
                for (const topic of category.topics) values.push(topic);
            }
        }

        return values;
    }, [cfhCategories]);

    const sendAlert = (m: string) => simpleAlert(m, NotificationAlertType.DEFAULT, null, null, 'Error');

    const sendDefaultSanction = () => {
        if (isSendingRef.current) return;

        if (selectedTopic === -1) return sendAlert(LocalizeText('modtools.user.modaction.error.no.topic'));

        const category = topics[selectedTopic];

        if (!category) return sendAlert(LocalizeText('modtools.user.modaction.error.no.topic'));

        const messageOrDefault = message.trim().length === 0 ? LocalizeText(`help.cfh.topic.${category.id}`) : message;

        isSendingRef.current = true;
        SendMessageComposer(new DefaultSanctionMessageComposer(user.userId, category.id, messageOrDefault));
        onCloseClick();
    };

    // Ban, kick, mute and trade lock cannot be undone from this window, and the panel
    // shows one user while another may be selected behind it. The confirmation names
    // who and what before anything leaves the client.
    const NEEDS_CONFIRMATION = [
        ModActionDefinition.BAN,
        ModActionDefinition.KICK,
        ModActionDefinition.MUTE,
        ModActionDefinition.TRADE_LOCK
    ];

    const requestSanction = () => {
        const sanction = MOD_ACTION_DEFINITIONS[selectedAction];

        if (sanction && NEEDS_CONFIRMATION.includes(sanction.actionType)) {
            setPendingSanction(sanction);
            return;
        }

        sendSanction();
    };

    const sendSanction = () => {
        if (isSendingRef.current) return;

        let errorMessage: string = null;
        const category = topics[selectedTopic];
        const sanction = MOD_ACTION_DEFINITIONS[selectedAction];

        if (selectedTopic === -1 || selectedAction === -1) errorMessage = LocalizeText('modtools.user.modaction.error.no.action');
        else if (!settings || !settings.cfhPermission) errorMessage = LocalizeText('modtools.user.modaction.error.no.permission');
        else if (!category) errorMessage = LocalizeText('modtools.user.modaction.error.no.topic');
        else if (!sanction) errorMessage = LocalizeText('modtools.user.modaction.error.no.action');

        if (errorMessage) return sendAlert(errorMessage);

        const messageOrDefault = message.trim().length === 0 ? LocalizeText(`help.cfh.topic.${category.id}`) : message;

        recordSanction?.(user.userId, sanction.name);

        switch (sanction.actionType) {
            case ModActionDefinition.ALERT: {
                if (!settings.alertPermission) return sendAlert(LocalizeText('modtools.user.modaction.error.no.permission.alert'));
                SendMessageComposer(new ModAlertMessageComposer(user.userId, messageOrDefault, category.id));
                break;
            }
            case ModActionDefinition.MUTE:
                SendMessageComposer(new ModMuteMessageComposer(user.userId, messageOrDefault, category.id));
                break;
            case ModActionDefinition.BAN: {
                if (!settings.banPermission) return sendAlert(LocalizeText('modtools.user.modaction.error.no.permission.alert'));
                SendMessageComposer(new ModBanMessageComposer(user.userId, messageOrDefault, category.id, selectedAction, sanction.actionId === 106));
                break;
            }
            case ModActionDefinition.KICK: {
                if (!settings.kickPermission) return sendAlert(LocalizeText('modtools.user.modaction.error.no.permission.alert'));
                SendMessageComposer(new ModKickMessageComposer(user.userId, messageOrDefault, category.id));
                break;
            }
            case ModActionDefinition.TRADE_LOCK: {
                const numSeconds = sanction.actionLengthHours * 60;
                SendMessageComposer(new ModTradingLockMessageComposer(user.userId, messageOrDefault, numSeconds, category.id));
                break;
            }
            case ModActionDefinition.MESSAGE: {
                if (message.trim().length === 0) return sendAlert(LocalizeText('modtools.user.modaction.error.no.message'));
                SendMessageComposer(new ModMessageMessageComposer(user.userId, message, category.id));
                break;
            }
        }

        isSendingRef.current = true;
        onCloseClick();
    };

    if (!user) return null;

    const selectedSanction = selectedAction >= 0 ? MOD_ACTION_DEFINITIONS[selectedAction] : null;
    const selectedTopicName = selectedTopic >= 0 && topics[selectedTopic] ? LocalizeText('help.cfh.topic.' + topics[selectedTopic].id) : null;
    const sanctionTone = selectedSanction ? ACTION_TONE[selectedSanction.actionType] : '';
    const sanctionIcon = selectedSanction ? ACTION_ICONS[selectedSanction.actionType] : null;
    const canSubmit = selectedTopic !== -1;

    return (
        <OctaneCardView
            className="octane-mod-tools-user-action min-w-0 w-[min(460px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView
                headerText={LocalizeText('modtools.user.modaction.title', ['username'], [user.username])}
                onCloseClick={() => onCloseClick()}
            />
            <OctaneCardContentView className="text-black relative" gap={2}>
                {/* Target header */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-rose-50 to-transparent rounded p-2 border border-rose-100">
                    <FaGavel className="text-rose-600 shrink-0" size={16} />
                    <div className="flex flex-col grow min-w-0">
                        <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">
                            {LocalizeText('modtools.user.modaction.sanctioning')}
                        </div>
                        <div className="font-semibold leading-tight truncate">{user.username}</div>
                    </div>
                </div>

                {/* CFH topic */}
                <div className="flex flex-col gap-1">
                    <label className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">
                        {LocalizeText('modtools.user.modaction.step.topic')}
                    </label>
                    <select className="form-select form-select-sm" value={selectedTopic} onChange={(event) => setSelectedTopic(parseInt(event.target.value))}>
                        <option disabled value={-1}>
                            {LocalizeText('modtools.user.modaction.step.topic.placeholder')}
                        </option>
                        {topics.map((topic, index) => (
                            <option key={index} value={index}>
                                {LocalizeText('help.cfh.topic.' + topic.id)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sanction type */}
                <div className="flex flex-col gap-1">
                    <label className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">
                        {LocalizeText('modtools.user.modaction.step.sanction')}
                    </label>
                    <select className="form-select form-select-sm" value={selectedAction} onChange={(event) => setSelectedAction(parseInt(event.target.value))}>
                        <option disabled value={-1}>
                            {LocalizeText('modtools.user.modaction.step.sanction.placeholder')}
                        </option>
                        {MOD_ACTION_DEFINITIONS.map((action, index) => (
                            <option key={index} value={index}>
                                {action.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1">
                    <label className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">
                        {LocalizeText('modtools.user.modaction.step.message')}{' '}
                        <span className="opacity-50 normal-case font-normal">{LocalizeText('modtools.user.modaction.step.message.optional')}</span>
                    </label>
                    <textarea
                        className="min-h-[60px] px-2 py-1.5 rounded text-sm border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        placeholder={LocalizeText('modtools.user.modaction.message.placeholder')}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                </div>

                {/* Preview */}
                {(selectedSanction || selectedTopicName) && (
                    <div className="flex flex-col gap-1 bg-zinc-50 border border-zinc-200 rounded p-2">
                        <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">{LocalizeText('modtools.user.modaction.preview')}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {selectedTopicName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-white border-zinc-200">
                                    {selectedTopicName}
                                </span>
                            )}
                            {selectedSanction && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sanctionTone}`}>
                                    {sanctionIcon} {selectedSanction.name}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* What this moderator has already applied to this person, this session */}
                {!!appliedThisSession.length && (
                    <div className="flex flex-col gap-0.5 rounded border border-amber-200 bg-amber-50/60 p-1.5">
                        <span className="text-[.6rem] uppercase tracking-wide font-semibold opacity-70">
                            {LocalizeText('modtools.user.modaction.button.apply')}
                        </span>
                        {appliedThisSession.slice(-3).map((entry, index) => (
                            <span key={index} className="text-[.65rem] flex items-center gap-1">
                                <FaHistory className="opacity-50 shrink-0" size={8} />
                                <strong className="truncate">{entry.label}</strong>
                                <span className="opacity-60 tabular-nums shrink-0">{formatSanctionTime(entry.at)}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-1.5 pt-1 border-t border-zinc-200">
                    <Button className="grow" disabled={!canSubmit} gap={1} variant="primary" onClick={sendDefaultSanction}>
                        <FaBolt size={12} /> {LocalizeText('modtools.user.modaction.button.default')}
                    </Button>
                    <Button className="grow" disabled={!canSubmit || selectedAction === -1} gap={1} variant="success" onClick={requestSanction}>
                        <FaGavel size={12} /> {LocalizeText('modtools.user.modaction.button.apply')}
                    </Button>
                </div>
                {pendingSanction && (
                    <div
                        aria-label="Confirm moderation action"
                        aria-modal="true"
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/95 p-3 text-center"
                        role="dialog"
                    >
                        <FaExclamationTriangle className="text-amber-500" size={20} />
                        <div className="text-sm">
                            <strong>{pendingSanction.name}</strong>
                            <div className="opacity-70">{user?.username}</div>
                        </div>
                        <div className="flex gap-1.5">
                            <Button variant="secondary" onClick={() => setPendingSanction(null)}>
                                {LocalizeText('generic.cancel')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setPendingSanction(null);
                                    sendSanction();
                                }}
                            >
                                {LocalizeText('modtools.user.modaction.button.apply')}
                            </Button>
                        </div>
                    </div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
