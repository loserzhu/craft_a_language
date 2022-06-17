/**
 * grammar analysis
 * features:
 * 1. function declare with parameters
 * 2. function call
 * 3. unary or binary expression( partial)
 *
 * ENBF:
 * prog = statementList? EOF;
 * statementList = (variableDecl | functionDecl | expressionStatement)+ ;
 * statement: block | expressionStatement | returnStatement | ifStatement | forStatement
 *          | emptyStatement | functionDecl | variableDecl ;
 * block : '{' statementList? '}' ;
 * ifStatement : 'if' '(' expression ')' statement ('else' statement)? ;
 * forStatement : 'for' '(' (expression | 'let' variableDecl)? ';' expression? ';' expression? ')' statement ;
 * variableStatement : 'let' variableDecl ';';
 * variableDecl : Identifier typeAnnotation？ ('=' expression)? ;
 * typeAnnotation : ':' typeName;
 * functionDecl: "function" Identifier callSignature  block ;
 * callSignature: '(' parameterList? ')' typeAnnotation? ;
 * returnStatement: 'return' expression? ';' ;
 * emptyStatement: ';' ;
 * expressionStatement: expression ';' ;
 * expression: assignment;
 * assignment: binary (assignmentOp binary)* ;
 * binary: unary (binOp unary)* ;
 * unary: primary | prefixOp unary | primary suffixOp ;
 * primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
 * assignmentOp = '=' | '+=' | '-=' | '*=' | '/=' | '>>=' | '<<=' | '>>>=' | '^=' | '|=' ;
 * binOp: '+' | '-' | '*' | '/' | '==' | '!=' | '<=' | '>=' | '<'
 *      | '>' | '&&'| '||'|...;
 * prefixOp = '+' | '-' | '++' | '--' | '!' | '~';
 * suffixOp = '++' | '--';
 * functionCall : Identifier '(' argumentList? ')' ;
 * argumentList : expression (',' expression)* ;
 */
import {Keyword, Op, Position, Scanner, Seperator, TokenKind} from './scanner';
import {CompilerError} from './error';
import {
	Binary,
	Block,
	CallSignature,
	DecimalLiteral,
	Decl,
	ErrorExp,
	ErrorStmt,
	Expression,
	ExpressionStatement,
	FunctionCall,
	FunctionDecl,
	IntegerLiteral,
	ParameterList,
	Prog,
	ReturnStatement,
	Statement,
	StringLiteral,
	Unary,
	Variable,
	VariableDecl,
	VariableStatement
} from './ast';
import {SysTypes, Type} from './types';

////////////////////////////////////////////////////////////////////////////////
//Parser

export class Parser {
	scanner: Scanner;
	errors: CompilerError[] = [];
	warnings: CompilerError[] = [];

	constructor(scanner: Scanner) {
		this.scanner = scanner;
	}

	addError(msg: string, pos: Position) {
		this.errors.push(new CompilerError(msg, pos, false));
		console.log('@' + pos.toString() + ' : ' + msg);
	}

	addWarning(msg: string, pos: Position) {
		this.warnings.push(new CompilerError(msg, pos, true));
		console.log('@' + pos.toString() + ' : ' + msg);
	}

	/**
	 * binary operation precedence
	 * @private
	 */
	private opPrec: Map<Op, number> = new Map([
		[Op.Assign, 2],
		[Op.PlusAssign, 2],
		[Op.MinusAssign, 2],
		[Op.MultiplyAssign, 2],
		[Op.DivideAssign, 2],
		[Op.ModulusAssign, 2],
		[Op.BitAndAssign, 2],
		[Op.BitOrAssign, 2],
		[Op.BitXorAssign, 2],
		[Op.LeftShiftArithmeticAssign, 2],
		[Op.RightShiftArithmeticAssign, 2],
		[Op.RightShiftLogicalAssign, 2],
		[Op.Or, 4],
		[Op.And, 5],
		[Op.BitOr, 6],
		[Op.BitXOr, 7],
		[Op.BitAnd, 8],
		[Op.EQ, 9],
		[Op.IdentityEquals, 9],
		[Op.NE, 9],
		[Op.IdentityNotEquals, 9],
		[Op.G, 10],
		[Op.GE, 10],
		[Op.L, 10],
		[Op.LE, 10],
		[Op.LeftShiftArithmetic, 11],
		[Op.RightShiftArithmetic, 11],
		[Op.RightShiftLogical, 11],
		[Op.Plus, 12],
		[Op.Minus, 12],
		[Op.Divide, 13],
		[Op.Multiply, 13],
		[Op.Modulus, 13]
	]);

