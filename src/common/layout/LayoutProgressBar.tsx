import { Progress } from '@base-ui/react/progress';
import { FC, MutableRefObject, useMemo } from 'react';
import { Column, ColumnProps, Flex } from '..';

interface LayoutProgressBarProps extends ColumnProps {
    text?: string;
    progress: number;
    maxProgress?: number;
}

export const LayoutProgressBar: FC<LayoutProgressBarProps> = (props) => {
    const { text = '', progress = 0, maxProgress = 100, position = 'relative', justifyContent = 'center', classNames = [], children = null, ...rest } = props;
    const max = maxProgress > 0 ? maxProgress : 100;
    const value = Math.max(0, Math.min(progress, max));

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [
            'border border-[solid] border-[#fff] p-[2px] h-[20px] rounded-[.25rem] overflow-hidden bg-[#418db0]        ',
            'text-white'
        ];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    return (
        <Progress.Root
            aria-label={text || undefined}
            max={max}
            min={0}
            value={value}
            // The Column keeps its flex layout and classes; Root supplies role="progressbar" and the aria-value* attributes.
            render={({ ref, ...rootProps }) => (
                <Column
                    classNames={getClassNames}
                    innerRef={ref as MutableRefObject<HTMLDivElement>}
                    justifyContent={justifyContent}
                    position={position}
                    {...rest}
                    {...rootProps}
                />
            )}
        >
            {text && text.length > 0 && (
                <Flex center fit className="[text-shadow:0px_4px_4px_rgba(0,0,0,.25)] z-20" position="absolute">
                    {text}
                </Flex>
            )}
            <Progress.Track className="h-full w-full">
                <Progress.Indicator className="relative h-full z-10 [transition:all_1s] rounded-[.125rem] bg-[repeating-linear-gradient(#2DABC2,#2DABC2_50%,#2B91A7_50%,#2B91A7_100%)]" />
            </Progress.Track>
            {children}
        </Progress.Root>
    );
};
