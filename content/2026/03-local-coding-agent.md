---
title: The state of local coding agents
description:
tags: diy, homelab, ai, llm, coding-agent
date: 2026-04-09
---

Hello there!

# Intro

Lately, I've started to play with different local LLMs, tools to run them, and coding agents. In this article, I'll explain what I've learned so far and what works best for me.  

# My use cases

I'm not an "AI believer" who thinks "developers are obsolete," nor an "AI skeptic" who thinks LLMs are useless. Usually, the truth is somewhere in between. The current state-of-the-art models are good, but at the same time, they aren't even close to being a real software engineer. And even if the "AI bubble" will burst tomorrow, LLMs won't disappear because they still have a lot of completely valid use cases.

Personally, I don't use LLMs and coding agents for vibe coding at all. I'm not interested in "one-shot prompts" to implement the entire application. I still like coding and don't want to remove it from my workflow. I'm using coding agents as a helper tool: a second developer who will follow your instructions and relieve you from boring tasks.

Sometimes, you need to refactor existing code, and it may cause a lot of changes and compilation errors. Previously, I used several steps of find-and-replace regular expressions to modify the entire code base. They aren't so reliable, because it is pretty hard to create a universal regexp to handle all cases. In the end, you still need to fix code here and there manually. It is slow and boring. LLMs are insanely good at pattern detection. You can explain what you want, provide some examples, and it will apply the changes to the code. The beauty here is that it doesn’t require the code to be exactly the same; it can adapt to slightly different approaches on the fly.

# Ollama and Open Web UI

I started by using `Ollama`. It was an easy choice, it supports a lot of hardware, easy-to-use "Docker-like" CLI, has a lot of prebuilt models. I had known about this project for quite some time, but never considered it for local LLMs, because of the lack of powerful hardware and a real use case. For me, it was just a toy to deploy LLMs locally.

I didn't think about what model to run and decided to use one well-known model - `gpt-oss:20b`. As a newbie, you'll face "choice paralysis": a huge list of models, each with a lot of different parameter sizes, dense vs mixture-of-experts (moe), thinking vs non-thinking, etc. So, even if `gpt-oss-20b` might not be the best model, it is good enough for the first steps into local LLMs.

The next logical step is to set up a ChatGPT-like UI to chat with LLMs. The `Ollama` documentation provides several links to different integrations. One of them is `Open WebUI`. It is simple to use and makes it easy to deploy a ChatGPT-like UI that supports `Ollama`. Gladly, `Ollama` runs in `Docker` with the help of `Nvitia Container Toolkit`. So, you can create a `Docker Compose` file and deploy `Ollama` and `Open WebUI` locally with a single command.

# OpenCode and Claude

The next step is to experiment with coding agents. I gave `OpenCode` and `Claude Code` a try, because `Ollama` supports them out of the box. You can start it by using one command, and it will configure the coding agent for you to use local models.

Initially, the results were extremely bad. It wasn't able to generate `AGENTS.md` after the `/init` command. But I quickly realised that it is related to the small default context window - 4096 tokens. It's too small for coding agents. I found an approximation that 1 token is about 3-3.5 symbols. 4096 tokens = 10k-12k symbols. On real projects, you will fill the entire context window with a single prompt and one file. So, to get reliable results, you need as big a context window as your memory allows, preferably 128k+. After fixing the context window size, I started to receive okay-ish results from local coding agents.

For the next several days, I experimented with different tasks (to refactor/implement/fix something) just to see how the local LLM behaves. I installed several MCPS and plugins. 

# Unreliable results and context window limits

Everything looked good except for two problems.

The first issue is performance, about 20 tokens per second. It was ok for chatting, but it was too slow for a local coding agent. Unfortunately, I thought there was no easy way to fix it. You just need to buy a more powerful GPU with a lot of VRAM.

