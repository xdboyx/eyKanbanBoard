---
name: Professional-Services Editorial Design System
description: 由一個專業服務品牌網站反向解析而來的設計系統參考。網站以深炭灰為底、品牌黃 #FFE600 作為唯一強調色。
source: 實際網站反向解析（2026-10-04，1440×900 viewport）

colors:
  accent.yellow: "#FFE600"      # 品牌強調色（品牌黃）
  ink.900: "#1A1A24"            # 最深底色，深色卡片與搜尋欄底
  ink.800: "#2E2E38"            # 頁首底色，主要文字色與主要深色底
  gray.600: "#747480"           # 深底上的邊框與分隔線
  gray.300: "#C4C4CD"           # 深底上的次要文字、列印邊框
  gray.250: "#CACAD1"           # 深底上的地區站標題
  gray.100: "#EAEAF2"           # 捲軸底，淺灰區塊底
  white: "#FFFFFF"
  black: "#000000"
  divider.onDark: "rgba(255,255,255,0.2)"   # 深底上的細分隔線

typography:
  family.sans: "Brand Sans, 'Noto Sans', sans-serif"
  family.cjk: "georgia, 青黑体, 'Hiragino Sans GB', 微软雅黑, 'Microsoft YaHei', 黑体, simhei, serif"
  weights: [300, 400, 700]
  scale:
    display:   { size: 40px, lineHeight: 48px,   weight: 300 }
    h2:        { size: 32px, lineHeight: 38.4px, weight: 300 }
    cardTitle: { size: 24px, lineHeight: 28.8px, weight: 300 }
    h3:        { size: 20px, lineHeight: 32px,   weight: 400 }
    lead:      { size: 18px, lineHeight: 21.6px, weight: 300 }
    body:      { size: 16px, lineHeight: 24px,   weight: 300 }
    bodyLoose: { size: 16px, lineHeight: 28px,   weight: 300 }
    label:     { size: 16px, lineHeight: 22px,   weight: 700 }
    small:     { size: 14px, lineHeight: 22px,   weight: 700 }
    caption:   { size: 14px, lineHeight: 21px,   weight: 400 }

spacing: [4, 8, 12, 16, 24, 32, 40, 68]

rounded:
  none: 0px
  sm: 3px
  full: 50%

elevation:
  1: "0px 8px 10px 0px rgba(46,46,56,0.3)"

breakpoints:
  xs: "max-width: 599.98px"
  sm: "600px – 899.98px"
  md: "900px – 1199.98px"
  lg: "min-width: 1200px"
  maxContent: 1920px
---

# Professional-Services Editorial Design System

## 1. 品牌概覽

這是一個專業服務品牌。網站的視覺語言：大面積的深炭灰（#2E2E38 / #1A1A24）搭配單一高彩度的品牌黃（#FFE600），幾乎不使用其他色相。整體氣質是「沉穩、權威、編輯感」，用細字重（300）的大標題營造雜誌式的版面節奏。

頁首左上角是品牌標誌，旁邊附一行兩列排版的英文標語（logo lockup）。

## 2. 色彩

| Token | Hex | 用途 |
|---|---|---|
| `accent.yellow` | #FFE600 | 品牌黃。唯一強調色：深色卡片標題、卡片頂部 4px 色條、主要 CTA 底色、電子報訂閱橫幅底色。原始碼中為品牌的強調色 token |
| `ink.900` | #1A1A24 | 最深底色：精選卡片底、搜尋欄底 |
| `ink.800` | #2E2E38 | 主要文字色（淺底時）、頁首與大部分深色區塊底 |
| `gray.600` | #747480 | 深底上的邊框、分隔線、標籤外框 |
| `gray.300` | #C4C4CD | 深底上的次要文字、淺底上的細邊框 |
| `gray.100` | #EAEAF2 | 淺灰區塊底、捲軸底 |
| `white` | #FFFFFF | 淺色區塊底、深底上的主要文字 |

**規則**
- 黃色只用於「強調」，從不用於大段內文。深底上的黃字只出現在標題層級（24px 以上）。
- 黃底上一律使用 `ink.800` 文字與 `ink.800` 1px 邊框，絕不配白字。
- 頁面以深色區塊為主、白色區塊為輔，交替排列形成節奏；網站將深黑主題設為獨立的主題 token。

## 3. 字體

- 拉丁字使用品牌專屬字體 **Brand Sans**（300 / 400 / 700），後備為 `Noto Sans`。
- 中文內容實際落在 `georgia, 青黑体, Hiragino Sans GB, 微软雅黑…` 這組字體堆疊。
- 只使用三種字重：300（標題與內文）、400（次要標題）、700（按鈕、標籤、強調）。
- 大標題刻意使用 **Light 300**，而不是粗體——這是品牌最具辨識度的排版特徵之一。
- 不使用 text-transform、不調整 letter-spacing（皆為 normal）。

| 層級 | 尺寸 / 行高 / 字重 | 範例 |
|---|---|---|
| Display | 40 / 48 / 300 | e.g.「服務洞察」、「近期動態」 |
| H2 | 32 / 38.4 / 300 | e.g.「策略與成長」 |
| Card title | 24 / 28.8 / 300 | e.g.「導入新流程遇到瓶頸？最快見效的切入點，也許就在財務團隊」 |
| H3 | 20 / 32 / 400 | 新聞稿標題 |
| Body | 16 / 24 / 300 | 卡片摘要 |
| Body loose | 16 / 28 / 300 | 日期、地點等 meta |
| Label | 16 / 22 / 700 | 按鈕文字 |
| Small | 14 / 22 / 700 | 標籤 chip |

