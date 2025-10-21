import stylistic from '@stylistic/eslint-plugin';

export default [
  {
    files: ['**/*.js'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Indentation: 2 spaces
      '@stylistic/indent': ['error', 2],

      // Quotes: single quotes, avoid escape
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true}],

      // Semicolons: always required
      '@stylistic/semi': ['error', 'always'],

      // Trailing commas: all
      '@stylistic/comma-dangle': ['error', 'always-multiline'],

      // No space after keywords
      '@stylistic/keyword-spacing': ['error', {
        overrides: {
          'if': {after: false},
          'for': {after: false},
          'switch': {after: false},
          'while': {after: false},
        },
      }],

      // Space before function parentheses
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always',
        catch: 'never',
      }],

      // Line length guidance (warning only)
      '@stylistic/max-len': ['warn', {code: 100, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true}],

      // Arrow function parentheses: only when needed
      '@stylistic/arrow-parens': ['error', 'as-needed'],

      // Comma spacing
      '@stylistic/comma-spacing': ['error', {before: false, after: true}],

      // Object property spacing
      '@stylistic/key-spacing': ['error', {beforeColon: false, afterColon: true}],

      // Space around operators
      '@stylistic/space-infix-ops': 'error',

      // Brace style: opening brace on same line
      '@stylistic/brace-style': ['error', '1tbs', {allowSingleLine: true}],
    },
  },
];
