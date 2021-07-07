const parser = require('@babel/parser');
const { codeFrameColumns } = require('@babel/code-frame');
const chalk = require('chalk');
const Scope = require('./scope');

const sourceCode = `
  const a = 1 + 2;
  function add(a, b) {
    return a + b
  }
  console.log(a);
  console.log(add(2, 2));
`;

const ast = parser.parse(sourceCode, {
  sourceType: 'unambiguous'
});

function getIdentifierValue(node, scope, evaluate) {
  if (node.type === 'Identifier') {
    return scope.get(node.name)
  }
  return evaluate(node, scope);
}

let evaluator = (function() {
  const astInterpreters = {
    Program (node, scope) {
      node.body.forEach(item => {
        evaluate(item, scope);
      })
    },

    // --- const a = 1 + 2;
    VariableDeclaration(node, scope) {
      node.declarations.forEach(item => {
        evaluate(item, scope)
      })
    },

    VariableDeclarator(node, scope) {
      const declareName = evaluate(node.id);
      if (scope.get(declareName)) {
        throw Error(`duplicate declare variable：${declareName}`) 
      }
      // scope[declareName] = evaluate(node.init, scope);
      scope.set(declareName, evaluate(node.init, scope));
    },

    /**
     * 二元表达式，这里只处理了 常用的加减乘除
     * @param {*} node ast 节点
     * @param {*} scope 作用域
     * @returns 
     */
    BinaryExpression(node, scope) {
      const leftValue = getIdentifierValue(node.left, scope, evaluate);
      const rightValue = getIdentifierValue(node.right, scope, evaluate);
      switch (node.operator) {
        case '+':
          return leftValue + rightValue;
        case '-':
          return leftValue - rightValue;
        case '*':
          return leftValue * rightValue;
        case '/':
          return leftValue / rightValue;
        default:
          throw Error('upsupported operator：' + node.operator);
      }
    },

    Identifier(node) {
      return node.name;
    },

    NumericLiteral(node) {
      return node.value;
    },

    // console.log(a)
    ExpressionStatement(node, scope) {
      return evaluate(node.expression, scope);
    },

    CallExpression(node, scope) {
      const args = node.arguments.map(item => {
        if (item.type === 'Identifier') {
          return scope.get(item.name)
        }
        return evaluate(item, scope)
      });

      // 如 console.log 中，log是console一个成员方法，log的type为 MemberExpression
      if (node.callee.type === 'MemberExpression') {
        const fn = evaluate(node.callee, scope);
        const fnScope = evaluate(node.callee.object, scope);
        return fn.apply(fnScope, args);
      } else {
        const fn = scope.get(evaluate(node.callee, scope));
        return fn.apply(null, args);
      }
    },

    MemberExpression(node, scope) {
      const obj = scope.get(evaluate(node.object));
      return obj[evaluate(node.property)]
    },

    // 函数调用
    FunctionDeclaration(node, scope) {
      const declareName = evaluate(node.id);
      if (scope.get(declareName)) {
        throw Error(`duplicate declare function：${declareName}`)
      }
      scope.set(declareName, function(...args){
        const fnScope = new Scope();
        fnScope.parent = scope;
        node.params.forEach((item, index) => {
          fnScope.set(item.name, args[index])
        });
        fnScope.set('this', this);
        return evaluate(node.body, fnScope);
      });
    },

    BlockStatement(node, scope) {
      for (let i = 0; i< node.body.length; i++) {
        if (node.body[i].type === 'ReturnStatement') {
          return evaluate(node.body[i], scope);
        }
        evaluate(node.body[i], scope);
      }
    },

    ReturnStatement(node, scope) {
      return evaluate(node.argument, scope)
    },
  }

  const evaluate = (node, scope) => {
    try {
      return astInterpreters[node.type](node, scope)
    } catch (e) {
      if (e && e.message && e.message.includes('astInterpreters[node.type] is not a function')) {
        console.error('unsupported ast type: ' + node.type);
        console.error(codeFrameColumns(sourceCode, node.loc, {
          highlightCode: true
        }));
      } else {
        console.error(e.message);
        console.error(codeFrameColumns(sourceCode, node.loc, {
          highlightCode: true
        }));
      }
    }
  }

  return { evaluate }
})();

// evaluator = evaluator();

// 用户作用域中变量的声明和取值
// const globalScope = {};

const globalScope = new Scope();
globalScope.set('console', {
  log: function(...args) {
    console.log(chalk.green(...args))
  },
  error: function(...args) {
    console.log(chalk.red(...args))
  },
  info: function(...args) {
    console.log(chalk.black(...args))
  }
})

evaluator.evaluate(ast.program, globalScope)

// console.log(globalScope);