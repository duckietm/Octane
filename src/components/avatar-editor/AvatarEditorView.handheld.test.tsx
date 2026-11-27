/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    tracker: null as { linkReceived: (url: string) => void } | null,
    send: vi.fn(),
    createLinkEvent: vi.fn(),
    clubLevel: 1,
    editor: null as Record<string, any> | null,
    effects: { activeEffectType: 0, activateEffect: vi.fn(), effects: [] as Record<string, unknown>[] }
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    AddLinkEventTracker: (tracker: { linkReceived: (url: string) => void }) => (mocks.tracker = tracker),
    RemoveLinkEventTracker: () => undefined,
    AvatarEditorFigureCategory: { GENERIC: 'hd', HEAD: 'head', TORSO: 'torso', LEGS: 'legs', PETS: 'pets', MISC: 'misc', HOTLOOKS: 'hotlooks', NFT: 'nft', WARDROBE: 'wardrobe' },
    AvatarFigurePartType: { MALE: 'M', FEMALE: 'F', PET: 'pt', MISC: 'mc' },
    FigureDataContainer: { MALE: 'M', FEMALE: 'F' },
    HabboClubLevelEnum: { NO_CLUB: 0, CLUB: 1, VIP: 2 },
    GetSessionDataManager: () => ({ userName: 'DeployCheck', figure: 'hd-180-1', gender: 'M' }),
    GetAvatarRenderManager: () => ({ createFigureContainer: (figure: string) => ({ getFigureString: () => figure }) }),
    UserFigureComposer: class {
        constructor(
            public gender: string,
            public figure: string
        ) {}
    },
    SetClothingChangeDataMessageComposer: class {},
    SaveWardrobeOutfitMessageComposer: class {
        constructor(
            public slot: number,
            public figure: string,
            public gender: string
        ) {}
    }
}));

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    AvatarEditorThumbnailsHelper: { build: () => Promise.resolve('thumb.png'), buildForFace: () => Promise.resolve('face.png') },
    CreateLinkEvent: mocks.createLinkEvent,
    GetClubMemberLevel: () => mocks.clubLevel,
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string) => key,
    SendMessageComposer: mocks.send,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../hooks', () => ({
    useAvatarEditor: () => mocks.editor,
    useAvatarEffects: () => mocks.effects,
    useHotLooks: () => ({ M: [{ figure: 'hd-190-2', gender: 'M' }], F: [] }),
    useNftWardrobe: () => ({ outfits: [], selectedOutfit: null, wornOutfit: null, selectOutfit: vi.fn(), onTabChange: vi.fn(), save: () => false }),
    formatNftOutfitLabel: () => '',
    getNftCollectionStyle: () => null
}));
vi.mock('../../hooks/events', () => ({ useOctaneEvent: () => undefined }));

vi.mock('../../layout', async (importOriginal) => {
    const actual = await importOriginal<{ InfiniteGrid: { Item: unknown } }>();
    const Grid = ({ items, itemRender, columnCount }: { items: unknown[]; itemRender: (item: unknown, index: number) => unknown; columnCount: number }) => (
        <div data-columns={columnCount} data-testid="part-grid">
            {items.map((item, index) => (
                <span key={index}>{itemRender(item, index) as never}</span>
            ))}
        </div>
    );

    return { ...actual, InfiniteGrid: Object.assign(Grid, { Item: actual.InfiniteGrid.Item }) };
});

vi.mock('../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutAvatarImageView: ({ figure, direction }: { figure: string; direction: number }) => <div className="avatar-image" data-direction={direction} data-figure={figure} />,
    LayoutCurrencyIcon: () => <i className="octane-currency-icon" />
}));
vi.mock('../avatar-effects/AvatarEffectPreviewView', () => ({ AvatarEffectPreviewView: () => <div className="effect-preview" /> }));

import { AvatarEditorView } from './AvatarEditorView';

const colour = (id: number, rgb: number, clubLevel = 0) => ({ id, rgb, clubLevel });
const part = (id: number, extra: object = {}) => ({ id, partSet: { id, clubLevel: 0, isSellable: false }, usesColor: true, maxPaletteCount: 1, ...extra });
const category = (setType: string, palettes = 3) => ({
    setType,
    partItems: [{ id: -1, isClear: true }, part(1), part(2, { partSet: { id: 2, clubLevel: 1, isSellable: false } }), part(3, { isSellableNotOwned: true })],
    colorItems: Array.from({ length: palettes }, () => [colour(10, 0xff0000), colour(11, 0x00ff00), colour(12, 0x0000ff, 2)])
});

