import { FC } from 'react';

interface NavigatorSearchSkeletonViewProps {
    rows?: number;
}

export const NavigatorSearchSkeletonView: FC<NavigatorSearchSkeletonViewProps> = (props) => {
    const { rows = 5 } = props;

    return (
        <div className="flex flex-col gap-2" aria-hidden="true">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="octane-card-panel flex items-center gap-2 px-2 py-2">
                    <div className="h-10 w-10 shrink-0 rounded bg-black/10 animate-pulse" />
                    <div className="flex flex-1 flex-col gap-1">
                        <div className="h-3 w-1/2 rounded bg-black/10 animate-pulse" />
                        <div className="h-2.5 w-1/3 rounded bg-black/10 animate-pulse" />
                    </div>
                    <div className="h-4 w-8 shrink-0 rounded bg-black/10 animate-pulse" />
                </div>
            ))}
        </div>
    );
};
