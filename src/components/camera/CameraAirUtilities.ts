export interface CameraAchievementLike {
    badgeId: string;
    finalLevel: boolean;
    level: number;
}

export interface CameraAchievementCategoryLike {
    achievements: CameraAchievementLike[];
    code: string;
}

const CAMERA_ACHIEVEMENT_CODE = 'ACH_CameraPhotoCount';

export const getCameraAchievementLevel = (categories: CameraAchievementCategoryLike[]): number => {
    const getCategoryLevel = (categoryCode: string): number => {
        const category = categories.find((entry) => entry.code === categoryCode);
        const achievement = category?.achievements.find((entry) => entry.badgeId.startsWith(CAMERA_ACHIEVEMENT_CODE));

        if (!achievement) return 0;

        return achievement.finalLevel ? achievement.level : Math.max(0, achievement.level - 1);
    };

    return getCategoryLevel('explore') || getCategoryLevel('archive');
};

export const getNextEmptyCameraSlot = <T>(cameraRoll: readonly (T | null)[]): number => cameraRoll.findIndex((picture) => !picture);

export const willFillLastCameraSlot = <T>(cameraRoll: readonly (T | null)[], targetSlot: number): boolean => {
    if (targetSlot < 0 || targetSlot >= cameraRoll.length || cameraRoll[targetSlot]) return false;

    return cameraRoll.filter(Boolean).length === cameraRoll.length - 1;
};

export const joinCameraPhotoUrl = (base: string, path: string): string => {
    if (!path) return '';
    if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
    if (!base) return path;

    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};
