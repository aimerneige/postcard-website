import { getLayout, STRIP_HEIGHT, TEXT_MARGIN, type Layout } from "./layout";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
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
} from "lucide-react";
import { decodeFile, type Source } from "./image";
import {
  clampCrop,
  geometry,
  initialCrop,
  render,
  textsOverlap,
  type Crop,
} from "./render";
import { makeExport, download } from "./export";
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

  const [layout, setLayout] = useState<Layout>("landscape");
  const [exportPpi, setExportPpi] = useState(300);
  const [customPpiActive, setCustomPpiActive] = useState(false);
  const [customPpiText, setCustomPpiText] = useState("300");
  const dimensions = getLayout(layout, exportPpi);
  const { width: W, height: H } = dimensions;
  const sizeLabel = `${dimensions.widthMm} × ${dimensions.heightMm}`;
  const [source, setSource] = useState<Source | null>(null),
    [crop, setCrop] = useState<Crop>(initialCrop);
  const [left, setLeft] = useState(""),
    [right, setRight] = useState(""),
    [stripEnabled, setStripEnabled] = useState(true),
    [opacity, setOpacity] = useState(0.3);
  const [fontId, setFontId] = useState<FontId>(DEFAULT_FONT);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [fontUploadError, setFontUploadError] = useState("");
  const [fontResult, setFontResult] = useState<{
    id: FontId;
    status: "loading" | "ready" | "error";
  }>({ id: DEFAULT_FONT, status: "loading" });
  const [fontRetry, setFontRetry] = useState(0);
  const font = fontResult.id === fontId ? fontResult.status : "loading";
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
    setFontResult({ id: fontId, status: "loading" });
    void loadFont(fontId).then(
      () => {
        if (!cancelled) setFontResult({ id: fontId, status: "ready" });
      },
      () => {
        if (!cancelled) setFontResult({ id: fontId, status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fontId, fontRetry]);
  useEffect(() => {
    return () => {
      seq.current++;
      current.current?.bitmap.close();
    };
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      setSize(frame.current?.clientWidth || 0),
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!source || font !== "ready" || !canvas.current) return;
    const id = requestAnimationFrame(() => {
      const c = canvas.current;
      if (!c) return;
      c.width = Math.max(
        1,
        Math.round(size * Math.min(devicePixelRatio || 1, 2)),
      );
      c.height = Math.round((c.width * H) / W);
      render(c, source, {
        crop,
        left,
        right,
        stripEnabled,
        opacity,
        fontId,
        layout,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [
    source,
    font,
    fontId,
    crop,
    left,
    right,
    stripEnabled,
    opacity,
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
  async function doExport(format: "png" | "pdf") {
    if (!source || exporting || loading || font !== "ready") return;
    setConfirm(null);
    setExporting(true);
    setError("");
    setNotice("");
    try {
      await new Promise((r) => requestAnimationFrame(r));
      download(
        await makeExport(
          source,
          { crop, left, right, stripEnabled, opacity, fontId, layout },
          format,
          exportPpi,
        ),
        format,
      );
      setNotice(t.exportSuccess(format.toUpperCase()));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errExportFail);
    } finally {
      setExporting(false);
    }
  }
  function requestExport(format: "png" | "pdf") {
    if (disabled) return;
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
  const busy = loading || exporting || uploadingFont,
    disabled =
      !source ||
      busy ||
      font !== "ready" ||
      (customPpiActive && Boolean(customPpiError));
  const overlap =
    font === "ready" && textsOverlap(left, right, fontId, layout);
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
          <div className="topbar-control lang-select-control">
            <Languages size={15} className="control-icon" />
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              aria-label={t.languageSelect}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
          <div className="topbar-control theme-select-control">
            {resolvedTheme === "dark" ? (
              <Moon size={15} className="control-icon" />
            ) : (
              <Sun size={15} className="control-icon" />
            )}
            <select
              value={themeMode}
              onChange={(e) => changeTheme(e.target.value as ThemeMode)}
              aria-label={t.themeToggle}
            >
              <option value="system">{t.themeSystem}</option>
              <option value="light">{t.themeLight}</option>
              <option value="dark">{t.themeDark}</option>
            </select>
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
              <span>
                <span className="live-dot" />
                {t.livePreview}
              </span>
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
                className={`postcard ${layout} ${source ? "has-image" : ""}`}
                style={{ aspectRatio: `${W} / ${H}` }}
              >
                {source ? (
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
                )}
                {!source && stripEnabled && (
                  <div
                    className="empty-strip"
                    style={{
                      fontFamily: fontStack(fontId),
                      height: `${(STRIP_HEIGHT / H) * 100}%`,
                      padding: `0 ${(TEXT_MARGIN / W) * 100}%`,
                      fontSize: `${(32 / W) * 100}cqw`,
                    }}
                  >
                    <span>{left}</span>
                    <span>{right}</span>
                  </div>
                )}
              </div>
              <div className="paper-shadow" />
            </div>
            <div className="preview-bottom">
              <span>
                <Move size={14} />
                {source ? t.dragHint : t.dragHintEmpty}
              </span>
              <span>{t.frontPreview}</span>
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
                    <label className="text-field">
                      {t.leftText}
                      <input
                        maxLength={240}
                        value={left}
                        placeholder={t.leftPlaceholder}
                        onChange={(e) => setLeft(e.target.value)}
                      />
                    </label>
                    <label className="text-field">
                      {t.rightText}
                      <input
                        maxLength={240}
                        value={right}
                        placeholder={t.rightPlaceholder}
                        onChange={(e) => setRight(e.target.value)}
                      />
                    </label>
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
            <section className="export-section">
              <h3>
                <ArrowDownToLine size={17} />
                {t.sectionExport}<span>03</span>
              </h3>
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
                {!source
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
