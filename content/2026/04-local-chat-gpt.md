---
title: Building a Local-First AI Knowledge Base
description: Build a private, local-first AI knowledge base with RAG, embeddings, BM25, vector search, reranking, and smart context injection for more accurate LLM responses.
tags: llm, ai, rag, embeddings, vector-search, bm25, sqlite
date: 2026-07-27
---

Hello there!

# Local KB

A couple of months ago, I started to work on a new project - the personal knowledge base. Yeah, it has a fancy name, but in fact it's just a UI for LLMs with one important feature - "projects". I really like this feature from ChatGPT and Claude: you can add documents to the project, it will ingest them, and later it will be able to gather information (knowledge) from them.

With ChatGPT and Claude, you need to share your private information. But I wanted something private and local. So, I started to work on it. I don't plan to turn it into a huge open source project. It is a project for me, where I can apply my knowledge about RAG, vector DBs, embeddings, etc.

Here in this article, I will share how it works and what I learned.

# Overall Chat Flow

For the initial release, I wanted to implement the basic chat capabilities plus automatic knowledge gathering and injecting into the current content. Like a user can create a chat, and if there is relevant knowledge stored in the database, it would be automatically added to the context. Or the user can enable the web search tool and allow the LLM to find the answer on the internet.

## Context Explosion

The naive approach would be to insert the document, or web page, or summaries directly into the context, but it wouldn't work. The documents and web pages are huge. You need to split them into chunks and inject only relevant chunks. The same for web pages; the only difference, you need to do it on the fly. And exactly about this we will talk in the next sections.

## Context Injection

The relevant knowledge is automatically injected into the current context. Each conversation could have several types of messages: the system message - "commands" to the LLM, the user message, and the answer message. Some LLMs support one additional type - the developer message, but it didn't work for me.

The knowledge is inserted as a special user message in a predefined format (instructions + knowledge). It explains to the LLM how to use the knowledge, for example, use summaries, facts, etc., only when they are relevant and don't rely too heavily on them because they could be stale.

# Ingestion

Ingestion is the process of discovering and processing documents and bringing data into a system for later use. The exact process of uploading and discovery of documents doesn't matter; anything would work. But what is important is parsing, chunking, and embedding.

## Parsing

First of all, you need to parse documents. This step is not required for simple text files, so you can move to the next step.

Any other file needs to be parsed. For example, PDF files. The PDF is a binary format. Yes, the text is probably stored in text form, but any metadata or styling will be stored in the binary. So, you can't just chunk it as is. You will process a lot of garbage this way. Also, you don't actually need to implement the complex parsing algorithm here. The basic text extraction would do because LLMs usually work with text information. It would be nice to parse images and allow LLMs with image support to use this information. But it is unnecessary complexity, so I decided to just extract text.

## Embeddings

Ok. So, we need to step aside and talk about embeddings.

> An embedding is a numerical representation of data (usually text) that captures its semantic meaning. Instead of storing words as text, an embedding model converts them into a vector (a list of numbers), so that text with similar meanings ends up close together in a high-dimensional space.
> Numbers don't have an obvious human interpretation. What matters is the relative distance between vectors. Similar meaning produces nearby vectors, even when different words are used.

They are crucial for the application; combined with the vector search (cosine similarity), they allow the system to find the relevant information by meaning and not just by keywords.

It is not important to understand how exactly it works. Just imagine a function that accepts the text input and returns a vector that represents the meaning of the input. Internally, it uses some embedding model with a predefined vector size. But an important part here is that you can save this vector in the database for later search.

## Chunking

Chunking is one of the most important parts of RAG because language models and embedding models work much better with small, semantically coherent pieces of text than with entire documents.

Embeddings represent the meaning of the entire input. So, if we process the entire document without chunking, then the single embedding will represent the entire document. So, when the user asks a question only about a single topic (chapter), it will search and inject the entire document anyway.

On the contrary, you could split the document into small pieces (chunks). Each chunk would have its own embedding. This way, when a user asks a question about a particular topic, the system would be able to find only relevant chunks and inject them. It increases accuracy and removes the context explosion.

I've decided to split text into chunks of 512 tokens max. 1 token doesn't equal to one symbols but you can use some libraries that allow you tokenize text and get approximate size of it. Also, the idea is to chunk it smart, not just a hard cut on 512th token. For example, initially, while extracting the text content from different formats, the application will extract sections (chapters from PDF, top-level headers from Markdown, chapters from EPUB, etc). Then it will process each section and will try to split it by paragraphs, by sentances, by words, or use a hard cut in the middle of text as a fallback. This way it allows to preserve meaning in the same chunk. One additional point to improve chunking is to use overlapping chunks where the end of one chunks overlaps with the start of another one.

# Retrieval

This is the most interesting part of the application.

The retrieval is the process of getting useful information and injecting it into the context. It makes your LLM "smart" because it can get useful information about the user or a project instead of hallucinating something else.

