import { FC, ReactNode, useState } from 'react';
import { CreateLinkEvent, GetClubMemberLevel, IAvatarEditorCategory, localizeWithFallback } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../common/ToggleButton';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorAdvancedColorView, AvatarEditorPaletteSetView } from './palette-set';

export interface HandheldLooksPartsViewProps {
    category: IAvatarEditorCategory;
    /** What stands above the grid: the gender choice, the sub-categories, the companion that is worn. */
    chips?: ReactNode;
    chipsLabel?: string;
    /** False for a category without colours (a companion that has none). */
    showColours?: boolean;
}

/**
 * Phone avatar editor: one clothing category as the part grid with its choices above and its colours beside it
 * (HandheldLooks.css). Upright the colours are swiped sideways under the grid; on a phone held on its side they are
 * a column right of it. A part with more than one colour gets one row of swatches per colour.
 */
export const HandheldLooksPartsView: FC<HandheldLooksPartsViewProps> = (props) => {
    const { category, chips = null, chipsLabel, showColours = true } = props;
    const [advancedColorMode, setAdvancedColorMode] = useState(false);
    const { maxPaletteCount = 1 } = useAvatarEditor();
    const hasHC = GetClubMemberLevel() > 0;
    const paletteCount = Math.min(Math.max(maxPaletteCount, 1), category.colorItems?.length ?? 0);
    const hasColours = showColours && paletteCount > 0 && !!category.colorItems[0]?.length;

    return (
        <NativeTextTree>
            <div className="octane-handheld-looks__model">
                <div className="octane-handheld-looks__parts-column">
                    {chips && (
                        <div aria-label={chipsLabel} className="octane-handheld-looks__chips" role="group">
                            {chips}
                        </div>
                    )}
                    <div className="octane-handheld-looks__parts">
                        <AvatarEditorFigureSetView category={category} columnCount={5} />
                    </div>
                </div>
                {hasColours && (
                    <div className="octane-handheld-looks__colours" data-palettes={paletteCount}>
                        <div className="octane-handheld-looks__colours-head">
                            <span className="octane-handheld-looks__colours-title">{localizeWithFallback('octane.handheld.looks.colours', 'Colours')}</span>
                            <ToggleButton
                                className={`octane-handheld-looks__advanced${advancedColorMode ? ' is-active' : ''}`}
                                pressed={advancedColorMode}
                                onClick={() => (hasHC ? setAdvancedColorMode((previous) => !previous) : CreateLinkEvent('habboUI/open/hccenter'))}
                            >
                                <span>{localizeWithFallback('octane.avatar_editor.advanced_color', 'Advanced Color')}</span>
                                <LayoutCurrencyIcon type="hc" />
                            </ToggleButton>
                        </div>
                        <div className="octane-handheld-looks__palettes">
                            {Array.from({ length: paletteCount }, (_, paletteIndex) => (
                                <div key={paletteIndex} className="octane-handheld-looks__palette">
                                    {advancedColorMode ? (
                                        <AvatarEditorAdvancedColorView category={category} paletteIndex={paletteIndex} />
                                    ) : (
                                        <AvatarEditorPaletteSetView category={category} columnCount={0} paletteIndex={paletteIndex} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
