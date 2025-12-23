module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: "airbnb-base",
  overrides: [
    {
      env: {
        node: true
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script"
      }
    }
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {
    quotes: "off",
    "import/extensions": ["off", { "<js>": "always" }],
    "comma-dangle": "off",
    "arrow-parens": "off",
    "import/prefer-default-export": "off",
    "no-restricted-syntax": "off",
    "class-methods-use-this": "off",
    "import/no-unresolved": "off",
    "no-plusplus": "off",
    "no-continue": "off",
    "operator-linebreak": "off",
    "implicit-arrow-linebreak": "off",
    "function-paren-newline": "off",
    "no-await-in-loop": "off",
    "no-console": "off"
  },
  settings: {
    node: {
      moduleDirectory: ["node_modules", "src"]
    }
  }
};
