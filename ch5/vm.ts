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
import {Symbol} from '../ch9/symbol';

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
