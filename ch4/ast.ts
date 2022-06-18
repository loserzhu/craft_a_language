/**
 * AST superclass
 */
import {Op, Position} from './scanner';
import {Scope} from './scope';
import {FunctionSymbol, VarSymbol} from './symbol';
import {SysTypes, Type} from './types';
import {built_ins} from './symbol';

export abstract class AstNode {
	beginPos: Position; // position of the first token
	endPos: Position; // position of the last token
	isErrorNode: boolean;
	constructor(beginPos: Position, endPos: Position, isErrorNode: boolean) {
		this.beginPos = beginPos;
		this.endPos = endPos;
		this.isErrorNode = isErrorNode;
	}
	// visitor pattern
	public abstract accept(visitor: AstVisitor, additional: any): any;
}

// statement abstract class
export abstract class Statement extends AstNode {}

// declare abstract class
export abstract class Decl extends AstNode {
	name: string;
	protected constructor(
		beginPos: Position,
		endPos: Position,
		name: string,
		isErrorNode: boolean
	) {
		super(beginPos, endPos, isErrorNode);
		this.name = name;
	}
}

/////////////////////////////////////////////////////////////
//statements

export class FunctionDecl extends Decl {
	callSignature: CallSignature;
	body: Block;
	scope: Scope | null = null;
	sym: FunctionSymbol | null = null;

	constructor(
		beginPos: Position,
		name: string,
		callSignature: CallSignature,
		body: Block,
		isErrorNode: boolean
	) {
		super(beginPos, body.endPos, name, isErrorNode);
		this.callSignature = callSignature;
		this.body = body;
	}

	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitFunctionDecl(this, additional);
	}
}

export class CallSignature extends AstNode {
	paramList: ParameterList | null;
	theType: Type;
	constructor(
		beginPos: Position,
		endPos: Position,
		paramList: ParameterList | null,
		theType: Type,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.paramList = paramList;
		this.theType = theType;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitCallSignature(this, additional);
	}
}

export class ParameterList extends AstNode {
	params: VariableDecl[];
	constructor(
		beginPos: Position,
		endPos: Position,
		params: VariableDecl[],
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.params = params;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitParameterList(this, additional);
	}
}

export class Block extends AstNode {
	stmts: Statement[];
	scope: Scope | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		stmts: Statement[],
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.stmts = stmts;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitBlock(this, additional);
	}
}

/**
 * program: root of the AST
 * we treat it as function(argv,argc...)
 */
export class Prog extends Block {
	sym: FunctionSymbol | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		stmts: Statement[],
		isErrorNode = false
	) {
		super(beginPos, endPos, stmts, isErrorNode);
		this.stmts = stmts;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitProg(this, additional);
	}
}

export class VariableStatement extends Statement {
	variableDecl: VariableDecl;
	constructor(
		beginPos: Position,
		endPos: Position,
		variableDecl: VariableDecl,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.variableDecl = variableDecl;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitVariableStatement(this, additional);
	}
}

export class VariableDecl extends Decl {
	theType: Type;
	init: Expression | null;
	sym: VarSymbol | null = null;
	inferredType: Type | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		name: string,
		theType: Type,
		init: Expression | null,
		isErrorNode = false
	) {
		super(beginPos, endPos, name, isErrorNode);
		this.init = init;
		this.theType = theType;
	}

	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitVariableDecl(this, additional);
	}
}

export class ExpressionStatement extends Statement {
	exp: Expression;
	constructor(endPos: Position, exp: Expression, isErrorNode = false) {
		super(exp.beginPos, endPos, isErrorNode);
		this.exp = exp;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitExpressionStatement(this, additional);
	}
}
export class ReturnStatement extends Statement {
	exp: Expression | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		exp: Expression | null,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.exp = exp;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitReturnStatement(this, additional);
	}
}

export class IfStatement extends Statement {
	condition: Expression;
	stmt: Statement;
	elseStmt: Statement | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		conditon: Expression,
		stmt: Statement,
		elseStmt: Statement | null,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.condition = conditon;
		this.stmt = stmt;
		this.elseStmt = elseStmt;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitIfStatement(this, additional);
	}
}

export class ForStatement extends Statement {
	init: Expression | VariableDecl | null = null;
	condition: Expression | null = null;
	increment: Expression | null = null;
	stmt: Statement;

	scope: Scope | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		init: Expression | VariableDecl | null,
		termination: Expression | null,
		increment: Expression | null,
		stmt: Statement,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.init = init;
		this.condition = termination;
		this.stmt = stmt;
		this.increment = increment;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitForStatement(this, additional);
	}
}

/////////////////////////////////////////////////////////////
//expression

export abstract class Expression extends AstNode {
	theType: Type | null = null;
	shouldBeLeftValue = false;
	isLeftValue = false;
	constValue: any = undefined;
	inferedType: Type | null = null;
}

