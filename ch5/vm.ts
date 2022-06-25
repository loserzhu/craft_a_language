import {Token, Op} from './scanner';
import {
	InternalSymbol,
	FunctionSymbol,
	VarSymbol,
	SymKind,
	FUN_println,
	SymbolVisitor,
	SymbolDumper,
	built_ins
} from './symbol';
import {
	AstVisitor,
	AstNode,
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
	Variable,
	ReturnStatement,
	IfStatement,
	Unary,
	ForStatement
} from './ast';
import {assert} from 'console';
import {
	TypeVisitor,
	SimpleType,
	UnionType,
	FunctionType,
	Type,
	SysTypes
} from './types';

/**
 * 指令的编码
 */
enum OpCode {
	//参考JVM的操作码
	iconst_0 = 0x03,
	iconst_1 = 0x04,
	iconst_2 = 0x05,
	iconst_3 = 0x06,
	iconst_4 = 0x07,
	iconst_5 = 0x08,
	bipush = 0x10, //8位整数入栈
	sipush = 0x11, //16位整数入栈
	ldc = 0x12, //从常量池加载，load const
	iload = 0x15, //本地变量入栈
	iload_0 = 0x1a,
	iload_1 = 0x1b,
	iload_2 = 0x1c,
	iload_3 = 0x1d,
	istore = 0x36,
	istore_0 = 0x3b,
	istore_1 = 0x3c,
	istore_2 = 0x3d,
	istore_3 = 0x3e,
	iadd = 0x60,
	isub = 0x64,
	imul = 0x68,
	idiv = 0x6c,
	iinc = 0x84,
	lcmp = 0x94,
	ifeq = 0x99,
	ifne = 0x9a,
	iflt = 0x9b,
	ifge = 0x9c,
	ifgt = 0x9d,
	ifle = 0x9e,
	if_icmpeq = 0x9f,
	if_icmpne = 0xa0,
	if_icmplt = 0xa1,
	if_icmpge = 0xa2,
	if_icmpgt = 0xa3,
	if_icmple = 0xa4,
	goto = 0xa7,
	ireturn = 0xac,
	return = 0xb1,
	invokestatic = 0xb8, //调用函数

	//自行扩展的操作码
	sadd = 0x61, //字符串连接
	sldc = 0x13 //把字符串常量入栈。字符串放在常量区，用两个操作数记录下标。
}

/**
 * 字节码模块
 * 里面包括一个模块里的各种函数定义、常量池等内容。
 */
export class BCModule {
	//常量
	consts: any[] = [];

	//入口函数
	_main: FunctionSymbol | null = null;

	constructor() {
		//系统函数
		for (const fun of built_ins.values()) {
			this.consts.push(fun);
		}
	}
}

export class BCModuleDumper {
	dump(bcModule: BCModule) {
		const symbolDumper = new SymbolDumper();
		for (const x of bcModule.consts) {
			if (typeof x === 'number') {
				console.log('Number: ' + x);
			} else if (typeof x === 'string') {
				console.log('String: ' + x);
			} else if (typeof (x as InternalSymbol).kind === 'number') {
				symbolDumper.visit(x, '');
			} else {
				console.log('unknown const:');
				console.log(x);
			}
		}
	}
}

export class BCGenerator extends AstVisitor {
	m: BCModule;
	functionSymbol: FunctionSymbol | null = null;
	inExpression = false;

	constructor() {
		super();
		this.m = new BCModule();
	}

	visitProg(prog: Prog, additional: any = undefined): any {
		this.functionSymbol = prog.sym;
		if (this.functionSymbol !== null) {
			this.m.consts.push(this.functionSymbol);
			this.m._main = this.functionSymbol;
			this.functionSymbol.byteCode = this.visitBlock(prog) as number[];
		}
		return this.m;
	}

	visitFunctionDecl(
		functionDecl: FunctionDecl,
		additional: any = undefined
	): any {
		//1.设置当前的函数符号
		const lastFunctionSym = this.functionSymbol;
		this.functionSymbol = functionDecl.sym;

		//添加到Module
		this.m.consts.push(this.functionSymbol);

		//2.为函数体生成代码

		const code1 = this.visit(functionDecl.callSignature);
		const code2 = this.visit(functionDecl.body);

		this.addOffsetToJumpOp(code2, code1.length);
		if (this.functionSymbol !== null) {
			this.functionSymbol.byteCode = code1.concat(code2);
		}

		this.functionSymbol = lastFunctionSym;
	}

	visitBlock(block: Block, additional: any = undefined): any {
		let ret: number[] = [];
		for (const x of block.stmts) {
			this.inExpression = false;
			const code = this.visit(x);
			if (typeof code === 'object') {
				this.addOffsetToJumpOp(code, ret.length);
				ret = ret.concat(code);
			}
		}
		return ret;
	}

