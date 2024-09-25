---
title: "Understanding CQRS: What It Is and What It Isn’t"
description: "Understanding CQRS: What It Is and What It Isn’t"
tags: cqrs, architecture, design-patterns
date: 2024-09-25
---

Hello there!

Today I want to talk about CQRS. What it is and what it isn't. Pros and cons, and some misunderstandings.

# What CQRS is?

First of all let's take a look at what `CQRS` is and why it might be useful. `CQRS` stands for _"Command Query Responsibility Segregation"_ While you can find detailed definitions on blogs like [Martin Fowler's](https://martinfowler.com/bliki/CQRS.html), the focus here will be on understanding what it is, what it isn't and some confusion around it.

The main idea behind `CQRS` is splitting the domain model into two parts. One is for reading (the query side), and one is for writing (the command side), whereas the query side can't update data. This design pattern became popular with the boom of microservices, `DDD` and `Event Sourcing`.

## When is CQRS useful?

`CQRS` is usually beneficial for "rich" domains. Domains with a lot of entities, aggregates, domain events, and business login. Not just a bunch of entities with public getters/setters. In this case, `CQRS` could help with complexity, scalability, and "independence" between services.

_Note: If your application needs several CRUD APIs, then `CQRS` might be an overkill for you._

### Complexity

It's ok to have such "rich" domain models because they represent our business needs. Each time the user wants to execute any action on it, the model should pass all validations, execute all business rules, and update all fields. So, we need to read an entire model from the database (it could be a lot of entities), apply our action to it, and then save it back to the database. There is nothing wrong with this approach but for the read side, such complex domain model could create unnecessary complexity because we need to read this huge model and then map it to a smaller one to represent it for the user. We could simplify it by using an independent model, solely for the reading. This doesn't have to be a "rich" domain model but instead just a DTO with bunch of fields or even more, a separate denormalized table in the database. Someone might say that it will result in more code. Yes, but by creating two independent models, for example, you no longer need to create a lot of methods in your repositories to read different parts of the domain model, or in different formats, paging, etc. The domain model has only code to represent and manipulate your domain while the user/view representation of your domain model is extracted to completely separate thing.

### Scalability

Usually, in real-world applications, there is a difference between the amount of requests for viewing/reading something and updating something and it could be substantial. `CQRS` might help you in this case. When the model is split into two parts, you can scale them independently. The read side doesn't depend and really cares about the write side. So, you can create separate services for your use cases. For example, one service to apply changes to your domain (the write side), one service for read APIs, one service for the reporting (the read side), etc. Each time you could create a completely independent highly optimized implementation for this particular case and scale it independently.

### Service Independence

The last part is "service independence". It is a little bit tricky and only applied to `microservices`. Usually, you want to create your microservices as independently as possible, otherwise, in worth case scenario, one unhealthy service will destroy the entire application. Obviously, we don't want that. If we've already decided to spend money and go with microservices, then it is worth investing in "independence" between them, and `CQRS` can help with it. And I think, it's easier to explain it in an example. Let's imagine you have two services. The inventory service manages all product SKUs across all your warehouses and the store service displays these products to the end user. The store service uses inventory because it needs to display all available products but it doesn't care about specific items and where they are. It is not its responsibility. So, one options is to call directly the inventory service from the store service but it is slow and unreliable. What if Inventory is down or restarting? The client won't be able to see products, and won't be able to reserve and buy them. To fix it, we could apply `CQRS` and denormalize our model. The inventory service would be the source of truth, it will have all the information about products, items, availability, and so on. The store service would have its own inventory-like model to track a subset of this information (a copy). For example, the administrator added a new product, Inventory published a new message, this message is consumed by Store, and all information is saved to the Store service. Next time the user will open the store page and will be able to see all products even if Inventory is down. Yes, it might display stale information but usually, it's ok because eventually it will be synchronized (consistent). If the store service needs to update some information in Inventory, for example, to reserve the item. The Store can publish the message to Inventory and it will be processed later. So, in this context, the Store's local copy is the read side, while sending a message and consuming it by Inventory is the write side.

### Key Takeaway

Here I described what `CQRS` is, its main benefits, and examples. And the key point is **separate models**. Each time in each example. To solve complexity issues, we created a new read-side model. To solve performance/scalability issues, we create a new read-side model to scale/deploy it separately. To solve "independence between services", we denormalized our Inventory model for our needs, and split it into the read side in Story and the write side through messaging in Inventory.

# What CQRS is not?

Ok, let's look at "What CQRS is not" and my experience on real projects.

`CQRS` became a buzzword like `microservices` and is usually misused, added to the project description just to be there, or something else. But I've rarely seen a case where the project claims it has `CQRS` and it truly has it. Usually, it is something else, or even worse `CQRS` is not needed here. Again I won't describe all disadvantages of `CQRS` but instead I want to focus on **separate models**.

I've seen a lot of project where `CQRS` is just a "naming convention": add the `Query`/`Command` suffix to your DTO name. For instance, if we need to read a list of users, we need to name a DTO like `GetUserQuery`. And then this DTO is processed by the same set of services/handlers/repositories/etc. But here is the important part, there is no split for different models. So, yeah, there is nothing wrong with such an approach and you can apply it in your project to easily understand the intent of specific DTO.

This approach doesn't have the benefits described in the previous section. How does the "name convention" help with complexity, scalability, and service independence? Short answer: it doesn't. So, it doesn't have the "features" of `CQRS` which means it is not `CQRS`.

`CQRS` is not just about splitting your DTOs/classes into two "types" (queries and commands), but splitting the model. And not just because we want to split or play with a new architectural approach but because we need to take advantage of such splitting.

# Vertical Slice Architecture

`Vertical Slice Architecture` is the approach to structure your projects. Instead of structuring your project based on types of classes or technical layers: Services, Repositories, Models, Controllers, etc. You need to structure your project based on features:

- Customers
  - Customer
  - CustomerService
  - CustomerRepository
  - GetCustomerQuery
  - ...

But in .NET world, developers use the `MediatR` library to implement the vertical slice architecture and decouple the query/command handling from controllers. And I think, it might create confusion and result in misunderstanding of `CQRS`. If your project adopted `Vertical Slice Architecture` and uses `MediatR` it doesn't mean it has `CQRS`.

# Conclusion

`CQRS` is a powerful architectural pattern when applied in the right context. Misunderstandings about `CQRS` often arise from simple implementations that don't truly segregate the command and query models. So, don't confuse it with simple naming conventions or the use of libraries like MediatR, which support but don't define `CQRS`. But rather instead focus on your application needs and requirements. If you need to remove complexity, solve performance issues, or improve service independence in your microservice architecture, then it might be a good idea to take a look at `CQRS`.
