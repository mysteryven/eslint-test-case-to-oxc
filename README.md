# ESLint-test-case-to-oxc

Migrate ESList test cases to Oxc.

## Install

```sh
npm i eslint-test-case-to-oxc
```

## Usage

```sh
pnpm trans no-debugger
```

Result:

```sh
fetching rule no-debugger from eslint repo...
---- result ----
#[test]
fn test() {
  use crate::tester::Tester;
  let pass = vec![
    ("var test = { debugger: 1 }; test.debugger;", None)
  ];
  let failed = vec![
    ("if (foo) debugger", Some(json!()))
  ];
  Tester::new(NoDebugger::NAME, pass, fail).test_and_snapshot();
}
---- end ----
copied to clipboard!
```
