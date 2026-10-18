import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({ FurniturePickupAllComposer: class {}, RoomObjectCategory: { FLOOR: 1, WALL: 2, UNIT: 100 } }));
vi.mock('../../../../api', () => ({
    chooserSelectionVisualizer: { clearAll: vi.fn(), show: vi.fn(), hide: vi.fn() },
    localizeWithFallback: (_key: string, fallback: string, names?: string[], values?: string[]) =>
        (names ?? []).reduce((text, name, index) => text.replace('${' + name + '}', values[index]), fallback),
    LocalizeText: (key: string) => key,
    SendMessageComposer: vi.fn()
}));
vi.mock('../../../../hooks', () => ({ useFurniPickupGuard: () => ({ confirmIfWebApiBox: vi.fn() }) }));
vi.mock('../../../../common', () => ({
    Button: (props: { children: ReactNode }) => <button>{props.children}</button>,
    InfiniteScroll: (props: { rows: { id: number }[]; rowRender: (row: never) => ReactNode }) => (
        <div>
            {props.rows.map((row) => (
                <div key={row.id}>{props.rowRender(row as never)}</div>
            ))}
        </div>
    ),
    OctaneCardContentView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardHeaderView: (props: { headerText: string }) => <h1>{props.headerText}</h1>,
    OctaneCardView: (props: { children: ReactNode; className: string }) => (
        <div data-testid="card" className={props.className}>
            {props.children}
        </div>
    )
}));
vi.mock('../../../../layout', () => ({
    classNames: (...values: unknown[]) => values.filter(Boolean).join(' '),
    OctaneInput: (props: { value: string; onChange: (event: { target: { value: string } }) => void; placeholder: string }) => (
        <input placeholder={props.placeholder} value={props.value} onChange={(event) => props.onChange(event)} />
    )
}));

const { chooserSelectionVisualizer } = await import('../../../../api');
const { ChooserWidgetView } = await import('./ChooserWidgetView');

const user = (id: number, name: string, type = '1') => ({ id, category: 100, name, ownerName: '-', ownerId: 0, type }) as never;
const furni = (id: number, name: string, owner: string, category = 1) => ({ id, category, name, ownerName: owner, ownerId: 0, type: 'furniture' }) as never;

afterEach(cleanup);

describe('ChooserWidgetView', () => {
    it('takes the size of the official window for its kind', () => {
        render(<ChooserWidgetView items={[user(1, 'Alice')]} onClose={() => undefined} selectItem={() => undefined} title="Users" type="users" />);
        expect(screen.getByTestId('card').className).toContain('w-[290px]');

        cleanup();
        render(<ChooserWidgetView items={[furni(1, 'Lamp', 'Bob')]} onClose={() => undefined} selectItem={() => undefined} title="Furni" type="furni" />);
        expect(screen.getByTestId('card').className).toContain('w-[413px]');
    });

    it('lists the users with their type, counts them, and a search can be cleared with its cross', () => {
        render(<ChooserWidgetView items={[user(1, 'Alice'), user(2, 'Bob')]} onClose={() => undefined} selectItem={() => undefined} title="Users" type="users" />);

        expect(screen.getByText('2 users found')).toBeTruthy();
        expect(screen.getAllByText('Habbo').length).toBeGreaterThan(0);

        fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'ali' } });
        expect(screen.getByText('1 users found')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
        expect(screen.getByText('2 users found')).toBeTruthy();
    });

    it('shows every furni at first and narrows them to the owner picked in the menu', () => {
        render(
            <ChooserWidgetView
                items={[furni(1, 'Lamp', 'Bob'), furni(2, 'Chair', 'Alice'), furni(3, 'Sofa', 'Bob')]}
                onClose={() => undefined}
                selectItem={() => undefined}
                title="Furni"
                type="furni"
            />
        );

        expect(screen.getByText('3 items found')).toBeTruthy();

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'owner:Bob' } });
        expect(screen.getByText('2 items found')).toBeTruthy();
        expect(screen.getByText('1')).toBeTruthy();
    });

    it('localizes the AIR user types and filters on them, the bot entry on user type 4', () => {
        render(
            <ChooserWidgetView
                items={[user(0, 'Alice'), user(1, 'Rover', '2'), user(2, 'Robo', '4'), user(3, 'Oldbot', '3')]}
                onClose={() => undefined}
                selectItem={() => undefined}
                title="Users"
                type="users"
            />
        );

        expect(screen.getByText('4 users found')).toBeTruthy();
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All types', 'Habbo', 'Pet', 'Bot']);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
        expect(screen.getByText('1 users found')).toBeTruthy();
        expect(screen.getByText('Robo')).toBeTruthy();
    });

    it('selects one row at a time and highlights room index zero', () => {
        const selectItem = vi.fn();
        const items = [user(0, 'Alice'), user(1, 'Bob')];

        render(<ChooserWidgetView items={items} onClose={() => undefined} selectItem={selectItem} title="Users" type="users" />);

        fireEvent.click(screen.getByText('Alice'));
        fireEvent.click(screen.getByText('Bob'));

        expect(selectItem).toHaveBeenLastCalledWith(items[1]);
        expect(vi.mocked(chooserSelectionVisualizer.show)).toHaveBeenCalledWith(0, 100);
        expect(screen.getAllByRole('row').filter((row) => row.getAttribute('aria-selected') === 'true').map((row) => row.textContent)).toEqual(['BobHabbo']);
    });

    it('keeps an owner called "all" apart from the all-owners entry', () => {
        render(<ChooserWidgetView items={[furni(1, 'Lamp', 'all'), furni(2, 'Chair', 'Bob')]} onClose={() => undefined} selectItem={() => undefined} title="Furni" type="furni" />);

        expect(screen.getByText('2 items found')).toBeTruthy();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'owner:all' } });
        expect(screen.getByText('1 items found')).toBeTruthy();
        expect(screen.getByText('Lamp')).toBeTruthy();
    });

    it('tells a floor and a wall furni with the same id apart when picking', () => {
        render(
            <ChooserWidgetView
                items={[furni(7, 'Chair', 'Bob', 1), furni(7, 'Poster', 'Bob', 2)]}
                onClose={() => undefined}
                pickallFurni
                selectItem={() => undefined}
                title="Furni"
                type="furni"
            />
        );

        fireEvent.click(screen.getByText('Poster'));

        const selected = screen.getAllByRole('row').filter((row) => row.getAttribute('aria-selected') === 'true');

        expect(selected.map((row) => row.textContent)).toEqual(['PosterBob7']);
    });
});
