import type { IHotelViewHallOfFameUser } from '@octane/renderer';
import { CreateLinkEvent } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useNavigatorData } from '../../hooks/navigator/useNavigatorData';

/** One slot of the landing view as a card: what HotelView renders for it, ready to show. */
export interface HandheldHotelViewCard {
    id: number;
    type: string;
    enabled: boolean;
    /** The slot's picture, already resolved (or the countdown icon); '' for none. */
    imageUrl: string;
    /** The slot's content (live widget or the staff's texts and buttons); null for a disabled slot. */
    content: ReactNode;
}

/** The scene's art, already resolved; '' where the hotel has none. */
export interface HandheldHotelViewScene {
    backgroundUrl: string;
    leftUrl: string;
    rightUrl: string;
    drapeUrl: string;
}

export interface HandheldHotelViewProps {
    scene: HandheldHotelViewScene;
    figure: string;
    gender: string;
    cards: HandheldHotelViewCard[];
    /** The Hall of Fame of the scene; empty when it is off or has nobody. */
    hallOfFameUsers: IHotelViewHallOfFameUser[];
    canEdit: boolean;
    onEditSlot: (slotId: number) => void;
    onEditScene: () => void;
    /** The open slot or scene editor (HotelView's own form), or null. */
    editor: ReactNode;
    editorTitle: string;
    onCloseEditor: () => void;
    /** Buttons the hotel adds to the home screen (the free cursed dragon), shown above the cards. */
    extras?: ReactNode;
}

const Pencil: FC = () => (
    <svg aria-hidden="true" className="octane-handheld-hotel__pencil" viewBox="0 0 16 16">
        <path d="M3 13 L3.6 10.4 L10.6 3.4 L12.6 5.4 L5.6 12.4 Z M9.4 4.6 L11.4 6.6" />
    </svg>
);

/**
 * The hotel view on a phone, in the Octane handheld look (HandheldHotelView.css). HotelView keeps the landing data, the
 * packets, the links and the staff editors and hands them here. Upright, the scene is a picture across the top (the art
 * cropped around its middle, the player standing in it) and the slots are a list of cards that scrolls up over it; on its
 * side the scene fills the left and the cards are a column at the right. The purse keeps the top right corner and the
 * dock the bottom, so the list starts under the one and stops above the other. A staff member gets an edit button on
 * every card and one for the scene; the editors are a sheet.
 */
