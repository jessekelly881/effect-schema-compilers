# effect-schema-compilers
Compilers for @effect/schema

### Current TODOs
- Convert to monorepo to allow supporting multiple compilers without dep issues. 
- Create compiler for fakerjs

## Empty

Generate "empty" values from a Schema. Similar to [zod-empty](https://github.com/toiroakr/zod-empty) with a similar motivation.

```ts
import * as E from "effect-schema-compilers/dist/empty";

const s = E.emptyFor(S.struct({ num: S.number, str: S.string })); // { num: 0, str: "" }
```

Also supports setting the empty value for a schema. E.g.

```ts
import * as E from "effect-schema-compilers/dist/empty";
import { pipe } from "@effect/data/Function";

const s = pipe(S.number, E.empty(() => 1), E.emptyFor) // 1
```

## Semigroup

Generates a semigroup from the provided Schema. The default Semigroup.last is used which simply overrides the previous value.

```ts
import * as S from "@effect/schema/Schema";
import * as _ from "effect-schema-compilers/dist/semigroup";

const schema = S.struct({ a: S.number, b: S.string });
const { combine } = _.semigroupFor(schema)
expect(combine({ a: 0, b: "0" }, { a: 1, b: "1" })).toEqual({ a: 1, b: "1" })
```

The semigroup for a Schema can be set using the semigroup() fn. For example,

```ts
import * as S from "@effect/schema/Schema";
import * as _ from "effect-schema-compilers/dist/semigroup";
import { pipe } from "@effect/data/Function";

const schema = S.struct({ 
    a: pipe(S.number, _.semigroup(Semi.min(n.Order))), 
    b: pipe(S.string, _.semigroup(Semi.string)),
    c: S.boolean
});

const { combine } = _.semigroupFor(schema)
expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })).toEqual({ a: 0, b: "01", c: false })
```

## Equivalence 

Generates an instance of [Equivalence](https://effect-ts.github.io/data/modules/typeclass/Equivalence.ts.html) for a given Schema.

```ts
import * as S from "@effect/schema/Schema";
import * as _ from "effect-schema-compilers/dist/equivalence";
import { pipe } from "@effect/data/Function";

const schema = S.literal("a", "b")
const eq = _.equivalenceFor(schema); // Equivalence<"a" | "b">

expect(eq("a", "b")).toBe(false)
```


