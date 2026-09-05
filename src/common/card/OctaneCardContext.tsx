import { createContext, FC, ReactNode, useContext } from 'react';

interface IOctaneCardContext {
    theme: string;
}

const OctaneCardContext = createContext<IOctaneCardContext>({
    theme: null
});

export const OctaneCardContextProvider: FC<{ value: IOctaneCardContext; children?: ReactNode }> = (props) => {
    return <OctaneCardContext value={props.value}>{props.children}</OctaneCardContext>;
};

export const useOctaneCardContext = () => useContext(OctaneCardContext);
