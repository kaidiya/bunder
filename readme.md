##### 实现了一个简易的打包工具
对webpack打包的过程有一个初步的认识，利用node的一些模块对代码文件进行分析
一共有三个过程，首先给定一个入口文件，对入口文件里的代码进行分析，
- 利用node模块里的fs模块读取出给定文件里的内容
```javaScript
const content = fs.readFileSync(filename, 'utf-8');
```
- 利用 @babel/parser 工具对读取到的文件内容进行分析，生成抽象语法树（ast）
```javaScript
const ast = parser.parse(content, {
  sourceType: "module",
});
```

- 利用 @babel/traverse 工具对生成的抽象语法树进行解析，拿到当前模块所依赖的一些模块
```javaScript
traverse(ast, {
  // 解析出其中的import引入的依赖
  ImportDeclaration({node}) {
    // 需要拿到当前引入模块的绝对路径方便后边对引入模块的解析处理
    const dirname = path.dirname(filename);
    const newFileName = './' + path.join(dirname, node.source.value);
    dependencies[node.source.value] = newFileName;
  }
});
```

- 利用 @babel/core 工具对抽象语法树进行分析进一步生成浏览器可以识别的代码
```javaScript
const { code } = babel.transformFromAst(ast, null, {
  presets: ['@babel/preset-env'],
})
```

- 根据获取到的文件路径及其代码code，生成能在浏览器里执行的js文件代码
```javaScript
`
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
`

fs.writeFileSync('resultcode.js', code);
```
