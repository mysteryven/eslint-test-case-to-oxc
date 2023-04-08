import babel from '@babel/core'
import traverse from "@babel/traverse";
import axios from 'axios'
import generate from "@babel/generator";
import * as tt from "@babel/types"

export async function downloadFromESLintRepo(name) {
  const url = `https://raw.githubusercontent.com/eslint/eslint/main/tests/lib/rules/${name}.js`; //  要下载的文件URL，以ESLint的配置文件为例
  const response = await axios.get(url)

  return response.data
}

export function process(code, name) {
  const structName = name.split("-").map(i => i[0].toUpperCase() + i.slice(1)).join("")
  const ast = babel.parse(code);
  let validOxcTest = []
  let invalidOxcTest = []

  traverse.default(ast, {
    CallExpression(path) {
      if (path.node.callee?.object?.name === 'ruleTester') {
        const properties = path.node.arguments[2].properties;

        const valid = properties.find(i => i.key.name === 'valid');
        const invalid = properties.find(i => i.key.name === 'invalid');
        validOxcTest = getOxcTestArray(valid)
        invalidOxcTest = getOxcTestArray(invalid)
      }
    },
  });



  return `\
#[test]
fn test() {
  use crate::tester::Tester;
  let pass = vec![ 
    ${validOxcTest.join(",\n")}
  ];
  let failed = vec![
    ${invalidOxcTest.join(",\n")}
  ];

  Tester::new(${structName}::NAME, pass, fail).test_and_snapshot();\
}
`
}

function getOxcTestArray(node) {
  const arr = node.value.elements.map(i => {
    if (i.type === 'StringLiteral') {
      return `("${i.value}", None)`;
    } else if (tt.isObjectExpression(i)) {
      const code = i.properties.find(i => i.key.name === 'code').value.value;
      const { code: optionsRawCode } = generate.default(i.properties.find(i => i.key.name === 'options')?.value)

      return `("${code}", Some(json!(${optionsRawCode})))`;
    }
  });

  return arr;
}
