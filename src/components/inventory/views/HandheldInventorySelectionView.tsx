import { FC, ReactNode, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../common/ToggleButton';
import { useHandheldLayout } from '../../../hooks/handheld/useHandheldLayout';

export interface HandheldInventoryAction {
    key: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** Deletes something: drawn in the red of our close buttons. */
    danger?: boolean;
}

export interface HandheldInventorySelectionViewProps {
    /** A small picture of what is chosen (the bar's left end; a tap opens the larger preview). */
    thumb: ReactNode;
    name: string;
    /** One line under the name (counts, type, rarity). */
    meta?: ReactNode;
    /** The one thing to do with it (place, wear, activate): the green button. */
    primary?: HandheldInventoryAction | null;
    /** Everything else (use, sell, delete): small buttons behind "more". */
    actions?: HandheldInventoryAction[];
    /** The larger preview, shown with the other actions. */
    preview?: ReactNode;
}

/**
 * Phone inventory: what is chosen in the grid, as a bar under it: its picture, name, one line about it and the
 * green button for the main action. The picture or the "more" button opens a drawer above the bar with the larger
 * preview and the other actions. On a phone held on its side the stylesheet turns the whole thing into a column
 * right of the grid, with the preview and the other actions always open and the main action full width.
 */
export const HandheldInventorySelectionView: FC<HandheldInventorySelectionViewProps> = (props) => {
    const { thumb, name, meta = null, primary = null, actions = [], preview = null } = props;
    const [expanded, setExpanded] = useState(false);
    const { orientation } = useHandheldLayout();
    const hasDrawer = !!preview || actions.length > 0;
    const isOpen = hasDrawer && (expanded || orientation === 'landscape');
    const previewLabel = localizeWithFallback('octane.handheld.inventory.preview', 'Show the preview');
    const moreLabel = localizeWithFallback('octane.handheld.inventory.more', 'More actions');

    return (
        <NativeTextTree>
            <section
                aria-label={localizeWithFallback('octane.handheld.inventory.selection', 'Chosen item')}
                className={`octane-handheld-inv__selection${isOpen ? ' is-open' : ''}`}
            >
                {isOpen && (
                    <div className="octane-handheld-inv__drawer">
                        {preview && <div className="octane-handheld-inv__preview">{preview}</div>}
                        {actions.length > 0 && (
                            <div className="octane-handheld-inv__actions">
                                {actions.map((action) => (
                                    <BaseButton
                                        key={action.key}
                                        className={`octane-handheld-inv__action${action.danger ? ' is-danger' : ''}`}
                                        disabled={action.disabled}
                                        onClick={action.onClick}
                                    >
                                        {action.label}
                                    </BaseButton>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className="octane-handheld-inv__bar">
                    <BaseButton
                        aria-expanded={hasDrawer ? isOpen : undefined}
                        aria-label={previewLabel}
                        className="octane-handheld-inv__thumb"
                        disabled={!hasDrawer}
                        onClick={() => setExpanded((value) => !value)}
                    >
                        {thumb}
                    </BaseButton>
                    <div className="octane-handheld-inv__text">
                        <div className="octane-handheld-inv__name">{name}</div>
                        {meta && <div className="octane-handheld-inv__meta">{meta}</div>}
                    </div>
                    {hasDrawer && (
                        <ToggleButton aria-label={moreLabel} className="octane-handheld-inv__more" pressed={expanded} onPressedChange={setExpanded}>
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M3 10 L8 5 L13 10" />
                            </svg>
                        </ToggleButton>
                    )}
                    {primary && (
                        <BaseButton className="octane-handheld-inv__primary" disabled={primary.disabled} onClick={primary.onClick}>
                            {primary.label}
                        </BaseButton>
                    )}
                </div>
            </section>
        </NativeTextTree>
    );
};
