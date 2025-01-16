---
title: "Parsers Part 2: Understanding Recursive Descent Parser"
description: Learn how recursive descent parsers work, their advantages, challenges like left recursion, and why they’re ideal for custom parsing in this article.
tags: lexing, parsing, compilers
date: 2025-01-16
---

Series:
- [Parsers Part 1: A Journey from Tokens to Syntax Trees](./23-parsing-approaches-part-1.md)
- [Parsers Part 2: Understanding Recursive Descent Parser](./24-parsing-approaches-part-2.md)

Hello there!

# Intro

This is a second article about parsers. Please check out the first part [Parsers Part 1: A Journey from Tokens to Syntax Trees](./23-parsing-approaches-part-1.md), which sets the ground for understanding parsing concepts. In this article, we'll focus on recursive descent parsers, a practical example of top-down parsing, and explore their benefits, challenges, and implementation details.

# Parser types

There are two major types of parsers. Top-down (LL) and Bottom-up (LR) and I will briefly describe them in this section. 

## Top-down (LL) parsers

Top-down parsers start the parsing from the root grammar rule, match it against input, and go to nested rules. It builds an Abstract Syntax Tree (AST) from top to bottom, and processes input from left to right. We already looked at the example of such a parser in the [previous article](./23-parsing-approaches-part-1.md). Our parser analyzed `EXPRESSION` rule, then `ADD` rule, then `MUL` rule, etc.

Top-down parsers are good for small hand implementations and own programming languages. It's easy to understand how they work and how to implement them even if you have limited knowledge about parsers at all.

But they aren't perfect. They have one big disadvantage - left recursion. The left recursion is a specific type of grammar rule where a rule contains a reference to itself. So, it could create indefinite recursions.

Let's look at the following rule:

```
ADD = ADD + NUMBER
    | NUMBER
```

At first glance, it is ok. Because it allows our parser to analyze more than our addition like: `2 + 2 + 2`. But if we try to build a top-down parser for such grammar, we will face the left recursion problem. To parse the `ADD` rule, we need to parse the `ADD` rule... and so on.

There is a solution for this problem and usually, it requires rewriting your grammar a little bit like so:

```
ADD = NUMBER + ADD
    | NUMBER
```

This grammar doesn't have a left recursion but still supports multiple addition expressions. And you will be able to create a top-down parser for such grammar, and parse `2 + 2 + 2`.

## Bottom-up (LR) parsers

The alternative to top-down parsers is bottom-up. Whereas a top-down parser analyzes input starting from "top-level" structures and on each step goes deeper and deeper. Bottom-up parsers work in the opposite way. It starts from the deepest level rule and finds its way to the top.

One of the benefits of bottom-up parsers, they can handle left recursive rules but as you saw in the previous section, even top-down parsers have an easy workaround to fix this problem.

In this series, I won't explain the details of how bottom-up parsers work and how to build them.

## Parser generators

I have explained only "hand-made parsers", so far. But a long time ago, developers created several tools to generate a parser like [YACC](https://en.wikipedia.org/wiki/Yacc), [Antlr](https://en.wikipedia.org/wiki/ANTLR), [Bison](https://en.wikipedia.org/wiki/GNU_Bison), and etc. You don't need to implement a lexer, or a parse by yourself. You just need to define a grammar and pass it to the tool of your choice and it will generate source code for any supported programming language. Later, you can integrate this source code into your application.

And yes, it might sound like a perfect solution to use such tools and reduce the effort for custom parser development. But I don't think that it is a good idea to use parser generators at all. They create a machine-generated code and no one expects you to understand or even debug it. So, you need to learn the parse generator tool, define grammar, generate the code and if it works incorrectly, you need to understand why and fix it. It doesn't look like "much less effort", especially for complex grammar (like in programming languages).

From my experience, it is easier to develop a custom lexer/parser/etc for your specific needs. In this way, you will understand the details of parsing, will be in full control of your code, and will be able to implement any rule. Most importantly, any developer can join the project because the source code is plain, human-readable code. No magic generated code.

## Recursive descent parser

Recursive Descent Parser is a top-down parser. It is built from a set of functions to parse each rule in the grammar. These functions call each other which creates a recursion. That's why it is called that way.

Let's look at the grammar from the [previous article](./23-parsing-approaches-part-1.md):

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

_In this article, we will ignore the lexical analysis and will consider only the syntax analysis. So, let's assume they already have a list of tokens._

Here is a pseudo-code for this grammar:

```csharp
class Parser
{
    public IExpression ParseExpression()
    {
        // consume tokens
        return ParseAdd();
    }

    private IExpression ParseAdd()
    {
        // consume tokens
        var left = ParseOperand();
        var right = ParseOpearand();

        return new Add(left, right);
    }

    private IExpression ParseMul()
    {
        // consume tokens
        var left = ParseOperand();
        var right = ParseOpearand();

        return new Mul(left, right);
    }

    private IExpression ParseOperand()
    {
        // consume tokens
        // create operand expression, eg. Number
        return new Number(...);
    }
}
```

This code omits some details, like error handling, optional parameters, or consuming tokens. But it's enough to demonstrate the idea of a recursive descend parser.

We start from the root of our AST - `EXPRESSION`. And then try to parse another nested expression according to our grammar. If we find and consume the required tokens, we create an expression. The overall process will follow the same step as described in [Syntax analysis, parsing](./23-parsing-approaches-part-1.md).

# Conclusion

In this article, we explored different types of parsers, focusing on recursive descent parsers. We explored the advantages of top-down parsers and their limitations. The recursive descent parser offers clarity and control over the parsing process. It is an excellent tool for custom parsers tailored to specific needs (domain-specific languages or programming languages).

Stay tuned for the next part of the series. We will look at [Reverse Polish Notation](https://en.wikipedia.org/wiki/Reverse_Polish_notation).
