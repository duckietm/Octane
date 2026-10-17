import { fireEvent, screen } from '@testing-library/react';

/**
 * Picks an option of a Base UI `common/Select` the way a mouse does: open the
 * trigger, then pointer-down + click the option (Base UI ignores a bare click).
 * Replaces `fireEvent.change(nativeSelect, { target: { value } })`.
 */
export const selectOption = (trigger: HTMLElement, name: string | RegExp) => {
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name });

    fireEvent.pointerDown(option);
    fireEvent.click(option);
};
