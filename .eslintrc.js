module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: false,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 8,
        sourceType: "module",
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
        },
    },
    plugins: ["@typescript-eslint"],
    ignorePatterns: ['NetscriptDefinitions.d.ts', '*.js'],
    rules: {
        'no-constant-condition': ['off'],
        '@typescript-eslint/ban-ts-comment': ['off'],
        'no-debugger': ['off'],
    }
}
