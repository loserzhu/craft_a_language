////////////////////////////////////////////////////////////////////
// tokenization stage

// token types
enum TokenKind {
	Keyword,
	Identifier,
	StringLiteral,
	Seperator,
	Operator,
	EOF
}

// token data structure
interface Token {
	kind: TokenKind;
	text: string;
}

// the given token array
/**
 * function greet() {
 *   println("Hello My Parser!");
 * }
 * greet();
 */
const tokenArray: Token[] = [
	{kind: TokenKind.Keyword, text: 'function'},
	{kind: TokenKind.Identifier, text: 'greet'},
	{kind: TokenKind.Seperator, text: '('},
	{kind: TokenKind.Seperator, text: ')'},
	{kind: TokenKind.Seperator, text: '{'},
	{kind: TokenKind.Identifier, text: 'println'},
	{kind: TokenKind.Seperator, text: '('},
	{kind: TokenKind.StringLiteral, text: 'Hello My Parser!'},
	{kind: TokenKind.Seperator, text: ')'},
	{kind: TokenKind.Seperator, text: ';'},
	{kind: TokenKind.Seperator, text: '}'},
	{kind: TokenKind.Identifier, text: 'greet'},
	{kind: TokenKind.Seperator, text: '('},
	{kind: TokenKind.Seperator, text: ')'},
	{kind: TokenKind.Seperator, text: ';'},
	{kind: TokenKind.EOF, text: ''}
];

// super tiny tokenizer
class Tokenizer {
	private readonly tokens: Token[];
	private pos = 0;
	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}
	next(): Token {
		if (this.pos <= this.tokens.length) {
			return this.tokens[this.pos++];
		} else {
			return this.tokens[this.pos];
		}
	}
	position(): number {
		return this.pos;
	}
	traceBack(newPos: number) {
		this.pos = newPos;
	}
}

////////////////////////////////////////////////////////////////////
// parsing (including AstNode data structure)

/**
 * ast class
 */
abstract class AstNode {
	public abstract dump(prefix: string): void;
}

/**
 * statement node.
 * child: functionDecl & functionCall
 */
abstract class Statement extends AstNode {
	static isStatementNode(node: any): node is Statement {
		return !!node;
	}
}

/**
 * program node, root of AST
 */

class Prog extends AstNode {
	stmts: Statement[];
	constructor(stmts: Statement[]) {
		super();
		this.stmts = stmts;
	}

	public dump(prefix: string): void {
		console.log(prefix + 'Prog');
		this.stmts.forEach((x) => x.dump(prefix + '\t'));
	}
}

/**
 * functionDecl node
 */
class FunctionDecl extends Statement {
	name: string;
	body: FunctionBody;
	constructor(name: string, body: FunctionBody) {
		super();
		this.name = name;
		this.body = body;
	}

	public dump(prefix: string): void {
		console.log(prefix + 'FunctionDecl ' + this.name);
		this.body.dump(prefix + '\t');
	}
}

/**
 * FunctionBody node
 */
class FunctionBody extends Statement {
	stmts: FunctionCall[];
	constructor(stmts: FunctionCall[]) {
		super();
		this.stmts = stmts;
	}
	static isFunctionBodyNode(node: any): node is FunctionBody {
		if (!node) {
			return false;
		}
		return Object.getPrototypeOf(node) === FunctionBody.prototype;
	}
	public dump(prefix: string): void {
		console.log(prefix + 'FunctionBody');
		this.stmts.forEach((x) => {
			x.dump(prefix + '\t');
		});
	}
}

/**
 * FunctionCall node
 */
class FunctionCall extends Statement {
	name: string;
	params: string[];
	definition: FunctionDecl | null = null;
	constructor(name: string, params: string[]) {
		super();
		this.name = name;
		this.params = params;
	}

	static isFunctionCallNode(node: any): node is FunctionCall {
		if (!node) {
			return false;
		}
		return Object.getPrototypeOf(node) === FunctionCall.prototype;
	}

