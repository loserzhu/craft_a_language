import {TokenKind, Scanner, CharStream} from './scanner';
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
	Variable
} from './ast';
import {Parser} from './parser';
import fs from 'fs';

const compileAndRun = (program: string) => {
	//源代码
	console.log('源代码:');
	console.log(program);

	//词法分析
	console.log('\n词法分析结果:');
	let tokenizer = new Scanner(new CharStream(program));
	while (tokenizer.peek().kind !== TokenKind.EOF) {
		console.log(tokenizer.next());
	}
	tokenizer = new Scanner(new CharStream(program)); //重置tokenizer,回到开头。

	//语法分析
	const prog: Prog = new Parser(tokenizer).parseProg();
	console.log('\n语法分析后的AST:');
	prog.dump('');
	/*
        //语义分析
        let symTable = new SymTable();
        new Enter(symTable).visit(prog);       //建立符号表
        new RefResolver(symTable).visit(prog); //引用消解
        console.log("\n语义分析后的AST，注意变量和函数已被消解:");
        prog.dump("");
    
        //运行程序
        console.log("\n运行当前的程序:");
        let retVal = new Intepretor().visit(prog);
        console.log("程序返回值：" + retVal);
        */
};

// 要求命令行的第三个参数，一定是一个文件名。
if (process.argv.length < 3) {
	console.log('Usage: node ' + process.argv[1] + ' FILENAME');
	process.exit(1);
}

// 读取源代码
const filename = process.argv[2];
fs.readFile(filename, 'utf8', function (err: any, data: string) {
	if (err) throw err;
	compileAndRun(data);
});