## 4. 間距與版面

- 間距基數 4px：4 / 8 / 12 / 16 / 24 / 32 / 40。
- 1440px 視窗下，主內容寬 1304px，左右各 68px 外距；外層容器上限 1920px。
- 三欄卡片格線：424px × 3，欄距 16px（424×3 + 16×2 = 1304）。
- 二欄圖文區塊：644px 寬圖片，16:9。
- 常用 gap：8px（行內元素）、16px（卡片）、20px/30px（列表）、40px（大區塊）。

## 5. 圓角

| Token | 值 | 用途 |
|---|---|---|
| `rounded.none` | 0px | 預設——卡片、按鈕、圖片、區塊全部直角 |
| `rounded.sm` | 3px | 僅用於小型標籤 chip 與搜尋按鈕 |
| `rounded.full` | 50% | 圓形圖示按鈕（輪播暫停鍵） |

直角是預設，圓角是例外。

## 6. 陰影與層次

- 幾乎不用陰影；層次靠「色塊明度差」建立（#1A1A24 卡片放在 #2E2E38 區塊上）。
- 唯一的陰影：`0 8px 10px rgba(46,46,56,0.3)`，用於浮動選單。

## 7. 元件

### 頁首（Global header）
- 高 75px，底色 `ink.800`，白字。
- 左：品牌標誌 + 標語；中：5 個一級主選單（e.g.「洞察 / 服務 / 產業 / 職涯 / 關於我們」）；右：搜尋、會員入口、地區／語言切換。
- 捲動後固定於頂部。

### Hero
- 滿版影片/照片，左下角疊一顆深色「播放影片 03:08」按鈕：底 `ink.800`、白字 14/14/700、padding 16px 24px、直角，前置 Material Icons `play_circle_filled`。

### 精選內容卡
- 底 `ink.900`，頂部 4px `accent.yellow` 色條。
- 圖片 3:2（424×283），直角，滿版於卡片頂部。
- 標題 24/28.8/300 黃色；摘要 16/24/300 白色。
- 整張卡片是一個連結。

### 新聞稿列表卡
- 白底，標題 20/32/400 `ink.800`。
- meta 列：日期 ｜ 地點 ｜ 發布單位，16/28/300。

### 按鈕
| 變體 | 底 | 文字 | 邊框 | padding |
|---|---|---|---|---|
| 深底次要（outline on dark） | `ink.800` | white | 1px white | 16px 24px |
| 深底緊湊 | `ink.800` | white | 1px `gray.600` | 10px 39px |
| 主要（黃底） | `accent.yellow` | `ink.800` | 1px `ink.800` | 12px 24px |
| 淺底次要 | white | `ink.800` | 1px `ink.800` | 16px 24px |

- 字型 16/22/700，直角，高度 44 或 56px。
- 典型文案：e.g.「探索我們的數位服務」、「了解更多」、「訂閱／重播」、「訪問新聞中心」。
- 訂閱按鈕會開啟外部行銷表單。

### 標籤 chip（快速熱門連結）
- 透明底、白字 14px/700、1px `gray.600` 邊框、圓角 3px、padding 3px 9px。

### 電子報橫幅
- 滿版 `accent.yellow` 底，高約 248px，兩列：電子報訂閱（標題 + 一行說明，e.g.「訂閱電子報 / 每月精選文章直送信箱。」）+「訂閱」按鈕；期刊下載（e.g.「下載本期季刊」）+「PDF」按鈕。按鈕為黃底版本。

### 子品牌區塊
- 純黑 #000 底，左側子品牌標誌，H2 標題（e.g.「策略與成長」），一段子品牌介紹內文，下方「了解更多」緊湊按鈕。

### 搜尋 CTA
- 白底 `ink.800` 字 14/22/700，1px `ink.800` 邊框，圓角 3px，前置 search 圖示，文案 e.g.「搜尋網站內容」。

### 頁尾
- 白底，左側品牌標誌 + 標語，下方一段法律聲明（說明品牌所屬的全球組織架構）；右側連結（e.g.「聯絡我們 / 關於我們 / 會員入口 / 網站導覽 / 免責與隱私聲明」）與社群圖示（LinkedIn、Facebook、YouTube）。

## 8. 響應式

| 斷點 | 範圍 |
|---|---|
| xs | ≤ 599.98px |
| sm | 600 – 899.98px |
| md | 900 – 1199.98px |
| lg | ≥ 1200px |

- 三欄卡片於 md 以下轉二欄、xs 轉單欄。
- 支援 `prefers-reduced-motion: reduce`（停用輪播自動播放）。

## 9. 設計原則（Do / Don't）

**Do**
- 用深炭灰大色塊建立畫面，黃色只做點綴。
- 大標題用 Light 300，靠尺寸而非字重建立階層。
- 一律直角；只有小 chip 允許 3px。
- 用明度差（#1A1A24 vs #2E2E38）代替陰影分層。

**Don't**
- 不要在黃底上放白字。
- 不要引入第二個強調色相。
- 不要把卡片做成圓角或加重陰影。
- 不要在同一區塊同時出現黃色標題與黃色按鈕以外的黃色元素。
