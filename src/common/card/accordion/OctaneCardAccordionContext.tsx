import { createContext, Dispatch, FC, ReactNode, SetStateAction, useContext } from 'react';

export interface IOctaneCardAccordionContext {
    closers: Function[];
    setClosers: Dispatch<SetStateAction<Function[]>>;
    closeAll: () => void;
}

const OctaneCardAccordionContext = createContext<IOctaneCardAccordionContext>({
    closers: null,
    setClosers: null,
    closeAll: null
});

export const OctaneCardAccordionContextProvider: FC<{ value: IOctaneCardAccordionContext; children?: ReactNode }> = (props) => {
    return <OctaneCardAccordionContext {...props} />;
};

export const useOctaneCardAccordionContext = () => useContext(OctaneCardAccordionContext);
