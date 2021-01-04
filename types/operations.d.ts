import { Command, CommandType } from './models';
export declare function parseCommand(type: CommandType, command: string): Promise<Command>;
export declare function requireModule(modulePath: string): Promise<void>;
export declare function executeCommands($data: string, $index: number, commands: Array<Command>): Promise<void>;
