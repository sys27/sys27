---
title: "TIL: `ConfigureWarnings` in EF Core"
description: "The introduction of the ConfigureWarnings method in EF Core, which allows developers to control how EF Core handles specific diagnostic events."
tags: .net, ef-core
date: 2024-09-29
---

Hello there!

Today I want to show you a nice feature of EF Core: the `ConfigureWarnings` method. Apparently, it was introduced in EF Core 2.0 but I didn't get a chance to explore it until recently. It allows you to configure EF Core to behave differently on some "diagnostic" events by using these methods:

- `Log` - logs the event to the logger, it's a terminal by default but it depends on your configuration
- `Ignore` - ignores the event completely, no logs, no anything
- `Throw` - throws an exception instead of logging
- `Default` - allows to configure default behavior for all events

The default configuration of EF Core is fine in most cases but still, this method may become handy when you need to change this default behavior. For example, there is a diagnostic in EF Core to prevent cartesian explosion (including of multiple collections, explicitly or through projection) and by default EF Core will display the following warning:

> Compiling a query which loads related collections for more than one collection navigation, either via 'Include' or through projection, but no 'QuerySplittingBehavior' has been configured. By default, Entity Framework will use 'QuerySplittingBehavior.SingleQuery', which can potentially result in slow query performance. See https://go.microsoft.com/fwlink/?linkid=2134277 for more information. To identify the query that's triggering this warning call 'ConfigureWarnings(w => w.Throw(RelationalEventId.MultipleCollectionIncludeWarning))'.

And to fix it, you just need to add `.AsSplitQuery()` to your code. 

If you want to throw an exception instead, you can add this code to your code:

```csharp
.ConfigureWarnings(w =>
{
    w.Throw(RelationalEventId.MultipleCollectionIncludeWarning);
});
```

And EF Core will throw the following exception:

> System.InvalidOperationException: An error was generated for warning 'Microsoft.EntityFrameworkCore.Query.MultipleCollectionIncludeWarning': Compiling a query which loads related collections for more than one collection navigation, either via 'Include' or through projection, but no 'QuerySplittingBehavior' has been configured. By default, Entity Framework will use 'QuerySplittingBehavior.SingleQuery', which can potentially result in slow query performance. See https://go.microsoft.com/fwlink/?linkid=2134277 for more information. To identify the query that's triggering this warning call 'ConfigureWarnings(w => w.Throw(RelationalEventId.MultipleCollectionIncludeWarning))'. This exception can be suppressed or logged by passing event ID 'RelationalEventId.MultipleCollectionIncludeWarning' to the 'ConfigureWarnings' method in 'DbContext.OnConfiguring' or 'AddDbContext'.

It is especially useful in the debug mode:

```csharp
.ConfigureWarnings(w =>
{
#if DEBUG
    w.Throw(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.MultipleCollectionIncludeWarning);
#endif
});
```

It allows you to detect these issues faster. You can miss a log entry while an exception will break your code.
