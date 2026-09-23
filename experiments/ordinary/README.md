# Ordinary action generation — experimental

This source-only prototype regenerates the 11 standard ordinary animations from
the same validated v2 appearance resources as the ragdoll provider. It is excluded
from the published plugin archive. There is no new SDK method or remote generation
protocol in version 0.2.0.

`createOrdinaryGenerator({ appearance, peekNeckUv })` returns `renderLayers(clip,
frame)`, `inspect()` and an idempotent `dispose()`. `appearance` uses the existing
bound resource URLs. `peekNeckUv` is the photo-specific chin landmark, supplied by
the character author; neither personal landmarks nor images are built into this
module. Its coordinates are normalized photo coordinates, with Y increasing down.

Layers contain a 416×416 transparent body PNG, an unclipped photo PNG at 3× density,
an attachment anchor, photo origin, and peek visibility metadata. The companion
experiment composites the photo at the chosen scale and validates PNGs with the
host's existing ordinary format checker. This is an authored sequence, not a
physics simulation. `send` uses the authored hauling pose; withdrawal and hold
reuse entering frames. Game-only actions are outside the standard set.

Run `npm test` for pure contract boundaries. Full GPU fidelity, costs and normal
host playback require the private-fixture harness in the host worktree. The
module alone does not prove cross-machine performance. Do not publish personal
fixtures, generated frames, logs, or previews to this repository.

The optimized experimental route calls `renderPixels()` and `composeFrame()`
inside the plugin, then passes the finished RGBA frame to a bounded encoder
worker. No intermediate PNGs or avatar-specific landmarks cross that boundary.
The PNG-layer method remains available as an independent fidelity/performance
baseline. The host-side transport used by the private benchmark is not an SDK
extension and does not change the released provider.

中文：这是仅源码的普通动作生成实验，不改变已发布插件或宿主 SDK。
生成器只读取 v2 原材料；照片领口定位由形象输入提供。男女形象、不同头比例的
完整图片对照和真实宿主播放验证在私人测试夹具中进行，不能将此视为已完成跨机加速。
优化路径在插件内完成头像与身体合成，只向实验编码器交付完整RGBA；不传中间PNG，
也不要求宿主理解形象部位。原分层PNG路径保留作为对照，正式SDK尚未增加生成入口。
