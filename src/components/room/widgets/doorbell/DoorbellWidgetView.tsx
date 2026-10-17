import { FC, useState } from 'react';
import { localizeWithFallback, LocalizeText } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useDoorbellActions, useDoorbellState } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';
import { Hint } from '../../../../common/Tooltip';

/* Official doorbell: the information in red, then a list of 20 px rows, each with the name and two
   icon buttons, a green check to let the visitor in and a red cross to turn them away. */
export const DoorbellWidgetView: FC = () => {
    const users = useDoorbellState();
    const { answer } = useDoorbellActions();
    const [dismissed, setDismissed] = useState(false);

    const isVisible = !dismissed && users.length > 0;

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-widget-doorbell" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('widgets.doorbell.title', LocalizeText('navigator.doorbell.title'))} onCloseClick={() => setDismissed(true)} />
            <OctaneCardContentView gap={2} overflow="hidden">
                <div className="octane-doorbell-info">{localizeWithFallback('widgets.doorbell.info', 'These visitors are waiting at the door.')}</div>
                <div className="octane-doorbell-list">
                    {users.map((userName) => (
                        <div key={userName} className="octane-doorbell-row">
                            <span className="octane-doorbell-name">{userName}</span>
                            <Hint content={LocalizeText('generic.accept')}>
                                <BaseButton
                                    aria-label={`${LocalizeText('generic.accept')} ${userName}`}
                                    className="octane-doorbell-accept"
                                    type="button"
                                    onClick={() => answer(userName, true)}
                                >
                                    ✓
                                </BaseButton>
                            </Hint>
                            <Hint content={LocalizeText('generic.deny')}>
                                <BaseButton
                                    aria-label={`${LocalizeText('generic.deny')} ${userName}`}
                                    className="octane-doorbell-deny"
                                    type="button"
                                    onClick={() => answer(userName, false)}
                                >
                                    ✕
                                </BaseButton>
                            </Hint>
                        </div>
                    ))}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