	private getPrec(op: Op): number {
		const ret = this.opPrec.get(op);
		if (typeof ret === 'undefined') {
			return -1;
		} else {
			return ret;
		}
	}

	/**
	 * skip Token，recovery from errors to continue parse Token
	 * @param separators
	 */
	private skip(separators: string[] = []) {
		// console.log("in skip()");
		let t = this.scanner.peek();
		while (t.kind !== TokenKind.EOF) {
			if (t.kind === TokenKind.Keyword) {
				return;
			} else if (
				t.kind === TokenKind.Seperator &&
				(t.text === ',' ||
					t.text === ';' ||
					t.text === '{' ||
					t.text === '}' ||
					t.text === '(' ||
					t.text === ')' ||
					separators.indexOf(t.text) !== -1)
			) {
				return;
			} else {
				this.scanner.next();
				t = this.scanner.peek();
			}
		}
	}

	private parseType(typeName: string): Type {
		switch (typeName) {
			case 'any':
				return SysTypes.Any;
			case 'number':
				return SysTypes.Number;
			case 'boolean':
				return SysTypes.Boolean;
			case 'string':
				return SysTypes.String;
			case 'undefined':
				return SysTypes.Undefined;
			case 'null':
				return SysTypes.Null;
			case 'void':
				return SysTypes.Undefined;
			default:
				this.addError(
					'Unrecognized type: ' + typeName,
					this.scanner.getLastPos()
				);
				return SysTypes.Any;
		}
	}

	////////////////////////////////////////////////////////////////////////////////////////////
	// entry of grammar analysis
	/**
	 * parse prog:
	 * prog = statementList? EOF;
	 */

	parseProg(): Prog {
		const beginPos = this.scanner.peek().pos;
		const stmts = this.parseStatementList();
		return new Prog(beginPos, this.scanner.getLastPos(), stmts);
	}

	/**
	 * statementList = statement+ ;
	 * @private
	 */
	private parseStatementList(): Statement[] {
		const token = this.scanner.peek();
		const stmts: Statement[] = [];
		while (
			token.kind !== TokenKind.EOF &&
			token.code !== Seperator.CloseBrace
		) {
			const stmt = this.parseStatement();
			stmts.push(stmt);
			this.scanner.next();
		}
		return stmts;
	}

	/**
	 * statement: (variableStatement | functionDecl | block | returnStatement | expressionStatement)+;
	 * @private
	 */
	private parseStatement(): Statement {
		const t = this.scanner.peek();
		if (t.code === Keyword.Function) {
			return this.parseFunctionDecl();
		}
		if (t.code === Keyword.Let) {
			return this.parseVariableStatement();
		}
		if (t.code === Keyword.Return) {
			return this.parseReturnStatement();
		}
		if (t.code === Seperator.OpenBrace) {
			return this.parseBlock();
		}
		if (
			t.kind === TokenKind.Identifier ||
			t.kind === TokenKind.DecimalLiteral ||
			t.kind === TokenKind.IntegerLiteral ||
			t.kind === TokenKind.StringLiteral ||
			t.code === Seperator.OpenParen
		) {
			//'('
			return this.parseExpressionStatement();
		}
		this.addError(
			'Can not recognize a statement starting with: ' +
				this.scanner.peek().text,
			this.scanner.getLastPos()
		);
		const beginPos = this.scanner.getNextPos();
		this.skip();
		return new ErrorStmt(beginPos, this.scanner.getLastPos());
	}

