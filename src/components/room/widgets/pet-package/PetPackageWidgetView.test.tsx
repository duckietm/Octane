import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    widget: {
        isVisible: true,
        petName: 'Rex',
        objectType: 'mystery_crate',
        figure: null as { typeId: number; paletteId: number; color: number } | null,
        onChangePetName: vi.fn(),
        onConfirm: vi.fn(),
        onClose: vi.fn()
    }
}));

vi.mock('@octane/renderer', () => ({
    GetRoomContentLoader: () => ({ getPetNameForType: () => 'dog', downloadAsset: vi.fn() })
}));

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetHotelSettings: () => null,
    LocalizeText: (key: string) => key,
    resolveServerLength: (_settings: unknown, _key: string, fallback: number) => fallback
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
    LayoutPetImageView: ({ typeId, paletteId }: { typeId: number; paletteId: number }) => <i data-testid="pet" data-type={typeId} data-palette={paletteId} />,
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <div data-testid="header">{headerText}</div>,
    OctaneCardView: ({ children, className }: PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
    Text: ({ children, className, onClick }: PropsWithChildren<{ className?: string; onClick?: () => void }>) => (
        <span className={className} onClick={onClick}>
            {children}
        </span>
    )
}));

vi.mock('../../../../common/BaseButton', () => ({ BaseButton: 'button' }));
vi.mock('../../../../common/native-text/NativeTextTree', () => ({ NativeTextTree: ({ children }: PropsWithChildren) => <>{children}</> }));
vi.mock('../../../../hooks', () => ({ usePetPackageWidget: () => mocks.widget }));

import { PetPackageWidgetView } from './PetPackageWidgetView';

describe('PetPackageWidgetView', () => {
    afterEach(() => {
        cleanup();
        mocks.widget.figure = null;
        mocks.widget.objectType = 'mystery_crate';
        mocks.widget.isVisible = true;
        vi.clearAllMocks();
    });

    it('opens the large window with the header band for a package that does not say which pet it holds', () => {
        render(<PetPackageWidgetView />);

        expect(screen.getByTestId('pet-package-large')).toBeTruthy();
        expect(screen.queryByTestId('pet')).toBeNull();
        expect(screen.getByTestId('header')).toHaveTextContent('widgets.petpackage.name.title');
        expect(screen.getByText('petpackage.header.title')).toBeTruthy();
        expect(screen.getByText('widgets.petpackage.name.pick')).toBeTruthy();
    });

    it('opens the small window with the pet picture when the package sends its figure', () => {
        mocks.widget.figure = { typeId: 12, paletteId: 3, color: 0xffffff };
        render(<PetPackageWidgetView />);

        expect(screen.getByTestId('pet-package-compact')).toBeTruthy();
        expect(screen.getByTestId('pet')).toHaveAttribute('data-type', '12');
        expect(screen.getByTestId('pet')).toHaveAttribute('data-palette', '3');
        expect(screen.queryByText('petpackage.header.title')).toBeNull();
    });

    it('knows the pet of the packages that never say it', () => {
        mocks.widget.objectType = 'cowbox_gold';
        render(<PetPackageWidgetView />);

        expect(screen.getByTestId('pet')).toHaveAttribute('data-type', '35');
        expect(screen.getByTestId('pet')).toHaveAttribute('data-palette', '28');
    });

    it('names, confirms with the button or Enter, and cancels', () => {
        render(<PetPackageWidgetView />);

        const input = screen.getByRole('textbox');

        expect(input).toHaveValue('Rex');
        expect(input).toHaveAttribute('maxlength', '15');
        fireEvent.change(input, { target: { value: 'Rexy' } });
        expect(mocks.widget.onChangePetName).toHaveBeenCalledWith('Rexy');

        fireEvent.click(screen.getByText('widgets.petpackage.name.pick'));
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(mocks.widget.onConfirm).toHaveBeenCalledTimes(2);

        fireEvent.click(screen.getByText('generic.cancel'));
        expect(mocks.widget.onClose).toHaveBeenCalledTimes(1);
    });

    it('renders nothing while closed', () => {
        mocks.widget.isVisible = false;
        const { container } = render(<PetPackageWidgetView />);

        expect(container).toBeEmptyDOMElement();
    });
});
