import {FUN_integer_to_string, FUN_println, FUN_tick} from '../ch5/symbol';

export class Symbol {}

export class FunctionSymbol extends Symbol {}

export class VarSymbol extends Symbol {}

export const built_ins: Map<string, FunctionSymbol> = new Map([
	['println', FUN_println],
	['tick', FUN_tick],
	['integer_to_string', FUN_integer_to_string]
	// ["string_concat", FUN_string_concat],
]);
