'use strict';

module.exports = {
  extends: ['airbnb-base'],

  env: {
    node: true,
    'jest/globals': true
  },

  overrides: [
    {
      files: ['.eslintrc.{js,cjs}']
    }
  ],

  plugins: ['jest'],

  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },

  rules: {
    'arrow-parens': 'off',
    camelcase: 'off',
    'class-methods-use-this': 'off',
    'comma-dangle': 'off',
    'consistent-return': 'off',
    eqeqeq: ['error', 'allow-null'],
    'func-names': 'error',
    'implicit-arrow-linebreak': 'off',
    'max-len': ['error', 120, 2],
    'no-await-in-loop': 'off',
    'no-confusing-arrow': 'off',
    'no-console': 'off',
    'no-continue': 'off',
    'no-else-return': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': ['error', 'nofunc'],
    'operator-linebreak': 'off',
    'prefer-destructuring': 'off',
    'space-before-function-paren': 'off',
    strict: ['error', 'global']
  }
};
