# nsed

[![Version](https://img.shields.io/npm/v/nsed.svg)](https://npm.im/nsed)
[![Dependencies](https://img.shields.io/librariesio/release/npm/nsed)](https://libraries.io/npm/nsed)
[![Build](https://github.com/ShogunPanda/nsed/workflows/CI/badge.svg)](https://github.com/ShogunPanda/nsed/actions?query=workflow%3ACI)
[![Coverage](https://img.shields.io/codecov/c/gh/ShogunPanda/nsed?token=akKPKNK7de)](https://codecov.io/gh/ShogunPanda/nsed)

https://sw.cowtech.it/nsed

Javascript Terminal String Editor: NSed brings Node.js power to the command line.

It works similarly to the standard GNU sed command, with the exception that everything is Javascript and powered by [Node.js](https://nodejs.org).

For instance, the following command computes the hash of each file in the test folder:

```bash
find test -type f | nsed -r fs -r crypto -c 'fs.readFileSync($data, "utf8")' -c 'crypto.createHash("md5").update($data).digest("hex")'
```

## Installation

To install, simply use npm or yarn:

```
npm install -g nsed
```

## Overview

### Basic usage

Each command is executed on the output of the previous one. You can reference `$data` for the current input and `$index` for the current position in the input.

If operating directly on properties or methods of the input, you can omit `$data`.

```bash
find test -type f | nsed -r fs -c 'fs.readFileSync($data, "utf8")' -c '.length'
```

To see all the available options, use `-h|--help` option.

### Filters

Input lines can be filtered out by using filter (`-f|--filter`) or reverse filters (`-F|--reverse-filter`) that, respectively, will include the input if the
result of the evaluation is a truthy or falsy value (according to Javascript rules).

For instance, the following command will print only files starting with `index`:

```bash
find test -type f | nsed -f '/^index/'
```

### Regular expressions

Regular expression can be used in commands and referenced later, using `$NUMBER` syntax.

For instance, the following command will print the second letter of each file:

```bash
find test -type f | nsed -c '.replace("test/", "")' -c '/.(.).+/' -c '$1'
```

### Advanced usage

Before processing commands, you can instruct nsed to require any available Node.js modules, by using `-r|--require` switch. The module will be available with
its name camelcased. For instance, `-r string_decoder` will make `stringDecoder` available for your commands.

Finally, instead of providing commands via command line, you can input Javascript file using `-s|--source` switch. The source file must export a function which
accepts a string (`$data` representing the current line) and a number (`$index`, representing the current line in the input).

## ESM Only

This package only supports to be directly imported in a ESM context.

For informations on how to use it in a CommonJS context, please check [this page](https://gist.github.com/ShogunPanda/fe98fd23d77cdfb918010dbc42f4504d).

## Contributing to nsed

- Check out the latest master to make sure the feature hasn't been implemented or the bug hasn't been fixed yet.
- Check out the issue tracker to make sure someone already hasn't requested it and/or contributed it.
- Fork the project.
- Start a feature/bugfix branch.
- Commit and push until you are happy with your contribution.
- Make sure to add tests for it. This is important so I don't break it in a future version unintentionally.

## Copyright

Copyright (C) 2017 and above Shogun <shogun@cowtech.it>.

Licensed under the MIT license, which can be found at https://choosealicense.com/licenses/isc.
