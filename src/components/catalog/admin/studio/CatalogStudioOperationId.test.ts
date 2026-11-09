import { describe, expect, it } from 'vitest';
import { nextCatalogStudioOperationId } from './CatalogStudioOperationId';

describe('nextCatalogStudioOperationId', () =>
{
    it('creates unique bounded identifiers with a readable action prefix', () =>
    {
        const first = nextCatalogStudioOperationId('savePage');
        const second = nextCatalogStudioOperationId('savePage');
        const long = nextCatalogStudioOperationId('x'.repeat(200));

        expect(first).not.toBe(second);
        expect(first.startsWith('savePage-')).toBe(true);
        expect(first.length).toBeLessThanOrEqual(96);
        expect(long.length).toBeLessThanOrEqual(96);
    });
});
