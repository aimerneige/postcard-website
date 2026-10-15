import { getLayout, TEXT_MARGIN, type Layout } from "./layout";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Trash2,
  Leaf,
  LockKeyhole,
  Maximize,
  Move,
  RotateCw,
  RotateCcw,
  SlidersHorizontal,
  Type,
  Image as ImageIcon,
  Info,
  Languages,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { decodeFile, type Source } from "./image";
import {
  clampCrop,
  geometry,
  initialCrop,
  render,
  renderBack,
  textsOverlap,
  getTextLayout,
  initialBackDesign,
  type Crop,
  type BackDesign,
  type TextStyles,
  type TextKey,
} from "./render";
import { makeExport, download, type ExportScope } from "./export";

import {
  DEFAULT_FONT,
  fonts,
  fontStack,
  getFont,
  loadFont,
  registerCustomFonts,
  uploadCustomFont,
  deleteCustomFont,
  type FontId,
} from "./fonts";
import {
  readCustomFonts,
  saveFontSelection,
  MAX_CUSTOM_FONTS,
  type CustomFont,
  type CustomFontId,
} from "./custom-fonts";
import {
  getInitialLanguage,
  saveLanguage,
  translations,
  type Language,
} from "./i18n";
import {
  getInitialTheme,
  saveTheme,
  resolveTheme,
  applyTheme,
  type ThemeMode,
  type ResolvedTheme,
} from "./theme";

