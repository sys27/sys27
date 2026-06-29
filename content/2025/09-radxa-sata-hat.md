---
title: Trying the Radxa Penta SATA Hat with Raspberry Pi 5
description: My experience upgrading a Raspberry Pi homelab with the Radxa Penta SATA Hat. Motivations for moving away from SD card, switching to SSD with a modern file system.
tags: diy, homelab, raspberry-pi
date: 2025-08-03
---

Hello there!

I run a small homelab based on [Raspberry Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/). It's designed to boot from an SD card, and in most cases, it'd be fine. And it was fine until I started adding more services. I began to spot serious performance issues when working with an SD card. For example, pulling a Docker image could take several minutes even though the CPU load is almost 0%. Raspberry Pi wasn't able to write data fast enough, so the entire system "hung". And any IO-related command will work pretty slowly.

So, I decided to upgrade my homelab and change several things:

- Migrate to an SSD. Anyway, I have a "spare" one. It's an old SSD (128 GB) from the laptop; it's about 10-12 years old but still works fine.
- I wanted to change the file system. There is an old "standard" file system on Linux - `ext4`. It is ok, but it is missing several modern features that are present in other file systems: snapshots and Copy-on-Write. Snapshots allow you to create "backups" and restore a previous version of the file system in case of failure. So, until the file system is corrupted, I should be able to restore the system from the backup. It is important for the next point.
- Switch from stable to unstable channel of updates in the OS. I'm using [Manjaro](https://manjaro.org/) for my Raspberry Pi, but unfortunately, the stable channel hasn't been updated for ~1.5 years. That's why I needed an easy way to create backups. My existing approach with `rsync` or `dd` isn't so reliable and flexible.

The upgrate went relatively smoothly and it was quite fast because I already had Ansible Playbook to setup my homelab. Now, I have another problem. Two drives are connected to Raspberry Pi through USB-to-SATA adapters. It's not a big problem but probably there is a better solution for connecting multiple SATA drives to Raspberry Pi.

I found [Radxa Penta SATA Hat](https://radxa.com/products/accessories/penta-sata-hat/) - a perfect solution at first glance. It has 4 SATA ports with over power + 1 eSATA port. So, I can connect all my drives through one hat, and even more, I can connect one more HDD drive. This hat is connected via PCIe and should be able to provide reasonable speed. It provides the power to drives, so you don't need to mess with power supplies and connectors. Looks like a perfect solution. So, I decided to order this hat and try it out.

After about one and a half week, the hat arrived. It doesn't require a complex installation or a configuration. Almost everything you need to know is described in the documentation. But, unfortunately, it didn't work.

I forgot to check one simple detail, whether it is possible to boot from this hat. By default, Raspberry Pi 5 will boot from the SD card, and if a power supply is powerful enough (5V 5A), it will boot from USB drives. If a power supply can't provide 5A or it is incorrectly detected, it won't boot until you specify `usb_max_current_enable=1` in `/boot/config.txt`. But you can't boot from PCIe using this hat. Looks like the bootloader doesn't provide the power to the hat and doesn't check for boot drives there. I've tried some workarounds, but no luck. The hat is designed to convert your Raspberry Pi into a NAS, but it can't be used as a universal SATA connector. You still need to boot from the SD card or USB. I could try to set up some weird configuration where the OS is booted from an SD card, then it mounts the SSD to "critical" directories over the existing one. Or other ways to "merge" two drives into one. But for now, I will boot my Raspberry Pi from SATA-over-USB and use the SATA Hat to connect HDDs.

Radxa Penta SATA Hat also has small drawbacks. The first one is a cooling. If your Raspberry Pi has a heat sink and a fan, then you probably need to remove them. This hat is installed on top of the Raspberry Pi and doesn't provide a lot of space to install anything in between. In my case, I had to remove a fan and leave just a heat sink. The second problem is LEDs. They are too bright, and there is no way to disable them. The hat has 5 LEDs. One for each drive (bright blue LED) and one power green LED.