---
title: git merge vs rebase
description: Merge vs. rebase — two strategies, one choice. Merge for simplicity, rebase for a sleek, linear history.
date: 2024-05-14
tags: git
---

Hello there.

_In this article, I won't even try to convince you to use one thing over another._

There are two common ways to _combine_ changes from different branches in `git`: `merge` and `rebase`. `merge` creates a new commit (with two parents) where it combines all changes, whereas `rebase` rewrites a history of commits and puts one set of commits on top of another set of commits from the base branch.

Usually, people prefer `merge` (at least from my experience) over `rebase` and I can easily understand why. If you want to merge something, well you need to use the `merge` command, easy. This command works pretty much as expected and usually doesn't produce any issues. But what is `rebase`? How does it work? If you are not so proficient with `git`, there is always a fear of breaking something or losing your changes.

But first of all, let's look a bit closer at the details of how these commands work and what commit tree they produce.

### `merge`

```
*   a78d34a3 Merge feature-1
|\
| * 33d76e0a Fix bug
| |
| * 32d76e0a Implement feature-1
|/
*   83e461ac Base commit
```

It's a sample formatted output of `git log` with 4 commits. The one on the bottom is "base commit", then we can see two other commits in the separate branch to implement a feature and to fix a bug and then the merge commit. I think everyone is familiar with this structure and at first glance, it looks pretty much fine. Let's look at `rebase`.

### `rebase`

```
*   a78d34a3 Implement feature-1
|
*   83e461ac Base commit
```

A similar output but it has only two commits. The first one is "base commit" and the last one is the feature commit, nothing else, no merge commits, linear history.

### My preferences

Actually, it is one of the main reasons why I prefer `rebase` - linear commit history. Especially, it is true for a lot of consecutive merge commits. Instead of creating a "christmas tree" in the git history, you can create a linear structure as if they were committed directly to the base branch. This advantage can be combined with interactive rebase - `git rebase -i` where you can manually "rewrite" the history of your commits, like change order, change message, combine (squash) or split commits, etc. It's kind of _advanced_ feature but also it provides you full control over commit history. 
