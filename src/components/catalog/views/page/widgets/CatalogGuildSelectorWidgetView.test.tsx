import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';
import { CatalogGuildSelectorWidgetView, filterGuildForumGroups, getInitialGuildIndex } from './CatalogGuildSelectorWidgetView';

const renderer = vi.hoisted(() => {
    class StringDataType {
        private value: string[] = [];

        public setValue(value: string[]) {
            this.value = value;
        }

        public getValue(index: number) {
            return this.value[index];
        }
    }

    class CatalogGroupsComposer {}

    return { StringDataType, CatalogGroupsComposer, session: { userId: 1, security: 0 }, send: vi.fn() };
});

vi.mock('@octane/renderer', () => ({
    CatalogGroupsComposer: renderer.CatalogGroupsComposer,
    CreateLinkEvent: vi.fn(),
    GetSessionDataManager: () => ({ userId: renderer.session.userId, hasSecurity: (level: number) => renderer.session.security >= level }),
    StringDataType: renderer.StringDataType
}));

vi.mock('../../../../../api', () => ({
    LocalizeText: (key: string) => key,
    SendMessageComposer: (composer: unknown) => renderer.send(composer)
}));

vi.mock('../../../../../common', () => ({
    Button: ({ children, onClick }: any) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Flex: ({ children }: any) => <div>{children}</div>
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogData: vi.fn(),
    useCatalogUiState: vi.fn(),
    useUserGroups: vi.fn()
}));

const group = (groupId: number, extra: Partial<{ ownerId: number; hasForum: boolean; favourite: boolean }> = {}) =>
    ({
        groupId,
        groupName: `Group ${groupId}`,
        badgeCode: `b${groupId}`,
        colorA: 'ff0000',
        colorB: '00ff00',
        ownerId: 2,
        hasForum: false,
        favourite: false,
        ...extra
    }) as any;

let purchaseOptions: any;
const setPurchaseOptions = vi.fn((updater: (value: any) => any) => {
    purchaseOptions = updater(purchaseOptions);
});

const withGroups = (groups: any[]) => vi.mocked(useUserGroups).mockReturnValue({ data: groups, refresh: vi.fn() });

afterEach(cleanup);

beforeEach(() => {
    renderer.session.userId = 1;
    renderer.session.security = 0;
    renderer.send.mockClear();
    purchaseOptions = {};
    setPurchaseOptions.mockClear();
    vi.mocked(useCatalogData).mockReturnValue({ currentOffer: { offerId: 3 } } as any);
    vi.mocked(useCatalogUiState).mockReturnValue({ setPurchaseOptions } as any);
});

describe('guild forum selector filter (GuildForumSelectorCatalogWidget)', () => {
    const groups = [group(1, { hasForum: true }), group(2, { ownerId: 1 }), group(3)];

    it('keeps groups with a forum and groups the user owns', () => {
        expect(filterGuildForumGroups(groups, 1, false).map((entry) => entry.groupId)).toEqual([1, 2]);
    });

    it('keeps every group for staff (security level 4)', () => {
        expect(filterGuildForumGroups(groups, 1, true).map((entry) => entry.groupId)).toEqual([1, 2, 3]);
    });
});

describe('guild selector preselection (populateAndSelectFavorite)', () => {
    it('takes the favourite group, else the first, and keeps a pick of the user', () => {
        expect(getInitialGuildIndex([group(1), group(2, { favourite: true })], -1)).toBe(1);
        expect(getInitialGuildIndex([group(1), group(2)], -1)).toBe(0);
        expect(getInitialGuildIndex([group(1), group(2, { favourite: true })], 0)).toBe(0);
        expect(getInitialGuildIndex([], -1)).toBe(-1);
    });
});

describe('CatalogGuildSelectorWidgetView', () => {
    it('asks for the group memberships when it opens', () => {
        withGroups([]);
        render(<CatalogGuildSelectorWidgetView forumSelector />);

        expect(renderer.send).toHaveBeenCalledWith(new renderer.CatalogGroupsComposer());
    });

    it('offers the filtered groups, preselects the favourite and buys for its id', () => {
        withGroups([group(3), group(1, { hasForum: true }), group(2, { ownerId: 1, favourite: true })]);
        render(<CatalogGuildSelectorWidgetView forumSelector />);

        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Group 1', 'Group 2']);
        expect(purchaseOptions.extraParamRequired).toBe(true);
        expect(purchaseOptions.extraData).toBe('2');
        expect(purchaseOptions.previewStuffData.getValue(2)).toBe('b2');

        const first = screen.getByRole('option', { name: 'Group 1' });

        fireEvent.pointerDown(first);
        fireEvent.click(first);
        expect(purchaseOptions.extraData).toBe('1');
    });

    it('leaves the purchase without a group when none passes the forum filter', () => {
        withGroups([group(3)]);
        render(<CatalogGuildSelectorWidgetView forumSelector />);

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(screen.queryByText('catalog.guild_selector.members_only')).toBeNull();
        expect(purchaseOptions.extraData).toBeNull();
    });

    it('shows the members only note without any group', () => {
        withGroups([]);
        render(<CatalogGuildSelectorWidgetView forumSelector />);

        expect(screen.getByText('catalog.guild_selector.members_only')).toBeInTheDocument();
        expect(purchaseOptions.extraData).toBeNull();
    });
});
