# human-ids

<!-- [![NPM version](https://img.shields.io/npm/v/human-ids.svg)](https://www.npmjs.com/package/human-ids) -->
<!-- [![License](https://img.shields.io/npm/l/human-ids.svg)](https://github.com/bkuzmanoski/human-ids/blob/main/LICENSE.txt) -->
<!-- [![Bundle size](https://img.shields.io/bundlephobia/minzip/human-ids)](https://bundlephobia.com/result?p=human-ids) -->
[![Build status](https://github.com/bkuzmanoski/human-ids/actions/workflows/main.yaml/badge.svg)](https://github.com/bkuzmanoski/human-ids/actions/workflows/main.yaml)

A tiny, type-safe, and robust library for creating and managing prefixed, human-readable IDs.

Stop using UUIDs and database integers in your user-facing applications. Start using IDs that make sense to you, your team, and even your users.

Example:

- `https://example.com/post_a1b2c3d4`
- `https://api.myapp.com/user_k4j5n6m7`

## Why?

Using prefixed IDs like `user_...` and `post_...` offers advantages over traditional identifiers like UUIDs or auto-incrementing integers.

- **Instant Context:** See an ID anywhere—in logs, database records, URLs, or API responses—and know exactly what kind of entity it refers to without looking it up.
- **Improved LLM and AI Integration:** When interfacing with Large Language Models, providing prefixed IDs gives them crucial context about your data schema. An LLM can understand `user_...` refers to a user and can even generate placeholder IDs like `user_new` in structured outputs which your application can then parse and replace with a real ID.
- **Nicer URLs:** Create clean, descriptive, URLs that are more user-friendly.
- **Type-Safety:** This library is built with TypeScript and provides strong compile-time guarantees, ensuring you can't accidentally use a "post" ID where a "user" ID is expected.

## Features

- ✅ **Zero Dependencies:** Tiny and dependency-free.
- ✅ **Isomorphic/Universal:** Works in Node.js, browsers, and other modern JavaScript runtimes.
- ✅ **Type-Safe:** Built with TypeScript to prevent ID-related bugs at compile time.
- ✅ **Customizable:** Configure prefixes, lengths, and the random ID generation function (see [Security, Collisions, and Custom ID Generation](#security-collisions-and-custom-id-generation)).

## Getting Started

1. Import the factory function.
2. Define your entity types with their desired prefixes.
3. Create a manager instance.
4. Use the manager to create, validate, and parse your IDs.

```ts
import createIdManager from 'human-ids';

// 1. Define your entity specifications
const definitions = {
  user: 'user', // Simple spec: uses the default ID length
  post: { prefix: 'post', length: 12 }, // Complex spec: custom prefix and length
};

// 2. Create your ID manager
const idManager = createIdManager(definitions);

// 3. Use the manager's tools
const userId = idManager.create('user'); // e.g., "user_k4j5n6m7"
const postId = idManager.create('post'); // e.g., "post_a1b2c3d4e5f6"

console.log(`Created user ${userId} and post ${postId}`);

// Validate IDs
console.log(idManager.isValid(userId)); // true
console.log(idManager.isValid('invalid_id')); // false

// Get the type from an ID
console.log(idManager.getType(postId)); // 'post'

// Extract all valid IDs from a block of text
const text = `The author (${userId}) wrote a great post (${postId}).`;
const foundIds = idManager.findAll(text);
console.log(foundIds); // ['user_k4j5n6m7', 'post_a1b2c3d4e5f6']
```

## API Reference

When you call `createIdManager(definitions)`, you get back an `IdManager` object with the following methods and properties:

### `manager.create(entityType)`

Creates a new, unique ID for the given entity type.

- `entityType`: The name of the entity type (e.g., `'user'`). Must be one of the keys from your definitions.
- **Returns**: A new `HumanId` string.

### `manager.isValid(id)`

Checks if a string is a valid ID managed by this instance, including a strict check on the prefix and its corresponding length.

- `id`: The string to validate.
- **Returns**: `boolean`.

### `manager.getType(id)`

Extracts the entity type from a given ID.

- `id`: The ID string.
- **Returns**: The entity type (e.g., `'user'`) or `undefined` if the ID is invalid.

### `manager.isType(entityType)`

A higher-order function to check if an ID belongs to a specific type.

- `entityType`: The entity type to check against.
- **Returns**: A function `(id: string) => boolean` that you can use for type checking.

```ts
const isUser = manager.isType('user');

console.log(isUser(userId)); // true
console.log(isUser(postId)); // false
```

### `manager.findAll(text)`

Finds and extracts all valid IDs managed by this instance from a larger block of text.

- `text`: The text to search for IDs.
- **Returns**: An array of `HumanId` strings.

### `manager.FIND_ALL_REGEX`

A regular expression that matches all valid IDs managed by this instance for advanced use cases.

## Custom Configuration

The `createIdManager` function accepts an optional second argument for configuration options.

- `generateId`

  A function that generates a random ID of a given length. **Please review the [Security, Collisions, and Custom ID Generation](#security-collisions-and-custom-id-generation) section below for important considerations.**

- `defaultLength`

  The default length of generated IDs for each entity type. By default, it is set to `8`.

```ts
import createManager from 'human-ids';

const idManager = createManager(
  {
    product: 'product',
  },
  {
    // Provide a custom ID generator
    generateId: (length) => 'x'.repeat(length),

    // Set a different default length for the random part
    defaultLength: 10,
  }
);

const productId = idManager.create('product');
console.log(productId); // "product_xxxxxxxxxx"
```

### Security, Collisions, and Custom ID Generation

The library includes a default `generateId` function designed to provide a secure source of randomness in multiple JavaScript environments.

#### Default Generator Behavior

The default function prioritizes the best available entropy source:

1. **Node.js:** It uses the built-in `crypto.randomBytes()`, a cryptographically secure pseudo-random number generator.
2. **Modern Browsers & Web Workers:** It uses `crypto.getRandomValues()`, the standard secure method from the Web Crypto API.
3. **Insecure Fallback:** If neither of the above is available, it falls back to `Math.random()`. **This fallback is not secure** and a warning will be printed to the console if it is used.

#### ⚠️ Important Note on Collisions ⚠️

While the default generator uses cryptographically strong randomness, it produces **random strings**, not globally unique identifiers (GUIDs/UUIDs).

Unlike UUIDs, which have a standardized structure and a massive keyspace designed to prevent collisions across all systems everywhere, the default generator's collision resistance depends entirely on the length of the ID and the quality of the runtime's random number generator.

The default `generateId` function is OK for testing, however **we strongly recommend providing your own battle-tested, collision-resistant ID generation library.**

#### Overriding the Default Generator

You can easily provide your own function to gain full control over uniqueness, character sets, and performance.

**Example using [`nanoid`](https://github.com/ai/nanoid) (a popular choice for collision-resistant IDs):**

```typescript
import createManager from 'human-ids';
import { nanoid } from 'nanoid'

const manager = createManager(
  {
    order: 'order',
  },
  {
    generateId: nanoid // The length parameter from your spec is passed to your function
  }
);

const orderId = manager.create('order');
console.log(orderId); // e.g., "order_f4a2b9c1"
```

## Using Symbols for Entity Types

For large applications or to prevent key collisions between modules, you can use Symbols as your entity type keys.

```ts
// module-a.ts
export const USER_TYPE = Symbol('user');

// main.ts
import { USER_TYPE } from './module-a.ts';

const manager = createManager({
  [USER_TYPE]: 'user',
});

// You must use the imported symbol to create IDs
const userId = manager.create(USER_TYPE);
```

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

MIT
