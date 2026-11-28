import { FC, useMemo } from 'react';
import { Flex, FlexProps } from '../../../../common';
import { useHandheldDrawer } from '../../../../common/handheld/HandheldInfoDrawer';

export const ContextMenuHeaderView: FC<FlexProps> = (props) => {
    const { justifyContent = 'center', alignItems = 'center', classNames = [], ...rest } = props;
    const drawer = useHandheldDrawer();

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [
            'octane-context-menu-header'
        ];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    // The phone drawer names the object in its own head.
    if (drawer) return null;

    return <Flex alignItems={alignItems} classNames={getClassNames} justifyContent={justifyContent} {...rest} />;
};
