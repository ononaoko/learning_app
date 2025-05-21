import js from '@eslint/js'
import globals from 'globals'
import jsonPlugin from '@eslint/json'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import prettier from 'eslint-plugin-prettier'

export default [
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'build/**',
			'dist/**',
			'package.json',
			'package-lock.json',
			'tsconfig.json',
			'jsconfig.json'
		]
	},
	{
		files: ['**/*.{js,mjs,cjs}'],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node, ...globals.es2024 },
			ecmaVersion: 'latest',
			sourceType: 'module'
		},
		rules: {
			...js.configs.recommended.rules,
			eqeqeq: ['error', 'always'],
			'no-unused-vars': ['error', { varsIgnorePattern: '^\\$' }],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'prettier/prettier': [
				'error',
				{
					useTabs: true,
					singleQuote: true,
					semi: false,
					trailingComma: 'none',
					endOfLine: 'auto'
				}
			]
		}
	},
	{
		files: ['**/*.svelte'],
		plugins: { svelte, prettier },
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: 'espree',
				ecmaVersion: 'latest',
				sourceType: 'module'
			},
			globals: { ...globals.browser, ...globals.es2024 }
		},
		rules: {
			...svelte.configs['flat/recommended'].rules,
			'svelte/indent': ['error', { indent: 'tab' }],
			'svelte/no-at-html-tags': 'error',
			'no-unused-vars': ['error', { varsIgnorePattern: '^\\$' }],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'prettier/prettier': [
				'error',
				{
					useTabs: true,
					singleQuote: true,
					semi: false,
					trailingComma: 'none',
					endOfLine: 'auto'
				}
			]
		}
	},
	{
		files: ['problems.json'],
		plugins: { json: jsonPlugin, prettier },
		languageOptions: {
			parser: jsonPlugin.parser
		},
		rules: {
			...jsonPlugin.configs.recommended.rules,
			'jsonc/sort-keys': [
				'error',
				{
					pathPattern: '^.*$',
					order: ['id', 'question', 'hints', 'answer', 'image', 'unit']
				}
			],
			'prettier/prettier': [
				'error',
				{
					useTabs: true,
					singleQuote: true,
					semi: false,
					trailingComma: 'none',
					endOfLine: 'auto'
				}
			]
		}
	},
	{
		files: ['**/*.{js,mjs,cjs,svelte,json}'],
		plugins: { prettier },
		rules: {
			curly: 'off',
			quotes: 'off',
			semi: 'off',
			'comma-dangle': 'off',
			'arrow-parens': 'off',
			indent: 'off',
			'space-before-function-paren': 'off'
		}
	}
]
