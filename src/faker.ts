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
 * @param stackSize - Used to limit recursion and only generate elements of limited depth
 */
const go = (ast: AST.AST, stackSize = 5): Faker<any> => {

    // Attempts to prevent stack overflows by limiting object complexity when stack limit reached.
    const stackLimitReached = stackSize <= 0; 

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "Refinement": return go(ast.from, stackSize - 1)
        case "Transform": return go(ast.to, stackSize - 1)
        case "Declaration": return go(ast.type, stackSize - 1)

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
            const u = ast.types.map(t => go(t, stackSize - 1))
            return (f: F.Faker) => f.helpers.arrayElement(u.map(el => el(f)))
        }
        case "Tuple": {
            const els = ast.elements.map((e) => go(e.type, stackSize - 1))

            if(O.isSome(ast.rest)) {
                const head = go(RA.headNonEmpty(ast.rest.value), stackSize - 1);
                const tail = RA.tailNonEmpty(ast.rest.value).map(e => go(e, stackSize - 1));

                return (f: F.Faker) => {
                    const numToGen = f.number.int({ min: 0, max: 2 })
                    const restEls = stackLimitReached ? [] : RA.range(0, numToGen).map(() => head(f))
                    const postRestEls = tail.map(el => el(f))

                    return [...els.map(el => el(f)), ...restEls, ...postRestEls]
                }
            }
            else{
                return (f: F.Faker) => els.map(el => el(f))
            }
        }
        case "Lazy": {
            const get = memoizeThunk(() => go(ast.f(), stackSize - 1))
            return (f: F.Faker) => get()(f)
        }
        case "TypeLiteral": {
            const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type, stackSize - 1))

            return (f: F.Faker) => {
                const output: any = {};

                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i];
                    const name = ps.name;

                    // whether to include prop if it is optional
                    const includeOptional = stackLimitReached ? false : f.datatype.boolean(); 
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