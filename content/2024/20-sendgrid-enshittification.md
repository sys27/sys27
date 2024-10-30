---
title: SendGrid - enshittification
description: Better to choose something else
tags: sendgrid, email
date: 2024-10-31
---

Hello there!

[SendGrid](https://sendgrid.com/) is a cloud-based e-mail service. It has a lot of features but the main one is simplicity to set up. You don't need to configure the SMTP server to send emails, you just need to use API (usually via a library).

I integrated `SendGrid` into one of my previous projects and had a good experience with it. It has a free tier for testing or small businesses and requires almost no time to setup. So, on the next project, I decided to use it again.

Unfortunately, `SendGrid` went through the famous _"enshittification"_ process. The last time, I was able to register a new account to my work email address. No question asked, just use it within the free-tier limits. Now, I decided to register it to my personal account because I no longer work in that company and don't have access to my old email address.

The registration (and email confirmation) process went well. But after a couple of seconds (clicked a link or refreshed the page), my account was blocked. With the typical enterprise non-sense message. 

> After a thorough review, we regret to inform you that we are unable to proceed with activating your account at this time. Ensuring the security and integrity of our platform is our top priority, and our vetting process is designed to detect potential risks. While we understand the importance of transparency, we are not able to provide the specifics of our vetting process.

- _"After a thorough review"_ - I guess they have the fastest reviewers on the planet.
- _"the security and integrity of our platform"_ - usually, new users are welcome to the platform (unless they are bots) but `SendGrid` considers them as a threat.
- _"we are not able to provide"_ - this sounds like the best policy in the world: "I had a bad day, let's ban some users for fun."

And yeah, I'm not the only one who has problems with `SendGrid` for example: [1](https://www.reddit.com/r/SaaS/comments/14f8ru3/dont_waste_your_time_with_sendgrid/), [2](https://www.reddit.com/r/rails/comments/18j4rvh/do_people_here_still_use_sendgrid_for_email_im/), [3](https://www.reddit.com/r/SendGrid/comments/1dbpooi/sendgrid_we_are_unable_to_log_you_in_at_this_time/), [4](https://www.reddit.com/r/SendGrid/comments/1cifq4h/created_a_sendgrid_account_in_2021_but_discovered/), [5](https://www.reddit.com/r/SendGrid/comments/1feezfj/sendgrid_still_doesnt_work_a_year_later/).

So, I don't think `SendGrid` worth it any more. You can easily find alternatives in Google but personally, I'm considering setting up our own SMTP server.
