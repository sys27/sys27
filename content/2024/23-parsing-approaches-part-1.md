---
title: "Parsers Part 1: A Journey from Tokens to Syntax Trees"
description: The fundamentals of parsing, from tokenization to syntax trees.
tags: lexing, parsing, compilers
date: 2024-12-18
---

Series:
- [Parsers Part 1: A Journey from Tokens to Syntax Trees (this post)](./23-parsing-approaches-part-1.md)
- [Parsers Part 2: Understanding Recursive Descent Parser](./24-parsing-approaches-part-2.md)

Hello there!

# Intro

In this series of articles, I want to share my knowledge about different parsing techniques. We'll start with the basics and gradually dive into practical examples, building a strong foundation for understanding how parsers work and how they fit into the larger process of interpreting or compiling code.

# Basics of lexing/parsing/semantics/etc.

So, let's start from the basics. Usually, "parsing" is a broad term and refers to the process of analyzing and transforming a text into an object representation of this text according to defined rules (grammar). But in this series, I will discuss the parsing related to programming languages only.

The parsing process consists of several stages, such as lexical analysis, syntax analysis, semantic analysis, optimizations, code generation, etc.

## Lexical analysis, lexing, tokenization

The first step of the parsing is lexing or tokenization. It is a process of deviding the input text into tokens - a small meaningful piece of input, group of characters. Even though, it is not a required step but it simplifies the processing of text on next stages. You no longer need to work with raw strings, everything is a token.

Let's take a look at an example. I want to parse the "2 + 2 * 2" math expression and evaluate it later. And first of all, we need to convert this expression into tokens.

What type of characters do you see?

Clearly, there are numbers, operations, and whitespaces. So, we can define these groups of characters by regexps:

```
TOKENS = NUMBERS 
       | OPERATORS
       | WHITESPACES

NUMBERS     = (\d+)
OPERATORS   = '+' | '*'
WHITESPACES = ' '
```

_NOTE: This is a grammar. It defines a set of rules that our input has to follow otherwise it is not valid. The grammar is quite easy to read. Each rule has two parts. The first one (before the '=' symbol) is a rule name. The second one (after the '=' symbol) is a body. It can be defined by regexp or constant characters, in the case of tokens. Or it can be based on other rules, for example, `TOKENS`. It's a composite rule which combines `NUMBERS`, `OPERATORS`, and `WHITESPACES` into one rule by using the pipe '|' symbol._

Let's apply this grammar to our input string. The resulting list of tokens will look something like this:

- NUMBERS:    2
- WHITESPACES
- OPERATORS:  +
- WHITESPACES
- NUMBERS:    2
- WHITESPACES
- OPERATORS:  *
- WHITESPACES
- NUMBERS:    2

And on later stages, we don't need to parse any numbers any more. They are already parsed in tokens, if a token has the `NUMBERS` type, it means we already have a number.

In a code, tokens can be represented by a single class or structure with several fields like: a token type and a value to numbers.

## Syntax analysis, parsing

Syntax analysis (parsing) - is one of main steps. It's pursupe to validate your input data against rules (grammar) and build AST (Abstract Syntax Tree). It is an hierarchical data structure that represents your input data. Each node in this tree will represent some part of the input expression.

The syntax analysis uses tokes obtained from the lexical analysis as its input. Even though it is not required some parsers could process input string directly without lexical analysis. Here, in this article, I will provide examples of using lexers.

For example, we have the "2 + 2 * 2" expression and in the previous stage, we've converted it into the list of tokens (I removed `WHITESPACES` tokens because they aren't important for this part):

- NUMBERS:    2
- OPERATORS:  +
- NUMBERS:    2
- OPERATORS:  *
- NUMBERS:    2

Let's extend our existing grammar and add some parsing rules:

```
TOKENS = NUMBERS 
       | OPERATORS
       | WHITESPACES

NUMBERS     = (\d+)
OPERATORS   = PLUS | STAR
PLUS        = '+'
STAR        = '*'
WHITESPACES = ' '

EXPRESSION = ADD

ADD = MUL (PLUS MUL)*
MUL = OPERAND (STAR OPERAND)*
OPERAND = NUMBERS
```

_where the '*' symbol means zero or more matches._

It's a simplified version of grammar that supports only numbers and two operators: plus and multiply. In our case, the `OPERAND` rule is just a number but in more complex grammars, it could contain other types like variables or different literals (booleans, strings, etc). `ADD` and `MUL` rules are responsible for parsing two operators respectively. The way these rules are defined is important because it adds a correct precedence of operators. '*' will always have a higher priority than '+'

So, let's try to follow our grammar step-by-step to understand how it works. The parser will iterate over the tokens list and try to match them against the defined grammar. 

