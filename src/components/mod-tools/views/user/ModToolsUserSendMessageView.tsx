import { ModMessageMessageComposer } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { FaEnvelope, FaPaperPlane, FaUser } from 'react-icons/fa';
import { ISelectedUser, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useModTools, useNotification } from '../../../../hooks';
import { CONFIG_USER_MESSAGE_TEMPLATES, resolveMessageTemplates } from '../../common/ModToolsMessageTemplates';
import { ModToolsTemplateSelect } from '../../common/ModToolsTemplateSelect';

interface ModToolsUserSendMessageViewProps {
    user: ISelectedUser;
    /** Set when the window opens from an issue handler: the message is filed against that issue (SendMsgsCtrl). */
    issueId?: number;
    onCloseClick: () => void;
}

export const ModToolsUserSendMessageView: FC<ModToolsUserSendMessageViewProps> = (props) => {
    const { user = null, issueId = -1, onCloseClick = null } = props;
    const [message, setMessage] = useState('');
    const { simpleAlert = null } = useNotification();
    const { settings = null } = useModTools();
    // The official window fills its drop-down from the init message's `messageTemplates`.
    const templates = useMemo(() => resolveMessageTemplates(settings?.messageTemplates, CONFIG_USER_MESSAGE_TEMPLATES), [settings]);

    if (!user) return null;

    const trimmed = message.trim();
    const canSend = trimmed.length > 0;

    const sendMessage = () => {
        if (!canSend) {
            simpleAlert(
                localizeWithFallback('modtools.user.message.error.empty', 'You must input a message to the user'),
                null,
                null,
                null,
                localizeWithFallback('generic.alert', 'Alert'),
                null
            );
            return;
        }

        SendMessageComposer(new ModMessageMessageComposer(user.userId, message, -999, issueId));
        onCloseClick();
    };

    return (
        <OctaneCardView
            className="octane-mod-tools-user-message min-w-0 w-[min(420px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView headerText={LocalizeText('modtools.user.message.title')} onCloseClick={() => onCloseClick()} />
            <OctaneCardContentView className="text-black" gap={2}>
                {/* Recipient header */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100">
                    <FaEnvelope className="text-sky-600 shrink-0" size={16} />
                    <div className="flex flex-col grow min-w-0">
                        <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">{LocalizeText('modtools.user.message.recipient')}</div>
                        <div className="flex items-center gap-1.5 font-semibold leading-tight truncate">
                            <FaUser className="opacity-60" size={11} />
                            <span className="truncate">{user.username}</span>
                        </div>
                    </div>
                </div>

                {/* Canned templates, when the hotel provides any */}
                <ModToolsTemplateSelect templates={templates} onSelect={(template) => setMessage(template)} />

                {/* Body */}
                <div className="flex flex-col gap-1">
                    <label className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">{LocalizeText('modtools.user.message.label')}</label>
                    <textarea
                        autoFocus
                        className="min-h-[100px] px-2 py-1.5 rounded text-sm border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        placeholder={LocalizeText('modtools.user.message.placeholder')}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                    <div className="flex justify-between text-xs opacity-60">
                        <span>
                            {canSend
                                ? LocalizeText('modtools.user.message.chars', ['count'], [trimmed.length.toString()])
                                : LocalizeText('modtools.user.message.empty')}
                        </span>
                    </div>
                </div>

                <Button disabled={!canSend} fullWidth gap={1} variant="primary" onClick={sendMessage}>
                    <FaPaperPlane size={12} /> {LocalizeText('modtools.user.message.send')}
                </Button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
