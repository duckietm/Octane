import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUserProfile: vi.fn() }));

vi.mock('@octane/renderer', () => ({ RelationshipStatusEnum: { RELATIONSHIP_NAMES: ['NONE', 'HEART', 'SMILE', 'BOBBA'] } }));

vi.mock('../../../../../api', () => ({
    GetUserProfile: mocks.getUserProfile,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, _fallback: string, _names: string[], values: string[]) => `${key}:${values.join(',')}`
}));

import { InfoStandWidgetUserRelationshipsRelationshipItemView } from './InfoStandWidgetUserRelationshipItemView';

afterEach(cleanup);

describe('InfoStandWidgetUserRelationshipsRelationshipItemView', () => {
    it('shows the friend as a link and the others as plain text (AIR)', () => {
        render(
            <InfoStandWidgetUserRelationshipsRelationshipItemView type={1} relationship={{ randomFriendId: 7, randomFriendName: 'alice', friendCount: 3 } as any} />
        );

        const link = screen.getByRole('button', { name: 'alice' });

        expect(link).toHaveClass('octane-infostand__relationship-name');
        expect(document.querySelector('.octane-infostand__relationship-others')).toHaveTextContent('infostand.relstatus.heart.others:2');

        fireEvent.click(link);
        expect(mocks.getUserProfile).toHaveBeenCalledWith(7);
    });

    it('has no others label for a single friend', () => {
        render(
            <InfoStandWidgetUserRelationshipsRelationshipItemView type={2} relationship={{ randomFriendId: 8, randomFriendName: 'bob', friendCount: 1 } as any} />
        );

        expect(document.querySelector('.octane-infostand__relationship-others')).toBeNull();
        expect(document.querySelector('.icon-smile')).not.toBeNull();
    });
});
