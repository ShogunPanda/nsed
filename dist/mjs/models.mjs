export class NSedError extends Error {
    constructor(message) {
        super(message);
        this.code = 'ENSED';
    }
}
