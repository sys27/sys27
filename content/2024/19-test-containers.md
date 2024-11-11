---
title: How to use `Testcontainers` to run integration tests on GitHub Actions
description: How to use `Testcontainers` to run integration tests on GitHub Actions
tags: dotnet, testcontainers, docker, github
date: 2024-10-21
---

Hello there!

# What `Testcontainers` is

`Testcontainer` is a lightweight library to manage `Docker` container and images. It is designed to be used in integration tests to run your third party services (dependencies) in containers and create isolated and reproducible environment each time you want to run your tests. With this library, you can avoid creating mocks or in-memory implementation and test your code against real dependencies.

# Use cases

Usually, to use this library, you need to follow several basic steps.

Start a container in the test initialization code or in each test separatly:

```csharp
var postgres = new PostgreSqlBuilder()
    .WithDatabase("testdb")
    .WithUsername("testuser")
    .WithPassword("testpassword")
    .WithCleanUp(true)
    .Build();
await postgres.StartAsync();
var connectionString = postgres.GetConnectionString();
```

Use `connectionString` directly or through `EF Core`, run you tests, and dispose containers/connections/etc. when you're done by using `await postgres.StopAsync()`. In this case, your dependencies are running in `Docker` containers but the service under test is not.

For my application, I decided to test everything in containers, even `ASP.NET Core` API because the `Docker` container in the primary way to distribute my application. So, by running tests, I want to be sure at least the core subset of features is ok. 

So, the first thing you need to do is to build your `Docker` image. You can do it manually but of course we're to lazy to do everything by hand. If we have a tool to run containers, probably we can use it to build them. Here is example from documentation:

```csharp
var futureImage = new ImageFromDockerfileBuilder()
    .WithDockerfileDirectory(CommonDirectoryPath.GetSolutionDirectory(), string.Empty)
    .WithDockerfile("Dockerfile")
    .Build();

await futureImage.CreateAsync()
    .ConfigureAwait(false);
```

And here is the problem, even that technically `Testcontainers` supports it, you can build a container on the fly, it doesn't work with `Docker Buildx` and complex multistage dockerfiles. Even thought the syntax of `Dockerfile` is pretty much the same. The resulting image depends on a runner especially if it has optional stages or something "not standard". So, unfortunately, you need to do it manually.

When the image is built, let's assume it is named `app`. You can use the following code to run your service in the Docker container:

```csharp
const int hostPort = 8080;
const int containerPort = 80;

var container = new ContainerBuilder()
    .WithImage("app")
    .WithName("app")
    .WithPortBinding(hostPort, containerPort)
    .WithWaitStrategy(Wait.ForUnixContainer().UntilContainerIsHealthy())
    .Build();

await container.StartAsync();

var baseAddress = new Uri($"http://localhost:{hostPort}");
```

And later you can use `baseAddress` to configure your HTTP client to call your APIs.

# Example of GitHub Actions

The previous code snippen is enough to run tests in container locally but with `GitHub Actions` you have another problem, well you need to run them. You can go easy way, install dotnet SDK, install `Docker`, build image and run your tests by using `dotnet test`. It should work fine. 

I decided to go another way and run tests inside `Docker` because the main artifact of my application is a `Docker` image. I don't want to build "two versions" of the application. One is a production version as a `Docker` image with isolated dependencies. And another one is just a binary for tests, built in a `GitHub Runner`. I want to be sure, if tests are passed on the production `Docker` image, then the application is ok and the same image (binary, to every last bit) will be delivered to clients. To achieve this, you need to do additional adjustments to your YAML pipeline file and test code.

The first thing is an additional stage in `Dockerfile`:

```Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0.403-alpine3.20 AS build
ARG BUILD_CONFIGURATION=Release
# ...

FROM build AS test
ENV BUILD_CONFIGURATION=$BUILD_CONFIGURATION
ENTRYPOINT ["sh", "-c", "dotnet test App.sln --nologo --no-restore --no-build -c $BUILD_CONFIGURATION"]

# ...
```

