import { FC } from 'react';
import { LocalizeText, localizeWithFallback, OpenUrl } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurnitureExchangeWidget } from '../../../../hooks';

/**
 * credit_redeem.xml (315x165, CreditFurniWidget.as): "Credits Exchange" frame with the
 * `widgets.furniture.credit.redeem.value` line, the underlined "Read more" link to
 * `widget.furni.info.url` (only when it is an http link) and the Cancel / Exchange buttons.
 */
export const FurnitureExchangeCreditView: FC<{}> = (props) => {
    const { objectId = -1, value = 0, onClose = null, redeem = null } = useFurnitureExchangeWidget();

    if (objectId === -1) return null;

    const infoUrl = localizeWithFallback('widget.furni.info.url', '');
    const hasInfoLink = infoUrl.indexOf('http') === 0;

    return (
        <OctaneCardView className="octane-widget-exchange-credit" isResizable={false} theme="primary-slim" uniqueKey="furniture-exchange-credit">
            <OctaneCardHeaderView headerText={LocalizeText('catalog.redeem.dialog.title')} onCloseClick={onClose} />
            <OctaneCardContentView classNames={['octane-widget-exchange-credit-content']} overflow="hidden">
                <p className="octane-widget-exchange-credit-text" data-testid="exchange-credit-text">
                    {localizeWithFallback(
                        'widgets.furniture.credit.redeem.value',
                        'This bag, bar or coin contains %value% Credits, you can redeem it now.',
                        ['value'],
                        [value.toString()]
                    )}
                </p>
                {hasInfoLink && (
                    <button className="octane-widget-exchange-credit-link" type="button" onClick={() => OpenUrl(infoUrl)}>
                        {localizeWithFallback('catelog.redeem.dialog.readmore.description', 'Read more')}
                    </button>
                )}
                <div className="octane-widget-exchange-credit-actions">
                    <Button variant="secondary" onClick={onClose}>
                        {LocalizeText('generic.cancel')}
                    </Button>
                    <Button variant="success" onClick={redeem}>
                        {LocalizeText('catalog.redeem.dialog.button.exchange')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
