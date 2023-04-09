import * as babel from '@babel/core'
import { exec } from 'child_process'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'
import path from 'path'
import { readFileSync, rmSync } from 'fs'

export async function downloadFromESLintRepo(name: string): Promise<string> {
  const fileUrl = `https://raw.githubusercontent.com/eslint/eslint/main/tests/lib/rules/${name}.js`
  const fileName = path.resolve(`./${name}.js`)

  return new Promise((resolve, reject) => {
    exec(`curl ${fileUrl} -o ${name}.js`, (error, stdout, stderr) => {
      const content = readFileSync(fileName, 'utf-8')
      rmSync(fileName)
      resolve(content)
    })
  })
}

export function process(code: string, name: string) {
  let addImportJSON = false
  const structName = name
    .split('-')
    .map((i) => i[0].toUpperCase() + i.slice(1))
    .join('')
  const ast = babel.parse(code)
  let validOxcTest: string[] = []
  let invalidOxcTest: string[] = []
  const traverseFn = isFunction(traverse) ? traverse : traverse.default
  traverseFn(ast, {
    CallExpression(path: babel.NodePath<babel.types.CallExpression>) {
      const callee = path.node.callee
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object) &&
        callee.object.name === 'ruleTester' &&
        t.isObjectExpression(path.node.arguments[2])
      ) {
        const properties = path.node.arguments[2].properties.filter((i) =>
          t.isObjectProperty(i)
        ) as t.ObjectProperty[]

        const valid = properties.find(
          (i) => t.isIdentifier(i.key) && i.key.name === 'valid'
        )
        const invalid = properties.find(
          (i) => t.isIdentifier(i.key) && i.key.name === 'invalid'
        )

        if (valid) {
          const { list, importJSON } = getOxcTestArray(valid, path)
          validOxcTest = list
          addImportJSON = addImportJSON || importJSON
        }

        if (invalid) {
          const { list, importJSON } = getOxcTestArray(invalid, path)
          invalidOxcTest = list
          addImportJSON = addImportJSON || importJSON
        }
      }
    },
  })

  return `\
#[test]
fn test() {
  ${addImportJSON ? 'use serde_json::json;' : ''} 
  use crate::tester::Tester;
  let pass = vec![ 
    ${validOxcTest.join(',\n')}
  ];
  let fail = vec![
    ${invalidOxcTest.join(',\n')}
  ];

  Tester::new(${structName}::NAME, pass, fail).test_and_snapshot();
}
`
}

function getOxcTestArray(
  node: t.ObjectProperty,
  path: babel.NodePath<babel.types.CallExpression>
) {
  let importJSON = false

  if (t.isArrayExpression(node.value)) {
    const arr = node.value.elements.map((i) => {
      if (t.isStringLiteral(i)) {
        return `("${i.value}", None)`
      } else if (t.isObjectExpression(i) && i && i.properties) {
        const properties = ((i.properties || []).filter((i) =>
          t.isObjectProperty(i)
        ) || []) as t.ObjectProperty[]
        const codeNode = properties.find(
          (i) => t.isIdentifier(i.key) && i.key.name === 'code'
        )?.value
        let code = ''

        if (t.isStringLiteral(codeNode)) {
          code = codeNode.value
        }

        const optionsRawCode = getJSONObject(
          properties.find(
            (i) => t.isIdentifier(i.key) && i.key.name === 'options'
          )?.value as any,
          path
        )

        if (optionsRawCode) {
          importJSON = true
          const s = optionsRawCode
          return `("${code}", Some(json!(${JSON.stringify(optionsRawCode)})))`
        } else {
          return `("${code}", None)`
        }
      }
    })

    return {
      list: arr.filter(Boolean) as string[],
      importJSON,
    }
  }

  return { list: [], importJSON: false }
}

function getJSONObject(
  nodes:
    | t.ArrayExpression
    | t.ObjectExpression
    | t.Identifier
    | t.NumericLiteral
    | t.StringLiteral
    | t.BooleanLiteral,
  path: babel.NodePath<babel.types.CallExpression>
) {
  if (t.isIdentifier(nodes)) {
    const obj = path.scope.getBinding(nodes.name)?.path.node
    if (t.isVariableDeclarator(obj) && t.isObjectExpression(obj.init)) {
      return getJSONObject(obj.init, path)
    }
  }
  if (t.isNumericLiteral(nodes)) {
    return nodes.value
  }

  if (t.isStringLiteral(nodes)) {
    return nodes.value
  }

  if (t.isBooleanLiteral(nodes)) {
    return nodes.value
  }

  if (t.isObjectExpression(nodes)) {
    const obj = {}
    nodes.properties.forEach((property) => {
      if (t.isObjectProperty(property) && t.isIdentifier(property.key)) {
        obj[property.key.name] = getJSONObject(property.value as any, path)
      }
    })

    return obj
  }

  if (t.isArrayExpression(nodes)) {
    return nodes.elements.map((i) => getJSONObject(i as any, path))
  }
}

function isFunction(fn: any) {
  return typeof fn === 'function'
}
