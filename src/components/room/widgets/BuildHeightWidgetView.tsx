import { FC, useEffect } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider } from '../../../common';
import { useBuildHeight } from '../../../hooks';
import { Checkbox } from '../../../common/Checkbox';
import { NumberInput } from '../../../common/NumberInput';
import '../../../css/room/RoomWidgetsSweepAir.css';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { formatBuildHeight, getBuildHeightMarks, roundBuildHeight } from './buildHeightScale';

const STEP = 0.1;

const UNDERPASS_MIN_HEIGHT = 1.5;

export const BuildHeightWidgetView: FC<{}> = () => {
    const { available, minHeight, maxHeight, isOpen, height, underpass, applyHeight, toggleUnderpass, close } = useBuildHeight();

    const underpassAllowed = height >= UNDERPASS_MIN_HEIGHT;

    useEffect(() => {
        if (!underpassAllowed && underpass) toggleUnderpass(false);
    }, [underpassAllowed, underpass, toggleUnderpass]);

    if (!available || !isOpen) return null;

    const clamp = (value: number) => Math.min(maxHeight, Math.max(minHeight, roundBuildHeight(value)));
    const setHeight = (value: number) => {
        if (Number.isFinite(value)) applyHeight(clamp(value));
    };
    const marks = getBuildHeightMarks(minHeight, maxHeight);
    const floorLevel = Math.min(maxHeight, Math.max(minHeight, 0));

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-build-height-widget" theme="primary-slim" uniqueKey="build-height">
                <OctaneCardHeaderView headerText={LocalizeText('widget.buildheight.title')} onCloseClick={close} />
                <OctaneCardContentView className="build-height-content">
                    <p className="build-height-description">{LocalizeText('widget.buildheight.description')}</p>
                    <div className="build-height-stepper">
                        <Button
                            variant="secondary"
                            aria-label={localizeWithFallback('widget.buildheight.lower', 'Lower')}
                            disabled={height <= minHeight}
                            onClick={() => setHeight(height - STEP)}
                            classNames={['build-height-step']}
                        >
                            -
                        </Button>
                        <NumberInput
                            aria-label={LocalizeText('widget.buildheight.title')}
                            className="build-height-field"
                            steppers={false}
                            min={minHeight}
                            max={maxHeight}
                            step={STEP}
                            value={roundBuildHeight(height)}
                            onChange={(event) => setHeight(event.target.valueAsNumber)}
                        />
                        <Button
                            variant="secondary"
                            aria-label={localizeWithFallback('widget.buildheight.raise', 'Raise')}
                            disabled={height >= maxHeight}
                            onClick={() => setHeight(height + STEP)}
                            classNames={['build-height-step']}
                        >
                            +
                        </Button>
                    </div>
                    <div className="build-height-scale">
                        <Slider
                            bare
                            className="build-height-slider"
                            trackClassName="build-height-track"
                            thumbClassName="build-height-thumb"
                            thumbAriaLabel={LocalizeText('widget.buildheight.title')}
                            min={minHeight}
                            max={maxHeight}
                            step={STEP}
                            value={height}
                            onChange={(value: number) => setHeight(value)}
                        />
                        <div className="build-height-marks" aria-hidden="true">
                            {marks.map((mark) => (
                                <span key={mark.value} className={`build-height-mark ${mark.major ? 'is-major' : ''}`} style={{ left: `${mark.position}%` }}>
                                    {mark.major && <span className="build-height-mark-label">{formatBuildHeight(mark.value)}</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                    <label className={`build-height-underpass ${underpassAllowed ? '' : 'is-locked'}`}>
                        <Checkbox checked={underpass && underpassAllowed} disabled={!underpassAllowed} onCheckedChange={(nextChecked) => toggleUnderpass(nextChecked)} />
                        <span>{LocalizeText('widget.buildheight.underpass')}</span>
                    </label>
                    {!underpassAllowed && (
                        <p className="build-height-hint">
                            {LocalizeText('widget.buildheight.underpass.min_height', ['height'], [formatBuildHeight(UNDERPASS_MIN_HEIGHT)])}
                        </p>
                    )}
                    <div className="build-height-actions">
                        <Button variant="secondary" disabled={height === floorLevel} onClick={() => setHeight(floorLevel)}>
                            {localizeWithFallback('widget.buildheight.floor', 'Floor level')}
                        </Button>
                        <Button variant="secondary" onClick={close}>
                            {LocalizeText('widget.buildheight.reset')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