const editor = (overrides: object = {}) => ({
    setIsVisible: vi.fn(),
    clothingChangeData: null,
    setClothingChangeData: vi.fn(),
    avatarModels: { hd: [category('hd')], head: [category('hr'), category('ha')], torso: [category('ch')], pets: [category('pt')], wardrobe: [] },
    activeModelKey: 'hd',
    setActiveModelKey: vi.fn(),
    loadAvatarData: vi.fn(),
    getFigureStringWithFace: () => 'hd-180-1',
    gender: 'M',
    setGender: vi.fn(),
    randomizeCurrentFigure: vi.fn(),
    getFigureString: 'hd-180-1.ch-210-66',
    getValidFigureString: 'hd-180-1.ch-210-66',
    maxPaletteCount: 1,
    selectedParts: { hd: 1 },
    selectedColorParts: { hd: [colour(10, 0xff0000)] },
    selectEditorPart: vi.fn(),
    selectEditorColor: vi.fn(),
    getFirstSelectableColor: () => 10,
    savedFigures: [[{ getFigureString: () => 'hd-190-2' }, 'M']],
    setSavedFigures: vi.fn(),
    ...overrides
});

const open = (overrides: object = {}) => {
    mocks.editor = editor(overrides);

    const view = render(<AvatarEditorView />);

    act(() => mocks.tracker.linkReceived('avatar-editor/show'));

    return view;
};

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

beforeEach(() => phone());

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    vi.clearAllMocks();
    mocks.clubLevel = 1;
    mocks.effects.effects = [];
});