	visitVariableDecl(
		variableDecl: VariableDecl,
		additional: any = undefined
	): any {
		let code: number[] = [];
		if (variableDecl.init !== null) {
			const ret = this.visit(variableDecl.init) as number[];
			code = code.concat(ret);
			code = code.concat(this.setVariableValue(variableDecl.sym));
		}
		return code;
	}

	visitReturnStatement(
		returnStatement: ReturnStatement,
		additional: any = undefined
	): any {
		let code: number[] = [];
		if (returnStatement.exp !== null) {
			const code1: number[] = this.visit(returnStatement.exp);
			code = code.concat(code1);
			code.push(OpCode.ireturn);
			return code;
		} else {
			code.push(OpCode.return);
			return code;
		}
	}

	visitFunctionCall(
		functionCall: FunctionCall,
		additional: any = undefined
	): any {
		let code: number[] = [];
		for (const param of functionCall.arguments) {
			const code1 = this.visit(param);
			code = code.concat(code1 as number[]);
		}
		const index = this.m.consts.indexOf(functionCall.sym);

		code.push(OpCode.invokestatic);
		code.push(index >> 8);
		code.push(index);
		return code;
	}

	visitIfStatement(ifStmt: IfStatement, additional: any = undefined): any {
		let code: number[] = [];
		const code_condition = this.visit(ifStmt.condition);
		this.inExpression = false;

		const code_ifBlock = this.visit(ifStmt.stmt);
		this.inExpression = false;

		const code_elseBlock =
			ifStmt.elseStmt === null ? [] : this.visit(ifStmt.elseStmt);
		this.inExpression = false;

		const offset_ifBlock = code_condition.length + 3;
		const offset_elseBlock =
			code_condition.length + code_ifBlock.length + 6;
		const offset_nextStmt = offset_elseBlock + code_elseBlock.length;

		this.addOffsetToJumpOp(code_ifBlock, offset_ifBlock);
		this.addOffsetToJumpOp(code_elseBlock, offset_elseBlock);

		code = code.concat(code_condition);
		code.push(OpCode.ifeq);
		code.push(offset_elseBlock >> 8);
		code.push(offset_elseBlock);

		code = code.concat(code_ifBlock);

		code.push(OpCode.goto);
		code.push(offset_nextStmt >> 8);
		code.push(offset_nextStmt);

		code = code.concat(code_elseBlock);

		return code;
	}

	visitForStatement(forStmt: ForStatement, additional: any = undefined): any {
		let code: number[] = [];
		const code_init = forStmt.init === null ? [] : this.visit(forStmt.init);
		this.inExpression = false;

		const code_condition =
			forStmt.condition === null ? [] : this.visit(forStmt.condition);
		this.inExpression = false;

		const code_increment =
			forStmt.increment === null ? [] : this.visit(forStmt.increment);
		this.inExpression = false;

		const code_stmt = forStmt === null ? [] : this.visit(forStmt.stmt);
		this.inExpression = false;

		const offset_condition = code_init.length;
		const offset_stmt =
			offset_condition +
			code_condition.length +
			(code_condition.length > 0 ? 3 : 0);
		const offset_increment = offset_stmt + code_stmt.length;
		const offset_nextStmt = offset_increment + code_increment.length + 3;

		this.addOffsetToJumpOp(code_condition, offset_condition);
		this.addOffsetToJumpOp(code_increment, offset_increment);
		this.addOffsetToJumpOp(code_stmt, offset_stmt);

		code = code.concat(code_init);

		if (code_condition.length > 0) {
			code = code.concat(code_condition);
			code.push(OpCode.ifeq);
			code.push(offset_nextStmt >> 8);
			code.push(offset_nextStmt);
		}

		code = code.concat(code_stmt);
		code = code.concat(code_increment);

		code.push(OpCode.goto);
		code.push(offset_condition >> 8);
		code.push(offset_condition);

		return code;
	}

