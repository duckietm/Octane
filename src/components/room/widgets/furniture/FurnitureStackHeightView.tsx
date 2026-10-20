import { FurnitureStackHeightComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer, localizeWithFallback } from '../../../../api';
import { Button, Checkbox, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider, Text } from '../../../../common';
import { useFurnitureStackHeightWidget } from '../../../../hooks';
import { NumberInput } from '../../../../common/NumberInput';
import { Hint } from '../../../../common/Tooltip';

/**
 * Official `CustomStackHeightWidget` (`custom_stack_height_xml`): description, the move up / move down
 * arrows beside the slider and its input, "above stack" / "floor level", and for a walk tile the
 * multi-walk checkbox row.
 */
export const FurnitureStackHeightView: FC<{}> = (props) => {
    const { objectId = -1, height = 0, maxHeight = 40, isWalkHeightHelper = false, isWalkTile = false, multiWalk = false, onClose = null, updateHeight = null, moveAdjacent = null, setMultiWalk = null } = useFurnitureStackHeightWidget();
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
                <div className="flex items-center gap-2">
                    <div className="octane-stack-height-arrows flex flex-col gap-[2px]">
                        <Hint content={localizeWithFallback('widget.custom.height.move_up', 'Move up')}>
                            <Button
                                aria-label={localizeWithFallback('widget.custom.height.move_up', 'Move up')}
                                className="octane-stack-height-arrow"
                                onClick={() => moveAdjacent(false)}
                            >
                                <FaCaretUp />
                            </Button>
                        </Hint>
                        <Hint content={localizeWithFallback('widget.custom.height.move_down', 'Move down')}>
                            <Button
                                aria-label={localizeWithFallback('widget.custom.height.move_down', 'Move down')}
                                className="octane-stack-height-arrow"
                                onClick={() => moveAdjacent(true)}
                            >
                                <FaCaretDown />
                            </Button>
                        </Hint>
                    </div>
                    <Slider
                        className="grow"
                        max={maxHeight}
                        min={0}
                        renderThumbContent={(state) => state.valueNow}
                        step={0.01}
                        value={height}
                        onChange={(event) => updateHeight(event)}
                    />
                    <NumberInput className="show-number-arrows" max={maxHeight} min={0} style={{ width: 50 }} value={tempHeight} onChange={(event) => updateTempHeight(event.target.value)} />
                </div>
                <div className="flex gap-2">
                    <Button className="grow" onClick={(event) => SendMessageComposer(new FurnitureStackHeightComposer(objectId, -100))}>
                        {LocalizeText('furniture.above.stack')}
                    </Button>
                    <Button className="grow" onClick={(event) => SendMessageComposer(new FurnitureStackHeightComposer(objectId, 0))}>
                        {LocalizeText('furniture.floor.level')}
                    </Button>
                </div>
                {isWalkTile && (
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={multiWalk} onCheckedChange={(checked) => setMultiWalk(checked)} />
                        <Text>{localizeWithFallback('widget.custom.multiwalk_mode.text', 'Allow multiple users on this spot')}</Text>
                    </label>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
