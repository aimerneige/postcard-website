export type Language = "zh" | "en" | "ja";

export interface FontMeta {
  label: string;
  description: string;
}

export interface Translations {
  // Brand & Header
  appName: string;
  appCaption: string;
  localOnly: string;
  themeToggle: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  languageSelect: string;

  // Intro
  eyebrow: string;
  heroTitle: string;
  heroPeriod: string;
  heroDesc: string;
  postcardTagNumber: string;
  landscapeTag: string;
  portraitTag: string;

  // Preview Area
  previewAria: string;
  livePreview: string;
  frontPreview: string;
  dragHint: string;
  dragHintEmpty: string;
  canvasAria: string;
  emptyTitle: string;
  emptySubtitle: string;
  emptyFormat: string;

  // Quality Card
  qualityTitlePpi: (ppi: number) => string;
  qualityTitleEmpty: string;
  qualityGood: string;
  qualityLow: string;
  qualityEmpty: string;
  imageMaxPpi: (maxPpi: number) => string;
  rawPixels: (width: number, height: number) => string;
  limitedPixelsNote: (width: number, height: number) => string;
  badgeGood: string;
  badgeWarn: string;
  badgeTip: string;

  // Process Steps
  step1: string;
  step2: string;
  step3: string;

  // Editor Section
  editorTitle: string;
  sectionImage: string;
  canvasOrientation: string;
  landscape: string;
  portrait: string;
  orientationHelper: (sizeLabel: string) => string;
  chooseImage: string;
  changeImage: string;
  readingImage: string;
  formatHelper: string;
  zoom: string;
  rotate90: string;
  resetCrop: string;

  // Text & Strip
  sectionText: string;
  stripToggle: string;
  stripEnabledHint: string;
  stripDisabledHint: string;
  fontLabel: string;
  fontGroupBuiltin: string;
  fontGroupCustom: string;
  fontFreeOfl: string;
  fontLocalCache: string;
  fontLicenseLink: string;
  fontStatusLoading: (name: string) => string;
  fontStatusError: string;
  fontStatusReady: (name: string) => string;
  reloadFont: string;
  uploadFont: string;
  savingFont: string;
  customFontHelper: string;
  loadingCatalog: string;
  catalogError: string;
  retry: string;
  maxFontsHelper: (max: number) => string;
  customFontListAria: string;
  deleteFontAria: (name: string) => string;
  leftText: string;
  leftPlaceholder: string;
  rightText: string;
  rightPlaceholder: string;
  copyLayoutHelper: string;
  textOverlap: string;
  stripOpacity: string;
  opacityClear: string;
  opacitySolid: string;

  // Export Section
  sectionExport: string;
  exportPpi: string;
  ppi150: string;
  ppi300: string;
  ppi600: string;
  ppiCustom: string;
  customPpiAria: string;
  ppiHelperStandard: string;
  ppiHelperHigh: string;
  ppiHelperDraft: string;
  ppiMaxHelper: (maxPpi: number) => string;
  customPpiErrorEmpty: string;
  customPpiErrorInteger: string;
  customPpiErrorRange: string;
  ppiWarnExceedMax: (exportPpi: number, maxPpi: number) => string;
  ppiWarnExceedCrop: (exportPpi: number, ppi: number, maxPpi: number) => string;
  downloadPng: string;
  generating: string;
  downloadPdf: string;
  hintNoSource: string;
  hintFontLoading: string;
  hintFontError: string;
  hintPrintSize: (sizeLabel: string) => string;

  // Feedback & Messages
  decodingImage: string;
  exportSuccess: (format: string) => string;
  errSingleImage: string;
  errDecodeFail: string;
  errExportFail: string;
  errSingleFont: string;
  noticeFontSaved: (label: string) => string;
  noticeFontCachedNoSelect: string;
  errFontUpload: string;
  noticeFontDeleted: string;
  noticeFontDeletedNoDefault: string;
  errFontDelete: string;
  errFontSaveSelect: string;

