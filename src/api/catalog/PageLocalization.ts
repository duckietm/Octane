import { GetConfigurationValue } from '../octane';
import { IPageLocalization } from './IPageLocalization';

export class PageLocalization implements IPageLocalization {
    private _images: string[];
    private _texts: string[];

    constructor(images: string[], texts: string[]) {
        this._images = images;
        this._texts = texts;
    }

    public getText(index: number): string {
        let message = this._texts[index] || '';

        if (message && message.length) message = message.replace(/\r\n|\r|\n/g, '<br />');

        return message;
    }

    public getImage(index: number): string {
        const imageName = this._images[index] || '';

        if (!imageName || !imageName.length) return null;

        // Already a full URL (any extension) -> use it directly.
        if (/^https?:\/\//i.test(imageName)) return imageName;

        let assetUrl = GetConfigurationValue<string>('catalog.asset.image.url');

        // The template forces ".gif" (.../%name%.gif). If the image name
        // already carries its own extension (png/jpg/webp/gif), don't append
        // the forced .gif so non-gif catalog images work too.
        if (/\.[a-z0-9]+$/i.test(imageName)) assetUrl = assetUrl.replace(/\.gif(?=$|\?)/i, '');

        assetUrl = assetUrl.replace('%name%', imageName);

        return assetUrl;
    }
}
