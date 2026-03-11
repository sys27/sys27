---
title: The "Reference vs Value Types" Interview Question Is Outdated
description: For years, .NET interviews have asked the same question. What’s the difference between reference and value types? Let’s look at why the question became popular, why it no longer reflects real-world development, and what interviewers should ask instead.
tags: dotnet, interview
date: 2026-03-07
---

Hello there!

# Intro

"What is the difference between Reference and Value Types in .NET?" I think every single .NET developer has received such a question on an interview at least once.

"The reference types are allocated on the heap and passed by reference. The value types are allocated on the stack and passed by value (copied)." And this is pretty much the default boring answer to it. I know everyone knows this is not a comprehensive answer. But the article is not about the "correct" answer, and let's agree it is good enough.

Do you think the question and the answer are correct? Do you see any problem with this question? Either way, I will try to explain why I think this interview question is outdated, does not reflect real-world `.NET` development skills, and is just bad.

# The Original Intent of the Question

I think this question appeared in interviews 15-20 years ago, when `.NET` became the real project, not just a proof of concept like `.NET Framework 1`.

At that time, we didn't have a lot of resources available to learn `.NET` (I wasn't around at that time, so treat it with a grain of salt). There was one book standing out from all others - Jeffrey Richter's "CLR via C#". It was a pretty popular and detailed book about `.NET` that could help with this question. But nothing else. The online documentation (`MSDN`, `YouTube`, etc.) wasn't so popular or didn't even exist. The `.NET` source code wasn't available because the project wasn't open-source like the modern `.NET`. You couldn't just clone the project and read the code.

At first glance, this question is about the stack and the heap in `.NET`, whether an engineer knows the difference in behaviour of reference and value types. Depending on an engineer's answers, it could also be about the memory allocation or GC. It was supposed to check the engineer's knowledge in these topics. And it truly did, considering the limited available learning resources.

If an engineer knew the difference between reference and value types, he probably read the "basic" book about `C#` and `.NET`. If he could elaborate on the memory allocation and GC, even without practical experience, we could assume he had deeper knowledge of `.NET`. Probably, he read and understood "CLR via C#" or something similar.

The overall intent of this question was pretty clear and reasonable.

# The Harsh Reality

Let's take a look at this question from the point of view of a modern interview.

## It Encourages Gatekeeping Rather than Genuine Assessment

The question became really popular. In my experience, 99% of interviewers ask it. But what does it mean?

The answer is pretty simple, it is everywhere. It is included in all "interview preparation guides", and even if the person doesn't use such guides, they will "know" the answer anyway, because it is asked every single time. I've tried to search for some interview preparation guides and popular .NET interview questions, just for fun, and this question (or some form of it) appeared everywhere. So, in the end, everyone knows the expected answer, even if they don't understand it.

Does it test any skills of an engineer? I don't think so, well, except for the interview preparation/passing skill. You are testing the skill to pass an interview, not .NET skills. It may reward people who studied interview prep guides, rather than those who build real systems. And I don't think that is what you are looking for.

## The Question Tests Knowledge That Rarely Matters in Real Projects

If you are working on a high-performance library or application, then yeah, you will probably need it. But even in this case, this question might not be so important. Building a reliable high-performance system is a whole other world, and "ref vs value types" is nothing in there.

No, it doesn't mean you don't need to know the difference between reference and value types at all. It means it is not so important compared to building a readable and maintainable code.

The GC in .NET is awesome and will be able to handle a lot of cases. Most developers don’t need to manually optimize stack/heap allocation. So, in a boring API backend, where you need to accept `JSON`, process it, and save it to DB. You shouldn't care about "ref vs value types" but instead try to create a reliable and maintainable system. Real performance concerns usually involve allocation patterns, GC pressure, etc. It is better to solve such micro-optimizations later, when (if) it is needed.

## It Reinforces Oversimplified or Sometimes Incorrect Models

On one of the interview prep sites, I saw a simple answer to the questions:

> Reference types are stored on the heap and passed by reference.
> Value types are stored on the stack and passed by value (copied).

Many developers incorrectly assume value types always go to the stack and reference types always go to the heap. The modern .NET has a lot of features built around memory optimizations and performance: passing structs by reference, "ref" structs, `Span<T>`, `Unsafe`, etc.