export default function App() {
  const [lang, setLang] = useState<Language>(getInitialLanguage);
  const t = translations[lang];

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getInitialTheme()),
  );

  useEffect(() => {
    const resolved = resolveTheme(themeMode);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    if (
      themeMode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia
    ) {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const updated = resolveTheme("system");
        setResolvedTheme(updated);
        applyTheme(updated);
      };
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
      if (lang === "zh") {
        document.title = "片刻 · 明信片生成器";
      } else if (lang === "en") {
        document.title = "Moment · Postcard Generator";
      } else if (lang === "ja") {
        document.title = "片刻 · ポストカードジェネレーター";
      }
    }
  }, [lang]);

  function changeLanguage(nextLang: Language) {
    setLang(nextLang);
    saveLanguage(nextLang);
  }

  function changeTheme(mode: ThemeMode) {
    setThemeMode(mode);
    saveTheme(mode);
  }

  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangOpen(false);
      }
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setThemeOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLangOpen(false);
        setThemeOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const languageOptions: { value: Language; label: string }[] = [
    { value: "zh", label: "中文" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
  ];
  const currentLangLabel =
    languageOptions.find((opt) => opt.value === lang)?.label ?? "中文";

  const themeOptions: {
    value: ThemeMode;
    label: string;
    icon: typeof Sun;
  }[] = [
    { value: "system", label: t.themeSystem, icon: Monitor },
    { value: "light", label: t.themeLight, icon: Sun },
    { value: "dark", label: t.themeDark, icon: Moon },
  ];
  const currentThemeLabel =
    themeOptions.find((opt) => opt.value === themeMode)?.label ?? t.themeSystem;

  const [layout, setLayout] = useState<Layout>("landscape");
  const [exportPpi, setExportPpi] = useState(300);
  const [customPpiActive, setCustomPpiActive] = useState(false);
  const [customPpiText, setCustomPpiText] = useState("300");
  const dimensions = getLayout(layout, exportPpi);
  const { width: W, height: H } = dimensions;
  const sizeLabel = `${dimensions.widthMm} × ${dimensions.heightMm}`;
  const [source, setSource] = useState<Source | null>(null),
    [crop, setCrop] = useState<Crop>(initialCrop);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [backDesign, setBackDesign] = useState<
    Omit<BackDesign, "fontId" | "layout" | "imageSource">
  >(initialBackDesign);
  const applyBackPreset = (
    presetKey: "international" | "china" | "minimalist" | "vintage",
  ) => {
    if (presetKey === "international") {
      setBackDesign((prev) => ({
        ...prev,
        topText: "POST CARD",
        topSubText: "CARTE POSTALE",
        postalCodeEnabled: false,
        stampEnabled: true,
        stampText: "AIR MAIL",
        dividerEnabled: true,
        dividerStyle: "solid",
        addressEnabled: true,
        addressLinesCount: 3,
        addressLineSpacing: 75,
        addressLineStyle: "solid",
        addressPrefix: "To.",
        paperColor: "ivory",
      }));
    } else if (presetKey === "china") {
      setFontId("noto-serif");
      setBackDesign((prev) => ({
        ...prev,
        topText: "",
        topSubText: "",
        postalCodeEnabled: true,
        stampEnabled: true,
        stampText: "邮票",
        dividerEnabled: true,
        dividerStyle: "solid",
        addressEnabled: true,
        addressLinesCount: 4,
        addressLineSpacing: 85,
        addressLineStyle: "solid",
        addressPrefix: "收件人：",
        paperColor: "white",
      }));
    } else if (presetKey === "minimalist") {
      setBackDesign((prev) => ({
        ...prev,
        topText: "POST CARD",
        topSubText: "",
        postalCodeEnabled: false,
        stampEnabled: true,
        stampText: "STAMP",
        dividerEnabled: true,
        dividerStyle: "solid",
        addressEnabled: true,
        addressLinesCount: 0,
        addressPrefix: "",
        paperColor: "ivory",
      }));
    } else if (presetKey === "vintage") {
      setBackDesign((prev) => ({
        ...prev,
        topText: "POST CARD",
        topSubText: "UNIVERSAL POSTAL UNION",
        postalCodeEnabled: false,
        stampEnabled: true,
        stampText: "POSTAGE",
        dividerEnabled: true,
        dividerStyle: "dashed",
        addressEnabled: true,
        addressLinesCount: 4,
        addressLineSpacing: 75,
        addressLineStyle: "dashed",
        addressPrefix: "To.",
        paperColor: "vintage",
      }));
    }
  };
  const [backImageSource, setBackImageSource] = useState<Source | null>(null);
  const [exportScope, setExportScope] = useState<ExportScope>("current");
  const [left, setLeft] = useState(""),
    [right, setRight] = useState(""),
    [stripEnabled, setStripEnabled] = useState(true),
    [opacity, setOpacity] = useState(0.3);
  const [fontId, setFontId] = useState<FontId>(DEFAULT_FONT);
  const [textTemplate, setTextTemplate] = useState<"single" | "double">("single");
  const [leftSecond, setLeftSecond] = useState("");
  const [rightSecond, setRightSecond] = useState("");
  const [textStyles, setTextStyles] = useState<TextStyles>({
    left: { fontId: null, fontSize: 32 },
    right: { fontId: null, fontSize: 32 },
    leftSecond: { fontId: null, fontSize: 24 },
    rightSecond: { fontId: null, fontSize: 24 },
  });
  const textDesign = {
    left, right, leftSecond, rightSecond, textTemplate, textStyles, fontId,
  };
  const textLayout = getTextLayout(textDesign);
  const fontIds = [...new Set([
    fontId,
    ...textLayout.rows.flatMap(({ texts }) => texts.map((text) => text.fontId)),
  ])];
  const fontKey = fontIds.join(",");
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [fontUploadError, setFontUploadError] = useState("");
  const [fontResult, setFontResult] = useState<{
    id: string;
    status: "loading" | "ready" | "error";
  }>({ id: DEFAULT_FONT, status: "loading" });
  const [fontRetry, setFontRetry] = useState(0);
  const font = fontResult.id === fontKey ? fontResult.status : "loading";
  const selectedFont = getFont(fontId);
  const selectedFontMeta = t.fonts[fontId] || selectedFont;
  const [loading, setLoading] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dragOver, setDragOver] = useState(false),
    [confirm, setConfirm] = useState<"png" | "pdf" | null>(null);
  const fontInput = useRef<HTMLInputElement>(null),
    input = useRef<HTMLInputElement>(null),
    backImageInput = useRef<HTMLInputElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    frame = useRef<HTMLDivElement>(null),
    current = useRef<Source | null>(null),
    seq = useRef(0),
    dialog = useRef<HTMLDialogElement>(null),
    errorDialog = useRef<HTMLDialogElement>(null);

  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    crop: Crop;
  } | null>(null);
  const [size, setSize] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setCatalogStatus("loading");
    void readCustomFonts().then(
      ({ fonts: stored, selected }) => {
        registerCustomFonts(stored);
        if (cancelled) return;
        setCustomFonts(stored);
        setCatalogStatus("ready");
        if (
          selected &&
          (fonts.some((item) => item.id === selected) ||
            stored.some((item) => item.id === selected))
        )
          setFontId(selected as FontId);
      },
      () => {
        if (!cancelled) setCatalogStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [catalogRetry]);
  useEffect(() => {
    let cancelled = false;
    setFontResult({ id: fontKey, status: "loading" });
    void Promise.all(fontIds.map(loadFont)).then(
      () => {
        if (!cancelled) setFontResult({ id: fontKey, status: "ready" });
      },
      () => {
        if (!cancelled) setFontResult({ id: fontKey, status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fontKey, fontRetry]);
  useEffect(() => {
    return () => {
      seq.current++;
      current.current?.bitmap.close();
      backImageSource?.bitmap.close();
    };
  }, [backImageSource]);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      setSize(frame.current?.clientWidth || 0),
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (font !== "ready" || !canvas.current) return;
    if (activeSide === "front" && !source) return;
    const id = requestAnimationFrame(() => {
      const c = canvas.current;
      if (!c) return;
      c.width = Math.max(
        1,
        Math.round(size * Math.min(devicePixelRatio || 1, 2)),
      );
      c.height = Math.round((c.width * H) / W);
      if (activeSide === "front") {
        if (source) {
          render(c, source, {
            crop,
            left,
            right,
            stripEnabled,
            opacity,
            fontId,
            textTemplate,
            textStyles,
            leftSecond,
            rightSecond,
            layout,
          });
        }
      } else {
        renderBack(c, {
          ...backDesign,
          imageSource: backImageSource,
          fontId,
          layout,
        });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    activeSide,
    source,
    font,
    fontId,
    textTemplate,
    textStyles,
    leftSecond,
    rightSecond,
    crop,
    left,
    right,
    stripEnabled,
    opacity,
    backDesign,
    backImageSource,
    size,
    layout,
    W,
    H,
  ]);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);
  useEffect(() => {
    if (error) {
      if (!errorDialog.current?.open) errorDialog.current?.showModal();
    } else {
      if (errorDialog.current?.open) errorDialog.current?.close();
    }
  }, [error]);
  async function select(files: FileList | File[] | null) {
    if (!files?.length) return;
    if (files.length !== 1) {
      setError(t.errSingleImage);
      return;
    }
    const request = ++seq.current;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const next = await decodeFile(files[0]);
      if (request !== seq.current) {
        next.bitmap.close();
        return;
      }
      const old = current.current;
      current.current = next;
      setSource(next);
      setCrop({ ...initialCrop });
      old?.bitmap.close();
    } catch (e) {
      if (request === seq.current)
        setError(e instanceof Error ? e.message : t.errDecodeFail);
    } finally {
      if (request === seq.current) setLoading(false);
      if (input.current) input.current.value = "";
    }
  }
  const ppi = source
    ? geometry(source.bitmap.width, source.bitmap.height, crop, layout).ppi
    : 0;
  const maxPpi = source
    ? Math.floor(
        geometry(
          source.bitmap.width,
          source.bitmap.height,
          {
            ...crop,
            zoom: 1,
          },
          layout,
        ).ppi,
      )
    : 0;
  const trimmedPpi = customPpiText.trim();
  let customPpiError = "";
  if (customPpiActive) {
    if (!trimmedPpi) {
      customPpiError = t.customPpiErrorEmpty;
    } else if (!/^\d+$/.test(trimmedPpi)) {
      customPpiError = t.customPpiErrorInteger;
    } else {
      const n = Number(trimmedPpi);
      if (n < 72 || n > 1200) {
        customPpiError = t.customPpiErrorRange;
      }
    }
  }
  function updateCrop(next: Crop) {
    if (source)
      setCrop(
        clampCrop(source.bitmap.width, source.bitmap.height, next, layout),
      );
  }
  async function selectBackImage(files: FileList | File[] | null) {
    if (!files?.length) return;
    if (files.length !== 1) {
      setError(t.errSingleImage);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await decodeFile(files[0]);
      const old = backImageSource;
      setBackImageSource(next);
      old?.bitmap.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errDecodeFail);
    } finally {
      setLoading(false);
      if (backImageInput.current) backImageInput.current.value = "";
    }
  }

  function removeBackImage() {
    const old = backImageSource;
    setBackImageSource(null);
    old?.bitmap.close();
  }

  async function doExport(format: "png" | "pdf") {
    if (exporting || loading || font !== "ready") return;
    const effectiveScope =
      exportScope === "current" ? activeSide : exportScope;
    if ((effectiveScope === "front" || effectiveScope === "both") && !source)
      return;
    setConfirm(null);
    setExporting(true);
    setError("");
    setNotice("");
    try {
      await new Promise((r) => requestAnimationFrame(r));
      const fullBack: BackDesign = {
        ...backDesign,
        imageSource: backImageSource,
        fontId,
        layout,
      };
      const frontDesign = {
        crop,
        left,
        right,
        stripEnabled,
        opacity,
        fontId,
        textTemplate,
        textStyles,
        leftSecond,
        rightSecond,
        layout,
      };
      const result = await makeExport(
        source,
        frontDesign,
        format,
        exportPpi,
        fullBack,
        effectiveScope,
      );
      if (result instanceof Blob) {
        const filename =
          effectiveScope === "back"
            ? `postcard-back.${format}`
            : `postcard.${format}`;
        download(result, filename);
      } else {
        download(result.front, "postcard-front.png");
        setTimeout(() => {
          download(result.back, "postcard-back.png");
        }, 300);
      }
      setNotice(t.exportSuccess(format.toUpperCase()));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errExportFail);
    } finally {
      setExporting(false);
    }
  }
  function requestExport(format: "png" | "pdf") {
    if (disabled) return;
    const effectiveScope =
      exportScope === "current" ? activeSide : exportScope;
    if (effectiveScope === "back") {
      void doExport(format);
      return;
    }
    if (ppi < exportPpi) setConfirm(format);
    else void doExport(format);
  }
  async function addFont(files: FileList | null) {
    if (!files?.length) return;
    if (files.length !== 1) {
      setFontUploadError(t.errSingleFont);
      return;
    }
    setUploadingFont(true);
    setFontUploadError("");
    setNotice("");
    try {
      const item = await uploadCustomFont(files[0], customFonts.length);
      setCustomFonts((previous) => [...previous, item]);
      setFontId(item.id);
      try {
        await saveFontSelection(item.id);
      } catch {
        setNotice(t.noticeFontCachedNoSelect);
        return;
      }
      setNotice(t.noticeFontSaved(item.label));
    } catch (e) {
      setFontUploadError(e instanceof Error ? e.message : t.errFontUpload);
    } finally {
      setUploadingFont(false);
      if (fontInput.current) fontInput.current.value = "";
    }
  }
  async function removeFont(id: CustomFontId) {
    setFontUploadError("");
    try {
      await deleteCustomFont(id);
      setCustomFonts((previous) => previous.filter((item) => item.id !== id));
      setTextStyles((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(([key, style]) => [
            key,
            style.fontId === id ? { ...style, fontId: null } : style,
          ]),
        ),
      );
      if (fontId === id) {
        setFontId(DEFAULT_FONT);
        try {
          await saveFontSelection(DEFAULT_FONT);
        } catch {
          setNotice(t.noticeFontDeletedNoDefault);
          return;
        }
      }
      setNotice(t.noticeFontDeleted);
    } catch {
      setFontUploadError(t.errFontDelete);
    }
  }
  function chooseFont(id: FontId) {
    setFontId(id);
    setNotice("");
    void saveFontSelection(id).catch(() =>
      setFontUploadError(t.errFontSaveSelect),
    );
  }
  const effectiveScope =
    exportScope === "current" ? activeSide : exportScope;
  const requiresFront = effectiveScope === "front" || effectiveScope === "both";
  const busy = loading || exporting || uploadingFont,
    disabled =
      (requiresFront && !source) ||
      busy ||
      font !== "ready" ||
      (customPpiActive && Boolean(customPpiError));
  const overlap =
    font === "ready" && textsOverlap(left, right, fontId, layout, textDesign);
  const textFields: {
    key: TextKey;
    label: string;
    value: string;
    setValue: (value: string) => void;
  }[] = [
    { key: "left", label: t.leftText, value: left, setValue: setLeft },
    { key: "right", label: t.rightText, value: right, setValue: setRight },
    ...(textTemplate === "double" ? [
      { key: "leftSecond" as const, label: t.leftSecondText, value: leftSecond, setValue: setLeftSecond },
      { key: "rightSecond" as const, label: t.rightSecondText, value: rightSecond, setValue: setRightSecond },
    ] : []),
  ];
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="./">
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          <strong>{t.appName}</strong>
          <span className="brand-divider" />
          <span className="brand-caption">{t.appCaption}</span>
        </a>
        <div className="topbar-actions">
          <div className="topbar-dropdown" ref={langDropdownRef}>
            <button
              type="button"
              className="topbar-control lang-select-control"
              onClick={() => {
                setLangOpen((prev) => !prev);
                setThemeOpen(false);
              }}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <Languages size={15} className="control-icon" />
              <span className="control-text">{currentLangLabel}</span>
              <ChevronDown
                size={12}
                className={`control-arrow ${langOpen ? "open" : ""}`}
              />
            </button>
            <select
              className="topbar-native-select"
              value={lang}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              aria-label={t.languageSelect}
              tabIndex={-1}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            {langOpen && (
              <div
                className="topbar-dropdown-menu"
                role="listbox"
                aria-label={t.languageSelect}
              >
                {languageOptions.map((opt) => {
                  const isSelected = opt.value === lang;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`topbar-dropdown-item ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        changeLanguage(opt.value);
                        setLangOpen(false);
                      }}
                    >
                      <span className="dropdown-item-label">{opt.label}</span>
                      {isSelected && (
                        <Check size={13} className="dropdown-check" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="topbar-dropdown" ref={themeDropdownRef}>
            <button
              type="button"
              className="topbar-control theme-select-control"
              onClick={() => {
                setThemeOpen((prev) => !prev);
                setLangOpen(false);
              }}
              aria-expanded={themeOpen}
              aria-haspopup="listbox"
            >
              {resolvedTheme === "dark" ? (
                <Moon size={15} className="control-icon" />
              ) : (
                <Sun size={15} className="control-icon" />
              )}
              <span className="control-text">{currentThemeLabel}</span>
              <ChevronDown
                size={12}
                className={`control-arrow ${themeOpen ? "open" : ""}`}
              />
            </button>
            <select
              className="topbar-native-select"
              value={themeMode}
              onChange={(e) => changeTheme(e.target.value as ThemeMode)}
              aria-label={t.themeToggle}
              tabIndex={-1}
            >
              <option value="system">{t.themeSystem}</option>
              <option value="light">{t.themeLight}</option>
              <option value="dark">{t.themeDark}</option>
            </select>
            {themeOpen && (
              <div
                className="topbar-dropdown-menu"
                role="listbox"
                aria-label={t.themeToggle}
              >
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = opt.value === themeMode;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`topbar-dropdown-item ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        changeTheme(opt.value);
                        setThemeOpen(false);
                      }}
                    >
                      <span className="dropdown-item-label">
                        <Icon size={14} className="dropdown-option-icon" />
                        <span>{opt.label}</span>
                      </span>
                      {isSelected && (
                        <Check size={13} className="dropdown-check" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <span className="local-pill">
            <LockKeyhole size={13} />
            {t.localOnly}
          </span>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1>
              {t.heroTitle}
              <span>{t.heroPeriod}</span>
            </h1>
            <p>{t.heroDesc}</p>
          </div>
          <div className="format-tag">
            <span>{t.postcardTagNumber}</span>
            <strong>
              {sizeLabel} <small>mm</small>
            </strong>
            <span>{layout === "portrait" ? t.portraitTag : t.landscapeTag}</span>
          </div>
        </div>
        <div className="workspace">
          <section className="preview-section" aria-label={t.previewAria}>
            <div className="section-top">
              <div className="preview-top-left">
                <span className="live-dot" />
                <span className="live-label">{t.livePreview}</span>
                <div
                  className="side-segmented-control"
                  role="tablist"
                  aria-label={t.sideToggle}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSide === "front"}
                    className={`side-tab ${activeSide === "front" ? "active" : ""}`}
                    onClick={() => setActiveSide("front")}
                  >
                    {t.sideFront}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSide === "back"}
                    className={`side-tab ${activeSide === "back" ? "active" : ""}`}
                    onClick={() => setActiveSide("back")}
                  >
                    {t.sideBack}
                  </button>
                </div>
              </div>
              <span className="subtle">
                {dimensions.widthMm} : {dimensions.heightMm}{" "}
                <Maximize size={14} />
              </span>
            </div>
            <div
              className={`preview-stage ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!busy) void select(e.dataTransfer.files);
              }}
            >
              <div
                ref={frame}
                className={`postcard ${layout} ${activeSide === "front" && source ? "has-image" : ""}`}
                style={{ aspectRatio: `${W} / ${H}` }}
              >
                {activeSide === "front" ? (
                  source ? (
                    <canvas
                      ref={canvas}
                      aria-label={t.canvasAria}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        const step = e.shiftKey ? 50 : 10;
                        const moves: Record<string, [number, number]> = {
                          ArrowLeft: [-step, 0],
                          ArrowRight: [step, 0],
                          ArrowUp: [0, -step],
                          ArrowDown: [0, step],
                        };
                        if (moves[e.key] && !busy) {
                          e.preventDefault();
                          updateCrop({
                            ...crop,
                            x: crop.x + moves[e.key][0],
                            y: crop.y + moves[e.key][1],
                          });
                        }
                      }}
                      onPointerDown={(e) => {
                        if (busy || pointer.current) return;
                        pointer.current = {
                          id: e.pointerId,
                          x: e.clientX,
                          y: e.clientY,
                          crop,
                        };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        const p = pointer.current;
                        if (!p || p.id !== e.pointerId) return;
                        const factor =
                          W / e.currentTarget.getBoundingClientRect().width;
                        updateCrop({
                          ...p.crop,
                          x: p.crop.x + (e.clientX - p.x) * factor,
                          y: p.crop.y + (e.clientY - p.y) * factor,
                        });
                      }}
                      onPointerUp={() => {
                        pointer.current = null;
                      }}
                      onPointerCancel={() => {
                        pointer.current = null;
                      }}
                      onLostPointerCapture={() => {
                        pointer.current = null;
                      }}
                    />
                  ) : (
                    <button
                      className="empty-canvas"
                      disabled={busy}
                      onClick={() => input.current?.click()}
                    >
                      <span className="empty-art">
                        <ImageIcon size={39} strokeWidth={1.2} />
                        <span className="plus">+</span>
                      </span>
                      <strong>{t.emptyTitle}</strong>
                      <span>{t.emptySubtitle}</span>
                      <span className="empty-format">{t.emptyFormat}</span>
                    </button>
                  )
                ) : (
                  <canvas
                    ref={canvas}
                    aria-label={t.backPreview}
                    tabIndex={0}
                  />
                )}
                {activeSide === "front" && !source && stripEnabled && (
                  <div
                    className="empty-strip"
                    style={{
                      height: `${(textLayout.height / H) * 100}%`,
                      padding: `0 ${(TEXT_MARGIN / W) * 100}%`,
                    }}
                  >
                    {textLayout.rows.map((row, index) => (
                      <div className="empty-strip-row" key={index} style={{ height: `${row.height / textLayout.height * 100}%` }}>
                        {row.texts.map((text, side) => (
                          <span key={side} style={{ fontFamily: fontStack(text.fontId), fontSize: `${text.fontSize / W * 100}cqw` }}>{text.text}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="paper-shadow" />
            </div>
            <div className="preview-bottom">
              <span>
                <Move size={14} />
                {activeSide === "front"
                  ? source
                    ? t.dragHint
                    : t.dragHintEmpty
                  : t.backDragHint}
              </span>
              <span>{activeSide === "front" ? t.frontPreview : t.backPreview}</span>
            </div>
            <div className="quality-card">
              <span
                className={`quality-icon ${source && ppi < 300 ? "warning" : ""}`}
              >
                {source && ppi >= 300 ? (
                  <Check size={19} />
                ) : (
                  <Info size={19} />
                )}
              </span>
              <div>
                <strong>
                  {source ? t.qualityTitlePpi(ppi) : t.qualityTitleEmpty}
                </strong>
                <p>
                  {source
                    ? ppi >= 300
                      ? t.qualityGood
                      : t.qualityLow
                    : t.qualityEmpty}
                </p>
                {source && <p>{t.imageMaxPpi(maxPpi)}</p>}
                {source && (
                  <p>
                    {t.rawPixels(source.width, source.height)}
                    {source.limited
                      ? t.limitedPixelsNote(
                          source.bitmap.width,
                          source.bitmap.height,
                        )
                      : ""}
                  </p>
                )}
              </div>
              <span className="quality-badge">
                {source
                  ? ppi >= 300
                    ? t.badgeGood
                    : t.badgeWarn
                  : t.badgeTip}
              </span>
            </div>
            <div className="process-note">
              <span>{t.step1}</span>
              <ChevronRight size={13} />
              <span>{t.step2}</span>
              <ChevronRight size={13} />
              <span>{t.step3}</span>
            </div>
          </section>
          <aside className="editor">
            <div className="editor-heading">
              <SlidersHorizontal size={18} />
              <h2>{t.editorTitle}</h2>
            </div>
            <div className="editor-side-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeSide === "front"}
                className={`editor-side-tab ${activeSide === "front" ? "active" : ""}`}
                onClick={() => setActiveSide("front")}
              >
                <ImageIcon size={15} />
                <span>{t.editorTabFront}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSide === "back"}
                className={`editor-side-tab ${activeSide === "back" ? "active" : ""}`}
                onClick={() => setActiveSide("back")}
              >
                <SlidersHorizontal size={15} />
                <span>{t.editorTabBack}</span>
              </button>
            </div>
            {activeSide === "front" && (
              <>
                <section className="control-section">
                  <h3>
                    <ImageIcon size={16} />
                    {t.sectionImage}<span>01</span>
                  </h3>
              <fieldset className="layout-picker" disabled={busy}>
                <legend>{t.canvasOrientation}</legend>
                <div className="layout-options">
                  {(["landscape", "portrait"] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="layout"
                        value={value}
                        checked={layout === value}
                        onChange={() => {
                          pointer.current = null;
                          setLayout(value);
                          setCrop({ ...initialCrop });
                          setNotice("");
                        }}
                      />
                      <span>
                        {value === "landscape" ? t.landscape : t.portrait}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="helper">{t.orientationHelper(sizeLabel)}</p>
              </fieldset>
              <input
                ref={input}
                data-testid="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jxl,.jxl"
                className="hidden"
                onChange={(e) => void select(e.target.files)}
              />
              <button
                disabled={busy}
                className="upload-button"
                onClick={() => input.current?.click()}
              >
                <ImagePlus size={18} />
                {loading
                  ? t.readingImage
                  : source
                    ? t.changeImage
                    : t.chooseImage}
                <ArrowUpRight size={16} />
              </button>
              <p className="helper filename">
                {source ? source.name : t.formatHelper}
              </p>
              {source && (
                <fieldset className="crop-controls" disabled={busy}>
                  <label className="range-label" htmlFor="zoom">
                    {t.zoom}<span>{Math.round(crop.zoom * 100)}%</span>
                  </label>
                  <input
                    id="zoom"
                    type="range"
                    min="100"
                    max="400"
                    value={Math.round(crop.zoom * 100)}
                    onChange={(e) =>
                      updateCrop({
                        ...crop,
                        zoom: Number(e.target.value) / 100,
                      })
                    }
                  />
                  <div className="range-ends">
                    <span>100%</span>
                    <span>400%</span>
                  </div>
                  <div className="button-row">
                    <button
                      className="outlined"
                      onClick={() =>
                        updateCrop({
                          ...crop,
                          rotation: (crop.rotation + 90) % 360,
                          x: 0,
                          y: 0,
                        })
                      }
                    >
                      <RotateCw size={16} />
                      {t.rotate90}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setCrop({ ...initialCrop })}
                    >
                      <RotateCcw size={15} />
                      {t.resetCrop}
                    </button>
                  </div>
                </fieldset>
              )}
            </section>
            <section className="control-section">
              <h3>
                <Type size={17} />
                {t.sectionText}<span>02</span>
              </h3>
              <div
                className={`strip-settings strip-settings-top ${stripEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>{t.stripToggle}</strong>
                    <small>
                      {stripEnabled
                        ? t.stripEnabledHint
                        : t.stripDisabledHint}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={stripEnabled}
                    disabled={exporting}
                    aria-controls="text-strip-options"
                    aria-expanded={stripEnabled}
                    onChange={(e) => setStripEnabled(e.target.checked)}
                  />
                  <span className="switch" aria-hidden="true" />
                </label>
              </div>
              {stripEnabled && (
                <fieldset id="text-strip-options" disabled={exporting}>
                  <label className="text-field">
                    {t.fontLabel}
                    <select
                      value={fontId}
                      aria-describedby="font-description"
                      onChange={(e) => {
                        chooseFont(e.target.value as FontId);
                      }}
                    >
                      <optgroup label={t.fontGroupBuiltin}>
                        {fonts.map((item) => {
                          const meta = t.fonts[item.id] || item;
                          return (
                            <option key={item.id} value={item.id}>
                              {meta.label}
                            </option>
                          );
                        })}
                      </optgroup>
                      {customFonts.length > 0 && (
                        <optgroup label={t.fontGroupCustom}>
                          {customFonts.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </label>
                  <p className="helper font-description" id="font-description">
                    {selectedFontMeta.description}
                    <br />
                    {selectedFont.license ? (
                      <>
                        {t.fontFreeOfl}
                        <a
                          href={`${import.meta.env.BASE_URL}licenses/${selectedFont.license}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.fontLicenseLink}
                        </a>
                      </>
                    ) : (
                      t.fontLocalCache
                    )}
                  </p>
                  <p
                    className="font-status"
                    data-testid="font-status"
                    role="status"
                  >
                    {font === "loading"
                      ? t.fontStatusLoading(selectedFontMeta.label)
                      : font === "error"
                        ? t.fontStatusError
                        : t.fontStatusReady(selectedFontMeta.label)}
                  </p>
                  {font === "error" && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setFontRetry((n) => n + 1)}
                    >
                      {t.reloadFont}
                    </button>
                  )}
                  <div className="custom-font-upload">
                    <input
                      ref={fontInput}
                      data-testid="font-file-input"
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                      className="hidden"
                      onChange={(e) => void addFont(e.target.files)}
                    />
                    <button
                      type="button"
                      className="outlined"
                      disabled={
                        uploadingFont ||
                        catalogStatus !== "ready" ||
                        customFonts.length >= MAX_CUSTOM_FONTS
                      }
                      onClick={() => fontInput.current?.click()}
                    >
                      <ImagePlus size={16} />
                      {uploadingFont ? t.savingFont : t.uploadFont}
                    </button>
                    <p className="helper">{t.customFontHelper}</p>
                    {catalogStatus === "loading" && (
                      <p className="helper" role="status">
                        {t.loadingCatalog}
                      </p>
                    )}
                    {catalogStatus === "error" && (
                      <p className="inline-warning" role="alert">
                        {t.catalogError}
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setCatalogRetry((n) => n + 1)}
                        >
                          {t.retry}
                        </button>
                      </p>
                    )}
                    {customFonts.length >= MAX_CUSTOM_FONTS && (
                      <p className="helper">
                        {t.maxFontsHelper(MAX_CUSTOM_FONTS)}
                      </p>
                    )}
                    {fontUploadError && (
                      <p className="inline-warning" role="alert">
                        {fontUploadError}
                      </p>
                    )}
                    {customFonts.length > 0 && (
                      <ul
                        className="custom-font-list"
                        aria-label={t.customFontListAria}
                      >
                        {customFonts.map((item) => (
                          <li key={item.id}>
                            <span title={item.label}>{item.label}</span>
                            <button
                              type="button"
                              className="delete-font"
                              aria-label={t.deleteFontAria(item.label)}
                              disabled={uploadingFont}
                              onClick={() => void removeFont(item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="copy-fields">
                    <fieldset className="layout-picker">
                      <legend>{t.textTemplate}</legend>
                      <div className="layout-options">
                        {(["single", "double"] as const).map((value) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name="text-template"
                              value={value}
                              checked={textTemplate === value}
                              onChange={() => setTextTemplate(value)}
                            />
                            <span>
                              {value === "single" ? t.templateSingle : t.templateDouble}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {textFields.map(({ key, label, value, setValue }) => (
                      <div className="copy-block" key={key}>
                        <label className="text-field">
                          {label}
                          <input
                            maxLength={240}
                            value={value}
                            placeholder={key.startsWith("left") ? t.leftPlaceholder : t.rightPlaceholder}
                            onChange={(e) => setValue(e.target.value)}
                          />
                        </label>
                        <div className="copy-style-controls">
                          <label className="text-field">
                            {t.textFont(label)}
                            <select
                              aria-label={t.textFont(label)}
                              value={textStyles[key]?.fontId ?? ""}
                              onChange={(e) => setTextStyles((previous) => ({
                                ...previous,
                                [key]: {
                                  fontSize: previous[key]?.fontSize ?? 32,
                                  fontId: (e.target.value || null) as FontId | null,
                                },
                              }))}
                            >
                              <option value="">{t.followDefaultFont}</option>
                              <optgroup label={t.fontGroupBuiltin}>
                                {fonts.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {(t.fonts[item.id] || item).label}
                                  </option>
                                ))}
                              </optgroup>
                              {customFonts.length > 0 && (
                                <optgroup label={t.fontGroupCustom}>
                                  {customFonts.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.label}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </label>
                          <div className="copy-size-control">
                            <label className="range-label" htmlFor={`text-size-${key}`}>
                              {t.textSize(label)}<span>{textStyles[key]?.fontSize ?? 32}px</span>
                            </label>
                            <input
                              id={`text-size-${key}`}
                              aria-label={t.textSize(label)}
                              type="range"
                              min="12"
                              max="96"
                              value={textStyles[key]?.fontSize ?? 32}
                              onChange={(e) => setTextStyles((previous) => ({
                                ...previous,
                                [key]: {
                                  fontId: previous[key]?.fontId ?? null,
                                  fontSize: Number(e.target.value),
                                },
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="helper copy-layout-helper">
                    {t.copyLayoutHelper}
                  </p>
                  {overlap && (
                    <p className="inline-warning text-overflow">
                      {t.textOverlap}
                    </p>
                  )}
                  <div className="opacity-control">
                    <label className="range-label" htmlFor="opacity">
                      {t.stripOpacity}<span>{Math.round(opacity * 100)}%</span>
                    </label>
                    <input
                      id="opacity"
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(opacity * 100)}
                      onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                    />
                    <div className="range-ends">
                      <span>{t.opacityClear}</span>
                      <span>{t.opacitySolid}</span>
                    </div>
                  </div>
                </fieldset>
              )}
            </section>
          </>
        )}
        {activeSide === "back" && (
          <>
            <section className="control-section">
              <h3>
                <SlidersHorizontal size={16} />
                {t.sectionBackLayout}<span>01</span>
              </h3>

              {/* 风格预设选择卡片 */}
              <div className="back-presets-block">
                <span className="preset-label">{t.backPresetsTitle}</span>
                <div className="back-preset-buttons">
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyBackPreset("international")}
                  >
                    🌍 {t.backPresetInternational}
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyBackPreset("china")}
                  >
                    📮 {t.backPresetChina}
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyBackPreset("minimalist")}
                  >
                    ✨ {t.backPresetMinimalist}
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyBackPreset("vintage")}
                  >
                    ✈️ {t.backPresetVintage}
                  </button>
                </div>
              </div>

              {/* 画布方向 (横向 / 竖向) */}
              <fieldset className="layout-picker" disabled={busy}>
                <legend>{t.canvasOrientation}</legend>
                <div className="layout-options">
                  {(["landscape", "portrait"] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="layout-back"
                        value={value}
                        checked={layout === value}
                        onChange={() => {
                          pointer.current = null;
                          setLayout(value);
                          setCrop({ ...initialCrop });
                          setNotice("");
                        }}
                      />
                      <span>
                        {value === "landscape" ? t.landscape : t.portrait}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="helper">{t.orientationHelper(sizeLabel)}</p>
              </fieldset>

              {/* 纸张质感底色 */}
              <div className="paper-color-block">
                <span className="preset-label">{t.backPaperColor}</span>
                <div className="segmented-control" style={{ width: "100%" }}>
                  {(
                    [
                      ["ivory", t.backPaperIvory],
                      ["white", t.backPaperWhite],
                      ["vintage", t.backPaperVintage],
                    ] as const
                  ).map(([colorVal, label]) => (
                    <label
                      key={colorVal}
                      className={
                        (backDesign.paperColor || "ivory") === colorVal
                          ? "active"
                          : ""
                      }
                    >
                      <input
                        type="radio"
                        name="paperColor"
                        value={colorVal}
                        checked={(backDesign.paperColor || "ivory") === colorVal}
                        disabled={exporting}
                        onChange={() =>
                          setBackDesign((prev) => ({
                            ...prev,
                            paperColor: colorVal,
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 邮政编码方框（左上角规范） */}
              <div
                className={`strip-settings ${backDesign.postalCodeEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>{t.backPostalCodeToggle}</strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={backDesign.postalCodeEnabled}
                    disabled={exporting}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        postalCodeEnabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="switch" aria-hidden="true" />
                </label>
                <p className="helper" style={{ margin: "6px 0 0" }}>
                  {t.backPostalCodeHelper}
                </p>
              </div>

              {/* 正上方文字与副标题（仅在未启用邮政编码框时提供；中国邮政明信片正上方为国标邮政编码框，不提供正上方文字以消除冲突） */}
              {!backDesign.postalCodeEnabled && (
                <div className="copy-fields">
                  <label className="text-field">
                    {t.backTopText}
                    <input
                      maxLength={60}
                      value={backDesign.topText}
                      placeholder={t.backTopTextPlaceholder}
                      onChange={(e) =>
                        setBackDesign((prev) => ({
                          ...prev,
                          topText: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-field">
                    {t.backTopSubText}
                    <input
                      maxLength={60}
                      value={backDesign.topSubText ?? ""}
                      placeholder={t.backTopSubTextPlaceholder}
                      onChange={(e) =>
                        setBackDesign((prev) => ({
                          ...prev,
                          topSubText: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              {/* 右上角 邮票标志 */}
              <div
                className={`strip-settings ${backDesign.stampEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>{t.backStampToggle}</strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={backDesign.stampEnabled}
                    disabled={exporting}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        stampEnabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="switch" aria-hidden="true" />
                </label>
                {backDesign.stampEnabled && (
                  <label className="text-field" style={{ marginTop: "12px" }}>
                    {t.backStampText}
                    <input
                      maxLength={20}
                      value={backDesign.stampText}
                      placeholder={t.backStampTextPlaceholder}
                      onChange={(e) =>
                        setBackDesign((prev) => ({
                          ...prev,
                          stampText: e.target.value,
                        }))
                      }
                    />
                  </label>
                )}
              </div>

              {/* 中间是否有竖线分隔 */}
              <div
                className={`strip-settings ${backDesign.dividerEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>{t.backDividerToggle}</strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={backDesign.dividerEnabled}
                    disabled={exporting}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        dividerEnabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="switch" aria-hidden="true" />
                </label>
              </div>
            </section>

            <section className="control-section">
              <h3>
                <Type size={17} />
                {t.sectionBackContent}<span>02</span>
              </h3>

              {/* 明信片字体选择（背面文字通用，支持中文字体自由切换） */}
              <label className="text-field">
                {t.fontLabel}
                <select
                  value={fontId}
                  aria-describedby="font-description-back"
                  disabled={exporting}
                  onChange={(e) => {
                    chooseFont(e.target.value as FontId);
                  }}
                >
                  <optgroup label={t.fontGroupBuiltin}>
                    {fonts.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                  {customFonts.length > 0 && (
                    <optgroup label={t.fontGroupCustom}>
                      {customFonts.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <p className="helper" id="font-description-back" style={{ margin: "-2px 0 14px" }}>
                {selectedFont.description}
              </p>

              {/* 右侧地址区 */}
              <div
                className={`strip-settings ${backDesign.addressEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>{t.backAddressToggle}</strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={backDesign.addressEnabled}
                    disabled={exporting}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        addressEnabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="switch" aria-hidden="true" />
                </label>

                {backDesign.addressEnabled && (
                  <div
                    style={{
                      marginTop: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {/* 地址横线数 */}
                    <label className="text-field">
                      {t.backAddressLines}
                      <select
                        value={backDesign.addressLinesCount}
                        onChange={(e) =>
                          setBackDesign((prev) => ({
                            ...prev,
                            addressLinesCount: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={0}>{t.backNoLines}</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </label>

                    {/* 自定义横线行距 */}
                    {backDesign.addressLinesCount > 0 && (
                      <>
                        <div className="sub-field-row">
                          <span className="sub-label">{t.backAddressLineSpacing}</span>
                          <div className="segmented-control" style={{ width: "100%" }}>
                            {(
                              [
                                [60, t.backSpacingCompact],
                                [75, t.backSpacingStandard],
                                [95, t.backSpacingRelaxed],
                              ] as const
                            ).map(([spacingVal, label]) => (
                              <label
                                key={spacingVal}
                                className={
                                  (backDesign.addressLineSpacing || 75) === spacingVal
                                    ? "active"
                                    : ""
                                }
                              >
                                <input
                                  type="radio"
                                  name="addressLineSpacing"
                                  value={spacingVal}
                                  checked={
                                    (backDesign.addressLineSpacing || 75) === spacingVal
                                  }
                                  disabled={exporting}
                                  onChange={() =>
                                    setBackDesign((prev) => ({
                                      ...prev,
                                      addressLineSpacing: spacingVal,
                                    }))
                                  }
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 自定义横线样式 */}
                        <div className="sub-field-row">
                          <span className="sub-label">{t.backAddressLineStyle}</span>
                          <div className="segmented-control" style={{ width: "100%" }}>
                            {(
                              [
                                ["solid", t.backStyleSolid],
                                ["dashed", t.backStyleDashed],
                                ["dotted", t.backStyleDotted],
                              ] as const
                            ).map(([styleVal, label]) => (
                              <label
                                key={styleVal}
                                className={
                                  (backDesign.addressLineStyle || "solid") === styleVal
                                    ? "active"
                                    : ""
                                }
                              >
                                <input
                                  type="radio"
                                  name="addressLineStyle"
                                  value={styleVal}
                                  checked={
                                    (backDesign.addressLineStyle || "solid") === styleVal
                                  }
                                  disabled={exporting}
                                  onChange={() =>
                                    setBackDesign((prev) => ({
                                      ...prev,
                                      addressLineStyle: styleVal,
                                    }))
                                  }
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 收件人前缀自定义 */}
                        <label className="text-field">
                          {t.backAddressPrefix}
                          <input
                            maxLength={20}
                            value={backDesign.addressPrefix ?? "To."}
                            placeholder={t.backAddressPrefixPlaceholder}
                            onChange={(e) =>
                              setBackDesign((prev) => ({
                                ...prev,
                                addressPrefix: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 左侧是否有图片 */}
              <div
                className={`strip-settings ${backDesign.imageEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>{t.backImageToggle}</strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={backDesign.imageEnabled}
                    disabled={exporting}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        imageEnabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="switch" aria-hidden="true" />
                </label>

                {backDesign.imageEnabled && (
                  <div style={{ marginTop: "12px" }}>
                    <input
                      ref={backImageInput}
                      data-testid="back-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jxl,.jxl"
                      className="hidden"
                      onChange={(e) => void selectBackImage(e.target.files)}
                    />
                    <div className="button-row">
                      <button
                        type="button"
                        className="upload-button"
                        style={{ margin: 0, flex: 1 }}
                        disabled={busy}
                        onClick={() => backImageInput.current?.click()}
                      >
                        <ImagePlus size={16} />
                        {backImageSource
                          ? t.backChangeImage
                          : t.backChooseImage}
                      </button>
                      {backImageSource && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={removeBackImage}
                        >
                          <Trash2 size={15} />
                          {t.backRemoveImage}
                        </button>
                      )}
                    </div>
                    {backImageSource && (
                      <p className="helper filename">{backImageSource.name}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 左下角、右下角 小文字 */}
              <div className="copy-fields" style={{ marginTop: "12px" }}>
                <label className="text-field">
                  {t.backLeftBottomText}
                  <input
                    maxLength={100}
                    value={backDesign.leftBottomText}
                    placeholder={t.backLeftPlaceholder}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        leftBottomText: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-field">
                  {t.backRightBottomText}
                  <input
                    maxLength={100}
                    value={backDesign.rightBottomText}
                    placeholder={t.backRightPlaceholder}
                    onChange={(e) =>
                      setBackDesign((prev) => ({
                        ...prev,
                        rightBottomText: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </section>
          </>
        )}
        <section className="export-section">
          <h3>
            <ArrowDownToLine size={17} />
            {t.sectionExport}<span>03</span>
          </h3>
          <div className="text-field export-scope-field">
            <label htmlFor="export-scope">
              {t.exportScope}
              <select
                id="export-scope"
                disabled={busy}
                value={exportScope}
                onChange={(e) =>
                  setExportScope(e.target.value as ExportScope)
                }
              >
                <option value="current">
                  {t.exportScopeCurrent} (
                  {activeSide === "front" ? t.sideFront : t.sideBack})
                </option>
                <option value="front">{t.exportScopeFront}</option>
                <option value="back">{t.exportScopeBack}</option>
                <option value="both">{t.exportScopeBoth}</option>
              </select>
            </label>
          </div>
          <div className="text-field ppi-field">
            <label htmlFor="export-ppi">
              {t.exportPpi}
                  <div className="ppi-select-row">
                    <select
                      id="export-ppi"
                      disabled={busy}
                      value={customPpiActive ? "custom" : exportPpi}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setCustomPpiActive(true);
                          setCustomPpiText(String(exportPpi));
                        } else {
                          setCustomPpiActive(false);
                          const val = Number(e.target.value);
                          setExportPpi(val);
                          setCustomPpiText(String(val));
                        }
                      }}
                    >
                      <option value={150}>{t.ppi150}</option>
                      <option value={300}>{t.ppi300}</option>
                      <option value={600}>{t.ppi600}</option>
                      <option value="custom">{t.ppiCustom}</option>
                    </select>
                    {customPpiActive && (
                      <div className="custom-ppi-input">
                        <input
                          id="custom-export-ppi"
                          type="number"
                          min={72}
                          max={1200}
                          aria-label={t.customPpiAria}
                          value={customPpiText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomPpiText(val);
                            const trimmed = val.trim();
                            if (/^\d+$/.test(trimmed)) {
                              const n = Number(trimmed);
                              if (n >= 72 && n <= 1200) {
                                setExportPpi(n);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (!disabled) requestExport("png");
                            }
                          }}
                        />
                        <span>PPI</span>
                      </div>
                    )}
                  </div>
                </label>
                <p className="helper ppi-helper">
                  {dimensions.exportWidth} × {dimensions.exportHeight} px ·{" "}
                  {exportPpi === 300
                    ? t.ppiHelperStandard
                    : exportPpi > 300
                      ? t.ppiHelperHigh
                      : t.ppiHelperDraft}
                </p>
                {source && (
                  <p className="helper ppi-max-helper">
                    {t.ppiMaxHelper(maxPpi)}
                  </p>
                )}
                {customPpiActive && customPpiError && (
                  <p className="inline-warning ppi-error" role="alert">
                    {customPpiError}
                  </p>
                )}
                {source && !customPpiError && exportPpi > Math.floor(ppi) && (
                  <p className="inline-warning ppi-warning" role="alert">
                    {exportPpi > maxPpi
                      ? t.ppiWarnExceedMax(exportPpi, maxPpi)
                      : t.ppiWarnExceedCrop(exportPpi, ppi, maxPpi)}
                  </p>
                )}
              </div>
              <button
                className="primary"
                disabled={disabled}
                onClick={() => requestExport("png")}
              >
                <ArrowDownToLine size={17} />
                {exporting ? t.generating : t.downloadPng}
                <span>
                  {customPpiActive && customPpiError
                    ? trimmedPpi
                      ? `${trimmedPpi} PPI`
                      : "-- PPI"
                    : `${exportPpi} PPI`}
                </span>
              </button>
              <button
                className="pdf-button"
                disabled={disabled}
                onClick={() => requestExport("pdf")}
              >
                {t.downloadPdf}
                <ArrowUpRight size={16} />
              </button>
              <p className="export-hint">
                {effectiveScope === "back"
                  ? t.hintBackReady
                  : !source
                    ? t.hintNoSource
                    : font === "loading"
                      ? t.hintFontLoading
                      : font === "error"
                        ? t.hintFontError
                        : t.hintPrintSize(sizeLabel)}
              </p>
            </section>
          </aside>
        </div>
        <div className="messages" aria-live="polite">
          {loading && <p role="status">{t.decodingImage}</p>}
          {notice && (
            <p role="status">
              <Check size={16} />
              {notice}
            </p>
          )}
        </div>
      </main>
      <footer>
        <span>
          <Leaf size={14} />
          {t.footerQuote}
        </span>
        <span>
          <LockKeyhole size={13} />
          {t.footerPrivacy}
        </span>
      </footer>
      <dialog
        ref={dialog}
        onCancel={() => setConfirm(null)}
        aria-labelledby="confirm-title"
      >
        <div className="dialog-icon">
          <Info />
        </div>
        <h2 id="confirm-title">{t.confirmLowPpiTitle}</h2>
        <p>
          {t.confirmLowPpiDesc(
            ppi,
            source ? t.confirmLowPpiMaxPart(maxPpi) : "",
            exportPpi,
          )}
        </p>
        <div className="dialog-actions">
          <button className="text-button" onClick={() => setConfirm(null)}>
            {t.dialogBack}
          </button>
          <button
            className="primary"
            onClick={() => confirm && void doExport(confirm)}
          >
            {t.dialogProceed(confirm?.toUpperCase() || "")}
          </button>
        </div>
      </dialog>
      <dialog
        ref={errorDialog}
        onCancel={() => setError("")}
        aria-labelledby="error-title"
      >
        <div className="dialog-icon">
          <Info />
        </div>
        <h2 id="error-title">{t.dialogNoticeTitle}</h2>
        <p>{error}</p>
        <div className="dialog-actions">
          <button
            type="button"
            className="primary"
            onClick={() => setError("")}
          >
            {t.dialogOk}
          </button>
        </div>
      </dialog>
    </div>
  );
}
