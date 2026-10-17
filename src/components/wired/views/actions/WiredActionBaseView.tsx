import { WiredActionDefinition } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredBaseView } from '../WiredBaseView';
import { WiredActionDelaySection } from './WiredActionDelaySection';

export interface WiredActionBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    hideDelay?: boolean;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    /** Official: some elements open wider. */
    widthModifier?: number;
}

export const WiredActionBaseView: FC<PropsWithChildren<WiredActionBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        hasSpecialInput = false,
        children = null,
        cardStyle = undefined,
        hideDelay = false,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        widthModifier = 1
    } = props;
    const { trigger = null, actionDelay = 0, setActionDelay = null } = useWired();

    useEffect(() => {
        setActionDelay((trigger as WiredActionDefinition).delayInPulses);
    }, [trigger, setActionDelay]);

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            wiredType="action"
            cardStyle={cardStyle}
            footer={footer}
            footerCollapsible={footerCollapsible}
            selectionPreview={selectionPreview}
            widthModifier={widthModifier}
            delaySection={
                hideDelay ? null : (
                    // Official: the delay comes after the furni picks.
                    <WiredActionDelaySection value={actionDelay} onChange={setActionDelay} />
                )
            }
        >
            {children}
        </WiredBaseView>
    );
};
