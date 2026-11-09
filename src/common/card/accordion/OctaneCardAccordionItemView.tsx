import { FC } from 'react';
import { Flex, FlexProps } from '../..';

export interface OctaneCardAccordionItemViewProps extends FlexProps {}

export const OctaneCardAccordionItemView: FC<OctaneCardAccordionItemViewProps> = (props) => {
    const { alignItems = 'center', gap = 1, children = null, ...rest } = props;

    return (
        <Flex alignItems={alignItems} gap={gap} {...rest}>
            {children}
        </Flex>
    );
};