	/**
	 * variableStatement : 'let' variableDecl ';';
	 * variableDecl : Identifier typeAnnotation？ ('=' singleExpression)?;
	 * @private
	 */
	private parseVariableStatement(): VariableStatement {
		const beginPos = this.scanner.getNextPos();
		let isErrorNode = false;

		this.scanner.next();
		const variableDecl = this.parseVariableDecl();
		const token = this.scanner.peek();
		if (token.code === Seperator.SemiColon) {
			this.scanner.next();
		} else {
			this.skip();
			isErrorNode = true;
		}
		return new VariableStatement(
			beginPos,
			this.scanner.getLastPos(),
			variableDecl,
			isErrorNode
		);
	}

	private parseVariableDecl(): VariableDecl {
		const beginPos = this.scanner.getNextPos();
		const t = this.scanner.next();
		if (t.kind === TokenKind.Identifier) {
			const varName = t.text;
			let varType = 'any';
			let init: Expression | null = null;
			let isErrorNode = false;

			let t1 = this.scanner.peek();
			// typeAnnotation(optional)
			if (t1.code === Seperator.Colon) {
				this.scanner.next();
				t1 = this.scanner.peek();
				if (t1.kind === TokenKind.Keyword) {
					this.scanner.next();
					varType = t1.text;
				} else {
					this.addError(
						'Error parsing type annotation in VariableDecl',
						this.scanner.getLastPos()
					);
					//find next '='
					this.skip(['=']);
					isErrorNode = true;
				}
			}

			t1 = this.scanner.peek();
			// assignment (optional)
			if ((t1.code = Op.Assign)) {
				this.scanner.next();
				init = this.parseExpression();
			}

			return new VariableDecl(
				beginPos,
				this.scanner.getLastPos(),
				varName,
				this.parseType(varType),
				init,
				isErrorNode
			);
		} else {
			this.addError(
				'Expecting variable name in VariableDecl, while we meet ' +
					t.text,
				this.scanner.getLastPos()
			);
			this.skip();
			return new VariableDecl(
				beginPos,
				this.scanner.getLastPos(),
				'unknown',
				SysTypes.Any,
				null,
				true
			);
		}
	}

	private parseReturnStatement(): Statement {
		const beginPos = this.scanner.getNextPos();
		let exp: Expression | null = null;
		this.scanner.next();

		let t = this.scanner.peek();
		if (t.code !== Seperator.SemiColon) {
			exp = this.parseExpression();
		}
		t = this.scanner.peek();
		if (t.code === Seperator.SemiColon) {
			this.scanner.next();
		} else {
			this.addError(
				"Expecting ';' after return statement.",
				this.scanner.getLastPos()
			);
		}
		return new ReturnStatement(beginPos, this.scanner.getLastPos(), exp);
	}

	/**
	 * functionDecl: "function" Identifier callSignature  block ;
	 * callSignature: '(' parameterList? ')' typeAnnotation? ;
	 * parameterList : parameter (',' parameter)* ;
	 * parameter : Identifier typeAnnotation? ;
	 * block : '{' statementList? '}' ;
	 * @private
	 */
	private parseFunctionDecl(): Decl {
		const beginPos = this.scanner.getNextPos();
		const isErrorNode = false;
		this.scanner.next();
		const t = this.scanner.next();
		// identifier
		if (t.kind !== TokenKind.Identifier) {
			this.addError(
				'Expecting a function name, while we got a: ' + t.text,
				this.scanner.getLastPos()
			);
		}

		let callSignature: CallSignature;
		let t1 = this.scanner.peek();
		if (t1.code === Seperator.OpenBrace) {
			callSignature = this.parseCallSignature();
		} else {
			this.addError(
				"Expecting '(' in FunctionDecl, while we got a " + t.text,
				this.scanner.getLastPos()
			);
			this.skip();
			callSignature = new CallSignature(
				beginPos,
				this.scanner.getLastPos(),
				null,
				SysTypes.Any,
				true
			);
		}

		let functionBody: Block;
		t1 = this.scanner.peek();
		if (t1.code === Seperator.OpenBrace) {
			functionBody = this.parseBlock();
		} else {
			this.addError(
				"Expecting '{' in FunctionDecl, while we got a " + t1.text,
				this.scanner.getLastPos()
			);
			this.skip();
			functionBody = new Block(
				beginPos,
				this.scanner.getLastPos(),
				[],
				true
			);
		}

		return new FunctionDecl(
			beginPos,
			t.text,
			callSignature,
			functionBody,
			isErrorNode
		);
	}

