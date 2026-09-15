import { GetHotLooksComposer, HotLooksEvent } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { groupHotLooksByGender, IHotLookEntry, LocalizeText, MAX_HOT_LOOKS, normalizeHotLookGender, SendMessageComposer, selectHotLookFigure } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { useAvatarEditor, useMessageEvent } from '../../hooks';

/**
 * AIR 13 "hotlooks" tab (HotLooksModel / HotLooksView): a title, a "click to choose" hint and an
 * item grid of ready-made outfits of the current gender. Clicking one loads the figure into the
 * editor; the player then saves it like any other look.
 */
export const AvatarEditorHotLooksView: FC<{}> = () => {
    const [looks, setLooks] = useState<IHotLookEntry[]>([]);
    const { gender = null, loadAvatarData = null } = useAvatarEditor();
    const currentGender = normalizeHotLookGender(gender);
    const visibleLooks = useMemo(() => groupHotLooksByGender(looks)[currentGender], [looks, currentGender]);

    useMessageEvent<HotLooksEvent>(HotLooksEvent, (event) => {
        const parser = event.getParser();

        setLooks(parser.hotLooks.map((look) => ({ gender: look.gender, figureString: look.figureString })));
    });

    useEffect(() => {
        SendMessageComposer(new GetHotLooksComposer(MAX_HOT_LOOKS));
    }, []);

    const selectHotLook = (index: number) => {
        const look = selectHotLookFigure(looks, currentGender, index);

        if (!look) return;

        loadAvatarData(look.figureString, look.gender);
    };

    return (
        <div className="octane-avatar-editor-model octane-avatar-editor-hotlooks">
            <div className="octane-avatar-editor-hotlooks-title">{LocalizeText('avatareditor.hotlooks.title')}</div>
            <div className="octane-avatar-editor-hotlooks-choose">{LocalizeText('avatareditor.hotlooks.choose')}</div>
            <div className="octane-avatar-editor-hotlooks-grid">
                {visibleLooks.map((look, index) => (
                    <button
                        type="button"
                        key={`hotlook-${index}`}
                        className="octane-avatar-editor-hotlooks-item"
                        disabled={!look.figureString}
                        aria-label={LocalizeText('avatareditor.hotlooks.choose')}
                        onClick={() => selectHotLook(index)}
                    >
                        <LayoutAvatarImageView direction={4} figure={look.figureString} gender={look.gender} fit />
                    </button>
                ))}
            </div>
        </div>
    );
};
