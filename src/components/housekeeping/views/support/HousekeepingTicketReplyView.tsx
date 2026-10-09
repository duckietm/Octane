import { CloseIssuesMessageComposer, IssueMessageData, ModMessageMessageComposer } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { FaReply } from 'react-icons/fa';
import { getHousekeepingTicketReplies, LocalizeText, localizeTicketReply, SendMessageComposer } from '../../../../api';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton } from '../common/HousekeepingParts';

const REPLY_MAX = 500;

/**
 * An answer to the reporter through the mod tools message, tied to the ticket: a canned reply
 * fills the text, which stays editable. Optionally the ticket closes as resolved with it.
 */
export const HousekeepingTicketReplyView: FC<{ ticket: IssueMessageData }> = ({ ticket }) => {
    const replies = useMemo(() => getHousekeepingTicketReplies(), []);
    const [text, setText] = useState('');
    const [closeAfter, setCloseAfter] = useState(true);
    const [sent, setSent] = useState(false);
    const trimmed = text.trim();

    const send = () => {
        SendMessageComposer(new ModMessageMessageComposer(ticket.reporterUserId, trimmed, ticket.categoryId, ticket.issueId));

        if (closeAfter) SendMessageComposer(new CloseIssuesMessageComposer([ticket.issueId], CloseIssuesMessageComposer.RESOLUTION_RESOLVED));

        setText('');
        setSent(true);
    };

    return (
        <div className="flex flex-col gap-1 rounded border border-sky-200 bg-sky-50/40 p-1.5">
            <div className="flex items-center gap-1.5">
                <FaReply className="shrink-0 text-sky-600" size={9} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                    {LocalizeText('housekeeping.support.reply.label', ['user'], [ticket.reporterUserName])}
                </span>
                <select
                    className="ml-auto rounded border border-zinc-300 bg-white px-1 py-0.5 text-[11px]"
                    value=""
                    onChange={(event) => {
                        const reply = replies.find((entry) => entry.id === event.target.value);

                        if (reply) setText(localizeTicketReply(reply));
                    }}
                >
                    <option value="">{LocalizeText('housekeeping.support.reply.canned')}</option>
                    {replies.map((reply) => (
                        <option key={reply.id} value={reply.id}>
                            {localizeTicketReply(reply)}
                        </option>
                    ))}
                </select>
            </div>
            <textarea
                className={`${HOUSEKEEPING_INPUT_CLASS} min-h-[48px] resize-y`}
                maxLength={REPLY_MAX}
                placeholder={LocalizeText('housekeeping.support.reply.placeholder')}
                value={text}
                onChange={(event) => {
                    setText(event.target.value);
                    setSent(false);
                }}
            />
            <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1 text-[10px] text-zinc-600">
                    <input checked={closeAfter} type="checkbox" onChange={(event) => setCloseAfter(event.target.checked)} />
                    {LocalizeText('housekeeping.support.reply.close_after')}
                </label>
                {sent && <span className="text-[10px] text-emerald-700">{LocalizeText('housekeeping.support.reply.sent')}</span>}
                <HousekeepingButton classNames={['ml-auto']} disabled={!trimmed} gap={1} size="sm" variant="primary" onClick={send}>
                    <FaReply size={9} />
                    <span>{LocalizeText('housekeeping.support.reply.send')}</span>
                </HousekeepingButton>
            </div>
        </div>
    );
};
