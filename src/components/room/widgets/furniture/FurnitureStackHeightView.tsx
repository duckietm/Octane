import { FurnitureStackHeightComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider, Text } from '../../../../common';
import { useFurnitureStackHeightWidget } from '../../../../hooks';

export const FurnitureStackHeightView: FC<{}> = (props) => {
    const { objectId = -1, height = 0, maxHeight = 40, isWalkHeightHelper = false, onClose = null, updateHeight = null } = useFurnitureStackHeightWidget();
    const [tempHeight, setTempHeight] = useState('');
    const titleKey = isWalkHeightHelper ? 'widget.custom.walk.height.title' : 'widget.custom.stack.height.title';
    const textKey = isWalkHeightHelper ? 'widget.custom.walk.height.text' : 'widget.custom.stack.height.text';

    const updateTempHeight = (value: string) => {
        setTempHeight(value);

        const newValue = parseFloat(value);

        if (isNaN(newValue) || newValue === height) return;

        updateHeight(newValue);
    };

    useEffect(() => {
        setTempHeight(height.toString());
    }, [height]);

    if (objectId === -1) return null;

    return (
        <OctaneCardView className="octane-widget-custom-stack-height" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText(titleKey)} onCloseClick={onClose} />
            <OctaneCardContentView justifyContent="between">
                <Text>{LocalizeText(textKey)}</Text>
                <div className="flex gap-2">
                    <Slider
                        max={maxHeight}
                        min={0}
                        renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
                        step={0.01}
                        value={height}
                        onChange={(event) => updateHeight(event)}
                    />
                    <input
                        className="show-number-arrows"
                        max={maxHeight}
                        min={0}
                        style={{ width: 50 }}
                        type="number"
                        value={tempHeight}
                        onChange={(event) => updateTempHeight(event.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Button onClick={(event) => SendMessageComposer(new FurnitureStackHeightComposer(objectId, -100))}>
                        {LocalizeText('furniture.above.stack')}
                    </Button>
                    <Button onClick={(event) => SendMessageComposer(new FurnitureStackHeightComposer(objectId, 0))}>
                        {LocalizeText('furniture.floor.level')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
