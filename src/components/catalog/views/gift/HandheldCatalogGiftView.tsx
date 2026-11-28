import { ChangeEvent, CSSProperties, FC, ReactNode, RefObject } from 'react';
import { localizeWithFallback } from '../../../../api';
import giftSmallCoinImage from '../../../../assets/images/catalog/air/gift/small-coin.png';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { ToggleButton } from '../../../../common/ToggleButton';
import { HandheldShopButton, HandheldShopSection, HandheldShopSheet } from '../handheld/HandheldShopDialogParts';

interface GiftStepper {
    label: string;
    name: string;
    onPrevious: () => void;
    onNext: () => void;
}

export interface HandheldCatalogGiftViewProps {
    title: string;
    recipient: {
        placeholder: string;
        value: string;
        inputRef: RefObject<HTMLInputElement>;
        /** The friends listed under the field (empty while the list is closed). */
        suggestions: string[];
        renderName: (name: string) => ReactNode;
        onChange: (value: string) => void;
        onFocus: () => void;
        onPick: (name: string) => void;
        onDismiss: () => void;
    };
    message: {
        placeholder: string;
        value: string;
        inputRef: RefObject<HTMLTextAreaElement>;
        onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
        onFocus: () => void;
    };
    sender: {
        /** The sender's head, or the incognito mark. */
        picture: ReactNode;
        /** "From ..." while the sender is shown, else null. */
        signature: string | null;
        /** The moderator's "show my face" switch, or null. */
        showFace: { label: string; checked: boolean; onChange: (checked: boolean) => void } | null;
    };
    /** The wrapped gift as it will stand in the room, or null. */
    preview: ReactNode;
    box: GiftStepper & { price: string; paid: boolean };
    ribbon: GiftStepper & { enabled: boolean };
    colors: { title: string; items: { id: number; color: string }[]; selectedId: number; enabled: boolean; onPick: (id: number) => void };
    cancelLabel: string;
    giveLabel: string;
    isBuying: boolean;
    onClose: () => void;
    onGive: () => void;
}

const Chevron: FC<{ flip?: boolean }> = ({ flip = false }) => (
    <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d={flip ? 'M6 3 L11 8 L6 13' : 'M10 3 L5 8 L10 13'} />
    </svg>
);

/** One "previous | name | next" row of the wrapping (box or ribbon), with finger-sized arrows. */
const Stepper: FC<{ stepper: GiftStepper; disabled?: boolean; testId: string; children?: ReactNode }> = ({
    stepper,
    disabled = false,
    testId,
    children = null
}) => (
    <div className={`octane-handheld-shop-gift__stepper${disabled ? ' is-disabled' : ''}`} data-testid={testId}>
        <BaseButton
            aria-label={stepper.label}
            className="octane-handheld-shop-gift__arrow"
            data-testid={`${testId}-previous`}
            disabled={disabled}
            onClick={stepper.onPrevious}
        >
            <Chevron />
        </BaseButton>
        <div className="octane-handheld-shop-gift__step-text">
            <strong>{stepper.name}</strong>
            {children}
        </div>
        <BaseButton
            aria-label={stepper.label}
            className="octane-handheld-shop-gift__arrow"
            data-testid={`${testId}-next`}
            disabled={disabled}
            onClick={stepper.onNext}
        >
            <Chevron flip />
        </BaseButton>
    </div>
);

/**
 * CatalogGiftView on a phone: who gets it (friends listed under the field as rows), the card with the message and the
 * sender's head (or the incognito mark for a moderator who hides it), and the wrapping: the wrapped gift large, box and
 * ribbon as arrow rows, the colours as finger-sized tiles. Cancel / Give gift at the bottom; on its side the card and
 * the wrapping stand next to each other. The packet and every rule of the wrapping are the desktop view's.
 */