	visitBinary(bi: Binary): any {
		this.inExpression = true;

		let code: number[];
		const code1 = this.visit(bi.exp1);
		const code2 = this.visit(bi.exp2);

		let address1 = 0;
		let address2 = 0;
		let tempCode = 0;

		////1.处理赋值
		if (bi.op === Op.Assign) {
			const varSymbol = code1 as VarSymbol;
			console.log('varSymbol:');
			console.log(varSymbol);
			//加入右子树的代码
			code = code2;
			//加入istore代码
			code = code.concat(this.setVariableValue(varSymbol));
		}
		////2.处理其他二元运算
		else {
			//加入左子树的代码
			code = code1;
			//加入右子树的代码
			code = code.concat(code2);
			//加入运算符的代码
			switch (bi.op) {
				case Op.Plus: //'+'
					if (bi.theType === SysTypes.String) {
						code.push(OpCode.sadd);
					} else {
						code.push(OpCode.iadd);
					}
					break;
				case Op.Minus: //'-'
					code.push(OpCode.isub);
					break;
				case Op.Multiply: //'*'
					code.push(OpCode.imul);
					break;
				case Op.Divide: //'/'
					code.push(OpCode.idiv);
					break;
				case Op.G: //'>'
				case Op.GE: //'>='
				case Op.L: //'<'
				case Op.LE: //'<='
				case Op.EQ: //'=='
				case Op.NE: //'!='
					if (bi.op === Op.G) {
						tempCode = OpCode.if_icmple;
					} else if (bi.op === Op.GE) {
						tempCode = OpCode.if_icmplt;
					} else if (bi.op === Op.L) {
						tempCode = OpCode.if_icmpge;
					} else if (bi.op === Op.LE) {
						tempCode = OpCode.if_icmpgt;
					} else if (bi.op === Op.EQ) {
						tempCode = OpCode.if_icmpne;
					} else if (bi.op === Op.NE) {
						tempCode = OpCode.if_icmpeq;
					}

					address1 = code.length + 7;
					address2 = address1 + 1;
					code.push(tempCode);
					code.push(address1 >> 8);
					code.push(address1);
					code.push(OpCode.iconst_1);
					code.push(OpCode.goto);
					code.push(address2 >> 8);
					code.push(address2);
					code.push(OpCode.iconst_0);
					break;
				default:
					console.log('Unsupported binary operation: ' + bi.op);
					return [];
			}
		}

		return code;
	}

	visitUnary(u: Unary): any {
		let code: number[] = [];
		const v = this.visit(u.exp);
		let varSymbol: VarSymbol;
		let varIndex: number;

		if (u.op === Op.Inc) {
			varSymbol = v as VarSymbol;
			varIndex = this.functionSymbol?.vars.indexOf(varSymbol) as number;
			if (u.isPrefix) {
				code.push(OpCode.iinc);
				code.push(varIndex);
				code.push(1);
				if (this.inExpression) {
					code = code.concat(this.getVariableValue(varSymbol));
				}
			} else {
				if (this.inExpression) {
					code = code.concat(this.getVariableValue(varSymbol));
				}
				code.push(OpCode.iinc);
				code.push(varIndex);
				code.push(1);
			}
		} else if (u.op === Op.Dec) {
			varSymbol = v as VarSymbol;
			varIndex = this.functionSymbol?.vars.indexOf(varSymbol) as number;
			if (u.isPrefix) {
				code.push(OpCode.iinc);
				code.push(varIndex);
				code.push(-1);
				if (this.inExpression) {
					code = code.concat(this.getVariableValue(varSymbol));
				}
			} else {
				if (this.inExpression) {
					code = code.concat(this.getVariableValue(varSymbol));
				}
				code.push(OpCode.iinc);
				code.push(varIndex);
				code.push(-1);
			}
		} else {
			console.log('Unsupported unary oprator :' + u.op);
		}
		return code;
	}

	visitVariable(variable: Variable, additional: any = undefined): any {
		if (variable.isLeftValue) {
			return variable.sym;
		}
		return this.getVariableValue(variable.sym);
	}

	private setVariableValue(sym: VarSymbol | null) {
		const code: number[] = [];
		if (sym !== null) {
			const index = this.functionSymbol?.vars.indexOf(sym);
			assert(
				index !== -1,
				'生成字节码时(设置变量值)，在函数符号中查找变量失败！'
			);
			//根据不同的下标生成指令，尽量生成压缩指令
			switch (index) {
				case 0:
					code.push(OpCode.istore_0);
					break;
				case 1:
					code.push(OpCode.istore_1);
					break;
				case 2:
					code.push(OpCode.istore_2);
					break;
				case 3:
					code.push(OpCode.istore_3);
					break;
				default:
					code.push(OpCode.istore);
					code.push(index as number);
			}
		}
		return code;
	}

	private getVariableValue(sym: VarSymbol | null) {
		const code: number[] = [];
		if (sym !== null) {
			const index = this.functionSymbol?.vars.indexOf(sym);
			assert(
				index !== -1,
				'生成字节码时（获取变量的值），在函数符号中获取本地变量下标失败！'
			);
			//根据不同的下标生成指令，尽量生成压缩指令
			switch (index) {
				case 0:
					code.push(OpCode.iload_0);
					break;
				case 1:
					code.push(OpCode.iload_1);
					break;
				case 2:
					code.push(OpCode.iload_2);
					break;
				case 3:
					code.push(OpCode.iload_3);
					break;
				default:
					code.push(OpCode.iload);
					code.push(index as number);
			}
		}
		return code;
	}

