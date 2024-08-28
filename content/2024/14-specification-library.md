---
title: Specification Pattern and why I wouldn't say I like the Ardalis.Specification library
description: Ardalis.Specification and DDD
tags: .net, ddd, specification
date: 2024-08-28
---

Hello there!

The specification pattern is the way to describe a predicate to test your entities and check whether they satisfy this predicate or not. In the DDD world, usually, you need to place such code in your Aggregate/Entity/ValueObject class. Still, sometimes it is impossible and you don't want to "leak" your business rules to repositories, infrastructure layer, or elsewhere. You can keep this logic in your domain model with the specification pattern. Also, it helps to reuse the same code (rules) in multiple places or combine multiple specifications together. Because it is a part of a domain model, you can cover it with unit tests. But for this article, the only important property - the specification is a predicate and it is a part of a domain model.  

Let's look at the _"Domain-Driven Design: Tackling Complexity in the Heart of Software"_ book by Eric Evans:

> Business rules often do not it the responsibility of any of the obvious ENTITIES or VALUE OBJECTS, and their variety and combinations can overwhelm the basic meaning of the domain object. But moving the rules out of the domain layer is even worse, since the domain code no longer expresses the model.
>
> ...
>
> A SPECIFICATION states a constraint on the state of another object, which may or may not be present. It has multiple uses, but one that conveys the most basic concept is that a SPECIFICATION can test any object to see if it satisfies the specification criteria.

For example:

```csharp
public class IsDiscountAvailableFor
{
    public bool IsSatisfiedBy(User user)
        => user.IsActiveFor(TimeSpan.FromYear(3)) &&
           user.Order.Length > 100 &&
           ...;
}
```

So, it is just a class to test the `User` object and return whether the discount is available for the user. I intentionally ignored Expression Trees and interoperability with ORMs. It doesn't matter here. It is just an example of specification.

Let's take a look at the example from [Ardalis.Specification](https://specification.ardalis.com/):

```csharp
public class CompanyByIdWithStores : Specification<Company>
{
    public CompanyByIdWithStores(int id)
    {
        Query
            .Where(company => company.Id == id)
            .Include(x => x.Stores);
    }
}
```

Can you spot the problem? It's not a specification but a query object. _"An object that represents a database query."_ [Martin Fowler](https://martinfowler.com/eaaCatalog/queryObject.html). It is not just a predicate, it is responsible for more and creates several problems. Implementation details leak to the domain layer. The `Include` method has nothing to do with the domain model and shouldn't be there. In DDD, we operate aggregates in the domain layer and they are whole. We shouldn't be able to read only a part of the aggregate and try to manipulate it because it could break some business rules. `Include` is related to the persistence layer (EF Core) and if it appears in domain layer, then probably something is wrong.

Also, we can look at other available methods in this library and you will find other examples of such violations. For example, `AsNoTracking()`. What does it mean for my domain model? I'm not tracking anything, I don't have such term in my language. It is purely infrastructure stuff. This library is an abstraction built on top of EF Core/Linq.

Don't get me wrong. There is nothing wrong with this pattern. You can use it to represent your queries and then issue them to your DB. But I don't think it should be called `Specification`.
