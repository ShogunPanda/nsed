"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showOutput = exports.handleError = void 0;
const models_1 = require("./models");
function handleError(error, inputPath, fatal = false) {
    let finalMessage = null;
    switch (error.code) {
        case 'ENSED':
            finalMessage = error.message;
            break;
        case 'ENOENT':
            finalMessage = `Cannot open file ${inputPath}: file not found.`;
            break;
        case 'EACCES':
            finalMessage = `Cannot open file ${inputPath}: permission denied.`;
            break;
    }
    if (finalMessage) {
        error = new models_1.NSedError(finalMessage);
    }
    if (!fatal) {
        throw error;
    }
    console.error(error.message);
    process.exit(1);
}
exports.handleError = handleError;
function showOutput(output) {
    console.log(typeof output === 'undefined' || output === null ? `<${output}>` : output.toString());
}
exports.showOutput = showOutput;
