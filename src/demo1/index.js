const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

const sourceCode = 'console.log(1)';

const ast = parser.parse(sourceCode, {
  plugins: ['jsx'],
  sourceType: 'unambiguous'
});

traverse(ast, {
  CallExpression(path, state) {
    const methodName = path.get('callee').code; // path.node.callee
  }
})

const { code } = generator(ast)
