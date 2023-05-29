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
