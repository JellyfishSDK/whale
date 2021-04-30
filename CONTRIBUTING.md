# DeFi Whale Contributing Guide

## All features must be unit tested with accepted coverage. (Target 100%)

Each package or functionality must be accompanied by full coverage testing.

## TODO comments

TODO comments should usually include the author's github username in parentheses. Example:

```ts
// TODO(fuxingloh): Add tests.
```

## Code of conduct

Please follow the guidelines outlined at https://github.com/DeFiCh/.github/blob/main/CODE_OF_CONDUCT.md

## Explicit over implicit

Each package, feature, code and decision should be explicit and well documented over implicitly guessing.

## TypeScript

TypeScript must be used for all code written in this project.

> Heavily adapted from [deno style guide](https://github.com/denoland/deno/blob/main/docs/contributing/style_guide.md).

### Minimize dependencies (target zero)

### Do not depend on external code. (never if possible)

### Use underscores or periods, not dashes in filenames.

Example: Use `foo.bar.ts` instead of `foo-bar.ts`.

### Exported functions: max 2 args, put the rest into an options object.

### Use JSDoc for exported symbols.

### Top level functions should not use arrow syntax.
