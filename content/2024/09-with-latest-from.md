---
title: "TIL: The `withLatestFrom` operator of rx.js"
description: "`withLatestFrom` as an alternative to `combineLatest`."
tags: js, javascript, typescript, rx.js
date: 2024-07-04
---

Hello there!

### `combineLatest`

`rx.js` has the `combineLatest` operator and usually, we use it to get the latest values from multiple observables. Here is a quote from [docs](https://github.com/ReactiveX/rxjs/blob/master/packages/rxjs/src/internal/observable/combineLatest.ts):

> Combines multiple Observables to create an Observable whose values are calculated from the latest values of each of its input Observables. Whenever any input Observable emits a value, it computes a formula using the latest values from all the inputs and then emits the output of that formula.

Let's imagine that we have 3 observables: 
- `file$` contains a file name and emits a new value each time user selects a file
- `repository$` contains all information about the repository (eg. name)
- `path$` path to a file, emits a new value when user changes a directory or branch.

Based on these three observables, we need to get file content. For example, if we have `repository = test`, `path = /`, `file = README.md`, then we need to get the `README.md` file from the root directory of the `test` repository. And to do so, we can use the `combineLatest` operator, here is an example:

```typescript
combineLatest(file$, this.repository$!, this.path$!).pipe(
    switchMap(([fileName, repository, path]) => {
        if (fileName == null) {
            return of(null);
        }

        return this.repositoryService.getFile(
            repository!.name,
            path.concat(fileName).join('/'),
        );
    }),
    // ...
);
```

This code works fine and allows us to get the content of the file but it has one small problem. It creates unnecessary requests to a server (yeah, a lot of them are canceled anyway, but still it is better to avoid them).

As someone already guessed, it is completely expected behavior of `combineLatest`. This operator subscribes to all provided observables and emits an array of all the latest values on each change. For example, if `path$` emits a value, then `combineLatest` emits a new array, even though only one value was changed. Usually, it is ok and we want to get the latest values and refresh UI to reflect these changes but this is not the case.

But in this particular example, we don't need to emit new values on each change. We need to subscribe to file changes only to request a new file and display it in UI. Otherwise, it might create invalid requests. For example, `path$` triggered a refresh, what would happen? `combineLatest` will take the latest (new) value from `path$` and the latest (old) value from `file$` and it might result in an incorrect file path. We can use `withLatestFrom` to fix it.

_In this example, it isn't a huge problem because `path$` and `file$` will emit values one after another (with a small delay). So, the user will see the correct result because the incorrect request will be canceled and the result will be replaced by the next request._

### `withLatestFrom`

This operator works almost the same way as `combineLatest` but with one small difference. It does not subscribe to all observables but rather only to the source one. Let's look at this example:

```typescript
file$.pipe(
    withLatestFrom(this.repository$!, this.path$!),
    switchMap(([fileName, repository, path]) => {
        if (fileName == null) {
            return of(null);
        }

        return this.repositoryService.getFile(
            repository!.name,
            path.concat(fileName).join('/'),
        );
    }),
    // ...
);
```

The first thing you might notice: the `switchMap` operator has the same list of parameters. So, we are still receiving the same parameters but a new value is only emitted when `file$` is changed. `repository$` or `path$` observables new values don't trigger any changes. `withLatestFrom` just takes the latest values from all passed observables.