The second one is a "fake" 128k context window. Even though `gpt-oss:20b` supports 128k and I also configured `Ollama` to use 128k also. For some reason, after roughly 30-32k of tokens had been used, LLM became stupid as fuck. It forgot how to call/use tools or some information that it has read before. I assume it could be related to some kind of context compression. For example, `Ollama` could detect that you are close to the context limit, so it replaces some parts of your context with a summary, which reduces the quality of responses. Or simply, it could evict the first messages (including the initial system prompt) when the context is full. But here's the thing: 32k is just a quarter of 128k. It still has plenty of tokens left.

I thought maybe it was an issue with `gpt-oss:20b` and started experimenting with other LLMs: `qwen3.5`, `qwen3-coder`, `nvidia-nemotron`, etc. But the results were the same. So, I started to suspect an issue with my `Ollama` setup. Unfortunately, I didn't find any particular solution to fix this problem in `Ollama`. So, it was time to try something else.

# llama.cpp

The next thing I wanted to try was `llama.cpp`; after all, `Ollama` is based on `llama.cpp`. So, it seemed reasonable to try `llama.cpp` directly. I also knew about `vllm` but, as far as I understand, it is a "big production" scale project, intended for multi-user setups and heavy load. So, probably, `vllm` is not for me.

`llama.cpp` is a huge project that can efficiently utilize different kinds of hardware, starting from simple CPU and GPU inference, ending with support for the latest Apple Silicon features. It also has a lot of configuration options and a not-so-user-friendly CLI. At first, you will need to google a lot of stuff, just to be able to run a model.

`llama.cpp` doesn't provide prebuilt packages with CUDA support. So, if you have an Nvidia GPU, you will need to build it from source. It is not a big deal, especially if you have experience building other projects from source on `Linux`, or you can find plenty of articles through Google.

When the project is built and all options are explored, it's time to run a model. First of all, you need to download it. `llama.cpp` uses its own `GGUF` format to store models, and you can find a lot of models in this format on [Hugging Face](https://huggingface.co/).

I'm using quantized models from [Unsloth](https://unsloth.ai/). LLM quantization is a technique used to make large models smaller by reducing the numerical precision of their weights. For example, by default, a lot of models use `f16` or `f32`, which provides high precision, but requires a lot of memory, because each parameter is represented by 16 or 32 bits. Quantization reduces the size of a parameter, but it is not a silver bullet. The quantization reduces the quality of LLM. For local LLMs, usually, people use `q4` - 4 bits per parameter, as a balance of memory usage and quality of responses. `Unsloth` converted all popular models to `GGUF`, quantized them and provided recommended parameters to run them.

# Performance

I tried to run `gpt-oss:20b`: `llama-server -m gpt.gguf --host 0.0.0.0 --port 11434 --flash-attn on --cache-type-k q8_0 --cache-type-v q8_0 --ctx-size 131072 --temp 1.0 --top-p 1.0 --top-k 0 --jinja` and was impressed.

`llama.cpp` produced about 55 tokens per second, compared to `Ollama` - 20. More than a 2.5x performance boost. To be fair, I'm not sure that it is completely related to the switch of `Ollama` to `llama.cpp`. Even though, I tried to replicate the same setup, like the same KV cache quantization and the context size. I still used slightly different models. One from `Ollama`, another from `Unsloth`. It could affect the results. But even considering different models, 2.5 speedup is insane.

`llama.cpp` completely solves the performance, I mentioned before. But let's look at the second problem - the "fake" context size.

The best way to test it is, well, context-heavy tasks or long conversations. I found a plugin for `Claude` and `OpenCode` - `superpowers`. It is a set of skills that "teaches" coding agents a more disciplined software-development process: brainstorm first, make a plan, write tests before code, review the result, and debug systematically. It uses a lot of tokens; a single small feature could end up using the entire context. It's a perfect test case.

