import { RoomEngineTriggerWidgetEvent } from '@octane/renderer';
import { CSSProperties, FC, KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ColorUtils, FurnitureDimmerUtilities, GetConfigurationValue, LocalizeText } from '../../../../api';
import colorButton from '../../../../assets/images/room-widgets/dimmer-widget/air-color_button.png';
import colorFrame from '../../../../assets/images/room-widgets/dimmer-widget/air-color_frame.png';
import colorSelected from '../../../../assets/images/room-widgets/dimmer-widget/air-color_selected.png';
import offImage from '../../../../assets/images/room-widgets/dimmer-widget/air-info.png';
import sliderBase from '../../../../assets/images/room-widgets/dimmer-widget/air-slider_base.png';
import sliderButton from '../../../../assets/images/room-widgets/dimmer-widget/air-slider_button.png';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView, Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useFurnitureDimmerWidget, useOctaneEvent } from '../../../../hooks';
import '../../../../css/room/FurniWindowsAAir.css';

// AIR dimmer_ui: the brightness slider_movement_area is 206 wide and its 12 px slider_button moves over the 194 px between.
const SLIDER_AREA_WIDTH = 206;
const SLIDER_BUTTON_WIDTH = 12;
const SLIDER_RANGE = SLIDER_AREA_WIDTH - SLIDER_BUTTON_WIDTH;
// The colour grid (itemgrid_vertical, scale_to_fit_items) spreads its 27 px cells over 210 px.
const COLOR_GRID_WIDTH = 210;
const COLOR_CELL_WIDTH = 27;

const sliderPosition = (value: number, min: number, max: number) => Math.round((SLIDER_RANGE * (value - min)) / (max - min));
const sliderValue = (position: number, min: number, max: number) =>
    Math.round((Math.max(0, Math.min(SLIDER_RANGE, position)) / SLIDER_RANGE) * (max - min)) + min;

/** AIR DimmerViewAlphaSlider: the slider_base bitmap with the slider_button dragged along it. */
const DimmerSlider: FC<{ value: number; min: number; max: number; onChange: (value: number) => void }> = ({ value, min, max, onChange }) => {
    const areaRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ pointerId: number; offset: number } | null>(null);

    const valueAt = (clientX: number) => {
        const area = areaRef.current?.getBoundingClientRect();

        return area ? sliderValue(clientX - area.left - (dragRef.current?.offset ?? SLIDER_BUTTON_WIDTH / 2), min, max) : value;
    };

    const onPointerDown = (event: PointerEvent<HTMLElement>) => {
        const button = event.currentTarget.getBoundingClientRect();

        dragRef.current = { pointerId: event.pointerId, offset: event.clientX - button.left };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent<HTMLElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;

        onChange(valueAt(event.clientX));
    };

    const onPointerUp = (event: PointerEvent<HTMLElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;

        onChange(valueAt(event.clientX));
        dragRef.current = null;
    };

    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        const step = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : 0;

        if (event.key === 'Home') onChange(min);
        else if (event.key === 'End') onChange(max);
        else if (step) onChange(Math.max(min, Math.min(max, value + step * Math.ceil((max - min) / SLIDER_RANGE))));
        else return;

        event.preventDefault();
    };

    return (
        <div className="octane-dimmer__brightness">
            <img alt="" className="octane-dimmer__slider-base" draggable={false} src={sliderBase} />
            <div ref={areaRef} className="octane-dimmer__slider-area">
                <span
                    aria-label={LocalizeText('widget.backgroundcolor.lightness')}
                    aria-valuemax={max}
                    aria-valuemin={min}
                    aria-valuenow={value}
                    aria-valuetext={`${FurnitureDimmerUtilities.scaleBrightness(value)}%`}
                    className="octane-dimmer__slider-button"
                    role="slider"
                    style={{ left: sliderPosition(value, min, max), backgroundImage: `url(${sliderButton})` }}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onLostPointerCapture={() => (dragRef.current = null)}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                />
            </div>
        </div>
    );
};

export interface FurnitureDimmerLayoutProps {
    presetIds: number[];
    isOn: boolean;
    selectedPresetId: number;
    selectedColor: number;
    selectedBrightness: number;
    selectedEffectId: number;
    freeColorMode: boolean;
    onClose: () => void;
    onSelectPreset: (presetId: number) => void;
    onSelectColor: (color: number) => void;
    onSelectBrightness: (brightness: number) => void;
    onSelectEffect: (effectId: number) => void;
    onApply: () => void;
    onToggle: () => void;
}

/**
 * AIR dimmer_ui (277 x 225): three preset tabs over the colour grid (a frame, the colour button tinted by the colour and the "chosen"
 * overlay per cell), the brightness slider, the "background only" checkbox and the grey info text; apply on the left, the small on/off
 * button on the right. While the dimmer is off the tabs make way for off_border (the info picture and text) and apply is disabled.
 */
