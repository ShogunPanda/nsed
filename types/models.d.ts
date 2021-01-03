export declare type PromiseResolver = (value?: any) => void;
export declare type PromiseRejecter = (error: Error) => void;
export interface Args {
    input: string;
    whole: boolean;
    encoding: string;
}
export declare type ImportedFunction = ($data: string, $index: number) => string;
export declare type CommandType = 'command' | 'function' | 'filter' | 'reverseFilter';
export interface Command {
    type: CommandType;
    command: string | ImportedFunction;
}
export declare class NSedError extends Error {
    code: string;
    constructor(message: string);
}
