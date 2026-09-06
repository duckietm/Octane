import { CreateLinkEvent } from '@octane/renderer';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogClubUpgradeButton } from './CatalogClubUpgradeButton';

afterEach(cleanup);

describe('catalog club upgrade action', () => {
    it('keeps the membership requirement actionable', () => {
        const onOpenClubCenter = vi.fn();

        render(<CatalogClubUpgradeButton onOpenClubCenter={onOpenClubCenter} />);

        const button = screen.getByRole('button');

        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(onOpenClubCenter).toHaveBeenCalledOnce();
    });

    it('opens the configured membership center by default', () => {
        const createLinkEvent = vi.mocked(CreateLinkEvent);

        createLinkEvent.mockClear();
        render(<CatalogClubUpgradeButton />);
        fireEvent.click(screen.getByRole('button'));

        expect(createLinkEvent).toHaveBeenCalledWith('habboUI/open/hccenter');
    });
});
