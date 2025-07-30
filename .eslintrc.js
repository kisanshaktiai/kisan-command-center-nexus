
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    // Architecture rules
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/integrations/supabase/*'],
            message: 'Direct Supabase imports should only be used in services layer'
          },
          {
            group: ['@/services/*'],
            message: 'Services should be accessed through domain layer'
          }
        ]
      }
    ],
    
    // Component architecture
    'react/display-name': 'error',
    'react/prop-types': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Performance
    'react/jsx-no-bind': ['warn', {
      allowArrowFunctions: true,
      allowBind: false,
      allowFunctions: false
    }],
    
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
