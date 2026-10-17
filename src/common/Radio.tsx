import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { ComponentProps, FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface RadioProps extends Omit<ComponentProps<typeof BaseRadio.Root>, 'onChange' | 'className' | 'value' | 'render'> {
    checked?: boolean;
    className?: string;
    name?: string;
    /** Fires when the radio becomes checked, like a native radio's change event. */
    onCheckedChange?: () => void;
}

const CHECKED = 'on';
const SYNC_EVENT = 'octane-radio-sync';
const NAME_ATTRIBUTE = 'data-radio-name';

/** Radios that share a `name` inside the same window / form / document, in DOM order. */
const getPeers = (element: HTMLElement, name: string): HTMLElement[] => {
    const scope = element.closest('form, [role="dialog"], .draggable-window, .octane-card') ?? document;

    return Array.from(scope.querySelectorAll<HTMLElement>(`[role="radio"][${NAME_ATTRIBUTE}="${CSS.escape(name)}"]`));
};

const isEnabled = (element: HTMLElement) => element.getAttribute('aria-disabled') !== 'true';

/**
 * A standalone, controlled Base UI radio: it is its own one-item group, so it
 * stays a drop-in for `<input type="radio" checked onChange>`. The skin lives on
 * `.octane-radio` (HabboTheme.css / WiredView.css), driven by `data-checked`.
 *
 * Radios that share a `name` still behave as one native group: the arrow keys move
 * the selection between them and only the checked one is a tab stop.
 */
export const Radio: FC<RadioProps> = (props) => {
    const { checked = false, className, name, onCheckedChange, onKeyDown, disabled, readOnly, required, ...rest } = props;
    const rootRef = useRef<HTMLElement | null>(null);
    const [tabbable, setTabbable] = useState(true);

    const sync = useCallback(() => {
        const element = rootRef.current;

        if (!element || !name) return;

        // Read the DOM, not `checked`: a peer's listener can run before this radio re-rendered.
        const peers = getPeers(element, name);
        const anyChecked = peers.some((peer) => peer.getAttribute('aria-checked') === 'true');

        setTabbable(element.getAttribute('aria-checked') === 'true' || !anyChecked);
    }, [name]);

    useLayoutEffect(() => {
        sync();

        if (name) document.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: name }));
    }, [sync, name, checked]);

    useEffect(() => {
        if (!name) return;

        const onSync = (event: Event) => {
            if ((event as CustomEvent<string>).detail === name) sync();
        };

        document.addEventListener(SYNC_EVENT, onSync);

        return () => document.removeEventListener(SYNC_EVENT, onSync);
    }, [name, sync]);

    const handleKeyDown: NonNullable<ComponentProps<typeof BaseRadio.Root>['onKeyDown']> = (event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || !name || readOnly || disabled) return;

        const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';

        if (!forward && !backward) return;

        const peers = getPeers(event.currentTarget, name).filter((peer) => peer === event.currentTarget || isEnabled(peer));
        const index = peers.indexOf(event.currentTarget);

        if (index < 0 || peers.length < 2) return;

        event.preventDefault();
        event.stopPropagation();

        const target = peers[(index + (forward ? 1 : -1) + peers.length) % peers.length];

        target.focus();
        target.click();
    };

    return (
        <BaseRadioGroup
            // An <i>, not a div: host windows style `div` / `span` / `input` children generically.
            render={<i className="octane-radio-group" />}
            disabled={disabled}
            name={name}
            readOnly={readOnly}
            required={required}
            value={checked ? CHECKED : ''}
            onValueChange={() => onCheckedChange?.()}
        >
            <BaseRadio.Root
                ref={rootRef}
                render={<i />}
                className={className ? `octane-radio ${className}` : 'octane-radio'}
                tabIndex={tabbable ? 0 : -1}
                value={CHECKED}
                {...{ [NAME_ATTRIBUTE]: name }}
                {...rest}
                onKeyDown={handleKeyDown}
            />
        </BaseRadioGroup>
    );
};
