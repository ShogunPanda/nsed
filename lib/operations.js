"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommands = exports.requireModule = exports.parseCommand = void 0;
const path_1 = require("path");
const models_1 = require("./models");
const output_1 = require("./output");
function parseCommand(type, command) {
    // Parse the command
    if (type === 'function') {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const commandFunction = require(path_1.resolve(process.cwd(), command));
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
function requireModule(modulePath) {
    // Camelcase the module
    const moduleName = path_1.basename(modulePath)
        .toLowerCase()
        // eslint-disable-next-line no-useless-escape
        .replace(/(?:[\/-_\.])([a-z0-9])/, (_, t) => t.toUpperCase());
    try {
        Object.assign(global, { [moduleName]: require(modulePath) });
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
