import { GetSessionDataManager, HabboClubLevelEnum } from '@octane/renderer';

export function HasHabboVip(): boolean {
    return GetSessionDataManager().clubLevel >= HabboClubLevelEnum.VIP;
}
