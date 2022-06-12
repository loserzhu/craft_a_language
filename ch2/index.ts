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

/**
 * char stream. operations:
 * peek(): peek next char.
 * next(): read next char, move pointer.
 * eof(): is EOF char.
 */

class CharStream {
	data: string;
	pos = 0;
	line = 1;
	col = 0;
	constructor(data: string) {
		this.data = data;
	}

	peek() {
		return this.data.charAt(this.pos);
	}
	next() {
		const ch = this.data.charAt(this.pos++);
		if (ch == '\n') {
			this.line++;
			this.col = 0;
		} else {
			this.col++;
		}
		return ch;
	}
	eof() {
		return this.peek() == '';
	}
}

/**
 * tokenizer
 * accept a char stream and produce tokens. available operation:
 * next(): return current token, step into next one.
 * peek(): return current token without moving pointer.
 */

class Tokenizer {
	stream: CharStream;
	nextToken: Token = {kind: TokenKind.EOF, text: ''};
	constructor(stream: CharStream) {
		this.stream = stream;
	}
	next() {
		// parse a token at first operation
		if (this.nextToken.kind === TokenKind.EOF && !this.stream.eof()) {
			this.nextToken = this.getAToken();
		}
		const lastToken = this.nextToken;
		// parse the next token in advance
		this.nextToken = this.getAToken();
		return lastToken;
	}

	peek() {
		// parse a token at first operation
		if (this.nextToken.kind === TokenKind.EOF && !this.stream.eof()) {
			this.nextToken = this.getAToken();
		}
		return this.nextToken;
	}

	// get a token from char stream
	private getAToken(): Token {
		this.skipWhiteSpace();
		if (this.stream.eof()) {
			return {kind: TokenKind.EOF, text: ''};
		}
		const ch = this.stream.peek();
		if (this.isLetter(ch) || this.isDigit(ch)) {
			return this.parseIdentifer();
		} else if (ch == '"') {
			return this.parseStringLiteral();
		} else if (['(', ')', '{', '}', ';', ','].includes(ch)) {
			this.stream.next();
			return {kind: TokenKind.Seperator, text: ch};
		} else if (ch == '/') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 == '*') {
				this.skipMultiLineComments();
				return this.getAToken();
			} else if (ch1 == '/') {
				this.skipSingleLineComment();
				return this.getAToken();
			} else if (ch1 == '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '/='};
			} else {
				return {kind: TokenKind.Operator, text: '/'};
			}
		} else if (ch == '+') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 == '+') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '++'};
			} else if (ch1 == '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '+='};
			} else {
				return {kind: TokenKind.Operator, text: '+'};
			}
		} else if (ch == '-') {
			this.stream.next();
			let ch1 = this.stream.peek();
			if (ch1 == '-') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '--'};
			} else if (ch1 == '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '-='};
			} else {
				return {kind: TokenKind.Operator, text: '-'};
			}
		} else if (ch == '*') {
			this.stream.next();
			let ch1 = this.stream.peek();
			if (ch1 == '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '*='};
			} else {
				return {kind: TokenKind.Operator, text: '*'};
			}
		} else {
			//skip char not support yet.
			console.log(
				"Unrecognized pattern meeting ': " +
					ch +
					"', at" +
					this.stream.line +
					' col: ' +
					this.stream.col
			);
			this.stream.next();
			return this.getAToken();
		}
	}

	skipSingleLineComment() {
		this.stream.next();
		while (this.stream.peek() != '\n' && !this.stream.eof()) {
			this.stream.next();
		}
	}

	skipMultiLineComments() {
		this.stream.next();
		if (!this.stream.eof()) {
			let ch1 = this.stream.next();
			while (!this.stream.eof()) {
				const ch2 = this.stream.next();
				if (ch1 == '*' && ch2 == '/') {
					return;
				}
				ch1 = ch2;
			}
		}
	}

	/**
	 * string should be contained within " and escape sequences not support.
	 */
	private parseStringLiteral(): Token {
		const token: Token = {kind: TokenKind.StringLiteral, text: ''};
		this.stream.next();
		while (!this.stream.eof() && this.stream.peek() != '"') {
			token.text += this.stream.next();
		}
		if (this.stream.peek() == '"') {
			this.stream.next();
		} else {
			console.log(
				'Expecting an " at line: ' +
					this.stream.line +
					' col: ' +
					this.stream.col
			);
		}
		return token;
	}

	/**
	 * Identifier: [a-zA-Z_][a-zA-Z0-9_]* ;
	 */
	private parseIdentifer(): Token {
		const token: Token = {kind: TokenKind.Identifier, text: ''};

		while (
			!this.stream.eof() &&
			this.isLetterDigitorUnderScore(this.stream.peek())
		) {
			token.text += this.stream.next();
		}

		if (token.text == 'function') {
			token.kind = TokenKind.Keyword;
		}

		return token;
	}

	private isLetterDigitorUnderScore(ch: string) {
		return (
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= 'a' && ch <= 'z') ||
			(ch >= '0' && ch <= '9') ||
			ch == '_'
		);
	}

	private isDigit(ch: string) {
		return ch >= '0' && ch <= '9';
	}

	private isLetter(ch: string) {
		return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z');
	}

	/**
	 * skip whitespace: ' ' , '\n' , '\t'
	 */
	private skipWhiteSpace() {
		while (this.isWhiteSpace(this.stream.peek())) {
			this.stream.next();
		}
	}

	private isWhiteSpace(ch: string): boolean {
		return ch == ' ' || ch == '\n' || ch == '\t';
	}
}

