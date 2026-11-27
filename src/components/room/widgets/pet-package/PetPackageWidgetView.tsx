import { GetRoomContentLoader } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, GetHotelSettings, LocalizeText, resolveServerLength } from '../../../../api';
import smallPenIcon from '../../../../assets/images/catalog/navigation/small_pen.png';
import { Button, LayoutPetImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import '../../../../css/room/FurniWindowsBAir.css';
import '../../../../css/room/PetPackageWidget.css';
import { usePetPackageWidget } from '../../../../hooks';
import { PetPackageFigure } from '../../../../hooks/rooms/widgets/usePetPackageWidget';

/** The pet in the packages that do not say what they hold: the picture AIR gets from the package's figure. */
const PET_PACKAGE_PREVIEW: Record<string, PetPackageFigure> = {
    val11_present: { typeId: 11, paletteId: 0, color: 0xffffff },
    gnome_box: { typeId: 26, paletteId: 0, color: 0xffffff },
    leprechaun_box: { typeId: 27, paletteId: 0, color: 0xffffff },
    velociraptor_egg: { typeId: 34, paletteId: 0, color: 0xffffff },
    pterosaur_egg: { typeId: 33, paletteId: 0, color: 0xffffff },
    petbox_epic: { typeId: 32, paletteId: 0, color: 0xffffff },
    cowbox: { typeId: 35, paletteId: 5, color: 0xffffff },
    cowbox_gold: { typeId: 35, paletteId: 28, color: 0xffffff },
    // The cursed dragon adoption's crates: 1 holds the blue dragon, 2 the purple one.
    drago_cursed_1_package: { typeId: 37, paletteId: 0, color: 0xffffff },
    drago_cursed_2_package: { typeId: 37, paletteId: 1, color: 0xffffff }
};

/**
 * AIR's PetPackageFurniWidget. A package that tells which pet it holds opens the small `petpackage` window
 * (280x160) with the pet's picture; any other opens `petpackage_new` (475x250) with the dark header band and the
 * package box. Both name the pet with "pick this name" and an underlined cancel.
 */
export const PetPackageWidgetView: FC<{}> = () => {
    const { isVisible = false, petName = '', objectType = null, figure = null, onChangePetName = null, onConfirm = null, onClose = null } = usePetPackageWidget();
    const [boxImageFailed, setBoxImageFailed] = useState(false);

    const pet = figure ?? (objectType ? (PET_PACKAGE_PREVIEW[objectType] ?? null) : null);

    useEffect(() => {
        if (!pet) return;

        const petTypeName = GetRoomContentLoader().getPetNameForType(pet.typeId);

        if (petTypeName) GetRoomContentLoader().downloadAsset(petTypeName);
    }, [pet]);

    if (!isVisible) return null;

    const maxLength = resolveServerLength(GetHotelSettings(), 'petNameMaxLength', GetConfigurationValue<number>('pet.package.name.max.length', 15));
    const title = LocalizeText('widgets.petpackage.name.title');

    const nameInput = (
        <input
            aria-label={LocalizeText('widgets.petpackage.name.select')}
            className="input-pet-package octane-pet-package__input"
            maxLength={maxLength}
            type="text"
            value={petName}
            onChange={(event) => onChangePetName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onConfirm()}
        />
    );

    const cancel = (
        <Text component={BaseButton} type="button" pointer className="text-decoration octane-pet-package__cancel" onClick={() => onClose()}>
            {LocalizeText('generic.cancel')}
        </Text>
    );

    const pick = (
        <Button classNames={['octane-pet-package__pick']} variant="success" onClick={() => onConfirm()}>
            {LocalizeText('widgets.petpackage.name.pick')}
        </Button>
    );

    return (
        <NativeTextTree>
            <OctaneCardView
                isResizable={false}
                className={`octane-pet-package octane-furni-petpackage ${pet ? 'octane-pet-package--compact' : 'octane-pet-package--large'}`}
                theme="primary-slim"
                uniqueKey="pet-package"
            >
                <OctaneCardHeaderView center headerText={title} onCloseClick={() => onClose()} />
                <OctaneCardContentView classNames={['octane-pet-package__content']}>
                    {pet ? (
                        <div className="octane-pet-package__compact" data-testid="pet-package-compact">
                            <div className="octane-pet-package__pet">
                                <LayoutPetImageView direction={2} paletteId={pet.paletteId} petColor={pet.color} scale={1} typeId={pet.typeId} />
                            </div>
                            <Text bold className="octane-pet-package__info">
                                {LocalizeText('widgets.petpackage.name.select')}
                            </Text>
                            <div className="octane-pet-package__input-border">{nameInput}</div>
                            {cancel}
                            {pick}
                        </div>
                    ) : (
                        <div className="octane-pet-package__large" data-testid="pet-package-large">
                            <div className="octane-pet-package__header">
                                {!boxImageFailed && (
                                    <img
                                        alt=""
                                        className="octane-pet-package__box"
                                        draggable={false}
                                        src={`${GetConfigurationValue<string>('image.library.url', '')}client_static/petpackage_box.png`}
                                        onError={() => setBoxImageFailed(true)}
                                    />
                                )}
                                <Text className="package-text-big octane-pet-package__title">{LocalizeText('petpackage.header.title')}</Text>
                                <Text className="octane-pet-package__description">{LocalizeText('widgets.petpackage.name.select')}</Text>
                            </div>
                            <div className="octane-pet-package__input-border">
                                {nameInput}
                                <img alt="" className="octane-pet-package__pen" draggable={false} src={smallPenIcon} />
                            </div>
                            {cancel}
                            {pick}
                        </div>
                    )}
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
