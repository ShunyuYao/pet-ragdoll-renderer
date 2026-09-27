# 布偶基础套件 · Pet Ragdoll Renderer

独立的桌宠实时渲染插件：通用刚体骨架、抓取与抛出、落地恢复、衣服蒙皮及透明画面输出。**没有附带角色形象、头像、衣服图片或轮廓数据。** 安装本插件不会换装；需另外安装兼容的角色数据包。

Generic desktop-pet ragdoll physics and rendering provider. **No character assets, portraits, clothing images or silhouette data are bundled.** Installing the provider does not apply an appearance. A compatible, separately supplied appearance package is required.

## 兼容范围 / Compatibility

- Plugin ID: `rat-doll-renderer`; plugin version: `0.2.1-preview.1`.
- Experimental host render bridge `apiVersion: 1`; appearance `dataVersion: 2`.
- Compatibility baseline: invited macOS arm64 host candidate `0.26.0-ragdoll.1`. The older `0.26.0` host does not support renderer plugins and rejects this kind. Host installers remain available only through invited testing; none are distributed here.
- 当前是实验套件，仅面向具备实时渲染能力的受邀测试宿主。宿主版本比较目前不严格区分候选后缀，不能仅凭 `≥ 0.26.0` 判断支持。旧宿主会在插件种类校验处拒绝安装。
- v1 私人角色包只提供头像，没有衣服资源，因此不属于本套件支持的数据版本。迁移到 v2 后可保留原来的衣服、头部比例与普通动画。未迁移的角色继续使用普通动作回退，不会被替换成另一个形象。
- Windows and native OS focus/mouse-passthrough behavior are not claimed as verified by the macOS hidden-rendering checks.

## 职责 / Responsibilities

The plugin owns the Three.js 0.164.1 / cannon-es 0.20.0 rig, garment geometry and skinning, photo contour mounting, release intent, falling and recovery. The host owns input, screen placement, resource validation, permission, lifecycle and presentation. Physics renders locally; cross-device visits transfer data, not executable provider code or continuous RGBA video. Both clients must install and authorize a compatible provider for realtime dragging.

宿主普通动作仍使用原来的 PNG 播放机制。本版本未实现普通动画本地生成，不承诺消除普通帧首次跨机传输的等待。

## 本地流畅度候选 / Local smoothness candidate

`0.2.1-preview.1` follows browser repaints while physics is active, pauses when idle, and retains one unacknowledged RGBA frame at most. The grab anchor follows the latest pointer position; large pointer jumps carry the rig without injecting an excessive constraint impulse, while ordinary movement keeps its existing physical response. This is an unreleased test candidate, not a universal frame-rate guarantee.

本地待试玩版本：修正原 30 fps 限速及不均匀出帧；移除抓取锚点的额外追赶速度限制。普通动作、释放判断、角色素材与 SDK 不变；真实桌面手感尚待验收。

## 权限 / Permissions

Only `appearance:render`. No tool, panel, general SDK, filesystem, account or network permissions. The host gives the sandbox immutable parameters and session-bound asset URLs; the provider submits bounded RGBA frames through `pet.render`. It does not fetch models or code from the Internet. Missing or unauthorized providers leave ordinary animations available; invalid data fails explicitly.

只申请当前会话的实时形象渲染权限，不直接访问用户文件、不上传照片、不静默安装或更新任何插件。开源依赖已随包携带，运行不依赖 CDN。

## 角色数据 v2 / Appearance data v2

The owning asset plugin's `character.json` supplies:

```json
{
  "realtime": {
    "renderer": "rat-doll-renderer",
    "dataVersion": 2,
    "data": "realtime/data.json",
    "assets": {
      "head": "realtime/head.png",
      "topFront": "realtime/top-front.png",
      "topBack": "realtime/top-back.png",
      "topFrontBump": "realtime/top-front-bump.png",
      "topBackBump": "realtime/top-back-bump.png",
      "topShape": "realtime/top-shape.json",
      "bottomFront": "realtime/bottom-front.png",
      "bottomBack": "realtime/bottom-back.png",
      "bottomFrontBump": "realtime/bottom-front-bump.png",
      "bottomBackBump": "realtime/bottom-back-bump.png",
      "bottomShape": "realtime/bottom-shape.json"
    }
  }
}
```

`realtime/data.json` contains resource keys, never URLs or executable source:

```json
{
  "person": "male",
  "headScale": 1.35,
  "garments": {
    "top": {
      "kind": "tee",
      "assets": {"front":"topFront","back":"topBack","frontBump":"topFrontBump","backBump":"topBackBump","shape":"topShape"}
    },
    "bottom": {
      "kind": "shorts",
      "assets": {"front":"bottomFront","back":"bottomBack","frontBump":"bottomFrontBump","backBump":"bottomBackBump","shape":"bottomShape"}
    }
  }
}
```

`person` selects a legacy attachment/skin preset (`male` or `female`), not an identity or a bundled character. `headScale` is 0.75–2. Top geometry presets: `sweater`, `tee`, `shirt`; bottom: `denim`, `shorts`, `jeans`. These are algorithms and dimensions only. Each appearance supplies its own textures and contour. This release is a reusable humanoid rig, not an arbitrary imported skeleton/GLB player.

轮廓 JSON 为 `{outline:[[u,v],...],distance:{size,pixels}}`：3–1024 个归一化轮廓点，距离图边长 2–128，像素为 0–255 的有限数值。整数距离图可改用 `distance:{size,bytes}`，其中 `bytes` 是逐行 uint8 字节的规范 Base64；这是无损编码，不改轮廓精度。两种编码不能同时使用。单个 JSON 必须不超过宿主的 64 KiB 限额，超限时使用字节编码；这不放宽宿主资源预算。

Distance maps may use either bounded numeric `pixels` or lossless row-major uint8 Base64 `bytes`, never both. Decoded length must equal `size²`. Keep each JSON asset within the host's 64 KiB budget. Texture, contour and geometry preset must match. Appearance owners remain responsible for asset rights.

v2 头像和衣服贴图仅支持 PNG，每边不超过 2048；九个图像槽总计不超过 8 MiPixels。加载前检查尺寸，避免压缩很小但解码巨大的图片。衣服细分单面最多 12,000 顶点、24,000 三角；超限或空轮廓显式失败。PNG textures are checked before image decoding, with an aggregate 8 MiPixels budget; derived garment geometry is bounded independently of JSON size.

## 构建与测试 / Build and test

Node.js 22 + Python 3; no npm dependency installation is required.

```sh
npm run test:delivery
```

This runs contract and release-motion tests, builds `dist/plugin.zip`, verifies exact source parity, vendor checksums, absence of image assets, and deterministic ZIP bytes. Public CI repeats the gate; a `v*` tag publishes its CI-generated ZIP and SHA-256 as a prerelease. Never package private test fixtures into this repository.

真实宿主验收与公开 CI 单元检查分开：在隔离的受邀宿主中，从市场管线安装并授权，使用自带的私人 v2 角色验证抓取、轻放、抛出、比例保存、重启及串门回退。私人照片、测试截图和宿主安装包不上传公开 CI。

See [NOTICE.md](NOTICE.md) for upstream licenses and attribution.