	visitIntegerLiteral(integerLiteral: IntegerLiteral): any {
		// console.log("visitIntegerLiteral in BC");
		const ret: number[] = [];
		const value = integerLiteral.value;
		//0-5之间的数字，直接用快捷指令
		if (value >= 0 && value <= 5) {
			switch (value) {
				case 0:
					ret.push(OpCode.iconst_0);
					break;
				case 1:
					ret.push(OpCode.iconst_1);
					break;
				case 2:
					ret.push(OpCode.iconst_2);
					break;
				case 3:
					ret.push(OpCode.iconst_3);
					break;
				case 4:
					ret.push(OpCode.iconst_4);
					break;
				case 5:
					ret.push(OpCode.iconst_5);
					break;
			}
		}

		//如果是8位整数，用bipush指令，直接放在后面的一个字节的操作数里就行了
		else if (value >= -128 && value < 128) {
			ret.push(OpCode.bipush);
			ret.push(value);
		}

		//如果是16位整数，用sipush指令
		else if (value >= -32768 && value < 32768) {
			ret.push(OpCode.sipush);
			//要拆成两个字节
			ret.push(value >> 8);
			ret.push(value & 0x00ff);
		}

		//大于16位的，采用ldc指令，从常量池中去取
		else {
			ret.push(OpCode.ldc);
			//把value值放入常量池。
			this.m.consts.push(value);
			ret.push(this.m.consts.length - 1);
		}
		// console.log(ret);
		return ret;
	}

	visitStringLiteral(stringLiteral: StringLiteral): any {
		const ret: number[] = [];
		const value = stringLiteral.value;
		this.m.consts.push(value);
		ret.push(OpCode.sldc);
		ret.push(this.m.consts.length - 1);
		return ret;
	}
	/**
	 *
	 * @param code
	 * @param offset
	 * @private
	 */
	private addOffsetToJumpOp(code: number[], offset = 0) {
		if (offset === 0) {
			return code;
		}
		let codeIndex = 0;
		while (codeIndex < code.length) {
			switch (code[codeIndex]) {
				//纯指令，后面不带操作数
				case OpCode.iadd:
				case OpCode.sadd:
				case OpCode.isub:
				case OpCode.imul:
				case OpCode.idiv:
				case OpCode.iconst_0:
				case OpCode.iconst_1:
				case OpCode.iconst_2:
				case OpCode.iconst_3:
				case OpCode.iconst_4:
				case OpCode.iconst_5:
				case OpCode.istore_0:
				case OpCode.istore_1:
				case OpCode.istore_2:
				case OpCode.istore_3:
				case OpCode.iload_0:
				case OpCode.iload_1:
				case OpCode.iload_2:
				case OpCode.iload_3:
				case OpCode.ireturn:
				case OpCode.return:
				case OpCode.lcmp:
					codeIndex++;
					continue;

				//指令后面带1个字节的操作数
				case OpCode.iload:
				case OpCode.istore:
				case OpCode.bipush:
				case OpCode.ldc:
				case OpCode.sldc:
					codeIndex += 2;
					continue;

				//指令后面带2个字节的操作数
				case OpCode.iinc:
				case OpCode.invokestatic:
				case OpCode.sipush:
					codeIndex += 3;
					continue;

				//跳转语句，需要给跳转指令加上offset
				case OpCode.if_icmpeq:
				case OpCode.if_icmpne:
				case OpCode.if_icmpge:
				case OpCode.if_icmpgt:
				case OpCode.if_icmple:
				case OpCode.if_icmplt:
				case OpCode.ifeq:
				case OpCode.ifne:
				case OpCode.ifge:
				case OpCode.ifgt:
				case OpCode.ifle:
				case OpCode.iflt:
				case OpCode.goto:
					// eslint-disable-next-line no-case-declarations
					const byte1 = code[codeIndex + 1];
					// eslint-disable-next-line no-case-declarations
					const byte2 = code[codeIndex + 2];
					// eslint-disable-next-line no-case-declarations
					const address = (byte1 << 8) | (byte2 + offset);
					code[codeIndex + 1] = address >> 8;
					code[codeIndex + 2] = address;
					codeIndex += 3;
					continue;

				default:
					console.log(
						'unrecognized Op Code in addOffsetToJumpOp: ' +
							OpCode[code[codeIndex]]
					);
					return code;
			}
		}
		return code;
	}
}

class StackFrame {
	//对应的函数，用来找到代码
	funtionSym: FunctionSymbol;

	//返回地址
	returnIndex = 0;

	//本地变量
	localVars: number[];

	//操作数栈
	oprandStack: any[] = [];

	constructor(funtionSym: FunctionSymbol) {
		this.funtionSym = funtionSym;
		this.localVars = new Array(funtionSym.vars.length);
	}
}

export class VM {
	callStack: StackFrame[] = [];

	constructor() {}