.NET 10 [introduced](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/runtime) some cool features like promoting structs to `CPU` registers (so your program won't access memory at all) or

> .NET 10 adds stack allocation for small arrays of value types and small arrays of reference types. It also includes escape analysis for local struct fields and delegates. (Objects that can't escape can be allocated on the stack.)

I believe next versions of .NET will introduce more cases for automatic stack allocation even for reference types.

Yes, the original statement is still a correct definition, but it is oversimplified.

# What Interviewers Should Ask Instead

Yay, the most interesting part - the "solution". But I have bad news for you: there's no silver bullet, and there's no "perfect" solution here. One might suggest to interview for the current project skill-set, or one might suggest to make a more general interview and checking reasoning skills or system design. Or even check everything at once on a live coding session. I think it is pretty clear that checking for raw academic knowledge is a really bad idea. You need to get a clear understanding of who you are trying to hire: an engineer or a walking encyclopedia? So, let's look at some ideas to make the interview better.

_I won't provide a list of questions to ask instead. It is your job to figure out what works best for your particular case._

## Testing Actual Reasoning Instead of Trivia

I personally prefer to ask candidates to reason through a small code snippet or a small task, discuss trade-offs, not definitions. Ideally, I shouldn't be a signle questions with a simple answer, but instead an open question that allows for a whole discussion or a question without a right answer at all (opinion-based question).

Let's look at some better examples, assuming you still want to check a knowledge between reference and value types, the memory management, GC.

Candidates for replacements are questions around "Recursive structs" like _"Can we build a binary tree or a linked list using structs as nodes instead of classes? If yes - how? If no why?"_. This question doesn't have a correct answer. _"Yes_ or _"No"_ are both incorrect answers. _"If yes - how? If no why?"_ is the most important part of the question.

This question heavily depends on the knowledge of the candidate, .NET/C# version, and personal preferences. The answer might be _"No"_ and the explanation is that .NET doesn't allow recursive structs (structs that include themselves) because any struct should have a predefined size, calculated at compile time to be able to allocate a sufficient amount of memory on the stack. But recursive structs could be of any size. The answer might be _"Yes"_ because you could use `unsafe` code and pointers, or a `class` wrapper, or create a custom data structure (like a list of structs where each struct is referenced by the index in this list), or something else.

This question allows several follow-ups. For instance, ask how he would modify the recursive data structure (add/remove item) to check understanding that structs are passed by value (copied). Suggest to use `ussafe` code. Discuss trade-offs from a maintainability perspective.

So, this question checks basic understanding of data structures, you don't need to explain what a linked list or a tree is. Checks the understanding of basic differences between structs and classes, and their limitations. The candidate will be able to demonstrate that he knows that structs are allocated on the stack. It causes some limitations, so, the compiler has to know the struct size but it won't be able to calculate it for the recursive data structures. In addition, he will be able to demonstrate knowledge in more advanced topics (like `unsafe`, `ref`, etc.).

In my opinion, this question asks the same thing as the "ref vs value types" question, but in a more interesting way. It doesn't expect the boring wiki-level answer, but is instead oriented on a discussion around the "ref vs value types" topic.

## Questions Reflecting Modern .NET Usage

The "ref vs value types" question doesn't really ask for anything related to memory management, except for the fact that each type is allocated. But usually, this question is followed by the same kind of encyclopedia questions: "GC and Generations", "Dispose pattern", etc. In this paragraph, I will try to provide better topics to discuss.

For example, topics like:

- `Span<T>` and stack-based memory
- `stackalloc`
- the `Unsafe` API
- `ArrayPool<T>` and object pooling
- `struct` vs `class` performance trade-offs

Instead of asking for definitions, you can ask practical questions.

For instance:

- When would you choose a `struct` over a `class`?
- What problems does `Span<T>` solve?
- Why would someone use `ArrayPool<T>` instead of allocating arrays normally?

These questions are still related to memory management, but they reflect how modern .NET applications are actually written.

They also naturally lead to discussions about safety, readability, and maintainability.

## Practical, Real-World Memory Questions

Another useful approach is asking candidates how they would investigate or fix performance issues in real systems.

For example:

- "How would you reduce allocations in a high-throughput API?"
- "What tools would you use to diagnose excessive GC activity?"
- "What might cause frequent Gen2 collections in a service?"

These questions test practical engineering skills rather than theoretical knowledge.

A strong candidate might mention tools like memory profilers, `dotnet-trace`, `dotnet-counters`, or allocation analysis in performance profilers. They might talk about identifying hot paths, measuring allocations, and introducing optimizations only where they are justified.

This type of discussion reflects the real workflow of diagnosing performance issues in production systems.

# Conclusion

Understanding value vs reference types is not useless knowledge. It is an important topic in .NET. But it is a terrible interview gatekeeper question.

The `.NET` ecosystem has evolved dramatically over the last 20 years. The runtime, the language, and the tooling are far more sophisticated than the mental models this question promotes. Interviews should evolve, too.

If you want better engineers, ask better questions - practical, scenario-based, and focused on reasoning rather than memorization.

Good engineers don’t need textbook memorization.

Good engineers need reasoning skills, debugging strategies, and architectural understanding.
