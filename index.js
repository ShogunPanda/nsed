/*
 * This file is part of the nsed npm package. Copyright (C) 2017 and above Shogun <shogun@cowtech.it>.
 * Licensed under the MIT license, which can be found at http://www.opensource.org/licenses/mit-license.php.
 */

const packageInfo = require("./package");
const {Command} = require("commander");
const fs = require("fs");
const path = require("path");
const getStdin = require("get-stdin");
const byline = require("byline");
const s = require("voca");
const d = require("date-fns");
d.strftime = require("date-fns-strftime");

const NSed = {
  fail(reason){
    const error = new Error(reason);
    error.code = "ENSED";
    throw error;
  },

  handleError(error, inputPath){
    let handled = null;

    switch(error.code){
      case "ENSED":
        handled = error.message;
        break;
      case "ENOENT":
        handled = `Cannot open file ${inputPath}: file not found.`;
        break;
      case "EACCES":
        handled = `Cannot open file ${inputPath}: permission denied.`;
        break;
    }

    if(!handled)
      throw error;

    console.error(handled);
    return process.exit(1); // eslint-disable-line no-process-exit
  },

  parseCommand(command){
    if(command.startsWith(".") || command.startsWith("["))
      command = `$data${command}`;
    else if(command.startsWith("/"))
      command = `$data.toString().match(${command})`;
    else if(command.match(/^\$\d+$/))
      command = `RegExp.${command}`;

    return command;
  },

  addCommand(value, accu){
    accu.push({type: "command", command: NSed.parseCommand(value)});
  },

  addFunction(value, accu){
    try{
      const command = require(path.resolve(process.cwd(), value));

      if(typeof command !== "function")
        NSed.fail(`File "${value}" must export a function.`);

      accu.push({type: "function", command});
    }catch(error){
      if(error.code === "ENSED")
        throw error;

      NSed.fail(`Cannot require file "${value}".`);
    }
  },

  addFilter(value, accu){
    accu.push({type: "filter", command: NSed.parseCommand(value)});
  },

  addReverseFilter(value, accu){
    accu.push({type: "reverseFilter", command: NSed.parseCommand(value)});
  },

  requireModule(modulePath){
    const moduleName = s.decapitalize(s.titleCase(path.basename(modulePath))).replace(/[-_]/g, "");

    try{
      global[moduleName] = require(modulePath);
    }catch(e){
      NSed.fail(`Cannot find module "${modulePath}".`);
    }
  },

  showOutput(output){
    console.log(typeof output === "undefined" || output === null ? `<${output}>` : output.toString());
  },

  async executeCommand(commands, $data, $index = 0){ // eslint-disable-line no-unused-vars
    if(!commands.length)
      return NSed.fail("Please specify one or more commands.");

    // Apply all commands
    for(const cmd of commands){
      const {type, command} = cmd;

      try{
        const result = await (type === "function" ? command($data, $index) : eval(command)); // eslint-disable-line no-eval

        switch(type){
          case "filter":
            if(!result) // A filter returned a falsy value, filter out
              return null;
            break;
          case "reverseFilter":
            if(result) // A reverse filter returned a truthy value, filter out
              return null;
            break;
          default:
            $data = result;
        }
      }catch(error){
        return NSed.fail(`Invalid command "${command}": [${error.name}] ${error.message}.`);
      }
    }

    return NSed.showOutput($data);
  },

  processByLine(inputStream, commands, encoding){
    const lines = [];
    const stream = byline(inputStream);
    let finished = false;
    let index = 0;

    return new Promise(resolve => {
      // Read from input
      stream
        .on("data", data => {
          lines.push(Buffer.from(data).toString(encoding));
        })
        .on("finish", () => {
          finished = true;
        });

      const consumer = async function(){
        if(!lines.length && finished) // No more input, just finish
          return resolve();

        if(lines.length){ // There is data to read, process it
          const data = lines.shift();
          index++;
          await NSed.executeCommand(commands, data, index);
        }

        // Schedule the next read
        return setImmediate(consumer);
      };

      // Schedule the first read
      setImmediate(consumer);
    });
  },

  processFile(inputPath, commands, whole, encoding = "utf8"){
    if(whole){
      return new Promise(resolve => {
        fs.readFile(inputPath, encoding, async (error, data) => { // Open the file
          if(error)
            NSed.handleError(error, inputPath); // Show error
          else
            await NSed.executeCommand(commands, data); // Process the single line

          return resolve();
        });
      });
    }

    // Line by line, create a stream
    return new Promise(resolve => {
      const inputStream = fs.createReadStream(inputPath, encoding);

      inputStream.on("open", async () => {
        await NSed.processByLine(inputStream, commands, encoding);
        resolve();
      });

      inputStream.on("error", error => {
        NSed.handleError(error, inputPath);
        resolve();
      });
    });
  },

  async processStandardInput(commands, whole, encoding = "utf8"){
    if(whole){
      const data = await getStdin(); // Get the entire input

      if(data.length)
        await NSed.executeCommand(commands, data);

      return null;
    }

    return NSed.processByLine(process.stdin, commands, encoding);
  },

  async execute(args){
    try{
      const cli = new Command();
      const commands = [];

      // Parse input
      cli
        .version(packageInfo.version)
        .usage("[options]")
        .description(packageInfo.description)
        .option("-i, --input <FILE>", "File to read instead of using standard input.")
        .option("-w, --whole", "Consider the input a single string instead of processing it line by line.")
        .option("-r, --require <MODULE>", "Require a module before processing. The module will be available with its name camelcased.", NSed.requireModule)
        .option(
          "-c, --command <COMMAND>", "A JS expression to evaluate. $data and $index represent current data and line number.", NSed.addCommand, commands
        )
        .option("-s, --source <SOURCE>", "File that exports a Javascript function to process data.", NSed.addFunction, commands)
        .option(
          "-f, --filter <COMMAND>", "A JS expression or regexp to filter: Truthy values will cause current line to be discarded.", NSed.addFilter, commands
        )
        .option(
          "-F, --reverse-filter <COMMAND>", "A JS expression or regexp to filter: Falsy values will cause current line to be discarded.",
          NSed.addReverseFilter, commands
        )
        .option("-e, --encoding <ENCODING>", "The encoding to use.", "utf8")
        .parse(args);

      if(!cli.whole)
        cli.whole = false;

      await (cli.input ? NSed.processFile(cli.input, commands, cli.whole, cli.encoding) : NSed.processStandardInput(commands, cli.whole, cli.encoding));
    }catch(error){
      NSed.handleError(error);
    }
  }
};

module.exports = NSed;