	execute(bcModule: BCModule): number {
		//TODO
		let functionSym: FunctionSymbol;
		if (bcModule._main === null) {
			console.log('Can not find main function');
			return -1;
		} else {
			functionSym = bcModule._main;
		}
		let frame = new StackFrame(functionSym);
		this.callStack.push(frame);

		// current running code
		let code: number[] = [];
		if (functionSym.byteCode !== null) {
			code = functionSym.byteCode;
		} else {
			console.log('Can not find code for' + frame.funtionSym.name);
			return -1;
		}
		// current code position
		let codeIndex = 0;
		let opCode = code[codeIndex];

		let byte1 = 0;
		let byte2 = 0;
		let vleft: any;
		let vright: any;
		let constIndex = 0;
		let numValue = 0;
		let strValue = '';
		let returnValue: any = undefined;
		let varIndex = 0;
		let offset = 0;
		// TODO is this really unneeded?
		let tempFunctionSym: FunctionSymbol;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			switch (opCode) {
				case OpCode.iconst_0:
					frame.oprandStack.push(0);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iconst_1:
					frame.oprandStack.push(1);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iconst_2:
					frame.oprandStack.push(2);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iconst_3:
					frame.oprandStack.push(3);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iconst_4:
					frame.oprandStack.push(4);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iconst_5:
					frame.oprandStack.push(5);
					opCode = code[++codeIndex];
					continue;
				case OpCode.bipush: // load 1 byte
					frame.oprandStack.push(code[++codeIndex]);
					opCode = code[++codeIndex];
					continue;
				case OpCode.sipush: // load 2 bytes
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					frame.oprandStack.push((byte1 << 8) | byte2);
					opCode = code[++codeIndex];
					continue;
				case OpCode.ldc: // load from const pool
					constIndex = code[++codeIndex];
					numValue = bcModule.consts[constIndex];
					frame.oprandStack.push(numValue);
					opCode = code[++codeIndex];
					continue;
				case OpCode.sldc:
					constIndex = code[++codeIndex];
					strValue = bcModule.consts[constIndex];
					frame.oprandStack.push(strValue);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iload:
					frame.oprandStack.push(frame.localVars[code[++codeIndex]]);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iload_0:
					frame.oprandStack.push(frame.localVars[0]);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iload_1:
					frame.oprandStack.push(frame.localVars[1]);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iload_2:
					frame.oprandStack.push(frame.localVars[2]);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iload_3:
					frame.oprandStack.push(frame.localVars[3]);
					opCode = code[++codeIndex];
					continue;
				case OpCode.istore:
					frame.localVars[code[++codeIndex]] =
						frame.oprandStack.pop();
					opCode = code[++codeIndex];
					continue;
				case OpCode.istore_0:
					frame.localVars[0] = frame.oprandStack.pop();
					opCode = code[++codeIndex];
					continue;
				case OpCode.istore_1:
					frame.localVars[1] = frame.oprandStack.pop();
					opCode = code[++codeIndex];
					continue;
				case OpCode.istore_2:
					frame.localVars[2] = frame.oprandStack.pop();
					opCode = code[++codeIndex];
					continue;
				case OpCode.istore_3:
					frame.localVars[3] = frame.oprandStack.pop();
					opCode = code[++codeIndex];
					continue;
				case OpCode.iadd:
				case OpCode.sadd:
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					frame.oprandStack.push(vleft + vright);
					opCode = code[++codeIndex];
					continue;
				case OpCode.isub:
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					frame.oprandStack.push(vleft - vright);
					opCode = code[++codeIndex];
					continue;
				case OpCode.imul:
					frame.oprandStack.push(
						frame.oprandStack.pop() * frame.oprandStack.pop()
					);
					opCode = code[++codeIndex];
					continue;
				case OpCode.idiv:
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					frame.oprandStack.push(vleft / vright);
					opCode = code[++codeIndex];
					continue;
				case OpCode.iinc:
					varIndex = code[++codeIndex];
					offset = code[++codeIndex];
					frame.localVars[varIndex] =
						frame.localVars[varIndex] + offset;
					opCode = code[++codeIndex];
					continue;
				case OpCode.ireturn:
				case OpCode.return:
					returnValue = undefined;
					if (opCode === OpCode.ireturn) {
						returnValue = frame.oprandStack.pop();
					}
					this.callStack.pop();
					if (this.callStack.length === 0) {
						return 0;
					} else {
						frame = this.callStack[this.callStack.length - 1];
						if (opCode === OpCode.ireturn) {
							frame.oprandStack.push(returnValue);
						}
						if (frame.funtionSym.byteCode !== null) {
							code = frame.funtionSym.byteCode;
							codeIndex = frame.returnIndex;
							opCode = code[codeIndex];
							continue;
						} else {
							console.log(
								'Can not find code for' + frame.funtionSym.name
							);
							return -1;
						}
					}
				case OpCode.invokestatic:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					tempFunctionSym = bcModule.consts[(byte1 << 8) | byte2];

					if (tempFunctionSym.name === 'println') {
						const param = frame.oprandStack.pop();
						opCode = code[++codeIndex];
						console.log(param);
					} else if (tempFunctionSym.name === 'tick') {
						opCode = code[++codeIndex];
						const date = new Date();
						const value = Date.UTC(
							date.getFullYear(),
							date.getMonth(),
							date.getDate(),
							date.getHours(),
							date.getMinutes(),
							date.getSeconds(),
							date.getMilliseconds()
						);
						frame.oprandStack.push(value);
					} else if (tempFunctionSym.name === 'integer_to_string') {
						opCode = code[++codeIndex];
						numValue = frame.oprandStack.pop();
						frame.oprandStack.push(numValue.toString());
					} else {
						frame.returnIndex = codeIndex + 1;
						const lastFrame = frame;
						frame = new StackFrame(tempFunctionSym);
						this.callStack.push(frame);

						const paramCount = (
							tempFunctionSym.theType as FunctionType
						).paramTypes.length;
						for (let i = paramCount - 1; i >= 0; i--) {
							frame.localVars[i] = lastFrame.oprandStack.pop();
						}
						if (frame.funtionSym.byteCode !== null) {
							code = frame.funtionSym.byteCode;
							codeIndex = 0;
							opCode = code[codeIndex];
							continue;
						} else {
							console.log(
								'Can not find code for ' + frame.funtionSym.name
							);
							return -1;
						}
					}
					continue;
				case OpCode.ifeq:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					if (frame.oprandStack.pop() === 0) {
						codeIndex = (byte1 << 8) | byte2;
						opCode = code[codeIndex];
					} else {
						opCode = code[++codeIndex];
					}
					continue;
				case OpCode.ifne:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					if (frame.oprandStack.pop() !== 0) {
						codeIndex = (byte1 << 8) | byte2;
						opCode = code[codeIndex];
					} else {
						opCode = code[++codeIndex];
					}
					continue;
				case OpCode.if_icmplt:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					if (vleft < vright) {
						codeIndex = (byte1 << 8) | byte2;
						opCode = code[codeIndex];
					} else {
						opCode = code[++codeIndex];
					}
					continue;
				case OpCode.if_icmpge:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					if (vleft >= vright) {
						codeIndex = (byte1 << 8) | byte2;
						opCode = code[codeIndex];
					} else {
						opCode = code[++codeIndex];
					}
					continue;
				case OpCode.if_icmpgt:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					if (vleft > vright) {
						codeIndex = (byte1 << 8) | byte2;
						opCode = code[codeIndex];
					} else {
						opCode = code[++codeIndex];
					}
					continue;
				case OpCode.if_icmple:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					vright = frame.oprandStack.pop();
					vleft = frame.oprandStack.pop();
					if (vleft <= vright) {
						codeIndex = (byte1 << 8) | byte2;
						opCode = code[codeIndex];
					} else {
						opCode = code[++codeIndex];
					}
					continue;
				case OpCode.goto:
					byte1 = code[++codeIndex];
					byte2 = code[++codeIndex];
					codeIndex = (byte1 << 8) | byte2;
					opCode = code[codeIndex];
					continue;
				default:
					console.log('Unknown op code: ' + opCode.toString(16));
					return -2;
			}
		}
	}
}

