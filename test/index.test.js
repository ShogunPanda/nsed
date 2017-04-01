/*
 * This file is part of the nsed npm package. Copyright (C) 2017 and above Shogun <shogun@cowtech.it>.
 * Licensed under the MIT license, which can be found at http://www.opensource.org/licenses/mit-license.php.
 */

jest.mock("get-stdin", () => (() => jest.__stdin));

const NSed = require("../index");
const fs = require("fs");
const path = require("path");

describe("NSed", () => {
  beforeEach(function(){
    jest.__processSpy = jest.spyOn(process, "exit").mockImplementation();
  });

  afterEach(function(){
    jest.__processSpy.mockRestore();
  });

  describe(".fail", () => {
    test("should throw the right error", () => {
      try{
        NSed.fail("REASON");
      }catch(error){
        expect(error.message).toEqual("REASON");
        expect(error.code).toEqual("ENSED");
      }
    });
  });

  describe(".handleError", () => {
    test("should correctly handle errors", () => {
      const createError = (code, message = "MESSAGE") => {
        const error = new Error(message);
        error.code = code;
        return error;
      };

      this.consoleSpy = jest.spyOn(console, "error").mockImplementation();

      NSed.handleError(createError("ENSED", "REASON"), "FILE");
      expect(this.consoleSpy).toHaveBeenCalledWith("REASON");
      expect(jest.__processSpy).toHaveBeenCalledWith(1);

      this.consoleSpy.mockReset();
      NSed.handleError(createError("ENOENT", "REASON"), "FILE");
      expect(this.consoleSpy).toHaveBeenCalledWith("Cannot open file FILE: file not found.");

      this.consoleSpy.mockReset();
      NSed.handleError(createError("EACCES", "REASON"), "FILE");
      expect(this.consoleSpy).toHaveBeenCalledWith("Cannot open file FILE: permission denied.");

      expect(() => NSed.handleError("ERROR")).toThrow("ERROR");

      this.consoleSpy.mockRestore();
    });
  });

  describe(".parseCommand", () => {
    test("should return the right command", () => {
      expect(NSed.parseCommand(".foo")).toEqual("$data.foo");
      expect(NSed.parseCommand("[2]")).toEqual("$data[2]");
      expect(NSed.parseCommand("[whatever]")).toEqual("$data[whatever]");
      expect(NSed.parseCommand("/^\\d/")).toEqual("$data.toString().match(/^\\d/)");
      expect(NSed.parseCommand("$1")).toEqual("RegExp.$1");
      expect(NSed.parseCommand("foo")).toEqual("foo");
    });
  });

  describe(".addCommand", () => {
    test("should add the parsed command", () => {
      const commands = [];
      NSed.addCommand("$1", commands);
      expect(commands).toEqual([{type: "command", command: "RegExp.$1"}]);
    });
  });

  describe(".addFunction", () => {
    test("should add the parsed function", () => {
      const commands = [];
      NSed.addFunction("test/source.fixture.js", commands);
      expect(commands[0].type).toEqual("function");
      expect(typeof commands[0].command).toEqual("function");
    });

    test("should complain if the file is missing", () => {
      const commands = [];

      try{
        NSed.addFunction(__filename, commands);
      }catch(error){
        expect(error.message).toEqual(`File "${__filename}" must export a function.`);
      }
    });

    test("should complain if the file doesn't export a function", () => {
      const commands = [];

      try{
        NSed.addFunction("/foo", commands);
      }catch(error){
        expect(error.message).toEqual('Cannot require file "/foo".');
      }
    });
  });

  describe(".addFilter", () => {
    test("should add the parsed command", () => {
      const commands = [];
      NSed.addFilter("$1", commands);
      expect(commands).toEqual([{type: "filter", command: "RegExp.$1"}]);
    });
  });

  describe(".addReverseFilter", () => {
    test("should add the parsed command", () => {
      const commands = [];
      NSed.addReverseFilter("$1", commands);
      expect(commands).toEqual([{type: "reverseFilter", command: "RegExp.$1"}]);
    });
  });

  describe(".requireModule", () => {
    test("should require a module and make it available in the global scope", () => {
      expect(global.stringDecoder).toBeUndefined();
      NSed.requireModule("string_decoder");
      expect(global.stringDecoder).not.toBeUndefined();
    });

    test("should throw a error when the module is not found", () => {
      const failSpy = jest.spyOn(NSed, "fail").mockImplementation();
      NSed.requireModule("foo");
      expect(failSpy).toHaveBeenCalledWith('Cannot find module "foo".');
      failSpy.mockRestore();
    });
  });

  describe(".showOutput", () => {
    test("should return the right output", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      NSed.showOutput(undefined); // eslint-disable-line no-undefined
      NSed.showOutput(null);
      NSed.showOutput([1, 2]);

      expect(logSpy.mock.calls).toEqual([["<undefined>"], ["<null>"], ["1,2"]]);
      logSpy.mockRestore();
    });
  });

  describe(".executeCommand", () => {
    test("should complain when there are not commands", async () => {
      const failSpy = jest.spyOn(NSed, "fail").mockImplementation();

      await NSed.executeCommand([]);

      expect(failSpy).toHaveBeenCalledWith("Please specify one or more commands.");
      failSpy.mockRestore();
    });

    test("should correctly execute commands", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      await NSed.executeCommand([{command: "$data[1]"}, {command: "$data + $index"}], ["a", "b"]);

      expect(logSpy).toHaveBeenCalledWith("b0");
      logSpy.mockRestore();
    });

    test("should correctly execute functions", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      await NSed.executeCommand([{type: "function", command: $data => $data[1]}, {command: "$data + $index"}], ["a", "b"]);

      expect(logSpy).toHaveBeenCalledWith("b0");
      logSpy.mockRestore();
    });

    test("should correctly handle filters", async () => {
      const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation(() => "OK");
      expect(await NSed.executeCommand([{type: "filter", command: "$data < 2"}], 1)).toEqual("OK");
      expect(await NSed.executeCommand([{type: "filter", command: "$data > 2"}], 1)).toBeNull();
      showOutputSpy.mockRestore();
    });

    test("should correctly handle reverse filters", async () => {
      const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation(() => "OK");
      expect(await NSed.executeCommand([{type: "reverseFilter", command: "$data > 2"}], 1)).toEqual("OK");
      expect(await NSed.executeCommand([{type: "reverseFilter", command: "$data < 2"}], 1)).toBeNull();
      showOutputSpy.mockRestore();
    });

    test("should handle errors", async () => {
      const failSpy = jest.spyOn(NSed, "fail").mockImplementation();

      await NSed.executeCommand([{command: "$data()"}], 1);

      expect(failSpy).toHaveBeenCalledWith('Invalid command "$data()": [TypeError] $data is not a function.');
      failSpy.mockRestore();
    });
  });

  describe(".processFile", () => {
    beforeEach(function(){
      NSed.requireModule("crypto");
    });

    describe("whole mode", () => {
      test("should open the file and execute command", async () => {
        const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation();

        await NSed.processFile(path.resolve(__dirname, "../.travis.yml"), [{command: 'crypto.createHash("md5").update($data).digest("hex")'}], true);
        expect(showOutputSpy).toHaveBeenCalledWith("26ca330f8c039f3377210993fa6183a7");
        showOutputSpy.mockRestore();
      });

      test("should handle open errors", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        await NSed.processFile(path.resolve(__dirname, "/not-existing"), [{command: "$data"}], true);
        expect(consoleSpy).toHaveBeenCalledWith("Cannot open file /not-existing: file not found.");

        consoleSpy.mockRestore();
      });
    });

    describe("line by line", () => {
      test("should open the file and execute commands, streaming them line by line", async () => {
        const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation();

        await NSed.processFile(path.resolve(__dirname, "../.travis.yml"), [{command: 'crypto.createHash("md5").update($data).digest("hex")'}], false);

        expect(showOutputSpy.mock.calls).toEqual([
          ["01abfc750a0c942167651c40d088531d"], ["03803ca124cd46c485e39897ddd312d0"], ["82917d62d59c8a35d9ffd2900a38843f"],
          ["01abfc750a0c942167651c40d088531d"], ["d63532581c6ab0556ce38622538879ed"], ["c0f2435cbc30de330cd0b1968c4cb09e"],
          ["ae6780a734516ca8a9eeb62e6edbebd5"], ["2303f955cd458c204f725e1da5dad311"], ["fc2f57f6eb83f81676709e391811a199"],
          ["12952e3644d02b0f2dad8a727ce1cc39"]
        ]);

        showOutputSpy.mockRestore();
      });

      test("should handle open errors", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        await NSed.processFile(path.resolve(__dirname, "/not-existing"), [{command: "$data"}]);
        expect(consoleSpy).toHaveBeenCalledWith("Cannot open file /not-existing: file not found.");

        consoleSpy.mockRestore();
      });
    });
  });

  describe(".processStandardInput", () => {
    describe("whole mode", () => {
      test("should read entire standard input and execute command", async () => {
        const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation();
        jest.__stdin = "STDIN";

        await NSed.processStandardInput([{command: 'crypto.createHash("md5").update($data).digest("hex")'}], true);
        expect(showOutputSpy).toHaveBeenCalledWith("ed116d4d48e82dacc95f9098fa34f38e");
        showOutputSpy.mockRestore();
      });

      test("should read entire standard input and not do anything when empty", async () => {
        const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation();
        jest.__stdin = "";

        await NSed.processStandardInput([{command: 'crypto.createHash("md5").update($data).digest("hex")'}], true);
        expect(showOutputSpy).not.toHaveBeenCalled();
        showOutputSpy.mockRestore();
      });
    });

    describe("line by line", () => {
      test("should read standard input execute commands line by line", async () => {
        const originalStdin = process.stdin;
        process.stdin = fs.createReadStream(path.resolve(__dirname, "../.travis.yml"), {encoding: "binary"});
        const showOutputSpy = jest.spyOn(NSed, "showOutput").mockImplementation();

        await NSed.processStandardInput([{command: 'crypto.createHash("md5").update($data).digest("hex")'}], false);

        expect(showOutputSpy.mock.calls).toEqual([
          ["01abfc750a0c942167651c40d088531d"], ["03803ca124cd46c485e39897ddd312d0"], ["82917d62d59c8a35d9ffd2900a38843f"],
          ["01abfc750a0c942167651c40d088531d"], ["d63532581c6ab0556ce38622538879ed"], ["c0f2435cbc30de330cd0b1968c4cb09e"],
          ["ae6780a734516ca8a9eeb62e6edbebd5"], ["2303f955cd458c204f725e1da5dad311"], ["fc2f57f6eb83f81676709e391811a199"],
          ["12952e3644d02b0f2dad8a727ce1cc39"]
        ]);

        showOutputSpy.mockRestore();
        process.stdin = originalStdin;
      });
    });
  });

  describe(".execute", () => {
    test("should correctly process a file", async () => {
      const processFileSpy = jest.spyOn(NSed, "processFile").mockImplementation();

      await NSed.execute("a b -i FOO -c [1] -w".split(" "));
      expect(processFileSpy).toHaveBeenCalledWith("FOO", [{type: "command", command: "$data[1]"}], true, "utf8");
      processFileSpy.mockRestore();
    });

    test("should correctly process standard input", async () => {
      const processStandardInputSpy = jest.spyOn(NSed, "processStandardInput").mockImplementation();

      await NSed.execute("a b -c [1] -e utf16".split(/\s/g));
      expect(processStandardInputSpy).toHaveBeenCalledWith([{type: "command", command: "$data[1]"}], false, "utf16");

      processStandardInputSpy.mockRestore();
    });

    test("should correctly handle errors", async () => {
      const error = new Error("FOO");
      const handleErrorSpy = jest.spyOn(NSed, "handleError").mockImplementation();
      const processStandardInputSpy = jest.spyOn(NSed, "processStandardInput").mockImplementation(() => Promise.reject(error));

      await NSed.execute("a b -c [1] -e utf16".split(/\s/g));
      expect(processStandardInputSpy).toHaveBeenCalledWith([{type: "command", command: "$data[1]"}], false, "utf16");
      expect(handleErrorSpy).toHaveBeenCalledWith(error);

      processStandardInputSpy.mockRestore();
      handleErrorSpy.mockRestore();
    });
  });
});
