import { FC, useCallback, useState } from 'react';
import { Column, ColumnProps } from '../..';
import { OctaneCardAccordionContextProvider } from './OctaneCardAccordionContext';

interface OctaneCardAccordionViewProps extends ColumnProps {}

export const OctaneCardAccordionView: FC<OctaneCardAccordionViewProps> = (props) => {
    const { ...rest } = props;
    const [closers, setClosers] = useState<Function[]>([]);

    const closeAll = useCallback(() => {
        for (const closer of closers) closer();
    }, [closers]);

    return (
        <OctaneCardAccordionContextProvider value={{ closers, setClosers, closeAll }}>
            <Column gap={0} {...rest} />
        </OctaneCardAccordionContextProvider>
    );
};
