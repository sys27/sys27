---
title: "TIL: Tailscale is a cool tool"
description: An overview of Tailscale - a mesh VPN tool built on WireGuard. How it differs from traditional VPNs, and how I use it to securely access my home setup from anywhere.
tags: vpn, wireguard, tailscale, homelab
date: 2025-07-21
---

Hello there!

# Intro

Today I want to share my experience with Tailscale. What it is, how I use it and why it is so cool.

# What is Tailscale

[Tailscale](https://tailscale.com/) is a mesh VPN service that simplifies secure networking by connecting your devices directly over the internet - no need for manual firewall tweaks or complex routing.

The main feature is a peer-to-peer mesh network. Tailscale establishes direct [WireGuard](https://www.wireguard.com/)‑encrypted connections between your devices, creating a private, secure network regardless of where each device is located. Only if direct connection fails, traffic is relayed securely through [DERP](https://tailscale.com/kb/1232/derp-servers) (Designated Encrypted Relay for Packets) servers, but never decrypted by Tailscale.

The connection between nodes is incredibly fast because `Tailscale` is based on `WireGuard`, which has proven its performance (for example, compared to `OpenVPN`). Also, it provides strong encryption and security based on modern encryption algorithms. `WireGuard` is not based on `OpenSSL` but instead has its own implementation.

Tailscale is free for personal use. There are paid plans for Enterprise use with some additional features. But for the "home-lab", it should be enough.

# Tailscale is NOT a VPN

Well, I lied. It's a VPN. Ba-dum-tss. Wait a second, don't close the page. Hear me out.

I found out about `Tailscale` from a YouTube video where it was advertised with extensive use of the `VPN` keyword. Also, the official documentation uses it.

And even though it is technically correct. Tailscale provides a `VPN` based on a mesh network (peer-to-peer connections) for free. But from my perspective, `VPN` and mesh networks are slightly different things.

Usually, `VPN` means that there is a central server and all devices are connected to this server (a "star" topology, if you will). This central server (or a cluster of servers) provides all features, creates a private network, routes all traffic, and handles advanced access features (auth, ACL). But the main point here is all traffic goes through it, decrypted on a server and sent to the public network. So, this server has access to your data.

A mesh network is a network of peer-to-peer connections where each device is directly connected to other devices. There is no central server to handle traffic, and with the help of end-to-end encryption, there is no easy way to steal your data. Yes, `Tailscale` has a central server (with some closed-source software), but it is needed to establish an initial connection. Or if it has failed to establish a direct connection, to fall back to "old" school VPN.

From the user's point of view, the "free" VPN sounds scary. Generally, free VPNs are a scam. Such services either use aggressive marketing, and soon the "free" plan will be removed, or they are selling your information to third parties. So, you are paying with your private information. And initially, I thought it was the case for `Tailscale`.

But `Tailscale` provides a mesh network. So, it is totally safe to use.

BTW, there is a pretty interesting article: [How NAT traversal works](https://tailscale.com/blog/how-nat-traversal-works). It explains internals of how `Tailscale` can establish a connection for all clients even if they are behind `NAT`. It reminded me about `WebRTC`, `STUN`, `TURN`, and other stuff. 

# My use cases

In the [previous post](https://exploding-kitten.com/2025/05-diy-ir-remote), I described how to build (DIY) an AC remote control based on ESP32 and Home Assistant. So, I no longer need to rely on AC manufacturer's servers. But here is one small problem: it is only accessible from the internal network. I can't control it from the outside. So, I started to look for solutions.

I had an experience of building my own VPNs based on `OpenVPN` or `WireGuard` before. It is not something complex but requires a "public" IP address. Unfortunately, my ISP provides it as a separate paid feature. So, I had two options to build a "public" ip address and build VPN or use existing paid/free service.

| Feature                     |  OpenVPN  | WireGuard |     Tailscale     |
| :-------------------------- | :-------: | :-------: | :---------------: |
| Private Network             |     ✓     |     ✓     |         ✓         |
| Internet Access (Exit Node) |     ✓     |     ✓     |         ✓         |
| Custom DNS                  |     ✓     |     ✓     |         ✓         |
| Encryption                  |    ✓*     |     ✓     |         ✓         |
| Cross-Platform              |     ✓     |     ✓     |       ✓***        |
| Setup                       | complex** |   easy    | **extremly easy** |

- \* \- requires you to explicitly disable old algorithms.
- \*\* \- `OpenVPN`'s community created helper scripts to simplify initial setup, but the original project could have quite complex configuration.
- \*\*\* \- has a lot of integrations with clouds.

Any option solves my needs; the only difference is setup. `Tailscale` only requires you to install their software from a package manager or download directly from the site. After installation, all devices will be connected to the private network.

My setup requires several additional steps. To allow all clients to use my Raspberry Pi 5 as an exit node (route all traffic through Raspberry Pi), you need to use this command: `tailscale set --advertise-exit-node`, go to your admin panel and enable your exit node. In addition, to allow use of my Pi-hole DNS server, you need to use: `tailscale set --exit-node-allow-lan-access`, go to your admin panel, `DNS` settings, add your Pi-hole IP address as a custom DNS server. Now, all devices will have access to network ads blocking and your custom domains.

That's it. No long configuration files or other complex setups. All my local services are accessible from anywhere.

# Conclusion

Tailscale has completely changed the way I think about secure remote access and networking. What started as a search for a simple way to control my home automation setup remotely turned into a deeper appreciation for how elegant and powerful mesh networking can be, compared to traditional `VPN` solutions like `OpenVPN` or plain `WireGuard`.

It’s easy to install, secure by design (thanks to `WireGuard`), and just works across platforms and networks. For personal projects, home labs, Tailscale offers an incredibly user-friendly yet robust solution. I highly recommend giving it a try.