	private parseCallSignature(): CallSignature {
		const beginPos = this.scanner.getNextPos();
		this.scanner.next(); //skip '('
		let paramList: ParameterList | null = null;
		if (this.scanner.peek().code !== Seperator.CloseBrace) {
			// ')'
			paramList = this.parseParamList();
		}
		const t = this.scanner.peek();
		if (t.code === Seperator.CloseParen) {
			// ')'
			// skip
			this.scanner.next();
			let theType = 'any';
			if (this.scanner.peek().code === Seperator.Colon) {
				theType = this.parseTypeAnnotation();
			}
			return new CallSignature(
				beginPos,
				this.scanner.getLastPos(),
				paramList,
				this.parseType(theType)
			);
		} else {
			this.addError(
				"Expecting a ')' after for a call signature",
				this.scanner.getLastPos()
			);
			return new CallSignature(
				beginPos,
				this.scanner.getLastPos(),
				paramList,
				SysTypes.Any,
				true
			);
		}
	}

	private parseParamList() {
		const params: VariableDecl[] = [];
		const beginPos = this.scanner.getNextPos();
		let isErrorNode = false;
		let t = this.scanner.peek();
		while (t.code !== Seperator.CloseParen && t.kind !== TokenKind.EOF) {
			if (t.kind === TokenKind.Identifier) {
				this.scanner.next();
				const t1 = this.scanner.peek();
				let theType = 'any';
				if (t1.code === Seperator.Colon) {
					// ':'
					theType = this.parseTypeAnnotation();
				}
				params.push(
					new VariableDecl(
						beginPos,
						this.scanner.getLastPos(),
						t.text,
						this.parseType(theType),
						null,
						isErrorNode
					)
				);

				//handle ','
				t = this.scanner.peek();
				if (t.code !== Seperator.CloseParen) {
					if (t.code === Op.Comma) {
						this.scanner.next();
						t = this.scanner.peek();
					} else {
						this.addError(
							"Expecting a ',' or '）' after a parameter",
							this.scanner.getLastPos()
						);
						this.skip();
						isErrorNode = true;
						const t2 = this.scanner.peek();
						if (t2.code === Op.Comma) {
							//','
							this.scanner.next(); //跳过','
							t = this.scanner.peek();
						} else {
							break;
						}
					}
				}
			} else {
				this.addError(
					'Expecting an identifier as name of a Parameter',
					this.scanner.getLastPos()
				);
				this.skip();
				isErrorNode = true;
				if (t.code === Op.Comma) {
					//','
					this.scanner.next(); //跳过','
					t = this.scanner.peek();
				} else {
					break;
				}
			}
		}
		return new ParameterList(
			beginPos,
			this.scanner.getLastPos(),
			params,
			isErrorNode
		);
	}

	private parseTypeAnnotation(): string {
		let theType = 'any';
		//跳过:
		this.scanner.next();

		const t = this.scanner.peek();
		if (t.kind === TokenKind.Keyword) {
			this.scanner.next();
			theType = t.text;
		} else {
			this.addError(
				'Expecting a type name in type annotation',
				this.scanner.getLastPos()
			);
		}

		return theType;
	}