We already discussed what embeddings are. So, now we can use them to find the information by its meaning. The naive approach would look like the user sends a request, then the application uses the user's message to find information, filters irrelevant information out by some threshold, injects it into context, generate the answer. Even though for simple chats, it could work, but for real-world conversations, there is a better approach.

## Query rewriting

The first step to improve the retrieval is "query rewriting".

It's kind of self-explanatory. We are going to use an LLM to rewrite an initial user query to get better search results and maintain natural conversation overall.

Imagine the following conversation. User asks: "Who is the creator of Linux?". All LLMs will produce the answer about Linus Torvalds. Then the user decides to ask the follow-up question: "What is he also famous for?". Even though all LLMs will be able to answer this question also, the main point in the follow-up is that it uses "he" instead of "Linus Torvalds". It creates a lot of problems for vector search, because there is no "Linus Torvalds" in the query, so it will be looking for any information about a famous man, which can result in injecting completely irrelevant information into the context.

The query rewriting fixes this problem. Before sending the query directly to the search, we will ask the LLM to rewrite it, and in the end it will produce something similar to "What is Linus Torvalds also famous for?". Which is much better.

In my implementation, it generates 3 "forms" of the same query. One for the vector search, one for BM25, and one for the reranking. Each for is optimized for its purposes. For example:

- vector search query: "What is Linus Torvalds also famous for?" Replaces pronouns and resolves conversation context while keeping the query natural. Embeddings capture semantic similarity, so additional keywords are unnecessary.
- BM25 search query: "Linus Torvalds Linux creator famous for Git operating system kernel software engineer". Expands the query with important keywords and related terms. BM25 benefits from lexical overlap rather than natural phrasing, so adding high-value terms increases recall.
- reranking: "Find documents describing achievements of Linus Torvalds beyond creating Linux, especially other major projects he is known for.". A reranker receives both the query and candidate documents. A more explicit, descriptive query helps the reranker better judge whether a document truly answers the user's intent instead of merely mentioning "Linus Torvalds."

## Vector Search / BM25

My application uses two types of searches: Vector Search and BM25. The vector search uses embeddings to find documents with similar meaning (semantic search). While BM25 is a keyword search; it tries to find documents with similar words. In my application, I was using built-in features of `SQLite`; there is an extension for vector search: [sqlite-vec](https://github.com/asg017/sqlite-vec), and BM25 is supported out of the box. But you can pick any other database and implementation; for a small local-first application, `SQLite` is a perfect choice.

Why do we need to use both searches? To improve results. BM25 doesn't understand the meaning of words and instead tries to match by words. I could find a lot of unrelated documents (because they include a keyword but aren't relevant to the user's query) or skip the important ones (just because they don't include the specific word). So, to solve this issue, we need to add one additional search. But at the same time, we can't use vector search only. It uses embeddings, but embeddings are not a direct representation of text; there is a limited number of dimensions (numbers in the embedding array) for each embedding, and it represents the meaning of the original text, not an exact match. So, the vector search wouldn't be able to match a specific keyword, for example, the error code, in documents. That's why we need to use both searches and merge the results into a single output. For example, search for 25 documents via the vector search, for 25 documents via BM25, and merge them. So, in the worst case, you will get 50 documents, but usually less, because both searches may find the same documents. Don't worry about the huge set of documents; we aren't going to inject all of them into the context. We will get the best ones in later steps.

These two searches return all relevant documents and their scores (usually and number from 0.0 to 1.0, which represents some kind of relevance of this document). But these scores produced by BM25 and vector search are not reliable measures of relevance. They are only reliable for ordering results within their own retrieval method. You can't just use some threshold value to filter out unrelated documents.

I initially experimented with cosine thresholds (0.5, 0.8, ...), but quickly realized that similarity scores are only meaningful within the same search. Different queries naturally produce different score distributions, so a fixed threshold often removes useful results. A reranker provides much more consistent relevance scores.

## Reranking

This is a process that actually orders (calculates a score) documents by their relevance. There are specific reranking models designed for this purpose. They accept the user's query and documents and return scores for each document. In contrast to scores from vector and BM25 searches, you actually can use them to order documents by relevance, filter out irrelevant ones based on some threshold, and select top 3-5 documents to inject into the context.

# Summarization

We discussed only documents as a source for retrieval so far. But there is another one - previous conversations. We could add a feature where we generate summaries and additional metadata (topics, user preferences, decisions, etc) for each conversation. So, the next time the user asks a question about the same topic, the application would be able to recall parts of previous discussions. Basically, it is a kind of memory or a profile about the user.

We don't need to generate embeddings for the entire conversation and search in it. It would be to time consuming, expensive, and most importantly useless. Conversations are too noisy: greetings, unnecessary explanations or clarifications, corrections, or even topics. So, it is better to ask the LLM to extract the useful information from the conversation, save it, generate embeddings for it, and allow searching in it. This way it should be more accurate.

