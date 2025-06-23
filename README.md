# short-type-id

<!-- [![NPM version](https://img.shields.io/npm/v/short-type-id.svg)](https://www.npmjs.com/package/short-type-id) -->
<!-- [![License](https://img.shields.io/npm/l/short-type-id.svg)](https://github.com/bkuzmanoski/short-type-id/blob/main/LICENSE.txt) -->
<!-- [![Bundle size](https://img.shields.io/bundlephobia/minzip/short-type-id)](https://bundlephobia.com/result?p=short-type-id) -->
[![Build status](https://github.com/bkuzmanoski/short-type-id/actions/workflows/main.yaml/badge.svg)](https://github.com/bkuzmanoski/short-type-id/actions/workflows/main.yaml)

A zero-dependency, type-safe library for creating and managing self-describing IDs inspired by Stripe's object IDs.

Example:

- `https://example.com/p_a1b2c3>`
- `https://api.myapp.com/u_k4j5n6>`

## Why?

Using prefixed IDs like `u_...` and `p_...` offers advantages over traditional identifiers like UUIDs or auto-incrementing integers.

- **Instant Context:** See an ID anywhere—in logs, database records, URLs, or API responses—and know exactly what kind of entity it refers to without looking it up.
- **Improved LLM and AI Integration:** When interfacing with Large Language Models, providing prefixed IDs gives them crucial context about your data schema. An LLM can understand `u_...` refers to a user and can even generate placeholder IDs like `u_new` in structured outputs which your application can then parse and replace with a real ID.
- **Type-Safety:** This library is built with TypeScript and provides strong compile-time guarantees, ensuring you can't accidentally use a "post" ID where a "user" ID is expected.
- **Nicer URLs:** Create somewhat cleaner, more descriptive, URLs :).

## Features

- ✅ **Zero Dependencies:** Tiny and dependency-free.
- ✅ **Isomorphic/Universal:** Works in Node.js, browsers, and other modern JavaScript runtimes.
- ✅ **Type-Safe:** Built with TypeScript to prevent ID-related bugs at compile time.
- ✅ **Customizable:** Configure prefixes, lengths, and the unique ID generation function.

## Installation

```bash
npm install short-type-id
```

## Getting Started

1. Import the `createIdContext` function.
2. Create an `IdContext` with your entity types and desired configuration.
3. Use the instance to create, validate, and parse your IDs.

```ts
import createIdContext from 'short-type-id';

// Define your entity specifications and configuration
const definitions = {
  user: 'user', // Simple spec: uses the default ID length
  p: { prefix: 'p', length: 12 }, // Complex spec: custom prefix and length
};
const config = {
  generateUniqueId: nanoid, // Function to generate the unique part of the ID (see below for more details)
  defaultLength: 10,
};

// Create an ID context
const shortId = createIdContext(definitions);

// Create new IDs
const userId = shortId.create('user'); // e.g., "u_k4j5n6m7"
const postId = shortId.create('post'); // e.g., "p_a1b2c3d4e5f6"

console.log(`Created user ${userId} and post ${pId}`);

// Validate IDs
console.log(shortId.isValid(userId)); // true
console.log(shortId.isValid('invalid_id')); // false

// Get the type from an ID
console.log(shortId.getType(postId)); // 'post'

// Extract all valid IDs from a block of text
const text = `The author (${userId}) wrote a great post (${pId}).`;
const foundIds = shortId.findAll(text);
console.log(foundIds); // ['u_k4j5n6m7', 'p_a1b2c3d4e5f6']
```

## API Reference

When you call `createIdContext(definitions)`, you get back an `IdContext` object with the following methods and properties:

### `idContext.create(entityType)`

Creates a new, unique ID for the given entity type.

- `entityType`: The name of the entity type (e.g., `'user'`). Must be one of the keys from your definitions.
- **Returns**: A new ID `string`.

### `idContext.isValid(id)`

Checks if a string is a valid ID managed by this instance, including a strict check on the prefix and its corresponding length.

- `id`: The string to validate.
- **Returns**: `boolean`.

### `idContext.getType(id)`

Extracts the entity type from a given ID.

- `id`: The ID string.
- **Returns**: The entity type (e.g., `'user'`) or `undefined` if the ID is invalid.

### `idContext.isType(entityType)`

A higher-order function to check if an ID belongs to a specific type.

- `entityType`: The entity type to check against.
- **Returns**: A function `(id: string) => boolean` that you can use for type checking.

```ts
const isUser = idContext.isType('user');

console.log(isUser(userId)); // true
console.log(isUser(postId)); // false
```

### `idContext.findAll(text)`

Finds and extracts all valid IDs managed by this instance from a larger block of text.

- `text`: The text to search for IDs.
- **Returns**: An array of IDs `string[]`.

### Unique ID Generation

You can easily provide your own function to generate the unique part of IDs with full control over uniqueness, character sets, and performance that is suitable for your use case (i.e. expected data volumes, etc.).

When you provide a custom `generateUniqueId` function, it must:

1. **Must return a string**: The function must always return a value of type string.
2. **Must respect the length argument**: The returned string's length must be exactly equal to the length number passed into the function.
3. **Must use valid characters**: The returned string must only contain alphanumeric characters (a-z, A-Z, 0-9). The underscore _ is reserved as a separator and cannot be used within the unique part of the ID.

The create() method will validate its output and throw a descriptive error if these rules are not met. This validation ensures that all IDs created by the context are guaranteed to be valid and parsable by the other manager methods like `.isValid()` and `.getType()`.

**Example using [`nanoid`](https://github.com/ai/nanoid):**

```typescript
import createManager from 'short-type-id';
import { nanoid } from 'nanoid'

const idContext = createManager(
  {
    order: 'o',
  },
  {
    generateId: nanoid // The length parameter from your spec is passed to your function
    defaultLength: 6,
  }
);

const orderId = idContext.create('order');
console.log(orderId); // e.g., "o_f4a2b9"
```

## Comparison with `typeid`

[**typeid**](https://github.com/jetify-com/typeid) is a formal specification for creating type-safe, K-sortable, globally unique identifiers that are a superset of the upcoming UUIDv7 standard.

TL:DR;

- **typeid** if you are building a large, distributed system, need to sort by ID, and require a formal, cross-language standard for your globally unique identifiers.
- **short-type-id** are building a TypeScript application and need simple, human-readable, prefixed IDs with control over their format, length, and generation logic to suit your use case.

### Comparison

| Feature | `typeid` | `simple-type-id` (This library) |
| :--- | :--- | :--- |
| **Philosophy** | Prescriptive (strict spec) | Pragmatic (flexible toolkit) |
| **ID Suffix** | Fixed: 26-char, Base32, UUIDv7 | **User-defined:** Any length, any characters |
| **Sortability** | **K-Sortable (Time-based)** | Depends on your choice of ID generator |
| **Interoperability** | **High** (formal spec, many languages) | Low (defined by your app's config) |

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

MIT
