"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommands = exports.requireModule = exports.parseCommand = void 0;
const path_1 = require("path");
const models_1 = require("./models");
const output_1 = require("./output");
async function parseCommand(type, command) {
    // Parse the command
    if (type === 'function') {
        try {
            let commandFunction = await Promise.resolve().then(() => __importStar(require(path_1.resolve(process.cwd(), command))));
            /* instabul ignore if */
            if (commandFunction.default) {
                // CJS/MJS inteoperability
                commandFunction = commandFunction.default;
            }
            if (typeof commandFunction !== 'function') {
                throw new models_1.NSedError(`File "${command}" must export a function.`);
            }
            return { type: 'function', command: commandFunction };
        }
        catch (error) {
            if (error.code === 'ENSED') {
                throw error;
            }
            throw new models_1.NSedError(`Cannot require file "${command}".`);
        }
    }
    else if (command.startsWith('.') || command.startsWith('[')) {
        command = `$data${command}`;
    }
    else if (command.startsWith('/')) {
        command = `$data.toString().match(${command})`;
    }
    else if (command.match(/^\$\d+$/)) {
        command = `RegExp.${command}`;
    }
    return { type, command };
}
exports.parseCommand = parseCommand;
async function requireModule(modulePath) {
    // Camelcase the module
    const moduleName = path_1.basename(modulePath)
        .toLowerCase()
        // eslint-disable-next-line no-useless-escape
        .replace(/(?:[\/-_\.])([a-z0-9])/, (_, t) => t.toUpperCase());
    try {
        Object.assign(global, { [moduleName]: await Promise.resolve().then(() => __importStar(require(modulePath))) });
    }
    catch (e) {
        throw new models_1.NSedError(`Cannot find module "${modulePath}".`);
    }
}
exports.requireModule = requireModule;
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
async function executeCommands($data, $index, commands) {
    // Apply all commands
    for (const cmd of commands) {
        const { type, command } = cmd;
        try {
            // eslint-disable-next-line no-eval
            const res = await (type === 'function' ? command($data, $index) : eval(command));
            // Update $data
            switch (type) {
                case 'filter':
                    // A filter returned a falsy value, filter out
                    if (!res) {
                        return;
                    }
                    break;
                case 'reverseFilter':
                    // A reverse filter returned a truthy value, filter out
                    if (res) {
                        return;
                    }
                    break;
                default:
                    $data = res;
            }
        }
        catch (error) {
            throw new models_1.NSedError(`Invalid command "${command}": [${error.name}] ${error.message}.`);
        }
    }
    return output_1.showOutput($data);
}
exports.executeCommands = executeCommands;