export class BCModuleWriter {
	private types: Type[] = [];

	private writeString(bc: number[], str: string) {
		bc.push(str.length);
		bc.push(...[...str].map((s) => s.charCodeAt(0)));
	}

	write(bcModule: BCModule): number[] {
		let bc2: number[] = [];
		this.types = [];
		let numConsts = 0;
		for (const c of bcModule.consts) {
			if (typeof c === 'number') {
				bc2.push(1);
				bc2.push(c);
				numConsts++;
			} else if (typeof c === 'string') {
				bc2.push(2);
				this.writeString(bc2, c);
				numConsts++;
			} else if (typeof c === 'object') {
				const functionSym = c as FunctionSymbol;
				if (!built_ins.has(functionSym.name)) {
					bc2.push(3);
					bc2 = bc2.concat(this.writeFunctionSymbol(functionSym));
					numConsts++;
				}
			}
		}

		let bc1: number[] = [];
		this.writeString(bc1, 'types');
		bc1.push(this.types.length);

		for (const t of this.types) {
			if (Type.isFunctionType(t)) {
				bc1 = bc1.concat(this.writeFunctionType(t as FunctionType));
			} else if (Type.isSimpleType(t)) {
				bc1 = bc1.concat(this.writeSimpleType(t as SimpleType));
			} else if (Type.isUnionType(t)) {
				bc1 = bc1.concat(this.writeUnionType(t as UnionType));
			} else {
				console.log('Unsupported type in BCModuleWriter');
				console.log(t);
			}
		}

		this.writeString(bc1, 'consts');
		bc1.push(numConsts);
		return bc1.concat(bc2);
	}
	private writeVarSymbol(sym: VarSymbol): number[] {
		const bc: number[] = [];

		//写入变量名称
		this.writeString(bc, sym.name);

		//写入类型名称
		this.writeString(bc, sym.theType.name);
		if (
			!SysTypes.isSysType(sym.theType) &&
			this.types.indexOf(sym.theType) === -1
		) {
			this.types.push(sym.theType);
		}

		return bc;
	}
	private writeFunctionSymbol(sym: FunctionSymbol): number[] {
		let bc: number[] = [];
		//写入函数名称
		this.writeString(bc, sym.name);

		//写入类型名称
		this.writeString(bc, sym.theType.name);
		if (
			!SysTypes.isSysType(sym.theType) &&
			this.types.indexOf(sym.theType) === -1
		) {
			this.types.push(sym.theType);
		}
		bc.push(sym.opStackSize);

		bc.push(sym.vars.length);

		//逐一写入变量
		//TODO：其实具体变量的信息不是必需的。
		for (const v of sym.vars) {
			bc = bc.concat(this.writeVarSymbol(v));
		}

		//写入函数函数体的字节码
		if (sym.byteCode === null) {
			//内置函数
			bc.push(0);
		} else {
			//自定义函数
			bc.push((sym.byteCode as number[]).length);
			bc = bc.concat(sym.byteCode as number[]);
		}

		return bc;
	}

