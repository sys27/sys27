---
title: How to host a git repository in ASP.NET Core. Part 1
description: Learn how to host a git repository using ASP.NET Core, exploring protocols and implementing authentication for complete repository management.
tags: git, c-sharp, dotnet, aspnetcore
date: 2024-07-10
---

Hello there!

### Protocols supported by `git`

`git` supports several protocols to get changes from a remote server or send your changes back to the server.

#### `ssh`

It's the best option available. Especially, if you constantly use `ssh` to login to a server. Yeah, it requires some basic configuration create an SSH key, send your public key to a server, and configure the `git` user on a server (shell, permissions). But you need to do it only once. After that, it should work smoothly. It's "natively" supported by `git`, so you don't need any special configuration from the `git` side. Just use something `git@server.com/path/repo.git`. But this article is not about `ssh`, so I'm not going to explain all details of `ssh`.

#### `git`

It's another protocol supported by `git`, implemented in `git daemon`. This protocol uses the 9418 port and exposes any repository that has the `git-daemon-export-ok` file in it. One major drawback of this protocol: it doesn't support any authentication. So, you can use it for read-only repos but it might be a bad idea to allow write permission to everyone.

#### "Dumb" `http`

The "dumb" `http` protocol is absolutely the same as the simplest way to host some files over `http`. It is the first implementation of `http` in `git` and it is called "dumb" because it doesn't provide any logic on top of `http`. It relies on serving static files nothing more. This protocol is only suitable for repository cloning. You can't push your changes back to a server using this protocol.  

#### "Smart" `http`

The "smart" `http` protocol works closer to `ssh`. It involves the execution of `git` logic on the server side. So, the `http` protocol is just a transport to send/receive data. There are several versions of the "smart" `http` protocol, the latest one is 2. And usually, this protocol is more efficient because `git` can decide what to send and how to pack it. When you need to get some changes from a server, instead of sending them as static files, `git` executes special commands on the server and sends results over `http`. There are several different biniries involved in this process but the main one is `git-http-backen`.

### `git http-backend`

This command allows implementing the "smart" `http` server. It's just a binary and is expected to be used by any HTTP server (`Apache`, `nginx`, etc.) as a CGI script. On each request, the server sets some environment variables like `REQUEST_METHOD=GET` and starts `git-http-backed`. If it is a `GET` request, then `git-http-backend` processes the request and outputs the result into `stdout`. If it is a `POST` request, then `git-http-backedn` expects the request's body to `stdin`.

You can easily find a configuration example for `Apache` or `nginx`. This configuration is pretty simple, probably, because `git-http-backend` is designed to be used by these servers. But `git-http-backend` doesn't have a lot of documentation on how it works internally and which parameters it expects. So, in this article, I will provide a configuration to host any `git` repository in ASP.NET Core.

### ASP.NET Core as a proxy

Let's start with simple stuff. If you want to host a git repository, you need to have one. So, let's assume you have created a new repo by `git --bare init repo.git`. It'll create a bare git repository - the repository without a working tree, just a `.git` folder. Usually, you don't need a working tree on a server.

Also, here is a list of all required environment variables:

- `GIT_HTTP_EXPORT_ALL` - it's a marker variable and the value doesn't matter, it allows to host any repository, otherwise `git` will be looking for `git-daemon-export-ok` file in each repository.
- `HTTP_GIT_PROTOCOL` - the version of the `git` protocol, you can hardcode this value or get it from request headers.
- `REQUEST_METHOD` - the http method, `GET` or `POST`.
- `GIT_PROJECT_ROOT` - the absolute path to your git repository.
- `PATH_INFO` - the relative path of the request, for example, if the client requested `http://localhost/repo.git/info/refs?service=git-receive-pack`, then `PATH_INFO` should be equal to `info/refs`.
- `QUERY_STRING` - the query string from the request without the `?` symbol, for example, `service=git-receive-pack`.
- `CONTENT_TYPE` - the content type header from the request.
- `CONTENT_LENGTH` - the content length header from the request.
- `HTTP_CONTENT_ENCODING` - the content encoding header from the request.
- `REMOTE_USER` - the user name.
- `REMOTE_ADDR` - the ip address from the request.
- `GIT_COMMITTER_NAME` - the user name.
- `GIT_COMMITTER_EMAIL` - the user email.

Let's look at some code. Here is an endpoint to handle all requests related to `git`.

```csharp
app
    .Map("/{name}.git/{**path}", async (
            GitBackend backend,
            string name,
            CancellationToken cancellationToken) =>
        await backend.Handle(name, cancellationToken))
    .RequireAuthorization(pb => pb
        .AddAuthenticationSchemes("Basic")
        .RequireAuthenticatedUser());
```

And here is the class with the logic. It might look like a lot of code but in fact, it is pretty simple. The first several lines are responsible for the startup of `git-http-backend` and env vars configuration. And then we have two methods. The first one is to read the body of the request and send it to `stdin`. The second one is to read headers from the `git-http-backend` response and set them to our ASP.NET Core response, also it reads the body of the response and sends it to the end client. I decided to use `System.IO.Pipelines` to send/receive data between ASP.NET Core and `git-http-backend`, it might be overkill but I thought it would be easier to part headers by using `SequenceReader`.

