import {InternalSymbol} from './symbol';
import {AstVisitor, Block, ForStatement, FunctionDecl} from './ast';
import {SymbolDumper} from './symbol';

export class Scope {
	name2sym: Map<string, InternalSymbol> = new Map();
	enclosingScope: Scope | null;

	constructor(enclosingScope: Scope | null) {
		this.enclosingScope = enclosingScope;
	}

	enter(name: string, sym: InternalSymbol) {
		this.name2sym.set(name, sym);
	}
	hasSymbol(name: string) {
		return this.name2sym.has(name);
	}

	getSymbol(name: string) {
		return this.name2sym.get(name) || null;
	}
	getSymbolCascade(name: string): InternalSymbol | null {
		const symbol = this.getSymbol(name);
		if (symbol !== null) {
			return symbol;
		} else if (this.enclosingScope !== null) {
			return this.enclosingScope.getSymbolCascade(name);
		}
		return null;
	}
}

export class ScopeDumper extends AstVisitor {
	visitFunctionDecl(functionDecl: FunctionDecl, prefix: any): any {
		console.log(prefix + 'Scope of function: ' + functionDecl.name);

		//显示本级Scope
		if (functionDecl.scope !== null) {
			this.dumpScope(functionDecl.scope, prefix);
		} else {
			console.log(prefix + '{null}');
		}

		//继续遍历
		super.visitFunctionDecl(functionDecl, prefix + '    ');
	}

	visitBlock(block: Block, prefix: any): any {
		console.log(prefix + 'Scope of block');
		//显示本级Scope
		if (block.scope !== null) {
			this.dumpScope(block.scope, prefix);
		} else {
			console.log(prefix + '{null}');
		}

		//继续遍历
		super.visitBlock(block, prefix + '    ');
	}

	visitForStatement(stmt: ForStatement, prefix: any): any {
		console.log(prefix + 'Scope of for statement');
		//显示本级Scope
		if (stmt.scope !== null) {
			this.dumpScope(stmt.scope, prefix);
		} else {
			console.log(prefix + '{null}');
		}

		//继续遍历
		super.visitForStatement(stmt, prefix);
	}

	private dumpScope(scope: Scope, prefix: string) {
		if (scope.name2sym.size > 0) {
			//遍历该作用域的符号。
			const symbolDumper = new SymbolDumper();
			for (const sym of scope.name2sym.values()) {
				symbolDumper.visit(sym, prefix + '    ');
			}
		} else {
			console.log(prefix + '    {empty}');
		}
	}
}
