/**
 * semantic analysis
 * 1. simple symbol table
 * 2. function reference resolve
 * 3. variable reference resolve
 */

import {table} from 'console';
import {
	AstVisitor,
	AstNode,
	Block,
	Prog,
	Decl,
	VariableDecl,
	FunctionDecl,
	FunctionCall,
	Statement,
	Expression,
	ExpressionStatement,
	Binary,
	IntegerLiteral,
	DecimalLiteral,
	StringLiteral,
	Variable
} from './ast';

class MySymbol {
	name: string;
	decl: Decl;
	kind: SymKind;
	constructor(name: string, decl: Decl, kind: SymKind) {
		this.name = name;
		this.decl = decl;
		this.kind = kind;
	}
}

export enum SymKind {
	Variable,
	Function,
	Class,
	Interface
}

////////////////////////////////////////////////////////////////////////////////
//symbol table

export class SymTable {
	table: Map<string, MySymbol> = new Map();

	enter(name: string, decl: Decl, symType: SymKind) {
		this.table.set(name, new MySymbol(name, decl, symType));
	}

	hasSymbol(name: string) {
		return this.table.has(name);
	}

	getSymbol(name: string): MySymbol | undefined {
		return this.table.get(name);
	}
}

export class Enter extends AstVisitor {
	symTable: SymTable;
	constructor(symTable: SymTable) {
		super();
		this.symTable = symTable;
	}

	/**
	 * insert a functionDecl into map
	 * @param functionDecl
	 */
	visitFunctionDecl(functionDecl: FunctionDecl) {
		if (this.symTable.hasSymbol(functionDecl.name)) {
			console.log('Dumplicate symbol: ' + functionDecl.name);
		}
		this.symTable.enter(functionDecl.name, functionDecl, SymKind.Function);
	}

	/**
	 * insert a variableDecl into map
	 * @param variableDecl
	 */
	visitVariableDecl(variableDecl: VariableDecl) {
		if (this.symTable.hasSymbol(variableDecl.name)) {
			console.log('Dumplicate symbol: ' + variableDecl.name);
		}
		this.symTable.enter(variableDecl.name, variableDecl, SymKind.Variable);
	}
}

////////////////////////////////////////////////////////////////////////////////
// reference resolve:(function\ variable)

/**
 * traverse AST and find definition of functionCall & variable
 */

export class RefResolver extends AstVisitor {
	symTable: SymTable;
	constructor(symTable: SymTable) {
		super();
		this.symTable = symTable;
	}

	/**
	 * resolve function reference
	 * @param functionCall
	 */
	visitFunctionCall(functionCall: FunctionCall) {
		const symbol = this.symTable.getSymbol(functionCall.name);
		if (symbol?.kind === SymKind.Function) {
			functionCall.decl = symbol.decl as FunctionDecl;
		} else {
			if (functionCall.name !== 'println') {
				//系统内置函数不用报错
				console.log(
					'Error: cannot find declaration of function ' +
						functionCall.name
				);
			}
		}
	}

	/**
	 * resolve variable reference
	 * @param variable
	 */

	visitVariable(variable: Variable) {
		const symbol = this.symTable.getSymbol(variable.name);
		if (symbol?.kind === SymKind.Variable) {
			variable.decl = symbol.decl as VariableDecl;
		} else {
			console.log(
				'Error: cannot find declaration of variable ' + variable.name
			);
		}
	}
}
