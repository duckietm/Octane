let operationSequence = 0;

export const nextCatalogStudioOperationId = (action: string): string =>
{
    const prefix = action.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48) || 'operation';
    operationSequence = (operationSequence + 1) % Number.MAX_SAFE_INTEGER;
    return `${prefix}-${Date.now().toString(36)}-${operationSequence.toString(36)}`.slice(0, 96);
};
