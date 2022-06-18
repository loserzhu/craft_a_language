/**
 * Lexical Analysis: recognize tokens
 * unsupported features:
 * 1. unicode
 * 2. 0x 0o 0b
 * 3. escape sequence
 * 4. strings wrapped within ""
 */

export enum TokenKind {
	Keyword,
	Identifier,
	StringLiteral,
	IntegerLiteral,
	DecimalLiteral,
	Seperator,
	Operator,
	EOF
}

// prettier-ignore
export enum Seperator{
    OpenBracket = 0,                    //[
    CloseBracket,                   //]
    OpenParen,                      //(
    CloseParen,                     //)
    OpenBrace,                      //{
    CloseBrace,                     //}
    Colon,                          //:
    SemiColon,                      //;
}

// prettier-ignore
export enum Op{
    QuestionMark = 100,                   //?
    Ellipsis,                       //...
    Dot,                            //.
    Comma,                          //,
    At,                             //@

    RightShiftArithmetic,           //>>
    LeftShiftArithmetic,            //<<
    RightShiftLogical,              //>>>
    IdentityEquals,                 //===
    IdentityNotEquals,              //!==

    BitNot,                         //~
    BitAnd,                         //&
    BitXOr,                         //^
    BitOr,                          //|

    Not,                            //!
    And,                            //&&
    Or,                             //||

    Assign,                         //=
    MultiplyAssign,                 //*=
    DivideAssign,                   ///=
    ModulusAssign,                  //%=
    PlusAssign,                     //+=
    MinusAssign,                    //-=
    LeftShiftArithmeticAssign,      //<<=
    RightShiftArithmeticAssign,     //>>=
    RightShiftLogicalAssign,        //>>>=
    BitAndAssign,                   //&=
    BitXorAssign,                   //^=
    BitOrAssign,                    //|=

    ARROW,                          //=>

    Inc,                            //++
    Dec,                            //--

    Plus,                           //+
    Minus,                          //-
    Multiply,                       //*
    Divide,                         ///
    Modulus,                        //%

    EQ,                             //==
    NE,                             //!=
    G,                              //>
    GE,                             //>=
    L,                              //<
    LE,                             //<=
}

export enum Keyword {
	Function = 200,
	Class,
	Break,
	Delete,
	Return,
	Case,
	Do,
	If,
	Switch,
	Var,
	Catch,
	Else,
	In,
	This,
	Void,
	Continue,
	False,
	Instanceof,
	Throw,
	While,
	Debugger,
	Finally,
	New,
	True,
	With,
	Default,
	For,
	Null,
	Try,
	Typeof,
	Implements,
	Let,
	Private,
	Public,
	Yield,
	Interface,
	Package,
	Protected,
	Static,
	Any,
	String,
	Number,
	Boolean,
	Symbol,
	Undefined
}

/**
 * token data structure
 */
export class Token {
	kind: TokenKind;
	code: Op | Seperator | Keyword | null;
	text: string;
	pos: Position;
	constructor(
		kind: TokenKind,
		text: string,
		pos: Position,
		code: Op | Seperator | Keyword | null = null
	) {
		this.kind = kind;
		this.code = code;
		this.text = text;
		this.pos = pos;
	}
	toString(): string {
		return (
			'Token' +
			'@' +
			this.pos.toString() +
			'\t' +
			TokenKind[this.kind] +
			" \t'" +
			this.text +
			"'"
		);
	}
}

/**
 * position of Token(AST) in the source code, for debug.
 */
export class Position {
	begin: number;
	end: number;
	line: number;
	col: number;
	constructor(begin: number, end: number, line: number, col: number) {
		this.begin = begin;
		this.end = end;
		this.line = line;
		this.col = col;
	}

	toString(): string {
		return (
			'(ln:' +
			this.line +
			', col:' +
			this.col +
			', pos:' +
			this.begin +
			')'
		);
	}
}

/**
 * char stream. operations:
 * peek(): peek next char.
 * next(): read next char then move pointer.
 * eof(): is EOF char.
 */
export class CharStream {
	data: string;
	pos = 0;
	line = 1;
	col = 1;
	constructor(data: string) {
		this.data = data;
	}

	peek() {
		return this.data.charAt(this.pos);
	}

	next() {
		const ch = this.data.charAt(this.pos++);
		if (ch === '\n') {
			this.line++;
			this.col = 1;
		} else {
			this.col++;
		}
		return ch;
	}

	eof() {
		return this.peek() === '';
	}

	getPosition(): Position {
		return new Position(this.pos + 1, this.pos + 1, this.line, this.col);
	}
}

/**
 * lexical scanner: accept a char stream and identify the lexical elements(or tokens) by demand.
 * operations:
 * next(): pop current token from the buffer.
 * peek(): return current token from in the buffer. LL(1)
 * peek2(): return the next token from in the buffer. LL(2)
 */
