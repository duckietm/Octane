import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { Checkbox } from '../../../common/Checkbox';
import { HandheldInfoDrawer } from '../../../common/handheld/HandheldInfoDrawer';
import { NumberInput } from '../../../common/NumberInput';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { formatBuildHeight, roundBuildHeight } from './buildHeightScale';

/**
 * Height steps of the phone panel: the desktop's tenth, and a whole tile in place of the slider's long drags (the
 * field still takes any height).
 */
export const HANDHELD_BUILD_HEIGHT_STEPS = [1, 0.1];

export interface HandheldBuildHeightViewProps {
    height: number;
    minHeight: number;
    maxHeight: number;
    /** The height furni stands on with the tool at its lowest useful setting: the floor, or the nearest end of the range. */
    floorLevel: number;
    underpass: boolean;
    underpassAllowed: boolean;
    /** The least height that lets avatars walk underneath. */
    underpassMinHeight: number;
    /** A wanted height; the desktop window's own clamp and rounding apply. */
    onHeight: (value: number) => void;
    onUnderpass: (enabled: boolean) => void;
    /** Turns the tool off (the desktop's close and its "Turn off" button). */
    onClose: () => void;
}

/**
 * The build height on a phone: a low dark-glass panel over the toolbar strip (a corner card on its side) in the look of
 * the build tools (HandheldDrawer.css `octane-handheld-build*`, HandheldBuildHeight.css), so the room where the furni
 * goes stays in view. The height in a 16 px field, finger-sized steps either way, the floor level, walking underneath
 * as a row of its own, and "Turn off". BuildHeightWidgetView keeps the hook and hands its handlers here.
 */
export const HandheldBuildHeightView: FC<HandheldBuildHeightViewProps> = ({
    height,
    minHeight,
    maxHeight,
    floorLevel,
    underpass,
    underpassAllowed,
    underpassMinHeight,
    onHeight,
    onUnderpass,
    onClose
}) => {
    const title = LocalizeText('widget.buildheight.title');
    const lowerLabel = localizeWithFallback('widget.buildheight.lower', 'Lower');
    const raiseLabel = localizeWithFallback('widget.buildheight.raise', 'Raise');
    const atMin = height <= minHeight;
    const atMax = height >= maxHeight;

    return (
        <NativeTextTree>
            <HandheldInfoDrawer
                className="octane-handheld-build-height-drawer"
                details={
                    <div className="octane-handheld-build octane-handheld-build-height">
                        <section className="octane-handheld-build-height__stepper" data-group="build-height">
                            {HANDHELD_BUILD_HEIGHT_STEPS.map((step) => (
                                <BaseButton
                                    key={`down-${step}`}
                                    aria-label={`${lowerLabel} ${formatBuildHeight(step)}`}
                                    className="octane-handheld-build__key"
                                    data-step="down"
                                    disabled={atMin}
                                    onClick={() => onHeight(height - step)}
                                >
                                    {`−${formatBuildHeight(step)}`}
                                </BaseButton>
                            ))}
                            <NumberInput
                                aria-label={title}
                                className="octane-handheld-build-height__field"
                                max={maxHeight}
                                min={minHeight}
                                spellCheck={false}
                                step={0.1}
                                steppers={false}
                                value={roundBuildHeight(height)}
                                onChange={(event) => onHeight(event.target.valueAsNumber)}
                            />
                            {[...HANDHELD_BUILD_HEIGHT_STEPS].reverse().map((step) => (
                                <BaseButton
                                    key={`up-${step}`}
                                    aria-label={`${raiseLabel} ${formatBuildHeight(step)}`}
                                    className="octane-handheld-build__key"
                                    data-step="up"
                                    disabled={atMax}
                                    onClick={() => onHeight(height + step)}
                                >
                                    {`+${formatBuildHeight(step)}`}
                                </BaseButton>
                            ))}
                        </section>
                        {/* A label row: the whole 44 px row toggles the box. */}
                        <label className="octane-handheld-build-height__row" data-locked={!underpassAllowed || undefined}>
                            <Checkbox
                                checked={underpass && underpassAllowed}
                                disabled={!underpassAllowed}
                                onCheckedChange={(checked) => onUnderpass(checked)}
                            />
                            <span className="octane-handheld-build-height__row-text">
                                <span>{LocalizeText('widget.buildheight.underpass')}</span>
                                {!underpassAllowed && (
                                    <span className="octane-handheld-build-height__hint">
                                        {LocalizeText('widget.buildheight.underpass.min_height', ['height'], [formatBuildHeight(underpassMinHeight)])}
                                    </span>
                                )}
                            </span>
                        </label>
                        <div className="octane-handheld-build-height__actions">
                            <BaseButton className="octane-handheld-build-height__action" disabled={height === floorLevel} onClick={() => onHeight(floorLevel)}>
                                {localizeWithFallback('widget.buildheight.floor', 'Floor level')}
                            </BaseButton>
                            <BaseButton className="octane-handheld-build-height__action is-off" onClick={onClose}>
                                {LocalizeText('widget.buildheight.reset')}
                            </BaseButton>
                        </div>
                    </div>
                }
                label={title}
                picture={<span aria-hidden="true" className="octane-icon icon-buildheight" />}
                subtitle={LocalizeText('widget.buildheight.description')}
                title={title}
                onClose={onClose}
            />
        </NativeTextTree>
    );
};
