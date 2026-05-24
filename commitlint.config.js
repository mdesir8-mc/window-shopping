export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["fix", "feat", "docs", "refactor", "test", "chore"]
    ]
  }
};
