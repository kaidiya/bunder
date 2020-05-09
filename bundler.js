const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

// 模块分析，对每一个文件的内容作分析
const moduleAnalyser = (filename) => {
  // 对传入的文件内容做分析
  const content = fs.readFileSync(filename, 'utf-8');
  // 利用@babel/parser对源代码进行分析，可以得到抽象语法树ast
  const ast = parser.parse(content, {
    sourceType: "module",
  });
  const dependencies = {};
  // 遍历抽象语法树，找到语法树中引入的一些依赖
  traverse(ast, {
    // 解析出其中的import引入的依赖
    ImportDeclaration({node}) {
      // 需要拿到当前引入模块的绝对路径方便后边对引入模块的解析处理
      const dirname = path.dirname(filename);
      const newFileName = './' + path.join(dirname, node.source.value);
      dependencies[node.source.value] = newFileName;
    }
  });
  const { code } = babel.transformFromAst(ast, null, {
    presets: ['@babel/preset-env'],
  })
  return {
    filename,
    dependencies,
    code,
  }
};

// 依赖图谱，分析整个项目的依赖关系
const dependenciesGraph = (entry) => {
  // 首先分析入口文件
  const entryModule = moduleAnalyser(entry);
  const allDependencies = [ entryModule ];
  const graph = {}; 
  for(let i = 0; i < allDependencies.length; i++) {
    const {dependencies, filename, code} = allDependencies[i];
    for(let j in dependencies) {
      allDependencies.push(moduleAnalyser(dependencies[j]));
    }
    graph[filename] = {
      dependencies,
      code,
    }
  }
  return graph;
}

// 生成可以运行的代码
const generateCode = (entry) => {
  const getAllDependencies = dependenciesGraph(entry);
  const dependenciesStr = JSON.stringify(getAllDependencies);
  // 返回最后能执行的代码
  return `
    (function(graph) {
      function require(module) {
        function localRequire(relativePath) {
          return require(graph[module].dependencies[relativePath]);
        }
        var exports = {};
        (function(require, exports, code) {
          eval(code);
        })(localRequire, exports, graph[module].code);
        return exports;
      }
      require('${entry}')
    })(${dependenciesStr})
  `;
}

const code = generateCode('./src/index.js');

// 生成文件并且写入打包后的代码
fs.writeFileSync('resultcode.js', code);
// console.log(code);