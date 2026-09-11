import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurniturePlaceholderWidget } from '../../../../hooks';

/** `placeholder` (250x150): "This feature is not yet available!" over a bordered "Coming soon!". The official texts are literal. */
export const FurniturePlaceholderView: FC<{}> = (props) => {
    const { isVisible = false, onClose = null } = useFurniturePlaceholderWidget();

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-furni-placeholder" theme="primary-slim" uniqueKey="furni-placeholder">
            <OctaneCardHeaderView
                headerText={localizeWithFallback('widget.furni.placeholder.title', 'This feature is not yet available!')}
                onCloseClick={onClose}
            />
            <OctaneCardContentView>
                <div className="octane-furni-placeholder-body">{localizeWithFallback('widget.furni.placeholder.message', 'Coming soon!')}</div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
