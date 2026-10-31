import { CSSProperties, FC, PropsWithChildren, ReactNode } from 'react';
import { hasWiredQuantifier, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredBaseView } from '../WiredBaseView';
import { WiredConditionQuantifierSection } from './WiredConditionQuantifierSection';

export interface WiredConditionBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves its section out, for views that show it elsewhere. */
    showSelection?: boolean;
    /**
     * False for a view that places the quantifier section itself (inside an advanced block of its own). By default
     * a condition whose definition has a quantifier gets the section at the top of its advanced footer, as AIR's
     * createAdvancedSections puts it before the input sources.
     */
    showQuantifier?: boolean;
}

export const WiredConditionBaseView: FC<PropsWithChildren<WiredConditionBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        cardStyle = undefined,
        hasSpecialInput = false,
        children = null,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        showSelection = true,
        showQuantifier = true
    } = props;
    const { trigger = null } = useWired();

    const onSave = () => save && save();

    const quantified = showQuantifier && hasWiredQuantifier(trigger?.quantifierType);
    const advanced = quantified ? (
        <div className="flex flex-col gap-2">
            <WiredConditionQuantifierSection />
            {footer}
        </div>
    ) : (
        footer
    );

    return (
        <NativeTextTree>
            <WiredBaseView
                hasSpecialInput={hasSpecialInput}
                requiresFurni={requiresFurni}
                save={onSave}
                validate={validate}
                cardStyle={cardStyle}
                wiredType="condition"
                footer={advanced}
                footerCollapsible={footerCollapsible}
                showSelection={showSelection}
                selectionPreview={selectionPreview}
            >
                {children}
            </WiredBaseView>
        </NativeTextTree>
    );
};
