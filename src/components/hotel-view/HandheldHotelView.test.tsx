/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const landing = vi.hoisted(() => ({ handler: null as ((event: unknown) => void) | null, homeRoomId: 0 }));

// The landing packets: plain constructors that keep their arguments, so a test can see what was sent.
vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    const composer = (name: string) =>
        class {
            public readonly name = name;
            public readonly args: unknown[];
            constructor(...args: unknown[]) {
                this.args = args;
            }
        };

    return {
        ...actual,
        HotelViewLandingEvent: class {},
        HotelViewLandingRequestComposer: composer('request'),
        HotelViewLandingResetVotesComposer: composer('resetVotes'),
        HotelViewLandingSaveComposer: composer('save'),
        HotelViewLandingSaveSceneComposer: composer('saveScene'),
        HotelViewLandingVoteComposer: composer('vote')
    };
});

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        SendMessageComposer: vi.fn(),
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        GetOptionalConfigurationValue: (_key: string, fallback: unknown) => fallback,
        localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) =>
            (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback)
    };
});
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../hooks')>('../../hooks');

    return {
        ...actual,
        useMessageEvent: (_type: unknown, handler: (event: unknown) => void) => {
            landing.handler = handler;
        }
    };
});

vi.mock('../../hooks/navigator/useNavigatorData', () => ({ useNavigatorData: () => ({ navigatorData: { homeRoomId: landing.homeRoomId } }) }));
vi.mock('../../hooks/catalog/useCursedDragonAdoption', () => ({
    useCursedDragonAdoption: () => ({ claimState: 0, open: vi.fn(), checkAvailability: vi.fn() })
}));

vi.mock('../../common', async () => {
    const actual = await vi.importActual<typeof import('../../common')>('../../common');

    return {
        ...actual,
        LayoutAvatarImageView: ({ classNames = [] }: { classNames?: string[] }) => <div className={classNames.join(' ')} data-testid="avatar" />
    };
});

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that shows what it was given.
vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

import { CreateLinkEvent } from '@octane/renderer';
import { SendMessageComposer } from '../../api';
import { HotelView } from './HotelView';

const slot = (id: number, type: string, extra: Record<string, unknown> = {}) => ({
    id,
    enabled: true,
    type,
    title: `Title ${id}`,
    body: `Body ${id}`,
    imageUrl: '',
    buttonText: '',
    link: '',
    progress: 0,
    progressLabel: '',
    configJson: '{}',
    ...extra
});

const SCENE = {
    backgroundUrl: 'https://images.example/bg.png',
    leftUrl: '',
    rightUrl: '',
    drapeUrl: '',
    leftX: -1,
    leftY: -1,
    rightX: -1,
    rightY: -1,
    drapeX: -1,
    drapeY: -1,
    hallOfFameX: -1,
    hallOfFameY: -1,
    hallOfFameEnabled: true,
    hallOfFameMode: 'latest_registered',
    hallOfFameCurrencyType: 0,
    hallOfFameUsers: [{ id: 7, username: 'Frank', figure: 'hd-180-1', gender: 'M' }]
};

const SLOTS = [
    slot(1, 'catalogpromo', {
        buttonText: 'Open Catalogue',
        link: 'catalog/open',
        configJson: JSON.stringify({ catalogPage: 'new_furni', secondaryButtonText: 'Help', secondaryLink: 'help/show' })
    }),
    slot(2, 'communitygoal', {
        configJson: JSON.stringify({
            voteOptions: [
                { id: 1, label: 'Red' },
                { id: 2, label: 'Blue' }
            ],
            voteCounts: { 1: 3, 2: 5 }
        })
    }),
    slot(3, 'habbowaypromo', { enabled: false })
];

const sendLanding = (canEdit: boolean, slots = SLOTS) => act(() => landing.handler?.({ getParser: () => ({ canEdit, scene: SCENE, slots }) }));

const sent = () => vi.mocked(SendMessageComposer).mock.calls.map(([message]) => message as unknown as { name: string; args: unknown[] });

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

