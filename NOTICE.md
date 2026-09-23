# Attribution / 开源来源

- Three.js 0.164.1: MIT, retained in `vendor/LICENSE.three`.
- cannon-es 0.20.0: MIT, retained in `upstream/LICENSE.cannon-es`.
- Ragdoll rig adapted from pmndrs/cannon-es `examples/ragdoll.html`, commit `dd971c4a604acdbb211955382e7a80de1f31edfb`. Original example, license and checksums are retained under `upstream/`. The example is provenance, not a runtime entry point.
- `ragdoll-adapter.js` adjusts proportions, part names, damping and joint limits. Garment skinning, photo contour mounting, release-intent sampling, recovery and the host bridge are distributed under the root MIT license.

本项目不包含头像、照片、衣服贴图或角色轮廓文件。运行时只使用宿主为当前会话提供的素材句柄；角色素材需由其拥有者单独提供并负责授权。

No portraits, photographs, clothing textures or character silhouette files are distributed. The owning appearance package supplies session-scoped assets and is responsible for their rights. No personal avatar packages or host installers are included.
