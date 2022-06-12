## ch3. A Super Tiny Compiler parsing programs into AST

features:

1. function declare
2. function call
3. variables
4. types
5. unary & binary expresstion (partial)

find FIRST and FOLLOW sets for a given grammar so that the parser can properly apply the needed rule at the correct position.

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
