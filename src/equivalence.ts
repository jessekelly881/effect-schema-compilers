import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import * as Eq from "@effect/data/typeclass/Equivalence";
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"

export const EquivalenceHookId = "@effect/schema/annotation/EmptyHookId" as const

export const equivalence = <I, A>(eq: Eq.Equivalence<A>): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [EquivalenceHookId]: eq })

const getAnnotation = AST.getAnnotation<Eq.Equivalence<unknown>>(
  EquivalenceHookId
)

export const equivalenceFor = <I, A>(schema: S.Schema<I, A>): Eq.Equivalence<A> => {
    const go = (ast: AST.AST): Eq.Equivalence<A> => {

        const annotations = getAnnotation(ast)
        if(annotations._tag === "Some") {
         return annotations.value
        }

        switch (ast._tag) {
            case "UndefinedKeyword":
            case "UnknownKeyword":
            case "VoidKeyword":
            case "AnyKeyword":
            case "Literal": 
            case "Enums": 
            case "ObjectKeyword":  // FIXME: Should this be strict? 
                return Eq.strict()

            case "BigIntKeyword": return Eq.bigint as Eq.Equivalence<A>
            case "NumberKeyword": return Eq.number as Eq.Equivalence<A>
            case "StringKeyword": return Eq.string as Eq.Equivalence<A>
            case "TemplateLiteral": return Eq.string as Eq.Equivalence<A>
            case "BooleanKeyword": return Eq.boolean as Eq.Equivalence<A>

            case "SymbolKeyword": 
            case "UniqueSymbol": 
                return Eq.symbol as Eq.Equivalence<A>

            case "Tuple": { 
                const elements = ast.elements.map((e) => go(e.type));
                const rest = pipe(ast.rest, O.map(RA.mapNonEmpty((e) => go(e))), O.getOrElse(() => [] as Eq.Equivalence<A>[]))

                const eq = (self: [], that: []) => {
                    if(self.length !== that.length) return false

                    for(let i = 0; i < self.length; i++){
                        if(i < elements.length) {
                            if(!elements[i](self[i], that[i])) return false
                        }
                        else {
                            if(!rest[0](self[i], that[i])) return false
                        }
                    }

                    return true;
                }

                return eq as Eq.Equivalence<A>
            }
            case "Refinement": return go(ast.from)
            case "Transform": return go(ast.to)
            case "Declaration": return go(ast.type)
            case "Union": return go(ast.types[0]) // TODO: Merge 
            case "Lazy": return go(ast.f())
            case "TypeLiteral": {
                const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
                const output: any = {}

                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i]
                    const name = ps.name
                    output[name] = propertySignaturesTypes[i]
                }

                return Eq.struct(output) as Eq.Equivalence<A>
            }
        }

        throw new Error(`unhandled ${ast._tag}`)

    }

    return go(schema.ast)
}