export const FurnitureDimmerLayout: FC<FurnitureDimmerLayoutProps> = ({
    presetIds,
    isOn,
    selectedPresetId,
    selectedColor,
    selectedBrightness,
    selectedEffectId,
    freeColorMode,
    onClose,
    onSelectPreset,
    onSelectColor,
    onSelectBrightness,
    onSelectEffect,
    onApply,
    onToggle
}) => {
    const colorStep = (COLOR_GRID_WIDTH - COLOR_CELL_WIDTH) / (FurnitureDimmerUtilities.AVAILABLE_COLORS.length - 1);

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-room-widget-dimmer octane-dimmer">
                <OctaneCardHeaderView headerText={LocalizeText('widget.dimmer.title')} onCloseClick={onClose} />
                {/* AIR hides the tabbed view while the dimmer is off; its room stays, so the window keeps its size. */}
                <OctaneCardTabsView aria-hidden={!isOn} classNames={['octane-dimmer__tabs', ...(isOn ? [] : ['is-hidden'])]}>
                    {presetIds.map((presetId) => (
                        <OctaneCardTabsItemView key={presetId} isActive={selectedPresetId === presetId} onClick={() => isOn && onSelectPreset(presetId)}>
                            {LocalizeText(`widget.dimmer.tab.${presetId}`)}
                        </OctaneCardTabsItemView>
                    ))}
                </OctaneCardTabsView>
                <OctaneCardContentView className="octane-dimmer__content">
                    {isOn ? (
                        <div className="octane-dimmer__pane">
                            {freeColorMode ? (
                                <input
                                    className="octane-dimmer__color-input"
                                    type="color"
                                    value={ColorUtils.makeColorNumberHex(selectedColor)}
                                    onChange={(event) => onSelectColor(ColorUtils.convertFromHex(event.target.value))}
                                />
                            ) : (
                                <div className="octane-dimmer__colors">
                                    {FurnitureDimmerUtilities.AVAILABLE_COLORS.map((value, index) => (
                                        <BaseButton
                                            key={index}
                                            aria-label={FurnitureDimmerUtilities.HTML_COLORS[index]}
                                            aria-pressed={value === selectedColor}
                                            className="octane-dimmer__color"
                                            style={
                                                {
                                                    left: Math.round(index * colorStep),
                                                    '--dimmer-color': FurnitureDimmerUtilities.HTML_COLORS[index],
                                                    '--dimmer-frame': `url(${colorFrame})`,
                                                    '--dimmer-button': `url(${colorButton})`,
                                                    '--dimmer-chosen': `url(${colorSelected})`
                                                } as CSSProperties
                                            }
                                            type="button"
                                            onClick={() => onSelectColor(value)}
                                        >
                                            <span className="octane-dimmer__color-tint" />
                                            {value === selectedColor && <span className="octane-dimmer__color-chosen" />}
                                        </BaseButton>
                                    ))}
                                </div>
                            )}
                            <DimmerSlider
                                max={FurnitureDimmerUtilities.MAX_BRIGHTNESS}
                                min={FurnitureDimmerUtilities.MIN_BRIGHTNESS}
                                value={selectedBrightness}
                                onChange={onSelectBrightness}
                            />
                            <div className="octane-dimmer__type">
                                <Checkbox checked={selectedEffectId === 2} onCheckedChange={(nextChecked) => onSelectEffect(nextChecked ? 2 : 1)} />
                                <Text>{LocalizeText('widget.dimmer.type.checkbox')}</Text>
                            </div>
                            <Text className="octane-dimmer__info">{LocalizeText('widget.dimmer.info')}</Text>
                        </div>
                    ) : (
                        <div className="octane-dimmer__off">
                            <img alt="" className="octane-dimmer__off-image" draggable={false} src={offImage} />
                            <Text className="octane-dimmer__off-text">{LocalizeText('widget.dimmer.info.off')}</Text>
                        </div>
                    )}
                    <div className="octane-dimmer__actions">
                        <Button classNames={['octane-dimmer__apply']} disabled={!isOn} variant="secondary" onClick={onApply}>
                            {LocalizeText('widget.dimmer.button.apply')}
                        </Button>
                        <Button classNames={['octane-dimmer__on-off']} variant="secondary" onClick={onToggle}>
                            {LocalizeText(isOn ? 'widget.dimmer.button.off' : 'widget.dimmer.button.on')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};

/** The furni dimmer widget: the presets and state of the dimmer in the room, drawn by FurnitureDimmerLayout. */
export const FurnitureDimmerView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const {
        presets = [],
        dimmerState = 0,
        selectedPresetId = 0,
        color = 0xffffff,
        brightness = 0xff,
        effectId = 0,
        selectedColor = 0,
        setSelectedColor = null,
        selectedBrightness = 0,
        setSelectedBrightness = null,
        selectedEffectId = 0,
        setSelectedEffectId = null,
        selectPresetId = null,
        applyChanges
    } = useFurnitureDimmerWidget();

    const onClose = () => {
        FurnitureDimmerUtilities.previewDimmer(color, brightness, effectId === 2);

        setIsVisible(false);
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REMOVE_DIMMER, () => setIsVisible(false));

    useEffect(() => {
        if (!presets || !presets.length) return;

        setIsVisible(true);
    }, [presets]);

    const isFreeColorMode = useMemo(() => GetConfigurationValue<boolean>('widget.dimmer.colorwheel', false), []);

    if (!isVisible) return null;

    return (
        <FurnitureDimmerLayout
            freeColorMode={isFreeColorMode}
            isOn={dimmerState === 1}
            presetIds={presets.map((preset) => preset.id)}
            selectedBrightness={selectedBrightness}
            selectedColor={selectedColor}
            selectedEffectId={selectedEffectId}
            selectedPresetId={selectedPresetId}
            onApply={applyChanges}
            onClose={onClose}
            onSelectBrightness={(value) => setSelectedBrightness(value)}
            onSelectColor={(value) => setSelectedColor(value)}
            onSelectEffect={(value) => setSelectedEffectId(value)}
            onSelectPreset={(presetId) => selectPresetId(presetId)}
            onToggle={() => FurnitureDimmerUtilities.changeState()}
        />
    );
};
