import { FC, useCallback, useMemo } from 'react';
import { GetConfigurationValue, useUiSettings } from '../../api';
import { BaseButton } from '../../common/BaseButton';

export const InterfaceImageTabView: FC<{}> = () => {
    const { settings, updateSettings } = useUiSettings();

    const imageCount = useMemo(() => {
        return GetConfigurationValue<number>('ui.header.images.count', 30);
    }, []);

    const baseUrl = useMemo(() => {
        return GetConfigurationValue<string>('ui.header.images.url', '');
    }, []);

    const images = useMemo(() => {
        const result: string[] = [];
        for (let i = 1; i <= imageCount; i++) {
            result.push(baseUrl.replace('{id}', String(i)));
        }
        return result;
    }, [imageCount, baseUrl]);

    const onImageSelect = useCallback(
        (url: string) => {
            updateSettings({
                colorMode: 'image',
                headerImageUrl: url
            });
        },
        [updateSettings]
    );

    return (
        <div className="grid grid-cols-8 gap-1 p-2 overflow-auto max-h-[400px]">
            {images.map((url, i) => (
                <BaseButton aria-label={url}
                    key={i}
                    className={`w-[75px] h-[75px] rounded cursor-pointer border-2 transition-all hover:scale-105 ${settings.colorMode === 'image' && settings.headerImageUrl === url ? 'border-white shadow-lg' : 'border-transparent'}`}
                    style={{
                        backgroundImage: `url(${url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                    onClick={() => onImageSelect(url)}
                />
            ))}
        </div>
    );
};
