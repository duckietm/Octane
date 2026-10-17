/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    wired: {
        trigger: { id: 77, spriteId: 1, intData: [1], stringData: '', selectedItems: [] as number[] },
        setTrigger: vi.fn(),
        setIntParams: vi.fn(),
        setStringParam: vi.fn(),
        setFurniIds: vi.fn(),
        furniIds: [] as number[],
        setAllowsFurni: vi.fn(),
        saveWired: vi.fn(),
        saveWiredAndKeepOpen: vi.fn(),
        clipboardEntry: null as unknown,
        copyWiredToClipboard: vi.fn(),
        pasteWiredFromClipboard: vi.fn(),
        resetWiredToDefault: vi.fn(),
        clearWiredPicks: vi.fn(),
        pasteIntoMode: false,
        setPasteIntoMode: vi.fn(),
        getSelectorOptions: vi.fn()
    },
    roomSettings: { canModify: true },
    showSingleBubble: vi.fn(),
    showConfirm: vi.fn(),
    sent: [] as unknown[],
    links: [] as string[]
}));

vi.mock('@octane/renderer', () => {
    class Triggerable {}
    class ConditionDefinition extends Triggerable {}
    class TriggerDefinition extends Triggerable {}
    class WiredActionDefinition extends Triggerable {}
    class WiredAddonDefinition extends Triggerable {}
    class WiredSelectorDefinition extends Triggerable {}
    class WiredVariableDefinition extends Triggerable {}
    class ApplySnapshotMessageComposer {
        constructor(public id: number) {}
    }

    return {
        ApplySnapshotMessageComposer,
        ConditionDefinition,
        GetRoomEngine: () => ({ areaSelectionManager: { clearHighlight: vi.fn(), deactivate: vi.fn() } }),
        GetSessionDataManager: () => ({ getFloorItemData: () => ({ name: 'Effect: Toggle state' }) }),
        Triggerable,
        TriggerDefinition,
        WiredActionDefinition,
        WiredAddonDefinition,
        WiredSelectorDefinition,
        WiredVariableDefinition
    };
});

vi.mock('../../../api', async () => {
    const header = await vi.importActual<typeof import('../../../api/wired/WiredHeaderButton')>('../../../api/wired/WiredHeaderButton');

    return {
    ...header,
    CreateLinkEvent: (link: string) => mocks.links.push(link),
    GetConfigurationValue: () => '',
    NotificationBubbleType: { INFO: 'info' },
    OpenUrl: vi.fn(),
    SendMessageComposer: (composer: unknown) => mocks.sent.push(composer),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 },
    WiredSelectionVisualizer: { clearAllSelectionShaders: vi.fn(), clearSelectionShaderFromFurni: vi.fn(), applySelectionShaderToFurni: vi.fn() },
    wiredStyleClassName: () => ''
    };
});

vi.mock('../../../assets/images/wired/wired_bg_left.png', () => ({ default: 'left.png' }));
vi.mock('../../../assets/images/wired/wired_bg_right.png', () => ({ default: 'right.png' }));

vi.mock('../../../common', () => ({
    Button: ({ children, fullWidth: _fullWidth, classNames: _classNames, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean; classNames?: string[] }>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText, children }: PropsWithChildren<{ headerText: string }>) => (
        <div>
            {headerText}
            {children}
        </div>
    ),
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../hooks', () => ({
    useWired: () => mocks.wired,
    useNotification: () => ({ showSingleBubble: mocks.showSingleBubble, showConfirm: mocks.showConfirm }),
    useWiredTools: () => ({ roomSettings: mocks.roomSettings, accountPreferences: { wiredStyle: 'default' } })
}));

vi.mock('./WiredFurniSelectorView', () => ({ WiredFurniSelectorView: () => null }));

import { WiredBaseView } from './WiredBaseView';

const openMenu = () => {
    const toggle = screen.getByRole('button', { name: 'Menu' });

    // Base UI opens its menu on mousedown (a real click is pointerdown, mousedown, mouseup, click).
    fireEvent.pointerDown(toggle);
    fireEvent.mouseDown(toggle);
    fireEvent.mouseUp(toggle);
    fireEvent.click(toggle);
};

describe('WiredBaseView quick menu', () => {
    beforeEach(() => {
        for (const value of Object.values(mocks.wired)) if (typeof value === 'function' && 'mockReset' in value) (value as ReturnType<typeof vi.fn>).mockReset();
        mocks.wired.clipboardEntry = null;
        mocks.wired.furniIds = [];
        mocks.roomSettings.canModify = true;
        mocks.showSingleBubble.mockReset();
        mocks.showConfirm.mockReset();
        mocks.sent.length = 0;
        mocks.links.length = 0;
    });

    afterEach(cleanup);

    it('copy pushes the view state first, paste waits for a fitting entry', () => {
        const save = vi.fn();
        const { rerender } = render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);

        openMenu();
        expect(screen.getByRole('menuitem', { name: 'Paste' })).toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }));
        expect(save).toHaveBeenCalledTimes(1);
        expect(mocks.wired.copyWiredToClipboard).toHaveBeenCalledTimes(1);
        expect(mocks.showSingleBubble).toHaveBeenCalledWith('Copied', 'info');

        mocks.wired.clipboardEntry = { key: 'action:7' };
        rerender(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Paste' }));
        expect(mocks.wired.pasteWiredFromClipboard).toHaveBeenCalledWith(false);

        // Official paste into: switching it on pushes the view's settings first.
        save.mockClear();
        openMenu();
        fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Paste into/ }));
        expect(save).toHaveBeenCalledTimes(1);
        expect(mocks.wired.setPasteIntoMode).toHaveBeenCalledWith(true);
    });

    it('save goes through the keep-open save', () => {
        const save = vi.fn();
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Save' }));

        expect(save).toHaveBeenCalledTimes(1);
        expect(mocks.wired.saveWiredAndKeepOpen).toHaveBeenCalledTimes(1);
        expect(mocks.wired.saveWired).not.toHaveBeenCalled();
    });

    it('reset and clear picks reach the hook, and everything is off without modify rights', () => {
        mocks.wired.furniIds = [900];
        const { unmount } = render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Clear furni picks' }));
        expect(mocks.wired.clearWiredPicks).toHaveBeenCalledTimes(1);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Reset to default' }));
        expect(mocks.wired.resetWiredToDefault).toHaveBeenCalledTimes(1);
        unmount();

        mocks.roomSettings.canModify = false;
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);
        openMenu();
        expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitem', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('has the official open-menu and close entries and splits the header name', () => {
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);

        expect(screen.getByText('EFFECT')).toBeInTheDocument();
        expect(screen.getByText('Toggle state')).toBeInTheDocument();
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Open the Wired Creator Tools' }));
        expect(mocks.links).toEqual(['wired-tools/show']);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Close' }));
        expect(mocks.wired.setTrigger).toHaveBeenCalledWith(null);
    });

    it('asks before saving a selector that inverts without filtering', () => {
        mocks.wired.getSelectorOptions.mockReturnValue({ filter: false, invert: true });
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="selector" />);

        fireEvent.click(screen.getByText('wiredfurni.ready'));
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.wired.saveWired).not.toHaveBeenCalled();

        act(() => mocks.showConfirm.mock.calls[0][1]());
        expect(mocks.wired.saveWired).toHaveBeenCalledTimes(1);
    });
});
