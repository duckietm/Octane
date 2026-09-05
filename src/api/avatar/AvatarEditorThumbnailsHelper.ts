import {
    AvatarFigurePartType,
    AvatarScaleType,
    AvatarSetType,
    GetAvatarRenderManager,
    IAvatarImage,
    IFigurePart,
    IGraphicAsset,
    IPartColor,
    OctaneAlphaFilter,
    OctaneContainer,
    OctaneSprite,
    TextureUtils
} from '@octane/renderer';
import { IAvatarEditorCategoryPartItem } from './IAvatarEditorCategoryPartItem';

const MAX_CACHE_BYTES = 200 * 1024 * 1024;

class LRUImageCache {
    private _cache: Map<string, string> = new Map();
    private _currentBytes: number = 0;

    public get(key: string): string | undefined {
        const value = this._cache.get(key);

        if (value !== undefined) {
            this._cache.delete(key);
            this._cache.set(key, value);
        }

        return value;
    }

    public set(key: string, value: string): void {
        if (this._cache.has(key)) {
            const old = this._cache.get(key);

            this._currentBytes -= (key.length + old.length) * 2;
            this._cache.delete(key);
        }

        const entryBytes = (key.length + value.length) * 2;

        while (this._currentBytes + entryBytes > MAX_CACHE_BYTES && this._cache.size > 0) {
            const firstKey = this._cache.keys().next().value;
            const firstValue = this._cache.get(firstKey);

            this._currentBytes -= (firstKey.length + firstValue.length) * 2;
            this._cache.delete(firstKey);
        }

        this._cache.set(key, value);
        this._currentBytes += entryBytes;
    }

    public clear(): void {
        this._cache.clear();
        this._currentBytes = 0;
    }
}

export type AvatarEditorThumbRect = { x: number; y: number; width: number; height: number };

export const unionAvatarEditorThumbRect = (left: AvatarEditorThumbRect, right: AvatarEditorThumbRect): AvatarEditorThumbRect => {
    const x = Math.min(left.x, right.x);
    const y = Math.min(left.y, right.y);

    return {
        x,
        y,
        width: Math.max(left.x + left.width, right.x + right.width) - x,
        height: Math.max(left.y + left.height, right.y + right.height) - y
    };
};

export const avatarEditorThumbDest = (assetX: number, assetY: number, union: AvatarEditorThumbRect) => ({
    x: assetX - union.x,
    y: assetY - union.y
});

export class AvatarEditorThumbnailsHelper {
    private static THUMBNAIL_CACHE: LRUImageCache = new LRUImageCache();
    private static PENDING_THUMBNAILS: Map<string, Promise<string>> = new Map();
    private static THUMB_DIRECTIONS: number[] = [2, 6, 0, 4, 3, 1];
    private static THUMB_BOX: number = 50;
    private static ALPHA_FILTER: OctaneAlphaFilter = new OctaneAlphaFilter({ alpha: 0.2 });
    private static DRAW_ORDER: string[] = [
        AvatarFigurePartType.LEFT_HAND_ITEM,
        AvatarFigurePartType.LEFT_HAND,
        AvatarFigurePartType.LEFT_SLEEVE,
        AvatarFigurePartType.LEFT_COAT_SLEEVE,
        'mcl',
        'ptl',
        AvatarFigurePartType.BODY,
        AvatarFigurePartType.SHOES,
        AvatarFigurePartType.LEGS,
        AvatarFigurePartType.CHEST,
        AvatarFigurePartType.CHEST_ACCESSORY,
        AvatarFigurePartType.COAT_CHEST,
        AvatarFigurePartType.CHEST_PRINT,
        AvatarFigurePartType.MISC,
        AvatarFigurePartType.PET,
        AvatarFigurePartType.WAIST_ACCESSORY,
        AvatarFigurePartType.RIGHT_HAND,
        AvatarFigurePartType.RIGHT_SLEEVE,
        AvatarFigurePartType.RIGHT_COAT_SLEEVE,
        'mcr',
        'ptr',
        AvatarFigurePartType.HEAD,
        AvatarFigurePartType.FACE,
        AvatarFigurePartType.EYES,
        AvatarFigurePartType.HAIR,
        AvatarFigurePartType.HAIR_BIG,
        AvatarFigurePartType.FACE_ACCESSORY,
        AvatarFigurePartType.EYE_ACCESSORY,
        AvatarFigurePartType.HEAD_ACCESSORY,
        AvatarFigurePartType.HEAD_ACCESSORY_EXTRA,
        AvatarFigurePartType.RIGHT_HAND_ITEM
    ];

