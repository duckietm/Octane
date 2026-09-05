import { GetRoomContentLoader } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../api';
import { Button, LayoutPetImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { usePetPackageWidget } from '../../../../hooks';

const PET_PACKAGE_PREVIEW: Record<string, { typeId: number; paletteId: number }> = {
    val11_present: { typeId: 11, paletteId: 0 },
    gnome_box: { typeId: 26, paletteId: 0 },
    leprechaun_box: { typeId: 27, paletteId: 0 },
    velociraptor_egg: { typeId: 34, paletteId: 0 },
    pterosaur_egg: { typeId: 33, paletteId: 0 },
    petbox_epic: { typeId: 32, paletteId: 0 },
    cowbox: { typeId: 35, paletteId: 5 },
    cowbox_gold: { typeId: 35, paletteId: 28 }
};

export const PetPackageWidgetView: FC<{}> = (props) => {
    const {
        isVisible = false,
        errorResult = null,
        petName = null,
        objectType = null,
        onChangePetName = null,
        onConfirm = null,
        onClose = null
    } = usePetPackageWidget();

    const petPreview = objectType ? (PET_PACKAGE_PREVIEW[objectType] ?? null) : null;

    useEffect(() => {
        if (!petPreview) return;

        const petTypeName = GetRoomContentLoader().getPetNameForType(petPreview.typeId);

        if (petTypeName) GetRoomContentLoader().downloadAsset(petTypeName);
    }, [petPreview]);

    return (
        <>
            {isVisible && (
                <OctaneCardView
                    isResizable={false}
                    className="octane-pet-package min-w-0 w-[min(340px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                    theme="primary-slim"
                >
                    <OctaneCardHeaderView
                        center
                        headerText={objectType === 'gnome_box' ? LocalizeText('widgets.gnomepackage.name.title') : LocalizeText('furni.petpackage.open')}
                        onCloseClick={() => onClose()}
                    />
                    <OctaneCardContentView>
                        <div className="flex gap-2 items-stretch">
                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex pet-package-container-top p-3">
                                    <div className={`package-image-${objectType} shrink-0`}></div>
                                    <div className="m-2">
                                        <Text className="package-text-big" variant="black">
                                            {objectType === 'gnome_box'
                                                ? LocalizeText('widgets.gnomepackage.name.title')
                                                : LocalizeText('furni.petpackage')}
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex pet-package-container-bottom p-2">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center bg-white rounded py-1 px-2 input-pet-package-container">
                                    <input
                                        className="min-h-[calc(1.5em+ .5rem+2px)] px-[.5rem] py-[.25rem] rounded-[.2rem] form-control-sm input-pet-package w-full min-w-0 text-[#555555] placeholder:text-[#8a8a8a]"
                                        maxLength={GetConfigurationValue('pet.package.name.max.length')}
                                        placeholder={
                                            objectType === 'gnome_box'
                                                ? LocalizeText('widgets.gnomepackage.name.select')
                                                : LocalizeText('widgets.petpackage.name.title')
                                        }
                                        type="text"
                                        value={petName}
                                        onChange={(event) => onChangePetName(event.target.value)}
                                    />
                                    <div className="package-pencil-image shrink-0 small fa-icon"></div>
                                </div>
                                {errorResult.length > 0 && <div className="invalid-feedback d-block m-0">{errorResult}</div>}
                                <div className="flex items-center gap-5 justify-center mt-2">
                                    <Text pointer className="text-decoration" onClick={() => onClose()}>
                                        {LocalizeText('cancel')}
                                    </Text>
                                    <Button disabled={petName.length < 3} variant={petName.length < 3 ? 'danger' : 'success'} onClick={() => onConfirm()}>
                                        {objectType === 'gnome_box' ? LocalizeText('widgets.gnomepackage.name.pick') : LocalizeText('furni.petpackage.confirm')}
                                    </Button>
                                </div>
                            </div>
                                </div>
                            </div>
                            {petPreview && (
                                <div className="flex items-center justify-center shrink-0 overflow-hidden w-[130px] p-2 octane-pet-package-preview">
                                    <LayoutPetImageView
                                        direction={2}
                                        paletteId={petPreview.paletteId}
                                        petColor={0xffffff}
                                        scale={1}
                                        typeId={petPreview.typeId}
                                    />
                                </div>
                            )}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </>
    );
};
