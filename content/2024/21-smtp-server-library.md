---
title: "TIL: The `SmtpServer` library"
description: "The introduction to the `SmtpServer` library"
tags: dotnet, c-sharp, smtp, smtp-server
date: 2024-11-11
---

Hello there!

In my last [article](./20-sendgrid-enshittification.md), we discussed `SendGrid`, why it was good (mainly ease of use), and why you shouldn't probably use it anymore. Today, I want to discuss an alternative to `SendGrid` - [SmtpServer](https://github.com/cosullivan/SmtpServer). Let's look at the description:

> SmtpServer is a simple, but highly functional SMTP server implementation. Written entirely in C# it takes full advantage of the .NET TPL to achieve maximum performance.

So, it's an SMTP server implemented as a library and not as a standalone application. You can find the list of supported features on the official GitHub page. Personally, I played only with basic ones (smtp server on port 25 without any protection/encryption).

To setup a server, you just need several lines of code:

```csharp
var options = new SmtpServerOptionsBuilder()
    .ServerName("localhost")
    .Port(25)
    .Build();

var smtpServer = new SmtpServer.SmtpServer(options, ServiceProvider.Default);
await smtpServer.StartAsync(CancellationToken.None);
```

`SmtpServer` injects `IMessageStore`, `IMailboxFilter`, `IUserAuthenticator` implementation through `ServiceProvider`. 

- `IMessageStore` allows you to implement the store for messages
- `IMailboxFilter` allows you to implement some logic to filter out messages
- `IUserAuthenticator` allows to implement a custom auth
 
Default implementations do nothing, `IMessageStore` discards any message, `IMailboxFilter` accepts any message without filtering, `IUserAuthenticator` authenticates any user. And obviosly in the real world scenarios, you need to provide custom implementations.

For my needs, I decided to implement `IMessageStore` to save messages to the collection and access them later. For example:

```csharp
class Smtp : IMessageStore
{
    private readonly SmtpServer.SmtpServer smtpServer;
    private readonly BlockingCollection<Message> messages;

    public Smtp()
    {
        var options = new SmtpServerOptionsBuilder()
            .ServerName("localhost")
            .Endpoint(builder => builder
                .Port(25, false)
                .AllowUnsecureAuthentication())
            .Build();

        var serviceProvider = new ServiceProvider();
        serviceProvider.Add(this);
        serviceProvider.Add(MailboxFilter.Default);
        serviceProvider.Add(UserAuthenticator.Default);

        smtpServer = new SmtpServer.SmtpServer(options, serviceProvider);
        messages = [];
    }

    public void Start()
        => Task.Run(() => smtpServer.StartAsync(CancellationToken.None));

    public void Stop()
        => smtpServer.Shutdown();

    public async Task<SmtpResponse> SaveAsync(
        ISessionContext context,
        IMessageTransaction transaction,
        ReadOnlySequence<byte> buffer,
        CancellationToken cancellationToken)
    {
        await using var stream = new MemoryStream();

        var position = buffer.GetPosition(0);
        while (buffer.TryGet(ref position, out var memory))
            await stream.WriteAsync(memory, cancellationToken);

        stream.Position = 0;

        var message = await MimeKit.MimeMessage.LoadAsync(stream, cancellationToken);
        messages.Add(
            new Message
            {
                From = message.From.Mailboxes.First().Address,
                To = message.To.Mailboxes.First().Address,
                Body = message.HtmlBody,
            },
            cancellationToken);

        return SmtpResponse.Ok;
    }

    public Message? WaitForMessage(
        Func<Message, bool> condition, 
        CancellationToken cancellationToken = default)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);

        foreach (var message in messages.GetConsumingEnumerable(linked.Token))
            if (condition(message))
                return message;

        return null;
    }

    public class Message
    {
        public required string From { get; set; }

        public required string To { get; set; }

        public required string Body { get; set; }
    }
}
```

I use this code in my integration tests when I need to wait for an email message, for example, for a new user registration message to get a token and activate the user later:

```csharp
var user = await identityClient.CreateUser(...);
var message = Api.Smtp.WaitForMessage(x => x.To == login);
var token = message.GetToken();
await identityClient.ActivateUser(...);
await identityClient.Login(...);
```

With this library, you don't need to setup any additional software, service, docker container, etc. It just works.

# Conclusion

The `SmtpServer` provides a simple and extendible interface for starting a SMTP server. And even though, I've tested only the basic subset of features, I've shown how can you extend this library and use it for your needs. I'm not sure whether this library is the production ready or not. But for integration tests (the example provided in this article), this library is a great choice.
