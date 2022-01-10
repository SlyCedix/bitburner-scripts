module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: false,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 8,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
            experimentalObjectRestSpread: true,
        },
    },
    plugins: ['@typescript-eslint'],
    ignorePatterns: ['NetscriptDefinitions.d.ts',],
    rules: {
        'max-len': ['warn', { 'code': 120 }],
        'no-constant-condition': ['off'],
        'no-debugger': ['off'],
        'semi': ['warn', 'never'],
        'no-trailing-spaces': ['warn'],
        'quotes': ['warn', 'single'],

        //@typescript-eslint
        '@typescript-eslint/ban-ts-comment': ['off'],
        '@typescript-eslint/indent': ['warn', 4],
    }
}
