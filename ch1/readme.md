## ch1. A Super Tiny Parser (given an array of tokens and parse it to AST)

pseudo ENBF:

```
prog = parseProg()；
prog = (functionDecl | functionCall)* ;

functionDecl: "function" Identifier "(" ")"  functionBody;
functionBody : '{' functionCall* '}' ;
functionCall : Identifier '(' parameterList? ')' ;
parameterList : StringLiteral (',' StringLiteral)* ;
```
