import { FC, useMemo } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { Flex, FlexProps } from '../../../../common';

interface CaretViewProps extends FlexProps {
    collapsed?: boolean;
    showIcon?: boolean;
}
export const ContextMenuCaretView: FC<CaretViewProps> = (props) => {
    const { justifyContent = 'center', alignItems = 'center', classNames = [], collapsed = true, showIcon = true, ...rest } = props;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['menu-footer octane-context-menu-footer'];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    return (
        <Flex alignItems={alignItems} classNames={getClassNames} justifyContent={justifyContent} {...rest}>
            {showIcon && !collapsed && <FaCaretDown className="fa-icon align-self-center" />}
            {showIcon && collapsed && <FaCaretUp className="fa-icon align-self-center" />}
        </Flex>
    );
};
