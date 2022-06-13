/**
 * simple tokenizer
 * unimplemented features:
 * 1.Unicode variable
 * 2.Ob 0o 0x
 * 3.escape sequence
 * 4.strings wrapped within single quotation mark
 */

export enum TokenKind {
	Keyword,
	Identifier,
	StringLiteral,
	IntegerLiteral,
	DecimalLiteral,
	NullLiteral,
	BooleanLiteral,
	Seperator,
	Operator,
	EOF
}

// token data structure
export interface Token {
	kind: TokenKind;
	text: string;
}

/**
 * char stream. operations:
 * peek(): peek next char.
 * next(): read next char, move pointer.
 * eof(): is EOF char.
 */

export class CharStream {
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
		if (ch === '\n') {
			this.line++;
			this.col = 0;
		} else {
			this.col++;
		}
		return ch;
	}
	eof() {
		return this.peek() === '';
	}
}

/**
 * tokenizer
 * accept a char stream and produce tokens. available operation:
 * next(): return current token, step into next one.
 * peek(): return current token without moving pointer.
 * peek2(): return the next token without moving pointer;
 */
export class Scanner {
	tokens: Token[] = [];
	stream: CharStream;
	private static KeyWords = new Set([
		'function',
		'class',
		'break',
		'delete',
		'return',
		'case',
		'do',
		'if',
		'switch',
		'var',
		'catch',
		'else',
		'in',
		'this',
		'void',
		'continue',
		'false',
		'instanceof',
		'throw',
		'while',
		'debugger',
		'finally',
		'new',
		'true',
		'with',
		'default',
		'for',
		'null',
		'try',
		'typeof',
		//strict mode
		'implements',
		'let',
		'private',
		'public',
		'yield',
		'interface',
		'package',
		'protected',
		'static'
	]);

	constructor(stream: CharStream) {
		this.stream = stream;
	}

	next() {
		const t = this.tokens.shift();
		if (typeof t === 'undefined') {
			return this.getAToken();
		}
		return t;
	}

	peek() {
		let t: Token | undefined = this.tokens[0];
		if (typeof t === 'undefined') {
			t = this.getAToken();
			this.tokens.push(t);
		}
		return t;
	}
	peek2() {
		let t: Token | undefined = this.tokens[1];
		while (typeof t === 'undefined') {
			this.tokens.push(this.getAToken());
			t = this.tokens[1];
		}
		return t;
	}

