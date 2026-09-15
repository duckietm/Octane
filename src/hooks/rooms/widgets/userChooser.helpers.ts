import { RoomObjectType } from '@octane/renderer';

export type UserChooserType = 'user' | 'pet' | 'bot';
export type UserChooserTypeFilter = 'all' | UserChooserType;

export interface UserChooserTypeOption {
    value: UserChooserTypeFilter;
    key: string;
    fallback: string;
}

// Same order as the official type dropdown (UsersView.as): all, users, pets, bots.
export const USER_CHOOSER_TYPE_OPTIONS: UserChooserTypeOption[] = [
    { value: 'all', key: 'new_user_chooser.usertype.all', fallback: 'All types' },
    { value: 'user', key: 'wiredfurni.params.usertype.1', fallback: 'Users' },
    { value: 'pet', key: 'wiredfurni.params.usertype.2', fallback: 'Pets' },
    { value: 'bot', key: 'wiredfurni.params.usertype.4', fallback: 'Bots' }
];

/** Maps the room unit type to the chooser type; unknown types are dropped. */
export const getUserChooserType = (unitType: number): UserChooserType | null => {
    switch (unitType) {
        case RoomObjectType.USER:
            return 'user';
        case RoomObjectType.PET:
            return 'pet';
        case RoomObjectType.BOT:
        case RoomObjectType.RENTABLE_BOT:
            return 'bot';
        default:
            return null;
    }
};

export interface UserChooserFilterable {
    name: string;
    type: string;
}

/**
 * The official chooser filters on the lower-cased name and the selected
 * type at the same time, then shows "%amount% users found".
 */
export const filterUserChooserItems = <T extends UserChooserFilterable>(items: T[], search: string, typeFilter: UserChooserTypeFilter): T[] => {
    const needle = (search || '').toLocaleLowerCase();

    return items.filter((item) => {
        if (needle.length > 0 && !(item.name || '').toLocaleLowerCase().includes(needle)) return false;

        return typeFilter === 'all' || item.type === typeFilter;
    });
};
