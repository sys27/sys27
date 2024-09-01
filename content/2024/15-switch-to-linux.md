---
title: I switched to Linux
description: My journey between different OSes
tags: linux, archlinux, windows, microsoft
date: 2024-09-01
---

Hello there!

# The first OS

As you might guess, the first OS was Windows. We got our first PC the early 2000s and I think it had Windows ME, maybe other versions else I'm not sure but definitely it was Windows. At that time, I didn't even know other operation systems existed. It was ok and enough to start using PC (mainly play games 😜). Over time, we tried a lot of different versions, like 98, 2000, XP, Vista, etc, but I still was a Windows OS.

Later, when we connected to the internet, I found out what virtual machines are and you can run an OS inside another OS. Initially, it was just VM with another copy of Windows as a playground. I really didn't like to "experiment" on the main OS, install some software, play with it, and remove it, but uninstallers aren't perfect. So, you still need to remove some files. VMs were perfect for such scenarios (later it will be replaced by `Docker`).

# First attempts of Linux

To run VMs, I used `VirtualBox`. It had options to run a lot of different OSes, including `Linux`. At that time, I knew `Linux` was a "hard" OS for developers where you need to know a lot of stuff and live in a terminal but I still wanted to try. I found that `Ubuntu` is a popular and "easy version" of Linux. So, I decided to try it. It was pretty easy to install and configure it. I played with it a bit. I tried a lot of different flavors of `Linux`. But I had one big problem. Why? Why do I need it? Why is `Linux` better than `Windows`?

For a long time, `Linux` was a toy. The only real use case was a VM with `Linux` to compile some `C/C++` code. In our university, we had a course where we needed to compile a `C/C++` code, I don't remember what it was, but usually, they allow you to use whatever programming language you want but not in this case. I didn't want to install a `C/C++` compiler (with a lot of dependencies and unnecessary stuff) just to remove it in a few weeks. So, I decided to use a small virtual machine with `TinyCore`, a compact `Linux` distribution. I configured a shared folder, edited code in `Windows` and compiled it in `Linux`.

# Let's try Mac OS

Later, after years of `Windows`, I wanted to try `MacOS`. So, I bought a basic version of Macbook Air. This OS wasn't something special. Yes, it has differences but from a casual user's point of view, it does everything you want pretty much the same way. The important part here is that because .NET Core become cross-platform, my overall interest in `Docker` / `Kubernetes` and other technologies. I started to use it as a home development machine and started to learn a lot of terminal commands. Yes-yes, I know `MacOS` is not `Linux` but still it is closer to `Linux` then `Windows`.

Around this time, I bought my first Raspberry Pi, I think it was version 3B, and I turned it into my home server. The Raspberry Pi team provides a Debian-based `Linux` distribution called Raspbian. So, I started to learn how to configure and manage my own server, from starting simple `systemd` services to manually managing `iptables` rules.

So, at this point, I had three active OSes. `Windows` - work and gaming, `MacOS` - home/casual development, `Linux` - home server.

Also, it's worth to mention `WSL`. Initially (in `WSL1`), it was a compatibility layer in `Windows` which allowed running `Linux` apps in `Windows`. No virtualization, they did something similar to `WINE` but the other way around. Later, `Microsoft` introduced a second version which is just a lightweight virtual machine and now it even allows you to run GUI apps. And still, I considered it as an addition to `Windows` to run some `Linux` apps while I am in `Windows` with a seamless integration between these OSes. But nothing more, not even close to the main daily driver.

# Daily use of Linux

In 2022, I fully switched to `MacOS` as a main OS. It was a home system and a system for work at the same time. Because of such a slow transition, I was ready and it didn't cause any significant problems. .NET Core is cross-platform and works fine on `MacOS`. Visual Studio for Mac is a shit but you can use Visual Studio Code for small projects or JetBrains Rider for everything else. For databases, you can always spawn a `Docker` container.

But what about `Linux`? At this point, I was using `Manjaro` (an `ArchLinux`-based distribution) on `Raspberry Pi 5` but then I decided to switch to `Manjaro` on my work laptop. Unfortunately, because of some stupid policies in our company, to use you own device for work (BYOD), you need to install some corporate bloatware. Basically, you need to hand over your device to a company. I couldn't use my Mac anymore, so I decided to switch to `Linux` instead of `Windows`. And again, because of Mac and home server experience, it wasn't something special. Just another OS with its own small things.

So, a small recap, there is a last `Windows` PC. It was a powerful machine to run games on near-top settings. Also, I bought `SteamDeck`, a handheld device. It is based on `ArchLinux` and it will be important later.

`Microsoft` introduced Copilot and Copilot+ PCs. The overall idea is pretty nice, a tool to help you to do routine work. Like GitHub Copilot which is perfect for generating boilerplate code, basically "Intelligent" IntelliSense. But there is a "dark" side of Copilot. It is called "Recall". It is a thing that watches your screen, records screenshots and information from it, and allows you to search for anything in this information with the help of AI or it helps with suggestions. Again, the idea of these features is pretty nice. BUT. There is one small security problem. `Microsoft` records everything about you. It is a privacy disaster, even if `Microsoft` manages to implement it safely and no one, except owner, will be able to access this data.

I decided that my journey with `Windows` ends now and I want to use `Linux` for gaming also. I'm glad I've tried `SteamDeck` because it showed that gaming on `Linux` is not so bad. Yes, you still can't run some games, because of bugs, performance, or anti-cheats but I think I can live with it.