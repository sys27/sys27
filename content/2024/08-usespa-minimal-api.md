---
title: UseSpa with minimal APIs in ASP.NET Core
description: How to integrate Angular with ASP.NET Core minimal APIs using UseSpa.
tags: dotnet, c-sharp, aspnetcore, spa, angular
date: 2024-06-10
---

Hello there!

I have an ASP.NET Core project with minimal APIs and want to develop a UI (Angular) for it. The default option is to create two independent projects and host them separately. The ASP.NET Core project is hosted by Kestrel (.NET web server) and the Angular project is hosted by node.js. However, I want to try to simplify deployment and development by hosting everything in .NET. You don't need to configure an external proxy (like nginx) to host two projects. You don't need to configure CORS because UI and APIs are hosted on a single domain.

So, let's explore available options.

### Existing project templates

I remember, a long time ago, I saw a bunch of .NET project templates in Visual Studio to create .NET WebApi + SPA. These projects had some kind of integration with `node.js`. So, you can build and run everything in Visual Studio. But unfortunately, Microsoft decided to remove them. Right now, they provide a pretty simple configuration to host a bunch of static files in your .NET application. They configured MSBuild to build SPA as part of .NET build process, output static files to some folder, and host these static files by .NET and that's it. Yes, I know that the SPA application is just a static website (html, css, js files).

This approach works perfectly fine for the production deployment. You executed one command to build your entire application, published it, and it is ready to be deployed. But I still want to check other options. I remember that ASP.NET Core had the `UseSpa` method or something like that.

### `UseSpa`

Microsoft created an additional package: [Microsoft.AspNetCore.SpaServices.Extensions](https://www.nuget.org/packages/Microsoft.AspNetCore.SpaServices.Extensions). It has several configuration methods to add support of SPA into your application:

- `AddSpaStaticFiles` - adds a configuration with a path to your static SPA files.
- `UseSpaStaticFiles` - configures a middleware to host static files.
- `UseSpa` - configures a SPA middleware
- `UseAngularCliServer`/`UseReactDevelopmentServer` - configures a npm task to be run on ASP.NET Core start
- `UseProxyToSpaDevelopmentServer` - configures a middleware to proxy requests to your dev-server (node.js). 

Let's try to use them, here is a sample code snapshot:

```csharp
var builder = WebApplication.CreateBuilder(args);

// ...

builder.Services.AddSpaStaticFiles(options =>
    options.RootPath = "ui-app/dist/browser");

var app = builder.Build();

// ...

if (!app.Environment.IsDevelopment())
{
    app.UseSpaStaticFiles();
}

app.MapGroup("/api")
    .MapGet(/* ... */);

app.UseSpa(spa =>
{
    const int port = 4200;

    spa.Options.SourcePath = "ui-app";
    spa.Options.DevServerPort = port;
    spa.Options.PackageManagerCommand = "npm";

    if (app.Environment.IsDevelopment())
    {
        spa.UseAngularCliServer("start");
        spa.UseProxyToSpaDevelopmentServer($"http://localhost:{port}");
    }
});

app.Run();
```

This code uses C# top-level statements and follows the default pattern for configuring the ASP.NET Core app with minimal APIs. `AddSpaStaticFiles` has only one option. It's `RootPath`, a path to your static files. Usually, it is a subfolder in your SPA project with compiled bundler files, not just a path to source code. `UseSpaStaticFiles` is configured to be used only in production because it is needed to host static files. But for local development, we will use a `node.js` dev server and a proxy. `UseSpa` configures a middleware, it is supposed to catch all non-handled requests and proxy them to `node.js`. `UseAngularCliServer` runs a `npm` task from `package.json`. For Angular, it's `ng serve`. Additionally, it uses the `SourcePath` property as a working directory for this command and the `DevServerPort` property to configure `node.js` port. So, the resulting command will be something like: `npm run start -- --port 4200`. `UseProxyToSpaDevelopmentServer` configures a proxy.

### It doesn't work

Let's try to run it and yeah it doesn't work. Well, SPA works and you will be able to open your SPA by opening the ASP.NET Core application but that's it. Your APIs don't work because any request is redirected to the `node.js` dev server.

It is happening because `UseSpa` registers a middleware before our endpoints. And because it is designed to catch everything that is not handled by previous middleware, it doesn't allow our endpoints to accept any requests.

A long time ago, around ASP.NET Core 2, the ASP.NET Core team introduced new middlewares and configurations for applications: `UseRouting` and `UseEndpoints`. The first one matches the current request against a list of configured routes and stores the matched route in context. The second one provides a configuration for our routes and a middleware to execute actions assigned to these routes. The default ASP.NET Core applications looked something like this:

```csharp
public class Startup
{
    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    public void ConfigureServices(IServiceCollection services)
    {
        // ...
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // ...
        app.UseRouting();
        // ...

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
        app.UseSpa(/* ... */);
    }
}
```

In this case, the application would work correctly. It tries to match and execute our endpoint and only then passes it to SPA. But the configuration has changed, around release 5 or 6. Now `UseRouting` and `UseEndpoints` are called automatically from the internals of `WebApplicationsBuilder` and the order is not correct. The code is similar to something like:

```csharp
var app = builder.Build();

// ...
app.UseRouting();

app.MapGroup("/api")
    .MapGet(/* ... */);

app.UseSpa(/* ... */);
app.UseEndpoints(_ => { });

app.Run();
```

Here is a quote from [documentation](https://learn.microsoft.com/en-us/aspnet/core/migration/50-to-60?view=aspnetcore-8.0):
> When using the minimal hosting model, the endpoint routing middleware wraps the entire middleware pipeline, therefore there's no need to have explicit calls to UseRouting or UseEndpoints to register routes. UseRouting can still be used to specify where route matching happens, but UseRouting doesn't need to be explicitly called if routes should be matched at the beginning of the middleware pipeline.

You can use the code from the previous example to fix this issue. So, if you manually add `UseRouting` and `UseEndpoints`, it should solve the problem. Another solution is to add a conditional middleware:

```csharp
// ...
app.UseWhen(
    context => !context.Request.Path.StartsWithSegments("/api"),
    then => then.UseSpa(spa =>
    {
        const int port = 4200;

        spa.Options.SourcePath = "ui-app";
        spa.Options.DevServerPort = port;
        spa.Options.PackageManagerCommand = "npm";

        if (app.Environment.IsDevelopment())
        {
            spa.UseAngularCliServer("start");
            spa.UseProxyToSpaDevelopmentServer($"http://localhost:{port}");
        }
    }));
```

This approach will use SPA middleware only if the request doesn't start with `/api`, which is exactly what I wanted to do. So, now everything that starts with `/api` is handled by my API, anything else is routed to `node.js`.

### Bonus fix 🙃

The `Microsoft.AspNetCore.SpaServices.Extensions` package has a code to detect whether Angular CLI has started and is ready to accept requests. It is based on the regular expression but because the Angular team has changed the output format this regular expression will fail no matter what with the following error `System.TimeoutException: The Angular CLI process did not start listening for requests within the timeout period of 120 seconds. Check the log output for error information.`. You can find different solutions for this problem, someone even created a separate package to fix this problem. But I decided to use the simplest possible solution, just update your `package.json` and include a _fake_ output to allow .NET code to pass the regexp condition:

```json
{
  // ...
  "scripts": {
    // ...
    "asp": "echo open your browser on http://localhost:4200/ && ng serve"
  },
}
```

Add a new script task, for example, `asp` and use it in your `UseSpa` configuration: `spa.UseAngularCliServer("asp");`.
