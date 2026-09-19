import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localInputToUnix, RewardTrackAdminView, unixToLocalInput } from './RewardTrackAdminView';

const mocks = vi.hoisted(() => ({
    saveTrack: vi.fn(),
    saveTask: vi.fn(),
    savePrize: vi.fn(),
    saveTexts: vi.fn(),
    searchFurni: vi.fn(),
    deleteEntity: vi.fn(),
    requestData: vi.fn(),
    state: {
        loaded: true,
        pending: false,
        lastResult: null,
        actionTypes: [ 'chat_with_someone', 'place_item' ],
        rewardTypes: [ 'duckets', 'badge', 'furni' ],
        tracks: [
            {
                id: 'season_1',
                theme: 'blue',
                sortOrder: 0,
                startsAt: 0,
                endsAt: 0,
                hasPremium: false,
                premiumBoostPercent: 100,
                premiumInstantPoints: 0,
                premiumCostDiamonds: 0,
                premiumCostCredits: 0,
                enabled: true,
                tasks: [
                    { id: 'talk', actionType: 'chat_with_someone', parameter: '', premium: false, sortOrder: 1, levels: [ { requiredCount: 2, pointsReward: 10, premium: false } ] },
                    { id: 'visit', actionType: 'place_item', parameter: '', premium: false, sortOrder: 2, levels: [ { requiredCount: 3, pointsReward: 10, premium: false } ] }
                ],
                prizes: [ { id: 'p1', requiredPoints: 10, productItemTypeId: 0, rewardType: 'duckets', extraParams: '', rewardAmount: 50, premium: false, sortOrder: 1, claimedCount: 12 } ],
                texts: { name: 'Season one' }
            },
            { id: 'old_one', theme: 'red', sortOrder: 1, startsAt: 0, endsAt: 1_000_000, hasPremium: false, premiumBoostPercent: 100, premiumInstantPoints: 0, premiumCostDiamonds: 0, premiumCostCredits: 0, enabled: true, tasks: [], prizes: [], texts: {} }
        ]
    }
}));

