import { FC } from 'react';
import { localizeWithFallback, SanitizeHtml } from '../../api';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** The Info tab on a phone: what the guild is, as one card. */
export const HandheldCollectiblesInfoView: FC = () => (
    <NativeTextTree>
        <div className="octane-handheld-collectibles__page is-info" data-testid="collectibles-info">
            <div className="octane-handheld-collectibles__scroll">
                <div className="octane-handheld-collectibles__card is-info">
                    <span aria-hidden="true" className="octane-handheld-collectibles__cabinet" />
                    <div className="octane-handheld-collectibles__title">{localizeWithFallback('collectibles.info.title', 'Info')}</div>
                    <div
                        className="octane-handheld-collectibles__text"
                        dangerouslySetInnerHTML={{
                            __html: SanitizeHtml(
                                localizeWithFallback(
                                    'collectibles.info.description',
                                    'The Collectors Guild is a hub where collectors can view and manage their Collector XP, collectibles and Relics.'
                                )
                            )
                        }}
                    />
                </div>
            </div>
        </div>
    </NativeTextTree>
);