The first token is `NUMBERS: 2`. Does it match any rule? Is it `EXPRESSION`? We don't know it yet. Let's follow this rule, basically, `EXPRESSION` is `ADD`. Now, the parser needs to check it against `ADD` but it is also a "composite" rule, so we can't confirm `NUMBERS: 2` matches it. The parser should go one level deeper and check `MUL` and again, we can't confirm anything. We need to process `OPERAND` and we got a match. `OPERAND` is `NUMBERS`. At this point, we matched our first rule. Unfortunately, the grammar doesn't define any actions. Yeah, we matched something but what do we need to do with it? We need to start to build a tree. `NUMBERS: 2` will become our first node:

```
2
```

To match the first rule, we went recursively from the root rule `EXPRESSION` to the last one `OPERAND` (`EXPRESSION` -> `ADD` -> `MUL` -> `OPERAND`). But we haven't processed all possible paths. The `OPERAND` rule is fully matched. We can't match any additional tokens. Now, we need to go back to the `MUL` rule. We matched the first `OPERAND` but there is the second optional part: `(STAR OPERAND)*`. The first `NUMBERS: 2` token is matched, so the parser will advance by one position to the `OPERATORS: +` token. Can we match it? No, because `(STAR OPERAND)*` expects a star token which is a '\*' symbol. So, do we have an invalid input? The part of the rule is marked by '\*' at the end. It means that this part could match zero or multiple times. In this case, no, the input isn't invalid. We just matched this part zero times and didn't create any new nodes.

Now, we need to move one level upper from `MUL` back to `ADD`. We haven't processed `(PLUS MUL)*` yet. Does it match? Maybe, because we can't definitely say it fully matches our input string. But at least it starts from the `PLUS` token which is what we are expecting. The parser can advance one position further because we found a match. The next token is `NUMBERS: 2` and the next rule is `MUL` again. I don't want to repeat the explanation for this case because it is pretty much the same as the very first token. So, the parse will start to process the `MUL` rule and go to `OPERAND`, and will match `NUMBERS: 2` to it. Nothing special, so far, we matched to numbers and operators and the tree will look something like:

```
  ?
 / \
2   ?
   / \
  2   ?
```

It has a lot of question marks because we haven't finished parsing of `ADD` and `MUL` rules yet. After the parse matches the second '2', it will advance to the next token: `OPERATORS: *`. And it will try to match it against `MUL` rule. Now, we have a match, we have a '\*' symbol. Advance to the last token: `NUMBERS: 2` and the last part of `MUL`: `OPERAND)*`. So, again, we will match `NUMBERS: 2` to `OPERAND` but not the whole `MUL` rule is completed. We matched the first operand and the second operand. Now, the parser can create a new node - a multiplication expression. Here is the tree:

```
  ?
 / \
2   *
   / \
  2   2
```

And only the last part left. We consumed all tokens but we haven't finished with the `ADD` rule. We mached the first `MUL` and a plus symbol and on the previous step we created the last `MUL`. So, we can finish our `ADD` rule and create one additional node - a addition expression.

```
  +
 / \
2   *
   / \
  2   2
```

It is our final tree. We consumed all tokens and processed all rules. This algorithm shows a basic approach to how parsers work. In the next article, I will show different algorithms to implement a parser.

## Semantic analysis and other steps

In the previous step, we built the AST tree. It is useless by itself. Yeah, we parser the input and can confirm that it is valid to some point. But what next? You can add more steps, which we will discuss shortly, to your parsing process. Usually, all these steps will be based on [Visitor Pattern](https://en.wikipedia.org/wiki/Visitor_pattern) to traverse the tree.

The next step is a semantic analysis. While the parser validates our input against grammar, the semantic analysis checks the semantics of the input (whether it makes sense for this specific language) and includes more complex validations, like type checking. For example, we have a math parser with supports numbers and boolean types and we have the "2 + true" expression. From the parser's point of view, this expression is completely valid. '2' and 'true' are operands separated by the '+' operator. But in the semantic analysis step, we can catch this error.

Optimizations and Code Generation. The two steps are optional and self explanatory. They are pretty important in real compilers/programming languages. Everyone wants to squize last bits of performance from their languages/compilers/runtimes.

Evaluation. It is an optional step and an alternative to Code Generation. For our simple grammar, we don't need any code generation at all. We can implement an "evaluator", it would walk a tree and compute expressions. But even in real-world languages, this step could be implemented in the form of a runtime or a virtual machine.

All these steps won't be covered in this series.

# Conclusion

In this article, we explored the fundamental stages of parsing, including lexical and syntax analysis, and touched the subsequent steps in the compilation pipeline like semantic analysis, optimizations, and code generation.

Stay tuned for the next article in this series, where we will dive deeper into specific parsing techniques and algorithms.