	public dump(prefix: string): void {
		console.log(
			prefix +
				'FunctionCall ' +
				this.name +
				(this.definition ? ', resolved' : ', not resolved')
		);
		this.params.forEach((x) => {
			console.log(prefix + '\tParams: ' + x);
		});
	}
}

class Parser {
	private tokenizer: Tokenizer;
	constructor(tokenizer: Tokenizer) {
		this.tokenizer = tokenizer;
	}

	/**
	 * parse tokenizer. it is:
	 * prog = (functionDecl | functionCall)* ;
	 */
	parseProg(): Prog {
		const stmts: Statement[] = [];
		let stmt: Statement | null | void = null;
		while (true) {
			stmt = this.parseFunctionDecl();

			if (Statement.isStatementNode(stmt)) {
				stmts.push(stmt);
				continue;
			}

			stmt = this.parseFunctionCall();
			if (Statement.isStatementNode(stmt)) {
				stmts.push(stmt);
				continue;
			}
			break;
		}
		return new Prog(stmts);
	}

	/**
	 * parse function declare.
	 * functionDecl: "function" Identifier "(" ")"  functionBody;
	 */
	parseFunctionDecl(): void | FunctionDecl | null {
		const oldPos = this.tokenizer.position();
		let t = this.tokenizer.next();
		if (t.kind === TokenKind.Keyword && t.text === 'function') {
			t = this.tokenizer.next();
			if (t.kind === TokenKind.Identifier) {
				const t1 = this.tokenizer.next();
				if (t1.text === '(') {
					const t2 = this.tokenizer.next();
					if (t2.text === ')') {
						const functionBody = this.parseFunctionBody();
						if (FunctionBody.isFunctionBodyNode(functionBody)) {
							return new FunctionDecl(t.text, functionBody);
						}
					} else {
						console.log(
							"Expecting ')' in FunctionDecl, while we got a " +
								t.text
						);
						return;
					}
				} else {
					console.log(
						"Expecting '(' in FunctionDecl, while we got a " +
							t.text
					);
					return;
				}
			}
		}

		// trace back if failed.
		this.tokenizer.traceBack(oldPos);
		return null;
	}

	/**
	 * parse function body.
	 * functionBody : '{' functionCall* '}' ;
	 */
	parseFunctionBody() {
		const oldPos: number = this.tokenizer.position();
		const stmts: FunctionCall[] = [];
		let t: Token = this.tokenizer.next();
		if (t.text === '{') {
			let functionCall = this.parseFunctionCall();
			while (FunctionCall.isFunctionCallNode(functionCall)) {
				stmts.push(functionCall);
				functionCall = this.parseFunctionCall();
			}
			t = this.tokenizer.next();
			if (t.text === '}') {
				return new FunctionBody(stmts);
			} else {
				console.log(
					"Expecting '}' in FunctionBody, while we got a " + t.text
				);
				return;
			}
		}
		console.log("Expecting '{' in FunctionBody, while we got a " + t.text);
		// trace back if failed.
		this.tokenizer.traceBack(oldPos);
		return;
	}

	/**
	 * parse function call;
	 * functionCall : Identifier '(' parameterList? ')' ;
	 * parameterList : StringLiteral (',' StringLiteral)* ;
	 */
	parseFunctionCall(): void | Statement | null {
		const oldPos: number = this.tokenizer.position();
		const params: string[] = [];
		const t: Token = this.tokenizer.next();
		if (t.kind === TokenKind.Identifier) {
			const t1 = this.tokenizer.next();
			if (t1.text === '(') {
				let t2 = this.tokenizer.next();
				// get params in the loop
				while (t2.text !== ')') {
					if (t2.kind === TokenKind.StringLiteral) {
						params.push(t2.text);
					} else {
						console.log(
							'Expecting parameter in FunctionCall, while we got a ' +
								t2.text
						);
						return;
					}
					t2 = this.tokenizer.next();
					if (t2.text !== ')') {
						if (t2.text === ',') {
							t2 = this.tokenizer.next();
						} else {
							console.log(
								'Expecting a comma in FunctionCall, while we got a ' +
									t2.text
							);
							return;
						}
					}
				}
				t2 = this.tokenizer.next();
				if (t2.text === ';') {
					return new FunctionCall(t.text, params);
				}
			}
		}
		// trace back if failed.
		this.tokenizer.traceBack(oldPos);
		return null;
	}
}

