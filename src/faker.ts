import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import type * as F from '@faker-js/faker';
import * as O from "@effect/data/Option"
import { pipe } from "@effect/data/Function";
import * as RA from "@effect/data/ReadonlyArray"
import { memoizeThunk } from "./common"

export const FakerHookId = "effect-schema-compilers/faker/FakerHookId" as const

interface Faker<A> {
    (faker: F.Faker): A
}

export const faker = <I, A>(faker: Faker<A>): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [FakerHookId]: faker })

const getAnnotation = AST.getAnnotation<Faker<unknown>>(
  FakerHookId
)

export const to = <I, A>(schema: S.Schema<I, A>): Faker<A> => go(AST.to(schema.ast))

export const from = <I, A>(schema: S.Schema<I, A>): Faker<I> => go(AST.from(schema.ast))

/**
 * @param depthLimit - Used to limit recursion and only generate elements of limited depth
 */
const go = (ast: AST.AST, depthLimit = 10): Faker<any> => {

    /**
     * Attempts to prevent reaching recursion limit by limiting object complexity when depth limit reached.
     * The recursion limit can still be reached as no attempt to limit recursion is made if doing so would produce an invalid instance of the type. 
     */
    const depthLimitReached = depthLimit <= 0; 

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "Refinement": return go(ast.from, depthLimit)
        case "Transform": return go(ast.to, depthLimit)
        case "Declaration": return go(ast.type, depthLimit)

        case "ObjectKeyword": return (f: F.Faker) => ({})

        // [ast.enums[1][1]]
        case "Enums": return (f: F.Faker) => f.helpers.arrayElement(ast.enums.map(e => e[1]))
        case "Literal": return (f: F.Faker) => f.helpers.arrayElement([ast.literal])
        case "BooleanKeyword": return (f: F.Faker) => f.datatype.boolean()
        case "NumberKeyword": return (f: F.Faker) => f.number.float()
        case "BigIntKeyword": return (f: F.Faker) => f.number.bigInt()
        case "StringKeyword": return (f: F.Faker) => f.string.sample()
        case "SymbolKeyword": return (f: F.Faker) => Symbol(f.string.alpha())
        case "UniqueSymbol": return (f: F.Faker) => Symbol(f.string.alpha())
        case "Union": {
            const u = ast.types.map(t => go(t, depthLimit))
            return (f: F.Faker) => f.helpers.arrayElement(u.map(el => el(f)))
        }
        case "Tuple": {
            const els = ast.elements.map((e) => go(e.type, depthLimit - 1))

            if(O.isSome(ast.rest)) {
                const head = go(RA.headNonEmpty(ast.rest.value), depthLimit - 1);
                const tail = RA.tailNonEmpty(ast.rest.value).map(e => go(e, depthLimit - 1));

                return (f: F.Faker) => {
                    const numToGen = f.number.int({ min: 0, max: 10 })
                    const restEls = depthLimitReached ? [] : RA.range(0, numToGen).map(() => head(f))
                    const postRestEls = tail.map(el => el(f))

                    return [...els.map(el => el(f)), ...restEls, ...postRestEls]
                }
            }
            else{
                return (f: F.Faker) => els.map(el => el(f))
            }
        }
        case "Lazy": {
            const get = memoizeThunk(() => go(ast.f(), depthLimit))
            return (f: F.Faker) => get()(f)
        }
        case "TypeLiteral": {
            const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type, depthLimit - 1))

            return (f: F.Faker) => {
                const output: any = {};

                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i];
                    const name = ps.name;

                    // whether to include prop if it is optional
                    const includeOptional = depthLimitReached ? false : f.datatype.boolean(); 
                    if(!ps.isOptional || includeOptional) {
                        output[name] = propertySignaturesTypes[i](f);
                    }
                }

                return output
            };
        }
    }

    throw new Error(`unhandled ${ast._tag}`)
}