vi.mock('../../api', async () => {
    const rules = await import('../../api/quests/RewardTrackAdminRules');

    return { ...rules, localizeWithFallback: (_key: string, fallback: string) => fallback };
});
vi.mock('../../hooks', () => ({
    useRewardTrackAdmin: () => ({
        ...mocks.state,
        requestData: mocks.requestData,
        saveTrack: mocks.saveTrack,
        saveTask: mocks.saveTask,
        savePrize: mocks.savePrize,
        saveTexts: mocks.saveTexts,
        searchFurni: mocks.searchFurni,
        furniSearch: null,
        deleteEntity: mocks.deleteEntity
    })
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

/** Renders the editor and unfolds both panels, which start folded. */
const renderOpen = (onPreview?: (id: string) => void) => {
    const result = render(<RewardTrackAdminView onClose={() => null} onPreview={onPreview} />);

    fireEvent.click(screen.getByTestId('rt-admin-collapse-tasks'));
    fireEvent.click(screen.getByTestId('rt-admin-collapse-prizes'));

    return result;
};

describe('RewardTrackAdminView', () => {
    it('asks for the data once, starts with the panels folded and lists the rows once unfolded', () => {
        render(<RewardTrackAdminView onClose={() => null} />);

        expect(mocks.requestData).toHaveBeenCalledTimes(1);
        expect(screen.queryAllByTestId('rt-admin-task-row')).toHaveLength(0);
        expect(screen.getByText('talk · visit')).toBeTruthy();

        fireEvent.click(screen.getByTestId('rt-admin-collapse-tasks'));
        fireEvent.click(screen.getByTestId('rt-admin-collapse-prizes'));

        expect(screen.getAllByTestId('rt-admin-task-row')).toHaveLength(2);
        expect(screen.getAllByTestId('rt-admin-prize-row')).toHaveLength(1);
    });

    it('edits a task, adds a level and sends the whole task back', () => {
        renderOpen();

        fireEvent.click(screen.getAllByText('Edit')[1]);

        const form = screen.getByTestId('rt-admin-task-form');
        expect(screen.getAllByTestId('rt-admin-level-row')).toHaveLength(1);

        fireEvent.click(screen.getByText('Add level'));
        const rows = screen.getAllByTestId('rt-admin-level-row');
        expect(rows).toHaveLength(2);

        const inputs = rows[1].querySelectorAll('input');
        fireEvent.change(inputs[0], { target: { value: '5' } });
        fireEvent.change(inputs[1], { target: { value: '25' } });
        fireEvent.click(inputs[2]);
        fireEvent.click(within(form).getByText('Save'));

        expect(mocks.saveTask).toHaveBeenCalledWith({
            trackId: 'season_1',
            id: 'talk',
            actionType: 'chat_with_someone',
            parameter: '',
            premium: false,
            sortOrder: 1,
            levels: [
                { requiredCount: 2, pointsReward: 10, premium: false },
                { requiredCount: 5, pointsReward: 25, premium: true }
            ]
        });
    });

    it('points at a broken level and keeps Save closed until it is fixed', () => {
        renderOpen();

        fireEvent.click(screen.getAllByText('Edit')[1]);
        fireEvent.click(screen.getByText('Add level'));

        const rows = screen.getAllByTestId('rt-admin-level-row');
        fireEvent.change(rows[1].querySelectorAll('input')[0], { target: { value: '1' } });

        const form = screen.getByTestId('rt-admin-task-form');
        expect(within(form).getByText('More than the level before')).toBeTruthy();
        expect(screen.getByTestId('rt-admin-form-problems').textContent).toBe('1 field to fix');

        fireEvent.click(within(form).getByText('Save'));
        expect(mocks.saveTask).not.toHaveBeenCalled();
    });

    it('moves a task down by saving the two tasks that swap places', () => {
        renderOpen();

        fireEvent.click(screen.getAllByTestId('rt-admin-task-down')[0]);

        expect(mocks.saveTask).toHaveBeenCalledTimes(2);
        expect(mocks.saveTask.mock.calls[0][0]).toMatchObject({ id: 'visit', sortOrder: 1 });
        expect(mocks.saveTask.mock.calls[1][0]).toMatchObject({ id: 'talk', sortOrder: 2 });
    });

    it('duplicates a track with its tasks and prizes under the new id', () => {
        renderOpen();

        fireEvent.click(screen.getByTestId('rt-admin-duplicate-track'));

        const form = screen.getByTestId('rt-admin-track-form');
        const idInput = form.querySelector('input') as HTMLInputElement;
        expect(idInput.value).toBe('season_1_copy');

        fireEvent.change(idInput, { target: { value: 'season_2' } });
        fireEvent.click(within(form).getByText('Save'));

        expect(mocks.saveTrack).toHaveBeenCalledWith(expect.objectContaining({ id: 'season_2', enabled: false }));
        expect(mocks.saveTask).toHaveBeenCalledTimes(2);
        expect(mocks.saveTask.mock.calls[0][0]).toMatchObject({ trackId: 'season_2', id: 'talk' });
        expect(mocks.savePrize).toHaveBeenCalledWith(expect.objectContaining({ trackId: 'season_2', id: 'p1' }));
    });

    it('offers the twin of a prize on the other row, 20 points further', () => {
        renderOpen();

        fireEvent.click(screen.getByTestId('rt-admin-prize-twin'));

        const form = screen.getByTestId('rt-admin-prize-form');
        const inputs = form.querySelectorAll('input');
        expect((inputs[0] as HTMLInputElement).value).toBe('p1_premium');
        expect((inputs[1] as HTMLInputElement).value).toBe('30');

        fireEvent.click(within(form).getByText('Save'));
        expect(mocks.savePrize).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1_premium', premium: true, requiredPoints: 30 }));
    });

    it('hands the selected track to the preview', () => {
        const onPreview = vi.fn();
        renderOpen(onPreview);

        fireEvent.click(screen.getByTestId('rt-admin-preview'));
        expect(onPreview).toHaveBeenCalledWith('season_1');
    });

    it('deletes only on the second click', () => {
        renderOpen();

        const deleteButtons = screen.getAllByTestId('rt-admin-delete');
        fireEvent.click(deleteButtons[3]);

        expect(mocks.deleteEntity).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('rt-admin-delete-confirm'));
        expect(mocks.deleteEntity).toHaveBeenCalledWith('prize', 'season_1', 'p1');
    });

    it('filters the track list by state and shows the claimed count of a prize', () => {
        renderOpen();

        expect(screen.getAllByTestId('rt-admin-track-item')).toHaveLength(2);
        expect(screen.getByTestId('rt-admin-prize-claimed').textContent).toBe('12');

        fireEvent.click(within(screen.getByTestId('rt-admin-filters')).getByText('expired'));
        expect(screen.getAllByTestId('rt-admin-track-item')).toHaveLength(1);
        expect(screen.getByTestId('rt-admin-track-item').textContent).toContain('old_one');

        fireEvent.click(within(screen.getByTestId('rt-admin-filters')).getByText('active'));
        expect(screen.getByTestId('rt-admin-track-item').textContent).toContain('Season one (season_1)');
    });

    it('edits the texts of the track and its tasks and sends the filled ones', () => {
        renderOpen();

        fireEvent.click(screen.getByTestId('rt-admin-texts'));

        const form = screen.getByTestId('rt-admin-texts-form');
        expect((screen.getByTestId('rt-admin-text-name') as HTMLInputElement).value).toBe('Season one');

        fireEvent.change(screen.getByTestId('rt-admin-text-task.talk.desc'), { target: { value: 'Chat with other Habbos' } });
        fireEvent.click(within(form).getByText('Save'));

        expect(mocks.saveTexts).toHaveBeenCalledWith('season_1', [
            { key: 'name', value: 'Season one' },
            { key: 'task.talk.desc', value: 'Chat with other Habbos' }
        ]);
    });

    it('offers the furni search on a furni prize and puts the pick in the name field', () => {
        renderOpen();

        fireEvent.click(screen.getByText('New prize'));

        const form = screen.getByTestId('rt-admin-prize-form');
        expect(screen.queryByTestId('rt-admin-furni-picker')).toBeNull();

        fireEvent.change(form.querySelector('select'), { target: { value: 'furni' } });
        expect(screen.getByTestId('rt-admin-furni-picker')).toBeTruthy();
    });

    it('converts the track dates both ways and keeps 0 for an empty date', () => {
        expect(unixToLocalInput(0)).toBe('');
        expect(localInputToUnix('')).toBe(0);

        const seconds = 1_800_000_000;
        expect(localInputToUnix(unixToLocalInput(seconds))).toBe(seconds);
    });
});
