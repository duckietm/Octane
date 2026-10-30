import { WiredActionDefinition } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredExtraBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean | string | void;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    /** Official: some elements open wider. */
    widthModifier?: number;
    /** Official allowScrolling: the sections scroll between a fixed header and footer. */
    allowScrolling?: boolean;
    showSelection?: boolean;
    confirmSave?: () => { title: string; body: string } | null;
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
        selectionPreview = null,
        widthModifier = 1,
        allowScrolling = false,
        showSelection = true,
        confirmSave = null
    } = props;
    const { trigger = null, setActionDelay = null } = useWired();

    useEffect(() => {
        setActionDelay((trigger as WiredActionDefinition)?.delayInPulses ?? 0);
    }, [trigger, setActionDelay]);

    return (
        <NativeTextTree>
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
                widthModifier={widthModifier}
                allowScrolling={allowScrolling}
                showSelection={showSelection}
                confirmSave={confirmSave}
            >
                {children}
            </WiredBaseView>
        </NativeTextTree>
    );
};
