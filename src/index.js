import cac from 'cac'
import { spawn } from 'child_process';
import { downloadFromESLintRepo, process } from './utils.js';

const cli = cac('migration-eslint-to-oxc')
cli.version('0.1.0')
cli.command('<NAME>', 'ESLint rule file name').action(async (text, options) => {

  console.log(`fetching rule ${text} from eslint repo...`)
  const codes = await downloadFromESLintRepo(text)
  const result = process(codes, text)

  console.log("---- result ----")
  console.log(result)
  console.log("---- end ----")
  const proc = spawn('pbcopy')
  proc.stdin.write(result); proc.stdin.end()

  console.log("copied to clipboard!")

})

const parsed = cli.parse()

