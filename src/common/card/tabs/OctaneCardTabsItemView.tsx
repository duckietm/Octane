import { FC, useMemo } from 'react';
import { Flex, FlexProps } from '../../Flex';
import { LayoutItemCountView } from '../../layout';

interface OctaneCardTabsItemViewProps extends FlexProps {
    isActive?: boolean;
    count?: number;
}

export const OctaneCardTabsItemView: FC<OctaneCardTabsItemViewProps> = (props) => {
    const { isActive = false, count = 0, overflow = 'hidden', position = 'relative', pointer = true, classNames = [], children = null, ...rest } = props;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['octane-card-tab-item overflow-hidden relative cursor-pointer z-1', isActive && 'octane-card-tab-item-active -mb-px'];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [isActive, classNames]);

    return (
        <Flex center classNames={getClassNames} overflow={overflow} pointer={pointer} position={position} {...rest}>
            <span className="octane-card-tab-item-label">{children}</span>
            {count > 0 && <LayoutItemCountView count={count} />}
        </Flex>
    );
};
