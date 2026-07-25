export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "refactor", "chore", "doc"]],
    "subject-case": [0],
  },
}
