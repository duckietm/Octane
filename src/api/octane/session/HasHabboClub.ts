import { GetSessionDataManager, HabboClubLevelEnum } from '@octane/renderer';

export function HasHabboClub(): boolean {
    return GetSessionDataManager().clubLevel >= HabboClubLevelEnum.CLUB;
}
