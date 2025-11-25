---
title: "TIL: `rclone`"
description: "How I used rclone to automate syncing between cloud storage services and my home lab."
tags: diy, homelab, rclone, dropbox, google-drive
date: 2025-11-25
---

Hello there!

# Intro

I've been using various cloud storage services for a long time. I "replaced" my USB drives with cloud storage more than 10 years ago. Usually, I use it as a backup storage or as an easy way to share small files between different machines.

I could use my home lab for this case with the help of `Tailscale`, but it is not as convenient as cloud storage and is not reliable. I have an old HDD drive and don't use snapshots or RAID to increase reliability (mainly because it doesn't store anything important).

The overall idea was to install something to sync Dropbox, Google Drive, and a folder on NAS. So, I no longer need to do it manually. When a file is added to Dropbox, it will be automatically synced to a local folder and then to Google Drive. I knew there were several existing tools for it, like `TrueNAS`, `NextCloud`, `OpenCloud`, `OpenMediaValue`, etc. But some of them don't support such features. Some of them are entire OS, I don't have a virtualization or a tool to manage VMs easily like `Proxmox`. Some of them are overbloated with unnecessary features. So, I decided to try `rclone`.

# `rclone`

> Rclone is a command-line program to manage files on cloud storage. It is a feature-rich alternative to cloud vendors' web storage interfaces. Over 70 cloud storage products support rclone including S3 object stores, business & consumer file storage services, as well as standard transfer protocols. [rclone](https://rclone.org/)

To configure the Google Drive connection, you need:

```bash
rclone config
```

It will walk you through several configuration options, and read its output carefully. There are several important notes. First of all, if you are running it on a server without a GUI, you can't use the default auth via browser, but don't worry, the setup guide will explain how to get a token from your desktop. The second thing is `client_id`/`client_secret`, you can provide empty values, and `rclone` will use their own credentials, but it may cause performance problems because `Google` applies the rate limiting on a per-app basis. So, all users with default credentials will share these limits. This step is more complicated, but again, `rclone` will provide a link to the documentation on how to set up your own Google app and get `client_id`/`client_secret`.

Then we need to do an initial sync:

```bash
rclone bisync <local_path> <cloud_name>:/ --create-empty-src-dirs --compare size,modtime,checksum --slow-hash-sync-only --resilient -MvP --fix-case --drive-acknowledge-abuse --drive-skip-gdocs --conflict-resolve path1 --resync
```

You need to run the command with the `--resync` options only once. It checks both sides and makes them match. Later, you just need to run for incremental sync:

```bash
rclone bisync <local_path> <cloud_name>:/ --create-empty-src-dirs --compare size,modtime,checksum --slow-hash-sync-only --resilient -MvP --fix-case --drive-acknowledge-abuse --drive-skip-gdocs --conflict-resolve path1
```

One thing left is to configure `crontab` or `systemd` to run `rclone` automatically. I decided to go with `systemd` and create two services. The first one to run `rclone`, the second one to trigger it every hour.

rclone.service:
```ini
[Unit]
Description=Sync Google Drive
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=pi
Group=pi
WorkingDirectory=/home/pi/
ExecStart=/usr/bin/rclone bisync <local_path> <cloud_name>:/ --create-empty-src-dirs --compare size,modtime,checksum --slow-hash-sync-only --resilient -MvP --fix-case --drive-acknowledge-abuse --drive-skip-gdocs --conflict-resolve path1
```

rclone.timer:
```ini
[Unit]
Description=Run Google Drive Sync on Timer

[Timer]
OnCalendar=hourly
Persistent=false

[Install]
WantedBy=timers.target
```

Initially, I wanted to implement three-way sync. Run sync between `Google Drive` and a local folder. Run sync between `Dropbox` and a local folder. And run sync between `Google Drive` and a local folder again, to sync files introduced by `Dropbox`. But unfortunately, `Dropbox` has rate limits. `rclone` can handle them on the initial sync (`--resync`), it will just wait for 300 seconds (5 minutes) and try again. But later, on the incremental sync, it starts to report errors and requires `--resync` again. So, I decided to drop `Dropbox` entirely. Anyway, I wanted to migrate to `Google Drive` a long time ago. So, `rclone` helped me to do it automatically.

# Conclusion

`rclone` turned out to be exactly the kind of tool I needed - lightweight, flexible, and powerful without requiring a full ecosystem like `TrueNAS` or `NextCloud`. With just a bit of configuration, I now have fully automated synchronization between my local storage and `Google Drive`.

Even though my original three-way sync idea didn’t work out due to `Dropbox` API limits, it pushed me toward finally consolidating my files on `Google Drive`, which I’ve been meaning to do anyway.

`rclone` is definitely worth a try.