import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFurnitureExchangeWidget } from '../../../../hooks';

export const FurnitureExchangeCreditView: FC<{}> = (props) => {
    const { objectId = -1, value = 0, onClose = null, redeem = null } = useFurnitureExchangeWidget();

    if (objectId === -1) return null;

    return (
        <OctaneCardView className="octane-widget-exchange-credit" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('catalog.redeem.dialog.title')} onCloseClick={onClose} />
            <OctaneCardContentView center>
                <div className="flex gap-2 overflow-hidden">
                    <div className="flex flex-col items-center justify-conent-center">
                        <div className="exchange-image" />
                    </div>
                    <div className="flex flex-col justify-between overflow-hidden grow!">
                        <Column gap={1} overflow="auto">
                            <Text fontWeight="bold">{LocalizeText('creditfurni.description', ['credits'], [value.toString()])}</Text>
                            <Text>{LocalizeText('creditfurni.prompt')}</Text>
                        </Column>
                        <Button variant="success" onClick={redeem}>
                            {LocalizeText('catalog.redeem.dialog.button.exchange')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
