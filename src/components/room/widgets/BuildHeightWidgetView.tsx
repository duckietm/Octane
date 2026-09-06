import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Button, Column, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider, Text } from '../../../common';
import { useBuildHeight } from '../../../hooks';

const STEP = 0.1;

const format = (value: number) => (Number.isInteger(value) ? value.toString() : value.toFixed(1));

export const BuildHeightWidgetView: FC<{}> = () => {
    const { available, minHeight, maxHeight, isOpen, height, applyHeight, close } = useBuildHeight();

    if (!available || !isOpen) return null;

    const clamp = (value: number) => Math.min(maxHeight, Math.max(minHeight, Math.round(value / STEP) * STEP));

    return (
        <OctaneCardView className="octane-build-height-widget" theme="primary-slim" uniqueKey="build-height">
            <OctaneCardHeaderView headerText={LocalizeText('widget.buildheight.title')} onCloseClick={close} />
            <OctaneCardContentView className="gap-2">
                <Text center>{LocalizeText('widget.buildheight.description')}</Text>
                <Flex alignItems="center" justifyContent="center" gap={2}>
                    <Button variant="secondary" onClick={() => applyHeight(clamp(height - STEP))}>-</Button>
                    <Text bold variant="black" className="build-height-value">{format(height)}</Text>
                    <Button variant="secondary" onClick={() => applyHeight(clamp(height + STEP))}>+</Button>
                </Flex>
                <Slider
                    min={minHeight}
                    max={maxHeight}
                    step={STEP}
                    value={height}
                    onChange={(value: number) => applyHeight(clamp(value))}
                />
                <Column gap={1}>
                    <Flex justifyContent="between">
                        <Text small>{format(minHeight)}</Text>
                        <Text small>{format(maxHeight)}</Text>
                    </Flex>
                    <Button variant="danger" onClick={close}>{LocalizeText('widget.buildheight.reset')}</Button>
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
