/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingSoundboardTab } from './HousekeepingSoundboardTab';

const mocks = vi.hoisted(() => ({
    playSoundboard: vi.fn().mockResolvedValue(true),
    request: vi.fn(),
    upsert: vi.fn(),
    reorder: vi.fn(),
    lastResult: null as { operation: number; resultCode: number; soundId: number } | null,
    pendingOperation: null as number | null,
    sounds: [
        { id: 7, name: 'Campanella', url: '/bell.mp3', enabled: true, sortOrder: 10, minRank: 1 },
        { id: 12, name: 'Applauso', url: '/clap.mp3', enabled: false, sortOrder: 20, minRank: 5 }
    ]
}));

vi.mock('@octane/renderer', () => ({
    GetSoundManager: () => ({ playSoundboard: mocks.playSoundboard })
}));

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (key: string) => (key === 'asset.url' ? 'https://assets.example.test' : ''),
    LocalizeText: (key: string) =>
        ({
            'housekeeping.soundboard.search': 'Search sounds',
            'housekeeping.soundboard.filter': 'Filter sounds',
            'housekeeping.soundboard.filter.all': 'All',
            'housekeeping.soundboard.filter.enabled': 'Enabled',
            'housekeeping.soundboard.filter.disabled': 'Disabled',
            'housekeeping.soundboard.name': 'Name',
            'housekeeping.soundboard.url': 'URL',
            'housekeeping.soundboard.min_rank': 'Minimum rank',
            'housekeeping.soundboard.enabled': 'Enabled',
            'housekeeping.soundboard.create': 'New sound',
            'housekeeping.soundboard.save': 'Save sound',
            'housekeeping.soundboard.preview': 'Preview',
            'housekeeping.soundboard.preview_failed': 'Preview failed',
            'housekeeping.soundboard.edit': 'Edit',
            'housekeeping.soundboard.move_up': 'Move up',
            'housekeeping.soundboard.move_down': 'Move down',
            'housekeeping.soundboard.save_order': 'Save order'
        })[key] || key
}));

vi.mock('../../../../hooks', () => ({
    useSoundboardCatalog: () => ({
        sounds: mocks.sounds,
        lastResult: mocks.lastResult,
        pendingOperation: mocks.pendingOperation,
        request: mocks.request,
        upsert: mocks.upsert,
        reorder: mocks.reorder
    }),
    useSoundboardManifest: () => ({
        manifest: { categories: [], byClassname: new Map() },
        manifestRef: { current: { categories: [], byClassname: new Map() } },
        classnames: [],
        loaded: true
    })
}));

describe('HousekeepingSoundboardTab', () => {
    beforeEach(() => {
        mocks.playSoundboard.mockClear();
        mocks.request.mockClear();
        mocks.upsert.mockClear();
        mocks.reorder.mockClear();
        mocks.lastResult = null;
        mocks.pendingOperation = null;
    });
    afterEach(cleanup);

    it('searches, filters, edits enabled state, and never exposes deletion', () => {
        const { container } = render(<HousekeepingSoundboardTab />);
        expect(mocks.request).toHaveBeenCalledOnce();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search sounds' }), { target: { value: '12' } });
        expect(container.textContent).toContain('Applauso');
        expect(container.textContent).not.toContain('Campanella');

        fireEvent.change(screen.getByRole('combobox', { name: 'Filter sounds' }), { target: { value: 'enabled' } });
        expect(container.textContent).not.toContain('Applauso');

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search sounds' }), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Edit Campanella' }));
        expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked();
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('validates creation and previews through renderer audio only', () => {
        render(<HousekeepingSoundboardTab />);
        fireEvent.click(screen.getByRole('button', { name: 'New sound' }));
        expect(screen.getByRole('button', { name: 'Save sound' })).toBeDisabled();

        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Fanfara' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'sounds/fanfare.mp3' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum rank' }), { target: { value: '1' } });

        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        expect(mocks.playSoundboard).toHaveBeenCalledWith('https://assets.example.test/sounds/fanfare.mp3');
        fireEvent.click(screen.getByRole('button', { name: 'Save sound' }));
        expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 0, name: 'Fanfara', enabled: true }));
    });

    it('adopts the server id after creation so a second save updates the same sound', () => {
        const view = render(<HousekeepingSoundboardTab />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Fanfara' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), { target: { value: '/fanfare.mp3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save sound' }));

        mocks.lastResult = { operation: 1, resultCode: 0, soundId: 33 };
        view.rerender(<HousekeepingSoundboardTab />);
        fireEvent.click(screen.getByRole('button', { name: 'Save sound' }));

        expect(mocks.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ id: 33, name: 'Fanfara' }));
    });

    it('locks the draft while a catalog mutation is pending', () => {
        mocks.pendingOperation = 1;
        render(<HousekeepingSoundboardTab />);

        expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
        expect(screen.getByRole('textbox', { name: 'URL' })).toBeDisabled();
        expect(screen.getByRole('spinbutton', { name: 'Minimum rank' })).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'New sound' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Edit Campanella' })).toBeDisabled();
    });

    it('surfaces renderer preview failures', async () => {
        mocks.playSoundboard.mockResolvedValueOnce(false);
        render(<HousekeepingSoundboardTab />);
        fireEvent.click(screen.getByRole('button', { name: 'Preview Campanella' }));

        await waitFor(() => expect(screen.getByText('Preview failed')).toBeInTheDocument());
    });

    it('supports keyboard ordering and saves one complete order', () => {
        render(<HousekeepingSoundboardTab />);
        const campanellaRow = screen.getByTestId('soundboard-catalog-row-7');
        fireEvent.click(within(campanellaRow).getByRole('button', { name: 'Move down Campanella' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save order' }));

        expect(mocks.reorder).toHaveBeenCalledWith([12, 7]);
    });

    it('is routed only through the dedicated Housekeeping permission', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/housekeeping/HousekeepingView.tsx'), 'utf8');

        expect(source).toContain("useHasPermission('acc_soundboard_manage')");
        expect(source).toContain('showSoundboard');
        expect(source).toContain('activeTab === HousekeepingTabId.SOUNDBOARD && !canManageSoundboard');
        expect(source).toContain('setActiveTab(HousekeepingTabId.USERS)');
    });
});
