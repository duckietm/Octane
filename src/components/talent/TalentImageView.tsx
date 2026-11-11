import { FC, ImgHTMLAttributes, useState } from 'react';
import { GetConfigurationValue, talentImageSources, talentProductIconUrl } from '../../api';
import { TALENT_LIBRARY_IMAGES } from '../../assets/images/talent/library';

interface TalentImageViewProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    /** The picture's image library URL (`…talent/<name>.png`). */
    src: string;
    /** A reward product's code: its furni icon is the last resort when the product has no picture. */
    productCode?: string;
}

/**
 * A talent picture. AIR reads it from the image library; here the library is tried first, then the copy that ships
 * with the client, then (for a reward product) the furni's icon. With nothing left the picture is hidden.
 */
export const TalentImageView: FC<TalentImageViewProps> = (props) => {
    const { src, productCode = '', ...rest } = props;
    const sources = talentImageSources(
        src,
        TALENT_LIBRARY_IMAGES,
        productCode ? talentProductIconUrl(GetConfigurationValue<string>('furni.asset.icon.url', ''), productCode) : ''
    );
    const [failed, setFailed] = useState<{ key: string; count: number }>({ key: src, count: 0 });
    // A new picture starts from its first source again.
    const count = failed.key === src ? failed.count : 0;

    if (count >= sources.length) return null;

    return <img alt="" draggable={false} {...rest} src={sources[count]} onError={() => setFailed({ key: src, count: count + 1 })} />;
};
