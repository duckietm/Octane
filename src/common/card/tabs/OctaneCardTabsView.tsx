import { FC, useMemo } from 'react';
import { Flex, FlexProps } from '../..';

export const OctaneCardTabsView: FC<FlexProps> = (props) => {
    const { justifyContent = 'center', gap = 1, classNames = [], children = null, ...rest } = props;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['octane-card-tabs-shell justify-center gap-1 flex min-h-card-tabs max-h-card-tabs px-2 pt-1'];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    return (
        <Flex classNames={getClassNames} gap={gap} justifyContent={justifyContent} {...rest}>
            {children}
        </Flex>
    );
};
