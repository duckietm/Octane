import { ColorConverter } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { ColorUtils, LocalizeText } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider, Text } from '../../../../common';
import { useFurnitureBackgroundColorWidget } from '../../../../hooks';

export const FurnitureBackgroundColorView: FC<{}> = (props) => {
    const {
        objectId = -1,
        hue = 0,
        saturation = 0,
        lightness = 0,
        setHue = null,
        setSaturation = null,
        setLightness = null,
        applyToner = null,
        toggleToner = null,
        onClose = null
    } = useFurnitureBackgroundColorWidget();

    const previewColor = useMemo(() => {
        const hsl = ColorUtils.eight_bitVals_to_int(0, hue, saturation, lightness);

        return ColorConverter.hslToRGB(hsl);
    }, [hue, saturation, lightness]);

    if (objectId === -1) return null;

    return (
        <OctaneCardView className="octane-room-widget-background-color" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('widget.backgroundcolour.title')} onCloseClick={onClose} />
            <OctaneCardContentView classNames={['bgcolor-widget-content']} overflow="hidden">
                <div className="bgcolor-widget-panel">
                    <div className="bgcolor-widget-top">
                        <Text className="bgcolor-widget-info">{LocalizeText('widget.backgroundcolor.info')}</Text>
                        <div className="bgcolor-widget-preview" style={{ backgroundColor: ColorUtils.makeColorNumberHex(previewColor) }} />
                    </div>
                    <div className="bgcolor-widget-slider-group">
                        <Text fontWeight="bold" className="bgcolor-widget-label">
                            {LocalizeText('widget.backgroundcolor.hue')}
                        </Text>
                        <div className="bgcolor-widget-slider-shell">
                            <Slider
                                disabledButton
                                max={255}
                                min={0}
                                step={1}
                                thumbClassName="bgcolor-widget-slider-thumb"
                                trackClassName="bgcolor-widget-slider-track"
                                value={hue}
                                renderThumb={(props) => <div {...props} />}
                                onChange={(value) => setHue(value as number)}
                            />
                        </div>
                    </div>
                    <div className="bgcolor-widget-slider-group">
                        <Text fontWeight="bold" className="bgcolor-widget-label">
                            {LocalizeText('widget.backgroundcolor.saturation')}
                        </Text>
                        <div className="bgcolor-widget-slider-shell">
                            <Slider
                                disabledButton
                                max={255}
                                min={0}
                                step={1}
                                thumbClassName="bgcolor-widget-slider-thumb"
                                trackClassName="bgcolor-widget-slider-track"
                                value={saturation}
                                renderThumb={(props) => <div {...props} />}
                                onChange={(value) => setSaturation(value as number)}
                            />
                        </div>
                    </div>
                    <div className="bgcolor-widget-slider-group">
                        <Text fontWeight="bold" className="bgcolor-widget-label">
                            {LocalizeText('widget.backgroundcolor.lightness')}
                        </Text>
                        <div className="bgcolor-widget-slider-shell">
                            <Slider
                                disabledButton
                                max={255}
                                min={0}
                                step={1}
                                thumbClassName="bgcolor-widget-slider-thumb"
                                trackClassName="bgcolor-widget-slider-track"
                                value={lightness}
                                renderThumb={(props) => <div {...props} />}
                                onChange={(value) => setLightness(value as number)}
                            />
                        </div>
                    </div>
                </div>
                <div className="bgcolor-widget-actions">
                    <Button classNames={['bgcolor-widget-button']} onClick={applyToner}>
                        {LocalizeText('widget.backgroundcolor.button.apply')}
                    </Button>
                    <Button classNames={['bgcolor-widget-button']} onClick={toggleToner}>
                        {LocalizeText('widget.backgroundcolor.button.on')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
