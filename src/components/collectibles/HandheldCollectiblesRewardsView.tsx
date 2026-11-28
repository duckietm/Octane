import { CollectibleRewardClaimData } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { collectorLevelColor, formatCollectibleDate, toHexColor } from '../../hooks/collectibles/collectibles.helpers';
import { CollectorScore, getCollectibleProductName } from '../../hooks/collectibles/useCollectibles';
import { CollectibleProductImageView } from './CollectibleProductImageView';
import { HandheldCollectiblesActions } from './HandheldCollectiblesParts';

export interface HandheldCollectiblesRewardsViewProps {
    score: CollectorScore;
    claims: CollectibleRewardClaimData[];
    onClaimAll: () => void;
}

/**
 * The Rewards tab on a phone: the collector card (level, XP, highest XP), the level rewards waiting as a list of cards
 * and "Claim rewards" in the bar at the foot. On its side the card stands left of the list.
 */
export const HandheldCollectiblesRewardsView: FC<HandheldCollectiblesRewardsViewProps> = ({ score, claims, onClaimAll }) => {
    const level = score?.level ?? 0;

    return (
        <NativeTextTree>
            <div className="octane-handheld-collectibles__page is-rewards" data-testid="collectibles-rewards">
                <div className="octane-handheld-collectibles__scroll">
                    <div className="octane-handheld-collectibles__collector" style={{ '--hh-level': toHexColor(collectorLevelColor(level)) } as CSSProperties}>
                        <span className="octane-handheld-collectibles__collector-level">
                            <span className="octane-handheld-collectibles__collector-number">{level}</span>
                            <span className="octane-handheld-collectibles__collector-caption">
                                {localizeWithFallback('collectibles.level', 'Level').toUpperCase()}
                            </span>
                        </span>
                        <dl className="octane-handheld-collectibles__collector-scores">
                            <div>
                                <dt>{localizeWithFallback('collectibles.score', 'Collector XP:')}</dt>
                                <dd data-testid="collectibles-score">{score?.score ?? 0}</dd>
                            </div>
                            <div>
                                <dt>{localizeWithFallback('collectibles.high_score', 'All time highest XP:')}</dt>
                                <dd>{score?.highestScore ?? 0}</dd>
                            </div>
                        </dl>
                    </div>
                    <div className="octane-handheld-collectibles__list">
                        <div className="octane-handheld-collectibles__heading">{localizeWithFallback('collectibles.claim.title', 'Rewards')}</div>
                        {claims.length > 0 ? (
                            claims.map((claim) => {
                                const setName = localizeWithFallback(`collectibles.set.${claim.setId}`, claim.setName);

                                return (
                                    <div key={claim.claimId} className="octane-handheld-collectibles__claim" data-testid="collectibles-reward-item">
                                        <span className="octane-handheld-collectibles__thumb">
                                            <CollectibleProductImageView icon product={claim.product} />
                                        </span>
                                        <span className="octane-handheld-collectibles__claim-text">
                                            <span className="octane-handheld-collectibles__claim-name">{getCollectibleProductName(claim.product)}</span>
                                            {!!setName && (
                                                <span>
                                                    <b>{localizeWithFallback('collectibles.claim.collection', 'Collection:')}</b> {setName}
                                                </span>
                                            )}
                                            {claim.validTo > 0 && (
                                                <span>
                                                    <b>{localizeWithFallback('collectibles.claim.expiration', 'Expires:')}</b>{' '}
                                                    {formatCollectibleDate(claim.validTo)}
                                                </span>
                                            )}
                                        </span>
                                        <span className="octane-handheld-collectibles__amount">{`x${claim.claimLimit - claim.claimedAmount}`}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="octane-handheld-collectibles__empty">
                                {localizeWithFallback(
                                    'collectibles.no_claims',
                                    'There is nothing to claim. Come back later! We give monthly rewards based on your collector level.'
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <HandheldCollectiblesActions>
                    <BaseButton
                        className="octane-handheld-collectibles__button is-primary"
                        data-testid="collectibles-claim-all"
                        disabled={!claims.length}
                        onClick={onClaimAll}
                    >
                        {localizeWithFallback('collectibles.claim_all', 'Claim rewards')}
                    </BaseButton>
                </HandheldCollectiblesActions>
            </div>
        </NativeTextTree>
    );
};
