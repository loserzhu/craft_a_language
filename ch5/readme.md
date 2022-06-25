### ch4. A Super Tiny Compiler parsing programs into AST

features:

1. support if, for, return statement.
2. block scope.

pseudo ENBF

```
prog = statementList? EOF;
statementList = (variableDecl | functionDecl | expressionStatement)+ ;
statement: block | expressionStatement | returnStatement | ifStatement | forStatement
         | emptyStatement | functionDecl | variableDecl ;
block : '{' statementList? '}' ;
ifStatement : 'if' '(' expression ')' statement ('else' statement)? ;
forStatement : 'for' '(' (expression | 'let' variableDecl)? ';' expression? ';' expression? ')' statement ;
variableStatement : 'let' variableDecl ';';
variableDecl : Identifier typeAnnotation？ ('=' expression)? ;
typeAnnotation : ':' typeName;
functionDecl: "function" Identifier callSignature  block ;
callSignature: '(' parameterList? ')' typeAnnotation? ;
returnStatement: 'return' expression? ';' ;
emptyStatement: ';' ;
expressionStatement: expression ';' ;
expression: assignment;
assignment: binary (assignmentOp binary)* ;
binary: unary (binOp unary)* ;
unary: primary | prefixOp unary | primary suffixOp ;
primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
assignmentOp = '=' | '+=' | '-=' | '*=' | '/=' | '>>=' | '<<=' | '>>>=' | '^=' | '|=' ;
binOp: '+' | '-' | '*' | '/' | '==' | '!=' | '<=' | '>=' | '<'
     | '>' | '&&'| '||'|...;
prefixOp = '+' | '-' | '++' | '--' | '!' | '~';
suffixOp = '++' | '--';
functionCall : Identifier '(' argumentList? ')' ;
argumentList : expression (',' expression)* ;
```

input: demo & fibonacci
