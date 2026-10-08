(() => {
  const app = document.getElementById('app');
  const STORAGE = 'sslg_student_system_v1';
  const SESSION = 'sslg_student_session_v1';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const nowISO = () => new Date().toISOString();
  const dateOnly = d => new Date(d).toLocaleDateString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit'});
  const timeOnly = d => new Date(d).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});
  const todayKey = () => new Date().toISOString().slice(0,10);
  const roleName = r => ({admin:'系统管理员',manager:'德育管理',headteacher:'班主任',teacher:'任课教师',inspector:'学生会检查员'})[r] || r;

  function createBaseData(){
    const classes = [
      {id:'c101',grade:'高一',name:'高一1班',teacher:''},
      {id:'c102',grade:'高一',name:'高一2班',teacher:''},
      {id:'c103',grade:'高一',name:'高一3班',teacher:''},
      {id:'c104',grade:'高一',name:'高一4班',teacher:''},
      {id:'c201',grade:'高二',name:'高二1班',teacher:''},
      {id:'c202',grade:'高二',name:'高二2班',teacher:''},
    ];
    const rules = [
      {id:'r1',category:'考勤',name:'早读迟到',score:-1,level:'普通'},
      {id:'r2',category:'考勤',name:'下午迟到',score:-1,level:'普通'},
      {id:'r3',category:'考勤',name:'晚自习迟到',score:-1,level:'普通'},
      {id:'r4',category:'考勤',name:'无故缺勤',score:-3,level:'较重'},
      {id:'r5',category:'风纪',name:'发型不规范',score:-1,level:'普通'},
      {id:'r6',category:'风纪',name:'着装不规范',score:-1,level:'普通'},
      {id:'r7',category:'校卡',name:'未佩戴校卡',score:-1,level:'普通'},
      {id:'r8',category:'跑操',name:'跑操缺席',score:-1,level:'普通'},
      {id:'r9',category:'跑操',name:'消极跑操',score:-1,level:'普通'},
      {id:'r10',category:'纪律',name:'违规使用手机',score:-3,level:'较重'},
      {id:'r11',category:'纪律',name:'携带扑克牌',score:-2,level:'普通'},
      {id:'r12',category:'卫生',name:'公共区不合格',score:-2,level:'班级'},
      {id:'r13',category:'表扬',name:'主动劳动',score:1,level:'表扬'},
      {id:'r14',category:'表扬',name:'拾金不昧',score:3,level:'表扬'},
      {id:'r15',category:'表扬',name:'学习进步',score:2,level:'表扬'},
      {id:'r16',category:'表扬',name:'学生会工作优秀',score:2,level:'表扬'},
    ];
    // 这些是系统初始角色账号，不包含学生或业务演示记录。
    const users = [
      {id:'u1',username:'admin',password:'123456',name:'系统管理员',role:'admin',classId:null},
      {id:'u2',username:'manager',password:'123456',name:'德育管理',role:'manager',classId:null},
      {id:'u3',username:'headteacher',password:'123456',name:'班主任账号',role:'headteacher',classId:'c101'},
      {id:'u4',username:'teacher',password:'123456',name:'任课教师',role:'teacher',classId:null},
      {id:'u5',username:'inspector',password:'123456',name:'学生会检查员',role:'inspector',classId:null},
    ];
    return {version:2, classes, students:[], rules, users, records:[], classRecords:[], settings:{baseScore:100}};
  }

  function isLegacyDemoStudent(s){
    return /^s_c(?:101|102|103|104|201|202)_\d+$/.test(String(s?.id||''));
  }

  function isLegacyDemoClassRecord(r){
    return (r?.title==='公共区不合格' && r?.note==='教学楼二楼东侧纸屑较多') ||
           (r?.title==='公共区整改优秀' && r?.note==='整改及时，复查通过');
  }

  function demoDataStats(source){
    const demoStudents=(source.students||[]).filter(isLegacyDemoStudent);
    const demoIds=new Set(demoStudents.map(s=>s.id));
    return {
      students: demoStudents.length,
      records: (source.records||[]).filter(r=>demoIds.has(r.studentId)).length,
      classRecords: (source.classRecords||[]).filter(isLegacyDemoClassRecord).length
    };
  }

  function normalizeData(source){
    const base=createBaseData();
    const d = source && typeof source==='object' ? source : {};
    d.version=2;
    d.classes=Array.isArray(d.classes)&&d.classes.length?d.classes:base.classes;
    d.students=Array.isArray(d.students)?d.students:[];
    d.rules=Array.isArray(d.rules)&&d.rules.length?d.rules:base.rules;
    d.users=Array.isArray(d.users)&&d.users.length?d.users:base.users;
    d.records=Array.isArray(d.records)?d.records:[];
    d.classRecords=Array.isArray(d.classRecords)?d.classRecords:[];
    d.settings={...base.settings,...(d.settings||{})};

    // 清除旧原型中写死的虚拟班主任姓名，但不覆盖用户自行修改的新名称。
    const legacyTeachers={c101:'王老师',c102:'陈老师',c103:'刘老师',c104:'黄老师',c201:'黎老师',c202:'胡老师'};
    d.classes.forEach(c=>{ if(legacyTeachers[c.id]===c.teacher) c.teacher=''; });

    // 将旧版内置账号显示名改成中性的初始角色名称，账号仍可用于原型测试。
    const initialNames={admin:'系统管理员',manager:'德育管理',headteacher:'班主任账号',teacher:'任课教师',inspector:'学生会检查员'};
    const legacyNames={admin:'李老师',manager:'德育老师',headteacher:'王老师',teacher:'科任老师',inspector:'学生会纪检员'};
    d.users.forEach(u=>{ if(legacyNames[u.username]===u.name && u.password==='123456') u.name=initialNames[u.username]; });
    return d;
  }

  function clearLegacyDemoData(source){
    const d=normalizeData(source);
    const stats=demoDataStats(d);
    if(!stats.students && !stats.records && !stats.classRecords) return {data:d,stats,changed:false};
    const demoIds=new Set(d.students.filter(isLegacyDemoStudent).map(s=>s.id));
    d.students=d.students.filter(s=>!demoIds.has(s.id));
    d.records=d.records.filter(r=>!demoIds.has(r.studentId));
    d.classRecords=d.classRecords.filter(r=>!isLegacyDemoClassRecord(r));
    return {data:d,stats,changed:true};
  }

  function loadData(){
    try {
      const raw=localStorage.getItem(STORAGE);
      if(raw){
        const migrated=clearLegacyDemoData(JSON.parse(raw));
        localStorage.setItem(STORAGE, JSON.stringify(migrated.data));
        return migrated.data;
      }
    } catch(e){}
    const d=createBaseData();
    localStorage.setItem(STORAGE, JSON.stringify(d));
    return d;
  }
  let data=loadData();
  let session = (()=>{ try{return JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch(e){return null} })();
  let state={page:'dashboard', selectedClass:'c101', selectedStudent:null, checkCategory:'早读考勤'};

  function save(){ localStorage.setItem(STORAGE, JSON.stringify(data)); }
  function toast(msg){ const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200); }
  function getUser(){ return data.users.find(u=>u.id===session?.userId); }
  function getClass(id){ return data.classes.find(c=>c.id===id); }
  function getStudent(id){ return data.students.find(s=>s.id===id); }
  function visibleClasses(){ const u=getUser(); return u?.role==='headteacher' ? data.classes.filter(c=>c.id===u.classId) : data.classes; }
  function visibleStudents(){ const ids=new Set(visibleClasses().map(c=>c.id)); return data.students.filter(s=>ids.has(s.classId)); }
  function visibleRecords(){ const ids=new Set(visibleClasses().map(c=>c.id)); return data.records.filter(r=>ids.has(r.classId)); }
  function isToday(iso){ return iso?.slice(0,10)===todayKey(); }
  function scoreOfClass(cid){
    const sum = data.records.filter(r=>r.classId===cid).reduce((a,r)=>a+Number(r.score||0),0) + data.classRecords.filter(r=>r.classId===cid).reduce((a,r)=>a+Number(r.score||0),0);
    return data.settings.baseScore + sum;
  }
  function pageAllowed(p){
    const role=getUser()?.role;
    if(role==='inspector' && !['dashboard','check'].includes(p)) return false;
    if(role==='headteacher' && ['settings'].includes(p)) return false;
    return true;
  }

  function loginView(){
    app.innerHTML=`
      <div class="login-shell">
        <section class="login-hero">
          <div>
            <div class="brand-mark"><div class="brand-logo">理</div><span>三水区理工学校 · 综合高中部</span></div>
            <div style="margin-top:90px">
              <h1>学生日常表现管理系统</h1>
              <p>把考勤、风纪、校卡、跑操、卫生、表扬和班主任处理统一到一个平台，形成“发现—记录—处理—整改—统计—预警”的闭环。</p>
              <div class="login-feature-grid">
                <div class="login-feature"><b>快速检查</b><span>手机端3—4步完成登记</span></div>
                <div class="login-feature"><b>班主任协同</b><span>只看本班，及时处理</span></div>
                <div class="login-feature"><b>正向激励</b><span>违纪与表扬并行记录</span></div>
                <div class="login-feature"><b>数据量化</b><span>自动形成班级和个人档案</span></div>
              </div>
            </div>
          </div>
          <small>网页原型 V1.1 · 无演示业务数据版</small>
        </section>
        <section class="login-panel">
          <div class="login-card">
            <h2>欢迎登录</h2>
            <div class="sub">请输入系统账号进入管理平台</div>
            <form id="loginForm">
              <div class="form-group"><label>账号</label><input class="input" name="username" value="admin" autocomplete="username" /></div>
              <div class="form-group"><label>密码</label><input class="input" name="password" type="password" value="123456" autocomplete="current-password" /></div>
              <button class="btn btn-primary btn-block" type="submit">登录系统</button>
            </form>
            <div class="demo-box">
              <b>初始登录账号</b><br>
              管理员：admin / 123456<br>
              <span style="color:#7b8794">系统已取消虚拟学生和示例事件，首次进入学生数为 0。请登录后导入真实学生名单。</span>
            </div>
          </div>
        </section>
      </div>`;
    $('#loginForm').addEventListener('submit',e=>{
      e.preventDefault(); const fd=new FormData(e.target); const u=data.users.find(x=>x.username===fd.get('username')&&x.password===fd.get('password'));
      if(!u) return toast('账号或密码错误');
      session={userId:u.id}; sessionStorage.setItem(SESSION,JSON.stringify(session)); state.page=u.role==='headteacher'?'homeroom':'dashboard'; render();
    });
  }

  const navItems = [
    ['dashboard','⌂','管理首页'],['check','✓','日常检查'],['students','👤','学生档案'],['homeroom','▣','班主任工作台'],['scores','▤','班级量化'],['records','≡','事件记录'],['settings','⚙','系统工具']
  ];
  function shell(content){
    const u=getUser();
    const nav=navItems.filter(([p])=>pageAllowed(p)).map(([p,ic,n])=>`<button class="nav-item ${state.page===p?'active':''}" data-page="${p}"><span>${ic}</span>${n}</button>`).join('');
    app.innerHTML=`<div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-logo">理</div><div><strong>综合高中部</strong><small>学生日常表现管理</small></div></div>
        <div class="nav-title">工作台</div>${nav}
        <div class="sidebar-footer"><button class="nav-item" id="logoutBtn"><span>↪</span>退出登录</button></div>
      </aside>
      <main class="main">
        <header class="topbar"><h1>三水区理工学校综合高中部学生日常表现管理系统</h1><div class="top-actions"><div class="user-chip"><div class="avatar">${esc(u.name.slice(0,1))}</div><span>${esc(u.name)} · ${roleName(u.role)}</span></div></div></header>
        <div class="content">${content}</div>
      </main>
      <nav class="mobile-bottom">
        <button data-page="dashboard" class="${state.page==='dashboard'?'active':''}">⌂<br>首页</button>
        <button data-page="students" class="${state.page==='students'?'active':''}">👤<br>学生</button>
        <button data-page="check" class="main-action ${state.page==='check'?'active':''}">✓</button>
        <button data-page="homeroom" class="${state.page==='homeroom'?'active':''}">▣<br>班级</button>
        <button data-page="scores" class="${state.page==='scores'?'active':''}">▤<br>量化</button>
      </nav>
    </div>`;
    $$('[data-page]').forEach(b=>b.addEventListener('click',()=>{ const p=b.dataset.page; if(pageAllowed(p)){state.page=p;render();} }));
    $('#logoutBtn')?.addEventListener('click',()=>{session=null;sessionStorage.removeItem(SESSION);render();});
  }

  function dashboard(){
    const recs=visibleRecords();
    const today=recs.filter(r=>isToday(r.createdAt));
    const cnt=q=>today.filter(q).length;
    const pending=recs.filter(r=>r.score<0 && r.status==='待处理').length;
    const praise=today.filter(r=>r.score>0).length;
    const cards=[
      ['今日迟到',cnt(r=>r.title.includes('迟到')),'⏱'],['今日异常',today.filter(r=>r.score<0).length,'!'],['今日表扬',praise,'★'],['待班主任处理',pending,'✓']
    ];
    const rows=[...today].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8).map(r=>{
      const s=getStudent(r.studentId),c=getClass(r.classId); return `<tr><td>${esc(s?.name||'-')}</td><td>${esc(c?.name||'-')}</td><td>${esc(r.title)}</td><td>${timeOnly(r.createdAt)}</td><td>${esc(r.createdBy)}</td><td>${statusBadge(r.status)}</td></tr>`;
    }).join('') || `<tr><td colspan="6"><div class="empty">今天暂时没有异常记录</div></td></tr>`;
    const scoreRows=visibleClasses().map(c=>{ const sc=scoreOfClass(c.id); const pct=Math.max(0,Math.min(100,sc)); return `<div class="score-row"><b>${esc(c.name)}</b><div class="score-track"><div class="score-fill" style="width:${pct}%"></div></div><strong>${sc}</strong></div>`}).join('');
    const quick=[['早读','早读考勤','早读迟到/缺勤'],['下午','下午考勤','下午迟到/缺勤'],['晚修','晚自习','晚自习考勤'],['风纪','风纪检查','发型/着装'],['校卡','校卡检查','未佩戴校卡'],['跑操','跑操检查','缺席/消极'],['卫生','公共区检查','班级卫生'],['表扬','表扬登记','记录正向表现'],['违纪','其他违纪','其他纪律问题']];
    shell(`<div class="page-head"><div><h2>管理首页</h2><p>${dateOnly(new Date())} · 今日数据概览</p></div><div class="filters"><button class="btn btn-outline" id="exportBtn">导出记录 CSV</button></div></div>
      <div class="grid kpis">${cards.map(x=>`<div class="kpi"><div class="kpi-top"><span>${x[0]}</span><div class="icon-box">${x[2]}</div></div><div class="kpi-value">${x[1]}</div><small>数据随登记实时更新</small></div>`).join('')}</div>
      <div class="grid two-col" style="margin-top:16px">
        <section class="card"><div class="card-head"><h3>快速检查</h3><span class="badge info">手机端可直接使用</span></div><div class="card-body"><div class="quick-grid">${quick.map(q=>`<button class="quick-btn" data-check="${q[1]}"><span>${q[0]}</span><b>${q[1]}</b><small>${q[2]}</small></button>`).join('')}</div></div></section>
        <section class="card"><div class="card-head"><h3>班级量化</h3><button class="btn btn-outline" data-page="scores">查看全部</button></div><div class="card-body"><div class="score-list">${scoreRows}</div></div></section>
      </div>
      <section class="card" style="margin-top:16px"><div class="card-head"><h3>今日异常与表扬</h3><span class="badge">${today.length} 条</span></div><div class="card-body table-wrap"><table><thead><tr><th>学生</th><th>班级</th><th>事件</th><th>时间</th><th>登记人</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
    $$('[data-check]').forEach(b=>b.addEventListener('click',()=>{state.checkCategory=b.dataset.check;state.page='check';render();}));
    $('#exportBtn')?.addEventListener('click',exportCSV);
  }

  function checkPage(){
    const cats=['早读考勤','下午考勤','晚自习','风纪检查','校卡检查','跑操检查','公共区检查','表扬登记','其他违纪'];
    if(!cats.includes(state.checkCategory)) state.checkCategory=cats[0];
    let cid=state.selectedClass;
    const allowed=visibleClasses(); if(!allowed.some(c=>c.id===cid)) cid=allowed[0]?.id; state.selectedClass=cid;
    const stus=data.students.filter(s=>s.classId===cid&&s.status==='在读');
    const rulesByCat = {
      '早读考勤':['r1','r4'],'下午考勤':['r2','r4'],'晚自习':['r3','r4'],'风纪检查':['r5','r6'],'校卡检查':['r7'],'跑操检查':['r8','r9'],'公共区检查':['r12'],'表扬登记':['r13','r14','r15','r16'],'其他违纪':['r10','r11']
    };
    const rr=(rulesByCat[state.checkCategory]||[]).map(id=>data.rules.find(r=>r.id===id)).filter(Boolean);
    const classMode=state.checkCategory==='公共区检查';
    shell(`<div class="mobile-check-shell">
      <div class="page-head"><div><h2>日常检查</h2><p>默认全员正常，仅登记异常或表扬对象</p></div></div>
      <section class="card"><div class="card-body">
        <div class="form-group"><label>检查项目</label><div class="segment">${cats.map(c=>`<button class="${state.checkCategory===c?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div></div>
        <div class="form-group"><label>班级</label><select id="classSelect" class="input">${allowed.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>具体事件</label><select id="ruleSelect" class="input">${rr.map(r=>`<option value="${r.id}">${r.name}（${r.score>0?'+':''}${r.score}分）</option>`).join('')}</select></div>
        ${classMode?`<div class="notice">公共区检查属于班级事件，将直接计入班级量化。</div>`:`<div class="form-group"><label>选择学生</label><div class="student-check-list">${stus.map(s=>`<label class="student-check"><span><b>${esc(s.name)}</b><br><small>${esc(s.no)}</small></span><input type="checkbox" value="${s.id}"></label>`).join('')}</div></div>`}
        <div class="form-group"><label>情况说明（可选）</label><textarea id="checkNote" class="input" rows="3" placeholder="例如：7:33到班、未按要求穿校服、主动协助打扫等"></textarea></div>
        <div class="sticky-submit"><button id="submitCheck" class="btn btn-primary btn-block">提交本次登记</button></div>
      </div></section>
    </div>`);
    $$('[data-cat]').forEach(b=>b.addEventListener('click',()=>{state.checkCategory=b.dataset.cat;render();}));
    $('#classSelect').addEventListener('change',e=>{state.selectedClass=e.target.value;render();});
    $$('.student-check input').forEach(i=>i.addEventListener('change',()=>i.closest('.student-check').classList.toggle('selected',i.checked)));
    $('#submitCheck').addEventListener('click',()=>{
      const rule=data.rules.find(r=>r.id===$('#ruleSelect').value); if(!rule) return toast('请选择具体事件');
      const note=$('#checkNote').value.trim();
      if(classMode){ data.classRecords.push({id:uid('cr'),classId:cid,ruleId:rule.id,title:rule.name,score:rule.score,note,createdAt:nowISO(),createdBy:getUser().name,status:'待整改'}); save(); toast('班级检查已登记'); render(); return; }
      const selected=$$('.student-check input:checked').map(i=>i.value); if(!selected.length) return toast('请至少选择1名学生');
      selected.forEach(sid=>data.records.push({id:uid('rec'),studentId:sid,classId:cid,ruleId:rule.id,category:rule.category,title:rule.name,score:rule.score,note,createdAt:nowISO(),createdBy:getUser().name,status:rule.score>0?'已完成':'待处理',followup:''}));
      save(); toast(`已登记 ${selected.length} 名学生`); render();
    });
  }

  function studentsPage(){
    const students=visibleStudents();
    const selected = getStudent(state.selectedStudent) || students[0]; state.selectedStudent=selected?.id;
    const searchBox=`<input id="studentSearch" class="input" placeholder="搜索姓名或学号" style="min-width:220px">`;
    shell(`<div class="page-head"><div><h2>学生档案</h2><p>查看个人表现、积分和班主任处理记录</p></div><div class="filters">${searchBox}<select id="studentSelect" class="input">${students.map(s=>`<option value="${s.id}" ${s.id===selected?.id?'selected':''}>${getClass(s.classId)?.name} · ${s.name}</option>`).join('')}</select></div></div>${selected?studentProfileHTML(selected):'<div class="empty">暂无学生</div>'}`);
    $('#studentSelect')?.addEventListener('change',e=>{state.selectedStudent=e.target.value;render();});
    $('#studentSearch')?.addEventListener('input',e=>{
      const q=e.target.value.trim().toLowerCase(); const opts=$$('#studentSelect option'); opts.forEach(o=>{const s=getStudent(o.value);o.hidden=q&&!`${s.name}${s.no}`.toLowerCase().includes(q)}); const first=opts.find(o=>!o.hidden); if(q&&first){$('#studentSelect').value=first.value;state.selectedStudent=first.value;render();}
    });
  }

  function studentProfileHTML(s){
    const recs=data.records.filter(r=>r.studentId===s.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const neg=recs.filter(r=>r.score<0), pos=recs.filter(r=>r.score>0), score=recs.reduce((a,r)=>a+r.score,0);
    const thisMonth=new Date().getMonth(), thisYear=new Date().getFullYear();
    const monthNeg=neg.filter(r=>{const d=new Date(r.createdAt);return d.getMonth()===thisMonth&&d.getFullYear()===thisYear}).length;
    const timeline=recs.length?recs.map(r=>`<div class="timeline-item ${r.score>0?'positive':''}"><h4>${esc(r.title)} <span class="badge ${r.score>0?'good':'bad'}">${r.score>0?'+':''}${r.score}分</span></h4><p>${dateOnly(r.createdAt)} ${timeOnly(r.createdAt)} · ${esc(r.createdBy)} · ${esc(r.status)}</p>${r.note?`<p>${esc(r.note)}</p>`:''}${r.followup?`<p><b>处理：</b>${esc(r.followup)}</p>`:''}</div>`).join(''):`<div class="empty">暂无行为记录</div>`;
    return `<section class="card"><div class="card-body"><div class="profile-top"><div class="profile-photo">${esc(s.name.slice(0,1))}</div><div class="profile-meta"><h3>${esc(s.name)}</h3><p>${esc(getClass(s.classId)?.name)} · 学号 ${esc(s.no)}</p><p>校卡号 ${esc(s.cardNo||'未录入')} · ${esc(s.status)}</p></div><div><span class="badge ${score>=0?'good':'warn'}">综合积分 ${score>0?'+':''}${score}</span></div></div></div></section>
      <div class="grid kpis" style="margin-top:16px"><div class="kpi"><div class="kpi-top">本月违纪</div><div class="kpi-value">${monthNeg}</div></div><div class="kpi"><div class="kpi-top">学期违纪</div><div class="kpi-value">${neg.length}</div></div><div class="kpi"><div class="kpi-top">学期表扬</div><div class="kpi-value">${pos.length}</div></div><div class="kpi"><div class="kpi-top">累计积分</div><div class="kpi-value">${score>0?'+':''}${score}</div></div></div>
      <section class="card" style="margin-top:16px"><div class="card-head"><h3>成长时间轴</h3></div><div class="card-body"><div class="timeline">${timeline}</div></div></section>`;
  }

  function homeroomPage(){
    const u=getUser(); let cid=u.role==='headteacher'?u.classId:state.selectedClass; const allowed=visibleClasses(); if(!allowed.some(c=>c.id===cid)) cid=allowed[0]?.id; state.selectedClass=cid;
    const c=getClass(cid), recs=data.records.filter(r=>r.classId===cid), today=recs.filter(r=>isToday(r.createdAt)), pending=recs.filter(r=>r.score<0&&r.status==='待处理').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const alertStudents=data.students.filter(s=>s.classId===cid).map(s=>({s,count:recs.filter(r=>r.studentId===s.id&&r.score<0).length})).filter(x=>x.count>=2).sort((a,b)=>b.count-a.count).slice(0,6);
    const pendingRows=pending.length?pending.map(r=>{const s=getStudent(r.studentId);return `<tr><td>${esc(s?.name||'-')}</td><td>${esc(r.title)}</td><td>${dateOnly(r.createdAt)} ${timeOnly(r.createdAt)}</td><td>${esc(r.note||'-')}</td><td><button class="btn btn-good" data-handle="${r.id}">处理</button></td></tr>`}).join(''):`<tr><td colspan="5"><div class="empty">没有待处理事件</div></td></tr>`;
    shell(`<div class="page-head"><div><h2>班主任工作台</h2><p>${esc(c?.name||'')} · 班主任 ${esc(c?.teacher||'')}</p></div>${u.role!=='headteacher'?`<div class="filters"><select id="homeClass" class="input">${allowed.map(x=>`<option value="${x.id}" ${x.id===cid?'selected':''}>${x.name}</option>`).join('')}</select></div>`:''}</div>
      <div class="grid kpis"><div class="kpi"><div class="kpi-top">今日异常</div><div class="kpi-value">${today.filter(r=>r.score<0).length}</div></div><div class="kpi"><div class="kpi-top">今日表扬</div><div class="kpi-value">${today.filter(r=>r.score>0).length}</div></div><div class="kpi"><div class="kpi-top">待处理</div><div class="kpi-value">${pending.length}</div></div><div class="kpi"><div class="kpi-top">班级量化</div><div class="kpi-value">${scoreOfClass(cid)}</div></div></div>
      <div class="grid section-grid" style="margin-top:16px">
        <section class="card"><div class="card-head"><h3>待处理事件</h3></div><div class="card-body table-wrap"><table><thead><tr><th>学生</th><th>问题</th><th>时间</th><th>说明</th><th>操作</th></tr></thead><tbody>${pendingRows}</tbody></table></div></section>
        <section class="card"><div class="card-head"><h3>重点关注</h3><span class="badge warn">按累计异常次数提示</span></div><div class="card-body">${alertStudents.length?alertStudents.map(x=>`<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #eef1f4"><span><b>${esc(x.s.name)}</b><br><small>${esc(x.s.no)}</small></span><span class="badge warn">${x.count}次异常</span></div>`).join(''):'<div class="empty">暂无需要重点关注的学生</div>'}</div></section>
      </div>`);
    $('#homeClass')?.addEventListener('change',e=>{state.selectedClass=e.target.value;render();});
    $$('[data-handle]').forEach(b=>b.addEventListener('click',()=>openHandleModal(b.dataset.handle)));
  }

  function openHandleModal(id){
    const r=data.records.find(x=>x.id===id), s=getStudent(r.studentId); if(!r)return;
    const box=document.createElement('div'); box.className='modal-backdrop'; box.innerHTML=`<div class="modal"><div class="modal-head"><b>处理学生事件</b><button class="btn btn-outline" id="closeModal">×</button></div><div class="modal-body"><p><b>${esc(s.name)}</b> · ${esc(r.title)}</p><div class="form-group"><label>处理方式</label><select id="handleType" class="input"><option>已教育谈话</option><option>已联系家长</option><option>学生已整改</option><option>继续观察</option><option>情况有误，申请纠正</option></select></div><div class="form-group"><label>处理说明</label><textarea id="handleNote" class="input" rows="4" placeholder="填写教育处理或整改情况"></textarea></div></div><div class="modal-foot"><button class="btn btn-outline" id="cancelHandle">取消</button><button class="btn btn-primary" id="saveHandle">完成处理</button></div></div>`; document.body.appendChild(box);
    const close=()=>box.remove(); $('#closeModal',box).onclick=close; $('#cancelHandle',box).onclick=close; $('#saveHandle',box).onclick=()=>{ const type=$('#handleType',box).value,note=$('#handleNote',box).value.trim(); r.status=type.includes('情况有误')?'申请纠正':'已处理'; r.followup=`${type}${note?'：'+note:''}`; save(); close(); toast('处理结果已保存'); render(); };
  }

  function scoresPage(){
    const cls=visibleClasses().map(c=>({c,score:scoreOfClass(c.id),neg:data.records.filter(r=>r.classId===c.id&&r.score<0).length,pos:data.records.filter(r=>r.classId===c.id&&r.score>0).length,classNeg:data.classRecords.filter(r=>r.classId===c.id&&r.score<0).length})).sort((a,b)=>b.score-a.score);
    const rows=cls.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.c.name)}</b><br><small>班主任：${esc(x.c.teacher)}</small></td><td>${x.neg}</td><td>${x.classNeg}</td><td>${x.pos}</td><td><strong>${x.score}</strong></td></tr>`).join('');
    shell(`<div class="page-head"><div><h2>班级量化</h2><p>当前规则：基础分 ${data.settings.baseScore} 分 + 学生事件分 + 班级事件分</p></div></div><section class="card"><div class="card-head"><h3>班级排名</h3><span class="badge info">仅内部管理展示</span></div><div class="card-body table-wrap"><table><thead><tr><th>排名</th><th>班级</th><th>学生异常</th><th>班级扣分事件</th><th>表扬</th><th>量化分</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
  }

  function recordsPage(){
    const recs=visibleRecords().slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const rows=recs.map(r=>{const s=getStudent(r.studentId);return `<tr><td>${dateOnly(r.createdAt)} ${timeOnly(r.createdAt)}</td><td>${esc(getClass(r.classId)?.name||'-')}</td><td>${esc(s?.name||'-')}</td><td>${esc(r.title)}</td><td><span class="badge ${r.score>0?'good':'bad'}">${r.score>0?'+':''}${r.score}</span></td><td>${esc(r.createdBy)}</td><td>${statusBadge(r.status)}</td></tr>`}).join('');
    shell(`<div class="page-head"><div><h2>事件记录</h2><p>统一查看学生违纪、考勤和表扬数据</p></div><div class="filters"><button class="btn btn-outline" id="exportBtn">导出 CSV</button></div></div><section class="card"><div class="card-body table-wrap"><table><thead><tr><th>时间</th><th>班级</th><th>学生</th><th>事件</th><th>分值</th><th>登记人</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table></div></section>`); $('#exportBtn')?.addEventListener('click',exportCSV);
  }

  function settingsPage(){
    const ds=demoDataStats(data);
    const demoCount=ds.students+ds.records+ds.classRecords;
    shell(`<div class="page-head"><div><h2>系统工具</h2><p>本地版数据维护与导入导出</p></div></div>
      <div class="grid section-grid">
        <section class="card"><div class="card-head"><h3>学生 CSV 导入</h3></div><div class="card-body"><div class="notice">字段顺序：年级,班级,学号,姓名,性别,校卡号。班级名称需与系统一致，例如“高一1班”。系统不会再自动生成虚拟学生。</div><div style="margin-top:12px"><a class="btn btn-outline" href="学生导入模板.csv" download>下载学生导入模板</a></div><div style="margin-top:14px"><input type="file" id="csvFile" accept=".csv,text/csv" class="input"></div><button class="btn btn-primary" id="importBtn" style="margin-top:12px">导入学生</button></div></section>
        <section class="card"><div class="card-head"><h3>数据维护</h3></div><div class="card-body"><p>当前学生：<b>${data.students.length}</b> 人</p><p>当前学生事件：<b>${data.records.length}</b> 条</p><p>当前班级事件：<b>${data.classRecords.length}</b> 条</p><p>所有数据仅保存在本浏览器 localStorage 中。</p><div class="notice" style="margin:12px 0">“清除演示数据”只识别并删除旧 V1.0 内置的虚拟学生、与这些虚拟学生关联的示例事件及两条内置班级示例记录；<b>不会删除通过 CSV 导入的真实学生，也不会删除你后续为真实学生登记的记录。</b></div><button class="btn ${demoCount?'btn-bad':'btn-outline'}" id="clearDemoBtn">清除演示数据${demoCount?`（检测到 ${demoCount} 项）`:''}</button></div></section>
      </div>`);
    $('#clearDemoBtn').onclick=()=>{
      const before=demoDataStats(data);
      const total=before.students+before.records+before.classRecords;
      if(!total) return toast('未检测到旧版演示数据');
      if(!confirm(`检测到旧版演示数据：\n虚拟学生 ${before.students} 名\n示例学生事件 ${before.records} 条\n示例班级事件 ${before.classRecords} 条\n\n确定清除吗？CSV 导入的真实学生和真实记录不会被删除。`)) return;
      const result=clearLegacyDemoData(data); data=result.data; save(); toast(`已清除：${before.students} 名虚拟学生、${before.records+before.classRecords} 条示例记录`); render();
    };
    $('#importBtn').onclick=importCSV;
  }

  function importCSV(){
    const file=$('#csvFile').files[0]; if(!file)return toast('请先选择 CSV 文件'); const reader=new FileReader(); reader.onload=()=>{ const lines=String(reader.result).split(/\r?\n/).filter(Boolean); let added=0; lines.forEach((line,idx)=>{ if(idx===0&&line.includes('学号'))return; const [grade,className,no,name,gender,cardNo]=line.split(',').map(s=>s.trim()); const c=data.classes.find(x=>x.name===className); if(!c||!no||!name||data.students.some(s=>s.no===no))return; data.students.push({id:uid('s'),no,name,gender:gender||'',classId:c.id,cardNo:cardNo||'',status:'在读'});added++; }); save(); toast(`成功导入 ${added} 名学生`); render(); }; reader.readAsText(file,'UTF-8');
  }

  function exportCSV(){
    const header=['时间','班级','学号','姓名','类别','事件','分值','登记人','状态','说明','处理结果'];
    const rows=visibleRecords().map(r=>{const s=getStudent(r.studentId);return [new Date(r.createdAt).toLocaleString('zh-CN'),getClass(r.classId)?.name||'',s?.no||'',s?.name||'',r.category,r.title,r.score,r.createdBy,r.status,r.note||'',r.followup||'']});
    const csv='\ufeff'+[header,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`学生日常表现记录_${todayKey()}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('CSV 已导出');
  }

  function statusBadge(s){ const cls=s==='已处理'||s==='已完成'?'good':s==='待处理'||s==='待整改'?'warn':s==='申请纠正'?'bad':'info'; return `<span class="badge ${cls}">${esc(s)}</span>`; }

  function render(){
    data=loadData();
    if(!session || !getUser()) return loginView();
    if(!pageAllowed(state.page)) state.page='dashboard';
    ({dashboard,check:checkPage,students:studentsPage,homeroom:homeroomPage,scores:scoresPage,records:recordsPage,settings:settingsPage}[state.page]||dashboard)();
  }

  render();
})();
