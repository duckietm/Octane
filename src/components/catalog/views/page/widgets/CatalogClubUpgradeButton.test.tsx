import { CreateLinkEvent } from '@octane/renderer';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogClubUpgradeButton } from './CatalogClubUpgradeButton';

vi.mock('../../../../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../api')>();

    return { ...actual, LocalizeText: (key: string) => key };
});

afterEach(cleanup);

describe('catalog club upgrade action', () => {
    it('explains the club requirement and offers the club with its own texts', () => {
        render(<CatalogClubUpgradeButton onOpenClubCenter={() => undefined} />);

        expect(screen.getByText('catalog.buy.widget.get.vip.to.unlock.this.product')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'catalog.buy.widget.get.vip.button' })).toBeInTheDocument();
        expect(screen.queryByText('catalog.alert.hc.required')).not.toBeInTheDocument();
    });

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
