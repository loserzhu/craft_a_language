## ch3. A Super Tiny Compiler parsing programs into AST

find FIRST and FOLLOW sets for a given grammar so that the parser can properly apply the needed rule at the correct position.

features:

1. function declare(without parameter)
2. function call
3. variables
4. types
5. unary & binary expression (partial)

pseudo ENBF

```
  prog = statementList? EOF;
  statementList = (variableDecl | functionDecl | expressionStatement)+ ;
  typeAnnotationn : ':' typeName;
  functionDecl: "function" Identifier "(" ")"  functionBody;
  functionBody : '{' statementList? '}' ;
  statement: variableDecl | functionDecl | expressionStatement;
  expressionStatement: expression ';' ;
  expression: primary (binOP primary) ;
  primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
  binOP: '+' | '-' | '' | '/' | '=' | '+=' | '-=' | '=' | '/=' | '==' | '!=' | '<=' | '>=' | '<'
       | '>' | '&&'| '||'|...;
  functionCall : Identifier '(' parameterList? ')' ;
  parameterList : expression (',' expression) ;

```

input: test
output tokens:

```
{ kind: 0, text: 'let' }
{ kind: 1, text: 'myAge' }
{ kind: 7, text: ':' }
{ kind: 1, text: 'number' }
{ kind: 8, text: '=' }
{ kind: 3, text: '18' }
{ kind: 7, text: ';' }
{ kind: 1, text: 'myAge' }
{ kind: 8, text: '=' }
{ kind: 1, text: 'myAge' }
{ kind: 8, text: '+' }
{ kind: 3, text: '10' }
{ kind: 7, text: ';' }
{ kind: 1, text: 'println' }
{ kind: 7, text: '(' }
{ kind: 2, text: 'myAge is: ' }
{ kind: 7, text: ')' }
{ kind: 7, text: ';' }
{ kind: 1, text: 'println' }
{ kind: 7, text: '(' }
{ kind: 1, text: 'myAge' }
{ kind: 7, text: ')' }
{ kind: 7, text: ';' }

```

AST

```
Prog
    VariableDecl myAge, type: number
        18
    ExpressionStatement
        Binary:=
            Variable: myAge, not resolved
            Binary:+
                Variable: myAge, not resolved
                10
    ExpressionStatement
        FunctionCall println, not resolved
            myAge is:
    ExpressionStatement
        FunctionCall println, not resolved
            Variable: myAge, not resolved
```

AST after resolving reference:

```
Prog
Prog
    VariableDecl myAge, type: number
        18
    ExpressionStatement
        Binary:=
            Variable: myAge, resolved
            Binary:+
                Variable: myAge, resolved
                10
    ExpressionStatement
        FunctionCall println, not resolved
            myAge is:
    ExpressionStatement
        FunctionCall println, not resolved
            Variable: myAge, not resolved
```

running

```
myAge is:
28
```
