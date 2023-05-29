import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import * as Eq from "@effect/data/typeclass/Equivalence";
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import { memoizeThunk } from "./common"


export const EquivalenceHookId = "@effect/schema/annotation/EmptyHookId" as const

export const equivalence = <I, A>(eq: Eq.Equivalence<A>): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [EquivalenceHookId]: eq })

const getAnnotation = AST.getAnnotation<Eq.Equivalence<unknown>>(
  EquivalenceHookId
)

interface Equivalence<To> {
    (): Eq.Equivalence<To>
}

export const to = <I, A>(schema: S.Schema<I, A>): Eq.Equivalence<A> => go(AST.to(schema.ast))()

export const from = <I, A>(schema: S.Schema<I, A>): Eq.Equivalence<I> => go(AST.from(schema.ast))()

const go = (ast: AST.AST): Equivalence<any> => {
    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return () => annotations.value
    }

    switch (ast._tag) {
        case "UndefinedKeyword":
        case "UnknownKeyword":
        case "VoidKeyword":
        case "AnyKeyword":
        case "Literal": 
        case "Enums": 
        case "ObjectKeyword":  // FIXME: Should this be strict? 
            return () => Eq.strict()

        case "BigIntKeyword": return () => Eq.bigint
        case "NumberKeyword": return () => Eq.number
        case "StringKeyword": return () => Eq.string
        case "TemplateLiteral": return () => Eq.string
        case "BooleanKeyword": return () => Eq.boolean

        case "SymbolKeyword": 
        case "UniqueSymbol": 
            return () => Eq.symbol

        case "Tuple": { 
            const elements = ast.elements.map((e) => go(e.type));
            const rest = pipe(ast.rest, O.map(RA.mapNonEmpty((e) => go(e))), O.getOrElse(() => []))

            return () => {
                const eq = (self: [], that: []) => {
                    if(self.length !== that.length) return false

                    for(let i = 0; i < self.length; i++){
                        if(i < elements.length) {
                            if(!elements[i]()(self[i], that[i])) return false
                        }
                        else {
                            if(!rest[0]()(self[i], that[i])) return false
                        }
                    }

                    return true;
                }
                return eq
            }
        }
        case "Refinement": return go(ast.from)
        case "Transform": return go(ast.to)
        case "Declaration": return go(ast.type)
        case "Union": return go(ast.types[0]) // TODO: Merge 
        case "Lazy": {
            const get = memoizeThunk(() => go(ast.f()))
            return () => get()()
        }
        case "TypeLiteral": {
            const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))

            return () => {
                const output: any = {};

                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i];
                    const name = ps.name;
                    output[name] = propertySignaturesTypes[i]();
                }

                return Eq.struct(output);
            };
        }
    }

    throw new Error(`unhandled ${ast._tag}`)

}