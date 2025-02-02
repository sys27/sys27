---
title: "Parsers Part 3: Reverse Polish Notation"
description: Using Reverse Polish Notation for parsing mathematical expressions.
tags: lexing, parsing, compilers
date: 2025-02-02
---

Series:
- [Parsers Part 1: A Journey from Tokens to Syntax Trees](../2024/23-parsing-approaches-part-1.md)
- [Parsers Part 2: Understanding Recursive Descent Parser](./24-parsing-approaches-part-2.md)
- [Parsers Part 3: Reverse Polish Notation (this post)](./25-parsing-approaches-part-3.md)

Hello there!

# Intro

In this article, we're going to explore what Reverse Polish Notation (RPN) is and how to apply it to the parsing. RPN is not directly related to parsers but, in some cases, it allows to simplify the implementation. Mostly, it is useful for mathematical parsers.

# Bonus Part: Reverse Polish Notation

There are several kinds of mathematical notations - the order in which operands and operators are specified. Our usual human-readable notation is called _"infix notation"_ (`2 + 2`), where `2` - is an operand, `+` is an operator. But you can specify them in a different order, for example, `2 2 +`. It is called _"postfix notation"_ or _"Reverse Polish Notation"_.

Let's look at the definition on [wiki](https://en.wikipedia.org/wiki/Reverse_Polish_notation):

> Reverse Polish notation (RPN) is a mathematical notation in which operators follow their operands. The notation does not need any parentheses for as long as each operator has a fixed number of operands.

So, according to this description, we don't need to use any parentheses to change the order of evaluation. The notation by itself has strict order. For example: `(2 + 2) * 2`. In this expression, we added parentheses to change the priority of the `+` operator. But in RPN the same expression will look like: `2 2 + 2 *`.

This is the main "feature" of this notation. It allows for a simpler parsing process because you don't need to manually handle parentheses or operator priority. It is built into the notation.

To build a mathematical parser based on RPN, you don't need to use the Top-Down or Bottom-up approaches described in previous articles. They are completely unrelated here. You just need to implement two algorithms. The first one is to convert the infix notation to RPN. The second one is RPN evaluation algorithms. These two algorithms are pretty simple and described in a lot of articles with pseudo-code examples. So, I won't provide any specific implementations here. I believe you can find it easily by yourself.

However, there is a downside to using RPN for parsers. As I mentioned before, it is suitable for mathematical parsers but if you need to extend it to support more functions/grammar rules, it could lead to complex and unclear algorithms. For example, if you need to handle functions with a variable amount of parameters. In this case, it is better to implement a recursive descent parser.

# Conclusion

In this article, I've shown an alternative approach to implementing mathematical parsers - Reverse Polish Notation (RPN). It allows to eliminate the need for parentheses and operator precedence rules. However, while RPN simplifies the parsing process, it is not a one-size-fits-all solution. Extending it beyond basic arithmetic to support more complex grammar rules can lead to increased complexity and reduced readability.

If your goal is to build a simple and efficient mathematical expression parser, RPN can be a great choice. However, for more feature-rich parsers, traditional approaches like recursive descent might be more suitable.