export class Scanner {
	stream: CharStream;
	tokens: Token[] = [];

	private lastPos: Position = new Position(0, 0, 0, 0);

	// prettier-ignore
	private KeywordMap: Map<string, Keyword> = new Map([
        ["function", Keyword.Function],
        ["class", Keyword.Class],
        ["break", Keyword.Break],
        ["delete", Keyword.Delete],
        ["return", Keyword.Return],
        ["case", Keyword.Case],
        ["do", Keyword.Do],
        ["if", Keyword.If],
        ["switch", Keyword.Switch],
        ["var", Keyword.Var],
        ["catch", Keyword.Catch],
        ["else", Keyword.Else],
        ["in", Keyword.In],
        ["this", Keyword.This],
        ["void", Keyword.Void],
        ["continue", Keyword.Continue],
        ["false", Keyword.False],
        ["instanceof", Keyword.Instanceof],
        ["throw", Keyword.Throw],
        ["while", Keyword.While],
        ["debugger", Keyword.Debugger],
        ["finally", Keyword.Finally],
        ["new", Keyword.New],
        ["true", Keyword.True],
        ["with", Keyword.With],
        ["default", Keyword.Default],
        ["for", Keyword.For],
        ["null", Keyword.Null],
        ["try", Keyword.Try],
        ["typeof", Keyword.Typeof],

        ["implements", Keyword.Implements],
        ["let", Keyword.Let],
        ["private", Keyword.Private],
        ["public", Keyword.Public],
        ["yield", Keyword.Yield],
        ["interface", Keyword.Interface],
        ["package", Keyword.Package],
        ["protected", Keyword.Protected],
        ["static", Keyword.Static],

        ["number", Keyword.Number],
        ["string", Keyword.String],
        ["boolean", Keyword.Boolean],
        ["any", Keyword.Any],
        ["symbol", Keyword.Symbol],
        //值
        ["undefined", Keyword.Undefined],
    ]);

	constructor(stream: CharStream) {
		this.stream = stream;
	}

	next() {
		let t = this.tokens.shift();
		if (typeof t === 'undefined') {
			t = this.getAToken();
		}

		this.lastPos = t?.pos;
		return t;
	}

	peek() {
		let t = this.tokens[0];
		while (typeof t === 'undefined') {
			t = this.getAToken();
			this.tokens.push(t);
		}
		return t;
	}

	peek2() {
		let t = this.tokens[1];
		while (typeof t === 'undefined') {
			this.tokens.push(this.getAToken());
			t = this.tokens[1];
		}
		return t;
	}

	getNextPos() {
		return this.peek().pos;
	}

	getLastPos() {
		return this.lastPos;
	}

