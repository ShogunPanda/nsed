"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.processData = void 0;
const commander_1 = require("commander");
const fs_1 = require("fs");
const get_stream_1 = __importDefault(require("get-stream"));
const pump_1 = __importDefault(require("pump"));
const split2_1 = __importDefault(require("split2"));
const operations_1 = require("./operations");
const output_1 = require("./output");
async function addCommand(commands, type, command) {
    commands.push(await operations_1.parseCommand(type, command));
}
async function processData(input, encoding, whole, commands) {
    let stream = process.stdin;
    // Open the file if not processing stdin
    /* istanbul ignore else */
    if (input) {
        stream = fs_1.createReadStream(input, encoding);
    }
    // If whole, get the entire stream contents and process as single line
    if (whole) {
        let contents = '';
        try {
            contents = await get_stream_1.default(stream);
        }
        catch (e) {
            output_1.handleError(e, input);
        }
        return operations_1.executeCommands(contents, 0, commands);
    }
    // Process line by line using split2
    return new Promise((resolve, reject) => {
        let index = 0;
        // Split the stream
        const pipe = pump_1.default(stream, split2_1.default('\n'), (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
        // For each line
        pipe.on('data', (line) => {
            // Allow promises to finish before resuming
            pipe.pause();
            // Increase the line
            index++;
            // Process line and then resume the pipe
            operations_1.executeCommands(line, index, commands)
                .then(() => pipe.resume())
                .catch(output_1.handleError);
        });
        // Start processing
        pipe.resume();
    }).catch((e) => {
        output_1.handleError(e, input);
    });
}
exports.processData = processData;
function execute(args, { version, description }) {
    let promiseResolve;
    const promise = new Promise((resolve) => {
        promiseResolve = resolve;
    });
    const cli = new commander_1.Command();
    const commands = [];
    // Parse input
    cli
        .storeOptionsAsProperties(false)
        .version(version, '-v, --version', 'Shows the version.')
        .usage('[options]')
        .description(description)
        .option('-i, --input <FILE>', 'File to read instead of using standard input.')
        .option('-w, --whole', 'Consider the input a single string instead of processing it line by line.')
        .option('-r, --require <MODULE>', 'Require a module before processing. The module will be available with its name camelcased.', operations_1.requireModule)
        .option('-c, --command <COMMAND>', 'A JS expression to evaluate. $data and $index represent current data and line number.', addCommand.bind(null, commands, 'command'))
        .option('-s, --source <SOURCE>', 'File that exports a Javascript function to process data.', addCommand.bind(null, commands, 'function'))
        .option('-f, --filter <COMMAND>', 'A JS expression or regexp to filter: Truthy values will cause current line to be discarded.', addCommand.bind(null, commands, 'filter'))
        .option('-F, --reverse-filter <COMMAND>', 'A JS expression or regexp to filter: Falsy values will cause current line to be discarded.', addCommand.bind(null, commands, 'reverseFilter'))
        .option('-e, --encoding <ENCODING>', 'The encoding to use.', 'utf8')
        .parse(args);
    const { input, encoding, whole } = cli.opts();
    processData(input, encoding, whole, commands)
        .catch((e) => {
        output_1.handleError(e, input, true);
    })
        .finally(promiseResolve);
    return promise;
}
exports.execute = execute;
