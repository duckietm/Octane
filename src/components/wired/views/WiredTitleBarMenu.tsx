import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../api';

/**
 * The menu the official client puts at the LEFT end of the wired title bar, mirroring its
 * `illumina_light_frame_wired` layout: the menu button is pinned at x=8 while the close button
 * travels with the right edge.
 *
 * Row order and the disabled rules come from the official frame: everything greys out without
 * write permission except "open creator tools" and "close", paste also needs a clipboard entry,
 * and clearing picks needs something picked.
 */
export interface WiredMenuItem {
    key: string;
    label: string;
    tooltip?: string;
    disabled?: boolean;
    /** A separator line, drawn where the official menu has a spacer. */
    separatorBefore?: boolean;
    onClick?: () => void;
}

export const WiredTitleBarMenu: FC<{ items: WiredMenuItem[] }> = ({ items }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const onPick = (item: WiredMenuItem) => {
        if (item.disabled) return;

        setOpen(false);

        if (item.onClick) item.onClick();
    };

    return (
        <div ref={wrapperRef} className="octane-wired__menu-anchor">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={LocalizeText('wiredfurni.title')}
                className="octane-wired__menu-button"
                onClick={() => setOpen((value) => !value)}
                onMouseDownCapture={(event) => event.stopPropagation()}
            />
            {open && (
                <div className="octane-wired__menu" role="menu">
                    {items.map((item) => (
                        <div key={item.key}>
                            {item.separatorBefore && <div className="octane-wired__menu-separator" />}
                            <button
                                type="button"
                                role="menuitem"
                                disabled={item.disabled}
                                title={item.tooltip}
                                className="octane-wired__menu-item"
                                onClick={() => onPick(item)}
                            >
                                {item.label}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
