module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "public/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
];