describe('AvatarEditorView on a phone', () => {
    it('is one sheet in the phone look: picture tabs, the avatar stage, the category and the save button', () => {
        open();
        const sheet = document.querySelector('.octane-handheld-sheet.octane-handheld-looks');

        expect(document.querySelector('.octane-avatar-editor')).toBeNull();
        expect(sheet).not.toBeNull();
        expect(within(sheet as HTMLElement).getByText('avatareditor.title')).toBeInTheDocument();
        expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'))).toEqual(['Body', 'Head', 'Tops', 'Popular looks', 'Effects', 'Companions']);
        expect(screen.getByRole('tab', { name: 'Body' }).querySelector('img')).not.toBeNull();

        const layout = document.querySelector('.octane-handheld-looks__layout');

        expect([...layout.children].map((child) => child.className)).toEqual(['octane-handheld-looks__stage', 'octane-handheld-looks__editor', 'octane-handheld-looks__save']);
        expect(within(layout as HTMLElement).getByText('DeployCheck')).toBeInTheDocument();
    });

    it('switches the category from a tab', () => {
        open();
        fireEvent.click(screen.getByRole('tab', { name: 'Head' }));

        expect(mocks.editor.setActiveModelKey).toHaveBeenCalledWith('head');
    });

    it('offers the gender on the body tab and the kinds of clothing on the others', () => {
        open();
        fireEvent.click(screen.getByRole('button', { name: 'avatareditor.generic.girl' }));

        expect(mocks.editor.setGender).toHaveBeenCalledWith('F');
        expect(screen.getByRole('button', { name: 'avatareditor.generic.boy' })).toHaveAttribute('aria-pressed', 'true');

        cleanup();
        open({ activeModelKey: 'head', selectedColorParts: { hr: [colour(10, 0xff0000)], ha: [colour(10, 0xff0000)] } });

        expect(screen.getByRole('button', { name: 'Hair' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Hats' }));
        expect(screen.getByRole('button', { name: 'Hats' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('lists the parts five across, picks one and takes it off with the remove tile', () => {
        open();
        const grid = screen.getByTestId('part-grid');
        const tiles = grid.querySelectorAll('.octane-handheld-looks__part');

        expect(grid).toHaveAttribute('data-columns', '5');
        expect(tiles).toHaveLength(4);
        expect(tiles[1]).toHaveClass('part-selected');
        // The club part and the one that has to be bought keep their marks.
        expect(tiles[2].querySelector('.avatar-editor-part-hc')).not.toBeNull();
        expect(tiles[3]).toHaveClass('pet-sellable-locked');

        fireEvent.click(tiles[2]);
        expect(mocks.editor.selectEditorPart).toHaveBeenCalledWith('hd', 2);

        fireEvent.click(tiles[0]);
        expect(mocks.editor.selectEditorPart).toHaveBeenCalledWith('hd', -1);
        expect(document.querySelector('.octane-classic-scroll-area')).toBeNull();
    });

    it('picks a colour, and shows one palette per colour the part takes', () => {
        open();
        const swatches = document.querySelectorAll('.avatar-editor-palette-item');

        expect(document.querySelectorAll('.octane-handheld-looks__palette')).toHaveLength(1);
        expect(swatches).toHaveLength(3);
        expect(swatches[0]).toHaveClass('is-selected');
        expect(swatches[2]).toHaveClass('is-locked');

        fireEvent.click(swatches[1]);
        expect(mocks.editor.selectEditorColor).toHaveBeenCalledWith('hd', 0, 11);

        cleanup();

        open({ maxPaletteCount: 3 });

        expect(document.querySelectorAll('.octane-handheld-looks__palette')).toHaveLength(3);
        fireEvent.click(document.querySelectorAll('.octane-handheld-looks__palette')[2].querySelectorAll('.avatar-editor-palette-item')[1]);
        expect(mocks.editor.selectEditorColor).toHaveBeenCalledWith('hd', 2, 11);
    });

    it('sends somebody without the club to the club centre for the free colour', () => {
        mocks.clubLevel = 0;
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Advanced Color' }));

        expect(mocks.createLinkEvent).toHaveBeenCalledWith('habboUI/open/hccenter');
    });

    it('turns the preview, and resets, clears and randomises the look', () => {
        open();
        const figure = document.querySelector('.octane-handheld-looks__figure');

        expect(figure).toHaveAttribute('data-direction', '4');
        fireEvent.click(screen.getByRole('button', { name: 'Rotate avatar' }));
        expect(figure).toHaveAttribute('data-direction', '5');

        fireEvent.click(screen.getByRole('button', { name: 'Randomize avatar' }));
        expect(mocks.editor.randomizeCurrentFigure).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Reset avatar' }));
        expect(mocks.editor.loadAvatarData).toHaveBeenCalledWith('hd-180-1', 'M');
        fireEvent.click(screen.getByRole('button', { name: 'Clear avatar' }));
        expect(mocks.editor.loadAvatarData).toHaveBeenCalledTimes(2);
    });

    it('saves the look and closes', () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'avatareditor.save' }));

        expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ gender: 'M', figure: 'hd-180-1.ch-210-66' }));
        expect(document.querySelector('.octane-handheld-looks')).toBeNull();
    });

    it('opens the wardrobe in place of the category: wear a saved look, save into a slot, and go back by a tab', () => {
        open();

        expect(document.querySelector('.octane-handheld-looks__wardrobe')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'avatareditor.wardrobe.title' }));

        const slots = document.querySelectorAll('.octane-handheld-looks__slot');

        expect(slots).toHaveLength(10);
        expect(document.querySelector('.octane-handheld-looks__model')).toBeNull();
        expect(document.querySelector('.octane-handheld-looks__stage')).not.toBeNull();
        expect(screen.queryByRole('tab', { selected: true })).toBeNull();

        fireEvent.click(within(slots[0] as HTMLElement).getByRole('button', { name: 'widget.generic_usable.button.use' }));
        expect(mocks.editor.loadAvatarData).toHaveBeenCalledWith('hd-190-2', 'M');

        // An empty slot has nothing to wear; a slot above the club's five is locked for a plain club member.
        expect(within(slots[1] as HTMLElement).getByRole('button', { name: 'widget.generic_usable.button.use' })).toBeDisabled();
        expect(slots[5]).toHaveClass('is-locked');

        fireEvent.click(within(slots[1] as HTMLElement).getByRole('button', { name: 'avatareditor.wardrobe.save' }));
        expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ slot: 2, figure: 'hd-180-1.ch-210-66', gender: 'M' }));

        fireEvent.click(screen.getByRole('tab', { name: 'Tops' }));
        expect(document.querySelector('.octane-handheld-looks__wardrobe')).toBeNull();
    });

    it('shows the owned effects as tiles and previews the chosen one', () => {
        mocks.effects.effects = [{ type: 5, isPermanent: false, secondsLeft: 0, duration: 3600, inactiveCount: 2 }];

        open({ activeModelKey: 'effects' });

        expect(document.querySelectorAll('.octane-handheld-looks__effect')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'fx_5' }));
        expect(document.querySelector('.effect-preview')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'fx_5' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('lists the popular looks and the companions', () => {
        open({ activeModelKey: 'hotlooks' });
        fireEvent.click(screen.getByRole('button', { name: 'Click to choose' }));
        expect(mocks.editor.loadAvatarData).toHaveBeenCalledWith('hd-190-2', 'M');

        cleanup();

        open({ activeModelKey: 'pets', selectedParts: { pt: 1 }, selectedColorParts: { pt: [colour(10, 0xff0000)] } });

        expect(document.querySelector('.octane-handheld-looks__equipped')).toHaveTextContent('Companion equipped');
        fireEvent.click(screen.getByRole('button', { name: 'Remove companion' }));
        expect(mocks.editor.selectEditorPart).toHaveBeenCalledWith('pt', -1);
    });
});

describe('AvatarEditorView on the desktop', () => {
    it('keeps the AIR window with its wardrobe drawer', () => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));

        open();

        expect(document.querySelector('.octane-handheld-sheet')).toBeNull();
        expect(document.querySelector('.octane-avatar-editor.is-wardrobe-open')).not.toBeNull();
        expect(document.querySelector('.octane-avatar-editor-wardrobe')).not.toBeNull();
        expect(document.querySelectorAll('.octane-avatar-editor-main-tab')).toHaveLength(6);
        expect(screen.getByTestId('part-grid')).toHaveAttribute('data-columns', '6');
        expect(document.querySelector('.octane-avatar-editor-preview-shell .figure-preview-container')).not.toBeNull();
        expect(document.querySelector('.octane-avatar-editor-secondary-actions')).not.toBeNull();
        expect(document.querySelector('.octane-avatar-editor-save')).not.toBeNull();
    });
});
