import { FC } from 'react';
import chatStyleBackgroundSrc from '../../../../../assets/images/catalog/air/catalogue-chatstyle-background.png';
import { LayoutChatStyleImageView } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../hooks';

interface CatalogAddOnChatStyleWidgetViewProps {
    className?: string;
}

/**
 * AIR ProductViewCatalogWidget -> HabboCatalogUtils.showExtraOnProduct(CHAT_STYLE): a chat
 * style sold together with other products is shown on `catalogue_chatstyle_background`
 * next to the preview, where a bundled badge would be. A badge takes precedence.
 */
export const CatalogAddOnChatStyleWidgetView: FC<CatalogAddOnChatStyleWidgetViewProps> = (props) => {
    const { className = '' } = props;
    const { currentOffer = null } = useCatalogData();

    if (!currentOffer || currentOffer.badgeCode?.length || !currentOffer.chatStyleId?.length) return null;

    return (
        <NativeTextTree>
            <div className={`octane-catalog-addon-chat-style ${className}`.trim()}>
                <img alt="" className="octane-catalog-addon-chat-style-background" draggable={false} src={chatStyleBackgroundSrc} />
                <LayoutChatStyleImageView styleId={currentOffer.chatStyleId} />
            </div>
        </NativeTextTree>
    );
};
