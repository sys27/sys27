---
title: I don't like target-typed new expressions in C#
description: The target-typed new tries to simplify and remove boilerplate code but makes it less readable.
tags: dotnet, c-sharp
date: 2024-06-07
---

Hello there.

*I don't like target-typed new expressions in C#.*

### `var` everywhere

Let's start with another C# feature: `var`. This feature was introduced in C# 3.0 (somewhere in 2007). It allows the compiler to infer a correct type of variable, so a user doesn't need to explicitly define a type for variable. For example, `int i = 1` could be replaced `var i = 1`. I think, this feature primarily was introduced to simplify variable declarations for LINQ statements because they could be huge: `IGrouping<long, IEnumerable<User>> g = users.GroupBy(x => x.Id, ...)`.

`var` is a compile-time feature which means the compile replaces all `var`s with real types. Also, it has several restrictions but the main one is the compile should be able to infer the type from the right side of the variable declaration. As a result, we can't write something like `var x;` because the compiler doesn't know what type to use.

This feature has always been controversial and generated a lot of disputes between developers who prefer explicit typing and those who favor the brevity and flexibility of `var`. But over the years, `var` has become a widely accepted part of C# syntax. And I also like this syntax. It allows the creation of more concise and understandable code. Someone might have quite the opposite opinion because with `var` you don't know the exact type and it makes the code harder to review or even understand. But from my point of view, it forces a developer to write more clear code. Instead of `var list = GetList()` something like `var users = GetUsers()`. In this case, I don't care what the type of `users` is. Usually, it is enough to understand that it is some kind of `IEnumerable<User>`.

### Target-typed new

The same for the target-typed new feature. It tries to simplify and remove boilerplate code. While for the `var` feature, the compiler tries to infer the type of variable. For target-typed new, it automatically infers the constructor for `new` operator. This feature was introduced not so long ago, in C# 9.0 and you can write something like: `List<int> list = new()` instead of `List<int> list = new List<int>()` or most importantly instead of `var list = new List<int>()`. So, it is opposite to the `var` feature. Now you need to define the variable type on the left-hand side of the assignment, so, the compile can infer the constructor. And from my point of view, this feature has several drawbacks:

#### Mess in combination with `var`

```csharp
var users = obj.Property.Select(x => x.User).ToList();
List<Client> clients = new(users.Count);
var orders = GetOrders(users);
// ...
```

This point is pretty much easy to understand, just compare the code above with the code below:

```csharp
var users = obj.Property.Select(x => x.User).ToList();
var clients = new List<Client>(users.Count);
var orders = GetOrders(users);
// ...
```

`var` creates "a vertical column", so, you can easily distinguish variable names.

#### Pass as a parameter

```csharp
var result = Query(new(OperatorKind.In, true));
```

Here is another usage of the target-typed new feature. Let's image we need to create a query and pass a parameter object. If you are familiar with API, then this code may look ok. For everyone else, it is not clear what `OperatorKind.In` and `true` mean. One might try to improve it by using an anonymous object:

```csharp
var result = Query(new
{
    Operator = OperatorKind.In, 
    IsOrdered = true
});
```

Unfortunately, it is not supported in C# yet. So, as a result, such syntax reduces the readability of code.

#### Class fields declaration with initialization

And only one use case, where I can agree that it is useful. The declaration of class fields. 

```csharp
private readonly SomeClass variable = new();
```

Usually, I accept class dependencies through a constructor or initialize directly in a constructor. I'm not used to this syntax but ok, it's fine.

_Fun fact: C# team has a GitHub repo where they publish drafts and have discussions of new features [csharplang](https://github.com/dotnet/csharplang/). Here is the ticket for target-typed new: [github.com](https://github.com/dotnet/csharplang/issues/100). Open it and pay attention to likes and dislikes. 143 to 81 (at time of writing), roughly 64%/36%. It might look like ok but if you check other tickets for implemented features, they don't have such big dislike ratio at all._
