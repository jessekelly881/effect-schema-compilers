# effect-schema-compilers
Compilers for @effect/schema

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
