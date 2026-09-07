import { AvatarAction, AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { LayoutAvatarImageView } from '../../../../common';

const WALK_FRAME_COUNT = 4;
const WALK_FRAME_MS = 120;
const DIE_FRAME_COUNT = 4;
const THROW_FRAME_COUNT = 9;

// figure|gender|direction -> official SnowWar movement/action frames.
const POSE_CACHE: Map<string, { stand: string; walk: string[]; pick: string; throwFrames: string[]; dieBack: string[] }> = new Map();
const POSE_CACHE_MAX = 64;

export const getSnowWarFigure = (figure: string, teamId: number): string =>
{
    const parts = figure.split('.').filter(part => part && !part.startsWith('cc-'));
    const chest = `ch-${teamId === 1 ? 20001 : 20000}-1`;
    const chestIndex = parts.findIndex(part => part.startsWith('ch-'));

    if (chestIndex === -1) parts.push(chest);
    else parts[chestIndex] = chest;

    return parts.join('.');
};

interface SnowWarAvatarViewProps
{
    figure: string;
    gender: string;
    teamId?: number;
    direction: number;
    walking: boolean;
    stunned?: boolean;
    stunElapsedMs?: number;
    picking?: boolean;
    throwing?: boolean;
    // 0..1 across AIR's throw window.
    throwProgress?: number;
    frameNow: number;
    scale?: number;
}

/**
 * Arena avatar with the official SnowWar movement/action postures. Once the
 * frames are ready, one persistent sprite is used across every state so pose
 * transitions cannot briefly remount an empty avatar image.
 */
export const SnowWarAvatarView: FC<SnowWarAvatarViewProps> = (props) =>
{
    const { figure, gender, teamId = 0, direction, walking, stunned = false, stunElapsedMs = 0, picking = false, throwing = false, throwProgress = 0, frameNow, scale = 1 } = props;
    const snowWarFigure = getSnowWarFigure(figure, teamId);
    const [pose, setPose] = useState<{ stand: string; walk: string[]; pick: string; throwFrames: string[]; dieBack: string[] }>(null);
    const isDisposed = useRef(false);
    const requestIdRef = useRef(0);

    useEffect(() =>
    {
        isDisposed.current = false;

        const requestId = ++requestIdRef.current;
        const cacheKey = [snowWarFigure, gender, direction].join('|');

        const cached = POSE_CACHE.get(cacheKey);
        if (cached)
        {
            setPose(cached);
            return;
        }

        // Keep the previous frames visible while the new direction regenerates
        // (don't blank to null) so a throw's facing change can't drop the avatar
        // back to the static standing image mid-animation.

        // Same reset/retry contract as LayoutAvatarImageView: the first pass
        // may render placeholders while figure assets download; resetFigure
        // fires again once they land and the real frames replace them.
        const renderFrames = (renderFigure: string) =>
        {
            if (isDisposed.current || (requestIdRef.current !== requestId)) return;

            const avatarImage = GetAvatarRenderManager().createAvatarImage(renderFigure, AvatarScaleType.LARGE, gender, {
                resetFigure: (updatedFigure: string) => renderFrames(updatedFigure),
                dispose: null,
                disposed: false
            });

            if (!avatarImage) return;

            const renderPose = (posture: string): string =>
            {
                avatarImage.initActionAppends();
                avatarImage.setDirection(AvatarSetType.FULL, direction);
                avatarImage.appendAction(AvatarAction.POSTURE, posture);
                avatarImage.resetAnimationFrameCounter();
                avatarImage.updateAnimationByFrames(0);
                return avatarImage.processAsImageUrl(AvatarSetType.FULL);
            };

            const renderPostureFrames = (posture: string, frameCount: number, postureDirection = direction): string[] =>
            {
                avatarImage.initActionAppends();
                avatarImage.setDirection(AvatarSetType.FULL, postureDirection);
                avatarImage.appendAction(AvatarAction.POSTURE, posture);
                return Array.from({ length: frameCount }, (_, frame) =>
                {
                    avatarImage.resetAnimationFrameCounter();
                    avatarImage.updateAnimationByFrames(frame);
                    return avatarImage.processAsImageUrl(AvatarSetType.FULL);
                });
            };

            const stand = renderPose(AvatarAction.POSTURE_STAND);
            const walk = renderPostureFrames(AvatarAction.SNOWWAR_RUN, WALK_FRAME_COUNT);
            const pick = renderPostureFrames(AvatarAction.SNOWWAR_PICK, 1)[0];
            const dieBack = renderPostureFrames(AvatarAction.SNOWWAR_DIE_BACK, DIE_FRAME_COUNT, direction - (direction % 2));
            const throwFrames = renderPostureFrames(AvatarAction.SNOWWAR_THROW, THROW_FRAME_COUNT);

            const isPlaceholder = avatarImage.isPlaceholder();

            avatarImage.dispose();

            if (isDisposed.current || (requestIdRef.current !== requestId)) return;
            if (!stand || !pick || walk.some(url => !url) || dieBack.some(url => !url) || throwFrames.some(url => !url)) return;

            const rendered = { stand, walk, pick, throwFrames, dieBack };

            if (!isPlaceholder)
            {
                if (POSE_CACHE.size >= POSE_CACHE_MAX)
                {
                    const firstKey = POSE_CACHE.keys().next().value;
                    POSE_CACHE.delete(firstKey);
                }

                POSE_CACHE.set(cacheKey, rendered);
            }

            setPose(rendered);
        };

        renderFrames(snowWarFigure);

        return () =>
        {
            isDisposed.current = true;
        };
    }, [snowWarFigure, gender, direction]);

    // The shared imager is only the initial loading fallback. It is never
    // remounted for later movement/action transitions.
    if (!pose)
    {
        return <LayoutAvatarImageView direction={direction} figure={snowWarFigure} gender={gender} scale={scale} />;
    }

    const frameUrl = stunned
        ? pose.dieBack[Math.min(DIE_FRAME_COUNT - 1, Math.max(0, Math.floor(stunElapsedMs / WALK_FRAME_MS)))]
        : picking
            ? pose.pick
            : throwing
                ? pose.throwFrames[Math.min(THROW_FRAME_COUNT - 1, Math.floor(throwProgress * THROW_FRAME_COUNT))]
                : walking
                    ? pose.walk[Math.floor(frameNow / WALK_FRAME_MS) % WALK_FRAME_COUNT]
                    : pose.stand;

    const style: CSSProperties = { backgroundImage: `url('${frameUrl}')` };

    if (scale !== 1)
    {
        style.transform = `scale(${scale})`;
        if (!(scale % 1)) style.imageRendering = 'pixelated';
    }

    return <div className="avatar-image relative w-[90px] h-[130px] bg-no-repeat left-[-2px] pointer-events-none" style={style} />;
};
