import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));

import { selectOption } from '../../../../test-utils/selectOption';
import { ChestAppearanceFields, ChestSettingsSection } from './ChestSettingsFields';

afterEach(() => cleanup());

const STATE = 'wiredchests.settings.appearance.state';
const PREVIEW = 'wiredchests.settings.appearance.preview';
const AMOUNT = 'wiredchests.settings.appearance.preview_amount';

type Looks = { state: number; previewMode: number; previewAmount: number };

/** The fields wired to local state, the way the chest settings window keeps them until it saves. */
const Harness = ({ initial, isFurni = true, onRender }: { initial: Looks; isFurni?: boolean; onRender: (looks: Looks) => void }) => {
    const [looks, setLooks] = useState(initial);

    onRender(looks);

    return (
        <ChestAppearanceFields
            isFurni={isFurni}
            state={looks.state}
            previewMode={looks.previewMode}
            previewAmount={looks.previewAmount}
            onStateChange={(state) => setLooks((current) => ({ ...current, state }))}
            onPreviewModeChange={(previewMode) => setLooks((current) => ({ ...current, previewMode }))}
            onPreviewAmountChange={(previewAmount) => setLooks((current) => ({ ...current, previewAmount }))}
        />
    );
};

const openOptions = (label: string) => {
    fireEvent.click(screen.getByRole('combobox', { name: label }));

    return screen.getAllByRole('option').map((option) => option.textContent);
};

describe('ChestAppearanceFields', () => {
    it('offers four states and, for a furni chest, eight preview modes and amounts one to four', () => {
        render(<Harness initial={{ state: 0, previewMode: 1, previewAmount: 1 }} onRender={() => {}} />);

        expect(openOptions(STATE)).toHaveLength(4);
        cleanup();
        render(<Harness initial={{ state: 0, previewMode: 1, previewAmount: 1 }} onRender={() => {}} />);
        expect(openOptions(PREVIEW)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((mode) => `${PREVIEW}.${mode}`));
        cleanup();
        render(<Harness initial={{ state: 0, previewMode: 1, previewAmount: 1 }} onRender={() => {}} />);
        expect(openOptions(AMOUNT)).toEqual(['1', '2', '3', '4']);
    });

    it('keeps the chosen values as numbers', () => {
        let latest: Looks = null;
        render(<Harness initial={{ state: 1, previewMode: 3, previewAmount: 2 }} onRender={(looks) => (latest = looks)} />);

        selectOption(screen.getByRole('combobox', { name: STATE }), `${STATE}.3`);
        selectOption(screen.getByRole('combobox', { name: PREVIEW }), `${PREVIEW}.7`);
        selectOption(screen.getByRole('combobox', { name: AMOUNT }), '4');

        expect(latest).toEqual({ state: 3, previewMode: 7, previewAmount: 4 });
    });

    it('greys the amount out when the preview is off and keeps its value for when it comes back on', () => {
        let latest: Looks = null;
        render(<Harness initial={{ state: 0, previewMode: 2, previewAmount: 3 }} onRender={(looks) => (latest = looks)} />);

        selectOption(screen.getByRole('combobox', { name: PREVIEW }), `${PREVIEW}.0`);

        expect(screen.getByRole('combobox', { name: AMOUNT }).hasAttribute('data-disabled')).toBe(true);
        expect(latest.previewAmount).toBe(3);

        selectOption(screen.getByRole('combobox', { name: PREVIEW }), `${PREVIEW}.4`);

        expect(screen.getByRole('combobox', { name: AMOUNT }).hasAttribute('data-disabled')).toBe(false);
        expect(latest).toEqual({ state: 0, previewMode: 4, previewAmount: 3 });
    });

    it('shows only the state for a coin chest', () => {
        render(<Harness initial={{ state: 2, previewMode: 1, previewAmount: 1 }} isFurni={false} onRender={() => {}} />);

        expect(screen.getAllByRole('combobox')).toHaveLength(1);
        expect(screen.getByRole('combobox', { name: STATE })).toBeTruthy();
    });
});

describe('ChestSettingsSection', () => {
    it('captions its group with the title', () => {
        render(<ChestSettingsSection title="Access"><span>content</span></ChestSettingsSection>);

        expect(screen.getByRole('group', { name: 'Access' })).toBeTruthy();
    });
});
