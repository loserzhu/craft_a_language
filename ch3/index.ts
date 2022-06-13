import {TokenKind, Scanner, CharStream} from './scanner';
import {
	AstVisitor,
	Prog,
	VariableDecl,
	FunctionDecl,
	FunctionCall,
	Binary,
	Variable
} from './ast';
import {Parser} from './parser';
import {SymTable, Enter, RefResolver} from './semantic';
import fs from 'fs';

class LeftValue {
	variable: Variable;
	constructor(variable: Variable) {
		this.variable = variable;
	}
}

/**
 * program intepretor.
 * traverse AST and run it.
 */
class Intepretor extends AstVisitor {
	values: Map<string, any> = new Map();

	private getVariableValue(varName: string): any {
		return this.values.get(varName);
	}

	private setVariableValue(varName: string, value: any): any {
		return this.values.set(varName, value);
	}

	private isLeftValue(v: any): v is LeftValue {
		return typeof (v as LeftValue).variable === 'object';
	}

	visitFunctionCall(functionCall: FunctionCall) {
		if (functionCall.name === 'println') {
			if (functionCall.params.length > 0) {
				let res = this.visit(functionCall.params[0]);
				if (typeof (res as LeftValue).variable === 'object') {
					res = this.getVariableValue(
						(res as LeftValue).variable.name
					);
				}
				console.log(res);
			}
		} else {
			if (functionCall.decl !== null) {
				this.visitBlock(functionCall.decl.body);
			}
		}
	}

	visitVariableDecl(variableDecl: VariableDecl) {
		if (variableDecl.init !== null) {
			let v = this.visit(variableDecl.init);
			if (this.isLeftValue(v)) {
				v = this.getVariableValue(v.variable.name);
			}
			this.setVariableValue(variableDecl.name, v);
			return v;
		}
	}

	visitVariable(v: Variable): any {
		return new LeftValue(v);
	}

	visitBinary(bi: Binary) {
		let ret;
		let v1 = this.visit(bi.exp1);
		let v2 = this.visit(bi.exp2);
		let v1Left: LeftValue | null = null;
		let v2Left: LeftValue | null = null;
		if (this.isLeftValue(v1)) {
			v1Left = v1;
			v1 = this.getVariableValue(v1Left.variable.name);
			// console.log("value of "+v1Left.variable.name + " : "+v1);
		}
		if (this.isLeftValue(v2)) {
			v2Left = v2;
			v2 = this.getVariableValue(v2Left.variable.name);
		}

		switch (bi.op) {
			case '+':
				ret = v1 + v2;
				break;
			case '-':
				ret = v1 - v2;
				break;
			case '*':
				ret = v1 * v2;
				break;
			case '/':
				ret = v1 / v2;
				break;
			case '%':
				ret = v1 % v2;
				break;
			case '>':
				ret = v1 > v2;
				break;
			case '>=':
				ret = v1 >= v2;
				break;
			case '<':
				ret = v1 < v2;
				break;
			case '<=':
				ret = v1 <= v2;
				break;
			case '&&':
				ret = v1 && v2;
				break;
			case '||':
				ret = v1 || v2;
				break;
			case '=':
				if (v1Left !== null) {
					this.setVariableValue(v1Left.variable.name, v2);
				} else {
					console.log('Assignment need a left value: ');
				}
				break;
			default:
				console.log('Unsupported binary operation: ' + bi.op);
		}
		return ret;
	}
}

const compileAndRun = (program: string) => {
	//source code
	console.log('source code:');
	console.log(program);

	//tokenize
	console.log('\ntokens:');
	let tokenizer = new Scanner(new CharStream(program));
	while (tokenizer.peek().kind !== TokenKind.EOF) {
		console.log(tokenizer.next());
	}
	tokenizer = new Scanner(new CharStream(program)); //reset tokenizer
	//parse
	const prog: Prog = new Parser(tokenizer).parseProg();
	console.log('\nAST:');
	prog.dump('');

	//semantic analysis
	const symTable = new SymTable(); // init symbol table
	new Enter(symTable).visit(prog); // build symbol table
	new RefResolver(symTable).visit(prog); // resolve reference
	console.log('\nAST after resloving reference:');
	prog.dump('');

	//run program
	console.log('\nrunning:');
	const res = new Intepretor().visit(prog);
	console.log('retrun value: ' + res);
};

if (process.argv.length < 3) {
	console.log('Usage: node ' + process.argv[1] + ' FILENAME');
	process.exit(1);
}

// entry
const filename = process.argv[2];
fs.readFile(filename, 'utf8', function (err: any, data: string) {
	if (err) throw err;
	compileAndRun(data);
});
