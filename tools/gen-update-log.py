#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 CHANGELOG.md 生成 js/update-log.js（玩家可见更新日志）。

用法（Windows git-bash / 任意）:
    python tools/gen-update-log.py

规则:
  - 按 `## [vX.Y.Z] — 日期` 切分版本块; 跳过 `## [未发布]` 段。
  - 版本号去 v 前缀; 日期取 YYYY-MM-DD; 主题取 `> 主题：xxx` 或 `> xxx` 行。
  - 条目: 只收玩家向分区(新增/改动/优化/平衡/修复/调整等), 跳过技术向分区
    (技术/重构/文档/其他), 其余自定义分区默认收录。
  - 输出 window.UPDATE_LOG = [{ version, date, title, items: [..] }, ...]。
"""
import re
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHANGELOG = os.path.join(ROOT, 'CHANGELOG.md')
OUT = os.path.join(ROOT, 'js', 'update-log.js')

# 技术向分区（玩家不关心，跳过）
TECH_SECTIONS = ('技术', '重构', '文档', '其他')

# 版本标题: ## [v1.0.13] — 2026-10-08  或  ## [1.0.0] — 首个完整版本
VER_RE = re.compile(r'^##\s+\[([^\]]+)\]')


def parse():
    with io.open(CHANGELOG, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    versions = []
    cur = None          # 当前版本块
    cur_section = None  # 当前分区名（None = 版本头部，尚未进入任何分区）

    for line in lines:
        m = VER_RE.match(line)
        if m:
            # 新版本块开始
            raw_ver = m.group(1).strip()
            if raw_ver.startswith('未发布'):
                cur = None
                cur_section = None
                continue
            # 提取版本号（去 v 前缀）
            vm = re.search(r'(\d+\.\d+\.\d+)', raw_ver)
            version = vm.group(1) if vm else raw_ver
            # 提取日期
            dm = re.search(r'(\d{4}-\d{2}-\d{2})', line)
            date = dm.group(1) if dm else ''
            cur = {'version': version, 'date': date, 'title': '', 'items': []}
            versions.append(cur)
            cur_section = None
            continue

        if cur is None:
            continue

        stripped = line.strip()

        # 主题行: > 主题：xxx 或 > xxx
        if stripped.startswith('> ') and cur['title'] == '':
            title = stripped[2:].strip()
            title = re.sub(r'^主题[：:]\s*', '', title)
            cur['title'] = title
            continue

        # 分区标题: ### xxx
        if stripped.startswith('### '):
            cur_section = stripped[4:].strip()
            continue

        # 条目: - 开头（含缩进子条目 "  - "）
        if stripped.startswith('- '):
            item = stripped[2:].strip()
            if not item:
                continue
            # 跳过技术向分区下的条目
            if cur_section and any(t in cur_section for t in TECH_SECTIONS):
                continue
            cur['items'].append(item)
            continue

        # 缩进子条目 "  - xxx" 在 strip 后已变成 "- xxx"，上面已覆盖

    return versions


def render(versions):
    parts = []
    parts.append('// 由 tools/gen-update-log.py 从 CHANGELOG.md 自动生成，请勿手改。')
    parts.append('// 每次部署前运行: python tools/gen-update-log.py')
    parts.append('window.UPDATE_LOG = [')
    for i, v in enumerate(versions):
        parts.append('  {')
        parts.append("    version: %r," % v['version'])
        parts.append("    date: %r," % v['date'])
        parts.append("    title: %r," % v['title'])
        parts.append('    items: [')
        for item in v['items']:
            parts.append('      %r,' % item)
        parts.append('    ],')
        parts.append('  },')
    parts.append('];')
    parts.append('')
    return '\n'.join(parts)


def main():
    versions = parse()
    if not versions:
        raise SystemExit('未解析到任何已发布版本')
    js = render(versions)
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print('生成 %s（%d 个版本，最新 %s）' % (OUT, len(versions), versions[0]['version']))
    for v in versions[:3]:
        print('  - v%s (%s) %d 条' % (v['version'], v['date'], len(v['items'])))


if __name__ == '__main__':
    main()
