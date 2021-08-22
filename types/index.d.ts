/// <reference types="node" />
import { Command, PackageInfo } from './models';
export declare function processData(input: string, encoding: BufferEncoding, whole: boolean, commands: Array<Command>): Promise<void>;
export declare function execute(args: Array<string>, { version, description }: PackageInfo): Promise<void>;
