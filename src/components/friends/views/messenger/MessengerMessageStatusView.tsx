import { FC } from 'react';
import { FaCheck } from 'react-icons/fa';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const MessengerMessageStatusView: FC<{ isRead: boolean; className?: string }> = ({ isRead, className = '' }) =>
{
    return (
        <NativeTextTree>
            <span className={`messenger-message-status ${ isRead ? 'read' : 'sent' } ${ className }`.trim()} aria-label={isRead ? 'read' : 'sent'}>
                <FaCheck className="messenger-status-check first" aria-hidden="true" />
                {isRead && <FaCheck className="messenger-status-check second" aria-hidden="true" />}
            </span>
        </NativeTextTree>
    );
};
