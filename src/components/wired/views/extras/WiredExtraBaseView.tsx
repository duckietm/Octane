import { WiredActionDefinition } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredExtraBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
}

export const WiredExtraBaseView: FC<PropsWithChildren<WiredExtraBaseViewProps>> = (props) => {
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
    const { trigger = null, setActionDelay = null } = useWired();

    useEffect(() => {
        setActionDelay((trigger as WiredActionDefinition)?.delayInPulses ?? 0);
    }, [trigger, setActionDelay]);

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            wiredType="extra"
            cardStyle={cardStyle}
            footer={footer}
            footerCollapsible={footerCollapsible}
            selectionPreview={selectionPreview}
        >
            {children}
        </WiredBaseView>
    );
};