beforeEach(() => {
    landing.homeRoomId = 0;
    vi.mocked(SendMessageComposer).mockClear();
    vi.mocked(CreateLinkEvent).mockClear();
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('HotelView on a phone', () => {
    it('draws the scene and the enabled slots as cards, never the desktop stage', () => {
        phone();
        const { container } = render(<HotelView />);

        sendLanding(false);

        const view = screen.getByTestId('handheld-hotel-view');
        const cards = [...view.querySelectorAll('.octane-handheld-hotel__card:not(.is-hall-of-fame)')];

        expect(container.querySelector('.octane-hotel-view')).toBeNull();
        expect(container.querySelector('.hotelview-stage')).toBeNull();
        expect(cards.map((card) => card.getAttribute('data-type'))).toEqual(['catalogpromo', 'communitygoal']);
        expect(view.querySelector('.octane-handheld-hotel__backdrop')).toHaveStyle({ backgroundImage: 'url("https://images.example/bg.png")' });
        expect(within(view).getByRole('region', { name: 'Hall of Fame' })).toHaveTextContent('Frank');
        expect(view.querySelector('.octane-handheld-hotel__edit')).toBeNull();
    });

    it('runs the same links and packets as the desktop slots', () => {
        phone();
        render(<HotelView />);
        sendLanding(false);

        fireEvent.click(screen.getByRole('button', { name: 'Open Catalogue' }));
        fireEvent.click(screen.getByRole('button', { name: 'Help' }));
        fireEvent.click(screen.getByRole('button', { name: /Blue/ }));

        expect(vi.mocked(CreateLinkEvent).mock.calls.map(([link]) => link)).toEqual(['catalog/open/new_furni', 'help/show']);
        expect(
            sent()
                .filter((message) => message.name === 'vote')
                .map((message) => message.args)
        ).toEqual([[2, 2]]);
    });

    it('offers the home room when there is one, a new room otherwise', () => {
        phone();
        const { unmount } = render(<HotelView />);

        fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
        unmount();

        landing.homeRoomId = 42;
        render(<HotelView />);
        fireEvent.click(screen.getByRole('button', { name: 'Go to home room' }));

        expect(vi.mocked(CreateLinkEvent).mock.calls.map(([link]) => link)).toEqual(['navigator/create', 'navigator/goto/home']);
    });

    it('gives staff a pencil per slot (disabled ones too) and opens the slot editor as a sheet that saves', () => {
        phone();
        render(<HotelView />);
        sendLanding(true);

        expect(screen.getByTestId('handheld-hotel-feed').querySelectorAll('.octane-handheld-hotel__card[data-disabled]')).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Edit slot 1' }));

        const sheet = screen.getByTestId('window');

        expect(sheet).toHaveAttribute('data-sheet', 'true');
        expect(within(sheet).getByText('Edit slot 1', { selector: '.octane-handheld-sheet__title' })).toBeInTheDocument();
        fireEvent.change(within(sheet).getByDisplayValue('Title 1'), { target: { value: 'Fresh' } });
        fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

        const save = sent().find((message) => message.name === 'save');

        expect(save?.args[0]).toMatchObject({ id: 1, title: 'Fresh' });
        expect(screen.queryByTestId('window')).toBeNull();
    });

    it('opens the scene editor from its own pencil, and its close button drops the changes', () => {
        phone('landscape');
        render(<HotelView />);
        sendLanding(true);

        fireEvent.click(screen.getByRole('button', { name: 'Edit HotelView images' }));

        const sheet = screen.getByTestId('window');

        expect(within(sheet).getByDisplayValue('https://images.example/bg.png')).toBeInTheDocument();
        fireEvent.click(within(sheet).getByRole('button', { name: 'generic.close' }));

        expect(screen.queryByTestId('window')).toBeNull();
        expect(sent().some((message) => message.name === 'saveScene')).toBe(false);
    });
});

describe('HotelView on the desktop', () => {
    it('keeps the stage with its positioned slots and no phone view', () => {
        const { container } = render(<HotelView />);

        sendLanding(true);

        expect(screen.queryByTestId('handheld-hotel-view')).toBeNull();
        expect(container.querySelector('.octane-hotel-view .hotelview-stage .hotelview-slots')).toBeTruthy();
        expect([...container.querySelectorAll('.hotelview-slot')].map((section) => section.className)).toEqual([
            'hotelview-slot hotelview-slot-1 hotelview-slot-catalogpromo',
            'hotelview-slot hotelview-slot-2 hotelview-slot-communitygoal',
            'hotelview-slot hotelview-slot-3 hotelview-slot-habbowaypromo hotelview-slot-disabled'
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Edit slot 2' }));

        expect(container.querySelector('form.hotelview-editor')).toBeTruthy();
        expect(screen.queryByTestId('window')).toBeNull();
    });
});
