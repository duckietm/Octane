import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setQuantifierCode = vi.fn();
let quantifierCode: number | null = null;
let trigger: { quantifierType: number; quantifierCode: number; isInvert: boolean } | null = null;

vi.mock('../../../../api', async () => ({
    ...(await import('../../../../api/wired/WiredConditionQuantifier')),
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, quantifierCode, setQuantifierCode })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredBaseView', () => ({
    WiredBaseView: ({ children, footer }: PropsWithChildren<{ footer?: ReactNode }>) => (
        <div>
            <div data-testid="body">{children}</div>
            <div data-testid="footer">{footer}</div>
        </div>
    )
}));

import { WiredConditionBaseView } from './WiredConditionBaseView';
import { WiredConditionQuantifierSection } from './WiredConditionQuantifierSection';

const radios = () => screen.getAllByRole('radio');

describe('the condition quantifier section (AIR createAdvancedSections)', () => {
    beforeEach(() => {
        setQuantifierCode.mockClear();
        quantifierCode = null;
    });

    afterEach(cleanup);

    it('draws the two options of the definition family and checks the code the box came with', () => {
        trigger = { quantifierType: 2, quantifierCode: 1, isInvert: false };
        render(<WiredConditionQuantifierSection />);

        expect(screen.getByText('wiredfurni.params.quantifier_selection')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.quantifier.users.0')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.quantifier.users.1')).toBeTruthy();
        expect(radios().map((radio) => radio.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    });

    it('labels an inverted condition with the .neg texts and stores the picked code for the save', () => {
        trigger = { quantifierType: 1, quantifierCode: 0, isInvert: true };
        render(<WiredConditionQuantifierSection />);

        expect(screen.getByText('wiredfurni.params.quantifier.furni.neg.0')).toBeTruthy();
        fireEvent.click(radios()[1]);

        expect(setQuantifierCode).toHaveBeenCalledWith(1);
    });

    it('shows the edited code over the one the box came with', () => {
        trigger = { quantifierType: 3, quantifierCode: 1, isInvert: false };
        quantifierCode = 0;
        render(<WiredConditionQuantifierSection />);

        expect(radios().map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    });

    it('draws nothing for a condition without a quantifier', () => {
        trigger = { quantifierType: 0, quantifierCode: 0, isInvert: false };
        const { container } = render(<WiredConditionQuantifierSection />);

        expect(container.innerHTML).toBe('');
    });

    it('puts the section at the top of the advanced footer, before the view own rows', () => {
        trigger = { quantifierType: 2, quantifierCode: 0, isInvert: false };
        render(
            <WiredConditionBaseView hasSpecialInput={true} requiresFurni={0} save={() => null} footer={<span>sources</span>}>
                <span>body</span>
            </WiredConditionBaseView>
        );

        const footer = screen.getByTestId('footer');
        expect(footer.textContent).toBe('wiredfurni.params.quantifier_selectionwiredfurni.params.quantifier.users.0wiredfurni.params.quantifier.users.1sources');
        expect(screen.getByTestId('body').textContent).toBe('body');
    });

    it('leaves the section to a view that places it itself, and adds none without a quantifier', () => {
        trigger = { quantifierType: 2, quantifierCode: 0, isInvert: false };
        const { unmount } = render(<WiredConditionBaseView hasSpecialInput={true} requiresFurni={0} save={() => null} showQuantifier={false} footer={<span>own</span>} />);
        expect(screen.getByTestId('footer').textContent).toBe('own');
        unmount();

        trigger = { quantifierType: 0, quantifierCode: 0, isInvert: false };
        render(<WiredConditionBaseView hasSpecialInput={true} requiresFurni={0} save={() => null} />);
        expect(screen.getByTestId('footer').textContent).toBe('');
    });
});