////////////////////////////////////////////////////////////////////
// parsing (including astnode data structure)

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
abstract class Statement extends AstNode {}

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
	tokenizer: Tokenizer;
	constructor(tokenizer: Tokenizer) {
		this.tokenizer = tokenizer;
	}

	/**
	 * parse tokenizer. it is:
	 * prog = (functionDecl | functionCall)*
	 */
	parseProg(): Prog {
		let stmts: Statement[] = [];
		let stmt: Statement | null | void = null;
		let token = this.tokenizer.peek();
		while (token.kind != TokenKind.EOF) {
			if (token.kind == TokenKind.Keyword && token.text == 'function') {
				stmt = this.parseFunctionDecl();
			} else if (token.kind == TokenKind.Identifier) {
				stmt = this.parseFunctionCall();
			}

			if (stmt != null) {
				stmts.push(stmt);
				console.log('add a statement successfully');
			} else {
				console.log('Unrecognized token: ', token);
			}
			token = this.tokenizer.peek();
		}
		return new Prog(stmts);
	}

	/**
	 * parse function declare.
	 * functionDecl: "function" Identifier "(" ")"  functionBody
	 */
	parseFunctionDecl(): void | FunctionDecl | null {
		// skip "function" keyword
		this.tokenizer.next();
		const t = this.tokenizer.next();
		if (t.kind == TokenKind.Identifier) {
			const t1 = this.tokenizer.next();
			if (t1.text == '(') {
				const t2 = this.tokenizer.next();
				if (t2.text == ')') {
					const functionBody = this.parseFunctionBody();
					if (!!functionBody) {
						return new FunctionDecl(t.text, functionBody);
					} else {
						console.log(
							'Error parsing FunctionBody in FunctionDecl'
						);
						return null;
					}
				} else {
					console.log(
						"Expecting ')' in FunctionDecl, while we got a " +
							t.text
					);
					return null;
				}
			} else {
				console.log(
					"Expecting '(' in FunctionDecl, while we got a " + t.text
				);
				return null;
			}
		} else {
			console.log('Expecting a function name, while we got a ' + t.text);
			return null;
		}
	}

	/**
	 * parse function body.
	 * functionBody : '{' functionCall* '}'
	 */
	parseFunctionBody(): FunctionBody | null {
		const t = this.tokenizer.next();
		if (t.text == '{') {
			const stmts: FunctionCall[] = [];
			while (this.tokenizer.peek().kind == TokenKind.Identifier) {
				const functionCall = this.parseFunctionCall();
				if (!!functionCall) {
					stmts.push(functionCall);
				} else {
					console.log(
						'Error parsing a FunctionCall in FunctionBody.'
					);
					return null;
				}
			}

			const t1 = this.tokenizer.next();
			if (t1.text == '}') {
				return new FunctionBody(stmts);
			} else {
				console.log(
					"Expecting '}' in FunctionBody, while we got a " + t.text
				);
				return null;
			}
		} else {
			return null;
		}
	}

	/**
	 * parse function call;
	 * functionCall : Identifier '(' parameterList? ')' ;
	 * parameterList : StringLiteral (',' StringLiteral)*
	 */
	parseFunctionCall(): void | FunctionCall | null {
		const t = this.tokenizer.next();
		if (t.kind == TokenKind.Identifier) {
			const params: string[] = [];
			const t1 = this.tokenizer.next();
			if (t1.text == '(') {
				let t2 = this.tokenizer.next();
				while (t2.text != ')') {
					if (t2.kind == TokenKind.StringLiteral) {
						params.push(t2.text);
					} else {
						console.log(
							'Expecting parameter in FunctionCall, while we got a ' +
								t2.text
						);
						return null;
					}

					t2 = this.tokenizer.next();
					if (t2.text != ')') {
						if (t2.text == ',') {
							t2 = this.tokenizer.next();
						} else {
							console.log(
								'Expecting a comma in FunctionCall, while we got a ' +
									t2.text
							);
							return null;
						}
					}
				}

				t2 = this.tokenizer.next();
				if (t2.text == ';') {
					return new FunctionCall(t.text, params);
				} else {
					console.log(
						'Expecting a semicolon in FunctionCall, while we got a ' +
							t2.text
					);
					return null;
				}
			} else {
				console.log('Excpecting "(" , while we got a ', t.text);
				return null;
			}
		} else {
			return null;
		}
	}
}