It uses the previous stage (`build`) with all built artifacts and dotnet SDK to run tests. It has two parameters `--no-restore` and `--no-build` to make sure we are using existing artifacts and aren't trying to build them again.

Then we need to add several steps to the build pipeline:

```yaml
# ...

jobs:
  build:
    # ...

    steps:
    - name: Docker Metadata
      id: meta
      uses: docker/metadata-action@v5

    # ... other build steps ...

    - name: Export image to docker
      id: build
      uses: docker/build-push-action@v6
      env:
        DOCKER_BUILD_SUMMARY: false
        DOCKER_BUILD_RECORD_UPLOAD: false
      with:
        context: .
        push: false
        outputs: type=docker
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        annotations: ${{ steps.meta.outputs.annotations }}

    - name: Build tests
      uses: docker/build-push-action@v6
      env:
        DOCKER_BUILD_SUMMARY: false
        DOCKER_BUILD_RECORD_UPLOAD: false
      with:
        context: .
        target: test
        push: false
        outputs: type=docker
        tags: tests-image

    - name: Run tests
      run: >
        docker run --rm -t
        --name tests
        -e IMAGE_ID=${{ steps.build.outputs.imageid }}
        -v /var/run/docker.sock:/var/run/docker.sock
        tests-image

    # ...
```

Important part of this pipeline is "Export image to docker". By default, the `docker/build-push-action` action doesn't export anything to Docker and with the `push` flag sends everything to the registry. But we need the application image to run our tests against. On the next step, we just need to build an image with tests. And then run everything by using `Docker CLI`. `-v /var/run/docker.sock:/var/run/docker.sock` is required to grant access to `Docker` for `Testcontainers`. 

And update our test initialization code:

```csharp
const int hostPort = 8080;
const int containerPort = 80;
var imageId = Environment.GetEnvironmentVariable("IMAGE_ID") ?? "app";

var container = new ContainerBuilder()
    .WithImage(imageId)
    .WithName("app")
    .WithPortBinding(hostPort, containerPort)
    .WithWaitStrategy(Wait.ForUnixContainer().UntilContainerIsHealthy())
    .Build();

await container.StartAsync();

var baseAddress = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true"
    ? new Uri($"http://{container.IpAddress}:{containerPort}")
    : new Uri($"http://localhost:{hostPort}");
```

It has several updates. The first one is the `IMAGE_ID` env variable. It is not required but it is handy if you don't want to hardcode the image name. And the second one is important. We can't use `localhost` to call our APIs, it won't work in a container. Instead of using it, we need to check for `DOTNET_RUNNING_IN_CONTAINER` and call directly by container's IP-address.

# Add tests output to GitHub Actions

There is a cool library: [GitHubActionsTestLogger](https://www.nuget.org/packages/GitHubActionsTestLogger) which allows you to output test results to GitHub Actions summary. But because our tests are running in the container, it won't be able to do it. To fix it, you need to update your `Dockerfile` and tell dotnet to use this logger:

`--logger "GitHubActions;summary.includePassedTests=true;summary.includeSkippedTests=true"`

And update your YAML pipeline file and add a few parameter to `docker run`:

```
-e GITHUB_SERVER_URL=$GITHUB_SERVER_URL
-e GITHUB_REPOSITORY=$GITHUB_REPOSITORY
-e GITHUB_WORKSPACE=$GITHUB_WORKSPACE
-e GITHUB_SHA=$GITHUB_SHA
-e GITHUB_STEP_SUMMARY=/summary
-v $GITHUB_STEP_SUMMARY:/summary
```

# Conclusion

In this article, we explored how to use `Testcontainers` and `GitHub Actions` together to run integration tests. It allows us to be confident about our application that all APIs are ok and tests were executed against the production version of an application with real dependencies (no mocks, no in-memory implementations). I demonstrated an example `Dockerfile`, a YAML pipeline, and a little bit of code. So, you can try to apply it in your application.
