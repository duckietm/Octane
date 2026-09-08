import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => fallback
}));

vi.mock('../../common', () => ({
    Button: ({ children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredCreatorTools.constants', () => ({
    VARIABLES_ELEMENTS: []
}));

const uiState = {
    variablesType: 'user',
    setVariablesType: vi.fn(),
    isVariableHighlightActive: false,
    setIsVariableHighlightActive: vi.fn()
};

vi.mock('./wiredCreatorToolsUiStore', () => ({
    useWiredCreatorToolsUiStore: (selector: (state: typeof uiState) => unknown) => selector(uiState)
}));

import { WiredVariablesTabView } from './WiredVariablesTabView';

const renderTab = (overrides: Partial<Parameters<typeof WiredVariablesTabView>[0]> = {}) =>
    render(
        <WiredVariablesTabView
            variablePickerDefinitions={[]}
            selectedVariableDefinition={null}
            onPickVariable={vi.fn()}
            canVariableHighlight={false}
            variableManageCanOpen={false}
            onOpenManagePanel={vi.fn()}
            canVariableClear={false}
            onClearVariable={vi.fn()}
            selectedVariableProperties={[]}
            selectedVariableTextValues={[]}
            {...overrides}
        />
    );

describe('WiredVariablesTabView', () => {
    afterEach(cleanup);

    it('offers a clear button next to manage, disabled until a variable of yours is picked', () => {
        renderTab();

        const clear = screen.getByRole('button', { name: 'Clear this variable' });
        expect(clear).toBeDisabled();
    });

    it('asks the parent to clear the picked variable from every holder', () => {
        const onClearVariable = vi.fn();

        renderTab({ canVariableClear: true, onClearVariable });

        fireEvent.click(screen.getByRole('button', { name: 'Clear this variable' }));

        expect(onClearVariable).toHaveBeenCalledTimes(1);
    });
});
