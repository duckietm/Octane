/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, CSSProperties, PropsWithChildren } from 'react';
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
    simpleAlert: vi.fn(),
    sent: [] as unknown[],
    links: [] as string[],
    floorItem: { name: 'Effect: Toggle state', className: 'wf_act_toggle_state' } as { name: string; className: string },
    wiredStyle: '' as string,
    activeWired: [] as number[]
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
        GetSessionDataManager: () => ({ getFloorItemData: () => mocks.floorItem }),
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
    const style = await vi.importActual<typeof import('../../../api/wired/WiredStyle')>('../../../api/wired/WiredStyle');

    return {
    ...header,
    ...style,
    CreateLinkEvent: (link: string) => mocks.links.push(link),
    GetConfigurationValue: () => '',
    NotificationBubbleType: { INFO: 'info' },
    OpenUrl: vi.fn(),
    SendMessageComposer: (composer: unknown) => mocks.sent.push(composer),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 },
    WiredSelectionVisualizer: {
        clearAllSelectionShaders: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        applySelectionShaderToFurni: vi.fn(),
        highlightActiveWired: (id: number) => mocks.activeWired.push(id),
        unhighlightActiveWired: (id: number) => mocks.activeWired.splice(mocks.activeWired.indexOf(id), 1)
    }
    };
});

vi.mock('../../../assets/images/wired/wired_bg_left.png', () => ({ default: 'left.png' }));
vi.mock('../../../assets/images/wired/wired_bg_right.png', () => ({ default: 'right.png' }));
vi.mock('../../../assets/images/wired/type/icon_action.png', () => ({ default: 'icon_action.png' }));

vi.mock('../../../common', () => ({
    Button: ({ children, fullWidth: _fullWidth, classNames: _classNames, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean; classNames?: string[] }>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    OctaneCardView: ({ children, className, style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) => (
        <div data-testid="wired-window" className={className} style={style}>
            {children}
        </div>
    ),
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
    useNotification: () => ({ showSingleBubble: mocks.showSingleBubble, showConfirm: mocks.showConfirm, simpleAlert: mocks.simpleAlert }),
    useWiredTools: () => ({ roomSettings: mocks.roomSettings, accountPreferences: { wiredStyle: mocks.wiredStyle } })
}));

vi.mock('./WiredFurniSelectorView', () => ({ WiredFurniSelectorView: () => null }));

import { TriggerDefinition, WiredActionDefinition, WiredVariableDefinition } from '@octane/renderer';
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
        mocks.simpleAlert.mockReset();
        (mocks.wired as Record<string, unknown>).furniIds2 = null;
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
        expect(mocks.links).toEqual(['wiredmenu/open']);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Close' }));
        expect(mocks.wired.setTrigger).toHaveBeenCalledWith(null);
    });

    it('clear picks pushes the view state first and is on while only the second list has picks', () => {
        const save = vi.fn();
        (mocks.wired as Record<string, unknown>).furniIds2 = [5];
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Clear furni picks' }));
        expect(save).toHaveBeenCalledTimes(1);
        expect(mocks.wired.clearWiredPicks).toHaveBeenCalledTimes(1);
    });

    it('a refused validation shows the save failed alert instead of returning silently', () => {
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} validate={() => false} wiredType="action" />);

        fireEvent.click(screen.getByText('wiredfurni.ready'));
        expect(mocks.wired.saveWired).not.toHaveBeenCalled();
        expect(mocks.simpleAlert).toHaveBeenCalledTimes(1);
        expect(mocks.simpleAlert.mock.calls[0][4]).toBe('Update failed');
    });

    it('shows the error text a view returns', () => {
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} validate={() => 'Pick a variable first'} wiredType="action" />);

        fireEvent.click(screen.getByText('wiredfurni.ready'));
        expect(mocks.simpleAlert.mock.calls[0][0]).toBe('Pick a variable first');
    });

    it('scrolls between a fixed header and footer only when the element allows it', () => {
        const { unmount } = render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);

        expect(screen.getByTestId('wired-window')).not.toHaveClass('octane-wired--scrolling');
        unmount();
        render(<WiredBaseView allowScrolling hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);
        expect(screen.getByTestId('wired-window')).toHaveClass('octane-wired--scrolling');
    });

    it('opens the variable overview on the saved variable from a variable box', () => {
        const original = mocks.wired.trigger;

        mocks.links.length = 0;
        mocks.wired.trigger = Object.assign(Object.create(WiredVariableDefinition.prototype), { ...original, code: 0, stringData: 'score' });
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="variable" />);
        mocks.wired.trigger = original;

        fireEvent.click(screen.getByRole('button', { name: 'View in menu' }));
        expect(mocks.links).toEqual(['wiredmenu/open/variable_overview/score']);
    });

    it('leaves the invert-without-filter question to the save itself, so it is asked once', () => {
        mocks.wired.getSelectorOptions.mockReturnValue({ filter: false, invert: true });
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="selector" />);

        fireEvent.click(screen.getByText('wiredfurni.ready'));
        expect(mocks.showConfirm).not.toHaveBeenCalled();
        expect(mocks.wired.saveWired).toHaveBeenCalledTimes(1);
    });
});

