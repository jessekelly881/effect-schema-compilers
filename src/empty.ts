import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"

export const EmptyHookId = "@effect/schema/annotation/EmptyHookId"

export const empty = <A>(empty: () => A): <I>(self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [EmptyHookId]: empty })

const ret = pipe(S.NumberFromString, empty(() => 0))