	writeFunctionType(t: FunctionType): number[] {
		const bc: number[] = [];

		bc.push(2); //代表FunctionType

		//写入类型名称
		this.writeString(bc, t.name);

		//写入返回值名称
		this.writeString(bc, t.returnType.name);

		//写入参数数量
		bc.push(t.paramTypes.length);

		//写入参数的类型名称
		for (const pt of t.paramTypes) {
			this.writeString(bc, pt.name);
			if (this.types.indexOf(pt) === -1) {
				this.types.push(pt);
			}
		}

		return bc;
	}

	writeSimpleType(t: SimpleType): number[] {
		const bc: number[] = [];
		if (SysTypes.isSysType(t)) {
			//内置类型不用添加
			return bc;
		}

		bc.push(1); //代表SimpleType

		//写入类型名称
		this.writeString(bc, t.name);

		//写入父类型的数量
		bc.push(t.upperTypes.length);
		for (const ut of t.upperTypes) {
			this.writeString(bc, ut.name);
			if (!SysTypes.isSysType(ut) && this.types.indexOf(ut) === -1) {
				this.types.push(ut);
			}
		}

		return bc;
	}

	writeUnionType(t: UnionType): number[] {
		const bc: number[] = [];

		bc.push(3); //代表UnionType

		//写入类型名称
		this.writeString(bc, t.name);

		//写入联合的各类型名称
		for (const ut of t.types) {
			this.writeString(bc, ut.name);
			if (this.types.indexOf(ut) === -1) {
				this.types.push(ut);
			}
		}

		return bc;
	}
}

export class BCModuleReader {
	private index = 0;
	private types: Map<string, Type> = new Map();
	private typeInfos: Map<string, any> = new Map();

	private addSystemTypes() {
		this.types.set('any', SysTypes.Any);
		this.types.set('number', SysTypes.Number);
		this.types.set('string', SysTypes.String);
		this.types.set('integer', SysTypes.Integer);
		this.types.set('decimal', SysTypes.Decimal);
		this.types.set('boolean', SysTypes.Boolean);
		this.types.set('null', SysTypes.Null);
		this.types.set('undefined', SysTypes.Undefined);
		this.types.set('void', SysTypes.Void);
	}

	private readString(bc: number[]): string {
		const len = bc[this.index++];
		let str = '';
		for (let i = 0; i < len; i++) {
			str += String.fromCharCode(bc[this.index++]);
		}
		return str;
	}

	private readSimpleType(bc: number[]) {
		const typeName = this.readString(bc);
		const numUpperTypes = bc[this.index++];
		const upperTypes: string[] = [];
		for (let i = 0; i < numUpperTypes; i++) {
			upperTypes.push(this.readString(bc));
		}

		const t = new SimpleType(typeName, []);
		this.types.set(typeName, t);
		this.typeInfos.set(typeName, upperTypes);
	}

