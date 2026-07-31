/**
 * 前端实习面试题库 — 按分类组织
 *
 * 每日按日期轮换一条，保证系统覆盖所有知识点。
 * AI 生成的题目作为额外补充。
 */

export interface InterviewQuestion {
  category: string
  question: string
  answer: string
}

export const interviewQuestions: InterviewQuestion[] = [
  // === JavaScript 基础 ===
  {
    category: 'JavaScript',
    question: 'var、let、const 的区别是什么？',
    answer: 'var 有变量提升、函数作用域、可重复声明；let/const 有暂时性死区、块级作用域、不可重复声明。const 声明后必须赋值且不可重新赋值（但对象内部属性可改）。现代代码优先用 const，需要重新赋值用 let，避免 var。',
  },
  {
    category: 'JavaScript',
    question: '说说 JavaScript 中的事件循环（Event Loop）',
    answer: 'JS 是单线程，通过事件循环实现异步。调用栈执行同步代码；微任务队列（Promise.then、MutationObserver）在每个宏任务后、渲染前清空；宏任务队列（setTimeout、setInterval、I/O）每次取一个执行。微任务优先级高于宏任务。',
  },
  {
    category: 'JavaScript',
    question: '什么是闭包？常见应用场景有哪些？',
    answer: '闭包是函数与其词法环境的组合，内部函数可以访问外部函数的变量。应用：数据私有化（模块模式）、函数柯里化、防抖节流、回调中保存状态。注意：不当使用会导致内存泄漏（意外的全局引用）。',
  },
  {
    category: 'JavaScript',
    question: '浅拷贝和深拷贝的区别？如何实现深拷贝？',
    answer: '浅拷贝只复制一层（Object.assign、扩展运算符）；深拷贝递归复制所有层级。实现：JSON.parse(JSON.stringify())（不支持函数/循环引用）、structuredClone（原生，推荐）、递归手写（处理循环引用用 WeakMap）。',
  },
  {
    category: 'JavaScript',
    question: '说说原型链和继承',
    answer: '每个对象有 __proto__ 指向其构造函数的 prototype。访问属性时沿原型链向上查找。实现继承：ES6 class extends（推荐）、组合继承（call + prototype）、寄生组合继承。class 本质是语法糖。',
  },

  // === CSS ===
  {
    category: 'CSS',
    question: 'BFC 是什么？如何创建？有什么用？',
    answer: 'BFC（块级格式化上下文）是一个独立的渲染区域，内部元素不影响外部。创建：overflow:hidden/auto、display:flow-root、position:absolute/fixed、float。用途：清除浮动、防止 margin 塌陷、实现自适应两栏布局。',
  },
  {
    category: 'CSS',
    question: 'Flex 布局和 Grid 布局有什么区别？',
    answer: 'Flex 是一维布局（行或列），适合组件级布局；Grid 是二维布局（行列同时），适合页面级布局。Flex 用 justify-content/align-items 控制对齐；Grid 用 grid-template-columns/rows 定义网格，gap 设置间距。',
  },
  {
    category: 'CSS',
    question: '如何实现垂直水平居中？',
    answer: '方案1：父元素 display:flex; justify-content:center; align-items:center。方案2：子元素 position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)。方案3：Grid 父元素 place-items:center。方案4：line-height + text-align（仅行内元素）。',
  },
  {
    category: 'CSS',
    question: 'CSS 选择器优先级如何计算？',
    answer: '优先级从高到低：!important > 内联样式(1000) > ID(100) > 类/伪类/属性(10) > 元素/伪元素(1) > 通配符(0)。相同优先级时后者覆盖前者。继承的样式优先级最低。',
  },

  // === Vue ===
  {
    category: 'Vue',
    question: 'Vue 3 的 Composition API 和 Options API 有什么区别？',
    answer: 'Composition API（setup）按逻辑关注点组织代码，可复用性更好（自定义 hooks）；Options API（data/methods/computed）按选项类型组织。Composition API 更灵活，TypeScript 支持更好，适合复杂组件；Options API 更简单，适合小组件。',
  },
  {
    category: 'Vue',
    question: 'Vue 的响应式原理是什么？Vue 2 和 Vue 3 有什么区别？',
    answer: 'Vue 2 用 Object.defineProperty 劫持属性（无法监听数组变化和新增属性）；Vue 3 用 Proxy 代理整个对象（支持数组和新属性，性能更好）。Vue 3 配合 effect/track/trigger 实现依赖收集和派发更新。',
  },
  {
    category: 'Vue',
    question: 'v-if 和 v-show 有什么区别？',
    answer: 'v-if 是真正的条件渲染（DOM 创建/销毁），切换开销大，适合不频繁切换；v-show 只切换 display:none（DOM 保留），初始渲染开销大，适合频繁切换。v-if 可以配合 v-else/v-else-if；v-show 不支持 template 标签。',
  },
  {
    category: 'Vue',
    question: 'Vue 中 key 的作用是什么？',
    answer: 'key 是虚拟 DOM diff 算法的身份标识。没有 key 时 Vue 会尽可能复用同类型元素；有 key 时 Vue 基于 key 做最小化更新。使用 key 可以：正确识别节点、避免就地复用导致的 bug（如表单状态残留）。key 应唯一且稳定，避免用 index。',
  },

  // === 浏览器原理 ===
  {
    category: '浏览器原理',
    question: '从输入 URL 到页面展示发生了什么？',
    answer: '1.DNS 解析域名→IP 2.TCP 三次握手 3.HTTP 请求 4.服务器响应 5.浏览器解析 HTML→DOM 6.解析 CSS→CSSOM 7.合并为渲染树 8.布局（Layout） 9.绘制（Paint） 10.合成（Composite）。JS 会阻塞 HTML 解析。',
  },
  {
    category: '浏览器原理',
    question: '浏览器的重绘和回流（重排）是什么？如何避免？',
    answer: '回流：元素几何属性变化（宽高、位置）导致重新布局，开销大。重绘：外观变化（颜色、背景）不涉及布局，开销较小。回流必然触发重绘。避免：使用 transform 代替 position、避免逐条修改样式、使用 DocumentFragment、will-change 提示浏览器。',
  },
  {
    category: '浏览器原理',
    question: '什么是浏览器的垃圾回收机制？',
    answer: '标记清除：从根对象出发标记可达对象，清除未标记的。V8 分代回收：新生代（Scavenge 算法，短命对象）和老生代（标记清除+标记整理，长命对象）。常见内存泄漏：意外的全局变量、未清除的定时器、已删除 DOM 的事件监听、闭包引用。',
  },

  // === 网络 ===
  {
    category: '网络',
    question: 'HTTP 和 HTTPS 的区别？HTTPS 的加密过程？',
    answer: 'HTTP 明文传输，端口 80；HTTPS = HTTP + SSL/TLS 加密，端口 443。HTTPS 握手：1.客户端发送支持的加密套件 2.服务器返回证书和公钥 3.客户端验证证书 4.生成对称密钥用公钥加密发给服务器 5.后续用对称加密通信。',
  },
  {
    category: '网络',
    question: '什么是 CORS？如何解决跨域？',
    answer: 'CORS（跨域资源共享）是浏览器安全策略，同源策略限制不同源的请求。解决方案：服务器设置 Access-Control-Allow-Origin 响应头、代理服务器（同源代理转发）、JSONP（仅 GET）。简单请求直接发送，复杂请求先发 OPTIONS 预检。',
  },
  {
    category: '网络',
    question: 'TCP 三次握手和四次挥手的过程？',
    answer: '三次握手：1.客户端 SYN→服务器 2.服务器 SYN+ACK→客户端 3.客户端 ACK→服务器。四次挥手：1.客户端 FIN→服务器 2.服务器 ACK→客户端 3.服务器 FIN→客户端 4.客户端 ACK→服务器。三次握手保证双方都有收发能力。',
  },

  // === 性能优化 ===
  {
    category: '性能优化',
    question: '前端性能优化的常见手段有哪些？',
    answer: '加载优化：代码分割（路由懒加载）、Tree Shaking、Gzip/Brotli 压缩、CDN、图片懒加载/WebP。渲染优化：虚拟列表、防抖节流、requestAnimationFrame、减少重排重绘。缓存：HTTP 缓存、Service Worker、localStorage。监控：Lighthouse、Web Vitals。',
  },
  {
    category: '性能优化',
    question: '什么是防抖和节流？如何实现？',
    answer: '防抖（debounce）：事件停止触发 n 秒后执行，频繁触发只执行最后一次。用途：搜索框输入。节流（throttle）：n 秒内只执行一次。用途：滚动、resize。实现核心都是 setTimeout + 清除定时器。防抖每次清除重新计时，节流判断是否在冷却期。',
  },
  {
    category: '性能优化',
    question: '什么是虚拟 DOM？它解决了什么问题？',
    answer: '虚拟 DOM 是真实 DOM 的 JavaScript 对象描述（{tag, props, children}）。优势：1.跨平台（可渲染到原生/SSR）2.批量更新减少 DOM 操作 3. diff 算法做最小化更新。缺点：初次渲染多一层虚拟 DOM 创建开销。直接操作 DOM 在简单场景更快。',
  },

  // === 工程化 ===
  {
    category: '工程化',
    question: 'Webpack 和 Vite 有什么区别？',
    answer: 'Webpack：打包所有模块生成 bundle，开发时也要打包，大型项目启动慢。Vite：开发时利用浏览器原生 ESM 按需加载，启动极快；生产用 Rollup 打包。Vite HMR 是模块级精确更新。Webpack 生态更丰富，Vite 是趋势。',
  },
  {
    category: '工程化',
    question: '什么是 Tree Shaking？它的工作原理是什么？',
    answer: 'Tree Shaking 是移除未使用代码的优化。原理：基于 ES Module 的静态分析（import/export 在编译时确定），标记未使用的 export，在压缩阶段删除。条件：必须用 ESM 语法、package.json 配 sideEffects:false、生产模式开启。',
  },
  {
    category: '工程化',
    question: '什么是前端模块化？CommonJS 和 ES Module 的区别？',
    answer: 'CommonJS：运行时加载（require）、同步、值的拷贝、可用于服务端。ES Module：编译时确定依赖（import）、异步、值的引用（动态绑定）、静态可分析（支持 Tree Shaking）。浏览器原生支持 ESM（<script type="module">）。',
  },
]

/** 按日期轮换获取每日面试题（保证每天不同，循环覆盖） */
export function getDailyQuestion(date: string): InterviewQuestion {
  const seed = date.split('-').reduce((a: number, b: string) => a + parseInt(b), 0)
  return interviewQuestions[seed % interviewQuestions.length]
}

/** 获取连续 N 天的面试题（用于排计划） */
export function getDailyQuestions(startDate: string, days: number): { date: string; question: InterviewQuestion }[] {
  const result: { date: string; question: InterviewQuestion }[] = []
  const base = new Date(startDate)
  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    result.push({ date: dateStr, question: getDailyQuestion(dateStr) })
  }
  return result
}
