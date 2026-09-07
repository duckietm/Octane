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
        const newClassNames: string[] = [
            'octane-card-tab-item overflow-hidden relative cursor-pointer rounded-t-[8px] flex px-3 py-[6px] z-1',
            isActive && 'octane-card-tab-item-active -mb-px'
        ];

        //if (isActive) newClassNames.push('bg-[#dfdfdf] border-b-[1px_solid_black]');

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [isActive, classNames]);

    return (
        <Flex classNames={getClassNames} overflow={overflow} pointer={pointer} position={position} {...rest}>
            <Flex center shrink>
                {children}
            </Flex>
            {count > 0 && <LayoutItemCountView count={count} />}
        </Flex>
    );
};
