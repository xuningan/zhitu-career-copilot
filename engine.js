(function (global) {
  "use strict";

  const SKILL_LIBRARY = [
    {
      id: "tia-portal",
      name: "西门子 TIA Portal / 博图",
      category: "PLC 与工控",
      weight: 5,
      keywords: ["tia portal", "tia博途", "博图", "博途", "s7-1200", "s7-1500", "s7 1200", "s7 1500"]
    },
    {
      id: "plc-control",
      name: "PLC 控制与调试",
      category: "PLC 与工控",
      weight: 5,
      keywords: ["plc", "梯形图", "顺序控制", "控制逻辑", "plc编程", "plc程序", "程序调试"]
    },
    {
      id: "factoryio",
      name: "Factory IO / 产线仿真",
      category: "PLC 与工控",
      weight: 3,
      keywords: ["factory io", "factoryio", "工厂仿真", "产线仿真", "虚拟调试", "数字孪生"]
    },
    {
      id: "hmi",
      name: "HMI / WinCC / SCADA",
      category: "PLC 与工控",
      weight: 3,
      keywords: ["hmi", "触摸屏", "wincc", "scada", "上位机", "组态", "人机界面"]
    },
    {
      id: "industrial-network",
      name: "工业通信 / OPC UA / Modbus",
      category: "工业通信",
      weight: 4,
      keywords: ["opc ua", "opcua", "opc-ua", "modbus", "profinet", "profibus", "工业通信", "plc通讯", "通信协议"]
    },
    {
      id: "abb-robot",
      name: "ABB 工业机器人",
      category: "机器人与运动控制",
      weight: 4,
      keywords: ["abb机器人", "abb 机器人", "abb robot", "robotstudio", "工业机器人", "机器人编程", "机器人调试"]
    },
    {
      id: "motion-control",
      name: "伺服 / 变频器 / 运动控制",
      category: "机器人与运动控制",
      weight: 4,
      keywords: ["伺服", "变频器", "电机控制", "运动控制", "vfd", "drive", "驱动器"]
    },
    {
      id: "machine-vision",
      name: "机器视觉",
      category: "机器人与运动控制",
      weight: 3,
      keywords: ["机器视觉", "视觉检测", "视觉系统", "halcon", "opencv", "工业相机"]
    },
    {
      id: "solidworks",
      name: "SolidWorks 三维设计",
      category: "机械设计",
      weight: 4,
      keywords: ["solidworks", "solid works", "零件建模", "三维建模", "装配体", "装配设计"]
    },
    {
      id: "ug-nx",
      name: "UG NX / 机械设计",
      category: "机械设计",
      weight: 4,
      keywords: ["ug nx", "ug", "nx软件", "机械设计", "工程图", "三维设计"]
    },
    {
      id: "gear-design",
      name: "机械传动 / 减速器设计",
      category: "机械设计",
      weight: 3,
      keywords: ["减速器", "齿轮", "传动系统", "机械结构", "机械传动"]
    },
    {
      id: "electrical-design",
      name: "电气设计与电气图",
      category: "电气与实施",
      weight: 4,
      keywords: ["电气设计", "电气图", "eplan", "配电", "接线图", "电气原理图", "元器件选型"]
    },
    {
      id: "field-commissioning",
      name: "现场调试 / 项目实施",
      category: "电气与实施",
      weight: 4,
      keywords: ["现场调试", "安装调试", "项目实施", "故障排查", "设备调试", "出差", "售后服务"]
    },
    {
      id: "programming",
      name: "Python / C# / 数据采集",
      category: "工业软件",
      weight: 3,
      keywords: ["python", "c#", "c++", "c语言", "javascript", "sql", "数据库", "数据采集", "上位机开发", "脚本"]
    },
    {
      id: "lean-oee",
      name: "精益生产 / OEE / 节拍优化",
      category: "制造管理",
      weight: 3,
      keywords: ["精益生产", "工业工程", "oee", "节拍", "产线优化", "产能分析", "持续改善"]
    },
    {
      id: "quality-standard",
      name: "质量体系 / 工艺文件",
      category: "制造管理",
      weight: 3,
      keywords: ["iso", "质量体系", "工艺文件", "作业指导书", "技术文档", "标准化"]
    },
    {
      id: "english",
      name: "英文技术资料阅读",
      category: "综合能力",
      weight: 2,
      keywords: ["英语", "英文", "cet-4", "cet-6", "英文技术", "english"]
    },
    {
      id: "communication",
      name: "跨部门沟通与文档",
      category: "综合能力",
      weight: 2,
      keywords: ["沟通", "团队协作", "项目文档", "汇报", "跨部门", "需求分析"]
    }
  ];

  const JOB_STATUSES = ["待评估", "准备投递", "已投递", "笔试/测评", "面试", "Offer", "已结束"];

  const PLATFORM_SEARCHES = [
    { id: "boss", name: "BOSS直聘", url: "https://www.zhipin.com/web/geek/jobs?query={query}" },
    { id: "zhaopin", name: "智联招聘", url: "https://sou.zhaopin.com/?kw={query}&jl={city}" },
    { id: "51job", name: "前程无忧", url: "https://we.51job.com/pc/search?keyword={query}&jobArea={city}" },
    { id: "liepin", name: "猎聘", url: "https://www.liepin.com/zhaopin/?key={query}" },
    { id: "shixiseng", name: "实习僧", url: "https://www.shixiseng.com/interns?keyword={query}&city={city}" },
    { id: "iguopin", name: "国聘", url: "https://www.iguopin.com/job?search={query}" }
  ];

  const DEFAULT_STATE = {
    version: 3,
    profile: {
      name: "",
      title: "自动化 / 电气控制方向 大四学生",
      email: "",
      phone: "",
      city: "",
      targetRoles: ["自动化工程师", "PLC工程师", "电气工程师", "工业机器人工程师"],
      targetCities: ["待填写"],
      jobStartDate: "2026-10-15",
      summary: "自动化专业大四学生，具备 PLC 控制、产线仿真、工业机器人和机械设计基础。能够使用西门子 TIA Portal / 博图进行程序设计与调试，使用 Factory IO 搭建并仿真自动化生产线，使用 ABB 机器人完成基础编程与联调，并使用 SolidWorks、UG 完成机械零件建模与装配。",
      skills: [
        { id: "tia-portal", level: 4 },
        { id: "plc-control", level: 4 },
        { id: "factoryio", level: 4 },
        { id: "abb-robot", level: 3 },
        { id: "solidworks", level: 4 },
        { id: "ug-nx", level: 4 },
        { id: "gear-design", level: 4 }
      ],
      education: [
        { id: "edu-1", school: "", major: "自动化相关专业", degree: "本科在读（大四）", period: "" }
      ],
      projects: [
        {
          id: "proj-factoryio",
          name: "基于博图与 Factory IO 的自动化工厂生产线",
          role: "独立完成",
          period: "课程项目",
          background: "针对自动化工厂生产链场景，搭建从原料、加工、装配到分拣的仿真产线控制方案。",
          actions: "使用 TIA Portal / 博图完成 PLC 控制逻辑、顺序控制、联锁与故障处理，并在 Factory IO 中完成产线仿真和联调。",
          result: "实现完整生产链流程，能够独立完成程序编写、仿真验证和问题排查。",
          keywords: ["TIA Portal", "博图", "Factory IO", "PLC", "顺序控制", "虚拟调试", "故障处理"]
        },
        {
          id: "proj-gearbox",
          name: "减速器零件建模与整体装配",
          role: "独立完成",
          period: "课程项目",
          background: "根据机械传动设计要求完成减速器各零件的结构设计、建模与整体装配。",
          actions: "使用 SolidWorks、UG 完成零件三维建模、装配关系设计，并根据结构进行尺寸与配合检查。",
          result: "独立完成减速器全部零件建模与装配，形成完整的机械结构设计成果。",
          keywords: ["SolidWorks", "UG", "减速器", "齿轮", "机械设计", "零件建模", "装配体"]
        }
      ]
    },
    jobs: [
      {
        id: "job-sample-plc",
        company: "示例公司 A",
        title: "自动化工程师（PLC / 产线）",
        city: "苏州",
        salary: "9-14K",
        source: "示例",
        url: "",
        jd: "岗位职责：\n1. 负责自动化产线 PLC 程序编写、调试及现场实施；\n2. 使用 TIA Portal / 博图进行 S7-1200/1500 程序开发，并完成 HMI 组态；\n3. 参与 Factory IO 或虚拟仿真、Profinet / Modbus 通信调试；\n4. 配合工业机器人、伺服和视觉设备完成联调；\n5. 编写电气及项目技术文档。\n\n任职要求：\n1. 自动化、电气、机电相关专业本科；\n2. 熟悉 PLC 控制、TIA Portal / 博图，有实际项目经验；\n3. 熟悉 ABB 工业机器人或机器人仿真者优先；\n4. 能看懂英文技术资料，适应少量出差。",
        status: "待评估",
        favorite: true,
        nextAction: "完成岗位匹配与简历关键词调整",
        nextActionDate: "2026-09-18",
        notes: "这是演示岗位，可直接删除或改成真实招聘信息。",
        createdAt: "2026-09-15T00:00:00.000Z"
      },
      {
        id: "job-sample-electrical",
        company: "示例公司 B",
        title: "电气设计 / 调试工程师",
        city: "上海",
        salary: "8-13K",
        source: "示例",
        url: "",
        jd: "岗位职责：\n1. 完成非标自动化设备电气原理图、接线图和元器件选型；\n2. 使用 PLC、HMI 完成设备控制程序开发与现场调试；\n3. 配合机械工程师完成设备安装、联调和故障排查；\n4. 编写设备说明书、作业指导书和项目文档。\n\n任职要求：\n1. 电气、自动化或机电一体化专业；\n2. 熟悉电气设计、Eplan 或类似软件；\n3. 了解伺服、变频器和工业通信；\n4. 有较强的沟通能力和现场问题处理能力，能够适应出差。",
        status: "准备投递",
        favorite: false,
        nextAction: "补充电气设计关键词",
        nextActionDate: "2026-09-22",
        notes: "演示数据。",
        createdAt: "2026-09-15T00:00:00.000Z"
      },
      {
        id: "job-sample-robot",
        company: "示例公司 C",
        title: "工业机器人调试工程师",
        city: "杭州",
        salary: "8-12K",
        source: "示例",
        url: "",
        jd: "岗位职责：\n1. 负责 ABB 工业机器人现场安装、编程与调试；\n2. 完成机器人工作站与 PLC、视觉系统的通信和联调；\n3. 编写机器人程序、调试记录及技术文档；\n4. 支持设备故障排查和客户现场培训。\n\n任职要求：\n1. 自动化、机器人、机电类专业；\n2. 熟悉 ABB 机器人或 RobotStudio，有项目经验优先；\n3. 了解 PLC 控制、工业通信和机器视觉；\n4. 具备英文资料阅读能力和现场沟通能力。",
        status: "待评估",
        favorite: true,
        nextAction: "整理 ABB 机器人项目证据",
        nextActionDate: "2026-09-25",
        notes: "演示数据。",
        createdAt: "2026-09-15T00:00:00.000Z"
      }
    ],
    tasks: [
      {
        id: "task-1",
        title: "整理博图 + Factory IO 项目的 5 条 STAR 素材",
        due: "2026-09-18",
        priority: "高",
        done: false,
        relatedJobId: "",
        createdAt: "2026-09-15T00:00:00.000Z"
      },
      {
        id: "task-2",
        title: "补充简历中的联系方式、学校与目标城市",
        due: "2026-09-20",
        priority: "高",
        done: false,
        relatedJobId: "",
        createdAt: "2026-09-15T00:00:00.000Z"
      }
    ],
    interviewAnswers: {},
    aiSessions: {},
    companies: [],
    settings: {
      showExamples: true,
      screening: {
        includeKeywords: ["自动化", "PLC", "电气", "机器人", "机械设计", "SolidWorks", "应届"],
        excludeKeywords: ["销售", "客服", "中介", "纯外包"],
        minScore: 50,
        cities: [],
        onlyFreshGraduate: true
      },
      ai: {
        provider: "auto",
        baseUrl: "http://localhost:11434",
        model: "qwen2.5:7b",
        apiKey: "",
        temperature: 0.6
      },
      tianyancha: {
        openApiToken: "",
        apiBaseUrl: "https://open.api.tianyancha.com/services/open"
      }
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uid(prefix) {
    const random = Math.random().toString(36).slice(2, 9);
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + random;
  }

  function todayISO() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function daysUntil(dateString) {
    if (!dateString) return null;
    const target = new Date(dateString + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (Number.isNaN(target.getTime())) return null;
    return Math.ceil((target - today) / 86400000);
  }

  function formatDateCN(dateString, includeYear) {
    if (!dateString) return "未设置";
    const date = new Date(dateString + (dateString.length === 10 ? "T00:00:00" : ""));
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("zh-CN", {
      year: includeYear === false ? undefined : "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\s\u3000]+/g, " ")
      .replace(/[，。；、：（）()【】\[\]|/\\·•]/g, " ")
      .trim();
  }

  function compactText(text) {
    return normalizeText(text).replace(/\s+/g, "");
  }

  function getSkillById(id) {
    return SKILL_LIBRARY.find(function (skill) { return skill.id === id; }) || null;
  }

  function getProfileSkills(profile) {
    return (profile && profile.skills ? profile.skills : []).map(function (entry) {
      const librarySkill = getSkillById(entry.id);
      return {
        id: entry.id,
        name: librarySkill ? librarySkill.name : (entry.name || entry.id),
        category: librarySkill ? librarySkill.category : (entry.category || "自定义技能"),
        keywords: librarySkill ? librarySkill.keywords : (entry.keywords || [entry.name || entry.id]),
        level: Number(entry.level || 3)
      };
    });
  }

  function profileHasSkill(profile, requiredSkill) {
    const skills = getProfileSkills(profile);
    const requiredCompact = compactText(requiredSkill.name);
    return skills.some(function (owned) {
      if (owned.id === requiredSkill.id) return true;
      const ownedCompact = compactText(owned.name);
      if (ownedCompact === requiredCompact || ownedCompact.indexOf(requiredCompact) >= 0 || requiredCompact.indexOf(ownedCompact) >= 0) return true;
      return owned.keywords.some(function (keyword) {
        const k = compactText(keyword);
        return k && (requiredCompact.indexOf(k) >= 0 || requiredSkill.keywords.some(function (rk) {
          return compactText(rk).indexOf(k) >= 0 || k.indexOf(compactText(rk)) >= 0;
        }));
      });
    });
  }

  function findOwnedLevel(profile, requiredSkill) {
    const skills = getProfileSkills(profile);
    const found = skills.find(function (owned) { return owned.id === requiredSkill.id; });
    if (found) return found.level;
    if (profileHasSkill(profile, requiredSkill)) return 3;
    return 0;
  }

  function skillMentioned(skill, text) {
    const normalized = normalizeText(text);
    const compact = compactText(text);
    return skill.keywords.some(function (keyword) {
      const nk = normalizeText(keyword);
      const ck = compactText(keyword);
      return (nk.length >= 2 && normalized.indexOf(nk) >= 0) || (ck.length >= 2 && compact.indexOf(ck) >= 0);
    }) || normalizeText(skill.name).length >= 2 && normalized.indexOf(normalizeText(skill.name)) >= 0;
  }

  function projectRelevance(project, requiredSkills) {
    const text = normalizeText([
      project.name,
      project.role,
      project.background,
      project.actions,
      project.result,
      (project.keywords || []).join(" ")
    ].join(" "));
    let score = 0;
    const hits = [];
    requiredSkills.forEach(function (skill) {
      if (skillMentioned(skill, text)) {
        score += skill.weight;
        hits.push(skill.name);
      }
    });
    return { score: score, hits: hits };
  }

  function analyzeJob(job, profile) {
    const text = [job.title, job.jd].join("\n");
    let required = SKILL_LIBRARY.filter(function (skill) { return skillMentioned(skill, text); });

    // Favor the strongest signals if a broad JD mentions too many skills.
    if (required.length > 12) {
      required = required.sort(function (a, b) { return b.weight - a.weight; }).slice(0, 12);
    }

    const matched = [];
    const missing = [];
    let totalWeight = 0;
    let earnedWeight = 0;

    required.forEach(function (skill) {
      const level = findOwnedLevel(profile, skill);
      totalWeight += skill.weight;
      if (level > 0) {
        matched.push({ skill: skill, level: level });
        earnedWeight += skill.weight * Math.min(1, level / 4);
      } else {
        missing.push({ skill: skill, level: 0 });
      }
    });

    const relevantProjects = (profile.projects || [])
      .map(function (project) {
        const relevance = projectRelevance(project, required);
        return { project: project, score: relevance.score, hits: relevance.hits };
      })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    let score = 50;
    let confidence = "中";
    let note = "岗位描述中的标准技能关键词较少，建议补充完整的岗位职责和任职要求。";

    if (required.length) {
      score = Math.round(20 + (totalWeight ? earnedWeight / totalWeight : 0) * 80);
      if (relevantProjects.length) score = Math.min(100, score + Math.min(5, relevantProjects.length * 2));
      confidence = required.length >= 6 ? "高" : "中";
      note = "匹配分来自岗位中识别到的技能关键词、你的能力档案等级，以及相关项目证据。";
    }

    const suggestions = [];
    missing.slice(0, 6).forEach(function (item) {
      suggestions.push("补充或强化「" + item.skill.name + "」相关知识与可讲述案例。");
    });
    if (!missing.length && required.length) {
      suggestions.push("技能覆盖较完整，下一步重点准备项目细节、数字结果和现场问题处理案例。");
    }
    if (relevantProjects.length) {
      suggestions.unshift("简历和面试中优先使用「" + relevantProjects[0].project.name + "」作为核心证据。");
    }
    if (!profile.name || !profile.email || !profile.phone) {
      suggestions.push("先补全姓名、邮箱和电话，否则无法生成可直接投递的简历。");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      confidence: confidence,
      note: note,
      required: required,
      matched: matched,
      missing: missing,
      relevantProjects: relevantProjects,
      suggestions: suggestions,
      analyzedAt: new Date().toISOString()
    };
  }

  function profileCompleteness(profile) {
    if (!profile) return 0;
    const checks = [
      !!profile.name,
      !!profile.email,
      !!profile.phone,
      !!profile.city,
      (profile.targetRoles || []).length > 0,
      (profile.targetCities || []).some(function (item) { return item && item !== "待填写"; }),
      (profile.skills || []).length >= 5,
      (profile.projects || []).length >= 2,
      (profile.projects || []).every(function (project) {
        return project.background && project.actions && project.result;
      }),
      !!profile.summary
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }

  function generateInterviewQuestions(job, profile, analysis) {
    const questions = [];
    const relevantProject = (analysis && analysis.relevantProjects && analysis.relevantProjects[0])
      ? analysis.relevantProjects[0].project
      : ((profile.projects || [])[0] || null);
    const missing = analysis && analysis.missing ? analysis.missing.slice(0, 3) : [];
    const matched = analysis && analysis.matched ? analysis.matched.slice(0, 3) : [];

    questions.push({
      id: "intro",
      category: "自我介绍",
      question: "请用 2 分钟介绍自己，并说明为什么适合应聘「" + job.title + "」。",
      hint: "按“专业背景 → 两个核心项目 → 与岗位匹配的能力 → 求职动机”组织。"
    });

    if (relevantProject) {
      questions.push({
        id: "project-" + relevantProject.id,
        category: "项目深挖",
        question: "请重点介绍「" + relevantProject.name + "」，你在其中具体负责什么，最难的问题是什么？",
        hint: "用 STAR：背景、任务、行动、结果。至少说出一个技术细节和一个失败/排查过程。"
      });
    }

    matched.forEach(function (item, index) {
      questions.push({
        id: "matched-" + item.skill.id + "-" + index,
        category: "技能验证",
        question: "岗位要求「" + item.skill.name + "」，请举一个你实际使用它解决问题的例子。",
        hint: "不要只回答“熟悉”。要说明工具版本、使用场景、关键步骤和最终结果。"
      });
    });

    missing.forEach(function (item, index) {
      questions.push({
        id: "missing-" + item.skill.id + "-" + index,
        category: "能力补足",
        question: "你目前对「" + item.skill.name + "」掌握到什么程度？如果岗位需要，你准备如何快速上手？",
        hint: "坦诚边界，再给出学习路径、相近经验和可验证的行动计划。"
      });
    });

    questions.push({
      id: "troubleshooting",
      category: "情景题",
      question: "如果产线在联调时频繁报警，PLC 程序、通信和现场设备都可能有问题，你会怎样排查？",
      hint: "先保证安全，再按“现象记录 → 分层隔离 → 信号/通信/程序验证 → 根因确认 → 防复发”回答。"
    });

    questions.push({
      id: "communication",
      category: "协作与现场",
      question: "如果机械、电气和软件团队对故障原因判断不一致，你会如何推动问题解决？",
      hint: "强调事实、数据、责任边界、短会同步和书面记录。"
    });

    return questions;
  }

  function generateTasks(job, analysis) {
    const tasks = [];
    const missing = analysis && analysis.missing ? analysis.missing.slice(0, 3) : [];
    missing.forEach(function (item) {
      tasks.push({
        title: "整理「" + item.skill.name + "」的 3 个面试要点",
        priority: "中",
        relatedJobId: job.id
      });
    });
    tasks.push({
      title: "根据岗位「" + job.title + "」修改一版简历",
      priority: "高",
      relatedJobId: job.id
    });
    if (analysis && analysis.relevantProjects && analysis.relevantProjects.length) {
      tasks.push({
        title: "为项目「" + analysis.relevantProjects[0].project.name + "」补充量化结果",
        priority: "高",
        relatedJobId: job.id
      });
    }
    return tasks;
  }

  function createResumeModel(job, profile, analysis) {
    const matchedNames = (analysis.matched || []).map(function (item) { return item.skill.name; });
    const target = job ? job.title + "｜" + job.company : (profile.targetRoles || []).join(" / ");
    const orderedSkills = getProfileSkills(profile).sort(function (a, b) {
      const ai = matchedNames.indexOf(a.name);
      const bi = matchedNames.indexOf(b.name);
      if (ai >= 0 && bi < 0) return -1;
      if (bi >= 0 && ai < 0) return 1;
      return b.level - a.level;
    });
    const projects = (profile.projects || []).slice().sort(function (a, b) {
      const ar = (analysis.relevantProjects || []).find(function (item) { return item.project.id === a.id; });
      const br = (analysis.relevantProjects || []).find(function (item) { return item.project.id === b.id; });
      return (br ? br.score : 0) - (ar ? ar.score : 0);
    });
    return {
      target: target,
      matchedNames: matchedNames,
      orderedSkills: orderedSkills,
      projects: projects
    };
  }

  function resumePlainText(job, profile, analysis) {
    const model = createResumeModel(job, profile, analysis);
    const lines = [];
    lines.push((profile.name || "姓名待填写") + "｜" + profile.title);
    lines.push([profile.phone, profile.email, profile.city].filter(Boolean).join("｜"));
    lines.push("");
    lines.push("求职目标");
    lines.push(model.target || "自动化相关岗位");
    lines.push("");
    lines.push("个人简介");
    lines.push(profile.summary || "请先在能力档案中完善个人简介。");
    lines.push("");
    lines.push("专业技能");
    lines.push(model.orderedSkills.map(function (skill) { return skill.name; }).join("、"));
    lines.push("");
    lines.push("项目经历");
    model.projects.forEach(function (project) {
      lines.push(project.name + "｜" + (project.role || ""));
      lines.push("项目背景：" + (project.background || ""));
      lines.push("主要工作：" + (project.actions || ""));
      lines.push("项目成果：" + (project.result || ""));
      lines.push("");
    });
    lines.push("教育经历");
    (profile.education || []).forEach(function (education) {
      lines.push([education.school, education.major, education.degree, education.period].filter(Boolean).join("｜"));
    });
    return lines.join("\n");
  }

  function parseSalary(text) {
    const raw = String(text || "");
    const kMatch = raw.match(/(\d+(?:\.\d+)?)\s*[-~至到]\s*(\d+(?:\.\d+)?)\s*[kK千]/);
    if (kMatch) return { min: Number(kMatch[1]), max: Number(kMatch[2]), unit: "K", raw: kMatch[0] };
    const wanMatch = raw.match(/(\d+(?:\.\d+)?)\s*[-~至到]\s*(\d+(?:\.\d+)?)\s*万/);
    if (wanMatch) return { min: Number(wanMatch[1]) * 10, max: Number(wanMatch[2]) * 10, unit: "万/年", raw: wanMatch[0] };
    const singleK = raw.match(/(\d+(?:\.\d+)?)\s*[kK]/);
    if (singleK) return { min: Number(singleK[1]), max: Number(singleK[1]), unit: "K", raw: singleK[0] };
    return { min: null, max: null, unit: "", raw: "" };
  }

  function inferJobMeta(job) {
    const text = [job.title, job.salary, job.jd].join("\n");
    const salary = parseSalary(text);
    let experience = "未说明";
    if (/应届|在校|无经验|经验不限|0\s*[-~至]\s*1\s*年/.test(text)) experience = "应届/经验不限";
    else if (/1\s*[-~至]\s*3\s*年/.test(text)) experience = "1-3年";
    else if (/3\s*[-~至]\s*5\s*年/.test(text)) experience = "3-5年";
    else if (/5\s*年以上|五年以上/.test(text)) experience = "5年以上";
    let education = "未说明";
    if (/博士/.test(text)) education = "博士";
    else if (/硕士|研究生/.test(text)) education = "硕士";
    else if (/本科|学士/.test(text)) education = "本科";
    else if (/大专|专科/.test(text)) education = "大专";
    return { salary: salary, experience: experience, education: education };
  }

  function screenJob(job, profile, screening) {
    const settings = Object.assign({ includeKeywords: [], excludeKeywords: [], minScore: 50, cities: [], onlyFreshGraduate: false }, screening || {});
    const analysis = analyzeJob(job, profile);
    const text = normalizeText([job.title, job.company, job.city, job.jd, job.notes].join(" "));
    const includeHits = (settings.includeKeywords || []).filter(function (keyword) { return keyword && text.indexOf(normalizeText(keyword)) >= 0; });
    const excludeHits = (settings.excludeKeywords || []).filter(function (keyword) { return keyword && text.indexOf(normalizeText(keyword)) >= 0; });
    const acceptedCities = (settings.cities || []).filter(Boolean);
    const cityKnown = !!String(job.city || "").trim();
    const cityMatch = !acceptedCities.length || !cityKnown || acceptedCities.some(function (city) {
      const a = normalizeText(city).replace(/市$/, "");
      const b = normalizeText(job.city).replace(/市$/, "");
      return a && b && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0);
    });
    const meta = inferJobMeta(job);
    const scorePass = analysis.score >= Number(settings.minScore || 0);
    const includePass = !(settings.includeKeywords || []).length || includeHits.length > 0;
    const freshPass = !settings.onlyFreshGraduate || meta.experience === "应届/经验不限" || meta.experience === "未说明";
    const reasons = [];
    const warnings = [];
    if (includeHits.length) reasons.push("命中关注词：" + includeHits.join("、"));
    if (scorePass) reasons.push("匹配分达到 " + settings.minScore + "%"); else warnings.push("匹配分低于 " + settings.minScore + "%");
    if (excludeHits.length) warnings.push("命中排除词：" + excludeHits.join("、"));
    if (cityKnown && !cityMatch) warnings.push("工作城市不在目标城市中");
    if (!freshPass) warnings.push("经验要求可能不适合应届生：" + meta.experience);
    if (!cityKnown) warnings.push("岗位未识别到城市，需要人工确认");
    if (!includePass) warnings.push("未命中关注关键词");
    let decision = "不建议";
    if (!excludeHits.length && includePass && scorePass && cityMatch && freshPass) decision = "推荐";
    else if (!excludeHits.length && scorePass >= Number(settings.minScore || 0) - 10 && cityMatch) decision = "可考虑";
    return { decision: decision, analysis: analysis, includeHits: includeHits, excludeHits: excludeHits, cityMatch: cityMatch, scorePass: scorePass, includePass: includePass, freshPass: freshPass, meta: meta, reasons: reasons, warnings: warnings, screenedAt: new Date().toISOString() };
  }

  function platformSearchUrl(platformId, query, city) {
    const platform = PLATFORM_SEARCHES.find(function (item) { return item.id === platformId; });
    if (!platform) return "";
    return platform.url.replace("{query}", encodeURIComponent(String(query || "").trim())).replace("{city}", encodeURIComponent(String(city || "").trim()));
  }

  function cleanImportedTitle(title) {
    return String(title || "")
      .replace(/[-_|｜]\s*(BOSS直聘|智联招聘|前程无忧|猎聘|实习僧|国聘).*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseImportedJobs(input) {
    const raw = String(input || "").trim();
    if (!raw) return [];
    let payload = null;
    try { payload = JSON.parse(raw); } catch (error) { payload = null; }
    if (Array.isArray(payload)) return payload.map(function (item) { return parseImportedJobs(JSON.stringify(item))[0]; }).filter(Boolean);
    if (payload && Array.isArray(payload.jobs)) return payload.jobs.map(function (item) { return parseImportedJobs(JSON.stringify(item))[0]; }).filter(Boolean);
    if (payload && typeof payload === "object") {
      const pageText = String(payload.pageText || payload.jd || payload.description || "");
      const title = cleanImportedTitle(payload.jobTitle || payload.title || "未识别岗位");
      const companyMatch = pageText.match(/(?:公司|企业|招聘方)[：:]\s*([^\n]{2,40})/);
      return [{
        company: String(payload.company || (companyMatch ? companyMatch[1] : "") || "公司待确认").trim(),
        title: title || "未识别岗位",
        city: String(payload.city || "").trim(),
        salary: String(payload.salary || "").trim(),
        source: String(payload.platform || payload.source || "网页采集").trim(),
        url: String(payload.url || "").trim(),
        jd: pageText || title,
        notes: "由职途采集器导入，请核对公司、岗位和完整 JD 后再保存。"
      }];
    }
    const urlMatch = raw.match(/https?:\/\/[^\s)]+/);
    const lines = raw.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    const companyLine = lines.find(function (line) { return /(?:公司|企业)[：:]/.test(line); }) || "";
    return [{
      company: companyLine.replace(/^.*?[：:]/, "").trim() || "公司待确认",
      title: cleanImportedTitle(lines[0] || "未识别岗位"),
      city: "", salary: "", source: urlMatch ? "网页采集" : "文本粘贴",
      url: urlMatch ? urlMatch[0] : "", jd: raw,
      notes: "由文本或网页采集器导入，请核对岗位信息后再保存。"
    }];
  }

  function buildAISystemPrompt(job, profile, analysis, options) {
    const settings = options || {};
    const projects = (profile.projects || []).map(function (project) {
      return project.name + "：" + [project.actions, project.result].filter(Boolean).join("；");
    }).join("\n");
    const matched = (analysis.matched || []).map(function (item) { return item.skill.name; }).join("、");
    const missing = (analysis.missing || []).map(function (item) { return item.skill.name; }).join("、");
    return [
      "你是职途 App 中的中文 AI 面试官，正在面试一名自动化方向的中国应届毕业生。",
      "目标岗位：" + job.company + " - " + job.title + "。",
      "岗位匹配技能：" + (matched || "未识别") + "。",
      "技能缺口：" + (missing || "未识别") + "。",
      "候选人项目：" + (projects || "未填写") + "。",
      "面试风格：" + (settings.style || "专业、直接、有追问") + "。",
      "重点：" + (settings.focus || "项目真实性、技术细节、问题排查和岗位匹配度") + "。",
      "规则：",
      "1. 每次只问一个问题，不要一次列出多题。",
      "2. 根据候选人上一轮回答继续追问，优先验证项目细节和技术真实性。",
      "3. 对回答先给一句简短反馈，再提出下一题。",
      "4. 不要替候选人编造经历，不要给标准答案。",
      "5. 使用简洁自然的中文，总回复控制在 180 字以内。",
      "6. 达到设定轮次后，输出结构化面试报告。"
    ].join("\n");
  }

  function buildAIOpeningPrompt(options) {
    const settings = options || {};
    return "请开始一场最多 " + (settings.maxTurns || 6) + " 轮的模拟面试。先不要评分，只做一句欢迎，然后提出第一个问题。";
  }

  function buildAIReportPrompt() {
    return "面试轮次已经结束。请基于前面的全部回答生成一份中文面试报告，包含：总体评价、三个优点、三个风险点、最需要改进的两个回答，以及未来 3 天的练习建议。不要编造候选人没有提供的经历。";
  }

  function tianyanchaSearchUrl(companyName) {
    return "https://www.tianyancha.com/search?key=" + encodeURIComponent(String(companyName || "").trim());
  }

  function parseCompanyText(input) {
    const raw = String(input || "").trim();
    const compact = raw.replace(/\r/g, "");
    function pick(patterns) {
      for (let i = 0; i < patterns.length; i += 1) {
        const match = compact.match(patterns[i]);
        if (match && match[1]) return String(match[1]).trim().replace(/[，,；;。]+$/, "");
      }
      return "";
    }
    const creditCode = pick([/统一社会信用代码[：:\s]*([0-9A-Z]{18})/i, /信用代码[：:\s]*([0-9A-Z]{18})/i]);
    return {
      name: pick([/企业名称[：:\s]*([^\n]{2,80})/, /公司名称[：:\s]*([^\n]{2,80})/]),
      status: pick([/经营状态[：:\s]*(存续|在业|开业|注销|吊销|迁出|停业)/, /登记状态[：:\s]*(存续|在业|开业|注销|吊销|迁出|停业)/]),
      legalPerson: pick([/法定代表人[：:\s]*([^\n]{2,30})/, /法人[：:\s]*([^\n]{2,30})/]),
      capital: pick([/注册资本[：:\s]*([^\n]{2,50})/, /注册资金[：:\s]*([^\n]{2,50})/]),
      established: pick([/成立日期[：:\s]*([^\n]{4,30})/, /成立时间[：:\s]*([^\n]{4,30})/]),
      creditCode: creditCode,
      location: pick([/注册地址[：:\s]*([^\n]{5,120})/, /办公地址[：:\s]*([^\n]{5,120})/, /地址[：:\s]*([^\n]{5,120})/]),
      industry: pick([/所属行业[：:\s]*([^\n]{2,80})/, /行业[：:\s]*([^\n]{2,80})/]),
      scale: pick([/人员规模[：:\s]*([^\n]{2,40})/, /参保人数[：:\s]*([0-9,]+)/]),
      businessScope: pick([/经营范围[：:\s]*([^\n]{10,})/]),
      summary: ""
    };
  }

  function statusClass(status) {
    const map = {
      "待评估": "badge-neutral",
      "准备投递": "badge-amber",
      "已投递": "badge-blue",
      "笔试/测评": "badge-violet",
      "面试": "badge",
      "Offer": "badge-green",
      "已结束": "badge-red"
    };
    return map[status] || "badge-neutral";
  }

  function scoreClass(score) {
    if (score >= 75) return "";
    if (score >= 55) return "low";
    return "poor";
  }

  function validateState(state) {
    if (!state || typeof state !== "object") return false;
    if (!state.profile || typeof state.profile !== "object") return false;
    if (!Array.isArray(state.jobs)) return false;
    if (!Array.isArray(state.tasks)) return false;
    return true;
  }

  const api = {
    SKILL_LIBRARY: SKILL_LIBRARY,
    JOB_STATUSES: JOB_STATUSES,
    PLATFORM_SEARCHES: PLATFORM_SEARCHES,
    parseSalary: parseSalary,
    inferJobMeta: inferJobMeta,
    screenJob: screenJob,
    platformSearchUrl: platformSearchUrl,
    parseImportedJobs: parseImportedJobs,
    buildAISystemPrompt: buildAISystemPrompt,
    buildAIOpeningPrompt: buildAIOpeningPrompt,
    buildAIReportPrompt: buildAIReportPrompt,
    tianyanchaSearchUrl: tianyanchaSearchUrl,
    parseCompanyText: parseCompanyText,
    DEFAULT_STATE: DEFAULT_STATE,
    clone: clone,
    uid: uid,
    todayISO: todayISO,
    daysUntil: daysUntil,
    formatDateCN: formatDateCN,
    getSkillById: getSkillById,
    getProfileSkills: getProfileSkills,
    analyzeJob: analyzeJob,
    profileCompleteness: profileCompleteness,
    generateInterviewQuestions: generateInterviewQuestions,
    generateTasks: generateTasks,
    createResumeModel: createResumeModel,
    resumePlainText: resumePlainText,
    statusClass: statusClass,
    scoreClass: scoreClass,
    validateState: validateState
  };

  global.CareerEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);









