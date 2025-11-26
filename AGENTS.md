# Agent Instructions

This repository contains a React and TypeScript project. Please adhere to the following guidelines when making changes:

## General Best Practices

- Follow standard software engineering best practices.
- Write clean, maintainable, and well-documented code.
- Ensure all tests pass before submitting changes.

## TypeScript and React Specifics

- **No Semicolons:** Do not use semicolons at the end of statements.
- **Type Annotations:** Always use type annotations for function parameters, and return types. For variables, leverage type inference and only add explicit types when the type is not obvious from the assigned value.
- **Avoid `any`:** Do not use `any` as a type annotation. Strive for more specific types whenever possible. If you must use `any`, provide a comment explaining why.
- **React Best Practices:** Follow standard React best practices, such as using functional components with hooks where appropriate.

## Comments

- **Minimal Comments:** Keep comments to a minimum. Code should be self-documenting as much as possible.
- **Focus on "What" and "Why", not "How":** Comments should explain _what_ the code is doing or _why_ a particular approach was taken, if it's not obvious. Avoid comments that merely describe _how_ the code works, as this should be clear from the code itself.
- **No Agent Action Comments:** Do not include comments that document your actions as an agent (e.g., "Agent added this function").
- **No Import Comments:** Comments on import statements are generally not necessary.

## Testing

- Write unit tests for all new features and bug fixes.
- Ensure all tests pass before submitting changes.

By following these guidelines, we can maintain a high-quality and consistent codebase.