/**
 * AST visitor.
 */
abstract class AstVisitor {
	visitProg(prog: Prog) {
		let res: any;
		for (let x of prog.stmts) {
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
		for (let x of functionBody.stmts) {
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
		for (let x of prog.stmts) {
			let functionCall = x as FunctionCall;
			if (typeof functionCall.params === 'object') {
				this.resolveFunctionCall(prog, functionCall);
			} else {
				this.visitFunctionDecl(x as FunctionDecl);
			}
		}
	}
	visitFunctionBody(functionBody: FunctionBody) {
		if (this.prog != null) {
			for (let x of functionBody.stmts) {
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
		for (let x of prog.stmts) {
			let functionDecl = x as FunctionDecl;
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
 * intepretor. visit the ast tree and run the program.
 */
class Intepretor extends AstVisitor {
	visitProg(prog: Prog) {
		for (let x of prog.stmts) {
			let functioncall = x as FunctionCall;
			if (typeof functioncall.params === 'object') {
				this.runFunction(functioncall);
			}
		}
	}

	visitFunctionBody(functionBody: FunctionBody): any {
		let retVal: any;
		for (let x of functionBody.stmts) {
			retVal = this.runFunction(x);
		}
	}

	runFunction(functioncall: FunctionCall): any {
		if (functioncall.name == 'println') {
			if (functioncall.params.length > 0) {
				console.log(functioncall.params.join(''));
			} else {
				console.log();
			}
		} else {
			if (functioncall.definition != null) {
				this.visitFunctionBody(functioncall.definition.body);
			}
		}
	}
}

////////////////////////////////////////////////////////////////////
// entry

function compileAndRun(program: string) {
	//源代码
	console.log('source ccode:');
	console.log(program);

	//词法分析
	console.log('\ntokens:');
	let tokenizer = new Tokenizer(new CharStream(program));
	while (tokenizer.peek().kind != TokenKind.EOF) {
		console.log(tokenizer.next());
	}
	tokenizer = new Tokenizer(new CharStream(program)); //reset tokenizer,back to the first char.

	//语法分析
	let prog: Prog = new Parser(tokenizer).parseProg();
	console.log('\nAST:');
	prog.dump('');

	//语义分析
	new RefResolver().visitProg(prog);
	console.log('\nAST after resolving definition assignment');
	prog.dump('');

	//运行程序
	console.log('\nrun program:');
	let retVal = new Intepretor().visitProg(prog);
	console.log('return value: ' + retVal);
}

// require 3 args
if (process.argv.length < 3) {
	console.log('Usage: node ' + process.argv[1] + ' FILENAME');
	process.exit(1);
}

let fs = require('fs');
let filename = process.argv[2];
fs.readFile(filename, 'utf8', function (err: any, data: string) {
	if (err) throw err;
	compileAndRun(data);
});
