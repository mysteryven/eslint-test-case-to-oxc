import {test} from 'vitest';
import { process } from '../src/utils';
import { expect } from 'vitest';


test.runIf(false)("raw string", () => {

  const file = `
const rule = require("../../../lib/rules/no-debugger"),
    { RuleTester } = require("../../../lib/rule-tester");
const ruleTester = new RuleTester();
ruleTester.run("no-debugger", rule, {
    valid: [
        "var test = { debugger: 1 }; test.debugger;"
    ],
    invalid: [ "var test = { debugger: 1 }; test.debugger;" ]
}); 
  `

  expect(process(file, "no-debugger")).toMatchInlineSnapshot(`
    "#[test]
    fn test() {
      use crate::tester::Tester;
      let pass = vec![ 
        (\\"var test = { debugger: 1 }; test.debugger;\\", None)
      ];
      let failed = vec![
        (\\"var test = { debugger: 1 }; test.debugger;\\", None)
      ];
    };

    Tester::new(NoDebugger::NAME, pass, fail).test_and_snapshot();"
  `)
})

test.runIf(false)("object string", () => {

  const file = `
const ruleTester = new RuleTester();
ruleTester.run("no-debugger", rule, {
    valid: [
      { code: "delete x", errors: [{ messageId: "unexpected", type: "UnaryExpression" }] } 
    ],
    invalid: [ 
      {
        code: "var f = function() { return /=foo/; };",
        output: "var f = function() { return /[=]foo/; };",
        errors: [{ messageId: "unexpected", type: "Literal" }]
      }
    ]
}); 
  `

  expect(process(file, "no-debugger")).toMatchInlineSnapshot(`
    "#[test]
    fn test() {
      use crate::tester::Tester;
      let pass = vec![ 
        (\\"delete x\\", None)
      ];
      let failed = vec![
        (\\"var f = function() { return /=foo/; };\\", None)
      ];
    };

    Tester::new(NoDebugger::NAME, pass, fail).test_and_snapshot();"
  `)
})

test("object string with option", () => {

  const file = `
const ruleTester = new RuleTester();
ruleTester.run("no-debugger", rule, {
    valid: [
      { code: "~[1, 2, 3].indexOf(1)", options: [{ allow: ["~"] }] },
      { code: "~1<<2 === -8", options: [{ allow: ["~", "<<"] }] },
      { code: "a|0", options: [{ int32Hint: true }] },
      { code: "a|0", options: [{ allow: ["|"], int32Hint: false }] }
    ],
    invalid: []
}); 
  `

  expect(process(file, "no-debugger")).toMatchInlineSnapshot(`
    "#[test]
    fn test() {
      use crate::tester::Tester;
      let pass = vec![ 
        (\\"~[1, 2, 3].indexOf(1)\\", Some(json!([{
      allow: [\\"~\\"]
    }]))),
    (\\"~1<<2 === -8\\", Some(json!([{
      allow: [\\"~\\", \\"<<\\"]
    }]))),
    (\\"a|0\\", Some(json!([{
      int32Hint: true
    }]))),
    (\\"a|0\\", Some(json!([{
      allow: [\\"|\\"],
      int32Hint: false
    }])))
      ];
      let failed = vec![
        
      ];
    };

    Tester::new(NoDebugger::NAME, pass, fail).test_and_snapshot();"
  `)
})
