import { FC, useEffect, useState } from 'react';
import { FaBan, FaChevronLeft, FaChevronRight, FaExternalLinkAlt, FaImage, FaSync, FaTrash } from 'react-icons/fa';
import {
    formatHousekeepingListCell,
    HousekeepingApi,
    housekeepingFailureKey,
    HousekeepingTabId,
    IHousekeepingList,
    LocalizeText,
    profileImageUrl
} from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HousekeepingButton, HousekeepingEmptyState, HousekeepingPill } from '../common/HousekeepingParts';
import { BaseButton } from '../../../../common/BaseButton';
import { Hint } from '../../../../common/Tooltip';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const PROFILE_IMAGES_LIST = 'hotel.profile_images';
/** The server answers pages of this many pictures. */
const PAGE_SIZE = 60;

/** Pictures players uploaded to their profile and still show, newest first: remove one, or remove it and block uploads. */
export const HousekeepingProfileImagesTab: FC = () => {
    const { lookupUserById, setActiveTab } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [page, setPage] = useState(0);
    const [list, setList] = useState<IHousekeepingList | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        setIsLoading(true);
        setError(null);

        HousekeepingApi.requestList(PROFILE_IMAGES_LIST, page, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;

                setList(result);
                setError(result.ok ? null : result.message || 'housekeeping.list.failed');
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(housekeepingFailureKey(reason, 'housekeeping.list.failed'));
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });

        return () => controller.abort();
    }, [page, reload]);

    const cell = (row: string[], name: string) => {
        const index = list?.columns.indexOf(name) ?? -1;

        return index >= 0 ? row[index] : '';
    };

    const openUser = (userId: number) => {
        setActiveTab(HousekeepingTabId.USERS);
        lookupUserById(userId);
    };

    const remove = (pictureId: number, username: string, block: boolean) =>
        confirm(LocalizeText(block ? 'housekeeping.profile_images.block.confirm' : 'housekeeping.profile_images.remove.confirm', ['username'], [username]), async () => {
            setIsPending(true);
            setNotice(null);

            const result = await HousekeepingApi.removeProfileImage(pictureId, block);

            setIsPending(false);
            setNotice(result.ok ? (block ? 'housekeeping.profile_images.blocked' : 'housekeeping.profile_images.removed') : result.message || 'housekeeping.list.failed');
            setReload((value) => value + 1);
        });

    const rows = list?.rows ?? [];

    return (
        <NativeTextTree>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                    <FaImage className="text-sky-600" size={12} />
                    <span className="text-xs font-bold text-zinc-700">{LocalizeText('housekeeping.profile_images.title')}</span>
                    {list && <HousekeepingPill>{rows.length}</HousekeepingPill>}
                    <HousekeepingButton classNames={['ml-auto']} disabled={isLoading || page === 0} gap={1} size="sm" variant="secondary" onClick={() => setPage((value) => Math.max(0, value - 1))}>
                        <FaChevronLeft size={9} />
                    </HousekeepingButton>
                    <span className="text-[11px] text-zinc-500">{page + 1}</span>
                    <HousekeepingButton disabled={isLoading || rows.length < PAGE_SIZE} gap={1} size="sm" variant="secondary" onClick={() => setPage((value) => value + 1)}>
                        <FaChevronRight size={9} />
                    </HousekeepingButton>
                    <HousekeepingButton disabled={isLoading} gap={1} size="sm" variant="secondary" onClick={() => setReload((value) => value + 1)}>
                        <FaSync className={isLoading ? 'animate-spin' : ''} size={9} />
                        <span>{LocalizeText('housekeeping.history.refresh')}</span>
                    </HousekeepingButton>
                </div>

                <p className="m-0 text-[11px] text-zinc-500">{LocalizeText('housekeeping.profile_images.hint')}</p>
                {notice && <HousekeepingEmptyState>{LocalizeText(notice)}</HousekeepingEmptyState>}
                {error && <HousekeepingEmptyState>{LocalizeText(error)}</HousekeepingEmptyState>}
                {!error && !list && isLoading && <HousekeepingEmptyState>{LocalizeText('generic.loading')}</HousekeepingEmptyState>}
                {!error && list && rows.length === 0 && <HousekeepingEmptyState>{LocalizeText('housekeeping.profile_images.empty')}</HousekeepingEmptyState>}

                <div className="grid grid-cols-2 gap-2">
                    {!error &&
                        rows.map((row) => {
                            const pictureId = parseInt(cell(row, 'id')) || 0;
                            const userId = parseInt(cell(row, 'user_id')) || 0;
                            const username = cell(row, 'username') || `#${userId}`;
                            const kind = cell(row, 'kind');

                            return (
                                <div key={pictureId} className="flex flex-col gap-1 rounded border border-zinc-200 bg-white p-2 text-[11px]">
                                    <div
                                        className={`w-full rounded border border-zinc-300 bg-zinc-100 bg-cover bg-center ${kind === 'banner' ? 'aspect-[640/110]' : 'aspect-[640/690]'}`}
                                        style={{ backgroundImage: `url(${profileImageUrl(cell(row, 'file'))})` }}
                                        role="img"
                                        aria-label={`${username} ${kind}`}
                                    />
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-bold text-zinc-800">{username}</span>
                                        <HousekeepingPill>{LocalizeText(`housekeeping.profile_images.kind.${kind === 'banner' ? 'banner' : 'background'}`)}</HousekeepingPill>
                                        <span className="text-zinc-500">{formatHousekeepingListCell('time', cell(row, 'created_at'))}</span>
                                        {userId > 0 && (
                                            <Hint content={LocalizeText('housekeeping.audit.detail.open_user')}>
                                                <BaseButton
                                                    aria-label={LocalizeText('housekeeping.audit.detail.open_user')}
                                                    className="ml-auto p-0.5 text-zinc-400 hover:text-sky-600"
                                                    type="button"
                                                    onClick={() => openUser(userId)}
                                                >
                                                    <FaExternalLinkAlt size={9} />
                                                </BaseButton>
                                            </Hint>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <HousekeepingButton disabled={isPending} gap={1} size="sm" variant="secondary" onClick={() => remove(pictureId, username, false)}>
                                            <FaTrash size={9} />
                                            <span>{LocalizeText('housekeeping.profile_images.remove')}</span>
                                        </HousekeepingButton>
                                        <HousekeepingButton disabled={isPending} gap={1} size="sm" variant="danger" onClick={() => remove(pictureId, username, true)}>
                                            <FaBan size={9} />
                                            <span>{LocalizeText('housekeeping.profile_images.block')}</span>
                                        </HousekeepingButton>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </NativeTextTree>
    );
};
