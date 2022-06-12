////////////////////////////////////////////////////////////////////////////////
//Parser
/**
 * AST node
 */
export abstract class AstNode {
	//prinlt
	public abstract dump(prefix: string): void;

	//visit node
	public abstract accept(visitor: AstVisitor): any;
}

export abstract class Statement extends AstNode {}

export abstract class Expression extends AstNode {}

/**
 * declare statement
 */
export abstract class Decl {
	name: string;
	constructor(name: string) {
		this.name = name;
	}
}

/*------------------------------------------------------------------------*/

/**
 * function declare
 */
export class FunctionDecl extends Decl {
	body: Block; //function body is a block
	constructor(name: string, body: Block) {
		super(name);
		this.body = body;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitFunctionDecl(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + 'FunctionDecl ' + this.name);
		this.body.dump(prefix + '    ');
	}
}

/**
 * variable declare
 */
export class VariableDecl extends Decl {
	varType: string; // variable type
	init: Expression | null; // init
	constructor(name: string, varType: string, init: Expression | null) {
		super(name);
		this.varType = varType;
		this.init = init;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitVariableDecl(this);
	}
	public dump(prefix: string): void {
		console.log(
			prefix + 'VariableDecl ' + this.name + ', type: ' + this.varType
		);
		if (this.init === null) {
			console.log(prefix + 'no initialization.');
		} else {
			this.init.dump(prefix + '    ');
		}
	}
}

/**
 * block
 */
export class Block extends AstNode {
	stmts: Statement[];
	constructor(stmts: Statement[]) {
		super();
		this.stmts = stmts;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitBlock(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + 'Block');
		this.stmts.forEach((x) => x.dump(prefix + '    '));
	}
}

/**
 * program node, root of AST
 */
export class Prog extends Block {
	public accept(visitor: AstVisitor): any {
		return visitor.visitProg(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + 'Prog');
		this.stmts.forEach((x) => x.dump(prefix + '    '));
	}
}

/**
 * binary expression
 */
export class Binary extends Expression {
	op: string; //operator
	exp1: Expression; //left exp
	exp2: Expression; //right exp
	constructor(op: string, exp1: Expression, exp2: Expression) {
		super();
		this.op = op;
		this.exp1 = exp1;
		this.exp2 = exp2;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitBinary(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + 'Binary:' + this.op);
		this.exp1.dump(prefix + '    ');
		this.exp2.dump(prefix + '    ');
	}
}

/**
 * expression statement
 */
export class ExpressionStatement extends Statement {
	exp: Expression;
	constructor(exp: Expression) {
		super();
		this.exp = exp;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitExpressionStatement(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + 'ExpressionStatement');
		this.exp.dump(prefix + '    ');
	}
}

/**
 * fucntion call
 */
export class FunctionCall extends AstNode {
	name: string;
	parameters: Expression[];
	decl: FunctionDecl | null = null; //refer to functionDecl
	constructor(name: string, parameters: Expression[]) {
		super();
		this.name = name;
		this.parameters = parameters;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitFunctionCall(this);
	}
	public dump(prefix: string): void {
		console.log(
			prefix +
				'FunctionCall ' +
				this.name +
				(this.decl !== null ? ', resolved' : ', not resolved')
		);
		this.parameters.forEach((x) => x.dump(prefix + '    '));
	}
}

/**
 * variable
 */
export class Variable extends Expression {
	name: string;
	decl: VariableDecl | null = null; //refer to the variableDecl
	constructor(name: string) {
		super();
		this.name = name;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitVariable(this);
	}
	public dump(prefix: string): void {
		console.log(
			prefix +
				'Variable: ' +
				this.name +
				(this.decl !== null ? ', resolved' : ', not resolved')
		);
	}
}

/**
 * string literal
 */
export class StringLiteral extends Expression {
	value: string;
	constructor(value: string) {
		super();
		this.value = value;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitStringLiteral(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + this.value);
	}
}

/**
 * interger literal
 */
export class IntegerLiteral extends Expression {
	value: number;
	constructor(value: number) {
		super();
		this.value = value;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitIntegerLiteral(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + this.value);
	}
}

/**
 * decimal literal
 */
export class DecimalLiteral extends Expression {
	value: number;
	constructor(value: number) {
		super();
		this.value = value;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitDecimalLiteral(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + this.value);
	}
}

/**
 * null literal
 */
export class NullLiteral extends Expression {
	value = null;
	constructor() {
		super();
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitNullLiteral(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + this.value);
	}
}

/**
 * boolean literal
 */
export class BooleanLiteral extends Expression {
	value: boolean;
	constructor(value: boolean) {
		super();
		this.value = value;
	}
	public accept(visitor: AstVisitor): any {
		return visitor.visitBooleanLiteral(this);
	}
	public dump(prefix: string): void {
		console.log(prefix + this.value);
	}
}

////////////////////////////////////////////////////////////////////////////////
//Visitor

/**
 * traverse the AST
 */
export class AstVisitor {
	visit(node: AstNode): any {
		return node.accept(this);
	}

	visitBlock(Block: Block): any {
		let retVal: any;
		for (const x of Block.stmts) {
			retVal = this.visit(x);
		}
		return retVal;
	}

	visitProg(prog: Prog): any {
		let retVal: any;
		for (const x of prog.stmts) {
			retVal = this.visit(x);
		}
		return retVal;
	}

	visitVariableDecl(variableDecl: VariableDecl): any {
		if (variableDecl.init !== null) {
			return this.visit(variableDecl.init);
		}
	}

	visitFunctionDecl(functionDecl: FunctionDecl): any {
		return this.visitBlock(functionDecl.body);
	}

	visitExpressionStatement(stmt: ExpressionStatement): any {
		return this.visit(stmt.exp);
	}

	visitBinary(exp: Binary): any {
		this.visit(exp.exp1);
		this.visit(exp.exp2);
	}

	visitIntegerLiteral(exp: IntegerLiteral): any {
		return exp.value;
	}

	visitDecimalLiteral(exp: DecimalLiteral): any {
		return exp.value;
	}

	visitStringLiteral(exp: StringLiteral): any {
		return exp.value;
	}

	visitNullLiteral(exp: NullLiteral): any {
		return exp.value;
	}

	visitBooleanLiteral(exp: BooleanLiteral): any {
		return exp.value;
	}

	visitVariable(variable: Variable): any {
		return undefined;
	}

	visitFunctionCall(functionCall: FunctionCall): any {
		return undefined;
	}
}
