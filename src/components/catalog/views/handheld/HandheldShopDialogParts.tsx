import { ComponentProps, FC, ReactNode } from 'react';
import { LocalizeText } from '../../../../api';
import { LayoutCurrencyIcon } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { DraggableWindow } from '../../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../../common/handheld/HandheldSheetFrame';
import { InlineDialog } from '../../../../common/InlineDialog';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * The pieces every shop dialog on a phone is built from (HandheldShopDialogs.css): a centred card over the shop for the
 * confirmations, a full-screen sheet with a bottom action bar for the bigger windows, pill buttons and a price line with
 * the currency icons. The desktop views keep their state and packets and hand only data and handlers to them.
 */

export type HandheldShopButtonTone = 'plain' | 'primary';

export const HandheldShopButton: FC<ComponentProps<typeof BaseButton> & { tone?: HandheldShopButtonTone }> = ({ tone = 'plain', className = '', ...props }) => (
    <BaseButton {...props} className={`octane-handheld-shop-dialog__button is-${tone} ${typeof className === 'string' ? className : ''}`.trim()} />
);

export interface HandheldShopPricePart {
    amount: number | string;
    /** -1 for credits, else the activity point type. */
    type: number;
}

/** A price as the shop tiles show it: each amount with its currency icon, "+" between them. */
export const HandheldShopPrice: FC<{ parts: HandheldShopPricePart[]; label?: string; className?: string }> = ({ parts, label = null, className = '' }) => (
    <div className={`octane-handheld-shop-dialog__price ${className}`.trim()} data-testid="handheld-shop-price">
        {label && <span className="octane-handheld-shop-dialog__price-label">{label}</span>}
        <span className="octane-handheld-shop-dialog__price-parts">
            {parts.map((part, index) => (
                <span key={`${part.type}-${index}`} className="octane-handheld-shop-dialog__price-part" data-currency-type={part.type}>
                    <strong>{index > 0 ? `+ ${part.amount}` : String(part.amount)}</strong>
                    <LayoutCurrencyIcon type={part.type} />
                </span>
            ))}
        </span>
    </div>
);

/** The round close button of a card. */
const CloseButton: FC<{ onClose: () => void; disabled?: boolean }> = ({ onClose, disabled = false }) => (
    <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-shop-dialog__close" disabled={disabled} onClick={onClose}>
        <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="M4 4 L12 12 M12 4 L4 12" />
        </svg>
    </BaseButton>
);

export interface HandheldShopCardProps {
    /** Window key: the card is a full-screen layer of its own, so it sits above the shop sheet. */
    uniqueKey: string;
    title: string;
    onClose: () => void;
    /** While a purchase is under way the card cannot be dismissed by a tap beside it. */
    busy?: boolean;
    className?: string;
    testId?: string;
    /** The picture at the top (at the left on its side). */
    hero?: ReactNode;
    /** The buttons of the bar at the bottom of the card; the main action last. */
    actions: ReactNode;
    children?: ReactNode;
}

/**
 * A confirmation on a phone: a dim layer over the shop with a card in the middle of it (low and wide on its side). It is a
 * modal dialog that traps the focus and closes on Escape like the desktop's, and a tap beside the card cancels it.
 */
export const HandheldShopCard: FC<HandheldShopCardProps> = (props) => {
    const { uniqueKey, title, onClose, busy = false, className = '', testId, hero = null, actions, children = null } = props;

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey={uniqueKey}>
                <div
                    className="octane-handheld-shop-dialog"
                    data-testid={testId ? `${testId}-scrim` : undefined}
                    onClick={(event) => event.target === event.currentTarget && !busy && onClose()}
                >
                    <InlineDialog
                        aria-label={title}
                        aria-modal="true"
                        className={`octane-handheld-shop-dialog__card ${className}`.trim()}
                        data-testid={testId}
                        modal="trap-focus"
                        onClose={onClose}
                    >
                        <div className="octane-handheld-shop-dialog__head">
                            <span className="octane-handheld-shop-dialog__title">{title}</span>
                            <CloseButton disabled={busy} onClose={onClose} />
                        </div>
                        <div className={`octane-handheld-shop-dialog__main${hero ? ' has-hero' : ''}`}>
                            {hero && <div className="octane-handheld-shop-dialog__hero">{hero}</div>}
                            <div className="octane-handheld-shop-dialog__body">{children}</div>
                        </div>
                        <div className="octane-handheld-shop-dialog__actions">{actions}</div>
                    </InlineDialog>
                </div>
            </DraggableWindow>
        </NativeTextTree>
    );
};

export interface HandheldShopSheetProps {
    uniqueKey: string;
    title: string;
    onClose: () => void;
    /** Toolbar icon class of the header. */
    icon?: string;
    className?: string;
    testId?: string;
    headerExtra?: ReactNode;
    /** The bar at the bottom with the main action; none for a sheet that only shows something. */
    actions?: ReactNode;
    children?: ReactNode;
}

/** A bigger shop window on a phone: the phone frame over the whole screen, its content scrolling, the actions in a bar at the bottom. */
export const HandheldShopSheet: FC<HandheldShopSheetProps> = (props) => {
    const { uniqueKey, title, onClose, icon = 'icon-catalog', className = '', testId, headerExtra = null, actions = null, children = null } = props;

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey={uniqueKey}>
                <HandheldSheetFrame
                    className={`octane-handheld-shop-sheet ${className}`.trim()}
                    headerExtra={headerExtra}
                    icon={icon}
                    title={title}
                    onClose={onClose}
                >
                    <div className="octane-handheld-shop-sheet__scroll" data-testid={testId}>
                        {children}
                    </div>
                    {actions && <div className="octane-handheld-shop-sheet__bar">{actions}</div>}
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};

/** A white rounded section of a sheet, with an optional small caption. */
export const HandheldShopSection: FC<{ caption?: string; className?: string; children?: ReactNode }> = ({
    caption = null,
    className = '',
    children = null
}) => (
    <section className={`octane-handheld-shop-sheet__section ${className}`.trim()}>
        {caption && <span className="octane-handheld-shop-sheet__caption">{caption}</span>}
        {children}
    </section>
);
