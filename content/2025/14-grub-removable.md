---
title: Why MSI Motherboards Ignore GRUB and How to Fix It
description: A practical guide to fixing GRUB boot issues on MSI motherboards when installing Arch Linux.
tags: archlinux, grub, bootloader, secure-boot, efi, uefi
date: 2025-12-28
---

Hello there!

Recently, I've tried to install `Arch Linux` on my main PC from scratch. Usually, I did it in virtual machines or laptops, and everything was fine. But this time, I faced an issue. The `MSI` motherboard doesn't detect the `GRUB` loader at all and doesn't boot the OS.

The Arch Linux installation process is not complex but still requires some skills. I usually follow the official [Installation Guide]((https://wiki.archlinux.org/title/Installation_guide)) and install [GRUB (ArchLinux Wiki)](https://wiki.archlinux.org/title/GRUB) as a bootloader, and use [sbctl](https://wiki.archlinux.org/title/Unified_Extensible_Firmware_Interface/Secure_Boot#Assisted_process_with_sbctl) to sign images to support `Secure Boot`.

I use the following command to install `GRUB` as specified in the documentation:

```bash
grub-install --target=x86_64-efi --efi-directory=/mnt/boot --bootloader-id=GRUB --modules="tpm" --disable-shim-lock
```

As it works fine, it installs `GRUB` to the `boot` partition, and even `efibootmgr` shows that it added a new record to the boot list. But unfortunately, it doesn't work on `MSI` motherboards. And it is not a `Secure Boot` issue, it doesn't work even with disabled `Secure Boot`.

For some reason, `MSI` ignores all `EFI` loaders except fallback ones. These fallback loaders should be located in the specific path, defined by the `EFI` specification: `/boot/EFI/BOOT/BOOTX64.EFI`.

So, to fix this problem, you need to install `GRUB` there. `GRUB` has `--removable` flag that is designed exactly for this purpose:

> Some UEFI firmwares require a bootable file at a known location before they will show UEFI NVRAM boot entries. If this is the case, grub-install will claim efibootmgr has added an entry to boot GRUB, however the entry will not show up in the VisualBIOS boot order selector. The solution is to install GRUB at the default/fallback boot path: `grub-install --target=x86_64-efi --efi-directory=esp --removable`.

The final command:

```bash
grub-install --target=x86_64-efi --efi-directory=/mnt/boot --bootloader-id=GRUB --modules="tpm" --disable-shim-lock --removable
```

Maybe it is just an issue in the motherboard firmware, or maybe it is some kind of "conspiracy theory". Anyway, I probably shouldn't buy `MSI` motherboards anymore.