	private getAToken(): Token {
		this.skipWhiteSpace();
		const pos = this.stream.getPosition();
		if (this.stream.eof()) {
			return new Token(TokenKind.EOF, 'EOF', pos);
		} else {
			let ch = this.stream.peek();
			if (this.isLetter(ch) || ch === '_') {
				return this.parseIdentifier();
			} else if (ch === '"') {
				return this.parseStringLiteral();
			} else if (ch === '(') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.OpenParen
				);
			} else if (ch === ')') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.CloseParen
				);
			} else if (ch === '{') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.OpenBrace
				);
			} else if (ch === '}') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.CloseBrace
				);
			} else if (ch === '[') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.OpenBracket
				);
			} else if (ch === ']') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.CloseBracket
				);
			} else if (ch === ':') {
				this.stream.next();
				return new Token(TokenKind.Seperator, ch, pos, Seperator.Colon);
			} else if (ch === ';') {
				this.stream.next();
				return new Token(
					TokenKind.Seperator,
					ch,
					pos,
					Seperator.SemiColon
				);
			} else if (ch === ',') {
				this.stream.next();
				return new Token(TokenKind.Seperator, ch, pos, Op.Comma);
			} else if (ch === '?') {
				this.stream.next();
				return new Token(TokenKind.Seperator, ch, pos, Op.QuestionMark);
			} else if (ch === '@') {
				this.stream.next();
				return new Token(TokenKind.Seperator, ch, pos, Op.At);
			} else if (this.isDigit(ch)) {
				this.stream.next();
				let ch1 = this.stream.peek();
				let literal = '';
				if (ch === '0') {
					if (!(ch1 >= '1' && ch1 <= '9')) {
						literal = '0';
					} else {
						console.log(
							'0 cannot be followed by other digit now, at line: ' +
								this.stream.line +
								' col: ' +
								this.stream.col
						);
						//skip this char
						this.stream.next();
						return this.getAToken();
					}
				} else if (ch >= '1' && ch <= '9') {
					literal += ch;
					while (this.isDigit(ch1)) {
						ch = this.stream.next();
						literal += ch;
						ch1 = this.stream.peek();
					}
				}

				if (ch1 === '.') {
					literal += '.';
					this.stream.next();
					ch1 = this.stream.peek();
					while (this.isDigit(ch1)) {
						ch = this.stream.next();
						literal += ch;
						ch1 = this.stream.peek();
					}
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.DecimalLiteral, literal, pos);
				} else {
					return new Token(TokenKind.IntegerLiteral, literal, pos);
				}
			} else if (ch === '.') {
				this.stream.next();
				let ch1 = this.stream.peek();
				let literal = '.';
				if (this.isDigit(ch1)) {
					while (this.isDigit(ch1)) {
						ch = this.stream.next();
						literal += ch;
						ch1 = this.stream.peek();
					}
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.DecimalLiteral, literal, pos);
				} else if (ch1 === '.') {
					this.stream.next();
					ch1 = this.stream.peek();
					if (ch1 === '.') {
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Seperator,
							'...',
							pos,
							Op.Ellipsis
						);
					} else {
						console.log('Unrecognized pattern: .., missed a , ?');
						return this.getAToken();
					}
				} else {
					return new Token(TokenKind.Operator, '.', pos, Op.Dot);
				}
			} else if (ch === '/') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '*') {
					this.skipMultipleLineComments();
					return this.getAToken();
				} else if (ch1 === '/') {
					this.skipSingleLineComment();
					return this.getAToken();
				} else if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'/=',
						pos,
						Op.DivideAssign
					);
				} else {
					return new Token(TokenKind.Operator, '/', pos, Op.Divide);
				}
			} else if (ch === '+') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '+') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '++', pos, Op.Inc);
				} else if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'+=',
						pos,
						Op.PlusAssign
					);
				} else {
					return new Token(TokenKind.Operator, '+', pos, Op.Plus);
				}
			} else if (ch === '-') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '-') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '--', pos, Op.Dec);
				} else if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'-=',
						pos,
						Op.MinusAssign
					);
				} else {
					return new Token(TokenKind.Operator, '-', pos, Op.Minus);
				}
			} else if (ch === '*') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'*=',
						pos,
						Op.MultiplyAssign
					);
				} else {
					return new Token(TokenKind.Operator, '*', pos, Op.Multiply);
				}
			} else if (ch === '%') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'%=',
						pos,
						Op.ModulusAssign
					);
				} else {
					return new Token(TokenKind.Operator, '%', pos, Op.Modulus);
				}
			} else if (ch === '>') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '>=', pos, Op.GE);
				} else if (ch1 === '>') {
					this.stream.next();
					let ch1 = this.stream.peek();
					if (ch1 === '>') {
						this.stream.next();
						ch1 = this.stream.peek();
						if (ch1 === '=') {
							this.stream.next();
							pos.end = this.stream.pos + 1;
							return new Token(
								TokenKind.Operator,
								'>>>=',
								pos,
								Op.RightShiftLogicalAssign
							);
						} else {
							pos.end = this.stream.pos + 1;
							return new Token(
								TokenKind.Operator,
								'>>>',
								pos,
								Op.RightShiftLogical
							);
						}
					} else if (ch1 === '=') {
						this.stream.next();
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Operator,
							'>>=',
							pos,
							Op.LeftShiftArithmeticAssign
						);
					} else {
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Operator,
							'>>',
							pos,
							Op.RightShiftArithmetic
						);
					}
				} else {
					return new Token(TokenKind.Operator, '>', pos, Op.G);
				}
			} else if (ch === '<') {
				this.stream.next();
				let ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '<=', pos, Op.LE);
				} else if (ch1 === '<') {
					this.stream.next();
					ch1 = this.stream.peek();
					if (ch1 === '=') {
						this.stream.next();
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Operator,
							'<<=',
							pos,
							Op.LeftShiftArithmeticAssign
						);
					} else {
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Operator,
							'<<',
							pos,
							Op.LeftShiftArithmetic
						);
					}
				} else {
					return new Token(TokenKind.Operator, '<', pos, Op.L);
				}
			} else if (ch === '=') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					const ch1 = this.stream.peek();
					if (ch1 === '=') {
						this.stream.next();
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Operator,
							'===',
							pos,
							Op.IdentityEquals
						);
					} else {
						pos.end = this.stream.pos + 1;
						return new Token(TokenKind.Operator, '==', pos, Op.EQ);
					}
				}
				//箭头=>
				else if (ch1 === '>') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '=>', pos, Op.ARROW);
				} else {
					return new Token(TokenKind.Operator, '=', pos, Op.Assign);
				}
			} else if (ch === '!') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					const ch1 = this.stream.peek();
					if (ch1 === '=') {
						this.stream.next();
						pos.end = this.stream.pos + 1;
						return new Token(
							TokenKind.Operator,
							'!==',
							pos,
							Op.IdentityNotEquals
						);
					} else {
						pos.end = this.stream.pos + 1;
						return new Token(TokenKind.Operator, '!=', pos, Op.NE);
					}
				} else {
					return new Token(TokenKind.Operator, '!', pos, Op.Not);
				}
			} else if (ch === '|') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '|') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '||', pos, Op.Or);
				} else if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'|=',
						pos,
						Op.BitOrAssign
					);
				} else {
					return new Token(TokenKind.Operator, '|', pos, Op.BitOr);
				}
			} else if (ch === '&') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '&') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(TokenKind.Operator, '&&', pos, Op.And);
				} else if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'&=',
						pos,
						Op.BitAndAssign
					);
				} else {
					return new Token(TokenKind.Operator, '&', pos, Op.BitAnd);
				}
			} else if (ch === '^') {
				this.stream.next();
				const ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					pos.end = this.stream.pos + 1;
					return new Token(
						TokenKind.Operator,
						'^=',
						pos,
						Op.BitXorAssign
					);
				} else {
					return new Token(TokenKind.Operator, '^', pos, Op.BitXOr);
				}
			} else if (ch === '~') {
				this.stream.next();
				return new Token(TokenKind.Operator, '~', pos, Op.BitNot);
			} else {
				//chars we do not support yet.
				console.log(
					"Unrecognized pattern meeting ': " +
						ch +
						"', at ln:" +
						this.stream.line +
						' col: ' +
						this.stream.col
				);
				this.stream.next();
				return this.getAToken();
			}
		}
	}

	private skipSingleLineComment() {
		this.stream.next();
		while (this.stream.peek() !== '\n' && !this.stream.eof()) {
			this.stream.next();
		}
	}

	private skipMultipleLineComments() {
		this.stream.next();
		if (!this.stream.eof()) {
			let ch1 = this.stream.next();
			while (!this.stream.eof()) {
				const ch2 = this.stream.next();
				if (ch1 === '*' && ch2 === '/') {
					return;
				}
				ch1 = ch2;
			}
		}
		console.log(
			"Failed to find matching */ for multiple line comments at ': " +
				this.stream.line +
				' col: ' +
				this.stream.col
		);
	}

	private parseIdentifier(): Token {
		const pos = this.stream.getPosition();
		const token = new Token(TokenKind.Identifier, '', pos);

		token.text += this.stream.next();

		//read chars
		while (
			!this.stream.eof() &&
			this.isLetterDigitOrUnderScore(this.stream.peek())
		) {
			token.text += this.stream.next();
		}

		pos.end = this.stream.pos + 1;

		//recognize keywords
		if (this.KeywordMap.has(token.text)) {
			token.kind = TokenKind.Keyword;
			token.code = this.KeywordMap.get(token.text) as Keyword;
		}

		return token;
	}

	private parseStringLiteral(): Token {
		const pos = this.stream.getPosition();
		const token = new Token(TokenKind.StringLiteral, '', pos);
		this.stream.next();
		while (!this.stream.eof() && this.stream.peek() !== '"') {
			token.text += this.stream.next();
		}

		if (this.stream.peek() === '"') {
			this.stream.next();
		} else {
			console.log(
				'Expecting an " at line: ' +
					this.stream.line +
					' col: ' +
					this.stream.col
			);
		}
		pos.end = this.stream.pos + 1;
		return token;
	}

	private skipWhiteSpace() {
		while (this.isWhiteSpace(this.stream.peek())) {
			this.stream.next();
		}
	}

	private isLetterDigitOrUnderScore(ch: string): boolean {
		return (
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= 'a' && ch <= 'z') ||
			(ch >= '0' && ch <= '9') ||
			ch === '_'
		);
	}

	private isLetter(ch: string): boolean {
		return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z');
	}

	private isDigit(ch: string): boolean {
		return ch >= '0' && ch <= '9';
	}

	private isWhiteSpace(ch: string): boolean {
		return ch === ' ' || ch === '\n' || ch === '\t';
	}
}

export class Operators {
	static isAssignOp(op: Op): boolean {
		return op >= Op.Assign && op <= Op.BitOrAssign;
	}

	static isRelationOp(op: Op): boolean {
		return op >= Op.EQ && op <= Op.LE;
	}

	static isArithmeticOp(op: Op): boolean {
		return op >= Op.Plus && op <= Op.Modulus;
	}

	static isLogicalOp(op: Op): boolean {
		return op >= Op.Not && op <= Op.Or;
	}
}