    private static async trimTransparentPadding(imageUrl: string): Promise<string> {
        try {
            const image = new Image();

            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error('thumbnail load failed'));
                image.src = imageUrl;
            });

            const width = image.naturalWidth;
            const height = image.naturalHeight;

            if (!width || !height) return imageUrl;

            const canvas = document.createElement('canvas');

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d', { willReadFrequently: true });

            if (!context) return imageUrl;

            context.drawImage(image, 0, 0);

            const { data } = context.getImageData(0, 0, width, height);
            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (data[(y * width + x) * 4 + 3] > 0) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < 0) return imageUrl;

            const trimmedWidth = maxX - minX + 1;
            const trimmedHeight = maxY - minY + 1;

            if (trimmedWidth === width && trimmedHeight === height) return imageUrl;

            const trimmedCanvas = document.createElement('canvas');

            trimmedCanvas.width = trimmedWidth;
            trimmedCanvas.height = trimmedHeight;

            const trimmedContext = trimmedCanvas.getContext('2d');

            if (!trimmedContext) return imageUrl;

            trimmedContext.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

            return trimmedCanvas.toDataURL('image/png');
        } catch {
            return imageUrl;
        }
    }

    private static async centerIntoThumbBox(imageUrl: string): Promise<string> {
        try {
            const image = new Image();

            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error('thumbnail load failed'));
                image.src = imageUrl;
            });

            const width = image.naturalWidth;
            const height = image.naturalHeight;

            if (!width || !height) return imageUrl;

            if (width === this.THUMB_BOX && height === this.THUMB_BOX) return imageUrl;

            const canvas = document.createElement('canvas');

            canvas.width = this.THUMB_BOX;
            canvas.height = this.THUMB_BOX;

            const context = canvas.getContext('2d');

            if (!context) return imageUrl;

            context.imageSmoothingEnabled = false;
            context.drawImage(image, Math.trunc((this.THUMB_BOX - width) / 2), Math.trunc((this.THUMB_BOX - height) / 2));

            return canvas.toDataURL('image/png');
        } catch {
            return imageUrl;
        }
    }

    private static getThumbnailKey(setType: string, part: IAvatarEditorCategoryPartItem, partColors?: IPartColor[], isDisabled?: boolean): string {
        let key = `${setType}-${part.partSet.id}`;

        if (partColors?.length) {
            key += '-' + partColors.map((c) => c?.rgb?.toString(16) ?? '0').join(',');
        }

        if (isDisabled) key += '-d';

        return key;
    }

    public static clearCache(): void {
        this.THUMBNAIL_CACHE.clear();
    }

    public static async build(
        setType: string,
        part: IAvatarEditorCategoryPartItem,
        useColors: boolean,
        partColors: IPartColor[],
        isDisabled: boolean = false
    ): Promise<string> {
        if (!setType || !setType.length || !part || !part.partSet || !part.partSet.parts || !part.partSet.parts.length) return null;

        const thumbnailKey = this.getThumbnailKey(setType, part, useColors ? partColors : null, isDisabled);
        const cached = this.THUMBNAIL_CACHE.get(thumbnailKey);

        if (cached) return cached;

        const pending = this.PENDING_THUMBNAILS.get(thumbnailKey);

        if (pending) return pending;

        const buildContainer = (part: IAvatarEditorCategoryPartItem, useColors: boolean, partColors: IPartColor[], isDisabled: boolean = false) => {
            const container = new OctaneContainer();
            const sourceParts = part.partSet.parts;
            const parts = sourceParts.concat().sort(this.sortByDrawOrder);
            let renderedCount = 0;
            let directionIndex = -1;

            for (const sourcePart of sourceParts) {
                if (!sourcePart) continue;

                for (let index = 0; index < AvatarEditorThumbnailsHelper.THUMB_DIRECTIONS.length; index++) {
                    const assetName = `${AvatarFigurePartType.SCALE}_${AvatarFigurePartType.STD}_${sourcePart.type}_${sourcePart.id}_${AvatarEditorThumbnailsHelper.THUMB_DIRECTIONS[index]}_${AvatarFigurePartType.DEFAULT_FRAME}`;

                    if (GetAvatarRenderManager().getAssetByName(assetName)?.texture) {
                        directionIndex = index;

                        break;
                    }
                }

                if (directionIndex >= 0) break;
            }

            if (directionIndex < 0) return { container, renderedCount };

            const drawn: { figurePart: IFigurePart; asset: IGraphicAsset }[] = [];
            let union: AvatarEditorThumbRect = null;

            for (const figurePart of parts) {
                if (!figurePart) continue;

                const assetName = `${AvatarFigurePartType.SCALE}_${AvatarFigurePartType.STD}_${figurePart.type}_${figurePart.id}_${AvatarEditorThumbnailsHelper.THUMB_DIRECTIONS[directionIndex]}_${AvatarFigurePartType.DEFAULT_FRAME}`;
                const asset: IGraphicAsset = GetAvatarRenderManager().getAssetByName(assetName);

                if (!asset?.texture) continue;

                drawn.push({ figurePart, asset });

                const rect: AvatarEditorThumbRect = { x: asset.x, y: asset.y, width: asset.width, height: asset.height };

                union = union ? unionAvatarEditorThumbRect(union, rect) : rect;
            }

            if (!union || union.width <= 0 || union.height <= 0) return { container, renderedCount };

            for (const { figurePart, asset } of drawn) {
                const sprite = new OctaneSprite(asset.texture);
                const dest = avatarEditorThumbDest(asset.x, asset.y, union);

                sprite.position.set(dest.x, dest.y);

                if (useColors && figurePart.colorLayerIndex > 0 && partColors && partColors.length) {
                    const color = partColors[figurePart.colorLayerIndex - 1];

                    if (color) sprite.tint = color.rgb;
                }

                container.addChild(sprite);
                renderedCount++;
            }

            if (isDisabled) container.filters = [AvatarEditorThumbnailsHelper.ALPHA_FILTER];

            return { container, renderedCount };
        };

        const promise = new Promise<string>((resolve) => {
            let completed = false;

            const resetFigure = async (figure: string) => {
                if (completed) return;

                const { container, renderedCount } = buildContainer(part, useColors, partColors, isDisabled);

                if (renderedCount === 0) {
                    completed = true;
                    container.destroy({ children: true });
                    resolve(null);

                    return;
                }

                try {
                    const renderedUrl = await TextureUtils.generateImageUrl({ target: container, resolution: 1 });
                    const imageUrl = renderedUrl ? await AvatarEditorThumbnailsHelper.centerIntoThumbBox(renderedUrl) : renderedUrl;

                    if (completed) return;

                    completed = true;

                    if (imageUrl) AvatarEditorThumbnailsHelper.THUMBNAIL_CACHE.set(thumbnailKey, imageUrl);

                    resolve(imageUrl);
                } catch {
                    if (!completed) {
                        completed = true;
                        resolve(null);
                    }
                } finally {
                    container.destroy({ children: true });
                }
            };

            const figureContainer = GetAvatarRenderManager().createFigureContainer(`${setType}-${part.partSet.id}`);

            if (!GetAvatarRenderManager().isFigureContainerReady(figureContainer)) {
                GetAvatarRenderManager().downloadAvatarFigure(figureContainer, {
                    resetFigure,
                    dispose: null,
                    disposed: false
                });
            } else {
                resetFigure(null);
            }
        });

        this.PENDING_THUMBNAILS.set(thumbnailKey, promise);
        void promise.finally(() => {
            if (this.PENDING_THUMBNAILS.get(thumbnailKey) === promise) this.PENDING_THUMBNAILS.delete(thumbnailKey);
        });

        return promise;
    }

    public static async buildForFace(figureString: string, isDisabled: boolean = false): Promise<string> {
        if (!figureString || !figureString.length) return null;

        const thumbnailKey = `face:${figureString}${isDisabled ? '-d' : ''}`;
        const cached = this.THUMBNAIL_CACHE.get(thumbnailKey);

        if (cached) return cached;

        const promise = new Promise<string>((resolve) => {
            let completed = false;

            const resetFigure = async (figure: string) => {
                if (completed) return;

                let avatarImage: IAvatarImage = null;
                try {
                    avatarImage = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.LARGE, null, {
                        resetFigure,
                        dispose: null,
                        disposed: false
                    });

                    if (!avatarImage) {
                        completed = true;
                        resolve(null);

                        return;
                    }

                    if (avatarImage.isPlaceholder()) return;

                    const croppedImageUrl = avatarImage.processAsCroppedImageUrl(AvatarSetType.HEAD);
                    if (!croppedImageUrl) {
                        completed = true;
                        resolve(null);

                        return;
                    }

                    const imageUrl = await AvatarEditorThumbnailsHelper.trimTransparentPadding(croppedImageUrl);

                    if (completed) return;

                    completed = true;

                    if (imageUrl) AvatarEditorThumbnailsHelper.THUMBNAIL_CACHE.set(thumbnailKey, imageUrl);

                    resolve(imageUrl);
                } catch {
                    if (!completed) {
                        completed = true;
                        resolve(null);
                    }
                } finally {
                    avatarImage?.dispose();
                }
            };

            resetFigure(figureString);
        });

        return promise;
    }

    private static sortByDrawOrder(a: IFigurePart, b: IFigurePart): number {
        const indexA = AvatarEditorThumbnailsHelper.DRAW_ORDER.indexOf(a.type);
        const indexB = AvatarEditorThumbnailsHelper.DRAW_ORDER.indexOf(b.type);

        if (indexA < indexB) return -1;

        if (indexA > indexB) return 1;

        if (a.index < b.index) return -1;

        if (a.index > b.index) return 1;

        return 0;
    }
}