export const HandheldCatalogGiftView: FC<HandheldCatalogGiftViewProps> = (props) => {
    const { title, recipient, message, sender, preview, box, ribbon, colors, cancelLabel, giveLabel, isBuying, onClose, onGive } = props;

    return (
        <HandheldShopSheet
            actions={
                <>
                    <HandheldShopButton data-testid="handheld-gift-cancel" onClick={onClose}>
                        {cancelLabel}
                    </HandheldShopButton>
                    <HandheldShopButton data-testid="handheld-gift-give" disabled={isBuying} tone="primary" onClick={onGive}>
                        {giveLabel}
                    </HandheldShopButton>
                </>
            }
            className="octane-handheld-shop-gift"
            testId="handheld-gift"
            title={title}
            uniqueKey="catalog-gift"
            onClose={onClose}
        >
            <div className="octane-handheld-shop-gift__card">
                <HandheldShopSection caption={localizeWithFallback('octane.handheld.shop_dialogs.gift_to', 'To')}>
                    <input
                        ref={recipient.inputRef}
                        aria-label={recipient.placeholder}
                        autoComplete="off"
                        className="octane-handheld-shop-sheet__field"
                        data-testid="handheld-gift-recipient"
                        enterKeyHint="next"
                        maxLength={32}
                        placeholder={recipient.placeholder}
                        type="text"
                        value={recipient.value}
                        onChange={(event) => recipient.onChange(event.target.value)}
                        onFocus={recipient.onFocus}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') recipient.onDismiss();
                            if (event.key === 'Enter' && recipient.suggestions.length) recipient.onPick(recipient.suggestions[0]);
                        }}
                    />
                    {recipient.suggestions.length > 0 && (
                        <div className="octane-handheld-shop-gift__friends" data-testid="handheld-gift-friends">
                            {recipient.suggestions.map((name) => (
                                <BaseButton key={name} className="octane-handheld-shop-gift__friend" onClick={() => recipient.onPick(name)}>
                                    <span>{recipient.renderName(name)}</span>
                                </BaseButton>
                            ))}
                        </div>
                    )}
                </HandheldShopSection>
                <HandheldShopSection
                    caption={localizeWithFallback('octane.handheld.shop_dialogs.gift_message', 'Message')}
                    className="octane-handheld-shop-gift__note"
                >
                    <div className="octane-handheld-shop-gift__note-row">
                        <div className="octane-handheld-shop-gift__sender">{sender.picture}</div>
                        <textarea
                            ref={message.inputRef}
                            aria-label={message.placeholder}
                            className="octane-handheld-shop-sheet__field is-area"
                            data-testid="handheld-gift-message"
                            maxLength={140}
                            placeholder={message.placeholder}
                            value={message.value}
                            onChange={message.onChange}
                            onFocus={message.onFocus}
                        />
                    </div>
                    {sender.signature && <span className="octane-handheld-shop-gift__signature">{sender.signature}</span>}
                    {sender.showFace && (
                        <label className="octane-handheld-shop-dialog__check">
                            <Checkbox checked={sender.showFace.checked} onCheckedChange={(checked) => sender.showFace.onChange(checked)} />
                            <span>{sender.showFace.label}</span>
                        </label>
                    )}
                </HandheldShopSection>
            </div>
            <HandheldShopSection
                caption={localizeWithFallback('octane.handheld.shop_dialogs.gift_wrapping', 'Wrapping')}
                className="octane-handheld-shop-gift__wrapping"
            >
                <div className="octane-handheld-shop-gift__preview" data-testid="handheld-gift-preview">
                    {preview}
                </div>
                <Stepper stepper={box} testId="handheld-gift-box">
                    <span className="octane-handheld-shop-gift__price">
                        {box.price}
                        {box.paid && <img alt="" draggable={false} src={giftSmallCoinImage} />}
                    </span>
                </Stepper>
                <Stepper disabled={!ribbon.enabled} stepper={ribbon} testId="handheld-gift-ribbon" />
                <span className={`octane-handheld-shop-sheet__label${colors.enabled ? '' : ' is-disabled'}`}>{colors.title}</span>
                <div className="octane-handheld-shop-gift__colors" data-testid="handheld-gift-colors">
                    {colors.items.map((color) => (
                        <ToggleButton
                            key={color.id}
                            aria-label={color.color}
                            className="octane-handheld-shop-gift__color"
                            disabled={!colors.enabled}
                            pressed={color.id === colors.selectedId}
                            style={{ '--octane-gift-palette-color': color.color } as CSSProperties}
                            onPressedChange={() => colors.onPick(color.id)}
                        />
                    ))}
                </div>
            </HandheldShopSection>
        </HandheldShopSheet>
    );
};
