import * as RadixSlider from '@radix-ui/react-slider';
import { CSSProperties, FC, HTMLProps, ReactElement } from 'react';
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
    invert?: boolean;
    className?: string;
    style?: CSSProperties;
    trackClassName?: string;
    thumbClassName?: string;
    renderThumb?: (props: HTMLProps<HTMLDivElement>, state: SliderThumbState) => ReactElement;
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
        invert,
        className,
        style,
        trackClassName,
        thumbClassName,
        renderThumb
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
        const baseProps: HTMLProps<HTMLDivElement> = {
            className: cn('thumb', `thumb-${i}`, thumbClassName)
        };

        const state: SliderThumbState = {
            index: i,
            value: isRange ? valueArr : currentValue,
            valueNow: valueArr[i] ?? 0
        };

        return (
            <RadixSlider.Thumb key={i} asChild>
                {renderThumb ? renderThumb(baseProps, state) : <div {...baseProps} />}
            </RadixSlider.Thumb>
        );
    };

    return (
        <Flex fullWidth gap={1} classNames={['octane-slider-wrapper']}>
            {!disabledButton && (
                <Button classNames={['octane-slider-button', 'octane-slider-button-left']} disabled={disabled || minimum >= currentValue} onClick={stepDown}>
                    <FaAngleLeft />
                </Button>
            )}
            <RadixSlider.Root
                inverted={invert}
                disabled={disabled}
                className={cn('octane-slider', 'relative', 'min-w-0', 'grow', className)}
                style={style}
                max={max}
                min={min}
                step={step}
                value={value !== undefined ? valueArr : undefined}
                defaultValue={defaultValue !== undefined ? toArray(defaultValue) : undefined}
                onValueChange={emit}
            >
                <RadixSlider.Track className={cn('track', 'track-1', 'grow', trackClassName)}>
                    <RadixSlider.Range className={cn('track', 'track-0', trackClassName)} />
                </RadixSlider.Track>
                {valueArr.map((_, i) => renderThumbElement(i))}
            </RadixSlider.Root>
            {!disabledButton && (
                <Button classNames={['octane-slider-button', 'octane-slider-button-right']} disabled={disabled || maximum <= currentValue} onClick={stepUp}>
                    <FaAngleRight />
                </Button>
            )}
        </Flex>
    );
};
