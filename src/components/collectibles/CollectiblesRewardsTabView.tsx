import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { formatCollectibleDate } from '../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName, useCollectibles } from '../../hooks/collectibles/useCollectibles';
import { CollectibleProductImageView } from './CollectibleProductImageView';
import { CollectiblesLoadingView } from './CollectiblesLoadingView';

/** `RewardClaimsTab`: the level rewards waiting to be claimed and the claim all button. */
export const CollectiblesRewardsTabView: FC = () => {
    const { rewardClaims = null, claimAllPending = false, claimAllRewards = null } = useCollectibles();

    if (rewardClaims === null || claimAllPending) return <CollectiblesLoadingView />;

    return (
        <NativeTextTree>
            <div className="octane-collectibles-rewards" data-testid="collectibles-rewards">
                {rewardClaims.length > 0 ? (
                    <div className="octane-collectibles-reward-list">
                        {rewardClaims.map((claim) => {
                            const setName = localizeWithFallback(`collectibles.set.${claim.setId}`, claim.setName);

                            return (
                                <div key={claim.claimId} className="octane-collectibles-reward-item" data-testid="collectibles-reward-item">
                                    <div className="octane-collectibles-reward-icon">
                                        <CollectibleProductImageView icon product={claim.product} />
                                        <span className="octane-collectibles-reward-amount">{`x${claim.claimLimit - claim.claimedAmount}`}</span>
                                    </div>
                                    <div className="octane-collectibles-reward-texts">
                                        <span className="octane-collectibles-reward-name">{getCollectibleProductName(claim.product)}</span>
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="octane-collectibles-empty">
                        {localizeWithFallback(
                            'collectibles.no_claims',
                            'There is nothing to claim. Come back later! We give monthly rewards based on your collector level.'
                        )}
                    </div>
                )}
                <div className="octane-collectibles-reward-footer">
                    <BaseButton className="octane-collectibles-button is-blue" disabled={!rewardClaims.length} onClick={() => claimAllRewards?.()}>
                        {localizeWithFallback('collectibles.claim_all', 'Claim rewards')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
