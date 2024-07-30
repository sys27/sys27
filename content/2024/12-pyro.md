---
title: "Pyro Project: Announcement"
description: "The announcement of Pyro Project - a platform designed to manage and collaborate on code, repositories, issues, and pull requests."
tags: .net, aspnetcore, docker, git, ci-cd, pyro
date: 2024-07-29
---

Hello there!

# Introduction

Pyro is a hobby project. Lately, I started to have an interest in DevOps and everything related to it, I studied a lot of different CI/CD software, clouds, IaC tools, etc, and accidentally checked the pricing of various platforms for development (like GitHub, GitLab) and found that it is kind of aggressive (at least from my point of view). You need to pay for each developer (user) of this platform + the price for license/subscription/hosting.

So, I decided to try to create my own solution. Something designed for a small team or an organization. Something easy to deploy and use. Something with the latest tools. No external dependencies, a single container to run.

Yeah, I know, I know. Usually, it's a bad idea to code your version and compete with a huge company. They have more resources (money, developers, tests, users). But then the second reason appeared: why not? That simple. It should be quite an interesting project to create something on your own. Especially, such tasks like integration with `git` or implementation of pipelines and runners for them. Also, it should be a good practice to try new/different staff on a "real" project, like vertical slices architecture, DDD-like architecture, or newer versions of `Angular`. I had an experience with older ones, from 2 to 6. So, that's why I decided to choose `Angular` instead of `React`, which is more popular. I'm not so interested in frontend development and I needed something to solve a problem.

Supported features and future plans can be seen in the next sections. But yeah, like with any hobby project, I could abandon the project. The current version has basic features and you can deploy and use it right now but you need to understand, that it is not even close to any "production" release, and breaking changes could be introduced in every commit.

# Supported features

Right now, the project has a limited set of features. Only the basic staff is implemented:

- Management of git repositories
  - Create/update repositories
  - View tree structure and branches
  - View content of files
- Git Server over HTTP/HTTPS
  - push/pull based on `git-http-backend`
- Basic authrozition/authentication features (`JWT`)
  - login/logout/refresh
  - access tokens for `git`
- SQLite as a database
- Published as standalone appication (Docker Container)
- UI based on `Angular`

# Future plans

- Native C# implementation of `git` server
- Push/pull over SSH
- Issues
  - Manage issues (create/update/delete)
  - Statuses add Transition rules
  - Tags
  - Releases
  - Lock issues
  - Track issues in commits (on push, merge, etc)
- Pull Requests
- Pipelines
- Dashboard (better start screen)
- Setup Assistant
- Bugfixes 🙃