/**
 * AST visitor.
 */
abstract class AstVisitor {
	visitProg(prog: Prog) {
		let res: any;
		for (const x of prog.stmts) {
			if (typeof (x as FunctionDecl).body === 'object') {
				res = this.visitFunctionDecl(x as FunctionDecl);
			} else {
				res = this.visitFunctionCall(x as FunctionCall);
			}
		}
		return res;
	}
	visitFunctionDecl(functionDecl: FunctionDecl): any {
		return this.visitFunctionBody(functionDecl.body);
	}
	visitFunctionBody(functionBody: FunctionBody): any {
		let res: any;
		for (const x of functionBody.stmts) {
			res = this.visitFunctionCall(x);
		}
		return res;
	}
	visitFunctionCall(_: FunctionCall): any {
		return undefined;
	}
}

////////////////////////////////////////////////////////////////////
// semantic analysis.adds semantic information to the parsed AST tree(definite assignment)

/**
 * RefResolver: performs simple semantic checks(definite assignment)
 */

class RefResolver extends AstVisitor {
	prog: Prog | null = null;
	visitProg(prog: Prog) {
		this.prog = prog;
		for (const x of prog.stmts) {
			const functionCall = x as FunctionCall;
			if (typeof functionCall.params === 'object') {
				this.resolveFunctionCall(prog, functionCall);
			} else {
				this.visitFunctionDecl(x as FunctionDecl);
			}
		}
	}
	visitFunctionBody(functionBody: FunctionBody) {
		if (this.prog !== null) {
			for (const x of functionBody.stmts) {
				this.resolveFunctionCall(this.prog, x);
			}
		}
	}

	private resolveFunctionCall(prog: Prog, functionCall: FunctionCall) {
		const functionDecl = this.findFunctionDecl(prog, functionCall.name);
		if (functionDecl !== null) {
			functionCall.definition = functionDecl;
		} else {
			if (functionCall.name !== 'println') {
				console.log(
					'Error: cannot find definition of function ' +
						functionCall.name
				);
			}
		}
	}

	private findFunctionDecl(prog: Prog, name: string): FunctionDecl | null {
		for (const x of prog.stmts) {
			const functionDecl = x as FunctionDecl;
			if (
				typeof functionDecl.body === 'object' &&
				functionDecl.name === name
			) {
				return functionDecl;
			}
		}
		return null;
	}
}

/**
 * interpreter. visit the ast tree and run the program.
 */
class Interpreter extends AstVisitor {
	visitProg(prog: Prog) {
		for (const x of prog.stmts) {
			const functioncall = x as FunctionCall;
			if (typeof functioncall.params === 'object') {
				this.runFunction(functioncall);
			}
		}
	}

	visitFunctionBody(functionBody: FunctionBody): any {
		let retVal: any;
		for (const x of functionBody.stmts) {
			retVal = this.runFunction(x);
		}
	}

	runFunction(functioncall: FunctionCall): any {
		if (functioncall.name === 'println') {
			if (functioncall.params.length > 0) {
				console.log(functioncall.params.join(''));
			} else {
				console.log();
			}
		} else {
			if (functioncall.definition !== null) {
				this.visitFunctionBody(functioncall.definition.body);
			}
		}
	}
}

const compileAndRun = () => {
	//tokenize
	const tokenizer = new Tokenizer(tokenArray);
	console.log('\nthe token used: ');
	for (const token of tokenArray) {
		console.log(token);
	}

	//parse
	const prog: Prog = new Parser(tokenizer).parseProg();
	console.log('\nAST we get after parsing tokens:');
	prog.dump('');

	//semantic check
	const refResolver = new RefResolver().visitProg(prog);
	console.log('\nAST after definite assignment:');
	prog.dump('');

	console.log('\nrun program');
	new Interpreter().visitProg(prog);
};

compileAndRun();