	private parseBlock(): Block {
		const beginPos = this.scanner.getNextPos();
		this.scanner.next();
		const stmts = this.parseStatementList();
		const t = this.scanner.peek();
		if (t.code === Seperator.CloseBrace) {
			this.scanner.next();
			return new Block(beginPos, this.scanner.getLastPos(), stmts);
		} else {
			this.addError(
				"Expecting '}' while parsing a block, but we got a " + t.text,
				this.scanner.getLastPos()
			);
			this.skip();
			return new Block(beginPos, this.scanner.getLastPos(), stmts, true);
		}
	}

	/**
	 * expressionStatement: expression ';' ;
	 * expression: assignment;
	 * assignment: binary (assignmentOp binary)* ;
	 * binary: unary (binOp unary)* ;
	 * unary: primary | prefixOp unary | primary suffixOp ;
	 * primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
	 * assignmentOp = '=' | '+=' | '-=' | '*=' | '/=' | '>>=' | '<<=' | '>>>=' | '^=' | '|=' ;
	 * binOp: '+' | '-' | '*' | '/' | '==' | '!=' | '<=' | '>=' | '<'
	 *      | '>' | '&&'| '||'|...;
	 * prefixOp = '+' | '-' | '++' | '--' | '!' | '~';
	 * suffixOp = '++' | '--';
	 * @private
	 */
	private parseExpressionStatement(): ExpressionStatement {
		const exp = this.parseExpression();
		const t = this.scanner.peek();
		const stmt = new ExpressionStatement(this.scanner.getLastPos(), exp);
		if (t.code === Seperator.SemiColon) {
			this.scanner.next();
		} else {
			this.addError(
				'Expecting a semicolon at the end of an expression statement, while we got a ' +
					t.text,
				this.scanner.getLastPos()
			);
			this.skip();
			stmt.endPos = this.scanner.getLastPos();
			stmt.isErrorNode = true;
		}
		return stmt;
	}

	private parseExpression(): Expression {
		return this.parseAssignment();
	}

	// value of assignment expression is the value of the right-side operand
	private parseAssignment(): Expression {
		const assignPrec = this.getPrec(Op.Assign);
		let exp1 = this.parseBinary(assignPrec);
		let t = this.scanner.peek();
		let tprec = this.getPrec(t.code as Op);
		const expStack: Expression[] = [];
		expStack.push(exp1);
		const opStack: Op[] = [];
		while (t.kind === TokenKind.Operator && tprec === assignPrec) {
			opStack.push(t.code as Op);
			this.scanner.next();
			exp1 = this.parseBinary(assignPrec);
			expStack.push(exp1);
			t = this.scanner.peek();
			tprec = this.getPrec(t.code as Op);
		}
		exp1 = expStack[expStack.length - 1];
		if (opStack.length > 0) {
			for (let i = expStack.length - 2; i >= 0; i--) {
				exp1 = new Binary(opStack[i], expStack[i], exp1);
			}
		}
		return exp1;
	}

	private parseBinary(prec: number): Expression {
		let exp1 = this.parseUnary();
		let t = this.scanner.peek();
		let tprec = this.getPrec(t.code as Op);
		//下面这个循环的意思是：只要右边出现的新运算符的优先级更高，
		//那么就把右边出现的作为右子节点。
		/**
		 * 对于2+3*5
		 * 第一次循环，遇到+号，优先级大于零，所以做一次递归的parseBinary
		 * 在递归的binary中，遇到乘号，优先级大于+号，所以形成3*5返回，又变成上一级的右子节点。
		 *
		 * 反过来，如果是3*5+2
		 * 第一次循环还是一样，遇到*号，做一次递归的parseBinary
		 * 在递归中，新的运算符的优先级要小，所以只返回一个5，跟前一个节点形成3*5,成为新的左子节点。
		 * 接着做第二次循环，遇到+号，返回5，并作为右子节点，跟3*5一起组成一个新的binary返回。
		 */

		while (t.kind === TokenKind.Operator && tprec > prec) {
			this.scanner.next();
			const exp2 = this.parseBinary(tprec);
			exp1 = new Binary(t.code as Op, exp1, exp2);
			t = this.scanner.peek();
			tprec = this.getPrec(t.code as Op);
		}
		return exp1;
	}