export class Binary extends Expression {
	op: Op;
	exp1: Expression;
	exp2: Expression;
	constructor(
		op: Op,
		exp1: Expression,
		exp2: Expression,
		isErrorNode = false
	) {
		super(exp1.beginPos, exp2.endPos, isErrorNode);
		this.op = op;
		this.exp1 = exp1;
		this.exp2 = exp2;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitBinary(this, additional);
	}
}

export class Unary extends Expression {
	op: Op;
	exp: Expression;
	isPrefix: boolean; //prefix or suffix
	constructor(
		beginPos: Position,
		endPos: Position,
		op: Op,
		exp: Expression,
		isPrefix: boolean,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.op = op;
		this.exp = exp;
		this.isPrefix = isPrefix;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitUnary(this, additional);
	}
}

/**
 * function call
 */
export class FunctionCall extends Expression {
	name: string;
	arguments: Expression[];
	sym: FunctionSymbol | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		name: string,
		paramValues: Expression[],
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.name = name;
		this.arguments = paramValues;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitFunctionCall(this, additional);
	}
}

/**
 * variable reference
 */
export class Variable extends Expression {
	name: string;
	sym: VarSymbol | null = null;
	constructor(
		beginPos: Position,
		endPos: Position,
		name: string,
		isErrorNode = false
	) {
		super(beginPos, endPos, isErrorNode);
		this.name = name;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitVariable(this, additional);
	}
}

export class StringLiteral extends Expression {
	value: string;

	constructor(pos: Position, value: string, isErrorNode = false) {
		super(pos, pos, isErrorNode);
		this.value = value;
		this.theType = SysTypes.String;
		this.constValue = value;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitStringLiteral(this, additional);
	}
}

export class IntegerLiteral extends Expression {
	value: number;
	constructor(pos: Position, value: number, isErrorNode = false) {
		super(pos, pos, isErrorNode);
		this.value = value;
		this.theType = SysTypes.Integer;
		this.constValue = value;
	}

	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitIntegerLiteral(this, additional);
	}
}

export class DecimalLiteral extends Expression {
	value: number;
	constructor(pos: Position, value: number, isErrorNode = false) {
		super(pos, pos, isErrorNode);
		this.value = value;
		this.theType = SysTypes.Decimal;
		this.constValue = value;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitDecimalLiteral(this, additional);
	}
}

export class NullLiteral extends Expression {
	value = null;
	constructor(pos: Position, isErrorNode = false) {
		super(pos, pos, isErrorNode);
		this.theType = SysTypes.Null;
		this.constValue = this.value;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitNullLiteral(this, additional);
	}
}

export class BooleanLiteral extends Expression {
	value: boolean;
	constructor(pos: Position, value: boolean, isErrorNode = false) {
		super(pos, pos, isErrorNode);
		this.theType = SysTypes.Boolean;
		this.value = value;
		this.constValue = value;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitBooleanLiteral(this, additional);
	}
}

export class ErrorExp extends Expression {
	constructor(beginPos: Position, endPos: Position) {
		super(beginPos, endPos, true);
		this.isErrorNode = true;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitErrorExp(this, additional);
	}
}

export class ErrorStmt extends Statement {
	constructor(beginPos: Position, endPos: Position) {
		super(beginPos, endPos, true);
		this.isErrorNode = true;
	}
	accept(visitor: AstVisitor, additional: any): any {
		return visitor.visitErrorStmt(this, additional);
	}
}

/**
 * AST visitor superclass with default method
 */
export abstract class AstVisitor {
	visit(node: AstNode, additional: any = undefined) {
		return node.accept(this, additional);
	}

	visitProg(prog: Prog, additional: any = undefined) {
		return this.visitBlock(prog, additional);
	}

	visitVariableStatement(
		variableStmt: VariableStatement,
		additional: any = undefined
	) {
		return this.visit(variableStmt.variableDecl, additional);
	}

	visitVariableDecl(
		variableDecl: VariableDecl,
		additional: any = undefined
	): any {
		if (variableDecl.init !== null) {
			return this.visit(variableDecl.init, additional);
		}
	}

	visitFunctionDecl(
		functionDecl: FunctionDecl,
		additional: any = undefined
	): any {
		this.visit(functionDecl.callSignature, additional);
		return this.visit(functionDecl.body, additional);
	}

	visitCallSignature(
		callSinature: CallSignature,
		additional: any = undefined
	): any {
		if (callSinature.paramList !== null) {
			return this.visit(callSinature.paramList, additional);
		}
	}

	visitParameterList(
		paramList: ParameterList,
		additional: any = undefined
	): any {
		let retVal: any;
		for (const x of paramList.params) {
			retVal = this.visit(x, additional);
		}
		return retVal;
	}

