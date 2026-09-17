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
  X,
  Info,
} from "lucide-react";
import { decodeFile, type Source } from "./image";
import {
  clampCrop,
  geometry,
  initialCrop,
  render,
  textOverflows,
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
export default function App() {
  const [layout, setLayout] = useState<Layout>("landscape");
  const dimensions = getLayout(layout);
  const { width: W, height: H, textWidth } = dimensions;
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
    dialog = useRef<HTMLDialogElement>(null);
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
  async function select(files: FileList | File[] | null) {
    if (!files?.length) return;
    if (files.length !== 1) {
      setError("请一次只选择一张图片。");
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
        setError(e instanceof Error ? e.message : "图片读取失败，请重试。");
    } finally {
      if (request === seq.current) setLoading(false);
      if (input.current) input.current.value = "";
    }
  }
  const ppi = source
    ? geometry(source.bitmap.width, source.bitmap.height, crop, layout).ppi
    : 0;
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
        ),
        format,
      );
      setNotice(`${format.toUpperCase()} 已生成，下载已开始。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  }
  function requestExport(format: "png" | "pdf") {
    if (ppi < 300) setConfirm(format);
    else void doExport(format);
  }
  async function addFont(files: FileList | null) {
    if (!files?.length) return;
    if (files.length !== 1) {
      setFontUploadError("一次只选择一个字体文件。");
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
        setNotice("字体已缓存，但无法保存当前选择。");
        return;
      }
      setNotice(`“${item.label}”已保存在此浏览器。`);
    } catch (e) {
      setFontUploadError(
        e instanceof Error ? e.message : "字体上传失败，请重试。",
      );
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
          setNotice("字体已删除，但无法保存默认选择。");
          return;
        }
      }
      setNotice("字体已从此浏览器删除。");
    } catch {
      setFontUploadError("删除失败，请检查浏览器存储状态后重试。");
    }
  }
  function chooseFont(id: FontId) {
    setFontId(id);
    setNotice("");
    void saveFontSelection(id).catch(() =>
      setFontUploadError("当前字体已应用，但无法保存选择。"),
    );
  }
  const busy = loading || exporting || uploadingFont,
    disabled = !source || busy || font !== "ready";
  const overflow =
    font === "ready" &&
    (textOverflows(left, fontId, layout) ||
      textOverflows(right, fontId, layout));
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="./">
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          <strong>片刻</strong>
          <span className="brand-divider" />
          <span className="brand-caption">明信片生成器</span>
        </a>
        <span className="local-pill">
          <LockKeyhole size={13} />
          仅在本地处理
        </span>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">A LITTLE MOMENT, A PERSONAL POSTCARD</div>
            <h1>
              把片刻，寄给远方<span>。</span>
            </h1>
            <p>一张照片，一句想说的话。留下属于你的风景。</p>
          </div>
          <div className="format-tag">
            <span>POSTCARD / 01</span>
            <strong>
              {sizeLabel} <small>mm</small>
            </strong>
            <span>{layout === "portrait" ? "竖向" : "横向"} · 标准明信片</span>
          </div>
        </div>
        <div className="workspace">
          <section className="preview-section" aria-label="明信片预览">
            <div className="section-top">
              <span>
                <span className="live-dot" />
                实时预览
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
                    aria-label="明信片构图，使用方向键或拖动移动图片"
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
                    <strong>这里，留给你的风景</strong>
                    <span>拖入一张图片，或点击选择</span>
                    <span className="empty-format">JPG / PNG / 静态 WebP</span>
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
                    <span
                      style={{
                        maxWidth: `${(textWidth / (W - 2 * TEXT_MARGIN)) * 100}%`,
                      }}
                    >
                      {left}
                    </span>
                    <span
                      style={{
                        maxWidth: `${(textWidth / (W - 2 * TEXT_MARGIN)) * 100}%`,
                      }}
                    >
                      {right}
                    </span>
                  </div>
                )}
              </div>
              <div className="paper-shadow" />
            </div>
            <div className="preview-bottom">
              <span>
                <Move size={14} />
                {source
                  ? "拖动图片调整构图 · 支持方向键微调"
                  : "选择图片后，即可拖动调整构图"}
              </span>
              <span>正面预览</span>
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
                  {source
                    ? `有效分辨率 ${Math.floor(ppi)} PPI`
                    : "让每一份心意，都清晰一点"}
                </strong>
                <p>
                  {source
                    ? ppi >= 300
                      ? "清晰度达到 300 PPI 推荐值，可放心导出。"
                      : "低于推荐的 300 PPI，仍可导出；建议使用更大图片或减小缩放。"
                    : "选择图片后自动检查清晰度，推荐 300 PPI 及以上。"}
                </p>
                {source && (
                  <p>
                    原始像素（方向归一化）：{source.width} × {source.height}
                    {source.limited
                      ? ` · 浏览器实际解码 ${source.bitmap.width} × ${source.bitmap.height}，PPI 按实际源计算`
                      : ""}
                  </p>
                )}
              </div>
              <span className="quality-badge">
                {source ? (ppi >= 300 ? "适合印刷" : "清晰度提醒") : "印刷提示"}
              </span>
            </div>
            <div className="process-note">
              <span>01 选择风景</span>
              <ChevronRight size={13} />
              <span>02 写下心意</span>
              <ChevronRight size={13} />
              <span>03 保存片刻</span>
            </div>
          </section>
          <aside className="editor">
            <div className="editor-heading">
              <SlidersHorizontal size={18} />
              <h2>制作你的明信片</h2>
            </div>
            <section className="control-section">
              <h3>
                <ImageIcon size={16} />
                图片与构图<span>01</span>
              </h3>
              <fieldset className="layout-picker" disabled={busy}>
                <legend>画布方向</legend>
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
                      <span>{value === "landscape" ? "横向" : "竖向"}</span>
                    </label>
                  ))}
                </div>
                <p className="helper">
                  {sizeLabel} mm · 切换方向会恢复图片构图
                </p>
              </fieldset>
              <input
                ref={input}
                data-testid="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
                  ? "正在读取图片…"
                  : source
                    ? "更换图片"
                    : "选择本地图片"}
                <ArrowUpRight size={16} />
              </button>
              <p className="helper filename">
                {source
                  ? source.name
                  : "JPG、PNG、静态 WebP · 最大 30 MiB / 40 MP"}
              </p>
              {source && (
                <fieldset className="crop-controls" disabled={busy}>
                  <label className="range-label" htmlFor="zoom">
                    图片缩放<span>{Math.round(crop.zoom * 100)}%</span>
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
                      旋转 90°
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setCrop({ ...initialCrop })}
                    >
                      <RotateCcw size={15} />
                      恢复构图
                    </button>
                  </div>
                </fieldset>
              )}
            </section>
            <section className="control-section">
              <h3>
                <Type size={17} />
                文字与白条<span>02</span>
              </h3>
              <div
                className={`strip-settings strip-settings-top ${stripEnabled ? "" : "is-off"}`}
              >
                <label className="switch-row">
                  <span>
                    <strong>添加文字与白条</strong>
                    <small>
                      {stripEnabled
                        ? "已开启，可继续设置下方内容"
                        : "已关闭，导出时不会绘制文字与白条"}
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
                    明信片字体
                    <select
                      value={fontId}
                      aria-describedby="font-description"
                      onChange={(e) => {
                        chooseFont(e.target.value as FontId);
                      }}
                    >
                      <optgroup label="内置字体">
                        {fonts.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                      {customFonts.length > 0 && (
                        <optgroup label="我的字体">
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
                    {selectedFont.description}
                    <br />
                    {selectedFont.license ? (
                      <>
                        免费开源 · 左右文字共用{" "}
                        <a
                          href={`${import.meta.env.BASE_URL}licenses/${selectedFont.license}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          字体许可 ↗
                        </a>
                      </>
                    ) : (
                      "本地缓存 · 左右文字共用"
                    )}
                  </p>
                  <p
                    className="font-status"
                    data-testid="font-status"
                    role="status"
                  >
                    {font === "loading"
                      ? `正在加载 ${selectedFont.label}…`
                      : font === "error"
                        ? "字体加载失败，预览保留上一版；请重试或选择其他字体。"
                        : `已应用：${selectedFont.label}`}
                  </p>
                  {font === "error" && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setFontRetry((n) => n + 1)}
                    >
                      重新加载字体
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
                      {uploadingFont ? "正在保存字体…" : "上传本地字体"}
                    </button>
                    <p className="helper">
                      TTF / OTF / WOFF / WOFF2 · 每款最大 20 MiB ·
                      保存于此浏览器
                    </p>
                    {catalogStatus === "loading" && (
                      <p className="helper" role="status">
                        正在读取本地字体缓存…
                      </p>
                    )}
                    {catalogStatus === "error" && (
                      <p className="inline-warning" role="alert">
                        无法读取本地字体缓存。
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setCatalogRetry((n) => n + 1)}
                        >
                          重试
                        </button>
                      </p>
                    )}
                    {customFonts.length >= MAX_CUSTOM_FONTS && (
                      <p className="helper">
                        最多保留 {MAX_CUSTOM_FONTS} 款，请先删除旧字体。
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
                        aria-label="已保存的本地字体"
                      >
                        {customFonts.map((item) => (
                          <li key={item.id}>
                            <span title={item.label}>{item.label}</span>
                            <button
                              type="button"
                              className="delete-font"
                              aria-label={`删除字体 ${item.label}`}
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
                      左侧文字
                      <input
                        maxLength={240}
                        value={left}
                        placeholder="写下地点、日期或一句话"
                        onChange={(e) => setLeft(e.target.value)}
                      />
                    </label>
                    <label className="text-field">
                      右侧文字
                      <input
                        maxLength={240}
                        value={right}
                        placeholder="署名或补充信息"
                        onChange={(e) => setRight(e.target.value)}
                      />
                    </label>
                  </div>
                  <p className="helper copy-layout-helper">
                    32px 字号 · 左右对齐 · 单行排版
                  </p>
                  {overflow && (
                    <p className="inline-warning text-overflow">
                      文字超出 {textWidth}px
                      文字框，超出部分将被裁切。请缩短文案。
                    </p>
                  )}
                  <div className="opacity-control">
                    <label className="range-label" htmlFor="opacity">
                      白条不透明度<span>{Math.round(opacity * 100)}%</span>
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
                      <span>通透</span>
                      <span>纯白</span>
                    </div>
                  </div>
                </fieldset>
              )}
            </section>
            <section className="export-section">
              <h3>
                <ArrowDownToLine size={17} />
                保存明信片<span>03</span>
              </h3>
              <button
                className="primary"
                disabled={disabled}
                onClick={() => requestExport("png")}
              >
                <ArrowDownToLine size={17} />
                {exporting ? "正在生成文件…" : "下载 PNG"}
                <span>300 PPI</span>
              </button>
              <button
                className="pdf-button"
                disabled={disabled}
                onClick={() => requestExport("pdf")}
              >
                下载打印 PDF
                <ArrowUpRight size={16} />
              </button>
              <p className="export-hint">
                {!source
                  ? "请先选择图片，再下载明信片"
                  : font === "loading"
                    ? "正在加载所选字体…"
                    : font === "error"
                      ? "字体加载失败，请重试"
                      : `${sizeLabel} mm · 打印时选择「实际大小 / 100%」`}
              </p>
            </section>
          </aside>
        </div>
        <div className="messages" aria-live="polite">
          {loading && <p role="status">正在解码图片，请稍候…</p>}
          {error && (
            <p className="error" role="alert">
              {error}
              <button aria-label="关闭提示" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </p>
          )}
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
          片刻 <span className="footer-dot">·</span> 把喜欢的瞬间，好好收藏。
        </span>
        <span>
          <LockKeyhole size={13} />
          图片、文字与本地字体仅在浏览器处理，不会上传
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
        <h2 id="confirm-title">这张图片的清晰度偏低</h2>
        <p>
          当前有效分辨率为 {Math.floor(ppi)} PPI，低于推荐的 300
          PPI。印刷时可能模糊，导出不会增加原图细节。
        </p>
        <div className="dialog-actions">
          <button className="text-button" onClick={() => setConfirm(null)}>
            返回调整
          </button>
          <button
            className="primary"
            onClick={() => confirm && void doExport(confirm)}
          >
            仍然下载 {confirm?.toUpperCase()}
          </button>
        </div>
      </dialog>
    </div>
  );
}
