import { fireEvent, screen } from '@testing-library/react';

/**
 * Picks a row of a `common/HierarchicalDropdown` the way a mouse does: open the selector, click through the
 * branch rows named first (a click opens a branch's column, as hovering it does), then click the choice.
 */
export const chooseHierarchicalOption = (trigger: HTMLElement, ...labels: (string | RegExp)[]) => {
    fireEvent.click(trigger);

    labels.forEach((name) => {
        const row = screen.getByRole('menuitem', { name });

        fireEvent.pointerDown(row);
        fireEvent.click(row);
    });
};
