---
title: Cisco VPN on Arch Linux
description: Resolving Cisco VPN client crashes on Arch-based Linux due to libxml2 version conflict. Learn how to build and use an older version of libxml2.
tags: cisco, linux, archlinux
date: 2024-04-24
---

Hello there.

Sometimes you need to connect to a Cisco VPN on Linux, in my case, it is Manjaro (Arch-based Linux). And because Arch is Linux with rolling updates, you receive all "latest and greatest" packages. What causes certain versions of Cisco VPN client to crash with the following error:

```
parse error : Extra content at the end of the document
```

Cisco VPN has a dependency on the `libxml2` library and Arch has something like `libxml2 2.12.6-1` which is too "new" for Cisco. You could downgrade the package but because it is a system-wide package and other parts of the system have a dependency on it, it might be not the best decision. Alternatively, you can build the old version of `libxml2` and ask Cisco to use your version. To do it, you need:

- checkout `libxml2` from archlinux repository: `git clone https://gitlab.archlinux.org/archlinux/packaging/packages/libxml2`
  it is not a repository with a source code for `libxml2` but instead it contains build scripts.
- switch to tag: `2.9.13-1`
  I decided to switch to this version because I'm sure Cisco works on it.
- build it: `makepkg`
- copy binaries from `./pkg/libxml2/usr/lib/libxml2.so*` to some folder: `/opt/libxml`
  You don't need to copy binaries to any folder and you can use them directly from the build folder. I decided to copy them to `/opt/libxml` just for simplicity and a short path.
- run Cisco: `LD_LIBRARY_PATH="/opt/libxml:$LD_LIBRARY_PATH" /opt/cisco/anyconnect/bin/vpnui`
  By using `LD_LIBRARY_PATH` we can override search for the loader. I will try to look for libraries in `/opt/libxml` and only then in other system folders.
- profit!!!

_Note: Even though Cisco works on Linux, it still looks like a sh**. You can't even freely download a client for it. Personally, I prefer OpenVPN or WireGuard - easy to setup, works everywhere. Also, this article is only about Arch-based Linux, it might be non-relevant for other flavors._