	private parseUnary(): Expression {
		const beginPos = this.scanner.getNextPos();
		const t = this.scanner.peek();

		//unary prefix expression
		if (t.kind === TokenKind.Operator) {
			this.scanner.next();
			const exp = this.parseUnary();
			return new Unary(
				beginPos,
				this.scanner.getLastPos(),
				t.code as Op,
				exp,
				true
			);
		} else {
			//must be ++ --
			const exp = this.parsePrimary();
			const t1 = this.scanner.peek();
			if (
				t1.kind === TokenKind.Operator &&
				(t1.code === Op.Inc || t1.code === Op.Dec)
			) {
				this.scanner.next();
				return new Unary(
					beginPos,
					this.scanner.getLastPos(),
					t1.code as Op,
					exp,
					false
				);
			} else {
				return exp;
			}
		}
	}

	private parsePrimary(): Expression {
		const beginPos = this.scanner.getNextPos();
		const t = this.scanner.peek();

		if (t.kind === TokenKind.Identifier) {
			if (this.scanner.peek2().code === Seperator.OpenParen) {
				return this.parseFunctionCall();
			} else {
				this.scanner.next();
				return new Variable(
					beginPos,
					this.scanner.getLastPos(),
					t.text
				);
			}
		} else if (t.kind === TokenKind.IntegerLiteral) {
			this.scanner.next();
			return new IntegerLiteral(beginPos, parseInt(t.text));
		} else if (t.kind === TokenKind.DecimalLiteral) {
			this.scanner.next();
			return new DecimalLiteral(beginPos, parseFloat(t.text));
		} else if (t.kind === TokenKind.StringLiteral) {
			this.scanner.next();
			return new StringLiteral(beginPos, t.text);
		} else if (t.code === Seperator.OpenParen) {
			this.scanner.next();
			const exp = this.parseExpression();
			const t1 = this.scanner.peek();
			if (t1.code === Seperator.CloseParen) {
				this.scanner.next();
			} else {
				this.addError(
					"Expecting a ')' at the end of a primary expression, while we got a " +
						t.text,
					this.scanner.getLastPos()
				);
				this.skip();
			}
			return exp;
		} else {
			//理论上永远不会到达这里
			this.addError(
				'Can not recognize a primary expression starting with: ' +
					t.text,
				this.scanner.getLastPos()
			);
			return new ErrorExp(beginPos, this.scanner.getLastPos());
		}
	}

	/**
	 * functionCall : Identifier '(' parameterList? ')' ;
	 * parameterList : StringLiteral (',' StringLiteral)* ;
	 */
	private parseFunctionCall(): Expression {
		const beginPos = this.scanner.getNextPos();
		const params: Expression[] = [];
		const name = this.scanner.next().text;

		//skip '('
		this.scanner.next();
		let t1 = this.scanner.peek();
		while (t1.code !== Seperator.CloseParen && t1.kind !== TokenKind.EOF) {
			const exp = this.parseExpression();
			params.push(exp);

			if (exp?.isErrorNode) {
				this.addError(
					'Error parsing parameter for function call ' + name,
					this.scanner.getLastPos()
				);
			}

			t1 = this.scanner.peek();
			if (t1.code !== Seperator.CloseParen) {
				if (t1.code === Op.Comma) {
					t1 = this.scanner.next();
				} else {
					this.addError(
						'Expecting a comma at the end of a parameter, while we got a ' +
							t1.text,
						this.scanner.getLastPos()
					);
					this.skip();
					return new FunctionCall(
						beginPos,
						this.scanner.getLastPos(),
						name,
						params,
						true
					);
				}
			}
		}

		if (t1.code === Seperator.CloseParen) {
			this.scanner.next();
		}
		return new FunctionCall(
			beginPos,
			this.scanner.getLastPos(),
			name,
			params
		);
	}
}
