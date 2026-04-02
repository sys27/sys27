---
title: Proxmox backup freeze in VM with btrfs
description: This post walks through the backup strategy and the unexpected interaction between Proxmox and btrfs that required a simple but effective workaround.
tags: diy, homelab, proxmox, backup
date: 2026-03-16
---

Hello there!

Recently, I migrated my home lab from a Raspberry Pi 5 to an old laptop. Anyway, the laptop is too weak to be used for anything else, but running a home lab is good enough. I've installed `Proxmox` there, and the initial plan was to install 3 VMs. The first one is the main server with all services (copy of the previous Raspberry Pi setup), the second one is for `Home Assistant`, and the last one is for router/firewall OS. Currently, I'm running only two of them; I haven't created a router/firewall VM. But this article is not about VMs, but about backing them up.

I've created several ways to recover from the disaster.

The primary one is utilizing a snapshot-based file system. I've installed the server on `btrfs` and configured automatic backup via snapshots. The snapshot includes everything, even the kernel and the bootloader, of course, everything except the home directory and other unnecessary directories. So, at any point in time, I can restore a single file or the entire file system. Even if the system doesn't boot, I can boot from the Live CD and restore the snapshot. It should work as long as the file system is not corrupted.

The next "level" of recovery is using Proxmox's built-in feature to create backups. It is a pretty simple one. It just creates a copy of the VM's disk and VM's configuration and stores it on the external drive. So, if I can't use `btrfs` to restore my server for any reason, I still can use the full VM backup file. The downside of this approach is the loss of recent changes to the server, because the backup is created only once per month.

The last one is to install everything from scratch. I've created a ansible playbook to install and configure my Raspberry Pi several years ago. So, even if I can't use two other approaches, I still can set up my home lab pretty quickly.

At this point, everything looks fine, but there is one small problem. The Proxmox backups don't work. The configuration looks good. Some VMs are backed up fine. But the most important one - the main server - is stuck. Proxmox starts the backup process but never finishes it.

The first hint was the file system in the VM. The main server has `btrfs`, whereas `HomeAssistant` has `ext4`. So, maybe it has something to do with the file system. So, I've tried to spawn a small VM with `btrfs` and ran a backup. The same error. So, I was right.

After some research, I found out that it might be related to the file system freeze feature. So, Proxmox can prevent any changes to files in VMs in several ways. It can send an fs freeze call via `qemu-guest-agent`. Or it can do it the old way, stop the VM. 

Initially, I didn't want to stop the VM, because it may cause some problems, like down DNS and DHCP servers. So, I've tried to solve the problem with the fs freeze. As far as I understand, `btrfs` should support it, but for some reason, it didn't work.

In the end, the best solution was to use the stop VM approach. The backup doesn't cause a long downtime. Maybe it uses CoW/snapshots to prevent changes during backup and create a quick temporary backup image. So, it starts the VM back pretty much immediately.

By combining `btrfs` snapshots, Proxmox VM backups, and infrastructure automation with `Ansible`, it’s possible to build multiple layers of protection against failures. Even though the `btrfs` filesystem caused issues with the filesystem freeze mechanism, switching to the stop-mode backup approach turned out to be a practical solution with minimal downtime.