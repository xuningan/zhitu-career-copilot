(function () {
  "use strict";

  const E = window.CareerEngine;
  const STORAGE_KEY = "career_copilot_state_v1";
  const VIEW_META = {
    dashboard: { title: "求职总览", kicker: "Personal Career Ops" },
    profile: { title: "能力档案", kicker: "Capability Profile" },
    jobs: { title: "岗位与匹配", kicker: "Job Intelligence" },
    company: { title: "公司查询", kicker: "Company Research" },
    resume: { title: "简历工坊", kicker: "Resume Studio" },
    tracker: { title: "投递看板", kicker: "Application Pipeline" },
    interview: { title: "面试准备", kicker: "Interview Coach" },
    ai: { title: "AI 模拟面试", kicker: "AI Interviewer" },
    settings: { title: "数据与设置", kicker: "Local Data" }
  };
  const BOARD_COLUMNS = [
    { label: "待评估", statuses: ["待评估"] },
    { label: "准备投递", statuses: ["准备投递"] },
    { label: "已投递", statuses: ["已投递"] },
    { label: "笔试 / 面试", statuses: ["笔试/测评", "面试"] },
    { label: "结果", statuses: ["Offer", "已结束"] }
  ];

  let activeView = "dashboard";
  let state = loadState();
  let jobSearch = "";
  let jobStatusFilter = "全部";
  let jobDecisionFilter = "全部";
  let companySearch = "";
  let aiBusy = false;
  let resumeJobId = state.jobs[0] ? state.jobs[0].id : "";
  let interviewJobId = state.jobs[0] ? state.jobs[0].id : "";
  let modalContext = {};

  const view = document.getElementById("view");
  const pageTitle = document.getElementById("page-title");
  const pageKicker = document.getElementById("page-kicker");
  const modalRoot = document.getElementById("modal-root");
  const importFile = document.getElementById("import-file");
  const sidebar = document.querySelector(".sidebar");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return E.clone(E.DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      if (!E.validateState(parsed)) return E.clone(E.DEFAULT_STATE);
      return normalizeSavedState(parsed);
    } catch (error) {
      return E.clone(E.DEFAULT_STATE);
    }
  }

  function normalizeSavedState(parsed) {
    const defaults = E.clone(E.DEFAULT_STATE);
    const savedSettings = parsed.settings || {};
    return {
      ...defaults,
      ...parsed,
      profile: { ...defaults.profile, ...(parsed.profile || {}) },
      settings: {
        ...defaults.settings,
        ...savedSettings,
        screening: { ...defaults.settings.screening, ...(savedSettings.screening || {}) },
        ai: { ...defaults.settings.ai, ...(savedSettings.ai || {}) },
        tianyancha: { ...defaults.settings.tianyancha, ...(savedSettings.tianyancha || {}) }
      },
      interviewAnswers: parsed.interviewAnswers || {},
      aiSessions: parsed.aiSessions || {}
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      showToast("保存失败，请先导出一份数据备份。", "error");
      return false;
    }
  }

  function getJob(id) {
    return state.jobs.find(function (job) { return job.id === id; }) || null;
  }

  function getAnalysis(job) {
    return E.analyzeJob(job, state.profile);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(date) {
    return E.formatDateCN(date);
  }

  function shortText(value, length) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= length) return text;
    return text.slice(0, length - 1) + "…";
  }

  function avgScore() {
    if (!state.jobs.length) return 0;
    const total = state.jobs.reduce(function (sum, job) {
      return sum + getAnalysis(job).score;
    }, 0);
    return Math.round(total / state.jobs.length);
  }

  function taskSort(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  }

  function render() {
    const meta = VIEW_META[activeView] || VIEW_META.dashboard;
    pageTitle.textContent = meta.title;
    pageKicker.textContent = meta.kicker;
    document.querySelectorAll(".nav-item").forEach(function (button) {
      button.classList.toggle("active", button.dataset.view === activeView);
    });
    document.getElementById("today-chip").textContent = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(new Date());

    const renderers = {
      dashboard: renderDashboard,
      profile: renderProfile,
      jobs: renderJobs,
      company: renderCompany,
      resume: renderResume,
      tracker: renderTracker,
      interview: renderInterview,
      ai: renderAIInterview,
      settings: renderSettings
    };
    view.innerHTML = (renderers[activeView] || renderDashboard)();
    view.focus({ preventScroll: true });
    if (window.scrollY > 20) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigate(nextView) {
    activeView = nextView;
    sidebar.classList.remove("open");
    render();
  }

  function showToast(message, type) {
    const region = document.getElementById("toast-region");
    const toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      setTimeout(function () { toast.remove(); }, 180);
    }, 2600);
  }

  function emptyState(title, text, actionHtml) {
    return '<div class="empty"><div><strong>' + escapeHtml(title) + '</strong><p>' +
      escapeHtml(text) + '</p>' + (actionHtml || "") + '</div></div>';
  }

  function renderDashboard() {
    const profileScore = E.profileCompleteness(state.profile);
    const days = E.daysUntil(state.profile.jobStartDate);
    const pendingTasks = state.tasks.filter(function (task) { return !task.done; });
    const activeJobs = state.jobs.filter(function (job) { return job.status !== "已结束"; }).length;
    const submitted = state.jobs.filter(function (job) {
      return ["已投递", "笔试/测评", "面试", "Offer"].indexOf(job.status) >= 0;
    }).length;
    const statusCounts = E.JOB_STATUSES.map(function (status) {
      return {
        status: status,
        count: state.jobs.filter(function (job) { return job.status === status; }).length
      };
    });
    const maxStatus = Math.max.apply(null, [1].concat(statusCounts.map(function (item) { return item.count; })));
    const topJobs = state.jobs
      .map(function (job) { return { job: job, analysis: getAnalysis(job) }; })
      .sort(function (a, b) {
        if (a.job.favorite !== b.job.favorite) return a.job.favorite ? -1 : 1;
        return b.analysis.score - a.analysis.score;
      })
      .slice(0, 4);
    const actions = pendingTasks.slice().sort(taskSort).slice(0, 6);
    const dateProgress = Math.max(5, Math.min(100, 100 - Math.max(0, days || 0) * 2.3));

    const hero = '<section class="hero">' +
      '<div class="hero-content">' +
        '<span class="eyebrow">● 求职启动模式</span>' +
        '<h2>把“准备找工作”变成每天可以完成的任务。</h2>' +
        '<p>你的能力档案已经预填了 PLC、Factory IO、ABB、SolidWorks 和减速器项目。先核对事实，再录入真实岗位，系统会按关键词和项目证据计算匹配度。</p>' +
        '<div class="hero-actions">' +
          '<button class="btn btn-primary" data-action="add-job">录入第一份 JD</button>' +
          '<button class="btn" data-view="profile" style="color:#dffaf3;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.17)">核对能力档案</button>' +
        '</div>' +
      '</div>' +
      '<div class="hero-side">' +
        '<div class="countdown-num">' + (days == null ? "—" : Math.max(0, days)) + '<small>天</small></div>' +
        '<div class="countdown-label">距离目标投递日 ' + escapeHtml(formatDate(state.profile.jobStartDate)) + '</div>' +
        '<div class="mini-progress"><span style="width:' + dateProgress + '%"></span></div>' +
      '</div>' +
    '</section>';

    const stats = '<div class="grid grid-4 mt-2">' +
      statCard("岗位池", activeJobs, "份待评估或进行中的岗位", "岗") +
      statCard("平均匹配", avgScore() + "%", "基于当前能力档案计算", "匹") +
      statCard("已经投递", submitted, "含笔试、面试与 Offer", "投") +
      statCard("待办任务", pendingTasks.length, "按截止日期优先处理", "办") +
    '</div>';

    const mainGrid = '<div class="grid grid-2 mt-2">' +
      '<section class="card card-pad">' +
        '<div class="card-head"><div><h3>下一步行动</h3><p>先把最容易遗漏的事情放到眼前</p></div>' +
        '<button class="btn btn-sm" data-action="add-task">＋ 添加任务</button></div>' +
        (actions.length ? '<div class="action-list">' + actions.map(actionItem).join("") + '</div>' :
          emptyState("暂时没有待办", "可以添加一个与投递、项目整理或技能补齐有关的任务。", '<button class="btn btn-soft" data-action="add-task">添加任务</button>')) +
      '</section>' +
      '<section class="card card-pad">' +
        '<div class="card-head"><div><h3>档案完成度</h3><p>你的个人资料越完整，生成内容越可靠</p></div>' +
        '<div class="score-ring" style="--score:' + profileScore + '"><span>' + profileScore + '%</span></div></div>' +
        profileProgressRows() +
      '</section>' +
    '</div>';

    const jobsSection = '<div class="section-title"><div><h3>优先岗位</h3><p>按收藏状态和匹配度排序</p></div>' +
      '<button class="btn btn-ghost btn-sm" data-view="jobs">查看全部 →</button></div>' +
      (topJobs.length ? '<div class="job-list">' + topJobs.map(function (item) {
        return jobCard(item.job, item.analysis, true);
      }).join("") + '</div>' : emptyState("还没有岗位", "录入真实招聘 JD 后，这里会显示匹配度与技能缺口。", '<button class="btn btn-primary" data-action="add-job">录入岗位</button>'));

    const pipeline = '<section class="card card-pad mt-2">' +
      '<div class="card-head"><div><h3>投递漏斗</h3><p>当前所有岗位的状态分布</p></div>' +
      '<button class="btn btn-sm" data-view="tracker">打开看板</button></div>' +
      '<div class="progress-list">' + statusCounts.map(function (item) {
        const width = Math.round(item.count / maxStatus * 100);
        return '<div class="progress-row"><span>' + escapeHtml(item.status) + '</span><div class="progress-track"><i style="width:' + width + '%"></i></div><b>' + item.count + '</b></div>';
      }).join("") + '</div>' +
    '</section>';

    return hero + stats + mainGrid + jobsSection + pipeline;
  }

  function statCard(label, value, note, icon) {
    return '<section class="card stat-card"><div class="stat-top"><span class="stat-label">' + escapeHtml(label) + '</span>' +
      '<span class="stat-icon">' + escapeHtml(icon) + '</span></div><div class="stat-value">' + escapeHtml(value) + '</div>' +
      '<div class="stat-note">' + escapeHtml(note) + '</div></section>';
  }

  function actionItem(task) {
    const overdue = task.due && task.due < E.todayISO();
    const related = task.relatedJobId ? getJob(task.relatedJobId) : null;
    return '<div class="action-item ' + (overdue && !task.done ? "overdue" : "") + '">' +
      '<button class="action-check" data-action="toggle-task" data-task-id="' + escapeHtml(task.id) + '" aria-label="完成任务"></button>' +
      '<div><strong>' + escapeHtml(task.title) + '</strong><small>' + (related ? escapeHtml(related.company + " · " + related.title) : "个人准备任务") + '</small></div>' +
      '<span class="action-date ' + (overdue ? "text-danger" : "") + '">' + escapeHtml(task.due ? formatDate(task.due) : "无期限") + '</span>' +
    '</div>';
  }

  function profileProgressRows() {
    const profile = state.profile;
    const items = [
      { label: "基本资料", value: [profile.name, profile.email, profile.phone, profile.city].filter(Boolean).length * 25 },
      { label: "技能档案", value: Math.min(100, (profile.skills || []).length * 14) },
      { label: "项目证据", value: Math.min(100, (profile.projects || []).length * 45) },
      { label: "项目描述", value: Math.round((profile.projects || []).filter(function (p) { return p.background && p.actions && p.result; }).length / Math.max(1, (profile.projects || []).length) * 100) }
    ];
    return '<div class="progress-list">' + items.map(function (item) {
      return '<div class="progress-row"><span>' + escapeHtml(item.label) + '</span><div class="progress-track"><i style="width:' + item.value + '%"></i></div><b>' + item.value + '%</b></div>';
    }).join("") + '</div>';
  }

  function renderProfile() {
    const profile = state.profile;
    const completeness = E.profileCompleteness(profile);
    const education = (profile.education && profile.education[0]) || {};
    const skills = E.getProfileSkills(profile);
    const grouped = skills.reduce(function (groups, skill) {
      if (!groups[skill.category]) groups[skill.category] = [];
      groups[skill.category].push(skill);
      return groups;
    }, {});
    const usedSkillIds = profile.skills.map(function (skill) { return skill.id; });
    const available = E.SKILL_LIBRARY.filter(function (skill) { return usedSkillIds.indexOf(skill.id) < 0; });

    const summary = '<section class="card card-pad">' +
      '<div class="profile-summary">' +
        '<div class="avatar">' + escapeHtml((profile.name || "你").slice(0, 1)) + '</div>' +
        '<div><h3>' + escapeHtml(profile.name || "姓名待填写") + '</h3><p>' + escapeHtml(profile.title || "自动化方向求职者") + '</p>' +
          '<div class="profile-meta"><span>目标：' + escapeHtml((profile.targetRoles || []).join(" / ") || "待填写") + '</span>' +
          '<span>城市：' + escapeHtml((profile.targetCities || []).join(" / ") || "待填写") + '</span>' +
          '<span>投递日：' + escapeHtml(formatDate(profile.jobStartDate)) + '</span></div></div>' +
        '<div class="score-ring" style="--score:' + completeness + '"><span>' + completeness + '%</span></div>' +
      '</div>' +
    '</section>';

    const basic = '<section class="card card-pad mt-2">' +
      '<div class="card-head"><div><h3>基本资料</h3><p>这些内容会进入定制简历与面试准备</p></div></div>' +
      '<form data-form="profile">' +
        '<div class="form-grid three">' +
          field("姓名", "name", profile.name, "text", "例如：张同学", true) +
          field("求职身份", "title", profile.title, "text", "自动化 / 电气控制方向 大四学生", true) +
          field("目标投递日", "jobStartDate", profile.jobStartDate, "date", "", true) +
          field("电话", "phone", profile.phone, "text", "用于简历，请自行填写") +
          field("邮箱", "email", profile.email, "email", "用于简历，请自行填写") +
          field("当前城市", "city", profile.city, "text", "例如：南京") +
          field("目标岗位", "targetRoles", (profile.targetRoles || []).join("、"), "text", "多个岗位用顿号分隔", true) +
          field("目标城市", "targetCities", (profile.targetCities || []).join("、"), "text", "多个城市用顿号分隔", true) +
          field("学校", "school", education.school || "", "text", "学校名称") +
          field("专业", "major", education.major || "", "text", "自动化相关专业", true) +
          field("学历", "degree", education.degree || "", "text", "本科在读（大四）", true) +
          field("就读时间", "period", education.period || "", "text", "例如：2022.09-2026.06") +
          '<div class="field full"><label for="summary">个人简介</label><textarea class="textarea" id="summary" name="summary" placeholder="描述专业背景、核心技能和求职方向">' + escapeHtml(profile.summary || "") + '</textarea><span class="field-hint">建议 2-4 句话，写清专业背景、掌握工具和项目成果。</span></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">保存基本资料</button></div>' +
      '</form>' +
    '</section>';

    const skillSection = '<section class="card card-pad mt-2">' +
      '<div class="card-head"><div><h3>技能档案</h3><p>等级越高，岗位匹配时获得的权重越高</p></div></div>' +
      (Object.keys(grouped).length ? '<div class="skill-groups">' + Object.keys(grouped).map(function (category) {
        return '<div><div class="skill-group-title"><span>' + escapeHtml(category) + '</span><span>' + grouped[category].length + ' 项</span></div>' +
          '<div class="skill-list">' + grouped[category].map(function (skill) {
            return '<span class="skill-chip"><b>' + escapeHtml(skill.name) + '</b>' + skillDots(skill.level) +
              '<button data-action="remove-skill" data-skill-id="' + escapeHtml(skill.id) + '" title="移除">×</button></span>';
          }).join("") + '</div></div>';
      }).join("") + '</div>' : emptyState("尚未添加技能", "从技能库选择你会使用的工具。", "")) +
      '<form class="form-grid three mt-2" data-form="skill">' +
        '<div class="field"><label for="skillId">技能</label><select class="select" id="skillId" name="skillId" required>' +
          (available.length ? available.map(function (skill) {
            return '<option value="' + escapeHtml(skill.id) + '">' + escapeHtml(skill.name) + ' · ' + escapeHtml(skill.category) + '</option>';
          }).join("") : '<option value="">所有标准技能均已添加</option>') +
        '</select></div>' +
        '<div class="field"><label for="skillLevel">掌握程度</label><select class="select" id="skillLevel" name="level">' +
          '<option value="2">了解 / 入门</option><option value="3">会用 / 做过</option><option value="4" selected>熟练 / 能独立完成</option><option value="5">精通 / 能指导他人</option>' +
        '</select></div>' +
        '<div class="field" style="align-self:end"><button class="btn btn-soft" type="submit" ' + (!available.length ? "disabled" : "") + '>＋ 添加技能</button></div>' +
      '</form>' +
    '</section>';

    const projects = '<section class="card card-pad mt-2">' +
      '<div class="card-head"><div><h3>项目证据库</h3><p>写清背景、行动和结果，生成简历时才能避免空话</p></div>' +
      '<button class="btn btn-primary btn-sm" data-action="add-project">＋ 添加项目</button></div>' +
      ((profile.projects || []).length ? '<div class="project-list">' + profile.projects.map(function (project) {
        return '<article class="project-card"><div><h4>' + escapeHtml(project.name) + '</h4>' +
          '<div class="project-role">' + escapeHtml([project.role, project.period].filter(Boolean).join(" · ")) + '</div>' +
          '<p><strong>我的工作：</strong>' + escapeHtml(shortText(project.actions, 130)) + '</p>' +
          '<p><strong>结果：</strong>' + escapeHtml(shortText(project.result, 100)) + '</p>' +
          '<div class="project-keywords">' + (project.keywords || []).map(function (keyword) {
            return '<span class="pill">' + escapeHtml(keyword) + '</span>';
          }).join("") + '</div></div>' +
          '<div><button class="btn btn-sm" data-action="edit-project" data-project-id="' + escapeHtml(project.id) + '">编辑</button> ' +
          '<button class="btn btn-sm btn-danger" data-action="delete-project" data-project-id="' + escapeHtml(project.id) + '">删除</button></div></article>';
      }).join("") + '</div>' : emptyState("还没有项目证据", "至少添加 PLC 产线项目和减速器项目。", '<button class="btn btn-soft" data-action="add-project">添加项目</button>')) +
    '</section>';

    return '<div class="page-head"><div><h2>让招聘方快速看懂你的能力</h2><p>把项目写成“我做了什么、用了什么、产生了什么结果”，不要只列工具名称。</p></div>' +
      '<div class="page-actions"><button class="btn" data-action="add-project">＋ 项目</button><button class="btn btn-primary" data-action="add-job">录入 JD 并计算匹配</button></div></div>' +
      summary + basic + skillSection + projects;
  }

  function field(label, name, value, type, placeholder, required, full) {
    return '<div class="field ' + (full ? "full" : "") + '"><label for="' + escapeHtml(name) + '">' + escapeHtml(label) + '</label>' +
      '<input class="input" id="' + escapeHtml(name) + '" name="' + escapeHtml(name) + '" type="' + escapeHtml(type || "text") + '" value="' + escapeHtml(value || "") + '" placeholder="' + escapeHtml(placeholder || "") + '"' + (required ? " required" : "") + '></div>';
  }

  function skillDots(level) {
    let html = '<span class="skill-dots">';
    for (let i = 1; i <= 5; i += 1) html += '<i class="' + (i <= level ? "on" : "") + '"></i>';
    return html + '</span>';
  }

  function getScreen(job) {
    return E.screenJob(job, state.profile, state.settings.screening || {});
  }

  function decisionClass(decision) {
    if (decision === "推荐") return "badge-green";
    if (decision === "可考虑") return "badge-amber";
    return "badge-red";
  }

  function renderJobs() {
    const screening = state.settings.screening || {};
    const screened = state.jobs.map(function (job) {
      return { job: job, analysis: getAnalysis(job), screen: getScreen(job) };
    });
    const filtered = screened.filter(function (item) {
      const haystack = [item.job.company, item.job.title, item.job.city, item.job.jd, item.job.notes].join(" ").toLowerCase();
      const matchesSearch = !jobSearch || haystack.indexOf(jobSearch.toLowerCase()) >= 0;
      const matchesStatus = jobStatusFilter === "全部" || item.job.status === jobStatusFilter;
      const matchesDecision = jobDecisionFilter === "全部" || item.screen.decision === jobDecisionFilter;
      return matchesSearch && matchesStatus && matchesDecision;
    }).sort(function (a, b) {
      const rank = { "推荐": 0, "可考虑": 1, "不建议": 2 };
      if (a.job.favorite !== b.job.favorite) return a.job.favorite ? -1 : 1;
      if (rank[a.screen.decision] !== rank[b.screen.decision]) return rank[a.screen.decision] - rank[b.screen.decision];
      return b.analysis.score - a.analysis.score;
    });

    const counts = { "推荐": 0, "可考虑": 0, "不建议": 0 };
    screened.forEach(function (item) { counts[item.screen.decision] += 1; });
    const query = (state.profile.targetRoles && state.profile.targetRoles[0]) || "自动化工程师";
    const city = (state.profile.targetCities && state.profile.targetCities[0]) || "";
    const hasExamples = state.jobs.some(function (job) { return job.source === "示例"; });

    const head = '<div class="page-head"><div><h2>从各大平台找到岗位，再由职途统一筛选</h2><p>不保存招聘平台账号，不绕过验证码。通过平台搜索、网页采集器和剪贴板，把公开岗位信息带回本地统一处理。</p></div>' +
      '<div class="page-actions">' + (hasExamples ? '<button class="btn btn-danger" data-action="remove-examples">清除示例岗位</button>' : '') +
      '<button class="btn" data-action="import-clipboard">从剪贴板导入</button>' +
      '<button class="btn btn-primary" data-action="import-job-text">粘贴 JD 导入</button></div></div>';

    const platforms = '<section class="card card-pad"><div class="card-head"><div><h3>招聘平台搜索</h3><p>当前关键词：' + escapeHtml(query) + (city ? ' · ' + escapeHtml(city) : '') + '。点击后会在新标签页打开平台搜索。</p></div>' +
      '<button class="btn btn-sm" data-action="edit-platform-query">修改关键词</button></div>' +
      '<div class="platform-grid">' + E.PLATFORM_SEARCHES.map(function (platform) {
        return '<div class="platform-card"><div><strong>' + escapeHtml(platform.name) + '</strong><span>打开公开搜索页</span></div>' +
          '<button class="btn btn-sm btn-soft" data-action="open-platform" data-platform="' + escapeHtml(platform.id) + '">搜索</button></div>';
      }).join("") + '</div>' +
      '<div class="data-note mt-2"><strong>采集方式</strong><br>打开 <a href="采集书签.html" target="_blank">采集书签</a>，把“职途采集”按钮拖到浏览器书签栏。在招聘详情页点击书签后，回到这里选择“从剪贴板导入”。</div>' +
    '</section>';

    const screeningCard = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>自动筛选结果</h3><p>规则在本地运行，依据 JD 关键词、城市、应届要求和岗位匹配分。</p></div>' +
      '<button class="btn btn-sm" data-action="edit-screening">调整筛选规则</button></div>' +
      '<div class="screen-rule-summary"><span><strong>关注词：</strong>' + escapeHtml((screening.includeKeywords || []).join("、") || "未设置") + '</span>' +
      '<span><strong>排除词：</strong>' + escapeHtml((screening.excludeKeywords || []).join("、") || "未设置") + '</span>' +
      '<span><strong>最低匹配：</strong>' + escapeHtml(String(screening.minScore || 0)) + '%</span>' +
      '<span><strong>目标城市：</strong>' + escapeHtml((screening.cities || []).join("、") || "不限") + '</span></div>' +
      '<div class="decision-row mt-2"><span class="badge badge-green">推荐 ' + counts["推荐"] + '</span><span class="badge badge-amber">可考虑 ' + counts["可考虑"] + '</span>' +
      '<span class="badge badge-red">不建议 ' + counts["不建议"] + '</span><span class="toolbar-spacer"></span><button class="btn btn-sm btn-primary" data-action="screen-all">重新筛选全部</button></div></section>';

    const toolbar = '<section class="card card-pad mt-2"><div class="toolbar">' +
      '<input class="input" id="job-search" data-action="filter-jobs" value="' + escapeHtml(jobSearch) + '" placeholder="搜索公司、岗位、城市或 JD">' +
      '<select class="select" id="job-status-filter" data-action="filter-job-status">' + ['全部'].concat(E.JOB_STATUSES).map(function (status) {
        return '<option value="' + escapeHtml(status) + '"' + (jobStatusFilter === status ? " selected" : "") + '>' + escapeHtml(status) + '</option>';
      }).join("") + '</select>' +
      '<select class="select" id="job-decision-filter" data-action="filter-job-decision">' + ['全部', '推荐', '可考虑', '不建议'].map(function (decision) {
        return '<option value="' + escapeHtml(decision) + '"' + (jobDecisionFilter === decision ? " selected" : "") + '>' + (decision === "全部" ? "全部筛选结果" : decision) + '</option>';
      }).join("") + '</select><span class="toolbar-spacer"></span><span class="muted">当前显示 ' + filtered.length + ' / ' + state.jobs.length + ' 份</span>' +
    '</div></section>';

    const list = filtered.length
      ? '<div class="job-list mt-2">' + filtered.map(function (item) { return jobCard(item.job, item.analysis, false, item.screen); }).join("") + '</div>'
      : emptyState("没有符合条件的岗位", "可以清空筛选、调整筛选规则，或者采集一份新的招聘 JD。", '<button class="btn btn-primary" data-action="import-job-text">粘贴 JD 导入</button>');

    return head + platforms + screeningCard + toolbar + list;
  }

  function jobCard(job, analysis, compact, screen) {
    const screening = screen || getScreen(job);
    const matchedNames = analysis.matched.slice(0, 4).map(function (item) { return item.skill.name; });
    const missingNames = analysis.missing.slice(0, 4).map(function (item) { return item.skill.name; });
    const projectHit = analysis.relevantProjects[0];
    let tags = matchedNames.map(function (name) { return '<span class="pill strong">' + escapeHtml(name) + '</span>'; }).join("");
    tags += missingNames.map(function (name) { return '<span class="pill missing">' + escapeHtml(name) + '</span>'; }).join("");
    if (!tags) tags = '<span class="pill">岗位关键词不足，建议补充完整 JD</span>';
    const screenNote = (screening.reasons || []).concat(screening.warnings || []).slice(0, 2).join("；");

    return '<article class="job-card">' +
      '<div><div class="job-title-row"><h3>' + escapeHtml(job.title) + '</h3>' +
        '<span class="badge ' + E.statusClass(job.status) + '">' + escapeHtml(job.status) + '</span>' +
        '<span class="badge ' + decisionClass(screening.decision) + '">' + escapeHtml(screening.decision) + '</span>' +
        (job.favorite ? '<span class="badge badge-amber">重点</span>' : "") +
        (job.source === "示例" ? '<span class="badge badge-neutral">示例</span>' : "") +
      '</div>' +
      '<div class="job-company">' + escapeHtml(job.company || "公司待填写") + '</div>' +
      '<div class="job-meta"><span>⌖ ' + escapeHtml(job.city || "城市待填写") + '</span><span>¥ ' + escapeHtml(job.salary || "薪资待填写") + '</span>' +
        '<span>' + escapeHtml(screening.meta.experience) + '</span><span>匹配置信度 ' + escapeHtml(analysis.confidence) + '</span>' +
        (projectHit ? '<span>项目证据 ' + escapeHtml(projectHit.project.name) + '</span>' : "") + '</div>' +
      '<div class="skill-list">' + tags + '</div>' +
      (screenNote ? '<div class="mt-1 muted" style="font-size:10px">筛选依据：' + escapeHtml(screenNote) + '</div>' : "") +
      (compact ? "" : '<div class="mt-2" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-sm btn-soft" data-action="view-job" data-job-id="' + escapeHtml(job.id) + '">查看匹配详情</button>' +
        '<button class="btn btn-sm" data-action="edit-job" data-job-id="' + escapeHtml(job.id) + '">编辑</button>' +
        '<button class="btn btn-sm" data-action="company-from-job" data-job-id="' + escapeHtml(job.id) + '">查公司</button>' +
        '<button class="btn btn-sm btn-danger" data-action="delete-job" data-job-id="' + escapeHtml(job.id) + '">删除</button></div>') +
      '</div>' +
      '<div class="job-match"><div class="match-score ' + E.scoreClass(analysis.score) + '">' + analysis.score + '<small>%</small></div>' +
        '<div class="match-label">岗位匹配度</div><div class="match-bar"><i style="width:' + analysis.score + '%"></i></div>' +
        '<div class="job-card-actions">' + (compact ? '<button class="btn btn-sm btn-soft" data-action="view-job" data-job-id="' + escapeHtml(job.id) + '">看详情</button>' : "") +
          '<button class="btn btn-sm" data-action="add-job-task" data-job-id="' + escapeHtml(job.id) + '">＋ 补缺口</button></div>' +
      '</div>' +
    '</article>';
  }
  function renderCompany() {
    const query = companySearch.trim();
    const companies = (state.companies || []).filter(function (company) {
      if (!query) return true;
      return [company.name, company.industry, company.location, company.notes].join(" ").toLowerCase().indexOf(query.toLowerCase()) >= 0;
    });
    const jobCompanies = Array.from(new Set(state.jobs.map(function (job) { return job.company; }).filter(function (name) { return name && name !== "公司待确认" && name.indexOf("示例公司") < 0; })));
    const searchCard = '<section class="card card-pad"><div class="card-head"><div><h3>查询公司信息</h3><p>使用天眼查官方页面查询工商信息、风险、股东、司法和经营状况。</p></div><span class="badge badge-neutral">官方网页模式</span></div>' +
      '<div class="toolbar"><input class="input" id="company-search" data-action="filter-companies" value="' + escapeHtml(companySearch) + '" placeholder="输入公司全称或关键词">' +
      '<button class="btn btn-primary" data-action="open-tianyancha">打开天眼查查询</button><button class="btn" data-action="add-company">＋ 新增公司档案</button></div>' +
      (jobCompanies.length ? '<div class="skill-list">' + jobCompanies.map(function (name) { return '<button class="pill strong" style="cursor:pointer" data-action="quick-company-search" data-company="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>'; }).join("") + '</div>' : '<p class="muted mb-0">你的岗位池中还没有可查询的公司。</p>') + '</section>';
    const researchCard = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>公司研究档案</h3><p>保存公司规模、资本、经营状态、风险和面试前需要注意的信息。</p></div><span class="muted">' + (state.companies || []).length + ' 家公司</span></div>' +
      (companies.length ? '<div class="grid grid-2">' + companies.map(function (company) {
        const risks = company.riskLevel && company.riskLevel !== "未评估" ? '<span class="badge badge-amber">风险：' + escapeHtml(company.riskLevel) + '</span>' : '<span class="badge badge-neutral">风险未评估</span>';
        return '<article class="card card-pad"><div class="job-title-row"><h3>' + escapeHtml(company.name || "公司名称待填写") + '</h3>' + risks + '</div>' +
          '<div class="job-meta"><span>' + escapeHtml(company.industry || "行业待补充") + '</span><span>' + escapeHtml(company.scale || "规模待补充") + '</span><span>' + escapeHtml(company.location || "地区待补充") + '</span></div>' +
          '<div class="progress-list"><div class="progress-row"><span>经营状态</span><b style="grid-column:2/4">' + escapeHtml(company.status || "待查询") + '</b></div>' +
          '<div class="progress-row"><span>法定代表人</span><b style="grid-column:2/4">' + escapeHtml(company.legalPerson || "待查询") + '</b></div>' +
          '<div class="progress-row"><span>注册资本</span><b style="grid-column:2/4">' + escapeHtml(company.capital || "待查询") + '</b></div>' +
          '<div class="progress-row"><span>成立日期</span><b style="grid-column:2/4">' + escapeHtml(company.established || "待查询") + '</b></div></div>' +
          (company.notes ? '<div class="data-note mt-2">' + escapeHtml(company.notes) + '</div>' : "") +
          '<div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn btn-sm btn-soft" data-action="open-company-tianyancha" data-company-id="' + escapeHtml(company.id) + '">天眼查查询</button><button class="btn btn-sm" data-action="edit-company" data-company-id="' + escapeHtml(company.id) + '">编辑档案</button><button class="btn btn-sm btn-danger" data-action="delete-company" data-company-id="' + escapeHtml(company.id) + '">删除</button></div></article>';
      }).join("") + '</div>' : emptyState("还没有公司研究记录", "先搜索岗位池中的公司，或者新建一个公司档案。", '<button class="btn btn-soft" data-action="add-company">新建公司档案</button>')) + '</section>';
    const guide = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>面试前建议重点核实</h3><p>这些信息能帮助你判断岗位可靠性和面试提问方向。</p></div></div><div class="grid grid-3">' + statCard("经营状态", "存续 / 在业", "异常状态需谨慎", "营") + statCard("风险信息", "司法 / 经营异常", "必要时查看官方详情", "险") + statCard("公司规模", "人数 / 行业", "判断岗位与业务匹配", "规") + '</div></section>';
    return '<div class="page-head"><div><h2>先把公司研究清楚，再决定要不要投</h2><p>通过天眼查官方页面查询公开信息，并把关键结论保存到本地档案。</p></div><div class="page-actions"><button class="btn btn-primary" data-action="open-tianyancha">打开天眼查查询</button></div></div>' + searchCard + researchCard + guide;
  }

  function renderResume() {
    if (!state.jobs.length) {
      return '<div class="page-head"><div><h2>还没有可用于定制的岗位</h2><p>先录入一份真实 JD，简历工坊会按岗位关键词重排技能和项目。</p></div></div>' +
        emptyState("简历工坊需要岗位信息", "它不是通用简历编辑器，而是把现有经历针对某个岗位重新组织。", '<button class="btn btn-primary" data-action="add-job">录入岗位</button>');
    }
    if (!getJob(resumeJobId)) resumeJobId = state.jobs[0].id;
    const job = getJob(resumeJobId);
    const analysis = getAnalysis(job);
    const model = E.createResumeModel(job, state.profile, analysis);
    const profile = state.profile;
    const education = (profile.education && profile.education[0]) || {};
    const contact = [profile.phone, profile.email, profile.city].filter(Boolean);
    const missingContact = !profile.name || !profile.phone || !profile.email;

    const controls = '<aside class="card card-pad">' +
      '<div class="field"><label for="resume-job-select">为哪个岗位定制</label><select class="select" id="resume-job-select" data-action="select-resume-job">' +
        state.jobs.map(function (item) {
          return '<option value="' + escapeHtml(item.id) + '"' + (item.id === job.id ? " selected" : "") + '>' + escapeHtml(item.company + "｜" + item.title) + '</option>';
        }).join("") +
      '</select></div>' +
      '<div class="match-summary mt-2"><div class="big-score"><b>' + analysis.score + '</b><span>当前匹配度</span></div>' +
        '<div class="match-note">' + escapeHtml(analysis.note) + '</div></div>' +
      '<div class="keyword-block"><h4 class="text-success">优先写进简历</h4><div class="skill-list">' +
        (analysis.matched.length ? analysis.matched.map(function (item) { return '<span class="pill strong">' + escapeHtml(item.skill.name) + '</span>'; }).join("") : '<span class="muted">暂未识别到已掌握关键词</span>') +
      '</div></div>' +
      '<div class="keyword-block"><h4 class="text-danger">暂不建议硬写</h4><div class="skill-list">' +
        (analysis.missing.length ? analysis.missing.map(function (item) { return '<span class="pill missing">' + escapeHtml(item.skill.name) + '</span>'; }).join("") : '<span class="muted">未发现明显缺口</span>') +
      '</div></div>' +
      (missingContact ? '<div class="data-note mt-2"><strong>还不能直接投递</strong><br>请先补全姓名、电话和邮箱。</div>' : "") +
      '<div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-action="copy-resume">复制纯文本</button>' +
        '<button class="btn" data-action="print-resume">打印 / 存 PDF</button>' +
        '<button class="btn" data-action="add-job-task" data-job-id="' + escapeHtml(job.id) + '">生成准备任务</button>' +
      '</div>' +
      '<div class="data-note mt-2">这是基于你档案的定制初稿。所有数据、数字和职责必须由你核实后再用于正式投递。</div>' +
    '</aside>';

    const skillLine = model.orderedSkills.map(function (skill) { return skill.name; }).join(" · ");
    const projectHtml = model.projects.map(function (project) {
      const relevant = (analysis.relevantProjects || []).find(function (item) { return item.project.id === project.id; });
      const hitText = relevant && relevant.hits.length ? '相关关键词：' + relevant.hits.join("、") : "";
      return '<div class="resume-project"><div class="resume-project-head"><strong>' + escapeHtml(project.name) + '</strong><span>' + escapeHtml(project.period || "") + '</span></div>' +
        '<div style="font-size:10.5px;color:#647880;margin:2px 0 4px">' + escapeHtml(project.role || "") + '</div>' +
        '<ul><li>' + escapeHtml(project.background || "项目背景待补充") + '</li>' +
        '<li>' + escapeHtml(project.actions || "主要工作待补充") + '</li>' +
        '<li>' + escapeHtml(project.result || "项目结果待补充") + '</li></ul>' +
        (hitText ? '<div class="resume-tip">' + escapeHtml(hitText) + '</div>' : "") +
      '</div>';
    }).join("");

    const sheet = '<article class="resume-sheet" id="resume-sheet">' +
      '<h2>' + escapeHtml(profile.name || "姓名待填写") + '</h2>' +
      '<div class="resume-title">' + escapeHtml(profile.title || "自动化方向求职者") + '｜求职目标：' + escapeHtml(model.target) + '</div>' +
      '<div class="resume-contact">' + (contact.length ? contact.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join("") : '<span>联系方式待填写</span>') + '</div>' +
      '<section class="resume-section"><h3>个人简介</h3><p>' + escapeHtml(profile.summary || "请先在能力档案中完善个人简介。") + '</p></section>' +
      '<section class="resume-section"><h3>专业技能</h3><p class="resume-skill-line">' + escapeHtml(skillLine || "技能待补充") + '</p></section>' +
      '<section class="resume-section"><h3>项目经历</h3>' + (projectHtml || '<p>项目经历待补充。</p>') + '</section>' +
      '<section class="resume-section"><h3>教育经历</h3><p><strong>' + escapeHtml(education.school || "学校待填写") + '</strong>｜' + escapeHtml(education.major || "专业待填写") + '</p>' +
        '<p>' + escapeHtml(education.degree || "") + (education.period ? '｜' + escapeHtml(education.period) : "") + '</p></section>' +
    '</article>';

    return '<div class="page-head"><div><h2>一份简历，只服务一个岗位</h2><p>优先展示与该 JD 匹配的能力和项目证据；不匹配的内容可以被保留在档案中，但不必都塞进这一版简历。</p></div></div>' +
      '<div class="resume-layout">' + controls + '<div class="detail-main">' + sheet + '</div></div>';
  }

  function renderTracker() {
    const head = '<div class="page-head"><div><h2>只在看板上保留下一动作</h2><p>状态可以随时调整；每张卡片都应该有一个明确的下一步，而不是只在等待。</p></div>' +
      '<div class="page-actions"><button class="btn btn-primary" data-action="add-job">＋ 录入岗位</button></div></div>';

    const columns = BOARD_COLUMNS.map(function (column) {
      const jobs = state.jobs.filter(function (job) { return column.statuses.indexOf(job.status) >= 0; });
      return '<section class="board-column"><div class="board-column-head"><strong>' + escapeHtml(column.label) + '</strong><span>' + jobs.length + ' 个岗位</span></div>' +
        '<div class="board-cards">' + (jobs.length ? jobs.map(function (job) {
          const analysis = getAnalysis(job);
          return '<article class="board-card"><h4>' + escapeHtml(job.title) + '</h4><p>' + escapeHtml(job.company + ' · ' + (job.city || "城市待定") + ' · 匹配 ' + analysis.score + '%') + '</p>' +
            '<div class="skill-list" style="margin-bottom:8px">' + (job.nextAction ? '<span class="pill strong">' + escapeHtml(shortText(job.nextAction, 34)) + '</span>' : '<span class="pill missing">还没设置下一步</span>') + '</div>' +
            '<select class="select" data-action="change-status" data-job-id="' + escapeHtml(job.id) + '">' +
              E.JOB_STATUSES.map(function (status) {
                return '<option value="' + escapeHtml(status) + '"' + (job.status === status ? " selected" : "") + '>' + escapeHtml(status) + '</option>';
              }).join("") +
            '</select><div class="board-card-actions mt-1"><button class="btn btn-sm btn-soft" data-action="view-job" data-job-id="' + escapeHtml(job.id) + '">详情</button>' +
              '<button class="btn btn-sm" data-action="edit-job" data-job-id="' + escapeHtml(job.id) + '">编辑</button></div></article>';
        }).join("") : '<div class="empty" style="min-height:90px;padding:12px">暂无岗位</div>') + '</div></section>';
    }).join("");

    return head + '<div class="board">' + columns + '</div>';
  }

  function renderInterview() {
    if (!state.jobs.length) {
      return '<div class="page-head"><div><h2>先把目标岗位放进来</h2><p>面试题会根据岗位技能和你的项目经历生成。</p></div></div>' +
        emptyState("还没有岗位", "至少录入一份 JD，系统才能判断面试重点。", '<button class="btn btn-primary" data-action="add-job">录入岗位</button>');
    }
    if (!getJob(interviewJobId)) interviewJobId = state.jobs[0].id;
    const job = getJob(interviewJobId);
    const analysis = getAnalysis(job);
    const questions = E.generateInterviewQuestions(job, state.profile, analysis);
    const matchedProject = analysis.relevantProjects[0];

    const questionHtml = questions.map(function (question) {
      const key = job.id + "::" + question.id;
      const answer = state.interviewAnswers[key] || "";
      return '<article class="question-item"><div class="job-title-row"><h4>' + escapeHtml(question.question) + '</h4><span class="badge badge-neutral">' + escapeHtml(question.category) + '</span></div>' +
        '<p>' + escapeHtml(question.hint) + '</p><textarea class="textarea" data-answer-key="' + escapeHtml(key) + '" placeholder="先用关键词记录，之后再练习成 2 分钟回答">' + escapeHtml(answer) + '</textarea></article>';
    }).join("");

    const control = '<aside class="card card-pad"><div class="field"><label for="interview-job-select">目标岗位</label><select class="select" id="interview-job-select" data-action="select-interview-job">' +
      state.jobs.map(function (item) {
        return '<option value="' + escapeHtml(item.id) + '"' + (item.id === job.id ? " selected" : "") + '>' + escapeHtml(item.company + "｜" + item.title) + '</option>';
      }).join("") +
    '</select></div>' +
    '<div class="match-summary mt-2"><div class="big-score"><b>' + analysis.score + '</b><span>匹配度</span></div><div class="match-note">重点验证已掌握技能，并准备技能缺口的诚实回答。</div></div>' +
    '<div class="keyword-block"><h4>高频验证点</h4><div class="skill-list">' + analysis.matched.slice(0, 6).map(function (item) { return '<span class="pill strong">' + escapeHtml(item.skill.name) + '</span>'; }).join("") + '</div></div>' +
    (analysis.missing.length ? '<div class="keyword-block"><h4>可能被追问的缺口</h4><div class="skill-list">' + analysis.missing.slice(0, 5).map(function (item) { return '<span class="pill missing">' + escapeHtml(item.skill.name) + '</span>'; }).join("") + '</div></div>' : "") +
    '<div class="data-note mt-2"><strong>STAR 结构</strong><br>Situation 背景｜Task 任务｜Action 行动｜Result 结果。每段控制在 4 句话内。</div>' +
    '<div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn btn-primary" data-action="copy-interview" data-job-id="' + escapeHtml(job.id) + '">复制问题清单</button>' +
      '<button class="btn" data-action="add-job-task" data-job-id="' + escapeHtml(job.id) + '">生成准备任务</button></div></aside>';

    const main = '<div class="detail-main"><div class="card card-pad"><div class="card-head"><div><h3>' + escapeHtml(job.title) + ' · 面试训练</h3><p>' +
      (matchedProject ? '建议把「' + escapeHtml(matchedProject.project.name) + '」作为核心项目案例。' : "先完善技能和项目档案，会生成更具体的问题。") + '</p></div>' +
      '<span class="badge ' + E.statusClass(job.status) + '">' + escapeHtml(job.status) + '</span></div><div class="question-list">' + questionHtml + '</div></div></div>';

    return '<div class="page-head"><div><h2>不要背答案，先准备证据</h2><p>系统生成问题关键词，你补充自己的真实经历；回答会自动保存在本机。</p></div></div>' +
      '<div class="detail-grid">' + control + main + '</div>';
  }

  function hasBuiltInAI() {
    return !!(window.LanguageModel || (window.ai && window.ai.languageModel));
  }

  function aiProviderLabel() {
    const config = state.settings.ai || {};
    if (config.provider === "builtin") return "浏览器内置模型";
    if (config.provider === "ollama") return "Ollama / 本地模型";
    if (config.provider === "compatible") return "兼容接口";
    if (config.provider === "offline") return "离线训练模式";
    if (hasBuiltInAI()) return "自动：浏览器内置模型";
    return "自动：本地接口";
  }

  function aiProviderHint() {
    const config = state.settings.ai || {};
    if (config.provider === "offline") return "只使用题库和本地回答提纲，不调用 AI 模型。";
    if (config.provider === "builtin") return hasBuiltInAI() ? "当前浏览器支持内置模型。" : "当前浏览器未检测到内置模型。";
    if (config.provider === "ollama") return "将调用 " + (config.baseUrl || "本地接口") + " 上的模型。";
    if (config.provider === "compatible") return "将调用兼容 Chat Completions 的接口。";
    return hasBuiltInAI() ? "优先使用浏览器内置模型。" : "优先尝试 " + (config.baseUrl || "本地接口") + "。";
  }

  function renderAIInterview() {
    if (!state.jobs.length) {
      return '<div class="page-head"><div><h2>AI 模拟面试需要目标岗位</h2><p>先录入一份完整 JD，AI 才能围绕岗位和你的项目进行追问。</p></div></div>' +
        emptyState("还没有岗位", "录入岗位后，可以在 AI 面试中进行多轮追问和回答复盘。", '<button class="btn btn-primary" data-action="add-job">录入岗位</button>');
    }
    if (!getJob(interviewJobId)) interviewJobId = state.jobs[0].id;
    const job = getJob(interviewJobId);
    const analysis = getAnalysis(job);
    const session = state.aiSessions[job.id] || null;
    const backendOnline = session ? session.backend !== "offline" : hasBuiltInAI();
    const backendClass = backendOnline ? "online" : (state.settings.ai.provider === "offline" ? "offline" : "");

    const setup = '<aside class="card card-pad"><div class="field"><label for="ai-job-select">目标岗位</label><select class="select" id="ai-job-select" data-action="select-ai-job">' +
      state.jobs.map(function (item) { return '<option value="' + escapeHtml(item.id) + '"' + (item.id === job.id ? " selected" : "") + '>' + escapeHtml(item.company + "｜" + item.title) + '</option>'; }).join("") + '</select></div>' +
      '<div class="ai-status mt-2"><span class="ai-status-dot ' + backendClass + '"></span><div><strong>' + escapeHtml(session ? (session.backend === "offline" ? "离线训练模式" : "AI 面试进行中") : aiProviderLabel()) + '</strong><span>' + escapeHtml(aiProviderHint()) + '</span></div></div>' +
      (session ? '<div class="match-summary mt-2"><div class="big-score"><b>' + session.turn + '</b><span>/ ' + session.maxTurns + ' 轮</span></div><div class="match-note">岗位匹配度 ' + analysis.score + '%。AI 会根据你的回答继续追问。</div></div>' :
        '<form class="mt-2" data-form="ai-start"><div class="field"><label for="aiStyle">面试风格</label><select class="select" id="aiStyle" name="style"><option value="专业、直接、有追问">专业直接</option><option value="温和、引导式，但会验证技术细节">温和引导</option><option value="压力面试，重点追问逻辑漏洞">压力面试</option></select></div>' +
        '<div class="field mt-1"><label for="aiFocus">重点考察</label><input class="input" id="aiFocus" name="focus" value="项目真实性、技术细节、问题排查和岗位匹配度"></div>' +
        '<div class="field mt-1"><label for="aiMaxTurns">面试轮次</label><select class="select" id="aiMaxTurns" name="maxTurns"><option value="4">4 轮快速练习</option><option value="6" selected>6 轮标准面试</option><option value="10">10 轮深度面试</option></select></div>' +
        '<button class="btn btn-primary mt-2" type="submit" ' + (aiBusy ? "disabled" : "") + '>' + (aiBusy ? "正在启动…" : "开始 AI 面试") + '</button></form>') +
      '<div class="ai-help mt-2">AI 可能出错。回答评价仅用于练习，不应作为求职决策依据。云端接口可能产生费用并发送你填写的面试内容。</div>' +
      '<div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn btn-sm" data-view="settings">AI 模型设置</button>' +
      (session ? '<button class="btn btn-sm" data-action="reset-ai-session">重新开始</button>' : "") + '</div></aside>';

    let messagesHtml = '';
    if (session && session.messages.length) {
      messagesHtml = session.messages.map(function (message) {
        const role = message.role === "user" ? "user" : (message.role === "system" ? "system" : "assistant");
        const avatar = role === "user" ? "我" : (role === "system" ? "!" : "AI");
        return '<div class="chat-message ' + role + '"><div class="chat-avatar">' + avatar + '</div><div class="chat-bubble">' + escapeHtml(message.content) + '</div></div>';
      }).join("");
    } else {
      messagesHtml = '<div class="chat-empty"><div><strong>准备好后再开始</strong>AI 会围绕「' + escapeHtml(job.title) + '」和你的项目发起多轮追问。</div></div>';
    }

    const chat = '<section class="chat-shell"><div class="chat-head"><div><h3>' + escapeHtml(job.company + " · " + job.title) + '</h3><p>' + escapeHtml(session ? "第 " + Math.min(session.turn + 1, session.maxTurns) + " 轮" : "尚未开始") + '</p></div>' +
      (session && !session.completed ? '<button class="btn btn-sm" data-action="finish-ai-session">提前生成报告</button>' : "") + '</div>' +
      '<div class="chat-window">' + messagesHtml + '</div>' +
      '<form class="chat-input" data-form="ai-answer"><textarea class="textarea" name="answer" placeholder="' + (session && !session.completed ? "输入你的回答，尽量说具体项目和行动" : "开始面试后在这里回答") + '" ' + (!session || session.completed || aiBusy ? "disabled" : "") + ' required></textarea>' +
      '<button class="btn btn-primary" type="submit" ' + (!session || session.completed || aiBusy ? "disabled" : "") + '>' + (aiBusy ? "AI 思考中…" : "发送回答") + '</button></form></section>';

    return '<div class="page-head"><div><h2>多轮追问，而不是静态题库</h2><p>AI 会根据你的回答继续提问，并在结束时生成优点、风险点和改进建议。</p></div></div><div class="ai-layout">' + setup + chat + '</div>';
  }

  function offlineInterviewResponse(session, answer, job) {
    const questions = session.offlineQuestions || E.generateInterviewQuestions(job, state.profile, getAnalysis(job));
    const trimmed = String(answer || "").trim();
    let feedback = "回答可以继续补充具体背景、你的行动和结果。";
    if (trimmed.length < 35) feedback = "回答偏短。面试官很难判断你是否真正做过，建议补充工具、步骤和结果。";
    else if (!/\d|秒|分钟|小时|%|个|套|台/.test(trimmed)) feedback = "回答有过程但缺少结果。尽量补充时间、效率、故障数量或完成程度。";
    else feedback = "回答包含具体信息，下一步要确保技术动作和最终结果之间的因果关系清楚。";
    if (session.turn >= session.maxTurns) {
      const report = "离线面试报告\n\n总体评价：你已完成 " + session.turn + " 轮回答，建议重点检查每个项目是否说清了任务、行动和结果。\n\n主要改进：\n1. 每个回答补充一个技术细节。\n2. 每个项目至少给出一个量化结果。\n3. 遇到不会的问题时说明边界、相近经验和学习计划。\n\n未来 3 天：重新整理 Factory IO 项目和减速器项目，各录制一次 2 分钟口述。\n\n注意：当前未连接 AI 模型，本报告来自本地规则，不是 AI 评价。";
      return { text: report, report: report, completed: true };
    }
    const next = questions[session.turn % questions.length];
    return { text: feedback + "\n\n下一题：" + next.question + "\n提示：" + next.hint, report: "", completed: false };
  }

  async function callBuiltInAI(system, messages, prompt) {
    const api = window.LanguageModel || (window.ai && window.ai.languageModel);
    if (!api) throw new Error("当前浏览器没有可用的内置语言模型");
    if (api.availability) {
      const availability = await api.availability();
      if (availability === "unavailable" || availability === "no") throw new Error("浏览器内置模型当前不可用");
    }
    const session = await api.create({ initialPrompts: [{ role: "system", content: system }] });
    const transcript = (messages || []).map(function (message) { return message.role + "：" + message.content; }).join("\n\n");
    const fullPrompt = transcript ? "此前对话：\n" + transcript + "\n\n现在请回应：" + prompt : prompt;
    const text = await session.prompt(fullPrompt);
    if (session.destroy) session.destroy();
    return String(text || "").trim();
  }

  async function callRemoteAI(system, messages, prompt, config) {
    let baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
    if (!baseUrl) throw new Error("未配置模型接口地址");
    const allMessages = [{ role: "system", content: system }].concat(messages || []).concat([{ role: "user", content: prompt }]);
    let url;
    let body;
    if (config.provider === "ollama" && !baseUrl.endsWith("/v1") && baseUrl.indexOf("/chat/completions") < 0) {
      url = baseUrl + "/api/chat";
      body = { model: config.model, messages: allMessages, stream: false, options: { temperature: Number(config.temperature || 0.6) } };
    } else {
      url = baseUrl.endsWith("/chat/completions") ? baseUrl : (baseUrl.endsWith("/v1") ? baseUrl + "/chat/completions" : baseUrl + "/v1/chat/completions");
      body = { model: config.model, messages: allMessages, temperature: Number(config.temperature || 0.6), stream: false };
    }
    const headers = { "Content-Type": "application/json" };
    if (config.apiKey) headers.Authorization = "Bearer " + config.apiKey;
    const response = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body) });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("模型接口返回 " + response.status + "：" + errorText.slice(0, 180));
    }
    const data = await response.json();
    const text = data.message && data.message.content ? data.message.content : (data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "");
    if (!text) throw new Error("模型没有返回有效内容");
    return String(text).trim();
  }

  async function callAI(system, messages, prompt) {
    const config = state.settings.ai || {};
    if (config.provider !== "offline" && ["auto", "builtin"].indexOf(config.provider) >= 0 && hasBuiltInAI()) {
      try { return { text: await callBuiltInAI(system, messages, prompt), backend: "builtin" }; }
      catch (error) { if (config.provider === "builtin") throw error; }
    }
    if (config.provider === "offline") throw new Error("offline");
    return { text: await callRemoteAI(system, messages, prompt, config), backend: "remote" };
  }

  async function startAISession(jobId, options) {
    const job = getJob(jobId);
    if (!job) return;
    const analysis = getAnalysis(job);
    const session = {
      id: E.uid("ai"), jobId: job.id, turn: 0, maxTurns: Number(options.maxTurns || 6),
      style: options.style || "专业、直接、有追问", focus: options.focus || "项目真实性、技术细节、问题排查和岗位匹配度",
      backend: "unknown", messages: [], completed: false, report: "", startedAt: new Date().toISOString(),
      offlineQuestions: E.generateInterviewQuestions(job, state.profile, analysis)
    };
    state.aiSessions[job.id] = session;
    aiBusy = true; saveState(); render();
    const system = E.buildAISystemPrompt(job, state.profile, analysis, { style: session.style, focus: session.focus });
    try {
      const result = await callAI(system, [], E.buildAIOpeningPrompt({ maxTurns: session.maxTurns }));
      session.backend = result.backend;
      session.messages.push({ role: "assistant", content: result.text });
      showToast("AI 面试已开始。", "success");
    } catch (error) {
      session.backend = "offline";
      session.messages.push({ role: "system", content: "未连接到 AI 模型，已切换到离线训练模式。你仍可完成多轮练习，但没有 AI 评价。" });
      const first = session.offlineQuestions[0];
      session.messages.push({ role: "assistant", content: first.question + "\n提示：" + first.hint });
      showToast("未连接 AI，已切换离线训练模式。", "error");
    }
    aiBusy = false; saveState(); render();
  }

  async function sendAIAnswer(answer) {
    const job = getJob(interviewJobId);
    const session = job ? state.aiSessions[job.id] : null;
    if (!job || !session || session.completed || aiBusy) return;
    const cleanAnswer = String(answer || "").trim();
    if (!cleanAnswer) return;
    session.messages.push({ role: "user", content: cleanAnswer });
    session.turn += 1;
    aiBusy = true; saveState(); render();
    const analysis = getAnalysis(job);
    const system = E.buildAISystemPrompt(job, state.profile, analysis, { style: session.style, focus: session.focus });
    let result;
    if (session.backend === "offline") {
      result = offlineInterviewResponse(session, cleanAnswer, job);
    } else {
      try {
        const prompt = session.turn >= session.maxTurns
          ? E.buildAIReportPrompt()
          : "候选人回答：" + cleanAnswer + "\n\n请先用一句话评价，再根据岗位和项目提出下一道追问。";
        const aiResult = await callAI(system, session.messages.slice(0, -1), prompt);
        result = { text: aiResult.text, report: session.turn >= session.maxTurns ? aiResult.text : "", completed: session.turn >= session.maxTurns };
      } catch (error) {
        session.backend = "offline";
        session.messages.push({ role: "system", content: "AI 调用失败，后续已切换为离线训练模式：" + error.message });
        result = offlineInterviewResponse(session, cleanAnswer, job);
      }
    }
    session.messages.push({ role: "assistant", content: result.text });
    if (result.report) session.report = result.report;
    if (result.completed) session.completed = true;
    aiBusy = false; saveState(); render();
  }

  async function finishAISession() {
    const job = getJob(interviewJobId);
    const session = job ? state.aiSessions[job.id] : null;
    if (!job || !session || session.completed || aiBusy) return;
    aiBusy = true; render();
    const analysis = getAnalysis(job);
    const system = E.buildAISystemPrompt(job, state.profile, analysis, { style: session.style, focus: session.focus });
    try {
      const result = await callAI(system, session.messages, E.buildAIReportPrompt());
      session.report = result.text;
    } catch (error) {
      session.report = "离线面试报告\n\n已完成 " + session.turn + " 轮回答。建议回看每个回答是否说清了背景、行动和结果，并补充技术细节与量化结果。\n\n注意：当前未连接 AI 模型，本报告来自本地规则。";
    }
    session.completed = true;
    session.messages.push({ role: "assistant", content: session.report });
    aiBusy = false; saveState(); render();
  }

  function resetAISession() {
    if (!interviewJobId) return;
    delete state.aiSessions[interviewJobId];
    saveState(); render();
  }

  async function testAIConnection() {
    const originalText = "只回复：连接成功";
    try {
      const result = await callAI("你是连接测试助手。", [], originalText);
      showToast("模型连接成功：" + (result.backend === "builtin" ? "浏览器内置模型" : "本地/兼容接口"), "success");
    } catch (error) {
      showToast("连接失败：" + error.message, "error");
    }
  }

  function renderSettings() {
    const counts = { jobs: state.jobs.length, tasks: state.tasks.length, projects: (state.profile.projects || []).length, skills: (state.profile.skills || []).length };
    const ai = state.settings.ai || {};
    const screening = state.settings.screening || {};
    const summary = '<div class="grid grid-4">' + statCard("岗位", counts.jobs, "已保存到本地", "岗") +
      statCard("任务", counts.tasks, "用于推动求职行动", "办") + statCard("项目", counts.projects, "项目证据", "证") +
      statCard("技能", counts.skills, "能力关键词", "技") + '</div>';

    const aiCard = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>AI 面试模型</h3><p>支持浏览器内置模型、Ollama / LM Studio 和通用兼容接口。</p></div>' +
      '<span class="ai-status"><span class="ai-status-dot ' + (hasBuiltInAI() ? "online" : (ai.provider === "offline" ? "offline" : "")) + '"></span><div><strong>' + escapeHtml(aiProviderLabel()) + '</strong><span>' + escapeHtml(aiProviderHint()) + '</span></div></span></div>' +
      '<form data-form="ai-settings"><div class="ai-config-grid">' +
        '<div class="field"><label for="aiProvider">模型来源</label><select class="select" id="aiProvider" name="provider">' +
          [['auto','自动检测'],['builtin','浏览器内置模型'],['ollama','Ollama / 本地模型'],['compatible','兼容接口'],['offline','离线训练模式']].map(function (item) { return '<option value="' + item[0] + '"' + (ai.provider === item[0] ? " selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></div>' +
        '<div class="field"><label for="aiModel">模型名称</label><input class="input" id="aiModel" name="model" value="' + escapeHtml(ai.model || "") + '" placeholder="例如：qwen2.5:7b"></div>' +
        '<div class="field full"><label for="aiBaseUrl">接口地址</label><input class="input" id="aiBaseUrl" name="baseUrl" value="' + escapeHtml(ai.baseUrl || "") + '" placeholder="例如：http://localhost:11434"></div>' +
        '<div class="field"><label for="aiApiKey">API Key</label><input class="input" id="aiApiKey" name="apiKey" type="password" placeholder="留空表示保持原值或不使用密钥"><span class="field-hint">密钥只保存在当前浏览器。</span></div>' +
        '<div class="field"><label for="aiTemperature">温度</label><input class="input" id="aiTemperature" name="temperature" type="number" min="0" max="1.5" step="0.1" value="' + escapeHtml(ai.temperature || 0.6) + '"></div>' +
      '</div><div class="form-actions"><button class="btn" type="button" data-action="test-ai">测试连接</button><button class="btn btn-primary" type="submit">保存 AI 设置</button></div></form>' +
      '<div class="ai-help mt-2">Ollama 默认地址为 <code>http://localhost:11434</code>。浏览器内置模型不一定在所有电脑上可用。</div></section>';

    const screeningCard = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>自动筛选规则</h3><p>只作用于已经导入职途的岗位。</p></div><button class="btn btn-sm btn-primary" data-action="edit-screening">编辑规则</button></div>' +
      '<div class="screen-rule-summary"><span><strong>关注词：</strong>' + escapeHtml((screening.includeKeywords || []).join("、") || "未设置") + '</span><span><strong>排除词：</strong>' + escapeHtml((screening.excludeKeywords || []).join("、") || "未设置") + '</span><span><strong>最低匹配：</strong>' + escapeHtml(String(screening.minScore || 0)) + '%</span><span><strong>目标城市：</strong>' + escapeHtml((screening.cities || []).join("、") || "按岗位城市判断") + '</span></div>' +
      '<div class="form-actions" style="justify-content:flex-start"><button class="btn btn-soft" type="button" data-action="screen-all">重新筛选全部岗位</button></div></section>';

    const dataCard = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>数据备份</h3><p>当前版本不连接云端，导出 JSON 是最可靠的备份方式。</p></div></div>' +
      '<div class="data-note"><strong>隐私说明</strong><br>姓名、电话、邮箱、岗位记录和面试答案只保存在当前浏览器 LocalStorage 中，不会发送到网络。清理浏览器数据或更换浏览器前，请先导出备份。</div>' +
      '<div class="data-actions"><button class="btn btn-primary" data-action="export-data">导出数据备份</button>' +
      '<button class="btn" data-action="import-data">导入备份</button>' +
      '<button class="btn" data-action="reset-demo">恢复初始内容</button>' +
      '<button class="btn btn-danger" data-action="wipe-data">清空全部数据</button></div></section>';

    const guide = '<section class="card card-pad mt-2"><div class="card-head"><div><h3>建议的使用顺序</h3><p>用起来比功能多更重要</p></div></div>' +
      '<div class="timeline">' + timelineItem("1", "核对能力档案", "把姓名、联系方式、学校、项目和技能改成真实内容。", "先做") +
      timelineItem("2", "录入目标岗位", "把招聘网站的完整 JD 复制进来，至少包含岗位职责和任职要求。", "每周") +
      timelineItem("3", "处理技能缺口", "把缺失技能拆成任务；不会的技能不要在简历里硬写。", "按需") +
      timelineItem("4", "定制并投递", "确认公司、岗位、简历版本和截止日期，再设置下一步。", "投递时") +
      timelineItem("5", "记录面试复盘", "每次面试后更新答案和项目素材，反哺能力档案。", "长期") + '</div></section>';

    return '<div class="page-head"><div><h2>本地数据，不做黑箱</h2><p>可以连接模型和平台搜索，但不会代替你登录、投递或绕过平台验证。</p></div></div>' + summary + aiCard + screeningCard + dataCard + guide;
  }

  function timelineItem(number, title, text, tag) {
    return '<div class="timeline-item"><div class="timeline-dot"><i></i></div><div class="timeline-body"><strong>' + escapeHtml(number + ". " + title) + '</strong><span>' + escapeHtml(tag) + '</span><p>' + escapeHtml(text) + '</p></div></div>';
  }

  function openTianyancha(companyName) {
    const value = String(companyName || companySearch || "").trim();
    if (!value) { showToast("请先输入公司名称。", "error"); return; }
    window.open(E.tianyanchaSearchUrl(value), "_blank", "noopener,noreferrer");
  }

  function openCompanyModal(companyId, prefill) {
    const company = companyId ? (state.companies || []).find(function (item) { return item.id === companyId; }) : null;
    const data = company || prefill || { id: "", name: "", status: "", industry: "", scale: "", location: "", established: "", capital: "", legalPerson: "", creditCode: "", riskLevel: "未评估", notes: "" };
    const body = '<form id="company-form" data-form="company"><input type="hidden" name="id" value="' + escapeHtml(data.id) + '">' +
      '<div class="form-grid three">' +
        field("公司名称", "name", data.name, "text", "填写公司全称", true, true) +
        field("经营状态", "status", data.status, "text", "存续 / 在业 / 注销") +
        field("所属行业", "industry", data.industry, "text", "例如：工业自动化") +
        field("人员规模", "scale", data.scale, "text", "例如：100-499人") +
        field("地区", "location", data.location, "text", "注册地或办公地") +
        field("成立日期", "established", data.established, "text", "例如：2015-06-18") +
        field("注册资本", "capital", data.capital, "text", "例如：1000万人民币") +
        field("法定代表人", "legalPerson", data.legalPerson, "text", "姓名") +
        field("统一社会信用代码", "creditCode", data.creditCode, "text", "18 位代码") +
        '<div class="field"><label for="riskLevel">风险判断</label><select class="select" id="riskLevel" name="riskLevel">' + ['未评估','低','中','高'].map(function (level) { return '<option value="' + level + '"' + (data.riskLevel === level ? " selected" : "") + '>' + level + '</option>'; }).join("") + '</select></div>' +
        '<div class="field full"><label for="sourceText">粘贴天眼查页面文字（可选）</label><textarea class="textarea" id="sourceText" name="sourceText" placeholder="把天眼查公开页面中能看到的工商信息复制到这里，保存时会尽量自动识别"></textarea><span class="field-hint">不会自动抓取或绕过登录，只解析你主动粘贴的内容。</span></div>' +
        '<div class="field full"><label for="notes">我的研究结论</label><textarea class="textarea" id="notes" name="notes" placeholder="例如：主营业务匹配、规模稳定、通勤较远、面试需要核实外包情况">' + escapeHtml(data.notes || "") + '</textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><button class="btn" type="button" data-action="open-tianyancha-value" data-company="' + escapeHtml(data.name || "") + '">打开天眼查</button><button class="btn btn-primary" type="submit" form="company-form">' + (company ? "保存档案" : "创建档案") + '</button>';
    openModal({ title: company ? "编辑公司研究档案" : "新建公司研究档案", body: body, footer: footer, wide: true });
  }

  function companyFromJob(jobId) {
    const job = getJob(jobId);
    if (!job || !job.company || job.company === "公司待确认") { showToast("该岗位还没有公司名称。", "error"); return; }
    const existing = (state.companies || []).find(function (company) { return company.name.toLowerCase() === job.company.toLowerCase(); });
    openTianyancha(job.company);
    if (existing) openCompanyModal(existing.id);
    else openCompanyModal("", { name: job.company, industry: "", scale: "", location: job.city || "", status: "", notes: "由岗位「" + job.title + "」创建，面试前补充公司研究。" });
  }

  function openModal(options) {
    modalContext = options.context || {};
    modalRoot.innerHTML = '<div class="modal ' + (options.wide ? "wide" : "") + '" role="dialog" aria-modal="true" aria-label="' + escapeHtml(options.title) + '">' +
      '<div class="modal-head"><h3>' + escapeHtml(options.title) + '</h3><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div>' +
      '<div class="modal-body">' + options.body + '</div>' +
      (options.footer ? '<div class="modal-foot">' + options.footer + '</div>' : "") +
    '</div>';
    modalRoot.classList.add("open");
    modalRoot.setAttribute("aria-hidden", "false");
    const firstInput = modalRoot.querySelector("input, textarea, select, button");
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 30);
  }

  function closeModal() {
    modalRoot.classList.remove("open");
    modalRoot.setAttribute("aria-hidden", "true");
    modalRoot.innerHTML = "";
    modalContext = {};
  }

  function openJobModal(jobId, prefill) {
    const job = jobId ? getJob(jobId) : null;
    const data = job || prefill || { id: "", company: "", title: "", city: "", salary: "", source: "", url: "", jd: "", status: "待评估", favorite: false, nextAction: "完成岗位匹配与简历关键词调整", nextActionDate: E.todayISO(), notes: "" };
    const body = '<form id="job-form" data-form="job"><input type="hidden" name="id" value="' + escapeHtml(data.id) + '">' +
      '<div class="form-grid three">' +
        field("公司", "company", data.company, "text", "公司名称", true) +
        field("岗位名称", "title", data.title, "text", "例如：自动化工程师", true) +
        field("工作城市", "city", data.city, "text", "例如：苏州") +
        field("薪资范围", "salary", data.salary, "text", "例如：9-14K") +
        field("信息来源", "source", data.source, "text", "BOSS / 智联 / 企业官网等") +
        '<div class="field"><label for="status">当前状态</label><select class="select" id="status" name="status">' +
          E.JOB_STATUSES.map(function (status) { return '<option value="' + escapeHtml(status) + '"' + (data.status === status ? " selected" : "") + '>' + escapeHtml(status) + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="field span-2"><label for="url">招聘链接</label><input class="input" id="url" name="url" type="url" value="' + escapeHtml(data.url || "") + '" placeholder="可选，用于以后回看原岗位"></div>' +
        '<div class="field"><label for="favorite">是否重点</label><select class="select" id="favorite" name="favorite"><option value="false"' + (!data.favorite ? " selected" : "") + '>普通</option><option value="true"' + (data.favorite ? " selected" : "") + '>重点岗位</option></select></div>' +
        '<div class="field span-2"><label for="nextAction">下一步动作</label><input class="input" id="nextAction" name="nextAction" value="' + escapeHtml(data.nextAction || "") + '" placeholder="例如：修改简历后投递"></div>' +
        '<div class="field"><label for="nextActionDate">下一步日期</label><input class="input" id="nextActionDate" name="nextActionDate" type="date" value="' + escapeHtml(data.nextActionDate || "") + '"></div>' +
        '<div class="field full"><label for="jd">岗位职责与任职要求</label><textarea class="textarea large" id="jd" name="jd" required placeholder="直接从招聘网站复制完整 JD">' + escapeHtml(data.jd || "") + '</textarea><span class="field-hint">建议保留“岗位职责”和“任职要求”标题，关键词识别会更准确。</span></div>' +
        '<div class="field full"><label for="notes">个人备注</label><textarea class="textarea" id="notes" name="notes" placeholder="联系人、内推、投递渠道或其他信息">' + escapeHtml(data.notes || "") + '</textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="job-form">' + (job ? "保存修改" : "保存并计算匹配") + '</button>';
    openModal({ title: job ? "编辑岗位" : "录入岗位 JD", body: body, footer: footer });
  }

  function openJobImportModal() {
    const body = '<form id="job-import-form" data-form="import-job">' +
      '<div class="data-note"><strong>支持两种输入</strong><br>1. 直接粘贴岗位详情页的完整文本；2. 使用“采集书签”复制后的结构化内容。导入后仍需核对公司、岗位名称和完整 JD。</div>' +
      '<div class="field mt-2"><label for="importText">粘贴内容</label><textarea class="textarea large" id="importText" name="importText" required placeholder="在这里粘贴招聘页面内容或职途采集 JSON"></textarea></div>' +
      '</form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><a class="btn" href="采集书签.html" target="_blank">打开采集书签</a><button class="btn btn-primary" type="submit" form="job-import-form">识别并导入</button>';
    openModal({ title: "粘贴 JD 或网页采集内容", body: body, footer: footer });
  }

  function importJobsFromText(input) {
    const jobs = E.parseImportedJobs(input);
    if (!jobs.length) { showToast("没有识别到岗位内容。", "error"); return; }
    if (jobs.length === 1) { closeModal(); openJobModal("", jobs[0]); showToast("已识别 1 个岗位，请核对后保存。", "success"); return; }
    if (!confirm("识别到 " + jobs.length + " 个岗位，确认全部导入为待评估岗位？")) return;
    jobs.forEach(function (item) {
      state.jobs.unshift({ id: E.uid("job"), company: item.company || "公司待确认", title: item.title || "岗位待确认", city: item.city || "", salary: item.salary || "", source: item.source || "批量导入", url: item.url || "", jd: item.jd || "", status: "待评估", favorite: false, nextAction: "核对岗位信息并完成筛选", nextActionDate: E.todayISO(), notes: item.notes || "", createdAt: new Date().toISOString() });
    });
    saveState(); closeModal(); render(); showToast("已导入 " + jobs.length + " 个岗位。", "success");
  }

  async function readClipboardImport() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error("clipboard unavailable");
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error("empty");
      importJobsFromText(text);
    } catch (error) {
      openJobImportModal();
      showToast("浏览器未授权读取剪贴板，请在弹窗中手动粘贴。", "error");
    }
  }

  function screenAllJobs() {
    const counts = { "推荐": 0, "可考虑": 0, "不建议": 0 };
    state.jobs.forEach(function (job) {
      const result = getScreen(job);
      job.autoDecision = result.decision; job.screenedAt = result.screenedAt; counts[result.decision] += 1;
    });
    saveState(); render();
    showToast("筛选完成：推荐 " + counts["推荐"] + "，可考虑 " + counts["可考虑"] + "，不建议 " + counts["不建议"] + "。", "success");
  }

  function openScreeningModal() {
    const rules = state.settings.screening || {};
    const body = '<form id="screening-form" data-form="screening"><div class="form-grid">' +
      '<div class="field full"><label for="includeKeywords">关注关键词</label><input class="input" id="includeKeywords" name="includeKeywords" value="' + escapeHtml((rules.includeKeywords || []).join("、")) + '" placeholder="自动化、PLC、机器人"><span class="field-hint">JD 命中任意一个关键词即可通过第一层。</span></div>' +
      '<div class="field full"><label for="excludeKeywords">排除关键词</label><input class="input" id="excludeKeywords" name="excludeKeywords" value="' + escapeHtml((rules.excludeKeywords || []).join("、")) + '" placeholder="销售、客服、中介"><span class="field-hint">命中排除词时直接标记为不建议。</span></div>' +
      '<div class="field"><label for="minScore">最低匹配分</label><input class="input" id="minScore" name="minScore" type="number" min="0" max="100" value="' + escapeHtml(rules.minScore || 50) + '"></div>' +
      '<div class="field"><label for="cities">目标城市</label><input class="input" id="cities" name="cities" value="' + escapeHtml((rules.cities || []).join("、")) + '" placeholder="南京、苏州、上海"></div>' +
      '<div class="field"><label for="onlyFreshGraduate">应届要求</label><select class="select" id="onlyFreshGraduate" name="onlyFreshGraduate"><option value="true"' + (rules.onlyFreshGraduate ? " selected" : "") + '>优先应届 / 经验不限</option><option value="false"' + (!rules.onlyFreshGraduate ? " selected" : "") + '>不限制经验</option></select></div>' +
      '</div></form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="screening-form">保存并重新筛选</button>';
    openModal({ title: "自动筛选规则", body: body, footer: footer });
  }

  function openPlatformQueryModal() {
    const query = (state.profile.targetRoles && state.profile.targetRoles[0]) || "自动化工程师";
    const city = (state.profile.targetCities && state.profile.targetCities[0]) || "";
    const body = '<form id="platform-query-form" data-form="platform-query"><div class="form-grid">' + field("搜索关键词", "query", query, "text", "例如：PLC 工程师", true, true) + field("城市", "city", city !== "待填写" ? city : "", "text", "例如：南京；留空表示不限") + '</div><div class="field-hint">修改后会更新能力档案中的第一个目标岗位和第一个目标城市。</div></form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="platform-query-form">保存关键词</button>';
    openModal({ title: "设置平台搜索条件", body: body, footer: footer });
  }

  function openProjectModal(projectId) {
    const project = projectId ? (state.profile.projects || []).find(function (item) { return item.id === projectId; }) : null;
    const data = project || { id: "", name: "", role: "", period: "", background: "", actions: "", result: "", keywords: [] };
    const body = '<form id="project-form" data-form="project"><input type="hidden" name="id" value="' + escapeHtml(data.id) + '">' +
      '<div class="form-grid">' +
        field("项目名称", "name", data.name, "text", "例如：自动化工厂生产线", true) +
        field("你的角色", "role", data.role, "text", "例如：独立完成 / 负责 PLC 程序", true) +
        field("项目时间", "period", data.period, "text", "例如：2025 课程项目") +
        field("关键词", "keywords", (data.keywords || []).join("、"), "text", "TIA Portal、Factory IO、PLC；用顿号分隔", true, true) +
        '<div class="field full"><label for="background">项目背景 / 任务</label><textarea class="textarea" id="background" name="background" required placeholder="要解决什么问题，项目规模或目标是什么">' + escapeHtml(data.background || "") + '</textarea></div>' +
        '<div class="field full"><label for="actions">你具体做了什么</label><textarea class="textarea" id="actions" name="actions" required placeholder="写明工具、方法、关键步骤和遇到的困难">' + escapeHtml(data.actions || "") + '</textarea></div>' +
        '<div class="field full"><label for="result">项目结果</label><textarea class="textarea" id="result" name="result" required placeholder="尽量写量化结果；没有数字也要说明完成程度">' + escapeHtml(data.result || "") + '</textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="project-form">' + (project ? "保存修改" : "添加项目") + '</button>';
    openModal({ title: project ? "编辑项目证据" : "添加项目证据", body: body, footer: footer });
  }

  function openTaskModal(options) {
    const data = options || {};
    const body = '<form id="task-form" data-form="task"><input type="hidden" name="relatedJobId" value="' + escapeHtml(data.relatedJobId || "") + '">' +
      '<div class="form-grid">' +
        field("任务内容", "title", data.title || "", "text", "例如：整理 Factory IO 项目的 5 条 STAR 素材", true, true) +
        field("截止日期", "due", data.due || E.todayISO(), "date", "") +
        '<div class="field"><label for="priority">优先级</label><select class="select" id="priority" name="priority"><option>高</option><option selected>中</option><option>低</option></select></div>' +
      '</div></form>';
    const footer = '<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="task-form">添加任务</button>';
    openModal({ title: "添加下一步任务", body: body, footer: footer });
  }

  function openJobDetail(jobId) {
    const job = getJob(jobId);
    if (!job) return;
    const analysis = getAnalysis(job);
    const screening = getScreen(job);
    const matched = analysis.matched.length ? analysis.matched.map(function (item) {
      return '<span class="pill strong">' + escapeHtml(item.skill.name) + ' · ' + item.level + '/5</span>';
    }).join("") : '<span class="muted">暂未识别到你已掌握的岗位关键词</span>';
    const missing = analysis.missing.length ? analysis.missing.map(function (item) {
      return '<span class="pill missing">' + escapeHtml(item.skill.name) + '</span>';
    }).join("") : '<span class="badge badge-green">未发现明显技能缺口</span>';
    const body = '<div class="match-summary"><div class="big-score"><b class="' + E.scoreClass(analysis.score) + '">' + analysis.score + '</b><span>岗位匹配度</span></div>' +
      '<div class="match-note"><strong>' + escapeHtml(job.company + " · " + job.title) + '</strong><br>' + escapeHtml(analysis.note) + '</div></div>' +
      '<div class="screen-banner mt-2 ' + (screening.decision === "不建议" ? "warn" : "") + '"><div><strong>自动筛选结论：' + escapeHtml(screening.decision) + '</strong><span>' + escapeHtml((screening.reasons || []).concat(screening.warnings || []).join("；") || "暂无筛选说明") + '</span></div><span class="badge ' + decisionClass(screening.decision) + '">' + escapeHtml(screening.decision) + '</span></div>' +
      '<div class="grid grid-2 mt-2"><section><h4>已匹配能力</h4><div class="skill-list">' + matched + '</div></section>' +
      '<section><h4>技能缺口</h4><div class="skill-list">' + missing + '</div></section></div>' +
      '<section class="mt-2"><h4>建议动作</h4><div class="action-list">' + analysis.suggestions.map(function (suggestion, index) {
        return '<div class="action-item"><span class="stat-icon">' + (index + 1) + '</span><div><strong>' + escapeHtml(suggestion) + '</strong></div></div>';
      }).join("") + '</div></section>' +
      '<section class="mt-2"><h4>相关项目证据</h4>' + (analysis.relevantProjects.length ? '<div class="project-list">' + analysis.relevantProjects.map(function (item) {
        return '<div class="project-card"><div><h4>' + escapeHtml(item.project.name) + '</h4><p>' + escapeHtml(shortText(item.project.result, 150)) + '</p>' +
          '<div class="skill-list">' + item.hits.map(function (hit) { return '<span class="pill strong">' + escapeHtml(hit) + '</span>'; }).join("") + '</div></div></div>';
      }).join("") + '</div>' : '<p class="muted">未找到强相关项目。可以先补充项目关键词，或优先准备技能缺口。</p>') + '</section>' +
      '<section class="mt-2"><div class="card-head"><div><h4>原始 JD</h4><p>匹配基于这份文本计算</p></div></div><div class="jd-text">' + escapeHtml(job.jd) + '</div></section>';
    const footer = '<button class="btn" data-action="close-modal">关闭</button>' +
      '<button class="btn" data-action="edit-job" data-job-id="' + escapeHtml(job.id) + '">编辑岗位</button>' +
      '<button class="btn" data-action="company-from-job" data-job-id="' + escapeHtml(job.id) + '">查公司</button>' +
      '<button class="btn" data-action="add-job-task" data-job-id="' + escapeHtml(job.id) + '">生成补齐任务</button>' +
      '<button class="btn btn-soft" data-action="resume-for-job" data-job-id="' + escapeHtml(job.id) + '">定制简历</button>' +
      '<button class="btn btn-primary" data-action="interview-for-job" data-job-id="' + escapeHtml(job.id) + '">准备面试</button>';
    openModal({ title: "岗位匹配详情", body: body, footer: footer, wide: true });
  }

  function generateTasksForJob(jobId) {
    const job = getJob(jobId);
    if (!job) return;
    const analysis = getAnalysis(job);
    const generated = E.generateTasks(job, analysis);
    const existing = new Set(state.tasks.map(function (task) { return task.title; }));
    generated.forEach(function (task) {
      if (existing.has(task.title)) return;
      state.tasks.push({
        id: E.uid("task"),
        title: task.title,
        due: job.nextActionDate || E.todayISO(),
        priority: task.priority,
        done: false,
        relatedJobId: task.relatedJobId,
        createdAt: new Date().toISOString()
      });
      existing.add(task.title);
    });
    saveState();
    closeModal();
    showToast("已根据岗位生成补齐任务。", "success");
    activeView = "dashboard";
    render();
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      showToast("已复制到剪贴板。", "success");
    } catch (error) {
      showToast("复制失败，请手动选择文本。", "error");
    }
  }

  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "career-copilot-backup-" + E.todayISO() + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("数据备份已导出。", "success");
  }

  function importDataFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!E.validateState(parsed)) throw new Error("invalid");
        state = normalizeSavedState(parsed);
        resumeJobId = state.jobs[0] ? state.jobs[0].id : "";
        interviewJobId = state.jobs[0] ? state.jobs[0].id : "";
        saveState();
        render();
        showToast("数据导入成功。", "success");
      } catch (error) {
        showToast("导入失败：文件不是有效的职途备份。", "error");
      } finally {
        importFile.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function splitList(text) {
    return String(text || "").split(/[、,，;；\n]+/).map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function removeExamples() {
    state.jobs = state.jobs.filter(function (job) { return job.source !== "示例"; });
    state.settings.showExamples = false;
    saveState();
    render();
    showToast("示例岗位已清除。", "success");
  }

  document.addEventListener("click", function (event) {
    const menuButton = event.target.closest("#mobile-menu");
    if (menuButton) {
      sidebar.classList.toggle("open");
      return;
    }

    const navTrigger = event.target.closest("[data-view]");
    if (navTrigger && (navTrigger.classList.contains("nav-item") || navTrigger.tagName === "BUTTON")) {
      navigate(navTrigger.dataset.view);
      return;
    }

    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    const action = trigger.dataset.action;
    const jobId = trigger.dataset.jobId || "";
    const taskId = trigger.dataset.taskId || "";
    const projectId = trigger.dataset.projectId || "";
    const skillId = trigger.dataset.skillId || "";

    if (action === "close-modal") { closeModal(); return; }
    if (action === "add-job") { openJobModal(""); return; }
    if (action === "view-job") { openJobDetail(jobId); return; }
    if (action === "edit-job") { openJobModal(jobId); return; }
    if (action === "delete-job") {
      const job = getJob(jobId);
      if (job && confirm("确认删除岗位「" + job.company + " · " + job.title + "」？相关投递记录也会一起删除。")) {
        state.jobs = state.jobs.filter(function (item) { return item.id !== jobId; });
        saveState();
        render();
        showToast("岗位已删除。", "success");
      }
      return;
    }
    if (action === "add-job-task") { generateTasksForJob(jobId); return; }
    if (action === "resume-for-job") {
      resumeJobId = jobId;
      closeModal();
      activeView = "resume";
      render();
      return;
    }
    if (action === "interview-for-job") {
      interviewJobId = jobId;
      closeModal();
      activeView = "interview";
      render();
      return;
    }
    if (action === "add-task") { openTaskModal({}); return; }
    if (action === "toggle-task") {
      const task = state.tasks.find(function (item) { return item.id === taskId; });
      if (task) { task.done = !task.done; saveState(); render(); }
      return;
    }
    if (action === "delete-task") {
      state.tasks = state.tasks.filter(function (item) { return item.id !== taskId; });
      saveState();
      render();
      return;
    }
    if (action === "add-project") { openProjectModal(""); return; }
    if (action === "edit-project") { openProjectModal(projectId); return; }
    if (action === "delete-project") {
      const project = (state.profile.projects || []).find(function (item) { return item.id === projectId; });
      if (project && confirm("确认删除项目「" + project.name + "」？")) {
        state.profile.projects = state.profile.projects.filter(function (item) { return item.id !== projectId; });
        saveState();
        render();
        showToast("项目已删除。", "success");
      }
      return;
    }
    if (action === "remove-skill") {
      state.profile.skills = state.profile.skills.filter(function (item) { return item.id !== skillId; });
      saveState();
      render();
      return;
    }
    if (action === "copy-resume") {
      const job = getJob(resumeJobId);
      if (!job) { showToast("请先选择岗位。", "error"); return; }
      copyText(E.resumePlainText(job, state.profile, getAnalysis(job)));
      return;
    }
    if (action === "print-resume") { window.print(); return; }
    if (action === "copy-interview") {
      const job = getJob(jobId || interviewJobId);
      if (!job) return;
      const questions = E.generateInterviewQuestions(job, state.profile, getAnalysis(job));
      const text = "面试准备｜" + job.company + " · " + job.title + "\n\n" + questions.map(function (question, index) {
        return (index + 1) + ". [" + question.category + "] " + question.question + "\n提示：" + question.hint;
      }).join("\n\n");
      copyText(text);
      return;
    }
    if (action === "open-platform") {
      const query = (state.profile.targetRoles && state.profile.targetRoles[0]) || "自动化工程师";
      const city = (state.profile.targetCities && state.profile.targetCities[0]) || "";
      const url = E.platformSearchUrl(trigger.dataset.platform, query, city === "待填写" ? "" : city);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "import-job-text") { openJobImportModal(); return; }
    if (action === "import-clipboard") { readClipboardImport(); return; }
    if (action === "edit-screening") { openScreeningModal(); return; }
    if (action === "screen-all") { screenAllJobs(); return; }
    if (action === "edit-platform-query") { openPlatformQueryModal(); return; }
    if (action === "test-ai") { testAIConnection(); return; }
    if (action === "reset-ai-session") { resetAISession(); return; }
    if (action === "finish-ai-session") { finishAISession(); return; }
    if (action === "open-tianyancha") { openTianyancha(companySearch); return; }
    if (action === "quick-company-search") { companySearch = trigger.dataset.company || ""; render(); openTianyancha(companySearch); return; }
    if (action === "open-tianyancha-value") { openTianyancha(trigger.dataset.company); return; }
    if (action === "add-company") { openCompanyModal(""); return; }
    if (action === "edit-company") { openCompanyModal(trigger.dataset.companyId); return; }
    if (action === "open-company-tianyancha") { const company = (state.companies || []).find(function (item) { return item.id === trigger.dataset.companyId; }); if (company) openTianyancha(company.name); return; }
    if (action === "delete-company") { const company = (state.companies || []).find(function (item) { return item.id === trigger.dataset.companyId; }); if (company && confirm("确认删除公司档案「" + company.name + "」？")) { state.companies = state.companies.filter(function (item) { return item.id !== company.id; }); saveState(); render(); showToast("公司档案已删除。", "success"); } return; }
    if (action === "company-from-job") { companyFromJob(jobId); return; }
    if (action === "export-data") { exportData(); return; }
    if (action === "import-data") { importFile.click(); return; }
    if (action === "reset-demo") {
      if (confirm("恢复初始内容会覆盖当前数据，确认继续？")) {
        state = E.clone(E.DEFAULT_STATE);
        saveState();
        resumeJobId = state.jobs[0] ? state.jobs[0].id : "";
        interviewJobId = state.jobs[0] ? state.jobs[0].id : "";
        render();
        showToast("已恢复初始内容。", "success");
      }
      return;
    }
    if (action === "wipe-data") {
      if (confirm("这会删除岗位、任务、项目和面试答案，且无法撤销。确认清空？")) {
        state = E.clone(E.DEFAULT_STATE);
        state.jobs = [];
        state.tasks = [];
        state.interviewAnswers = {};
        state.profile.name = "";
        state.profile.email = "";
        state.profile.phone = "";
        state.profile.city = "";
        state.profile.targetCities = ["待填写"];
        state.profile.skills = [];
        state.profile.projects = [];
        state.profile.education = [{ id: "edu-1", school: "", major: "自动化相关专业", degree: "本科在读（大四）", period: "" }];
        saveState();
        resumeJobId = "";
        interviewJobId = "";
        render();
        showToast("全部个人数据已清空。", "success");
      }
      return;
    }
    if (action === "remove-examples") { removeExamples(); }
  });

  let answerSaveTimer = null;
  let searchRefreshTimer = null;
  let searchComposing = false;

  function refreshSearchView(action) {
    const active = document.activeElement;
    const shouldFocus = !!(active && active.dataset && active.dataset.action === action);
    const cursor = shouldFocus ? active.selectionStart : null;
    if (action === "filter-jobs") view.innerHTML = renderJobs();
    else view.innerHTML = renderCompany();
    const inputId = action === "filter-jobs" ? "job-search" : "company-search";
    const input = document.getElementById(inputId);
    if (input && shouldFocus) {
      input.focus();
      if (cursor != null) input.setSelectionRange(cursor, cursor);
    }
  }

  function scheduleSearchRefresh(action) {
    clearTimeout(searchRefreshTimer);
    searchRefreshTimer = setTimeout(function () {
      if (searchComposing) return;
      refreshSearchView(action);
    }, 320);
  }

  document.addEventListener("input", function (event) {
    const target = event.target;
    if (target.dataset.action === "filter-jobs") {
      jobSearch = target.value;
      if (!searchComposing) scheduleSearchRefresh("filter-jobs");
      return;
    }
    if (target.dataset.action === "filter-companies") {
      companySearch = target.value;
      if (!searchComposing) scheduleSearchRefresh("filter-companies");
      return;
    }
    if (target.dataset.answerKey) {
      state.interviewAnswers[target.dataset.answerKey] = target.value;
      clearTimeout(answerSaveTimer);
      answerSaveTimer = setTimeout(saveState, 450);
    }
  });

  document.addEventListener("compositionstart", function (event) {
    if (event.target.dataset && ["filter-jobs", "filter-companies"].indexOf(event.target.dataset.action) >= 0) {
      searchComposing = true;
      clearTimeout(searchRefreshTimer);
    }
  });

  document.addEventListener("compositionend", function (event) {
    if (event.target.dataset && ["filter-jobs", "filter-companies"].indexOf(event.target.dataset.action) >= 0) {
      searchComposing = false;
      if (event.target.dataset.action === "filter-jobs") jobSearch = event.target.value;
      if (event.target.dataset.action === "filter-companies") companySearch = event.target.value;
      scheduleSearchRefresh(event.target.dataset.action);
    }
  });

  document.addEventListener("compositionstart", function (event) {
    if (event.target.dataset && ["filter-jobs", "filter-companies"].indexOf(event.target.dataset.action) >= 0) {
      searchComposing = true;
      clearTimeout(searchRefreshTimer);
    }
  });

  document.addEventListener("compositionend", function (event) {
    if (event.target.dataset && ["filter-jobs", "filter-companies"].indexOf(event.target.dataset.action) >= 0) {
      searchComposing = false;
      if (event.target.dataset.action === "filter-jobs") jobSearch = event.target.value;
      if (event.target.dataset.action === "filter-companies") companySearch = event.target.value;
      scheduleSearchRefresh(event.target.dataset.action);
    }
  });

  document.addEventListener("change", function (event) {
    const target = event.target;
    const action = target.dataset.action;
    if (action === "filter-job-status") {
      jobStatusFilter = target.value;
      render();
      return;
    }
    if (action === "filter-job-decision") {
      jobDecisionFilter = target.value;
      render();
      return;
    }
    if (action === "select-ai-job") {
      interviewJobId = target.value;
      render();
      return;
    }
    if (action === "select-resume-job") {
      resumeJobId = target.value;
      render();
      return;
    }
    if (action === "select-interview-job") {
      interviewJobId = target.value;
      render();
      return;
    }
    if (action === "change-status") {
      const job = getJob(target.dataset.jobId);
      if (job) {
        job.status = target.value;
        if (job.status === "已投递" && !job.appliedAt) job.appliedAt = E.todayISO();
        saveState();
        showToast("岗位状态已更新。", "success");
        render();
      }
      return;
    }
    if (target === importFile) {
      importDataFile(target.files && target.files[0]);
    }
  });

  document.addEventListener("submit", async function (event) {
    const form = event.target;
    const type = form.dataset.form;
    if (!type) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());

    if (type === "company") {
      const existing = values.id ? (state.companies || []).find(function (item) { return item.id === values.id; }) : null;
      const parsed = E.parseCompanyText(values.sourceText || "");
      const company = existing || { id: E.uid("company"), createdAt: new Date().toISOString() };
      company.name = String(values.name || parsed.name || "").trim();
      company.status = String(values.status || parsed.status || "").trim();
      company.industry = String(values.industry || parsed.industry || "").trim();
      company.scale = String(values.scale || parsed.scale || "").trim();
      company.location = String(values.location || parsed.location || "").trim();
      company.established = String(values.established || parsed.established || "").trim();
      company.capital = String(values.capital || parsed.capital || "").trim();
      company.legalPerson = String(values.legalPerson || parsed.legalPerson || "").trim();
      company.creditCode = String(values.creditCode || parsed.creditCode || "").trim();
      company.businessScope = parsed.businessScope || company.businessScope || "";
      company.riskLevel = values.riskLevel || "未评估";
      company.notes = String(values.notes || "").trim();
      company.tianyanchaUrl = E.tianyanchaSearchUrl(company.name);
      company.updatedAt = new Date().toISOString();
      if (!existing) state.companies.unshift(company);
      saveState(); closeModal(); render();
      showToast(existing ? "公司档案已更新。" : "公司档案已创建。", "success");
      return;
    }
    if (type === "import-job") {
      importJobsFromText(values.importText);
      return;
    }

    if (type === "screening") {
      state.settings.screening = {
        includeKeywords: splitList(values.includeKeywords),
        excludeKeywords: splitList(values.excludeKeywords),
        minScore: Number(values.minScore || 50),
        cities: splitList(values.cities),
        onlyFreshGraduate: values.onlyFreshGraduate === "true"
      };
      closeModal();
      screenAllJobs();
      return;
    }

    if (type === "platform-query") {
      state.profile.targetRoles = splitList(values.query);
      state.profile.targetCities = values.city ? splitList(values.city) : ["待填写"];
      saveState();
      closeModal();
      render();
      showToast("平台搜索关键词已更新。", "success");
      return;
    }

    if (type === "ai-settings") {
      const oldAI = state.settings.ai || {};
      state.settings.ai = {
        provider: values.provider || "auto",
        baseUrl: String(values.baseUrl || "").trim(),
        model: String(values.model || "").trim(),
        apiKey: values.apiKey ? String(values.apiKey) : (oldAI.apiKey || ""),
        temperature: Number(values.temperature || 0.6)
      };
      saveState();
      render();
      showToast("AI 设置已保存。", "success");
      return;
    }

    if (type === "ai-start") {
      await startAISession(interviewJobId, values);
      return;
    }

    if (type === "ai-answer") {
      await sendAIAnswer(values.answer);
      return;
    }

    if (type === "profile") {
      const education = (state.profile.education && state.profile.education[0]) || { id: E.uid("edu") };
      state.profile.name = String(values.name || "").trim();
      state.profile.title = String(values.title || "").trim();
      state.profile.phone = String(values.phone || "").trim();
      state.profile.email = String(values.email || "").trim();
      state.profile.city = String(values.city || "").trim();
      state.profile.jobStartDate = values.jobStartDate || "";
      state.profile.targetRoles = splitList(values.targetRoles);
      state.profile.targetCities = splitList(values.targetCities);
      state.profile.summary = String(values.summary || "").trim();
      state.profile.education = [{
        id: education.id,
        school: String(values.school || "").trim(),
        major: String(values.major || "").trim(),
        degree: String(values.degree || "").trim(),
        period: String(values.period || "").trim()
      }];
      saveState();
      render();
      showToast("能力档案已保存。", "success");
      return;
    }

    if (type === "skill") {
      const skillIdValue = String(values.skillId || "");
      if (!skillIdValue) return;
      state.profile.skills.push({ id: skillIdValue, level: Number(values.level || 3) });
      saveState();
      render();
      showToast("技能已加入能力档案。", "success");
      return;
    }

    if (type === "job") {
      const isNew = !values.id;
      const job = isNew ? {
        id: E.uid("job"),
        createdAt: new Date().toISOString()
      } : getJob(values.id);
      if (!job) return;
      job.company = String(values.company || "").trim();
      job.title = String(values.title || "").trim();
      job.city = String(values.city || "").trim();
      job.salary = String(values.salary || "").trim();
      job.source = String(values.source || "").trim();
      job.url = String(values.url || "").trim();
      job.jd = String(values.jd || "").trim();
      job.status = values.status || "待评估";
      job.favorite = values.favorite === "true";
      job.nextAction = String(values.nextAction || "").trim();
      job.nextActionDate = values.nextActionDate || "";
      job.notes = String(values.notes || "").trim();
      const screeningResult = E.screenJob(job, state.profile, state.settings.screening || {});
      job.autoDecision = screeningResult.decision;
      job.screenedAt = screeningResult.screenedAt;
      if (isNew) {
        state.jobs.unshift(job);
        resumeJobId = job.id;
        interviewJobId = job.id;
      }
      saveState();
      closeModal();
      render();
      const analysis = getAnalysis(job);
      showToast("岗位已保存，当前匹配度 " + analysis.score + "%。", "success");
      return;
    }

    if (type === "project") {
      const project = values.id ? (state.profile.projects || []).find(function (item) { return item.id === values.id; }) : null;
      const payload = {
        id: project ? project.id : E.uid("project"),
        name: String(values.name || "").trim(),
        role: String(values.role || "").trim(),
        period: String(values.period || "").trim(),
        keywords: splitList(values.keywords),
        background: String(values.background || "").trim(),
        actions: String(values.actions || "").trim(),
        result: String(values.result || "").trim()
      };
      if (project) {
        Object.assign(project, payload);
      } else {
        state.profile.projects.push(payload);
      }
      saveState();
      closeModal();
      render();
      showToast(project ? "项目已更新。" : "项目已添加。", "success");
      return;
    }

    if (type === "task") {
      state.tasks.unshift({
        id: E.uid("task"),
        title: String(values.title || "").trim(),
        due: values.due || "",
        priority: values.priority || "中",
        done: false,
        relatedJobId: values.relatedJobId || "",
        createdAt: new Date().toISOString()
      });
      saveState();
      closeModal();
      render();
      showToast("任务已添加。", "success");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modalRoot.classList.contains("open")) closeModal();
  });

  modalRoot.addEventListener("click", function (event) {
    if (event.target === modalRoot) closeModal();
  });

  render();
  window.CareerCopilot = {
    getState: function () { return state; },
    navigate: navigate,
    analyze: getAnalysis
  };
})();


































