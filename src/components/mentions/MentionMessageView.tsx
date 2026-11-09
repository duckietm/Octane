import { FC, Fragment } from 'react';
import { segmentMentionText } from '../../api/mentions/mentionSegments';

interface MentionMessageViewProps {
    text: string;
    ownUsername: string;
    className?: string;
}

/**
 * Renders a mention's message text as React nodes, wrapping every @user token
 * in a `.mention-tag` span (with the `.mention-tag--self` modifier when the
 * token targets the local user or a broadcast alias). Pure text segmentation
 * (no innerHTML) → no XSS risk from other users' chat content. Original spacing
 * is preserved verbatim.
 */
export const MentionMessageView: FC<MentionMessageViewProps> = (props) => {
    const { text, ownUsername, className } = props;

    if (!text) return <span className={className} />;

    const nodes = segmentMentionText(text, ownUsername).map((segment, index) =>
        segment.kind ? (
            <span key={index} className={segment.kind === 'self' ? 'mention-tag mention-tag--self' : 'mention-tag'}>
                {segment.text}
            </span>
        ) : (
            <Fragment key={index}>{segment.text}</Fragment>
        )
    );

    return <span className={className}>{nodes}</span>;
};
