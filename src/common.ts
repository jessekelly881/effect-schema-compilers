import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { isNumber } from "@effect/data/Predicate"

/** 
 * TODO: Replace with import from "@effect/schema/internal/common" when working
 */
export const memoizeThunk = <A>(f: () => A): () => A => {
    let done = false
    let a: A
    return () => {
      if (done) {
        return a
      }
      a = f()
      done = true
      return a
    }
  }

class NumberConstraints {
	readonly _tag = "NumberConstraints";
	constructor(
		readonly constraints: {
			min?: number;
			exclusiveMin?: number;
			exclusiveMax?: number;
			max?: number;
			isInt?: boolean;
		}
  ) {}
}

class BigintConstraints {
	readonly _tag = "BigintConstraints";
  	constructor(
    	readonly constraints: {
			min?: bigint;
			exclusiveMin?: bigint;
			exclusiveMax?: bigint;
			max?: bigint;
		}
  ) {}
}

class StringConstraints {
    readonly _tag = "StringConstraints"
    constructor(readonly constraints: { 
        minLength?:number, 
		maxLength?:number, 
	}) {}
}

class ArrayConstraints {
    readonly _tag = "ArrayConstraints"
    constructor(readonly constraints: { 
        maxItems?:number, 
		minItems?:number, 
	}) {}
}

export type Constraints = NumberConstraints | StringConstraints | BigintConstraints | ArrayConstraints

// MultipleOfTypeId
// MinItemsTypeId 
// MaxItemsTypeId
// ItemsCountTypeId
export const getConstraints = (ast: AST.Refinement): Constraints | undefined => {
  const TypeAnnotationId = ast.annotations[AST.TypeAnnotationId];
  const jsonSchema: any = ast.annotations[AST.JSONSchemaAnnotationId];

  switch (TypeAnnotationId) {

	// Number
    case S.GreaterThanTypeId:
      return new NumberConstraints({
        exclusiveMin: jsonSchema.exclusiveMinimum,
      });
    case S.GreaterThanOrEqualToTypeId:
      return new NumberConstraints({ min: jsonSchema.minimum });
    case S.LessThanTypeId:
      return new NumberConstraints({
        exclusiveMax: jsonSchema.exclusiveMaximum,
      });
    case S.LessThanOrEqualToTypeId:
      return new NumberConstraints({ max: jsonSchema.maximum });
    case S.PositiveTypeId:
      return new NumberConstraints({ exclusiveMin: 0 });
    case S.NonNegativeTypeId:
      return new NumberConstraints({ min: 0 });
    case S.NegativeTypeId:
      return new NumberConstraints({ exclusiveMax: 0 });
    case S.NonPositiveTypeId:
      return new NumberConstraints({ max: 0 });
    case S.IntTypeId:
      return new NumberConstraints({ isInt: true });
    case S.BetweenTypeId:
      return new NumberConstraints({
        min: jsonSchema.minimum,
        max: jsonSchema.maximum,
      });

	// Bigint
    case S.GreaterThanBigintTypeId:
      return new BigintConstraints({
        exclusiveMin: jsonSchema.exclusiveMinimum,
      });
    case S.GreaterThanOrEqualToBigintTypeId:
      return new BigintConstraints({ min: jsonSchema.minimum });
    case S.LessThanBigintTypeId:
      return new BigintConstraints({
        exclusiveMax: jsonSchema.exclusiveMaximum,
      });
    case S.LessThanOrEqualToBigintTypeId:
      return new BigintConstraints({ max: jsonSchema.maximum });
    case S.PositiveBigintTypeId:
      return new BigintConstraints({ exclusiveMin: 0n });
    case S.NonNegativeBigintTypeId:
      return new BigintConstraints({ min: 0n });
    case S.NegativeBigintTypeId:
      return new BigintConstraints({ exclusiveMax: 0n });
    case S.NonPositiveBigintTypeId:
      return new BigintConstraints({ max: 0n });
    case S.BetweenBigintTypeId:
      return new BigintConstraints({
        min: jsonSchema.minimum,
        max: jsonSchema.maximum,
      });

	// String
    case S.MinLengthTypeId:
      return new StringConstraints({ minLength: jsonSchema.minLength });
    case S.MaxLengthTypeId:
      return new StringConstraints({ maxLength: jsonSchema.maxLength });

	// Array
    case S.MaxItemsTypeId:
      return new ArrayConstraints({ maxItems: jsonSchema.maxItems });
    case S.MinItemsTypeId:
      return new ArrayConstraints({ minItems: jsonSchema.minItems });
    case S.ItemsCountTypeId:
      return new ArrayConstraints({ minItems: jsonSchema.minItems, maxItems: jsonSchema.maxItems });
  }
}

export const combineConstraints = (
  c1: Constraints | undefined,
  c2: Constraints | undefined
): Constraints | undefined => {
  if (c1 === undefined) {
    return c2;
  }
  if (c2 === undefined) {
    return c1;
  }
  switch (c1._tag) {
    case "NumberConstraints": {
      switch (c2._tag) {
        case "NumberConstraints": {
          const out = new NumberConstraints({
            ...(c1.constraints as NumberConstraints["constraints"]),
            ...(c2.constraints as NumberConstraints["constraints"]),
          }); 

          const min = getMax(c1.constraints.min, c2.constraints.min);
          if (isNumber(min)) {
            out.constraints.min = min;
          }
          const max = getMin(c1.constraints.max, c2.constraints.max);
          if (isNumber(max)) {
            out.constraints.max = max;
          }
          return out;
        }
      }
      break;
    }

    case "BigintConstraints": {
      switch (c2._tag) {
        case "BigintConstraints": {
          const out = new BigintConstraints({
            ...(c1.constraints as BigintConstraints["constraints"]),
            ...(c2.constraints as BigintConstraints["constraints"]),
          }); 

          const min = getMaxBigint(c1.constraints.min, c2.constraints.min);
          if (isNumber(min)) {
            out.constraints.min = min;
          }
          const max = getMinBigint(c1.constraints.max, c2.constraints.max);
          if (isNumber(max)) {
            out.constraints.max = max;
          }
          return out;
        }
      }
      break;
    }

    case "StringConstraints": {
      switch (c2._tag) {
        case "StringConstraints": {
          const out = new StringConstraints({
            ...(c1.constraints as StringConstraints["constraints"]),
            ...(c2.constraints as StringConstraints["constraints"]),
          }); 
          const min = getMax(
            c1.constraints.minLength,
            c2.constraints.minLength
          );
          if (isNumber(min)) {
            out.constraints.minLength = min;
          }
          const max = getMin(
            c1.constraints.maxLength,
            c2.constraints.maxLength
          );
          if (isNumber(max)) {
            out.constraints.maxLength = max;
          }
          return out;
        }
      }
      break;
    }
  }
};

const getMax = (n1: number | undefined, n2: number | undefined): number | undefined =>
  n1 === undefined ? n2 : n2 === undefined ? n1 : Math.max(n1, n2)

const getMin = (n1: number | undefined, n2: number | undefined): number | undefined =>
  n1 === undefined ? n2 : n2 === undefined ? n1 : Math.min(n1, n2)

const getMaxBigint = (n1: bigint | undefined, n2: bigint | undefined): bigint | undefined =>
  n1 === undefined ? n2 : n2 === undefined ? n1 : n1 > n2 ? n1 : n2

const getMinBigint = (n1: bigint | undefined, n2: bigint | undefined): bigint | undefined =>
  n1 === undefined ? n2 : n2 === undefined ? n1 : n1 > n2 ? n2 : n1