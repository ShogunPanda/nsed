"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NSedError = void 0;
class NSedError extends Error {
    constructor(message) {
        super(message);
        this.code = 'ENSED';
    }
}
exports.NSedError = NSedError;
