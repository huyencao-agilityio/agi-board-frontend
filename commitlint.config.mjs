// Commit format: <type>(<scope>): #<ticket> <Imperative summary>
// e.g. feat(boards): #123 Add board route guards   (ticket = Trello card number)
const TYPES = ['feat', 'fix', 'chore', 'refactor', 'test', 'docs', 'build', 'ci', 'perf', 'revert']

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-ticket': ({ subject }) => [
          /^#\d+ \S/.test(subject ?? ''),
          'subject must start with the Trello ticket id, e.g. "#123 Add board route guards"',
        ],
        'subject-summary-case': ({ subject }) => [
          /^#\d+ [A-Z]/.test(subject ?? ''),
          'summary after the ticket id must start with a capital letter (imperative), e.g. "#123 Add ..."',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', TYPES],
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    // The summary is sentence case ("Add ..."), which config-conventional forbids by default.
    'subject-case': [0],
    'subject-ticket': [2, 'always'],
    'subject-summary-case': [2, 'always'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
  },
}