I'm not sure where it is a useful feature at all. But it seems nice to have.

# Tools

Another interesting topic to discuss is tools.

## websearch

So far, I've implemented one tool: `websearch` that allows LLM to use `SearXNG` to find information on the internet. There is another one, `webfetch`, but it is not exposed to LLM yet and is designed more for internal use.

Again, let's start from the naive approach. LLM wants to search something on the internet; it calls the tool, the tool does the search, picks the top 3 items, and returns them as raw HTML to LLM. This approach has the same problems as we already discussed. The first one is raw HTML. The web page could be huge, even bigger than the max context size of your LLM. The second is picking the top 3 results; even though they are on the top, it doesn't mean they are the best or even relevant.

We already have a solution for top results. Instead of picking the top 3 results, send them to the reranking model and let it decide what the best pick is. And only then pick the top 3 results. It is easy and fast to implement because you already have this code in the knowledge gathering step.

The raw HTML problem is a little bit harder to solve. Yes, you could just strip all HTML, CSS, and JavaScript from the code and return everything else to the LLM. But there is a better approach: use a "context extraction library" or create your own. The context extraction would allow you to create a unified engine for getting information from different file formats and reuse it between documents and web pages. So, you could create a separate extractor for each file format. In my case, HTML, PDF, EPUB, MD, and plain text as a fallback format. These extractors would be responsible for not just getting the text, but also the metadata: the title, chapters, the author, etc.

After the extraction, we would follow the document processing flow. So, the next step is embeddings. But we don't need to store them in the database; we are considering them as temporary. And the next steps are pretty much the same: search, reranking, and injecting relevant pieces into the context.

# Minor Features

The application has two minor features to generate "Follow Up Questions" and "Chat Name". They speak for themselves. You just need to query the LLM with a specific prompt and a chat history, and it will generate a name or follow-up questions for you. Nothing interesting here.

# Future Ideas

## Recursive Retrieval (tools)

There is one way to improve the retrieval in the application, at least I think so. Currently, the retrieval is executed for each user request. We rewrite the query, search for information, rerank it, and inject it, and it happens automatically. So, in a lot of scenarios, it is good enough, and it would look and feel pretty nice. LLM knows something about the project, not just uses generic knowledge, or even worse, hallucinate something.

But I could imagine the use case where LLM could call search directly. The same way as the `websearch` tool. But now, I would be able to generate detailed queries to get specific information based on the received information. It shouldn't be so hard to implement, because the entire search logic is a separate class (service) and it should be pretty easy to create a tool based on it.

## llama.cpp Client

Currently, I'm using an OpenAI-compatible library from Microsoft to access an LLM. But it has a huge problem: even though it is OpenAI-compatible and llama.cpp server also supports OpenAI-compatible endpoints, but they are not the same.

So, the biggest problem was the thinking mode switch. OpenAI provides several options like `none`, `high`, `xhigh`, and etc. But `llama.cpp` doesn't support them. It has a dedicated option to control the thinking mode, and I haven't found a way to configure it in the library. Another problem is access to the reranking endpoint. It is just not present in the library.

So, I decided to create my own client.

## Better Handling of Embeddings in SQLite

To access relational data, I'm using `EF Core` + `SQLite`. Also, I've decided to use `SQLite` as a vector storage through the `Microsoft.SemanticKernel.Connectors.SqliteVec` library. For test purposes, it is good enough, but still it has some problems. The main one is multiple connections. So, `EF Core` and `SqliteVec` create two independent "connections" to the `SQLite` database, even though it is a file. This leads to a bunch of problems, like consistency. You could insert something in the relation table, but suddenly the vector store is not updated.

For now, I left this problem as it is. But in the future, I think I would remove `SqliteVec` and use the native vector extension library directly. I'm not 100% sure it would work, but at this point I don't see any issues with it apart from complexity. Basically, `SqliteVec` is built on top of a native library (sqlite extension), and .NET has a feature to load them. So, you could use the connection from `EF Core`, load the native extension, and use it. All methods to upsert or delete vector data are built on top of regular SQL statements. So, when you are inserting a bunch of embeddings, this library executes two commands. The first one is to insert the data into the relational storage (metadata, text content, some IDs, etc). The second one is to insert the embeddings (array of floats) into the virtual table. So, you can create some helper methods on your `DbContext`, and that's it. You don't need to use the `SqliteVec` library at all.

# Conclusion

Building this project taught me that retrieval-augmented generation is much more than "store embeddings and search them." The quality of the final answer depends on the entire pipeline: good parsing, thoughtful chunking, query rewriting, combining semantic and keyword search, reranking, and finally selecting only the most relevant context for the LLM. Each individual improvement may seem small, but together they make a huge difference.

If there is one thing I learned from working on this project, it is that RAG is less about finding information and more about deciding which information is worth showing to the model. The better that decision is, the better the generated answers become.