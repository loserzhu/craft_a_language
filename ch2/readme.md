## ch2. A Super Tiny Compiler(implements a simple tokenizer) parsing programs into AST

### Input:

```javascript
// function definition
function greet() {
	println('Hello World!');
}
/**
 * function call
 */
greet();
```

### Tokens:

```javascript
{kind: 0, text: 'function'}
{kind: 1, text: 'greet'}
{kind: 3, text: '('}
{kind: 3, text: ')'}
{kind: 3, text: '{'}
{kind: 1, text: 'println'}
{kind: 3, text: '('}
{kind: 2, text: 'Hello World!'}
{kind: 3, text: ')'}
{kind: 3, text: ';'}
{kind: 3, text: '}'}
{kind: 1, text: 'greet'}
{kind: 3, text: '('}
{kind: 3, text: ')'}
```

### AST:

```txt
Prog
	FunctionDecl greet
		FunctionBody
			FunctionCall println, not resolved
				Params: Hello World!
	FunctionCall greet, not resolved
```

### AST after resolving definition assignment:

```
Prog
	FunctionDecl greet
		FunctionBody
			FunctionCall println, not resolved
				Params: Hello World!
	FunctionCall greet, resolved
```
