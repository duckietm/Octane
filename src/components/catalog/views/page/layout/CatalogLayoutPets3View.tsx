import { FC } from 'react';
import { FaPaw } from 'react-icons/fa';
import { SanitizeHtml } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutPets3View: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;

    const imageUrl = page.localization.getImage(1);

    return (
        <NativeTextTree>
            <div className="flex flex-col h-full gap-2">
                {/* Header card */}
                <div className="flex items-center gap-3 p-2.5 bg-white rounded border-2 border-card-grid-item-border">
                    {imageUrl && <img alt="" className="w-[60px] h-[60px] object-contain shrink-0" src={imageUrl} />}
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <FaPaw className="text-primary text-xs" />
                            <span className="text-sm font-bold" dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(1)) }} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-white rounded border-2 border-card-grid-item-border p-3">
                    <div className="text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(2)) }} />
                </div>

                {/* Footer */}
                {!!page.localization.getText(3) && (
                    <div className="p-2 bg-card-grid-item rounded border border-card-grid-item-border">
                        <span className="text-[11px] font-bold" dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(3)) }} />
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
