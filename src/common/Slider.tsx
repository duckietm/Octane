import { Slider as BaseSlider } from '@base-ui/react/slider';
import { CSSProperties, FC, ReactNode } from 'react';
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
    renderThumbContent?: (state: SliderThumbState) => ReactNode;
}

const toArray = (value: number | number[] | undefined): number[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'number') return [value];

    return [0];
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
        renderThumbContent
    } = props;

    const valueArr = toArray(value);
    const currentValue = valueArr[0] ?? 0;
    const minimum = typeof min === 'number' ? min : 0;
    const maximum = typeof max === 'number' ? max : 0;
    const buttonStep = typeof step === 'number' && step > 0 ? step : 1;
    const isRange = valueArr.length > 1;

    const roundToStep = (nextValue: number) => {
        const decimalStep = buttonStep.toString();
        const precision = decimalStep.includes('.') ? decimalStep.length - decimalStep.indexOf('.') - 1 : 0;

        return parseFloat(nextValue.toFixed(precision));
    };

    const emit = (next: number[]) => {
        if (!onChange) return;

        if (isRange) onChange(next, 0);
        else onChange(next[0], 0);
    };

    const stepDown = () => {
        const next = roundToStep(minimum < currentValue ? currentValue - buttonStep : minimum);

        emit([next, ...valueArr.slice(1)]);
    };

    const stepUp = () => {
        const next = roundToStep(maximum > currentValue ? currentValue + buttonStep : maximum);

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
                value={value !== undefined ? (isRange ? valueArr : currentValue) : undefined}
                defaultValue={defaultValue !== undefined ? defaultValue : undefined}
                onValueChange={(next) => emit(toArray(next))}
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
