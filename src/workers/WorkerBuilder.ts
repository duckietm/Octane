export class WorkerBuilder extends Worker {
    private readonly _blobUrl: string;

    constructor(worker) {
        const code = worker.toString();
        const blob = new Blob([`(${code})()`]);
        const blobUrl = URL.createObjectURL(blob);

        super(blobUrl);

        this._blobUrl = blobUrl;
    }

    public terminate(): void {
        super.terminate();

        URL.revokeObjectURL(this._blobUrl);
    }
}
