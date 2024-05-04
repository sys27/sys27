---
title: "Oracle ADO.NET Provider: Specified cast is not valid"
tags: c-sharp, .net, oracle
date: 2024-04-20
---

Hello there.

Sometimes the Oracle provider throws the `InvalidCastException` exception and usually it is pretty easy to fix. Because this exception means you have a mismatch between your code and the type of the column in your database. For example, it could be a simple reading from ADO.NET API:

```csharp
var reader = command.ExecuteReader();

...

var b = reader.GetValue<bool>(0);
```

or an incorrect EF Core configuration:

```csharp
builder.Property(x => x.FooId)
    ...
    .HasConversion<bool>();
```

But in some cases, you can receive this exception even when the code and configuration are correct. It may happen when you are using the `decimal` data type. ADO.NET automatically maps Oracle's `NUMBER(p, s)` to a bunch of different types, for example:

- `NUMBER(6, 0)` - `NUMBER(9, 0)` -> `int`
- `NUMBER(10, 0)` -> `long`
- etc.

Oracle's `NUMBER` has a maximum [precision](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlqr/Data-Types.html) = 38.

> NUMBER [ (p [, s]) ]
> Number having precision p and scale s. The precision p can range from 1 to 38. The scale s can range from -84 to 127. Both precision and scale are in decimal digits. A NUMBER value requires from 1 to 22 bytes.

While the .NET `decimal` data type has a maximum [precision](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types) = 28.

So, when the precision is too big to be stored in `decimal`, ADO.NET Provided throws the exception. There are two ways to fix it.

### Use `SuppressGetDecimalInvalidCastException`

By default the provider throws `InvalidCastException` but we can change this behavior. We can ask the provider to suppress the excetpion and round a number.

```csharp
var reader = command.ExecuteReader();
reader.SuppressGetDecimalInvalidCastException = true;

...

var result = reader.GetDecimal(0);
```

But this approach may cause some rounting errors.

### Use internal `OracleDecimal` struct

ADO.NET provider for Oracle Database has a set of internal data structures to represent data types from their database. One of them is `OracleDecimal` and it supports decimal numbers with precision up to 38.

```csharp
var reader = command.ExecuteReader();

...

var result = reader.GetOracleDecimal();
```

_Note: The `OracleDecimal` struct is internal type and belongs to ADO.NET provider. So, it might be unaccessible in your application if it has a layered structure because your domain layer has no reference to ADO.NET specific libraries. In that case, you can create a wrapper/facade._