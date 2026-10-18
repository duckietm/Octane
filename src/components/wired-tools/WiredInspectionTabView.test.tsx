import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: string) => fallback,
    LocalizeText: (key: string) => (key === 'wiredmenu.inspection.highlight_wireds' ? 'Highlight Wired boxes that have this furni in their furni picks' : key)
}));

vi.mock('../../common', () => ({
    Button: ({ children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    LayoutAvatarImageView: () => null,
    LayoutPetImageView: () => null,
    LayoutRoomObjectImageView: () => null,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredCreatorTools.constants', () => ({
    INSPECTION_ELEMENTS: []
}));

const uiState = {
    inspectionType: 'furni',
    setInspectionType: vi.fn(),
    isInspectionGiveOpen: false,
    setIsInspectionGiveOpen: vi.fn(),
    editingVariable: null as string | null,
    editingValue: '',
    setEditingValue: vi.fn()
};

vi.mock('./wiredCreatorToolsUiStore', () => ({
    useWiredCreatorToolsUiStore: (selector: (state: typeof uiState) => unknown) => selector(uiState)
}));

import { WiredInspectionTabView } from './WiredInspectionTabView';

const HIGHLIGHT = 'Highlight Wired boxes that have this furni in their furni picks';

const renderTab = (overrides: Partial<Parameters<typeof WiredInspectionTabView>[0]> = {}) =>
    render(
        <WiredInspectionTabView
            selectedFurni={null}
            selectedUser={null}
            roomId={1}
            previewPlaceholder="Select a furni"
            keepSelected={false}
            onKeepSelectedChange={vi.fn()}
            displayedVariables={[]}
            selectedInspectionVariableKey=""
            onSelectInspectionVariable={vi.fn()}
            onCancelVariableEdit={vi.fn()}
            onVariableInputKeyDown={vi.fn()}
            onBeginVariableEdit={vi.fn()}
            selectedInspectionGiveDefinition={null}
            onSelectGiveVariable={vi.fn()}
            availableInspectionDefinitions={[]}
            inspectionGiveValue="0"
            onInspectionGiveValueChange={vi.fn()}
            canGiveInspectionVariable={false}
            onGiveInspectionVariable={vi.fn()}
            canRemoveInspectionVariable={false}
            onRemoveInspectionVariable={vi.fn()}
            {...overrides}
        />
    );

describe('WiredInspectionTabView', () => {
    afterEach(() => {
        cleanup();
        uiState.inspectionType = 'furni';
    });

    it('shows the highlight button on the furni preview, disabled while no box picks the furni', () => {
        renderTab();

        expect(screen.getByTitle(HIGHLIGHT)).toBeDisabled();
    });

    it('toggles the highlight of the boxes that pick the furni', () => {
        const onToggleHighlightWireds = vi.fn();

        renderTab({ canHighlightWireds: true, isHighlightingWireds: true, onToggleHighlightWireds });

        const button = screen.getByTitle(HIGHLIGHT);

        expect(button).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(button);
        expect(onToggleHighlightWireds).toHaveBeenCalledTimes(1);
    });

    it('has no highlight button for a user or the room', () => {
        uiState.inspectionType = 'user';
        renderTab({ canHighlightWireds: true });

        expect(screen.queryByTitle(HIGHLIGHT)).toBeNull();
    });
});