```csharp
public class GitBackend
{
    public async Task Handle(string repositoryName, CancellationToken cancellationToken = default)
    {
        var gitPath = "TODO: path to your git repository";

        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = "http-backend --stateless-rpc --advertise-refs",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = gitPath,
            EnvironmentVariables =
            {
                { "GIT_HTTP_EXPORT_ALL", "1" },
                { "HTTP_GIT_PROTOCOL", httpContext.Request.Headers["Git-Protocol"] },
                { "REQUEST_METHOD", httpContext.Request.Method },
                { "GIT_PROJECT_ROOT", gitPath },
                { "PATH_INFO", $"/{httpContext.Request.RouteValues["path"]}" },
                { "QUERY_STRING", httpContext.Request.QueryString.ToUriComponent().TrimStart('?') },
                { "CONTENT_TYPE", httpContext.Request.ContentType },
                { "CONTENT_LENGTH", httpContext.Request.ContentLength?.ToString() },
                { "HTTP_CONTENT_ENCODING", httpContext.Request.Headers.ContentEncoding },
                { "REMOTE_USER", httpContext.User.Identity?.Name },
                { "REMOTE_ADDR", httpContext.Connection.RemoteIpAddress?.ToString() },
                { "GIT_COMMITTER_NAME", httpContext.User.Identity?.Name },
                { "GIT_COMMITTER_EMAIL", "TODO: some email" },
            },
        };

        process.Start();

        var pipeWriter = PipeWriter.Create(process.StandardInput.BaseStream);
        await httpContext.Request.BodyReader.CopyToAsync(pipeWriter, cancellationToken);

        var pipeReader = PipeReader.Create(process.StandardOutput.BaseStream);
        await ReadResponse(pipeReader, cancellationToken);

        await pipeReader.CopyToAsync(httpContext.Response.BodyWriter, cancellationToken);
        await pipeReader.CompleteAsync();
    }

    private async Task ReadResponse(PipeReader pipeReader, CancellationToken cancellationToken)
    {
        while (true)
        {
            var result = await pipeReader.ReadAsync(cancellationToken);
            var buffer = result.Buffer;
            var (position, isFinished) = ReadHeaders(httpContext, buffer);
            pipeReader.AdvanceTo(position, buffer.End);

            if (result.IsCompleted || isFinished)
                break;
        }
    }

    private static (SequencePosition Position, bool IsFinished) ReadHeaders(
        HttpContext httpContext,
        in ReadOnlySequence<byte> sequence)
    {
        var reader = new SequenceReader<byte>(sequence);
        while (!reader.End)
        {
            if (!reader.TryReadTo(out ReadOnlySpan<byte> line, (byte)'\n'))
                break;

            if (line.Length == 1)
                return (reader.Position, true);

            var colon = line.IndexOf((byte)':');
            if (colon == -1)
                break;

            var headerName = Encoding.UTF8.GetString(line[..colon]);
            var headerValue = Encoding.UTF8.GetString(line[(colon + 1)..]).Trim();
            httpContext.Response.Headers[headerName] = headerValue;
        }

        return (reader.Position, false);
    }
}
```

This code is just a "proxy" between ASP.NET Core and `git-http-backend`.

So far so good. Everything should work with this code at least clone and fetch/pull but not the push.

### Authentication/Authorization

To add the push operation support, we need to implement `Authentication/Authorization`. Yeah, if you don't care about it and want to allow push for everyone, then you can run `git config http.receivepack true` or add `http.receivepack` manually to your `config` file. It will allow an anonymous push. If you still need to implement proper `Authentication/Authorization` then you need to add [Basic HTTP Authentication](https://en.wikipedia.org/wiki/Basic_access_authentication). Unfortunately, the latest version of ASP.NET Core doesn't support it from the box (I guess because of security reasons). So, we need to implement it manually or use some nuget package. Fortunately, the algorithm of Basic HTTP Authorization is pretty simple and we can implement it by ourselves. TLDR: you need to get a base64-encoded string from the `Autorization` header, decode it, and split it by `:`. The first part is the login and the second part is the password.

Here is the registration of our `Basic` scheme and handler for it, alongside `JWT`.

```csharp
services.AddAuthentication(JwtAuthenticationDefaults.AuthenticationScheme)
    .AddJwt()
    .AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>("Basic", null);
```

The implementation of `Basic HTTP Authentication`:

```csharp
public class BasicAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public BasicAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(authorization))
        {
            // we need this header to tell git to use Basic HTTP Auth.
            // otherwise, git will ask for a login-password combination
            // but won't send it the server
            Response.Headers.WWWAuthenticate = "Basic realm=\"SomeUniqueName\"";

            Logger.LogInformation("Authorization header is missing");
            return AuthenticateResult.NoResult();
        }

        if (!authorization.StartsWith("Basic", StringComparison.OrdinalIgnoreCase))
        {
            Logger.LogInformation("Authorization header is not Basic");
            return AuthenticateResult.NoResult();
        }

        var encodedCredentials = authorization["Basic ".Length..].Trim();
        var decodedCredentials = Encoding.UTF8.GetString(Convert.FromBase64String(encodedCredentials));
        var parts = decodedCredentials.Split(':', 2);
        if (parts.Length != 2)
        {
            Logger.LogInformation("Invalid credentials format");
            return AuthenticateResult.Fail("Invalid credentials format");
        }

        var username = parts[0];
        var password = parts[1];
        if (username != "admin" || password != "admin")
        {
            Logger.LogInformation("Invalid username or password");
            return AuthenticateResult.Fail("Invalid username or password");
        }

        var claims = new List<Claim>
        {
            // TODO: add your claims
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }
}
```

Please pay attention to the `WWW-Authenticate` header, it is important. Also, this code doesn't have a proper validation of user credentials, it is hardcoded to `admin/admin` combination. You need to implement your own credentials validation and add all necessary claims to your identity.

If everything is configured correctly, now you will be able to do all necessary actions with a remote repository: clone, fetch, pull and most importantly push.
