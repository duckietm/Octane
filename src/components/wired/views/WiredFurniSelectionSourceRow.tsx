import { FC, ReactNode } from 'react';
import { FaChevronLeft, FaChevronRight, FaMousePointer } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { Button, Text } from '../../../common';
import { WiredSourceOption } from './WiredSourcesSelector';

interface WiredFurniSelectionSourceRowProps {
    title: string;
    titleIsLiteral?: boolean;
    options: WiredSourceOption[];
    value: number;
    selectionKind: 'primary' | 'secondary';
    selectionActive: boolean;
    selectionCount: number;
    selectionLimit: number;
    selectionEnabledValues: number[];
    showSelectionToggle?: boolean;
    arrowsDisabled?: boolean;
    disabled?: boolean;
    headerContent?: ReactNode;
    onChange: (value: number) => void;
    onSelectionActivate?: () => void;
}

export const WiredFurniSelectionSourceRow: FC<WiredFurniSelectionSourceRowProps> = (props) => {
    const {
        title = '',
        titleIsLiteral = false,
        options = [],
        value = 0,
        selectionKind = 'primary',
        selectionActive = false,
        selectionCount = 0,
        selectionLimit = 0,
        selectionEnabledValues = [],
        showSelectionToggle = true,
        arrowsDisabled = undefined,
        disabled = false,
        headerContent = null,
        onChange = null,
        onSelectionActivate = null
    } = props;
    const currentIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value)
    );
    const currentOption = options[currentIndex] ?? options[0];
    const canActivateSelection = !!onSelectionActivate && selectionEnabledValues.includes(currentOption?.value);
    const shouldShowCount = selectionEnabledValues.includes(currentOption?.value);
    const countText = selectionLimit ? `[${selectionCount}/${selectionLimit}]` : `[${selectionCount}]`;
    const labelText = currentOption ? LocalizeText(currentOption.label) : '';
    const displayText = shouldShowCount ? `${labelText} ${countText}` : labelText;
    const resolvedTitle = titleIsLiteral ? title : LocalizeText(title);
    // A single-entry source has nothing to cycle through, so the official window greys its
    // arrows there instead of leaving them lit and inert.
    const arrowsAreDisabled = disabled || (arrowsDisabled ?? options.length < 2);

    const cycleValue = (direction: -1 | 1) => {
        if (arrowsAreDisabled || !options.length || !onChange) return;

        const nextIndex = (currentIndex + direction + options.length) % options.length;

        onChange(options[nextIndex].value);
    };

    return (
        <div className={`octane-wired__source-row${disabled ? ' is-disabled' : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <Text>{resolvedTitle}</Text>
                {headerContent}
                {showSelectionToggle && canActivateSelection && !disabled && (
                    <button
                        type="button"
                        className={`octane-wired__selection-toggle octane-wired__selection-toggle--${selectionKind} ${selectionActive ? 'is-active' : ''}`}
                        title={LocalizeText('wiredfurni.params.furni_picking.tooltip')}
                        onClick={() => onSelectionActivate && onSelectionActivate()}
                    >
                        <FaMousePointer />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="primary"
                    classNames={['octane-wired__picker-button']}
                    className={`px-2 py-1${arrowsAreDisabled ? ' opacity-50' : ''}`}
                    onClick={() => cycleValue(-1)}
                >
                    <FaChevronLeft />
                </Button>
                <div className="flex min-w-0 flex-1 items-center justify-center octane-wired__picker-label">
                    <Text small className="text-center">
                        {displayText}
                    </Text>
                </div>
                <Button
                    variant="primary"
                    classNames={['octane-wired__picker-button']}
                    className={`px-2 py-1${arrowsAreDisabled ? ' opacity-50' : ''}`}
                    onClick={() => cycleValue(1)}
                >
                    <FaChevronRight />
                </Button>
            </div>
        </div>
    );
};