  // Dialogs
  confirmLowPpiTitle: string;
  confirmLowPpiDesc: (ppi: number, maxPpiNote: string, exportPpi: number) => string;
  confirmLowPpiMaxPart: (maxPpi: number) => string;
  dialogBack: string;
  dialogProceed: (format: string) => string;
  dialogNoticeTitle: string;
  dialogOk: string;

  // Footer
  footerQuote: string;
  footerPrivacy: string;

  // Fonts localization
  fonts: Record<string, FontMeta>;
}

export const translations: Record<Language, Translations> = {
  zh: {
    appName: "片刻",
    appCaption: "明信片生成器",
    localOnly: "仅在本地处理",
    themeToggle: "切换主题",
    themeLight: "浅色",
    themeDark: "深色",
    themeSystem: "跟随系统",
    languageSelect: "选择语言",

    eyebrow: "A LITTLE MOMENT, A PERSONAL POSTCARD",
    heroTitle: "把片刻，寄给远方",
    heroPeriod: "。",
    heroDesc: "一张照片，一句想说的话。留下属于你的风景。",
    postcardTagNumber: "POSTCARD / 01",
    landscapeTag: "横向 · 标准明信片",
    portraitTag: "竖向 · 标准明信片",

    previewAria: "明信片预览",
    livePreview: "实时预览",
    frontPreview: "正面预览",
    dragHint: "拖动图片调整构图 · 支持方向键微调",
    dragHintEmpty: "选择图片后，即可拖动调整构图",
    canvasAria: "明信片构图，使用方向键或拖动移动图片",
    emptyTitle: "这里，留给你的风景",
    emptySubtitle: "拖入一张图片，或点击选择",
    emptyFormat: "JPG / PNG / 静态 WebP",

    qualityTitlePpi: (ppi) => `有效分辨率 ${Math.floor(ppi)} PPI`,
    qualityTitleEmpty: "让每一份心意，都清晰一点",
    qualityGood: "清晰度达到 300 PPI 推荐值，可放心导出。",
    qualityLow: "低于推荐的 300 PPI，仍可导出；建议使用更大图片或减小缩放。",
    qualityEmpty: "选择图片后自动检查清晰度，推荐 300 PPI 及以上。",
    imageMaxPpi: (maxPpi) => `图片实际最大：${maxPpi} PPI`,
    rawPixels: (w, h) => `原始像素（方向归一化）：${w} × ${h}`,
    limitedPixelsNote: (bw, bh) => ` · 浏览器实际解码 ${bw} × ${bh}，PPI 按实际源计算`,
    badgeGood: "适合印刷",
    badgeWarn: "清晰度提醒",
    badgeTip: "印刷提示",

    step1: "01 选择风景",
    step2: "02 写下心意",
    step3: "03 保存片刻",

    editorTitle: "制作你的明信片",
    sectionImage: "图片与构图",
    canvasOrientation: "画布方向",
    landscape: "横向",
    portrait: "竖向",
    orientationHelper: (sizeLabel) => `${sizeLabel} mm · 切换方向会恢复图片构图`,
    chooseImage: "选择本地图片",
    changeImage: "更换图片",
    readingImage: "正在读取图片…",
    formatHelper: "JPG、PNG、静态 WebP、JXL · 最大 128 MiB / 108 MP",
    zoom: "图片缩放",
    rotate90: "旋转 90°",
    resetCrop: "恢复构图",

    sectionText: "文字与白条",
    stripToggle: "添加文字与白条",
    stripEnabledHint: "已开启，可继续设置下方内容",
    stripDisabledHint: "已关闭，导出时不会绘制文字与白条",
    fontLabel: "明信片字体",
    fontGroupBuiltin: "内置字体",
    fontGroupCustom: "我的字体",
    fontFreeOfl: "免费开源 · 左右文字共用 ",
    fontLocalCache: "本地缓存 · 左右文字共用",
    fontLicenseLink: "字体许可 ↗",
    fontStatusLoading: (name) => `正在加载 ${name}…`,
    fontStatusError: "字体加载失败，预览保留上一版；请重试或选择其他字体。",
    fontStatusReady: (name) => `已应用：${name}`,
    reloadFont: "重新加载字体",
    uploadFont: "上传本地字体",
    savingFont: "正在保存字体…",
    customFontHelper: "TTF / OTF / WOFF / WOFF2 · 每款最大 20 MiB · 保存于此浏览器",
    loadingCatalog: "正在读取本地字体缓存…",
    catalogError: "无法读取本地字体缓存。",
    retry: "重试",
    maxFontsHelper: (max) => `最多保留 ${max} 款，请先删除旧字体。`,
    customFontListAria: "已保存的本地字体",
    deleteFontAria: (name) => `删除字体 ${name}`,
    leftText: "左侧文字",
    leftPlaceholder: "写下地点、日期或一句话",
    rightText: "右侧文字",
    rightPlaceholder: "署名或补充信息",
    copyLayoutHelper: "32px 字号 · 左右对齐 · 单行排版",
    textOverlap: "左右文字重叠，请缩短文案。",
    stripOpacity: "白条不透明度",
    opacityClear: "通透",
    opacitySolid: "纯白",

    sectionExport: "保存明信片",
    exportPpi: "导出清晰度",
    ppi150: "150 PPI（屏幕分享 / 草稿）",
    ppi300: "300 PPI（标准印刷推荐）",
    ppi600: "600 PPI（超高清精细印刷）",
    ppiCustom: "自定义数值…",
    customPpiAria: "自定义导出清晰度",
    ppiHelperStandard: "标准印刷推荐（300 PPI）",
    ppiHelperHigh: "超高清精细印刷",
    ppiHelperDraft: "草稿或屏幕分享",
    ppiMaxHelper: (maxPpi) => `图片实际最大清晰度：${maxPpi} PPI`,
    customPpiErrorEmpty: "请输入导出 PPI（72 至 1200）",
    customPpiErrorInteger: "PPI 必须为整数",
    customPpiErrorRange: "PPI 需在 72 至 1200 之间",
    ppiWarnExceedMax: (exportPpi, maxPpi) =>
      `提示：目标导出清晰度（${exportPpi} PPI）高于图片实际最大清晰度（${maxPpi} PPI），导出不会增加原图细节。`,
    ppiWarnExceedCrop: (exportPpi, ppi, maxPpi) =>
      `提示：目标导出清晰度（${exportPpi} PPI）高于当前构图有效清晰度（${Math.floor(ppi)} PPI，实际最大 ${maxPpi} PPI），导出不会增加原图细节。`,
    downloadPng: "下载 PNG",
    generating: "正在生成文件…",
    downloadPdf: "下载打印 PDF",
    hintNoSource: "请先选择图片，再下载明信片",
    hintFontLoading: "正在加载所选字体…",
    hintFontError: "字体加载失败，请重试",
    hintPrintSize: (sizeLabel) => `${sizeLabel} mm · 打印时选择「实际大小 / 100%」`,

    decodingImage: "正在解码图片，请稍候…",
    exportSuccess: (format) => `${format} 已生成，下载已开始。`,
    errSingleImage: "请一次只选择一张图片。",
    errDecodeFail: "图片读取失败，请重试。",
    errExportFail: "导出失败，请重试。",
    errSingleFont: "一次只选择一个字体文件。",
    noticeFontSaved: (label) => `“${label}”已保存在此浏览器。`,
    noticeFontCachedNoSelect: "字体已缓存，但无法保存当前选择。",
    errFontUpload: "字体上传失败，请重试。",
    noticeFontDeleted: "字体已从此浏览器删除。",
    noticeFontDeletedNoDefault: "字体已删除，但无法保存默认选择。",
    errFontDelete: "删除失败，请检查浏览器存储状态后重试。",
    errFontSaveSelect: "当前字体已应用，但无法保存选择。",

    confirmLowPpiTitle: "这张图片的清晰度偏低",
    confirmLowPpiDesc: (ppi, maxPpiNote, exportPpi) =>
      `当前有效分辨率为 ${Math.floor(ppi)} PPI${maxPpiNote}，低于目标导出的 ${exportPpi} PPI。印刷时可能模糊，导出不会增加原图细节。`,
    confirmLowPpiMaxPart: (maxPpi) => `（图片实际最大 ${maxPpi} PPI）`,
    dialogBack: "返回调整",
    dialogProceed: (format) => `仍然下载 ${format}`,
    dialogNoticeTitle: "提示",
    dialogOk: "确定",

    footerQuote: "片刻 · 把喜欢的瞬间，好好收藏。",
    footerPrivacy: "图片、文字与本地字体仅在浏览器处理，不会上传",

    fonts: {
      irohamaru: {
        label: "irohamaru（日语圆体）",
        description: "日语字形优化 · 柔和圆润，适合日文短句",
      },
      "noto-sans": {
        label: "Noto 黑体（简体中文）",
        description: "简洁清晰 · 适合日常文字",
      },
      "noto-serif": {
        label: "Noto 宋体（简体中文）",
        description: "端正规整 · 适合书信与诗句",
      },
      "ma-shan-zheng": {
        label: "马善政楷书",
        description: "毛笔手写 · 适合中文题字",
      },
      lato: {
        label: "Lato（英文无衬线）",
        description: "简洁现代 · 适合英文短句；中日文使用内置圆体",
      },
      lora: {
        label: "Lora（英文衬线）",
        description: "典雅书卷 · 适合英文诗句；中日文使用内置圆体",
      },
      caveat: {
        label: "Caveat（英文手写）",
        description: "自然随性 · 适合英文寄语；中日文使用内置圆体",
      },
    },
  },

  en: {
    appName: "Moment",
    appCaption: "Postcard Generator",
    localOnly: "Processed Locally",
    themeToggle: "Toggle Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    languageSelect: "Language",

    eyebrow: "A LITTLE MOMENT, A PERSONAL POSTCARD",
    heroTitle: "Send a moment far away",
    heroPeriod: ".",
    heroDesc: "A photograph, a heartfelt thought. Preserve your own scenery.",
    postcardTagNumber: "POSTCARD / 01",
    landscapeTag: "Landscape · Standard Postcard",
    portraitTag: "Portrait · Standard Postcard",

    previewAria: "Postcard Preview",
    livePreview: "Live Preview",
    frontPreview: "Front Preview",
    dragHint: "Drag to adjust composition · Arrow keys to fine-tune",
    dragHintEmpty: "Select an image to adjust composition",
    canvasAria: "Postcard composition, use arrow keys or drag to move image",
    emptyTitle: "Leave this space for your scenery",
    emptySubtitle: "Drop an image here, or click to browse",
    emptyFormat: "JPG / PNG / Static WebP",

    qualityTitlePpi: (ppi) => `Effective Resolution ${Math.floor(ppi)} PPI`,
    qualityTitleEmpty: "Make every thought a little clearer",
    qualityGood: "Meets recommended 300 PPI. Ready for print.",
    qualityLow: "Below recommended 300 PPI. You can still export; higher resolution image recommended.",
    qualityEmpty: "Automatically checks clarity once an image is chosen. 300+ PPI recommended.",
    imageMaxPpi: (maxPpi) => `Image actual max: ${maxPpi} PPI`,
    rawPixels: (w, h) => `Raw pixels (normalized): ${w} × ${h}`,
    limitedPixelsNote: (bw, bh) => ` · Decoded at ${bw} × ${bh}, PPI calculated from source`,
    badgeGood: "Print Ready",
    badgeWarn: "Resolution Notice",
    badgeTip: "Print Tip",

    step1: "01 Choose Scenery",
    step2: "02 Write Words",
    step3: "03 Save Moment",

    editorTitle: "Customize Your Postcard",
    sectionImage: "Image & Composition",
    canvasOrientation: "Orientation",
    landscape: "Landscape",
    portrait: "Portrait",
    orientationHelper: (sizeLabel) => `${sizeLabel} mm · Changing orientation resets crop`,
    chooseImage: "Choose Local Image",
    changeImage: "Change Image",
    readingImage: "Reading image…",
    formatHelper: "JPG, PNG, static WebP, JXL · Max 128 MiB / 108 MP",
    zoom: "Image Zoom",
    rotate90: "Rotate 90°",
    resetCrop: "Reset Crop",

    sectionText: "Text & Strip",
    stripToggle: "Add Text & White Strip",
    stripEnabledHint: "Enabled. Customize settings below",
    stripDisabledHint: "Disabled. Text and strip will not be drawn on export",
    fontLabel: "Postcard Font",
    fontGroupBuiltin: "Built-in Fonts",
    fontGroupCustom: "Custom Fonts",
    fontFreeOfl: "Free & Open Source · Shared across text ",
    fontLocalCache: "Locally cached · Shared across text",
    fontLicenseLink: "License ↗",
    fontStatusLoading: (name) => `Loading ${name}…`,
    fontStatusError: "Failed to load font. Previous preview kept; retry or choose another font.",
    fontStatusReady: (name) => `Applied: ${name}`,
    reloadFont: "Reload Font",
    uploadFont: "Upload Local Font",
    savingFont: "Saving font…",
    customFontHelper: "TTF / OTF / WOFF / WOFF2 · Max 20 MiB each · Saved in browser",
    loadingCatalog: "Reading local font cache…",
    catalogError: "Failed to read local font cache.",
    retry: "Retry",
    maxFontsHelper: (max) => `Up to ${max} fonts allowed. Please delete older fonts first.`,
    customFontListAria: "Saved custom fonts",
    deleteFontAria: (name) => `Delete font ${name}`,
    leftText: "Left Text",
    leftPlaceholder: "Location, date, or a brief note",
    rightText: "Right Text",
    rightPlaceholder: "Signature or extra details",
    copyLayoutHelper: "32px font size · Left & right aligned · Single line",
    textOverlap: "Text overlaps. Please shorten the copy.",
    stripOpacity: "Strip Opacity",
    opacityClear: "Clear",
    opacitySolid: "Solid White",

    sectionExport: "Save Postcard",
    exportPpi: "Export Resolution",
    ppi150: "150 PPI (Screen / Draft)",
    ppi300: "300 PPI (Recommended for Print)",
    ppi600: "600 PPI (Ultra High Quality)",
    ppiCustom: "Custom value…",
    customPpiAria: "Custom export resolution",
    ppiHelperStandard: "Standard print recommendation (300 PPI)",
    ppiHelperHigh: "Ultra high quality print",
    ppiHelperDraft: "Draft or screen sharing",
    ppiMaxHelper: (maxPpi) => `Image actual max resolution: ${maxPpi} PPI`,
    customPpiErrorEmpty: "Please enter export PPI (72 to 1200)",
    customPpiErrorInteger: "PPI must be an integer",
    customPpiErrorRange: "PPI must be between 72 and 1200",
    ppiWarnExceedMax: (exportPpi, maxPpi) =>
      `Note: Target export resolution (${exportPpi} PPI) exceeds image max resolution (${maxPpi} PPI). Exporting will not add more details.`,
    ppiWarnExceedCrop: (exportPpi, ppi, maxPpi) =>
      `Note: Target resolution (${exportPpi} PPI) exceeds current effective resolution (${Math.floor(ppi)} PPI, actual max ${maxPpi} PPI). Exporting will not add more details.`,
    downloadPng: "Download PNG",
    generating: "Generating file…",
    downloadPdf: "Download Print PDF",
    hintNoSource: "Please choose an image before downloading",
    hintFontLoading: "Loading selected font…",
    hintFontError: "Failed to load font, please retry",
    hintPrintSize: (sizeLabel) => `${sizeLabel} mm · Select 'Actual Size / 100%' when printing`,

    decodingImage: "Decoding image, please wait…",
    exportSuccess: (format) => `${format} generated, download started.`,
    errSingleImage: "Please select only one image at a time.",
    errDecodeFail: "Failed to read image, please retry.",
    errExportFail: "Export failed, please retry.",
    errSingleFont: "Please select only one font file at a time.",
    noticeFontSaved: (label) => `“${label}” saved in this browser.`,
    noticeFontCachedNoSelect: "Font cached, but could not save selection.",
    errFontUpload: "Failed to upload font, please retry.",
    noticeFontDeleted: "Font deleted from this browser.",
    noticeFontDeletedNoDefault: "Font deleted, but could not save default selection.",
    errFontDelete: "Failed to delete font, please check browser storage and retry.",
    errFontSaveSelect: "Font applied, but could not save selection.",

    confirmLowPpiTitle: "Image Resolution is Low",
    confirmLowPpiDesc: (ppi, maxPpiNote, exportPpi) =>
      `Current effective resolution is ${Math.floor(ppi)} PPI${maxPpiNote}, below target export of ${exportPpi} PPI. May appear blurry in print; exporting will not add detail.`,
    confirmLowPpiMaxPart: (maxPpi) => ` (image actual max: ${maxPpi} PPI)`,
    dialogBack: "Go Back & Adjust",
    dialogProceed: (format) => `Download ${format} Anyway`,
    dialogNoticeTitle: "Notice",
    dialogOk: "OK",

    footerQuote: "Moment · Cherish your favorite moments.",
    footerPrivacy: "Images, text, and local fonts are processed locally in your browser and never uploaded",

    fonts: {
      irohamaru: {
        label: "Irohamaru (Rounded)",
        description: "Optimized for Japanese · Soft and rounded, great for short phrases",
      },
      "noto-sans": {
        label: "Noto Sans (SC)",
        description: "Clean and crisp · Ideal for everyday text",
      },
      "noto-serif": {
        label: "Noto Serif (SC)",
        description: "Formal and elegant · Great for letters and poetry",
      },
      "ma-shan-zheng": {
        label: "Ma Shan Zheng (Calligraphy)",
        description: "Traditional brush script · Suitable for Chinese inscriptions",
      },
      lato: {
        label: "Lato (Sans-serif)",
        description: "Clean and modern · Great for English phrases; CJK uses fallback",
      },
      lora: {
        label: "Lora (Serif)",
        description: "Bookish and graceful · Great for English poetry; CJK uses fallback",
      },
      caveat: {
        label: "Caveat (Handwriting)",
        description: "Casual and expressive · Great for English greetings; CJK uses fallback",
      },
    },
  },

  ja: {
    appName: "片刻",
    appCaption: "ポストカードジェネレーター",
    localOnly: "ローカル処理のみ",
    themeToggle: "テーマ切り替え",
    themeLight: "ライト",
    themeDark: "ダーク",
    themeSystem: "システム連動",
    languageSelect: "言語選択",

    eyebrow: "A LITTLE MOMENT, A PERSONAL POSTCARD",
    heroTitle: "この片刻を、遠くへ届ける",
    heroPeriod: "。",
    heroDesc: "一枚の写真、伝えたい想い。あなただけの風景を残す。",
    postcardTagNumber: "POSTCARD / 01",
    landscapeTag: "横向き · 標準ポストカード",
    portraitTag: "縦向き · 標準ポストカード",

    previewAria: "ポストカードプレビュー",
    livePreview: "リアルタイムプレビュー",
    frontPreview: "表面プレビュー",
    dragHint: "ドラッグで構図を調整 · 矢印キーで微調整可能",
    dragHintEmpty: "画像を選択すると、構図の調整が可能になります",
    canvasAria: "ポストカードの構図、ドラッグまたは矢印キーで移動",
    emptyTitle: "ここに、あなたの景色を",
    emptySubtitle: "画像をドロップ、またはクリックして選択",
    emptyFormat: "JPG / PNG / 静止画 WebP",

    qualityTitlePpi: (ppi) => `有効解像度 ${Math.floor(ppi)} PPI`,
    qualityTitleEmpty: "すべての想いを、より鮮明に",
    qualityGood: "推奨値の 300 PPI に達しており、綺麗に印刷できます。",
    qualityLow: "推奨の 300 PPI を下回っていますが書き出し可能です。高解像度画像の利用をお勧めします。",
    qualityEmpty: "画像選択後に解像度を自動確認します（300 PPI 以上推奨）。",
    imageMaxPpi: (maxPpi) => `画像の実際の最大：${maxPpi} PPI`,
    rawPixels: (w, h) => `元のピクセル（向き正規化済）：${w} × ${h}`,
    limitedPixelsNote: (bw, bh) => ` · ブラウザによる実際のデコード：${bw} × ${bh}、PPIは実ソースから計算`,
    badgeGood: "印刷に最適",
    badgeWarn: "解像度注意",
    badgeTip: "印刷のヒント",

    step1: "01 景色を選ぶ",
    step2: "02 想いを綴る",
    step3: "03 片刻を残す",

    editorTitle: "ポストカードを作る",
    sectionImage: "画像と構図",
    canvasOrientation: "キャンバスの向き",
    landscape: "横向き",
    portrait: "縦向き",
    orientationHelper: (sizeLabel) => `${sizeLabel} mm · 向きを変更すると構図がリセットされます`,
    chooseImage: "画像を選択",
    changeImage: "画像を変更",
    readingImage: "画像を読み込み中…",
    formatHelper: "JPG、PNG、静止画WebP、JXL · 最大 128 MiB / 108 MP",
    zoom: "画像の拡大縮小",
    rotate90: "90°回転",
    resetCrop: "構図をリセット",

    sectionText: "テキストと白帯",
    stripToggle: "テキストと白帯を追加",
    stripEnabledHint: "有効。下記の設定を調整できます",
    stripDisabledHint: "無効。書き出し時にテキストと白帯は描画されません",
    fontLabel: "フォント",
    fontGroupBuiltin: "内蔵フォント",
    fontGroupCustom: "カスタムフォント",
    fontFreeOfl: "無料・オープンソース · 左右共通 ",
    fontLocalCache: "ローカル保存 · 左右共通",
    fontLicenseLink: "ライセンス ↗",
    fontStatusLoading: (name) => `${name} を読み込み中…`,
    fontStatusError: "フォントの読み込みに失敗しました。再試行するか別のフォントを選択してください。",
    fontStatusReady: (name) => `適用中：${name}`,
    reloadFont: "フォントを再読み込み",
    uploadFont: "フォントをアップロード",
    savingFont: "フォントを保存中…",
    customFontHelper: "TTF / OTF / WOFF / WOFF2 · 各最大 20 MiB · ブラウザ内に保存",
    loadingCatalog: "ローカルフォントを読み込み中…",
    catalogError: "ローカルフォントを読み込めませんでした。",
    retry: "再試行",
    maxFontsHelper: (max) => `最大 ${max} 個まで。古いフォントを削除してください。`,
    customFontListAria: "保存済みカスタムフォント",
    deleteFontAria: (name) => `フォント「${name}」を削除`,
    leftText: "左側のテキスト",
    leftPlaceholder: "場所、日付、またはメッセージ",
    rightText: "右側のテキスト",
    rightPlaceholder: "署名や追記事項",
    copyLayoutHelper: "32px フォントサイズ · 左右揃え · 1行配置",
    textOverlap: "左右のテキストが重なっています。文字数を減らしてください。",
    stripOpacity: "白帯の不透明度",
    opacityClear: "透明",
    opacitySolid: "純白",

    sectionExport: "ポストカードを保存",
    exportPpi: "書き出し解像度",
    ppi150: "150 PPI（画面共有 / 下書き）",
    ppi300: "300 PPI（標準印刷推奨）",
    ppi600: "600 PPI（超高精細印刷）",
    ppiCustom: "カスタム数値…",
    customPpiAria: "カスタム解像度",
    ppiHelperStandard: "標準印刷推奨（300 PPI）",
    ppiHelperHigh: "超高精細印刷",
    ppiHelperDraft: "下書きまたは画面共有",
    ppiMaxHelper: (maxPpi) => `画像の実際の最大解像度：${maxPpi} PPI`,
    customPpiErrorEmpty: "書き出しPPIを入力してください（72〜1200）",
    customPpiErrorInteger: "PPIは整数である必要があります",
    customPpiErrorRange: "PPIは72から1200の間である必要があります",
    ppiWarnExceedMax: (exportPpi, maxPpi) =>
      `注意：書き出し解像度（${exportPpi} PPI）が画像の最大解像度（${maxPpi} PPI）を超えています。細部は向上しません。`,
    ppiWarnExceedCrop: (exportPpi, ppi, maxPpi) =>
      `注意：書き出し解像度（${exportPpi} PPI）が現在の構図の有効解像度（${Math.floor(ppi)} PPI、最大 ${maxPpi} PPI）を超えています。`,
    downloadPng: "PNGをダウンロード",
    generating: "ファイルを生成中…",
    downloadPdf: "印刷用PDFをダウンロード",
    hintNoSource: "画像を先に選択してください",
    hintFontLoading: "フォントを読み込み中…",
    hintFontError: "フォントの読み込みに失敗しました",
    hintPrintSize: (sizeLabel) => `${sizeLabel} mm · 印刷時は「実際のサイズ / 100%」を選択`,

    decodingImage: "画像をデコード中、お待ちください…",
    exportSuccess: (format) => `${format} が生成され、ダウンロードが開始されました。`,
    errSingleImage: "一度に1枚の画像のみ選択してください。",
    errDecodeFail: "画像の読み込みに失敗しました。再試行してください。",
    errExportFail: "書き出しに失敗しました。再試行してください。",
    errSingleFont: "フォントファイルは1つずつ選択してください。",
    noticeFontSaved: (label) => `「${label}」がブラウザに保存されました。`,
    noticeFontCachedNoSelect: "フォントはキャッシュされましたが、選択を保存できませんでした。",
    errFontUpload: "フォントのアップロードに失敗しました。",
    noticeFontDeleted: "フォントが削除されました。",
    noticeFontDeletedNoDefault: "フォントは削除されましたが、デフォルト選択を保存できませんでした。",
    errFontDelete: "削除に失敗しました。ブラウザのストレージ状態を確認してください。",
    errFontSaveSelect: "フォントは適用されましたが、選択を保存できませんでした。",

    confirmLowPpiTitle: "画像の解像度がやや低めです",
    confirmLowPpiDesc: (ppi, maxPpiNote, exportPpi) =>
      `現在の有効解像度は ${Math.floor(ppi)} PPI${maxPpiNote} で、書き出し目標の ${exportPpi} PPI を下回っています。印刷時にぼやける可能性があります。`,
    confirmLowPpiMaxPart: (maxPpi) => `（画像の実際最大 ${maxPpi} PPI）`,
    dialogBack: "戻って調整",
    dialogProceed: (format) => `${format} をそのままダウンロード`,
    dialogNoticeTitle: "お知らせ",
    dialogOk: "OK",

    footerQuote: "片刻 · お気に入りの瞬間を、大切に。",
    footerPrivacy: "画像、テキスト、フォントはブラウザ内のみで処理され、サーバーに送信されません",

    fonts: {
      irohamaru: {
        label: "いろはマル（丸ゴシック）",
        description: "日本語グリフ最適化 · やわらかく親しみやすい丸ゴシック",
      },
      "noto-sans": {
        label: "Noto Sans（ゴシック体）",
        description: "すっきりと明瞭 · 日常の言葉に最適",
      },
      "noto-serif": {
        label: "Noto Serif（明朝体）",
        description: "格調高く端正 · 手紙や詩情ある言葉に最適",
      },
      "ma-shan-zheng": {
        label: "馬善政楷書（毛筆体）",
        description: "手書きの筆文字 · タイトルや題字に最適",
      },
      lato: {
        label: "Lato（欧文サンセリフ）",
        description: "現代的で洗練された印象 · 欧文短文に；日本語は丸ゴシックを使用",
      },
      lora: {
        label: "Lora（欧文セリフ）",
        description: "優美なブックフォント · 欧文の詩や引用に；日本語は丸ゴシックを使用",
      },
      caveat: {
        label: "Caveat（欧文手書き）",
        description: "自然で軽やかな手書き風 · 欧文メッセージに；日本語は丸ゴシックを使用",
      },
    },
  },
};

export const LANG_STORAGE_KEY = "postcard_language";

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "zh";
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "zh" || saved === "en" || saved === "ja") return saved;
  } catch {
    // fallback
  }
  // Default to zh to preserve existing behavior and Playwright test assertions
  return "zh";
}

export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}
