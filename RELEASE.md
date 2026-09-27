本地候选 `0.2.1-preview.1`（未发布）：浏览器刷新驱动出帧，空闲暂停；抓取点直接跟随最新输入。大幅移动时整体平移布偶，保持原有限定的关节相对位移，避免突然增加甩动力。继续沿用一个在途帧的 ACK 约束、现有轻放/抛出分类和恢复流程。桌面最终手感待用户试玩。

Unreleased local candidate `0.2.1-preview.1`: repaint-driven scheduling with idle suspension and direct pointer anchoring. Large pointer jumps carry the whole rig while preserving the original bound on relative constraint travel, avoiding excess throw energy. Existing single-frame backpressure, release classification and recovery remain intact. Native desktop feel awaits manual acceptance.

---

通用布偶物理与渲染套件，包含抓取、轻放/抛出判定、自由落体、落地恢复及衣服蒙皮。无头像、服装贴图或角色形象，单独安装不会替换宠物。

实验版本：需支持实时渲染的受邀测试宿主（兼容基线 `0.26.0-ragdoll.1`）及 `dataVersion: 2` 角色包。旧 `0.26.0` 不支持；旧 v1 私人角色包需配套升级，未升级时使用普通动作。宿主不公开分发。

Generic ragdoll physics and rendering toolkit with grabbing, release-intent detection, falling, recovery and garment skinning. Contains no character assets. Installation does not apply an appearance.

Experimental release for an invited realtime-capable host build (`0.26.0-ragdoll.1` compatibility baseline) and v2 appearance data. The older `0.26.0` host is unsupported. Legacy v1 appearance packages need migration; ordinary animations remain their fallback. This release does not distribute a host installer.

The attached plugin ZIP is generated and audited by public CI. See `sha256.txt` for its digest.
