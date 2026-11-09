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
import { canvasToThumbnailUrl, centerCanvasIntoBox, imageUrlToCanvas, ThumbnailUrlCache, trimCanvasToOpaqueBounds } from './avatarThumbnailUrls';
import { IAvatarEditorCategoryPartItem } from './IAvatarEditorCategoryPartItem';

const MAX_CACHE_BYTES = 48 * 1024 * 1024;

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
    private static THUMBNAIL_CACHE: ThumbnailUrlCache = new ThumbnailUrlCache(MAX_CACHE_BYTES);
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

    private static async cacheCanvas(key: string, canvas: HTMLCanvasElement): Promise<string> {
        const entry = await canvasToThumbnailUrl(canvas);

        if (!entry) return null;

        this.THUMBNAIL_CACHE.set(key, entry);

        return entry.url;
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
                    const rendered = TextureUtils.generateCanvas({ target: container, resolution: 1 }) as HTMLCanvasElement;
                    const imageUrl = rendered
                        ? await AvatarEditorThumbnailsHelper.cacheCanvas(
                              thumbnailKey,
                              centerCanvasIntoBox(rendered, AvatarEditorThumbnailsHelper.THUMB_BOX)
                          )
                        : null;

                    if (completed) return;

                    completed = true;

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

        const pending = this.PENDING_THUMBNAILS.get(thumbnailKey);

        if (pending) return pending;

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

                    const decoded = await imageUrlToCanvas(croppedImageUrl);
                    const imageUrl = decoded
                        ? await AvatarEditorThumbnailsHelper.cacheCanvas(thumbnailKey, trimCanvasToOpaqueBounds(decoded))
                        : null;

                    if (completed) return;

                    completed = true;

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

        this.PENDING_THUMBNAILS.set(thumbnailKey, promise);
        void promise.finally(() => {
            if (this.PENDING_THUMBNAILS.get(thumbnailKey) === promise) this.PENDING_THUMBNAILS.delete(thumbnailKey);
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
