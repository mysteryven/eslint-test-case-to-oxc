# ESLint-to-Oxc

Migrate ESList test cases to Oxc.

## Install

[wip]

## Usage

```sh
node src/index.js no-debugger
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

[wip]
