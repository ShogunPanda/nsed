# nsed

[![Package Version](https://img.shields.io/npm/v/nsed.svg)](https://npmjs.com/package/nsed)
[![Dependency Status](https://img.shields.io/gemnasium/ShogunPanda/nsed.svg)](https://gemnasium.com/ShogunPanda/nsed)
[![Build Status](https://img.shields.io/travis/ShogunPanda/nsed.svg)](http://travis-ci.org/ShogunPanda/nsed)
[![Coverage Status](https://img.shields.io/coveralls/github/ShogunPanda/nsed.svg)](https://coveralls.io/github/ShogunPanda/nsed)

https://sw.cowtech.it/nsed

https://github.com/ShogunPanda/nsed

Javascript Terminal String Editor: NSed brings Node.js power to the command line.

It works similarly to the standard GNU sed command, with the exception that everything is Javascript and powered by [Node.js](https://nodejs.org).

For instance, the following command computes the hash of each file in the test folder:

```bash
find test -type f | nsed -r crypto -c 'fs.readFileSync($data, "utf8")' -c 'crypto.createHash("md5").update($data).digest("hex")'
```

## Installation

To install and use Nsed, Node.js 7.6 or above is needed (due to the use of async/await).

To install, simply use npm or yarn:

```
npm install -g nsed
```

## Overview

### Basic usage

Each command is executed on the output of the previous one. You can reference `$data` for the current input and `$index` for the current position in the input.

If operating directly on properties or methods of the input, you can omit `$data`.

```bash
find test -type f | nsed -r crypto -c 'fs.readFileSync($data, "utf8")' -c '.length'
```

Since it requires a recent Node.js implementation (7.6+), you can use advanced features like async/await.

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

## Supported implementations

nsed needs, supports and has been tested on [NodeJS](http://nodejs.org) 7.6+.

## Contributing to nsed

* Check out the latest master to make sure the feature hasn't been implemented or the bug hasn't been fixed yet.
* Check out the issue tracker to make sure someone already hasn't requested it and/or contributed it.
* Fork the project.
* Start a feature/bugfix branch.
* Commit and push until you are happy with your contribution.
* Make sure to add tests for it. This is important so I don't break it in a future version unintentionally.

## Copyright

Copyright (C) 2017 and above Shogun <shogun@cowtech.it>.

Licensed under the MIT license, which can be found at https://choosealicense.com/licenses/mit.