	private getAToken(): Token {
		this.skipWhiteSpace();
		if (this.stream.eof()) {
			return {kind: TokenKind.EOF, text: ''};
		}
		let ch = this.stream.peek();
		if (this.isLetter(ch) || ch === '_') {
			return this.parseIdentifer();
		} else if (ch === '"') {
			return this.parseStringLiteral();
		} else if (
			['(', ')', '{', '}', '[', ']', ',', ';', ':', '?', '@'].includes(ch)
		) {
			this.stream.next();
			return {kind: TokenKind.Seperator, text: ch};
		}
		//DecimalLiteral
		// DecimalLiteral: IntegerLiteral '.' [0-9]*
		//   | '.' [0-9]+
		//   | IntegerLiteral
		//   ;
		// IntegerLiteral: '0' | [1-9] [0-9]* ;
		else if (this.isDigit(ch)) {
			this.stream.next();
			let ch1 = this.stream.peek();
			let literal = '';
			if (ch === '0') {
				// 0x 0o 0b not support yet
				if (!(ch1 >= '1' && ch1 <= '9')) {
					literal = '0';
				} else {
					console.log(
						'0 cannot be followed by other digit now, at line: ' +
							this.stream.line +
							' col: ' +
							this.stream.col
					);
					//暂时先跳过去
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

			// handle decimal point
			if (ch1 === '.') {
				literal += '.';
				this.stream.next();
				ch1 = this.stream.peek();
				while (this.isDigit(ch1)) {
					ch = this.stream.next();
					literal += ch;
					ch1 = this.stream.peek();
				}
				return {kind: TokenKind.DecimalLiteral, text: literal};
			}
			return {kind: TokenKind.IntegerLiteral, text: literal};
		} else if (ch === '.') {
			this.stream.next();
			let ch1 = this.stream.peek();
			if (this.isDigit(ch1)) {
				let literal = '.';
				while (this.isDigit(ch1)) {
					ch = this.stream.next();
					literal += ch;
					ch1 = this.stream.peek();
				}
				return {kind: TokenKind.DecimalLiteral, text: literal};
			} else if (ch1 === '.') {
				this.stream.next();
				ch1 = this.stream.peek();
				if (ch1 === '.') {
					return {kind: TokenKind.Seperator, text: '...'};
				} else {
					console.log('Unrecognized pattern : .., missed a . ?');
					return this.getAToken();
				}
			} else {
				return {kind: TokenKind.Seperator, text: '.'};
			}
		} else if (ch === '/') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '*') {
				this.skipMultiLineComments();
				return this.getAToken();
			} else if (ch1 === '/') {
				this.skipSingleLineComment();
				return this.getAToken();
			} else if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '/='};
			} else {
				return {kind: TokenKind.Operator, text: '/'};
			}
		} else if (ch === '+') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '+') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '++'};
			} else if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '+='};
			} else {
				return {kind: TokenKind.Operator, text: '+'};
			}
		} else if (ch === '-') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '-') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '--'};
			} else if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '-='};
			} else {
				return {kind: TokenKind.Operator, text: '-'};
			}
		} else if (ch === '*') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '*='};
			} else {
				return {kind: TokenKind.Operator, text: '*'};
			}
		} else if (ch === '%') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '%='};
			} else {
				return {kind: TokenKind.Operator, text: '%'};
			}
		} else if (ch === '>') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '>='};
			} else if (ch1 === '>') {
				this.stream.next();
				let ch1 = this.stream.peek();
				if (ch1 === '>') {
					this.stream.next();
					ch1 = this.stream.peek();
					if (ch1 === '=') {
						this.stream.next();
						return {kind: TokenKind.Operator, text: '>>>='};
					} else {
						return {kind: TokenKind.Operator, text: '>>>'};
					}
				} else if (ch1 === '=') {
					this.stream.next();
					return {kind: TokenKind.Operator, text: '>>='};
				} else {
					return {kind: TokenKind.Operator, text: '>>'};
				}
			} else {
				return {kind: TokenKind.Operator, text: '>'};
			}
		} else if (ch === '<') {
			this.stream.next();
			let ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '<='};
			} else if (ch1 === '<') {
				this.stream.next();
				ch1 = this.stream.peek();
				if (ch1 === '=') {
					this.stream.next();
					return {kind: TokenKind.Operator, text: '<<='};
				} else {
					return {kind: TokenKind.Operator, text: '<<'};
				}
			} else {
				return {kind: TokenKind.Operator, text: '<'};
			}
		} else if (ch === '=') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				let ch1 = this.stream.peek();
				if ((ch1 = '=')) {
					this.stream.next();
					return {kind: TokenKind.Operator, text: '==='};
				} else {
					return {kind: TokenKind.Operator, text: '=='};
				}
			}
			//=>
			else if (ch1 === '>') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '=>'};
			} else {
				return {kind: TokenKind.Operator, text: '='};
			}
		} else if (ch === '!') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				let ch1 = this.stream.peek();
				if ((ch1 = '=')) {
					this.stream.next();
					return {kind: TokenKind.Operator, text: '!=='};
				} else {
					return {kind: TokenKind.Operator, text: '!='};
				}
			} else {
				return {kind: TokenKind.Operator, text: '!'};
			}
		} else if (ch === '|') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '|') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '||'};
			} else if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '|='};
			} else {
				return {kind: TokenKind.Operator, text: '|'};
			}
		} else if (ch === '&') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '&') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '&&'};
			} else if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '&='};
			} else {
				return {kind: TokenKind.Operator, text: '&'};
			}
		} else if (ch === '^') {
			this.stream.next();
			const ch1 = this.stream.peek();
			if (ch1 === '=') {
				this.stream.next();
				return {kind: TokenKind.Operator, text: '^='};
			} else {
				return {kind: TokenKind.Operator, text: '^'};
			}
		} else if (ch === '~') {
			this.stream.next();
			return {kind: TokenKind.Operator, text: ch};
		} else {
			//drop unimplemented char
			console.log(
				'Unrecognized pattern meeting : ' +
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

	private parseStringLiteral(): Token {
		const token: Token = {kind: TokenKind.StringLiteral, text: ''};
		this.stream.next();

		while (!this.stream.eof() && this.stream.peek() !== '"') {
			token.text += this.stream.next();
		}

		if (this.stream.peek() === '"') {
			this.stream.next();
		} else {
			throw new Error(
				'Expecting an " at line: ' +
					this.stream.line +
					' col: ' +
					this.stream.col
			);
		}

		return token;
	}

	private parseIdentifer(): Token {
		const token: Token = {kind: TokenKind.Identifier, text: ''};
		token.text += this.stream.next();
		while (
			!this.stream.eof() &&
			this.isLetterDigitorUnderScore(this.stream.peek())
		) {
			token.text += this.stream.next();
		}
		if (Scanner.KeyWords.has(token.text)) {
			token.kind = TokenKind.Keyword;
		} else if (token.text === 'null') {
			token.kind = TokenKind.NullLiteral;
		} else if (token.text === 'true' || token.text === 'false') {
			token.kind = TokenKind.BooleanLiteral;
		}
		return token;
	}

	private skipSingleLineComment() {
		this.stream.next();
		while (this.stream.peek() !== '\n' && !this.stream.eof()) {
			this.stream.next();
		}
	}

	private skipMultiLineComments() {
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
	}

	private isLetterDigitorUnderScore(ch: string) {
		return (
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= 'a' && ch <= 'z') ||
			(ch >= '0' && ch <= '9') ||
			ch === '_'
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
		return ch === ' ' || ch === '\n' || ch === '\t';
	}
}