export const HandheldHotelView: FC<HandheldHotelViewProps> = (props) => {
    const { scene, figure, gender, cards, hallOfFameUsers, canEdit, onEditSlot, onEditScene, editor, editorTitle, onCloseEditor, extras = null } = props;
    const { navigatorData } = useNavigatorData();
    const homeRoomId = navigatorData?.homeRoomId ?? 0;
    const hallOfFameTitle = localizeWithFallback('octane.hotel_view.hall_of_fame', 'Hall of Fame');

    return (
        <NativeTextTree>
            <div className="octane-handheld-hotel" data-testid="handheld-hotel-view">
                <div aria-hidden="true" className="octane-handheld-hotel__scene">
                    <div
                        className="octane-handheld-hotel__backdrop"
                        style={scene.backgroundUrl ? { backgroundImage: `url("${scene.backgroundUrl}")` } : undefined}
                    />
                    {scene.drapeUrl && <img alt="" className="octane-handheld-hotel__art is-drape" draggable={false} src={scene.drapeUrl} />}
                    {scene.rightUrl && <img alt="" className="octane-handheld-hotel__art is-right" draggable={false} src={scene.rightUrl} />}
                    {scene.leftUrl && <img alt="" className="octane-handheld-hotel__art is-left" draggable={false} src={scene.leftUrl} />}
                    <div className="octane-handheld-hotel__avatar">
                        <LayoutAvatarImageView classNames={['octane-handheld-hotel__figure']} direction={2} figure={figure} gender={gender} />
                    </div>
                </div>
                <div className="octane-handheld-hotel__feed" data-testid="handheld-hotel-feed">
                    <div className="octane-handheld-hotel__actions">
                        {homeRoomId > 0 ? (
                            <BaseButton className="octane-handheld-hotel__home" type="button" onClick={() => CreateLinkEvent('navigator/goto/home')}>
                                <span aria-hidden="true" className="octane-icon icon-house" />
                                <span className="octane-handheld-hotel__home-label">
                                    {localizeWithFallback('octane.hotel_view.go_to_home_room', 'Go to home room')}
                                </span>
                            </BaseButton>
                        ) : (
                            <BaseButton className="octane-handheld-hotel__home" type="button" onClick={() => CreateLinkEvent('navigator/create')}>
                                <span aria-hidden="true" className="octane-icon icon-house" />
                                <span className="octane-handheld-hotel__home-label">
                                    {localizeWithFallback('octane.hotel_view.create_room', 'Create room')}
                                </span>
                            </BaseButton>
                        )}
                        {canEdit && (
                            <BaseButton
                                aria-label={localizeWithFallback('octane.hotel_view.edit_hotelview_images', 'Edit HotelView images')}
                                className="octane-handheld-hotel__edit is-scene"
                                type="button"
                                onClick={onEditScene}
                            >
                                <Pencil />
                            </BaseButton>
                        )}
                    </div>
                    {extras}
                    {cards.map((card) => (
                        <section
                            key={card.id}
                            className="octane-handheld-hotel__card"
                            data-disabled={card.enabled ? undefined : ''}
                            data-has-image={card.enabled && card.imageUrl ? '' : undefined}
                            data-type={card.type}
                        >
                            {card.enabled && card.imageUrl && (
                                <img alt="" className="octane-handheld-hotel__card-image" draggable={false} src={card.imageUrl} />
                            )}
                            <div className="octane-handheld-hotel__card-copy">
                                {card.enabled ? (
                                    card.content
                                ) : (
                                    <span className="octane-handheld-hotel__disabled">
                                        {localizeWithFallback('octane.hotel_view.disabled_slot', 'Disabled slot')}
                                    </span>
                                )}
                            </div>
                            {canEdit && (
                                <BaseButton
                                    aria-label={localizeWithFallback('octane.hotel_view.edit_slot_id', 'Edit slot %id%', ['id'], [String(card.id)])}
                                    className="octane-handheld-hotel__edit"
                                    type="button"
                                    onClick={() => onEditSlot(card.id)}
                                >
                                    <Pencil />
                                </BaseButton>
                            )}
                        </section>
                    ))}
                    {hallOfFameUsers.length > 0 && (
                        <section aria-label={hallOfFameTitle} className="octane-handheld-hotel__card is-hall-of-fame">
                            <div className="octane-handheld-hotel__card-copy">
                                <h2>{hallOfFameTitle}</h2>
                                <p>
                                    {localizeWithFallback(
                                        'octane.hotel_view.celebrating_the_hotel_s_standout_habbos',
                                        'Celebrating the hotel’s standout Habbos'
                                    )}
                                </p>
                                <ul className="octane-handheld-hotel__fame">
                                    {hallOfFameUsers.map((user, index) => (
                                        <li key={user.id} className="octane-handheld-hotel__fame-user">
                                            <LayoutAvatarImageView
                                                classNames={['octane-handheld-hotel__fame-avatar']}
                                                direction={[2, 4][index % 2]}
                                                figure={user.figure}
                                                gender={user.gender}
                                            />
                                            <span className="octane-handheld-hotel__fame-name">{user.username}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}
                </div>
                {editor && (
                    <DraggableWindow handheldSheet uniqueKey="hotel-view-editor">
                        <HandheldSheetFrame className="octane-handheld-hotel-sheet" icon="icon-house" title={editorTitle} onClose={onCloseEditor}>
                            {editor}
                        </HandheldSheetFrame>
                    </DraggableWindow>
                )}
            </div>
        </NativeTextTree>
    );
};
