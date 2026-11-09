/* @vitest-environment jsdom */

import { AddLinkEventTracker, CreateLinkEvent, ILinkEventTracker } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../api')>();

    return {
        ...actual,
        LocalizeText: (key: string) => key,
        GetConfigurationValue: (key: string, fallback: unknown) => (key === 'image.library.url' ? 'https://images/c_images/' : fallback)
    };
});

vi.mock('../../../../common', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../common')>();

    return {
        ...actual,
        OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
        OctaneCardHeaderView: ({ headerText, onCloseClick }: { headerText: string; onCloseClick: () => void }) => (
            <div>
                <span>{headerText}</span>
                <button type="button" onClick={onCloseClick}>
                    close
                </button>
            </div>
        ),
        OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>
    };
});

import { VipRequiredView } from '../../../room/widgets/furniture/context-menu/VipRequiredView';
import { VipBenefitsView } from './VipBenefitsView';

const tracker = (): ILinkEventTracker => vi.mocked(AddLinkEventTracker).mock.calls.at(-1)[0] as ILinkEventTracker;

describe('VipBenefitsView', () => {
    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        vi.mocked(CreateLinkEvent).mockClear();
    });

    afterEach(() => cleanup());

    it('opens on its link with the AIR images, title and Flash html texts', () => {
        render(<VipBenefitsView />);

        expect(tracker().eventUrlPrefix).toBe('vip-benefits/');
        expect(screen.queryByTestId('vip-benefits-title')).toBeNull();

        act(() => tracker().linkReceived('vip-benefits/show'));

        expect(screen.getByText('HC Benefits')).toBeTruthy();
        expect(screen.getByTestId('vip-benefits-title').textContent).toBe('Be in the spotlight!');
        const sources = Array.from(document.querySelectorAll('img')).map((image) => image.getAttribute('src'));
        expect(sources).toEqual(['https://images/c_images/directVipBuy/hc_benefits_header.png', 'https://images/c_images/directVipBuy/hc_benefits_teaser.png']);
        expect(screen.getByTestId('vip-benefits-description').innerHTML).toContain('<span style="font-size: 24px">Create</span>');

        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        expect(screen.queryByTestId('vip-benefits-title')).toBeNull();
    });
});

describe('VipRequiredView', () => {
    beforeEach(() => vi.mocked(CreateLinkEvent).mockClear());

    afterEach(() => cleanup());

    it('opens the HC Center or the benefits window like AIR', () => {
        const onClose = vi.fn();

        render(<VipRequiredView kind="gate" onClose={onClose} />);

        expect(screen.getByTestId('vip-required-body').textContent).toBe("Looks like you're not an HC member! You need HC to walk through this gate.");

        fireEvent.click(screen.getByRole('button', { name: "What's so great about Habbo HC?" }));
        expect(CreateLinkEvent).toHaveBeenLastCalledWith('vip-benefits/show');
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Get HC!' }));
        expect(CreateLinkEvent).toHaveBeenLastCalledWith('habboUI/open/hccenter');
        expect(onClose).toHaveBeenCalled();
    });
});
