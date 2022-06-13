/**
 *
 * pseudo ENBF:
 * prog = statementList? EOF;
 * statementList = (variableDecl | functionDecl | expressionStatement)+ ;
 * typeAnnotationn : ':' typeName;
 * functionDecl: "function" Identifier "(" ")"  functionBody;
 * functionBody : '{' statementList? '}' ;
 * statement: variableDecl | functionDecl | expressionStatement;
 * expressionStatement: expression ';' ;
 * expression: primary (binOP primary)* ;
 * primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
 * binOP: '+' | '-' | '*' | '/' | '=' | '+=' | '-=' | '*=' | '/=' | '==' | '!=' | '<=' | '>=' | '<'
 *      | '>' | '&&'| '||'|...;
 * functionCall : Identifier '(' parameterList? ')' ;
 * parameterList : expression (',' expression)* ;
 */

import {TokenKind, Scanner} from './scanner';
import {
	Block,
	Prog,
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

////////////////////////////////////////////////////////////////////////////////
//Parser

export class Parser {
	scanner: Scanner;
	constructor(scanner: Scanner) {
		this.scanner = scanner;
	}

	/**
	 * prog = statementList? EOF;
	 */
	parseProg(): Prog {
		return new Prog(this.parseStatementList());
	}
	/**
	 * statementList = (variableDecl | functionDecl | expressionStatement)+ ;
	 */
	parseStatementList(): Statement[] {
		const stmts: Statement[] = [];
		let t = this.scanner.peek();
		// FOLLOW set of statementList: {"}",EOF}  (prog, functionBody)
		while (t.kind !== TokenKind.EOF && t.text !== '}') {
			const stmt = this.parseStatement();
			if (stmt) {
				stmts.push(stmt);
			}
			t = this.scanner.peek();
		}
		return stmts;
	}
	/**
	 * statement: variableDecl | functionDecl | expressionStatement;
	 */
	parseStatement(): Statement | null {
		const t = this.scanner.peek();
		if (t.kind === TokenKind.Keyword && t.text === 'function') {
			return this.parseFunctionDecl();
		}
		if (t.text === 'let') {
			return this.parseVariableDecl();
		}
		if (
			t.kind === TokenKind.Identifier ||
			t.kind === TokenKind.DecimalLiteral ||
			t.kind === TokenKind.IntegerLiteral ||
			t.kind === TokenKind.StringLiteral ||
			t.text === '('
		) {
			return this.parseExpressionStatement();
		}
		console.log(
			'Can not recognize a expression starting with: ' +
				this.scanner.peek().text
		);
		return null;
	}

	/**
	 * variableDecl : 'let' Identifier typeAnnotation? ('=' singleExpression) ';';
	 * typeAnnotationn : ':' typeName;
	 */
	parseVariableDecl(): VariableDecl | null {
		this.scanner.next();
		const t = this.scanner.next();
		if (t.kind === TokenKind.Identifier) {
			const varName = t.text;
			let varType = 'any';
			let init: Expression | null = null;

			let t1 = this.scanner.peek();
			// type annotation
			if (t1.text === ':') {
				this.scanner.next();
				t1 = this.scanner.peek();
				if (t1.kind === TokenKind.Identifier) {
					this.scanner.next();
					varType = t1.text;
					t1 = this.scanner.peek();
				} else {
					console.log(
						'Error parsing type annotation in VariableDecl'
					);
					return null;
				}
			}

			// init
			if (t1.text === '=') {
				this.scanner.next();
				init = this.parseExpression();
			}

			//';'
			t1 = this.scanner.peek();
			if (t1.text === ';') {
				this.scanner.next();
				return new VariableDecl(varName, varType, init);
			} else {
				console.log(
					'Expecting ; at the end of varaible declaration, while we meet ' +
						t1.text
				);
				return null;
			}
		} else {
			console.log(
				'Expecting variable name in VariableDecl, while we meet ' +
					t.text
			);
			return null;
		}
	}

	/**
	 * functionDecl: "function" Identifier "(" ")"  functionBody;
	 */
	parseFunctionDecl(): FunctionDecl | null {
		this.scanner.next();

		const t = this.scanner.next();
		if (t.kind === TokenKind.Identifier) {
			let t1 = this.scanner.next();
			if (t1.text === '(') {
				t1 = this.scanner.next();
				if (t1.text === ')') {
					const functionBody = this.parseFunctionBody();
					if (functionBody) {
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
	 * functionBody : '{' statementList? '}' ;
	 */
	parseFunctionBody(): Block | null {
		let t = this.scanner.next();
		if (t.text === '{') {
			const stmts = this.parseStatementList();
			t = this.scanner.next();
			if (t.text === '}') {
				return new Block(stmts);
			} else {
				console.log(
					"Expecting '}' in FunctionBody, while we got a " + t.text
				);
				return null;
			}
		} else {
			console.log(
				"Expecting '{' in FunctionBody, while we got a " + t.text
			);
			return null;
		}
	}

	/**
	 * expressionStatement: expression ';' ;
	 */
	parseExpressionStatement(): ExpressionStatement | null {
		const exp = this.parseExpression();
		if (exp) {
			const t = this.scanner.next();
			if (t.text === ';') {
				return new ExpressionStatement(exp);
			} else {
				console.log(
					'Expecting a semicolon at the end of an expresson statement, while we got a ' +
						t.text
				);
			}
		} else {
			console.log('Error parsing ExpressionStatement');
		}
		return null;
	}

	/**
	 * expression: primary (binOP primary)* ;
	 * a bottom-up parser implemented in Operator Precedence Parsing Algorithm(recursively)
	 */
	parseExpression(): Expression | null {
		return this.parseBinary(0);
	}

	/**
	 * expression: primary (binOP primary)* ;
	 * @param prec current operator precedence
	 */

	parseBinary(prec: number): Expression | null {
		let exp1 = this.parsePrimary();
		if (exp1 !== null) {
			let t = this.scanner.peek();
			let tprec = this.getPrec(t.text);
			//下面这个循环的意思是：只要右边出现的新运算符的优先级更高，
			//那么就把右边出现的作为右子节点。
			/**
			 * 对于2+3*5
			 * 第一次循环，遇到+号，优先级大于零，所以做一次递归的binary
			 * 在递归的binary中，遇到乘号，优先级大于+号，所以形成3*5返回，又变成上一级的右子节点。
			 *
			 * 反过来，如果是3*5+2
			 * 第一次循环还是一样。
			 * 在递归中，新的运算符的优先级要小，所以只返回一个5，跟前一个节点形成3*5.
			 */
			while (t.kind === TokenKind.Operator && tprec > prec) {
				this.scanner.next();
				const exp2 = this.parseBinary(tprec);
				if (exp2 !== null) {
					const exp: Binary = new Binary(t.text, exp1, exp2);
					exp1 = exp;
					t = this.scanner.peek();
					tprec = this.getPrec(t.text);
				} else {
					console.log(
						'Can not recognize a expression starting with: ' +
							t.text
					);
				}
			}
			return exp1;
		} else {
			console.log(
				'Can not recognize a expression starting with: ' +
					this.scanner.peek().text
			);
			return null;
		}
	}

	/**
	 * primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
	 */
	parsePrimary(): Expression | null {
		const t = this.scanner.peek();
		if (t.kind === TokenKind.StringLiteral) {
			this.scanner.next();
			return new StringLiteral(t.text);
		} else if (t.kind === TokenKind.DecimalLiteral) {
			this.scanner.next();
			return new DecimalLiteral(parseFloat(t.text));
		} else if (t.kind === TokenKind.IntegerLiteral) {
			this.scanner.next();
			return new IntegerLiteral(parseInt(t.text));
		} else if (t.kind === TokenKind.Identifier) {
			// it could be functionCall or variable
			// LL(2)
			if (this.scanner.peek2().text === '(') {
				return this.parseFunctionCall();
			} else {
				this.scanner.next();
				return new Variable(t.text);
			}
		} else if (t.text === '(') {
			this.scanner.next();
			const exp = this.parseExpression();
			const t1 = this.scanner.peek();
			if (t1.text === ')') {
				this.scanner.next();
				return exp;
			} else {
				console.log(
					"Expecting a ')' at the end of a primary expresson, while we got a " +
						t.text
				);
				return null;
			}
		} else {
			console.log(
				'Can not recognize a primary expression starting with: ' +
					t.text
			);
			return null;
		}
	}

	/**
	 * parse functionCall
	 * functionCall : Identifier '(' parameterList? ')' ;
	 * parameterList : StringLiteral (',' StringLiteral)* ;
	 */
	parseFunctionCall(): FunctionCall | null {
		const params: Expression[] = [];
		const t = this.scanner.next();
		if (t.kind === TokenKind.Identifier) {
			let t1 = this.scanner.peek();
			if (t1.text === '(') {
				t1 = this.scanner.next();
				while (t1.text !== ')') {
					const exp = this.parseExpression();
					if (exp) {
						params.push(exp);
					} else {
						console.log('Error parsing parameter in function call');
						return null;
					}

					t1 = this.scanner.peek();

					if (t1.text !== ')') {
						if (t1.text === ',') {
							t1 = this.scanner.next();
						} else {
							console.log(
								'Expecting a comma at the end of a function call, while we got a ' +
									t1.text
							);
							return null;
						}
					}
				}

				this.scanner.next();
				return new FunctionCall(t.text, params);
			}
		}
		return null;
	}

	/**
	 * operator precedence
	 */
	private opPrec = new Map([
		['=', 2],
		['+=', 2],
		['-=', 2],
		['*=', 2],
		['-=', 2],
		['%=', 2],
		['&=', 2],
		['|=', 2],
		['^=', 2],
		['~=', 2],
		['<<=', 2],
		['>>=', 2],
		['>>>=', 2],
		['||', 4],
		['&&', 5],
		['|', 6],
		['^', 7],
		['&', 8],
		['==', 9],
		['===', 9],
		['!=', 9],
		['!==', 9],
		['>', 10],
		['>=', 10],
		['<', 10],
		['<=', 10],
		['<<', 11],
		['>>', 11],
		['>>>', 11],
		['+', 12],
		['-', 12],
		['*', 13],
		['/', 13],
		['%', 13]
	]);
	private getPrec(op: string): number {
		const ret = this.opPrec.get(op);
		if (typeof ret === 'undefined') {
			return -1;
		} else {
			return ret;
		}
	}
}
