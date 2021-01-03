import { Command } from './models';
export declare function processData(input: string, encoding: string, whole: boolean, commands: Array<Command>): Promise<void>;
export declare function execute(args: Array<string>): Promise<void>;