	visitBlock(block: Block, additional: any = undefined): any {
		let retVal: any;
		for (const x of block.stmts) {
			retVal = this.visit(x, additional);
		}
		return retVal;
	}

	visitExpressionStatement(
		stmt: ExpressionStatement,
		additional: any = undefined
	): any {
		return this.visit(stmt.exp, additional);
	}

	visitReturnStatement(
		stmt: ReturnStatement,
		additional: any = undefined
	): any {
		if (stmt.exp !== null) {
			return this.visit(stmt.exp, additional);
		}
	}

	visitIfStatement(stmt: IfStatement, additional: any = undefined): any {
		this.visit(stmt.condition, additional);
		this.visit(stmt.stmt, additional);
		if (stmt.elseStmt !== null) {
			this.visit(stmt.elseStmt, additional);
		}
	}

	visitForStatement(stmt: ForStatement, additional: any = undefined): any {
		if (stmt.init !== null) {
			this.visit(stmt.init, additional);
		}
		if (stmt.condition !== null) {
			this.visit(stmt.condition, additional);
		}
		if (stmt.increment !== null) {
			this.visit(stmt.increment, additional);
		}
		this.visit(stmt.stmt, additional);
	}

	visitBinary(exp: Binary, additional: any = undefined) {
		this.visit(exp.exp1, additional);
		this.visit(exp.exp2, additional);
	}

	visitUnary(exp: Unary, additional: any = undefined) {
		return this.visit(exp.exp, additional);
	}

	visitIntegerLiteral(exp: IntegerLiteral, additional: any = undefined) {
		return exp.value;
	}

	visitDecimalLiteral(exp: DecimalLiteral, additional: any = undefined) {
		return exp.value;
	}

	visitStringLiteral(exp: StringLiteral, additional: any = undefined) {
		return exp.value;
	}

	visitNullLiteral(exp: NullLiteral, additional: any = undefined) {
		return exp.value;
	}

	visitBooleanLiteral(exp: BooleanLiteral, additional: any = undefined) {
		return exp.value;
	}

	visitVariable(variable: Variable, additional: any = undefined) {
		return undefined;
	}

	visitFunctionCall(functionCall: FunctionCall, additional: any = undefined) {
		for (const arg of functionCall.arguments) {
			this.visit(arg, additional);
		}
		return undefined;
	}

	visitErrorExp(errorNode: ErrorExp, additional: any = undefined) {
		return undefined;
	}
	visitErrorStmt(errorStmt: ErrorStmt, additional: any = undefined) {
		return undefined;
	}
}

export class AstDumper extends AstVisitor {
	visitProg(prog: Prog, prefix: any): any {
		console.log(prefix + 'Prog' + (prog.isErrorNode ? ' **E** ' : ''));
		for (const x of prog.stmts) {
			this.visit(x, prefix + '    ');
		}
	}

	visitVariableStatement(variableStmt: VariableStatement, prefix: any) {
		console.log(
			prefix +
				'VariableStatement ' +
				(variableStmt.isErrorNode ? ' **E** ' : '')
		);
		this.visit(variableStmt.variableDecl, prefix + '    ');
	}

	visitVariableDecl(variableDecl: VariableDecl, prefix: any): any {
		console.log(
			prefix +
				'VariableDecl ' +
				variableDecl.name +
				(variableDecl.theType === null
					? ''
					: '(' + variableDecl.theType.name + ')') +
				(variableDecl.isErrorNode ? ' **E** ' : '')
		);
		if (variableDecl.init === null) {
			console.log(prefix + 'no initialization.');
		} else {
			this.visit(variableDecl.init, prefix + '    ');
		}
	}

	visitFunctionDecl(functionDecl: FunctionDecl, prefix: any): any {
		console.log(
			prefix +
				'FunctionDecl ' +
				functionDecl.name +
				(functionDecl.isErrorNode ? ' **E** ' : '')
		);
		this.visit(functionDecl.callSignature, prefix + '    ');
		this.visit(functionDecl.body, prefix + '    ');
	}

	visitCallSignature(callSinature: CallSignature, prefix: any): any {
		console.log(
			prefix +
				(callSinature.isErrorNode ? ' **E** ' : '') +
				'Return type: ' +
				callSinature.theType.name
		);
		if (callSinature.paramList !== null) {
			this.visit(callSinature.paramList, prefix + '    ');
		}
	}

	visitParameterList(paramList: ParameterList, prefix: any): any {
		console.log(
			prefix +
				'ParamList:' +
				(paramList.isErrorNode ? ' **E** ' : '') +
				(paramList.params.length === 0 ? 'none' : '')
		);
		for (const x of paramList.params) {
			this.visit(x, prefix + '    ');
		}
	}

	// visitParameter(parameter: Parameter):any{
	//     return undefined;
	// }

