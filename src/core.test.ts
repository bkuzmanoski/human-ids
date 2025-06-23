import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";

import { createIdContext } from "./core.js";

const testIdGenerator = (length: number) => {
  const byteLength = Math.ceil(length / 2) + 1;
  return crypto.randomBytes(byteLength).toString("hex").slice(0, length);
};

void describe("createIdContext", () => {
  void describe("Initialization", () => {
    void it("should throw an error if no definitions are provided", () => {
      assert.throws(() => createIdContext({}, { generateUniqueId: testIdGenerator, defaultLength: 8 }), {
        message: "Cannot create an ID context with no type definitions.",
      });
    });

    void it("should throw an error for duplicate prefixes", () => {
      assert.throws(
        () => createIdContext({ user: "u", admin: "u" }, { generateUniqueId: testIdGenerator, defaultLength: 8 }),
        {
          message: 'Duplicate prefix "u" detected. Prefixes must be unique.',
        }
      );
    });

    void it("should throw an error for invalid prefixes", () => {
      assert.throws(
        () => createIdContext({ user: "user_admin" }, { generateUniqueId: testIdGenerator, defaultLength: 8 }),
        {
          message: 'Invalid prefix for type "user": Prefixes must be non-empty strings and cannot contain underscores.',
        }
      );
      assert.throws(() => createIdContext({ user: "" }, { generateUniqueId: testIdGenerator, defaultLength: 8 }), {
        message: 'Invalid prefix for type "user": Prefixes must be non-empty strings and cannot contain underscores.',
      });
    });

    void it("should successfully create a idContext with valid definitions", () => {
      const idContext = createIdContext(
        { user: "u", post: { prefix: "p", length: 12 } },
        { generateUniqueId: testIdGenerator, defaultLength: 8 }
      );
      assert.ok(idContext, "Context should be created");
      assert.ok(idContext.create, "Context should have a create method");
    });

    void it("should respect custom defaultLength", () => {
      const idContext = createIdContext({ user: "u" }, { generateUniqueId: testIdGenerator, defaultLength: 10 });
      assert.strictEqual(idContext.create("user").split("_")[1].length, 10);
    });

    void it("should respect custom generateUniqueId function", () => {
      const idContext = createIdContext(
        { user: "u" },
        {
          generateUniqueId: (length) => "a".repeat(length),
          defaultLength: 8,
        }
      );
      assert.strictEqual(idContext.create("user"), "u_aaaaaaaa");
    });
  });

  const idContext = createIdContext(
    {
      user: "u",
      post: { prefix: "p", length: 12 },
      comment: { prefix: "comment", length: 20 },
    },
    { generateUniqueId: testIdGenerator, defaultLength: 8 }
  );

  void describe("ID Creation (`.create`)", () => {
    void it("should create an ID with the correct prefix and default length", () => {
      const id = idContext.create("user");
      assert.ok(id.startsWith("u_"));
      assert.strictEqual(id.length, "u_".length + 8);
    });

    void it("should create an ID with the correct prefix and specified length", () => {
      const id = idContext.create("post");
      assert.ok(id.startsWith("p_"));
      assert.strictEqual(id.length, "p_".length + 12);
    });

    void it("should throw an error for an unknown entity type", () => {
      // @ts-expect-error - Intentionally testing invalid input
      assert.throws(() => idContext.create("invalidType"), {
        message: "Unknown type: invalidType",
      });
    });

    void it("should throw an error if the generator returns a non-string value", () => {
      const idContext = createIdContext(
        { user: "u" },
        {
          // @ts-expect-error - Intentionally providing a bad generator for testing
          generateUniqueId: () => null,
          defaultLength: 8,
        }
      );
      assert.throws(() => idContext.create("user"), {
        message:
          "The provided 'generateUniqueId' function must return a string, but it returned a value of type object.",
      });
    });

    void it("should throw an error if the generator returns a string of the wrong length", () => {
      const idContext = createIdContext(
        { user: "u" },
        {
          generateUniqueId: (length) => "a".repeat(length - 1), // One character too short
          defaultLength: 10,
        }
      );
      assert.throws(() => idContext.create("user"), {
        message: "The provided 'generateUniqueId' function returned a string with length 9 but expected length 10.",
      });
    });

    void it("should throw an error if the generator returns invalid characters", () => {
      const idContext = createIdContext(
        { user: "u" },
        {
          generateUniqueId: () => "abc-123!", // Contains invalid characters '-' and '!'
          defaultLength: 8,
        }
      );
      assert.throws(() => idContext.create("user"), {
        message:
          "The provided 'generateUniqueId' function returned a string with invalid characters. Only alphanumeric characters (a-z, A-Z, 0-9) are allowed.",
      });
    });
  });

  void describe("ID Validation (`.isValid`)", () => {
    void it("should return true for a valid ID", () => {
      const userId = idContext.create("user");
      const postId = idContext.create("post");
      assert.strictEqual(idContext.isValid(userId), true);
      assert.strictEqual(idContext.isValid(postId), true);
    });

    void it("should return false for an ID with a valid prefix but incorrect length", () => {
      assert.strictEqual(idContext.isValid("u_1234567"), false, "User ID should have length 8");
      assert.strictEqual(idContext.isValid("p_12345"), false, "Post ID should have length 12");
    });

    void it("should return false for an ID with an invalid prefix", () => {
      assert.strictEqual(idContext.isValid("invalid_12345678"), false);
    });

    void it("should return false for malformed IDs", () => {
      assert.strictEqual(idContext.isValid("user-12345678"), false);
      assert.strictEqual(idContext.isValid("user_123_456"), false);
    });

    void it("should return false for undefined or empty string", () => {
      assert.strictEqual(idContext.isValid(undefined), false);
      assert.strictEqual(idContext.isValid(""), false);
    });
  });

  void describe("Type Retrieval (`.getType`)", () => {
    void it("should return the correct type for a valid ID", () => {
      const userId = idContext.create("user");
      assert.strictEqual(idContext.getType(userId), "user");
    });

    void it("should return undefined for an invalid or unknown ID", () => {
      assert.strictEqual(idContext.getType("invalid_123"), undefined);
    });

    void it("should return undefined for an undefined input", () => {
      assert.strictEqual(idContext.getType(undefined), undefined);
    });
  });

  void describe("Prefix Retrieval (`.getPrefix`)", () => {
    void it("should return the correct prefix for a known type", () => {
      assert.strictEqual(idContext.getPrefix("user"), "u");
      assert.strictEqual(idContext.getPrefix("post"), "p");
    });

    void it("should throw an error for an unknown type", () => {
      // @ts-expect-error - Intentionally testing invalid input
      assert.throws(() => idContext.getPrefix("foo"), { message: "Unknown type provided to getPrefix: foo" });
    });
  });

  void describe("Type Checking (`.isType`)", () => {
    const isUser = idContext.isType("user");
    const userId = idContext.create("user");
    const postId = idContext.create("post");

    void it("should return a function", () => {
      assert.strictEqual(typeof isUser, "function");
    });

    void it("should return true for an ID of the correct type", () => {
      assert.strictEqual(isUser(userId), true);
    });

    void it("should return false for an ID of a different type", () => {
      assert.strictEqual(isUser(postId), false);
    });
  });

  void describe("ID Extraction (`.findAll`)", () => {
    void it("should find all valid IDs in a string", () => {
      const userId = idContext.create("user");
      const postId = idContext.create("post");
      const text = `Action by ${userId} on post ${postId}. An invalid ID: ${userId.slice(0, -1)}. No other IDs.`;
      const found = idContext.findAll(text);
      assert.deepStrictEqual(found, [userId, postId]);
    });

    void it("should return an empty array if no IDs are found", () => {
      const text = "This text has no valid identifiers.";
      assert.deepStrictEqual(idContext.findAll(text), []);
    });
  });
});
