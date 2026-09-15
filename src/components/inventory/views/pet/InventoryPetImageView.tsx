import { GetRoomEngine, PetData, PetFigureData, Vector3d } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';

export const InventoryPetImageView: FC<{ pet: PetData; preview?: boolean }> = ({ pet, preview = false }) => {
    const [image, setImage] = useState<HTMLImageElement>(null);

    useEffect(() => {
        let disposed = false;
        let revision = 0;
        setImage(null);

        const figure = new PetFigureData(pet.figureString);
        const small = [15, 16, 26, 27].includes(pet.typeId);
        const fullBody = preview || small || pet.typeId === 35;
        const direction = pet.typeId === 16 || (!preview && pet.typeId === 15) ? 2 : preview ? 4 : 3;
        const posture = pet.typeId === 16 && pet.level < 7 ? `grw${pet.level}` : 'std';
        const result = GetRoomEngine().getRoomObjectPetImage(
            figure.typeId,
            figure.paletteId,
            figure.color,
            new Vector3d(direction * 45),
            preview || !small ? 64 : 32,
            {
                imageReady: async (result) => {
                    const request = ++revision;
                    const nextImage = await result.getImage();

                    if (!disposed && request === revision) setImage(nextImage);
                },
                imageFailed: () => {}
            },
            !fullBody,
            0,
            figure.customParts,
            posture
        );

        if (result) {
            const request = revision;
            void result.getImage().then((nextImage) => {
                if (!disposed && request === revision) setImage(nextImage);
            });
        }

        return () => {
            disposed = true;
        };
    }, [pet, preview]);

    return image ? <img src={image.src} width={image.width} height={image.height} alt="" draggable={false} /> : null;
};