	private readFunctionType(bc: number[]) {
		const typeName = this.readString(bc);
		const returnType = this.readString(bc);
		const numParams = bc[this.index++];
		const paramTypes: string[] = [];
		for (let i = 0; i < numParams; i++) {
			paramTypes.push(this.readString(bc));
		}

		const t = new FunctionType(SysTypes.Any, [], typeName);
		this.types.set(typeName, t);
		this.typeInfos.set(typeName, {
			returnType: returnType,
			paramTypes: paramTypes
		});
	}

	private readUnionType(bc: number[]) {
		const typeName = this.readString(bc);
		const numTypes = bc[this.index++];
		const unionTypes: string[] = [];
		for (let i = 0; i < numTypes; i++) {
			unionTypes.push(this.readString(bc));
		}

		const t = new UnionType([], typeName);
		this.types.set(typeName, t);
		this.typeInfos.set(typeName, unionTypes);
	}

	private readVarSymbol(bc: number[]): VarSymbol {
		//变量名称
		const varName = this.readString(bc);

		//类型名称
		const typeName = this.readString(bc);
		const varType = this.types.get(typeName) as Type;

		return new VarSymbol(varName, varType);
	}

	private readFunctionSymbol(bc: number[]): FunctionSymbol {
		//函数名称
		const functionName = this.readString(bc);

		//读取类型名称
		const typeName = this.readString(bc);
		const functionType = this.types.get(typeName) as FunctionType;

		//操作数栈的大小
		const opStackSize = bc[this.index++];

		//变量个数
		const numVars = bc[this.index++];

		//读取变量
		const vars: VarSymbol[] = [];
		for (let i = 0; i < numVars; i++) {
			vars.push(this.readVarSymbol(bc));
		}

		//读取函数体的字节码
		const numByteCodes = bc[this.index++];
		let byteCodes: number[] | null;
		if (numByteCodes === 0) {
			//系统函数
			byteCodes = null;
		} else {
			byteCodes = bc.slice(this.index, this.index + numByteCodes);
			this.index += numByteCodes;
		}

		//创建函数符号
		const functionSym = new FunctionSymbol(functionName, functionType);
		functionSym.vars = vars;
		functionSym.opStackSize = opStackSize;
		functionSym.byteCode = byteCodes;

		return functionSym;
	}

	read(bc: number[]): BCModule {
		this.index = 0;
		this.types.clear();
		const bcModule = new BCModule();
		this.addSystemTypes();

		let str = this.readString(bc);
		assert(str === 'types', "从字节码中读取的字符串不是'types'");
		const numTypes = bc[this.index++];
		for (let i = 0; i < numTypes; i++) {
			const typeKind = bc[this.index++];
			switch (typeKind) {
				case 1:
					this.readSimpleType(bc);
					break;
				case 2:
					this.readFunctionType(bc);
					break;
				case 3:
					this.readUnionType(bc);
					break;
				default:
					console.log('Unsupported type kind: ' + typeKind);
			}
		}

		this.buildTypes();

		str = this.readString(bc);
		assert(str === 'consts', "从字节码中读取的字符串不是'consts'");
		const numConsts = bc[this.index++];
		for (let i = 0; i < numConsts; i++) {
			const constType = bc[this.index++];
			if (constType === 1) {
				bcModule.consts.push(bc[this.index++]);
			} else if (constType === 2) {
				const str = this.readString(bc);
				bcModule.consts.push(str);
			} else if (constType === 3) {
				const functionSym = this.readFunctionSymbol(bc);
				bcModule.consts.push(functionSym);
				if (functionSym.name === 'main') {
					bcModule._main = functionSym;
				}
			} else {
				console.log('Unsupported const type: ' + constType);
			}
		}
		return bcModule;
	}

	private buildTypes() {
		for (const typeName of this.typeInfos.keys()) {
			const t = this.types.get(typeName) as Type;
			if (Type.isSimpleType(t)) {
				const simpleType = t as SimpleType;
				const upperTypes = this.typeInfos.get(typeName) as string[];
				for (const utName of upperTypes) {
					const ut = this.types.get(utName) as Type;
					simpleType.upperTypes.push(ut);
				}
			} else if (Type.isFunctionType(t)) {
				const funtionType = t as FunctionType;
				const returnType = this.typeInfos.get(typeName)
					.returnType as string;
				const paramTypes = this.typeInfos.get(typeName)
					.paramTypes as string[];
				funtionType.returnType = this.types.get(returnType) as Type;
				for (const utName of paramTypes) {
					const ut = this.types.get(utName) as Type;
					funtionType.paramTypes.push(ut);
				}
			} else if (Type.isUnionType(t)) {
				const unionType = t as UnionType;
				const types = this.typeInfos.get(typeName) as string[];
				for (const utName of types) {
					const ut = this.types.get(utName) as Type;
					unionType.types.push(ut);
				}
			} else {
				console.log('Unsupported type in BCModuleReader.');
				console.log(t);
			}
		}

		this.typeInfos.clear();
	}
}
