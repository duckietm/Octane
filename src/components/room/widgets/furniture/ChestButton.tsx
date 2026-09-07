import { ButtonHTMLAttributes, FC } from 'react';

export type ChestButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Footer / dialog buttons with longer captions (auto width, min 73px). */
    wide?: boolean;
    /** Compact square control (upgrade +, 24×24). */
    icon?: boolean;
    /** Fixed 73×22 like coins_chest_contents.xml withdraw_btn. */
    fixed?: boolean;
    /** chest_generic.xml footer buttons (89–92×30). */
    footer?: boolean;
};

/** Habbo wired-chest Putyhef-style button (chest_generic.xml / coins_chest_contents.xml). */
export const ChestButton: FC<ChestButtonProps> = ({
    wide = false,
    icon = false,
    fixed = false,
    footer = false,
    className = '',
    type = 'button',
    children,
    ...rest
}) => {
    const classes = [
        'octane-chest__btn',
        wide ? 'octane-chest__btn--wide' : '',
        icon ? 'octane-chest__btn--icon' : '',
        fixed ? 'octane-chest__btn--fixed' : '',
        footer ? 'octane-chest__btn--footer' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={classes} {...rest}>
            {children}
        </button>
    );
};
