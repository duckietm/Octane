import { FC } from 'react';

export interface LayoutChatStyleImageViewProps {
    styleId: number | string;
    className?: string;
}

/**
 * A chat bubble style drawn as the chat-style selector draws it: an empty bubble of that
 * style. AIR uses the same picture (chatStyleLibrary style preview) for chat_style catalog
 * products, the purchase confirmation and recycler rewards.
 */
export const LayoutChatStyleImageView: FC<LayoutChatStyleImageViewProps> = (props) => {
    const { styleId = 0, className = '' } = props;
    const id = Number(styleId);

    if (!Number.isFinite(id) || id < 0) return null;

    return (
        <span aria-hidden="true" className={`octane-chat-style-image bubble-container ${className}`.trim()} data-style-id={id}>
            <span className={`chat-bubble bubble-${id}`} />
        </span>
    );
};
