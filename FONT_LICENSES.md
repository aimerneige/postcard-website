# 字体选择与授权核对

核对日期：2026-09-15。

需求中的「非商用字体」按免费个人使用、无需购买字体授权实现。这里提供的字体都是 **SIL Open Font License 1.1（OFL）开源字体**，允许个人使用及按许可嵌入、分发，也允许商业使用；不是仅限个人使用、禁止网站分发的字体。未引入需要购买授权的字体文件。

## 内置字体

| 界面名称 | 字体文件 | 风格 / 来源 | 许可 |
| --- | --- | --- | --- |
| irohamaru 圆体（原版） | irohamaru-Regular.ttf | [字体作者官方归档](https://modi.jpn.org/font_irohamaru.php)的 Regular 文件，与原附件 SHA-256 一致 | 字体内嵌 name ID 13 声明 OFL 1.1，ID 14 指向 OFL |
| Noto 黑体（简体中文） | NotoSansSC-Regular.otf | [Noto CJK 官方仓库](https://github.com/notofonts/noto-cjk/tree/main/Sans/SubsetOTF/SC)；无衬线黑体 | [官方许可](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE) |
| Noto 宋体（简体中文） | NotoSerifSC-Regular.otf | [Noto CJK 官方仓库](https://github.com/notofonts/noto-cjk/tree/main/Serif/SubsetOTF/SC)；衬线宋体 | [官方许可](https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE) |
| 马善政楷书 | MaShanZheng-Regular.ttf | [Google Fonts 官方字库](https://github.com/google/fonts/tree/main/ofl/mashanzheng)；毛笔楷书 | [官方许可](https://github.com/google/fonts/blob/main/ofl/mashanzheng/OFL.txt) |
| Lato（英文无衬线） | Lato-Regular.ttf | [Google Fonts 官方字库](https://github.com/google/fonts/tree/main/ofl/lato)；现代无衬线 | [官方许可](https://github.com/google/fonts/blob/main/ofl/lato/OFL.txt) |
| Lora（英文衬线） | Lora[wght].ttf | [Google Fonts 官方字库](https://github.com/google/fonts/tree/main/ofl/lora)；书卷感衬线 | [官方许可](https://github.com/google/fonts/blob/main/ofl/lora/OFL.txt) |
| Caveat（英文手写） | Caveat[wght].ttf | [Google Fonts 官方字库](https://github.com/google/fonts/tree/main/ofl/caveat)；自然手写体 | [官方许可](https://github.com/google/fonts/blob/main/ofl/caveat/OFL.txt) |

七款字体文件已作为仓库中的二进制例外提交，原始二进制未修改。构建脚本会校验 SHA-256，只有缺失或损坏时才从固定来源下载。irohamaru 来源为作者官方归档，按归档及 Regular 文件 SHA-256 双重校验；其余字体从固定上游提交下载。Lora 与 Caveat 使用上游可变字体文件，以 400 字重绘制；当前不提供额外字重控件。确切下载地址、提交号、文件大小、SHA-256 和内嵌授权信息在 [font-sources.json](./public/licenses/font-sources.json)。许可正文及版权声明在 `public/licenses/`，构建复制到 `dist/licenses/`。

irohamaru 的内嵌版权声明涉及 Adobe Source Han Sans 和 M+ FONTS PROJECT；这并不表示它是需要付费授权的字体。其内嵌 OFL 声明与已附许可一致，因此保留。界面 CSS 已移除对微软雅黑等具体系统字体的点名，仅使用浏览器的 `system-ui`；没有复制或打包操作系统字体。

## 使用行为

在「文字与白条 → 明信片字体」中选择。左右文字共用字体；字号、文字框、左右对齐、白条及构图规则保持不变。字体文件按需从当前网站加载，没有 Google Fonts 等第三方运行时请求。首次选择较大的中文字库需要等待下载；成功加载后在当前页面内复用，失败可以重试或改选其他字体。

预览、PNG 和 PDF 使用同一字体。PDF 中的文字栅格化，因此打开 PDF 不需要安装字体。英文字体缺失的中日文字形、中文字库缺失的日文字形优先由已内置的 irohamaru 补足，仍缺失时浏览器回退；无法承诺全部 Unicode 字符都具备专用字形。

## 分发

手动发布时保留完整的 `dist/licenses/`。Git 仓库提交字体文件、文本许可和来源清单；`dist` 中的发布字体由本地构建复制。OFL 要求分发字体时保留版权与许可，禁止单独售卖字体文件。[OFL 官方正文](https://openfontlicense.org/open-font-license-official-text/)说明，字体许可不会强制套用到使用字体生成的文档上。
