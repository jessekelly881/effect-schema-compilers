/**
 * Experimental. Converts a schema to a string of itself as best it can.
 * @example
 * expect(render(S.union(S.string, S.boolean))).toBe(`S.union(S.string, S.boolean)`) 
 */

import * as AST from "@effect/schema/AST";
import * as Doc from "@effect/printer/Doc"
import * as Render from "@effect/printer/Render"
import * as S from "@effect/schema/Schema";
import { describe, it, expect } from "vitest";
import * as RA from "@effect/data/ReadonlyArray";

const scope = <A>(scope: string, doc: Doc.Doc<A>): Doc.Doc<A> =>
    Doc.hcat([Doc.text(scope), Doc.text("."), doc])


const fnCall = <A>(fn: Doc.Doc<A>, args: Doc.Doc<A>[]): Doc.Doc<A> =>
    Doc.hcat([fn, Doc.text("("), ...RA.intersperse(Doc.text(", "))(args), Doc.text(")")])
 

interface Config {
    scope: string; // e.g. "S" -> S.number
    quote: "single" | "double";
}

const defaultConfig: Config = { scope: "S", quote: "double" }

const getIdentifier = AST.getAnnotation<AST.IdentifierAnnotation>(
    AST.IdentifierAnnotationId
)

const to = <I, A>(schema: S.Schema<I, A>, config: Config = defaultConfig): Doc.Doc<A> => 
    go(AST.to(schema.ast), config)

const go = (ast: AST.AST, config: Config = defaultConfig) => {
    const quote = config.quote === "double" ? Doc.doubleQuoted : Doc.singleQuoted

    const annotations = getIdentifier(ast)
    if(annotations._tag === "Some") {
        return scope(config.scope, Doc.text(annotations.value))
    }

    switch(ast._tag) {
        case "NumberKeyword": return scope(config.scope, Doc.text("number"))
        case "BigIntKeyword": return scope(config.scope, Doc.text("bigint"))
        case "StringKeyword": return scope(config.scope, Doc.text("string"))
        case "BooleanKeyword": return scope(config.scope, Doc.text("boolean"))
        case "SymbolKeyword": return scope(config.scope, Doc.text("symbol"))
        case "Literal": return fnCall(scope(config.scope, Doc.text("literal")), [quote(Doc.text(ast.literal?.toString() || ""))])

        case "NeverKeyword": return scope(config.scope, Doc.text("never"))
        case "AnyKeyword": return scope(config.scope, Doc.text("any"))

        case "Union": {
            const u = ast.types.map(t => go(t, config))
            return fnCall(scope(config.scope, Doc.text("union")), u)
        }

        default: return Doc.text("");
    }
}

const render = <I, A>(schema: S.Schema<I, A>) => Render.pretty(to(schema), { lineWidth: 14 });

describe.concurrent("Printer", () => {
    it("string", () => { expect(render(S.string)).toBe(`S.string`) })
    it("number", () => { expect(render(S.number)).toBe(`S.number`) })
    it("bigint", () => { expect(render(S.bigint)).toBe(`S.bigint`) })
    it("boolean", () => { expect(render(S.boolean)).toBe(`S.boolean`) })
    it("symbol", () => { expect(render(S.symbol)).toBe(`S.symbol`) })
    it("literal", () => { expect(render(S.literal("a"))).toBe(`S.literal("a")`) })

    it("never", () => { expect(render(S.never)).toBe(`S.never`) })
    it("any", () => { expect(render(S.any)).toBe(`S.any`) })

    it("union", () => { 
        expect(render(S.union(S.string, S.boolean))).toBe(`S.union(S.string, S.boolean)`) 
    })
})