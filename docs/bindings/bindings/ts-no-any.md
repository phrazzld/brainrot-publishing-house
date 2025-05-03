---
id: ts-no-any
last_modified: "2025-05-02"
derived_from: simplicity
enforced_by: eslint("@typescript-eslint/no-explicit-any") & tsconfig("noImplicitAny")
---

# Binding: No `any` in TypeScript

The `any` type defeats TypeScript's type safety and should never be used. It undermines the safety net that type checking provides, leading to potential bugs and decreased code clarity.

## Rationale

The `any` type effectively opts out of type checking, eliminating TypeScript's primary benefit. It creates "type holes" that can spread through a codebase, making it harder to reason about data flow and proper interfaces. Using `any` is a form of accidental complexity that introduces uncertainty and potential for runtime errors.

## Enforcement

This binding is enforced by:

1. ESLint rule `@typescript-eslint/no-explicit-any` set to `error`
2. TypeScript compiler option `noImplicitAny` set to `true`

## Alternatives

Instead of using `any`, prefer:

- `unknown` when you need a type-safe top type (requires type narrowing before use)
- Union types (`string | number | boolean`) for values that can be one of several types
- Generic type parameters (`<T>`) for flexible functions or interfaces
- Proper interfaces and types that accurately describe the data structure
- The `Record<K, V>` utility type for dynamic objects with known value types

## Examples

```typescript
// ❌ BAD: Using any
function process(data: any): any {
  return data.value;
}

// ✅ GOOD: Using unknown with type narrowing
function process(data: unknown): unknown {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
  throw new Error('Invalid data format');
}

// ✅ BETTER: Using proper types
interface DataWithValue<T> {
  value: T;
}

function process<T>(data: DataWithValue<T>): T {
  return data.value;
}
```

## Related Bindings

- [ts-use-unknown.md](./ts-use-unknown.md) - Prefer `unknown` over `any` for type-safe top types
- [ts-no-type-assertion.md](./ts-no-type-assertion.md) - Avoid type assertions without validation