Previously, on `Ollama`, it was unusable. You won't be able to pass the first stage - "brainstorming", because after loading all skills and a couple of files, it would use 32k+ of tokens. With `llama.cpp`, I was able to pass to other stages and even ask the agent to implement the plan. So, seems `llama.cpp` doesn't have the same "fake" context issue.

Yeah, in the end, I dropped using `superpowers`. Probably, it is a good plugin for vibe coders, but for my use cases, it is too heavy. Especially when `OpenCode` automatically loads unnecessary skills.

# Real task: Fix a known bug

I decided to check how the model "behaves" on a known bug. In my spare time, I'm working on my programming language. Recently, I implemented support for fully qualified names, a feature where a developer can reference a type not just by name, but by namespace + type name, like: `std.io.File`. The feature was partially implemented; the only thing left is to fix the static access. I had the unit test for this case, and I knew where the bug was and how to fix it. But I decided to check whether LLM would be able to find the issue, explore the code, understand it, and finally fix it.

I prompted `OpenCode` with a basic prompt, something like: "Please fix the 'BlaBla' test". I intentionally created a vague prompt without any specific information about the issue or how to fix it. I was kinda impressed. `OpenCode` + `llama.cpp` + `qwen3.5-35b` were able to find an issue and fix it. Yeah, it took almost 1.5 hours, and it provided the correct fix only on the third try. 

Anyway, I consider it a success. It ran the test, extracted the error, and started to explore the entire code base. LLM was able to detect that any member access expression is stored in reverse order by itself. For example: `a.b.c` would be stored as `c` -> `b` -> `a`, instead of `a` -> `b` -> `c`. It'll affect the fix. It found the correct place to fix the bug, but for some reason, it ignored this knowledge. So, the first implementation was incorrect when I pointed out the problem to it. It provided a better version. Technically, the second version would fix the issue, but I wanted to apply some minor style changes. So, the third version was the final one.

# Future improvements

Later, I found out that `llama.cpp` has a "router" mode, where the main process is responsible for spawning a new process for each loaded model. It allows to quickly switch models, if needed, like in `Ollama`. You just need to create `config.ini`:

```ini
version = 1

[*]
flash-attn = on
cache-type-k = q8_0
cache-type-v = q8_0
ctx-size = 131072

[qwen3.5:35b]
model = Qwen3.5-35B-A3B-UD-Q4_K_XL.gguf
temp = 0.6
top-p = 0.95
top-k = 20
min-p = 0.00
presence-penalty = 0.0
repeat-penalty = 1.0
```

and run `llama.cpp` with the following command: `llama-server --models-preset config.ini --models-max 1 --host 0.0.0.0 --port 11434`. My configuration allows only one loaded model because I have only 10 GB of VRAM. Probably, in the future I could load additional models to RAM and run them only on CPU, like embedding models. I want to try that with the VS Code Continue extension.

Even though ~50 t/s is quite fast on my Nvidia 3080 10 GB. `qwen3.5-35b` is a MoE model and usually MoE models are slightly worse than their "dense" versions. I've seen a lot of comparisons of `qwen3.5-35b` and `qwen3.5-27b`, and usually `qwen3.5-35b` is better. Unfortunately, `qwen3.5-27b` produces only about 4 t/s, which is extremely slow. So, a better `GPU` would be nice.

# Conclusion

To wrap it up. If you are considering this path, be prepared for some friction. You will need to manage your hardware expectations, specifically VRAM, and invest time in configuration. However, the payoff is significant: privacy, offline capability, and a capable second pair of eyes that never sleeps. My advice? Start small with refactoring or bug fixing rather than full project generation (vibe coding).

The transition from `Ollama` to `llama.cpp` was pivotal in my setup, transforming a sluggish experience into a responsive workflow with stable context windows. With the right stack, like `llama.cpp` running quantized models on capable hardware, local coding agents are here to stay and definitely worth integrating into your homelab setup. I will likely upgrade my GPU eventually to support larger context windows or concurrent models, but for now, this setup provides a balance of speed and capability that meets my needs.