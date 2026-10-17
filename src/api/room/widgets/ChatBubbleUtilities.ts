import {
    AvatarFigurePartType,
    AvatarScaleType,
    AvatarSetType,
    GetAvatarRenderManager,
    GetRoomEngine,
    PetFigureData,
    TextureUtils,
    Vector3d
} from '@octane/renderer';

export class ChatBubbleUtilities {
    private static MAX_CACHE_SIZE: number = 1024;

    public static AVATAR_COLOR_CACHE: Map<string, number> = new Map();
    public static AVATAR_IMAGE_CACHE: Map<string, string> = new Map();
    public static PET_IMAGE_CACHE: Map<string, string> = new Map();
    private static AVATAR_IMAGE_PENDING_CACHE: Map<string, Promise<string>> = new Map();
    private static PET_IMAGE_PENDING_CACHE: Map<string, Promise<string>> = new Map();

    private static placeHolderImageUrl: string = '';

    private static pruneCache<T>(cache: Map<string, T>, maxSize: number = ChatBubbleUtilities.MAX_CACHE_SIZE): void {
        if (cache.size <= maxSize) return;

        const deleteCount = cache.size - maxSize;
        const iterator = cache.keys();

        for (let i = 0; i < deleteCount; i++) {
            cache.delete(iterator.next().value as string);
        }
    }

    private static touch<T>(cache: Map<string, T>, key: string): T {
        const value = cache.get(key);

        if (value === undefined) return undefined;

        cache.delete(key);
        cache.set(key, value);

        return value;
    }

    public static async setFigureImage(figure: string): Promise<string> {
        const avatarImage = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.LARGE, null, {
            resetFigure: (figure) => this.setFigureImage(figure),
            dispose: () => {},
            disposed: false
        });

        if (!avatarImage) return null;

        try {
            const isPlaceholder = avatarImage.isPlaceholder();

            if (isPlaceholder && this.placeHolderImageUrl?.length) return this.placeHolderImageUrl;

            const imageUrl = avatarImage.processAsImageUrl(AvatarSetType.HEAD);

            // A placeholder head is never cached for the figure: the download
            // listener calls back here once the real parts are in.
            if (isPlaceholder) {
                this.placeHolderImageUrl = imageUrl;

                return imageUrl;
            }

            const color = avatarImage.getPartColor(AvatarFigurePartType.CHEST);

            // Keyed by the figure the caller asked for, which is what the chat
            // widget looks the colour up with afterwards.
            this.AVATAR_COLOR_CACHE.set(figure, (color && color.rgb) || 16777215);
            this.AVATAR_IMAGE_CACHE.set(figure, imageUrl);

            this.pruneCache(this.AVATAR_COLOR_CACHE);
            this.pruneCache(this.AVATAR_IMAGE_CACHE);

            return imageUrl;
        } finally {
            avatarImage.dispose();
        }
    }

    public static async getUserImage(figure: string): Promise<string> {
        const existing = this.touch(this.AVATAR_IMAGE_CACHE, figure);

        if (existing) {
            // A busy speaker keeps both head and colour at the young end.
            this.touch(this.AVATAR_COLOR_CACHE, figure);

            return existing;
        }

        const pending = this.AVATAR_IMAGE_PENDING_CACHE.get(figure);

        if (pending) return pending;

        const request = this.setFigureImage(figure);

        this.AVATAR_IMAGE_PENDING_CACHE.set(figure, request);

        try {
            return await request;
        } finally {
            if (this.AVATAR_IMAGE_PENDING_CACHE.get(figure) === request) this.AVATAR_IMAGE_PENDING_CACHE.delete(figure);
        }
    }

    public static async getPetImage(figure: string, direction: number, _arg_3: boolean, scale: number = 64, posture: string = null) {
        const cacheKey = `${figure}-${posture || 'std'}-${direction}-${scale}`;
        let existing = this.touch(this.PET_IMAGE_CACHE, cacheKey);

        if (existing) return existing;

        const pending = this.PET_IMAGE_PENDING_CACHE.get(cacheKey);

        if (pending) return pending;

        const resultPromise = (async () => {
            const figureData = new PetFigureData(figure);
            const typeId = figureData.typeId;

            const getImageUrl = async (imageResult) => {
                if (!imageResult) return null;

                const image = await imageResult.getImage();

                if (image) return image.src;
                if (imageResult.data) return TextureUtils.generateImageUrl(imageResult.data);

                return null;
            };

            let listenerResolve = null;

            const listenerPromise = new Promise<string>((resolve) => {
                listenerResolve = resolve;
            });

            const imageResult = GetRoomEngine().getRoomObjectPetImage(
                typeId,
                figureData.paletteId,
                figureData.color,
                new Vector3d(direction * 45),
                scale,
                {
                    imageReady: async (result) => listenerResolve(await getImageUrl(result)),
                    imageFailed: () => listenerResolve(null)
                },
                false,
                0,
                figureData.customParts,
                posture
            );

            let resolvedImage: string = null;

            if (imageResult?.id > 0) {
                resolvedImage = await Promise.race([listenerPromise, new Promise<string>((resolve) => setTimeout(() => resolve(null), 2500))]);
            }

            if (!resolvedImage) resolvedImage = await getImageUrl(imageResult);

            if (resolvedImage) {
                this.PET_IMAGE_CACHE.set(cacheKey, resolvedImage);
                this.pruneCache(this.PET_IMAGE_CACHE);
            }

            return resolvedImage;
        })();

        this.PET_IMAGE_PENDING_CACHE.set(cacheKey, resultPromise);

        try {
            existing = await resultPromise;
        } finally {
            this.PET_IMAGE_PENDING_CACHE.delete(cacheKey);
        }

        return existing;
    }
}
