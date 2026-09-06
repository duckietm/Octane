import { GroupFavoriteComposer, GroupUnfavoriteComposer, HabboGroupEntryData } from '@octane/renderer';
import { SendMessageComposer } from '../octane';

export const ToggleFavoriteGroup = (group: HabboGroupEntryData) => {
    SendMessageComposer(group.favourite ? new GroupUnfavoriteComposer(group.groupId) : new GroupFavoriteComposer(group.groupId));
};
