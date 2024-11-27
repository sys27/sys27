---
title: How to exclude a single query from logs
description: Learn how to exclude specific EF Core queries from logs using a custom logging decorator and the TagWith() method.
tags: dotnet, c-sharp, ef-core
date: 2024-11-27
---

Hello there!

Developers like logs. For the production application, they are the best option for understanding what is happening with your application. `EF Core` provides a lot of configurations on what to log and what log level to use. But something is not enough and it is exactly what happened on one project. I needed to exclude one specific query from logs while keeping any other query log untouched. Unfortunately, `EF Core` doesn't provide such functionality. So, this article will show a workaround for how to implement it.

So, here is the task. We have an application with a background job that periodically pulls data from a database. It doesn't create a huge load, just checks whether there is data to process. But unfortunately, it creates a lot of logs. Logs with the same entry that `EF Core` made a SQL query to a database. So, I want to exclude them but keep any other query log as is.

I decided to implement a [decorator](https://en.wikipedia.org/wiki/Decorator_pattern) for `ILoggerProvider` and `ILogger`, two built-in interfaces for logging in `ASP.NET Core`:

```csharp
internal sealed class LoggerProvider : ILoggerProvider
{
    private readonly ConsoleLoggerProvider loggerProvider;

    public LoggerProvider(ConsoleLoggerProvider loggerProvider)
        => this.loggerProvider = loggerProvider;

    public void Dispose()
        => loggerProvider.Dispose();

    public ILogger CreateLogger(string categoryName)
    {
        var logger = loggerProvider.CreateLogger(categoryName);

        return new Logger(logger);
    }
}

internal sealed class Logger : ILogger
{
    private readonly ILogger logger;

    public Logger(ILogger logger)
        => this.logger = logger;

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull
        => logger.BeginScope(state);

    public bool IsEnabled(LogLevel logLevel)
        => logger.IsEnabled(logLevel);

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel))
            return;

        var log = formatter(state, exception);
        if (log.Contains("-- NO_LOGGING"))
            return;

        logger.Log(logLevel, eventId, state, exception, formatter);
    }
}
```

`LoggerProvider` is pretty simple, it reuses `ConsoleLoggerProvider` to create and wrap a logger. And `Logger` is responsible for filtering out unnecessary logs. It checks for a custom comment in the SQL query `"-- NO_LOGGING"` and if it is there, then the logger ignores it. This logic is based on a [tagging feature](https://learn.microsoft.com/en-us/ef/core/querying/tags) in `EF Core`. You can add a tag (comment) to any query by using the `TagWith()` method:

```csharp
dbContext.Entity
    // ... LINQ ...
    .TagWith("NO_LOGGING")
    .ToList();
```

And after that, only one thing is left to register our custom implementations in DI.

```csharp
builder.Logging.ClearProviders();
builder.Services.AddSingleton<ConsoleLoggerProvider>();
builder.Services.AddSingleton<ILoggerProvider, LoggerProvider>();
```