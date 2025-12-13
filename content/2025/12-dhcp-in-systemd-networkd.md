---
title: Effortless NAT and DHCP with systemd-networkd on a Proxmox Homelab
description: I discovered how surprisingly useful systemd-networkd can be for managing routing, NAT, and DHCP without manual iptables setups or extra network tools.
tags: diy, homelab, network, systemd-networkd
date: 2025-12-13
---

Hello there!

# Intro

The other day, I was playing and experimenting with `Proxmox` on my old laptop. I had an idea to repurpose it as my homelab server instead of `Raspberry Pi 5`. It is more powerful (`Intel Core i7 6700HQ`), has more RAM (16 GB instead of 8 GB), has the integrated GPU (probably I could use it for services like `Plex` or `Jellyfin`), and it is an x64 CPU, so I could install `Proxmox` and spawn multiple VMs for different needs.

The initial idea was to create 3 VMs, one to migrate the existing `Raspberry Pi` server, one is a router/firewall (`pfSense`, `opnSense`, `FreeBSD`), and the last one for `Home Assistant`. I started experimenting with different OSes and network configurations, and in the end, it worked. But I realised that I don't need the router OS at all, I can install anything and configure strict firewall rules and `SNAT`/`MASQUERADE` there. Also, I started testing the network speed, and unfortunately, the speed was disappointing. The laptop doesn't have any Ethernet ports at all, but it has a USB3-to-Ethernet adapter. This adapter has a maximum speed of around 350 Mbit/s, which is really slow; my `Raspberry Pi 5` provides about 800 Mbit/s. So, I decided to put the migration to the laptop on hold.

While I was experimenting with different OSes and networks, I found a pretty interesting feature of the `systemd-networkd` service.

# `iptables`

My goal was to configure `SNAT`/`MASQUERADE` between two networks, one of which is a public network (even though technically it was a private network assigned by my router, but from the `Proxmox` point of view, it is public). The second one is private, the internal virtual network of the `Proxmox` server.

I did it before, so I knew it wouldn't be a problem. Just need to enable the IPv4 packet forwarding and add several `iptables` rules. But it is a manual configuration; there is an alternative approach.

To allow packet forwarding, you need to add `net.ipv4.ip_forward = 1` to `/etc/sysctl.conf `. Otherwise, `Linux` will ignore such packets.

`SNAT`/`MASQUERADE` allows to configure the packet routing between two networks. It is a feature of `iptables` - a Linux tool to filter and process IP packets.

The IP packet has two fields: `Source IP` and `Destination IP`. `Source IP` has an IP address of the current machine; it is needed to be able to send a response back. But here is a problem: if we keep the packet unchanged, then it will have the IP address from the private network. This network is unreachable from the public network, and in case of private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), we don't know where exactly this IP is, because there are multiple private networks with the same IP address. To solve this, we need to replace `Source IP` with the IP address from the public network. So, we will know where to send the response. The same process happens on the return path, but now `Destination IP` is modified. `iptables` is stateful and will be able to understand where to send the packet on the way back. So we don't need to add additional rules.

`SNAT` modifies `Source IP` to a static IP address specified in the `iptables` rule. If the IP address changes, the rule needs to be modified; otherwise, it won't work. `MASQUERADE` is smarter, it uses an IP address from and interface, so, it will automatically pick up a new address.

SNAT:
```bash
iptables -t nat -A POSTROUTING -o <public_network> -j SNAT --to-source <ip_address>
```

MASQUERADE:
```bash
iptables -t nat -A POSTROUTING -o <public_network> -j MASQUERADE
```

Also, depending on the configuration of your `iptables`. You might need to add additional rules to allow forwarding traffic between networks.

# `systemd-networkd`

`systemd-networkd` is a network manager service, a service to configure networks, static IPs, DHCP, like `NetworkManager`, `dhcpcd`, etc. It could be combined with `systemd-resolved` to provide DNS. It is a part of `systemd` and because `systemd` is installed on a lot of operating systems, you can get a network manager for free.

The network configuration is described in `*.network` (`ini`-like) files.

```ini
[Match]
Name=<network_name>

[Network]
Address=10.0.0.0/24
DHCPServer=yes
IPMasquerade=ipv4
IPv4Forwarding=yes
EmitDNS=yes
DNS=192.168.1.1
```

Where `IPMasquerade` allows you to configure `MASQUERADE` automatically, `IPv4Forwarding` enables packet forwarding in the kernel. Even though `IPv4Forwarding` is not required, because if `IPMasquerade` is enabled, then `systemd-networkd` will enable `IPv4Forwarding` automatically, according to documentation.

Also, `systemd-networkd` has a bonus feature - a built-in `DHCP` Server. In the raw `iptables` setup, you need to manually install a `DHCP` Server and configure it, or use a static network configuration on each VM. With `systemd-networkd`, you can add `DHCPServer=yes` and that's it, now your server will provide an automatic network configuration on the internal network.

So, a single `*.network` file simplified my setup a little bit.

# Conclusion

Experimenting with different operating systems and network setups led me to appreciate how much functionality `systemd-networkd` quietly provides. Instead of manually configuring iptables rules, installing a separate `DHCP` server, systemd-networkd can handle NAT, forwarding, and address assignment with just a few lines in a `*.network` file. Even though the limitations of my hardware paused the full homelab migration, it’s something I’ll definitely use in the future.