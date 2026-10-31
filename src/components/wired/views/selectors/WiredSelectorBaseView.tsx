import { CSSProperties, FC, PropsWithChildren, ReactNode } from 'react';
import { WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { WiredBaseView } from '../WiredBaseView';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';

export interface WiredSelectorBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    hideDelay?: boolean;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
}

export const WiredSelectorBaseView: FC<PropsWithChildren<WiredSelectorBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        hasSpecialInput = false,
        children = null,
        cardStyle = undefined,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null
    } = props;

    return (
        <NativeTextTree>
            <WiredBaseView
                hasSpecialInput={hasSpecialInput}
                requiresFurni={requiresFurni}
                save={save}
                validate={validate}
                wiredType="selector"
                cardStyle={cardStyle}
                footer={footer}
                footerCollapsible={footerCollapsible}
                selectionPreview={selectionPreview}
                selectorOptions={<WiredSelectorOptionsSection />}
            >
                {children}
            </WiredBaseView>
        </NativeTextTree>
    );
};
