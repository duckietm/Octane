import { Slider } from '@base-ui/react/slider';
import { FC, useEffect, useRef } from 'react';

interface AirSettingsVolumeRowProps {
    id: string;
    label: string;
    muteLabel: string;
    maximumLabel: string;
    value: number;
    onChange: (value: number) => void;
    onCommit: (value: number) => void;
}

export const AirSettingsVolumeRow: FC<AirSettingsVolumeRowProps> = ({ id, label, muteLabel, maximumLabel, value, onChange, onCommit }) => {
    const pendingValueRef = useRef(value);

    useEffect(() => {
        pendingValueRef.current = value;
    }, [value]);

    const changeValue = (nextValue: number) => {
        pendingValueRef.current = nextValue;
        onChange(nextValue);
    };

    // Base UI commits on pointer release and on keyboard steps; a blur commits what is pending, like before.
    const commitValue = () => onCommit(pendingValueRef.current);

    const setDirectValue = (nextValue: number) => {
        pendingValueRef.current = nextValue;
        onChange(nextValue);
        onCommit(nextValue);
    };

    return (
        <div className="air-settings-volume-row">
            <label className="air-settings-volume-row__label" htmlFor={id}>
                {label}
            </label>
            <button
                aria-label={`${label}: ${muteLabel}`}
                className="air-settings-volume-row__speaker air-settings-volume-row__speaker--off"
                onClick={() => setDirectValue(0)}
                type="button"
            />
            <div className="air-settings-volume-row__slider">
                <Slider.Root
                    className="air-settings-volume-row__control"
                    max={100}
                    min={0}
                    step={1}
                    value={value}
                    onValueChange={(next) => changeValue(next as number)}
                    onValueCommitted={(next) => onCommit(next as number)}
                >
                    <Slider.Control className="air-settings-volume-row__control-area">
                        <Slider.Track className="air-settings-volume-row__track" />
                        <Slider.Thumb aria-label={label} className="air-settings-volume-row__thumb" id={id} index={0} onBlur={commitValue} />
                    </Slider.Control>
                </Slider.Root>
            </div>
            <button
                aria-label={`${label}: ${maximumLabel}`}
                className="air-settings-volume-row__speaker air-settings-volume-row__speaker--on"
                onClick={() => setDirectValue(100)}
                type="button"
            />
        </div>
    );
};