	visitBlock(block: Block, prefix: any): any {
		if (block.isErrorNode) {
			console.log(
				prefix + 'Block' + (block.isErrorNode ? ' **E** ' : '')
			);
		}
		for (const x of block.stmts) {
			this.visit(x, prefix + '    ');
		}
	}

	visitExpressionStatement(stmt: ExpressionStatement, prefix: any): any {
		console.log(
			prefix + 'ExpressionStatement' + (stmt.isErrorNode ? ' **E** ' : '')
		);
		return this.visit(stmt.exp, prefix + '    ');
	}

	visitReturnStatement(stmt: ReturnStatement, prefix: any): any {
		console.log(
			prefix + 'ReturnStatement' + (stmt.isErrorNode ? ' **E** ' : '')
		);
		if (stmt.exp !== null) {
			return this.visit(stmt.exp, prefix + '    ');
		}
	}

	visitIfStatement(stmt: IfStatement, prefix: any): any {
		console.log(
			prefix + 'IfStatement' + (stmt.isErrorNode ? ' **E** ' : '')
		);
		console.log(prefix + '    Condition:');
		this.visit(stmt.condition, prefix + '    ');
		console.log(prefix + '    Then:');
		this.visit(stmt.stmt, prefix + '    ');
		if (stmt.elseStmt !== null) {
			console.log(prefix + '    Else:');
			this.visit(stmt.elseStmt, prefix + '    ');
		}
	}

	visitForStatement(stmt: ForStatement, prefix: any): any {
		console.log(
			prefix + 'ForStatement' + (stmt.isErrorNode ? ' **E** ' : '')
		);
		if (stmt.init !== null) {
			console.log(prefix + '    Init:');
			this.visit(stmt.init, prefix + '    ');
		}
		if (stmt.condition !== null) {
			console.log(prefix + '    Condition:');
			this.visit(stmt.condition, prefix + '    ');
		}
		if (stmt.increment !== null) {
			console.log(prefix + '    Increment:');
			this.visit(stmt.increment, prefix + '    ');
		}
		console.log(prefix + '    Body:');
		this.visit(stmt.stmt, prefix + '    ');
	}

	visitBinary(exp: Binary, prefix: any): any {
		console.log(
			prefix +
				'Binary:' +
				Op[exp.op] +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
		this.visit(exp.exp1, prefix + '    ');
		this.visit(exp.exp2, prefix + '    ');
	}

	visitUnary(exp: Unary, prefix: any): any {
		console.log(
			prefix +
				(exp.isPrefix ? 'Prefix ' : 'PostFix ') +
				'Unary:' +
				Op[exp.op] +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
		this.visit(exp.exp, prefix + '    ');
	}

	visitIntegerLiteral(exp: IntegerLiteral, prefix: any): any {
		console.log(
			prefix +
				exp.value +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
	}

	visitDecimalLiteral(exp: DecimalLiteral, prefix: any): any {
		console.log(
			prefix +
				exp.value +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
	}

	visitStringLiteral(exp: StringLiteral, prefix: any): any {
		console.log(
			prefix +
				exp.value +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
	}

	visitNullLiteral(exp: NullLiteral, prefix: any): any {
		console.log(
			prefix +
				exp.value +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
	}

	visitBooleanLiteral(exp: BooleanLiteral, prefix: any): any {
		console.log(
			prefix +
				exp.value +
				(exp.theType === null ? '' : '(' + exp.theType.name + ')') +
				(exp.isErrorNode ? ' **E** ' : '')
		);
	}

	visitVariable(variable: Variable, prefix: any): any {
		console.log(
			prefix +
				'Variable: ' +
				(variable.isErrorNode ? ' **E** ' : '') +
				variable.name +
				(variable.theType === null
					? ''
					: '(' + variable.theType.name + ')') +
				(variable.isLeftValue ? ', LeftValue' : '') +
				(variable.sym !== null ? ', resolved' : ', not resolved')
		);
	}

	visitFunctionCall(functionCall: FunctionCall, prefix: any): any {
		console.log(
			prefix +
				'FunctionCall ' +
				(functionCall.theType === null
					? ''
					: '(' + functionCall.theType.name + ')') +
				(functionCall.isErrorNode ? ' **E** ' : '') +
				functionCall.name +
				(built_ins.has(functionCall.name)
					? ', built-in'
					: functionCall.sym !== null
					? ', resolved'
					: ', not resolved')
		);
		for (const param of functionCall.arguments) {
			this.visit(param, prefix + '    ');
		}
	}

	visitErrorExp(errorNode: ErrorExp, prefix: any): any {
		console.log(prefix + 'Error Expression **E**');
	}

	visitErrorStmt(errorStmt: ErrorStmt, prefix: any): any {
		console.log(prefix + 'Error Statement **E**');
	}
}
