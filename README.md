# 职途 · 自动化求职作战台

一个本地优先、面向自动化/电气/工业机器人方向求职者的求职管理网页应用。

![职途图标](assets/icon-256.png)

## 项目定位

职途围绕真实求职流程设计，用来管理能力档案、岗位匹配、简历、投递进度、公司查询和面试准备。数据默认保存在当前浏览器的 LocalStorage 中，不需要注册账号，也不会自动上传个人数据。

## 主要功能

- 能力档案：技能等级、项目证据、教育信息和目标岗位
- 岗位与匹配：导入招聘 JD，计算技能匹配度和技能缺口
- 自动筛选：关注词、排除词、最低匹配分、城市、应届要求
- 招聘平台跳转：BOSS直聘、智联招聘、前程无忧、猎聘、实习僧、国聘等
- 网页采集器：用户主动复制当前招聘页面文字后导入
- 简历工坊：按岗位重排技能和项目，支持复制、打印和 PDF
- 投递看板：跟踪投递状态和下一步行动
- 面试准备：自动化方向题库和 STAR 回答提示
- AI 面试：支持浏览器模型、兼容 API、Ollama / LM Studio 和离线训练模式
- 公司查询：官方网页搜索跳转、公司研究档案和公开页面文字字段提取
- 数据备份：JSON 导入导出，完全由用户控制

## 手机使用

手机浏览器直接打开：

https://xuningan.github.io/zhitu-career-copilot/

仓库地址：https://github.com/xuningan/zhitu-career-copilot

- Android Chrome / Edge：菜单 → 添加到主屏幕 / 安装应用
- iPhone Safari：分享 → 添加到主屏幕

手机和电脑的数据分别保存在各自浏览器中，不会自动同步。同步方式：

1. 在电脑端进入“设置” → “导出数据备份”
2. 把 JSON 文件发送到手机
3. 在手机端进入“设置” → “导入备份”

不要将导出的 JSON 备份上传到公开仓库。

## 本地运行

可以直接双击 `index.html` 使用。更推荐使用本地 HTTP 服务，避免浏览器对本地文件和剪贴板的限制。

Windows 下也可以双击 `启动求职台.cmd`。

## 开源协议

本项目使用 MIT License，详见 [LICENSE](LICENSE)。

## 使用边界

- 不自动登录招聘平台
- 不绕过验证码
- 不批量爬取招聘网站
- 不自动海投
- AI 输出仅作为面试练习和内容组织参考
- 招聘平台页面结构变化可能导致采集或跳转失效
## Android APK

GitHub Actions 会自动构建 Android 安装包，构建完成后可在 Releases 页面下载：

https://github.com/xuningan/zhitu-career-copilot/releases

直接下载 APK：

https://github.com/xuningan/zhitu-career-copilot/releases/download/android-v0.3.0/zhitu-career-copilot-android.apk
