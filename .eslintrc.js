module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: false,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 8,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
            experimentalObjectRestSpread: true,
        },
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
    },
    plugins: ['@typescript-eslint', 'import'],
    ignorePatterns: ['NetscriptDefinitions.d.ts', '*.js'],
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
        '@typescript-eslint/no-floating-promises': ['error'],

        //import
        'import/no-unresolved': ['warn'],
        'import/order': ['warn', {
            'alphabetize': {
                'order': 'asc',
                'caseInsensitive': false
            }
        }],
        'import/no-nodejs-modules': ['error'],
        'import/first': ['warn'],
        'import/newline-after-import': ['warn'],
    },
    "settings": {
        "import/parsers": {
          "@typescript-eslint/parser": [".ts", ".tsx"]
        },
        "import/resolver": {
          "typescript": {
            "alwaysTryTypes": true,
          }
        }
    }
}
