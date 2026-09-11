import { FurnitureAdjacentStackHeightComposer, FurnitureStackHeightComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider, Text } from '../../../../common';
import { useFurnitureStackHeightWidget } from '../../../../hooks';

/**
 * Official `CustomStackHeightWidget` (`custom_stack_height` layout, 320x210): the stacking helper
 * and, for the `tile_walkmagic*` items, the walking helper with the multi-walk checkbox
 * (`walktile_container`), plus the adjacent-height arrows (`button_move_up` / `button_move_down`)
 * that ask the server for the next height over composer 2687.
 */
export const FurnitureStackHeightView: FC<{}> = (props) => {
    const {
        objectId = -1,
        height = 0,
        maxHeight = 40,
        isWalkHeightHelper = false,
        isMultiWalkMode = false,
        onClose = null,
        updateHeight = null,
        updateMultiWalkMode = null
    } = useFurnitureStackHeightWidget();
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
                    <div className="flex flex-col gap-1 octane-stack-height-adjacent">
                        <Button
                            data-testid="stack-height-move-up"
                            title={localizeWithFallback('widget.custom.height.move_up', 'Move up')}
                            onClick={(event) => SendMessageComposer(new FurnitureAdjacentStackHeightComposer(objectId, false))}
                        >
                            {'▲'}
                        </Button>
                        <Button
                            data-testid="stack-height-move-down"
                            title={localizeWithFallback('widget.custom.height.move_down', 'Move down')}
                            onClick={(event) => SendMessageComposer(new FurnitureAdjacentStackHeightComposer(objectId, true))}
                        >
                            {'▼'}
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <Button onClick={(event) => SendMessageComposer(new FurnitureStackHeightComposer(objectId, -100))}>
                        {LocalizeText('furniture.above.stack')}
                    </Button>
                    <Button onClick={(event) => SendMessageComposer(new FurnitureStackHeightComposer(objectId, 0))}>
                        {LocalizeText('furniture.floor.level')}
                    </Button>
                </div>
                {isWalkHeightHelper && (
                    <label className="flex items-center gap-2 cursor-pointer octane-stack-height-multiwalk" data-testid="stack-height-multiwalk">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isMultiWalkMode}
                            onChange={(event) => updateMultiWalkMode(event.target.checked)}
                        />
                        <Text>{localizeWithFallback('widget.custom.multiwalk_mode.text', 'Allow multiple users on this location')}</Text>
                    </label>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
