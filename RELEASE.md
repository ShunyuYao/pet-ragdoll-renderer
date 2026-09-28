本地候选 `0.2.1-preview.2`（未发布）：甩出速度门槛由 1.1 降为 0.55 DIP/ms，采样窗口由 100 放宽为 120 ms。中等力度甩动、短甩与稍迟松手更容易触发；慢拖、停稳、反向慢调仍为轻放。沿用已验收的刷新调度、抓取跟手、一个在途帧 ACK 约束及恢复流程。最终手感待本机试玩。

Local unreleased candidate: halve the throw threshold to 0.55 DIP/ms and extend the recent-motion window to 120 ms. Preserve deliberate placement, rest expiry, direction reversals, responsive dragging and frame backpressure. No SDK, permission or appearance-data changes.