describe('WiredBaseView advanced section', () => {
    afterEach(cleanup);

    const renderWith = (code: number) => {
        const original = mocks.wired.trigger;

        mocks.wired.trigger = Object.assign(Object.create(TriggerDefinition.prototype), { ...original, code });
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="trigger" footer={<span>source rows</span>} />);
        mocks.wired.trigger = original;
    };

    it('keeps an advancedAlwaysVisible element open without the toggle (AIR ReceiveLinkMessage)', () => {
        renderWith(29);

        expect(screen.getByText('source rows')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'wiredfurni.params.sources.expand' })).toBeNull();
    });

    it('folds the advanced section of any other element', () => {
        renderWith(1);

        expect(screen.getByText('source rows')).not.toBeVisible();
        expect(screen.getByRole('button', { name: 'wiredfurni.params.sources.expand' })).toBeInTheDocument();
    });
});

describe('WiredBaseView styles', () => {
    afterEach(() => {
        cleanup();
        mocks.floorItem = { name: 'Effect: Toggle state', className: 'wf_act_toggle_state' };
        mocks.wiredStyle = '';
    });

    const renderAction = () => {
        const original = mocks.wired.trigger;

        mocks.wired.trigger = Object.assign(Object.create(WiredActionDefinition.prototype), { ...original, code: 0 });
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);
        mocks.wired.trigger = original;
    };

    it('opens in Illumina by default, 240 wide, with the split header', () => {
        renderAction();

        const window = screen.getByTestId('wired-window');

        expect(window).toHaveClass('octane-wired--style-illumina');
        expect(window.style.width).toBe('240px');
        expect(window.style.getPropertyValue('--wired-frame')).toBe('#e2e2e2');
        expect(screen.getByText('EFFECT')).toBeInTheDocument();
    });

    it('wears the picked Volter style: type icon and the whole name on one line', () => {
        mocks.wiredStyle = 'volter';
        renderAction();

        expect(screen.getByTestId('wired-window')).toHaveClass('octane-wired--style-volter', 'octane-wired--volter');
        expect(screen.getByText('Effect: Toggle state')).toBeInTheDocument();
        expect(screen.queryByText('EFFECT')).toBeNull();
        expect(document.querySelector('.octane-wired__summary-icon')).toHaveAttribute('src', 'icon_action.png');
    });

    it('forces the proto style of its furni class over the pick, 256 wide', () => {
        mocks.wiredStyle = 'illumina';
        mocks.floorItem = { name: 'Effect: Toggle state', className: 'wf_ltdproto_act_toggle_state' };
        renderAction();

        const window = screen.getByTestId('wired-window');

        expect(window).toHaveClass('octane-wired--style-volter_yellow', 'octane-wired--inner-border');
        expect(window.style.width).toBe('256px');
        expect(window.style.getPropertyValue('--wired-background')).toBe('#faea7c');
    });
});

describe('WiredBaseView active box', () => {
    afterEach(cleanup);

    it('tints the open box and lets go of it when the window closes', () => {
        const { unmount } = render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);

        expect(mocks.activeWired).toEqual([77]);
        unmount();
        expect(mocks.activeWired).toEqual([]);
    });
});
