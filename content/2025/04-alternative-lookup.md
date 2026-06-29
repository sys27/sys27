---
title: How to implement IAlternateEqualityComparer
description: "Learn how to implement IAlternateEqualityComparer in .NET 9 to enable alternate key lookups in dictionaries and hash sets."
tags: dotnet, hashset, set, collections
date: 2025-04-15
---

# Intro

Hello there!

It's a small note about the custom implementation of the `IAlternateEqualityComparer<TAlternative, T>` interface and the `GetAlternateLookup<T>` method for `Hashset<T>` and `Dictionary<TKey, TValue>`.

In .NET 9, the .NET team introduced a new feature with an alternative lookup value for hashsets and dictionaries. Usually, it was advertised for string keys and `ReadOnlySpan<char>`s. For example, you have a dictionary where the key is a string and you want to look for a value by using `ReadOnlySpan<char>`. So, while your program is doing its stuff, you can reduce the memory allocation a little bit:

```csharp
var d = new Dictionary<string, object>
{
    { "key1", ... },
    { "key2", ... },
    { "key3", ... },
};
var lookup = d.GetAlternateLookup<ReadOnlySpan<char>>();

// zero allocations
foreach (var range in names.AsSpan().Split(...))
{
   var key = names.AsSpan(range);
   var value = lookup[key];
   Console.WriteLine(value);
}
```

But it is just one use case. You can implement your own version of `IAlternateEqualityComparer` for any other type combination.

# Custom Implementation

The custom implementation is provided through existing constructors with `IEqualityComparer<T>`. So, this `IEqualityComparer<T>` should implement `IAlternateEqualityComparer<TAlternative, T>` also. Something like this:

```csharp
class Cmp : IEqualityComparer<string>, IAlternateEqualityComparer<int, string>
{
    public bool Equals(string? x, string? y)
        => x == y;

    public int GetHashCode(string obj)
        => obj.GetHashCode();

    public bool Equals(int alternate, string other)
        => alternate.ToString() == other;

    public int GetHashCode(int alternate)
        => GetHashCode(alternate.ToString());

    public string Create(int alternate)
        => alternate.ToString();
}
```

_Note: the important point here is both `GetHashCode` methods should return the same value for the same object. So, basically follow the "common" rule._

Then you will be able to get a lookup value by a new type. You just need to use the `GetAlternateLookup<T>` method and provide a new type for a lookup. For example:

```csharp
var d = new Dictionary<string, object>(new Cmp())
{
    { "1", new object() },
    { "2", new object() },
    { "3", new object() },
    { "4", new object() },
    { "5", new object() },
};
var lookup = d.GetAlternateLookup<int>();

if (lookup.TryGetValue(5, out var value))
    Console.WriteLine(value);
else
    Console.WriteLine("Value not found");
```

In this snippet, we can get a value by a string or a number.