---
title: "TIL: The `qbittorrent-nox-static` repository"
description: "`qbittorrent-nox-static` - a nice tool to build qBittorrent from source"
tags: torrent, qbittorrent, c, c++
date: 2024-10-02
---

Hello there!

[qBittorrent](https://github.com/qbittorrent/qBittorrent) - is a nice torrent client based on `Qt` and [libtorrent](https://github.com/airium/libtorrent-rasterbar) libraries. The `Qt` library is a cross-platform UI framework, so, `qBittorrent` is also cross-platform. But there is a special version, called `qbittorrent-nox`. It doesn't have UI and the only option to control this client is WebUI. It's a good option for servers where the torrent client is running on a server and the end user controls it from the browser on a different machine.

To install `qBittorrent`, you can download the latest release from the official site or install it from any package manager. But I decided to go a different way build it from the source code and pack it into a docker image (I didn't know about [docker-qbittorrent-nox](https://github.com/qbittorrent/docker-qbittorrent-nox) repository or maybe it didn't exist at that time). To build `qBittorrent`, you can use the good old `./configure` and `make` approach or use `CMake`. So, I created a `Dockerfile` to build `libtorrent` as a static library, build `qbittorrent` and link it statically with `libtorrent`, other dependencies are installed from Alpine's package manager.

Here is my old `Dockerfile`:

```Dockerfile
FROM alpine:latest as base
RUN apk add --no-cache qt5-qtbase

FROM base as base-dev
RUN apk add --no-cache build-base \
                       automake \
                       libtool \
                       boost-dev \
                       qt5-qtbase-dev \
                       qt5-qttools-dev \
                       qt5-qtsvg-dev \
                       zlib-dev \
                       wget

ARG LIBTORRENT_VERSION=1.2.19
RUN wget https://github.com/arvidn/libtorrent/releases/download/v${LIBTORRENT_VERSION}/libtorrent-rasterbar-${LIBTORRENT_VERSION}.tar.gz && \
    tar xf libtorrent-rasterbar-${LIBTORRENT_VERSION}.tar.gz
WORKDIR /libtorrent-rasterbar-${LIBTORRENT_VERSION}
RUN ./configure --disable-debug --disable-shared --enable-encryption --with-libiconv CXXFLAGS="-std=c++17 -mtune=native -march=native" && \
    make -j$(nproc) && \
    make install

WORKDIR /
ARG QBITTORRENT_VERSION=4.6.7
RUN wget https://github.com/qbittorrent/qBittorrent/archive/release-${QBITTORRENT_VERSION}.tar.gz && \
    tar xf release-${QBITTORRENT_VERSION}.tar.gz
WORKDIR /qBittorrent-release-${QBITTORRENT_VERSION}
RUN ./configure --disable-gui CXXFLAGS="-std=c++17 -mtune=native -march=native" LDFLAGS="-l:libtorrent-rasterbar.a" && \
    make -j$(nproc) && \
    make install

FROM base as final

RUN adduser --disabled-password --no-create-home --shell /bin/sh --ingroup nogroup qbittorrent-user
RUN mkdir -p /config/qBittorrent/ && chown -R qbittorrent-user:nogroup /config/

COPY --from=base-dev /usr/local/bin/qbittorrent-nox /usr/local/bin/qbittorrent-nox

USER qbittorrent-user
CMD ["qbittorrent-nox", "--profile=/config"]
```

I knew that the project authors planned to migrate to `CMake` and remove the old approach in the release `qBittorrent 5.0`. So, I need to update my scripts. I started to google documentation for it and found this project [qbittorrent-nox-static](https://github.com/userdocs/qbittorrent-nox-static). It's _"a bash script which builds a fully static qbittorent-nox binary with current dependencies to use on any Linux OS"_. It required only `bash`, everything else is installed automatically. So, you just need to run `./qbittorrent-nox-static.sh all` (optionally add other options like `-o`). No more complex scripts, tools, or parameters. Just a single script.

Here is the updated `Dockerfile`:

```Dockerfile
FROM alpine:latest as build
RUN apk add --no-cache bash git
RUN git clone --depth 1 --branch release-5.0.0_v2.0.10 --single-branch \
    https://github.com/userdocs/qbittorrent-nox-static.git qbittorrent-nox-static
WORKDIR /qbittorrent-nox-static
ENV qbt_qt_version=6
RUN chmod +x ./qbittorrent-nox-static.sh
RUN ./qbittorrent-nox-static.sh -i -o all

FROM alpine:latest as final
RUN adduser --disabled-password --no-create-home --shell /bin/sh --ingroup nogroup qbittorrent-user
RUN mkdir -p /config/qBittorrent/ && chown -R qbittorrent-user:nogroup /config/

COPY --from=build /qbittorrent-nox-static/qbt-build/completed/qbittorrent-nox /usr/local/bin/qbittorrent-nox

USER qbittorrent-user
CMD ["qbittorrent-nox", "--profile=/config"]
```

In conclusion, building `qBittorrent` from the source by using `qbittorrent-nox-static` simplifies this by automating dependency management and building static binaries. The new approach reduces manual steps and makes it a reliable solution for maintaining a headless torrent client.
