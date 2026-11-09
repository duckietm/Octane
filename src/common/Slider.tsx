import { Slider as BaseSlider } from '@base-ui/react/slider';
import { CSSProperties, FC, ReactNode, useState } from 'react';
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import { Button } from './Button';
import { Flex } from './Flex';

export interface SliderThumbState {
    index: number;
    value: number | number[];
    valueNow: number;
}

export interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value?: number | number[];
    defaultValue?: number | number[];
    onChange?: (value: any, thumbIndex: number) => void;
    disabled?: boolean;
    disabledButton?: boolean;
    className?: string;
    style?: CSSProperties;
    trackClassName?: string;
    thumbClassName?: string;
    thumbAriaLabel?: string;
    /** `vertical` renders the bare Base UI parts (max at the top, no step buttons) so the caller styles them. */
    orientation?: 'horizontal' | 'vertical';
    /** With `horizontal`: render the bare Base UI parts too (no step buttons, no indicator), like `vertical`. */
    bare?: boolean;
    title?: string;
    controlClassName?: string;
    trackStyle?: CSSProperties;
    trackTestId?: string;
    renderThumbContent?: (state: SliderThumbState) => ReactNode;
}

const toArray = (value: number | number[] | undefined, fallback = 0): number[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'number') return [value];

    return [fallback];
};

const cn = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(' ');

export const Slider: FC<SliderProps> = (props) => {
    const {
        disabledButton,
        disabled,
        max = 100,
        min = 0,
        step = 1,
        value,
        defaultValue,
        onChange,
        className,
        style,
        trackClassName,
        thumbClassName,
        thumbAriaLabel,
        orientation = 'horizontal',
        bare = false,
        title,
        controlClassName,
        trackStyle,
        trackTestId,
        renderThumbContent
    } = props;

    const minimum = typeof min === 'number' ? min : 0;
    const maximum = typeof max === 'number' ? max : 0;
    // Without `value` the slider keeps its own position, seeded from `defaultValue`.
    const [innerValue, setInnerValue] = useState<number | number[] | undefined>(defaultValue);
    const source = value !== undefined ? value : innerValue;
    const valueArr = toArray(source, minimum);
    const currentValue = valueArr[0] ?? minimum;
    const buttonStep = typeof step === 'number' && step > 0 ? step : 1;
    const isRange = valueArr.length > 1;

    const roundToStep = (nextValue: number) => {
        const decimalStep = buttonStep.toString();
        const precision = decimalStep.includes('.') ? decimalStep.length - decimalStep.indexOf('.') - 1 : 0;

        return parseFloat(nextValue.toFixed(precision));
    };

    const emit = (next: number[], thumbIndex = 0) => {
        if (value === undefined) setInnerValue(isRange ? next : next[0]);

        if (!onChange) return;

        if (isRange) onChange(next, thumbIndex);
        else onChange(next[0], thumbIndex);
    };

    const stepDown = () => {
        const next = Math.max(minimum, roundToStep(currentValue - buttonStep));

        emit([next, ...valueArr.slice(1)]);
    };

    const stepUp = () => {
        const next = Math.min(maximum, roundToStep(currentValue + buttonStep));

        emit([next, ...valueArr.slice(1)]);
    };

    const renderThumbElement = (i: number) => {
        const state: SliderThumbState = {
            index: i,
            value: isRange ? valueArr : currentValue,
            valueNow: valueArr[i] ?? 0
        };

        return (
            <BaseSlider.Thumb key={i} index={i} aria-label={thumbAriaLabel} className={cn('thumb', `thumb-${i}`, thumbClassName)}>
                {renderThumbContent?.(state)}
            </BaseSlider.Thumb>
        );
    };

    if (orientation === 'vertical' || bare) {
        const prefix = orientation === 'vertical' ? 'octane-slider-vertical' : 'octane-slider-bare';

        return (
            <BaseSlider.Root
                disabled={disabled}
                className={cn(prefix, className)}
                style={style}
                title={title}
                max={max}
                min={min}
                step={step}
                orientation={orientation}
                thumbAlignment="center"
                value={isRange ? valueArr : currentValue}
                onValueChange={(next, details) => emit(toArray(next), details.activeThumbIndex)}
            >
                <BaseSlider.Control className={cn(`${prefix}-control`, controlClassName)}>
                    <BaseSlider.Track className={cn(`${prefix}-track`, trackClassName)} style={trackStyle} data-testid={trackTestId} />
                    {valueArr.map((_, i) => (
                        <BaseSlider.Thumb key={i} index={i} aria-label={thumbAriaLabel} className={cn(`${prefix}-thumb`, thumbClassName)}>
                            {renderThumbContent?.({ index: i, value: isRange ? valueArr : currentValue, valueNow: valueArr[i] ?? 0 })}
                        </BaseSlider.Thumb>
                    ))}
                </BaseSlider.Control>
            </BaseSlider.Root>
        );
    }

    return (
        <Flex fullWidth gap={1} classNames={['octane-slider-wrapper']}>
            {!disabledButton && (
                <Button classNames={['octane-slider-button', 'octane-slider-button-left']} disabled={disabled || minimum >= currentValue} onClick={stepDown}>
                    <FaAngleLeft />
                </Button>
            )}
            <BaseSlider.Root
                disabled={disabled}
                className={cn('octane-slider', 'relative', 'min-w-0', 'grow', className)}
                style={style}
                max={max}
                min={min}
                step={step}
                thumbAlignment="center"
                value={isRange ? valueArr : currentValue}
                onValueChange={(next, details) => emit(toArray(next), details.activeThumbIndex)}
            >
                <BaseSlider.Control className="flex h-full w-full grow items-center">
                    <BaseSlider.Track className={cn('track', 'track-1', 'grow', trackClassName)}>
                        <BaseSlider.Indicator className={cn('track', 'track-0', trackClassName)} />
                    </BaseSlider.Track>
                    {valueArr.map((_, i) => renderThumbElement(i))}
                </BaseSlider.Control>
            </BaseSlider.Root>
            {!disabledButton && (
                <Button classNames={['octane-slider-button', 'octane-slider-button-right']} disabled={disabled || maximum <= currentValue} onClick={stepUp}>
                    <FaAngleRight />
                </Button>
            )}
        </Flex>
    );
};
