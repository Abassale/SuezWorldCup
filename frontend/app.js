const TEAM_LOGOS = ["💧","🚰","🐸","🦆","🦈","🐳","⚽","🏆","🔥","⚡","🧊","🚀","🦄","🐢","🌊"];
const POINTS_EXACT_SCORE = 5;
const POINTS_GOAL_DIFFERENCE = 4;
const POINTS_OUTCOME = 3;
const POINTS_TEAM_GOAL = 1;
const FAVORITE_WINNER_BONUS = 10;

const COUNTRY_FR = {
  "Argentina":"Argentine","Australia":"Australie","Austria":"Autriche","Belgium":"Belgique","Brazil":"Brésil","Cameroon":"Cameroun","Canada":"Canada","Chile":"Chili","China":"Chine","Colombia":"Colombie","Costa Rica":"Costa Rica","Croatia":"Croatie","Czech Republic":"République tchèque","Czechia":"République tchèque","Denmark":"Danemark","Ecuador":"Équateur","Egypt":"Égypte","England":"Angleterre","Finland":"Finlande","France":"France","Germany":"Allemagne","Ghana":"Ghana","Greece":"Grèce","Honduras":"Honduras","Hungary":"Hongrie","Iceland":"Islande","Iran":"Iran","Iraq":"Irak","Ireland":"Irlande","Italy":"Italie","Ivory Coast":"Côte d’Ivoire","Cote d'Ivoire":"Côte d’Ivoire","Japan":"Japon","Mexico":"Mexique","Morocco":"Maroc","Netherlands":"Pays-Bas","New Zealand":"Nouvelle-Zélande","Nigeria":"Nigeria","Northern Ireland":"Irlande du Nord","Norway":"Norvège","Panama":"Panama","Paraguay":"Paraguay","Peru":"Pérou","Poland":"Pologne","Portugal":"Portugal","Qatar":"Qatar","Romania":"Roumanie","Russia":"Russie","Saudi Arabia":"Arabie saoudite","Scotland":"Écosse","Senegal":"Sénégal","Serbia":"Serbie","Slovakia":"Slovaquie","Slovenia":"Slovénie","South Africa":"Afrique du Sud","South Korea":"Corée du Sud","Korea Republic":"Corée du Sud","Spain":"Espagne","Sweden":"Suède","Switzerland":"Suisse","Tunisia":"Tunisie","Turkey":"Turquie","Türkiye":"Turquie","Ukraine":"Ukraine","United States":"États-Unis","USA":"États-Unis","Uruguay":"Uruguay","Wales":"Pays de Galles","Bosnia & Herzegovina":"Bosnie-Herzégovine","Bosnia and Herzegovina":"Bosnie-Herzégovine","Bosnia-Herzegovina":"Bosnie-Herzégovine","Bosnia Herzegovina":"Bosnie-Herzégovine","Algeria":"Algérie","Jordan":"Jordanie","Curacao":"Curaçao","Curaçao":"Curaçao","Haiti":"Haïti","Uzbekistan":"Ouzbékistan","DR Congo":"République démocratique du Congo","Congo DR":"République démocratique du Congo","Democratic Republic of Congo":"République démocratique du Congo","Democratic Republic of the Congo":"République démocratique du Congo","TBD":"À déterminer"
};

const FLAG_CODES = {"Afrique du Sud":"za","Algérie":"dz","Allemagne":"de","Angleterre":"gb-eng","Arabie saoudite":"sa","Argentine":"ar","Australie":"au","Autriche":"at","Belgique":"be","Bosnie-Herzégovine":"ba","Brésil":"br","Cameroun":"cm","Canada":"ca","Colombie":"co","Corée du Sud":"kr","Costa Rica":"cr","Croatie":"hr","Curaçao":"cw","Danemark":"dk","Égypte":"eg","Écosse":"gb-sct","Équateur":"ec","Espagne":"es","États-Unis":"us","France":"fr","Ghana":"gh","Haïti":"ht","Irak":"iq","Iran":"ir","Italie":"it","Japon":"jp","Jordanie":"jo","Maroc":"ma","Mexique":"mx","Nigeria":"ng","Norvège":"no","Nouvelle-Zélande":"nz","Ouzbékistan":"uz","Panama":"pa","Paraguay":"py","Pays-Bas":"nl","Pologne":"pl","Portugal":"pt","Qatar":"qa","République démocratique du Congo":"cd","République tchèque":"cz","Sénégal":"sn","Serbie":"rs","Suède":"se","Suisse":"ch","Tunisie":"tn","Turquie":"tr","Ukraine":"ua","Uruguay":"uy","Côte d’Ivoire":"ci","Côte d'Ivoire":"ci","Cap-Vert":"cv"};

const SPECIAL_FLAG_URLS = {
  "écosse": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Flag_of_Scotland.svg/320px-Flag_of_Scotland.svg.png"
};

let db = null;
let me = null;
let selectedTeamLogo = "💧";
let activeView = "dashboard";
let data = { users: [], teams: [], matches: [], predictions: [], history: [] };

const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

init();

async function init() {
  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes("COLLE_ICI")) {
    toast("Configure d'abord frontend/config.js avec Supabase.");
    return;
  }
  db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  bindUI();
  populateFavoriteWinner();
  renderTeamLogos();

  const userId = localStorage.getItem("suez_user_id");
  if (userId) {
    const { data: user } = await db.from("app_users").select("id,pseudo,role,favorite_winner,team_id").eq("id", userId).maybeSingle();
    if (user) {
      me = user;
      await refreshAll();
      showApp();
    }
  }
}

function bindUI() {
  $$(".auth-tab").forEach(btn => btn.addEventListener("click", () => {
    $$(".auth-tab").forEach(b => b.classList.remove("active"));
    $$(".auth-form").forEach(f => f.classList.remove("active"));
    btn.classList.add("active");
    $(`${btn.dataset.tab}Form`).classList.add("active");
  }));

  $("loginForm").addEventListener("submit", login);
  $("registerForm").addEventListener("submit", register);
  $$(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
    btn.blur();
    switchView(btn.dataset.view);
  }));
  $("logoutBtn").addEventListener("click", logout);
  $("phaseFilter").addEventListener("change", () => { renderGroupFilter(); renderPredictions(); });
  $("groupFilter").addEventListener("change", renderPredictions);
  $("myPredStatus").addEventListener("change", renderMyPredictions);
  $("saveVisibleBtn").addEventListener("click", () => savePredictions(filteredPredictionMatches()));
  $("saveAllBtn").addEventListener("click", () => savePredictions(data.matches));
  $("teamForm").addEventListener("submit", createTeam);
  $("importBtn").addEventListener("click", importOpenFootball);
  $("resetBtn").addEventListener("click", resetChampionship);
  $("clearHistoryBtn").addEventListener("click", clearHistory);
}

async function login(e) {
  e.preventDefault();
  const pseudo = $("loginPseudo").value.trim();
  const hash = await sha256($("loginPassword").value);
  const { data: user, error } = await db.from("app_users").select("id,pseudo,role,favorite_winner,team_id,password_hash").ilike("pseudo", pseudo).maybeSingle();
  if (error) return toast(error.message);
  if (!user || user.password_hash !== hash) return toast("Pseudo ou mot de passe incorrect.");
  me = { id: user.id, pseudo: user.pseudo, role: user.role, favorite_winner: user.favorite_winner, team_id: user.team_id };
  localStorage.setItem("suez_user_id", me.id);
  await addHistory(`${me.pseudo} s'est connecté.`);
  await refreshAll();
  showApp();
}

async function register(e) {
  e.preventDefault();
  const pseudo = $("registerPseudo").value.trim();
  if (pseudo.toLowerCase() === "admin") return toast("Ce pseudo est réservé.");
  const hash = await sha256($("registerPassword").value);
  const favorite = $("favoriteWinner").value;
  const { data: created, error } = await db.from("app_users").insert({ pseudo, password_hash: hash, favorite_winner: favorite, role: "player" }).select("id,pseudo,role,favorite_winner,team_id").single();
  if (error) return toast(error.message);
  me = created;
  localStorage.setItem("suez_user_id", me.id);
  await addHistory(`${me.pseudo} a créé son compte.`);
  await refreshAll();
  showApp();
}

function showApp() {
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("currentUser").textContent = me.pseudo;
  $$(".admin-only").forEach(el => el.classList.toggle("hidden", me.role !== "admin"));
  if (me.role !== "admin" && activeView === "admin") switchView("dashboard");
  renderAll();
}

function logout() {
  localStorage.removeItem("suez_user_id");
  me = null;
  $("authScreen").classList.remove("hidden");
  $("app").classList.add("hidden");
}

async function refreshAll() {
  const [users, teams, matches, predictions, history] = await Promise.all([
    db.from("app_users").select("id,pseudo,role,favorite_winner,team_id,created_at").order("pseudo"),
    db.from("teams").select("*").order("name"),
    db.from("matches").select("*").order("match_date"),
    db.from("predictions").select("*"),
    me?.role === "admin" ? db.from("history").select("*").order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] })
  ]);
  if (users.error || teams.error || matches.error || predictions.error || history.error) {
    toast(users.error?.message || teams.error?.message || matches.error?.message || predictions.error?.message || history.error?.message);
    return;
  }
  data = { users: users.data || [], teams: teams.data || [], matches: matches.data || [], predictions: predictions.data || [], history: history.data || [] };
  me = data.users.find(u => u.id === me.id) || me;
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderMyPredictions();
  renderGroups();
  renderResults();
  renderPredictions();
  renderRanking();
  renderTeams();
  renderAdmin();
}

function switchView(view) {
  activeView = view;
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`${view}View`).classList.add("active");
  const titles = {
    dashboard: ["Tableau de bord", "Vue d’ensemble du championnat interne."],
    myPredictions: ["Mes pronostics", "Détail par match."],
    worldCup: ["Coupe du Monde 2026", "Groupes et calendrier."],
    results: ["Résultats", "Matchs terminés."],
    predictions: ["Pronostics", "Saisie de tes scores."],
    ranking: ["Classement", "Classement par équipes."],
    teams: ["Équipes", "Créer, rejoindre ou quitter une équipe."],
    admin: ["Admin", "Gestion du championnat."]
  };
  $("viewTitle").textContent = titles[view]?.[0] || view;
  $("viewSubtitle").textContent = titles[view]?.[1] || "";
  renderAll();
}

function renderDashboard() {
  const team = data.teams.find(t => t.id === me.team_id);
  $("dashboardTeam").innerHTML = team ? `
    <div class="team-card">
      <span class="team-logo">${esc(team.logo || "💧")}</span>
      <div><small>Équipe actuelle</small><h3>${esc(team.name)}</h3><p>${membersOf(team.id).length} membre(s) · favori CDM : ${esc(me.favorite_winner || "—")}</p></div>
      <button class="secondary-btn" onclick="openTeam('${team.id}')">Voir</button>
    </div>` : `<div class="empty">Tu n’as pas encore d’équipe.</div>`;

  const today = new Date().toISOString().slice(0,10);
  const todays = data.matches.filter(m => (m.match_date || "").slice(0,10) === today);
  $("todayMatches").innerHTML = todays.length ? todays.map(matchCard).join("") : `<div class="empty">Aucun match aujourd’hui.</div>`;
  $("dashboardPredictions").innerHTML = myPreds().length ? myPreds().slice(0,8).map(myPredictionCard).join("") : `<div class="empty">Aucun pronostic enregistré.</div>`;
}

function renderMyPredictions() {
  const status = $("myPredStatus")?.value || "all";
  let list = myPreds();
  if (status === "upcoming") list = list.filter(p => !isLocked(p.match));
  if (status === "locked") list = list.filter(p => isLocked(p.match) && p.match.status !== "FT");
  if (status === "finished") list = list.filter(p => p.match.status === "FT");
  $("myPredictionsList").innerHTML = list.length ? list.map(myPredictionCard).join("") : `<div class="empty">Aucun pronostic.</div>`;
}

function renderGroups() {
  const groups = computeGroups();
  $("groupsList").innerHTML = groups.length ? groups.map(g => `
    <section class="group-card">
      <div class="group-head"><h3>${esc(g.group)}</h3><span>${g.teams.length} équipe(s)</span></div>
      <table><thead><tr><th>#</th><th>Nation</th><th>Pts</th><th>J</th><th>G</th><th>N</th><th>P</th><th>Diff</th></tr></thead>
      <tbody>${g.teams.map((t,i)=>`<tr class="${i<2?'qualif':i===2?'watch':''}"><td>${i+1}</td><td>${flag(t.flag)} <strong>${esc(t.name)}</strong></td><td><strong>${t.points}</strong></td><td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${t.gd}</td></tr>`).join("")}</tbody></table>
    </section>`).join("") : `<div class="empty">Aucun groupe. L’admin doit importer OpenFootball.</div>`;
}

function renderResults() {
  const results = data.matches.filter(m => m.status === "FT");
  $("resultsList").innerHTML = results.length ? results.map(matchCard).join("") : `<div class="empty">Aucun résultat.</div>`;
}

function renderGroupFilter() {
  const select = $("groupFilter");
  const prev = select.value;
  const groups = [...new Set(data.matches.filter(m => normalizePhase(m.phase) === "Group Stage").map(m => m.group_name || "Groupes"))].sort();
  select.innerHTML = `<option value="all">Tous les groupes</option>` + groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  select.value = groups.includes(prev) ? prev : "all";
  select.disabled = $("phaseFilter").value !== "Group Stage";
}

function filteredPredictionMatches() {
  const phase = $("phaseFilter").value;
  const group = $("groupFilter").value;
  return data.matches
    .filter(m => phase === "all" || normalizePhase(m.phase) === phase)
    .filter(m => phase !== "Group Stage" || group === "all" || (m.group_name || "Groupes") === group);
}

function renderPredictions() {
  renderGroupFilter();
  const myMap = Object.fromEntries(myPreds().map(p => [p.match_id, p]));
  const list = filteredPredictionMatches();
  $("predictionsList").innerHTML = list.length ? list.map(m => predictionCard(m, myMap[m.id])).join("") : `<div class="empty">Aucun match.</div>`;
}

function renderRanking() {
  const rows = computeRanking();
  $("rankingTable").innerHTML = rows.length ? rows.map((r,i)=>`
    <tr onclick="openTeam('${r.team.id}')"><td>${i+1}</td><td><button class="team-link">${esc(r.team.logo || "💧")} ${esc(r.team.name)}</button></td><td>${r.members_count}</td><td><strong>${r.score}</strong></td><td>${r.total_points}</td><td>${r.bonus}</td><td>${r.exact}</td><td>${r.diff}</td><td>${r.outcome}</td><td>${r.predictions}</td></tr>`).join("") : `<tr><td colspan="10">Aucune équipe.</td></tr>`;
}

function renderTeams() {
  const myTeam = data.teams.find(t => t.id === me.team_id);
  $("teamForm").classList.toggle("hidden", !!myTeam);
  $("teamsList").innerHTML = data.teams.length ? data.teams.map(t => `
    <article class="team-card ${t.id===me.team_id?'current':''}">
      <span class="team-logo">${esc(t.logo || "💧")}</span>
      <div><h3>${esc(t.name)}</h3><p>${membersOf(t.id).length} membre(s)</p></div>
      <button class="secondary-btn" onclick="openTeam('${t.id}')">Voir</button>
      ${t.id !== me.team_id ? `<button class="primary-btn" onclick="joinTeam('${t.id}')">Rejoindre</button>` : `<button class="danger-btn" onclick="leaveTeam()">Quitter</button>`}
    </article>`).join("") : `<div class="empty">Aucune équipe.</div>`;
  if (myTeam) openTeam(myTeam.id, false);
}

function renderAdmin() {
  if (!me || me.role !== "admin") return;

  $("adminUsers").innerHTML = data.users.length ? data.users.map(u => {
    const team = data.teams.find(t => t.id === u.team_id);
    const stats = predictionStatsForUser(u);
    const canDelete = u.id !== me.id;
    return `
      <article class="admin-user-card">
        <div class="admin-user-main">
          <div class="admin-user-avatar">${esc((u.pseudo || "?").slice(0,1).toUpperCase())}</div>
          <div>
            <h4>${esc(u.pseudo)}</h4>
            <p>${u.role === "admin" ? "Admin" : "Joueur"} · ${team ? esc(team.name) : "Sans équipe"} · ${stats.predictions} pronostic(s)</p>
            <small>Favori : ${esc(u.favorite_winner || "—")} · Créé le ${shortDate(u.created_at)}</small>
          </div>
        </div>
        <div class="admin-user-actions">
          <strong>${stats.points} pt(s)</strong>
          ${canDelete ? `<button class="danger-btn" onclick="deleteUserAccount('${u.id}')">Supprimer</button>` : `<button class="secondary-btn" disabled>Compte actuel</button>`}
        </div>
      </article>`;
  }).join("") : `<div class="empty">Aucun compte.</div>`;

  $("adminMatches").innerHTML = data.matches.map(m => `
    <article class="match-card admin-score-card">
      <div class="match-meta">
        <span>${esc(m.group_name || m.phase)}</span>
        <span>${shortDate(m.match_date)}</span>
        <span>${m.status === "FT" ? "Terminé" : "À renseigner"}</span>
      </div>
      <div class="match-teams pred-line admin-score-line">
        <span class="team-side">${flag(m.home_flag || flagUrl(m.home_team))} <strong>${esc(m.home_team)}</strong></span>
        <span class="pred-inputs admin-score-inputs">
          <input id="h_${m.id}" type="number" min="0" value="${m.home_score ?? ""}">
          <b>-</b>
          <input id="a_${m.id}" type="number" min="0" value="${m.away_score ?? ""}">
        </span>
        <span class="team-side away-side">${flag(m.away_flag || flagUrl(m.away_team))} <strong>${esc(m.away_team)}</strong></span>
        <button class="secondary-btn score-btn" onclick="saveScore('${m.id}')">Score</button>
      </div>
    </article>`).join("");
  $("historyList").innerHTML = data.history.map(h => `<div class="history-item"><small>${shortDate(h.created_at)}</small><p>${esc(h.action)}</p></div>`).join("") || `<div class="empty">Aucun historique.</div>`;
}

function renderTeamLogos() {
  $("teamLogos").innerHTML = TEAM_LOGOS.map(l => `<button type="button" class="${selectedTeamLogo===l?'selected':''}" onclick="selectLogo('${l}')">${l}</button>`).join("");
}
function selectLogo(l) { selectedTeamLogo = l; renderTeamLogos(); }

async function createTeam(e) {
  e.preventDefault();
  const name = $("teamName").value.trim();
  if (!name) return;
  const { data: team, error } = await db.from("teams").insert({ name, logo: selectedTeamLogo }).select().single();
  if (error) return toast(error.message);
  await db.from("app_users").update({ team_id: team.id }).eq("id", me.id);
  await addHistory(`${me.pseudo} a créé l’équipe ${team.name}.`);
  $("teamName").value = "";
  await refreshAll();
  toast("Équipe créée.");
}

async function joinTeam(id) {
  await db.from("app_users").update({ team_id: id }).eq("id", me.id);
  const team = data.teams.find(t => t.id === id);
  await addHistory(`${me.pseudo} a rejoint l’équipe ${team?.name || ""}.`);
  await refreshAll();
  toast("Équipe rejointe.");
}

async function leaveTeam() {
  if (!confirm("Quitter ton équipe ?")) return;
  const oldTeam = data.teams.find(t => t.id === me.team_id);
  await db.from("app_users").update({ team_id: null }).eq("id", me.id);
  await addHistory(`${me.pseudo} a quitté l’équipe ${oldTeam?.name || ""}.`);
  await refreshAll();
  toast("Équipe quittée.");
}

function openTeam(id, switchTab = false) {
  const team = data.teams.find(t => t.id === id);
  if (!team) return;
  const stats = computeTeamStats(team);
  $("teamDetail").innerHTML = `
    <div class="team-detail-head"><h2>${esc(team.logo || "💧")} ${esc(team.name)}</h2>${me.team_id===team.id ? `<button class="danger-btn" onclick="leaveTeam()">Quitter l’équipe</button>` : `<button class="primary-btn" onclick="joinTeam('${team.id}')">Rejoindre</button>`}</div>
    <div class="stats-grid"><div><span>Score équipe</span><strong>${stats.score}</strong></div><div><span>Total</span><strong>${stats.total_points}</strong></div><div><span>Bonus</span><strong>${stats.bonus}</strong></div><div><span>Exact</span><strong>${stats.exact}</strong></div></div>
    <div class="table-wrap"><table><thead><tr><th>Collègue</th><th>Favori</th><th>Points</th><th>Base</th><th>Bonus</th><th>Exact</th><th>Diff.</th><th>Bon résultat</th><th>Pronostics</th></tr></thead>
    <tbody>${stats.members_stats.map(s => `<tr><td><strong>${esc(s.user.pseudo)}</strong></td><td>${esc(s.user.favorite_winner || "—")}</td><td><strong>${s.points}</strong></td><td>${s.base_points}</td><td>${s.bonus}</td><td>${s.exact}</td><td>${s.diff}</td><td>${s.outcome}</td><td>${s.predictions}</td></tr>`).join("")}</tbody></table></div>`;
  if (switchTab) switchView("teams");
}

async function savePredictions(matches) {
  const rows = [];
  for (const m of matches) {
    const h = $(`ph_${m.id}`)?.value;
    const a = $(`pa_${m.id}`)?.value;
    if (h !== "" && a !== "" && h !== undefined && a !== undefined) {
      if (isLocked(m)) continue;
      rows.push({ user_id: me.id, match_id: m.id, home_score: Number(h), away_score: Number(a), updated_at: new Date().toISOString() });
    }
  }
  if (!rows.length) return toast("Aucun pronostic à enregistrer.");
  for (const row of rows) {
    await db.from("predictions").upsert(row, { onConflict: "user_id,match_id" });
  }
  await addHistory(`${me.pseudo} a enregistré ${rows.length} pronostic(s).`);
  await refreshAll();
  toast(`${rows.length} pronostic(s) enregistré(s).`);
}

async function saveScore(id) {
  const h = Number($(`h_${id}`).value);
  const a = Number($(`a_${id}`).value);
  await db.from("matches").update({ home_score: h, away_score: a, status: "FT", updated_at: new Date().toISOString() }).eq("id", id);
  const m = data.matches.find(x => x.id === id);
  await addHistory(`Score saisi : ${m?.home_team || ""} ${h}-${a} ${m?.away_team || ""}.`);
  await refreshAll();
  toast("Score enregistré.");
}

async function resetChampionship() {
  if (!confirm("Réinitialiser matchs et pronostics ?")) return;
  await db.from("predictions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await addHistory("Données du championnat réinitialisées.");
  await refreshAll();
}

async function clearHistory() {
  await db.from("history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await refreshAll();
}

async function deleteUserAccount(userId) {
  if (!me || me.role !== "admin") return;
  if (userId === me.id) return toast("Tu ne peux pas supprimer ton propre compte admin.");
  const user = data.users.find(u => u.id === userId);
  if (!user) return toast("Compte introuvable.");
  if (!confirm(`Supprimer définitivement le compte "${user.pseudo}" ?\n\nSes pronostics seront aussi supprimés de la base.`)) return;

  const { error } = await db.from("app_users").delete().eq("id", userId);
  if (error) return toast(error.message);

  await addHistory(`Compte supprimé : ${user.pseudo}.`);
  await refreshAll();
  toast("Compte supprimé de la base.");
}

async function importOpenFootball() {
  const url = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
  const res = await fetch(url);
  if (!res.ok) return toast("Import impossible depuis OpenFootball.");
  const json = await res.json();
  const rows = (json.matches || []).map((item, index) => normalizeOpenFootballMatch(item, index));
  for (const chunk of chunks(rows, 100)) {
    const { error } = await db.from("matches").upsert(chunk, { onConflict: "external_id" });
    if (error) return toast(error.message);
  }
  await addHistory(`Import OpenFootball 2026 : ${rows.length} match(s).`);
  await refreshAll();
  toast("Calendrier importé.");
}

function normalizeOpenFootballMatch(item, index) {
  const home = countryFr(item.team1 || item.home || "Équipe A");
  const away = countryFr(item.team2 || item.away || "Équipe B");
  const group = item.group || null;
  const round = item.round || null;
  const phase = normalizePhase(group || round || "Group Stage");
  const groupName = group ? `Groupe ${String(group).toUpperCase()}` : null;
  const ft = item.score?.ft;
  const homeScore = Array.isArray(ft) && Number.isInteger(ft[0]) ? ft[0] : null;
  const awayScore = Array.isArray(ft) && Number.isInteger(ft[1]) ? ft[1] : null;
  const date = parseOpenFootballDate(item.date, item.time);
  return {
    external_id: `2026_${index}_${slug(home)}_${slug(away)}_${item.date || ""}`,
    phase,
    group_name: groupName,
    home_team: home,
    away_team: away,
    home_flag: flagUrl(home),
    away_flag: flagUrl(away),
    home_score: homeScore,
    away_score: awayScore,
    match_date: date,
    status: homeScore !== null && awayScore !== null ? "FT" : "NS",
    venue: item.ground || "",
    city: item.ground || "",
    updated_at: new Date().toISOString()
  };
}

function myPreds() {
  return data.predictions
    .filter(p => p.user_id === me?.id)
    .map(p => ({ ...p, match: data.matches.find(m => m.id === p.match_id) }))
    .filter(p => p.match)
    .sort((a,b) => new Date(a.match.match_date) - new Date(b.match.match_date));
}

function predictionStatsForUser(user) {
  const preds = data.predictions.filter(p => p.user_id === user.id);
  let base_points = 0, exact = 0, diff = 0, outcome = 0;
  for (const p of preds) {
    const m = data.matches.find(x => x.id === p.match_id);
    if (!m) continue;
    const res = pointsFor(p, m);
    base_points += res.points;
    exact += res.exact ? 1 : 0;
    diff += res.diff ? 1 : 0;
    outcome += res.outcome ? 1 : 0;
  }
  const bonus = worldCupWinner() && user.favorite_winner === worldCupWinner() ? FAVORITE_WINNER_BONUS : 0;
  return { user, points: base_points + bonus, base_points, bonus, exact, diff, outcome, predictions: preds.length };
}

function computeTeamStats(team) {
  const members = membersOf(team.id);
  const members_stats = members.map(predictionStatsForUser).sort((a,b) => b.points - a.points);
  const totals = members_stats.reduce((acc, s) => {
    acc.total_points += s.points; acc.bonus += s.bonus; acc.exact += s.exact; acc.diff += s.diff; acc.outcome += s.outcome; acc.predictions += s.predictions;
    return acc;
  }, { total_points: 0, bonus: 0, exact: 0, diff: 0, outcome: 0, predictions: 0 });
  const score = Number((totals.total_points / Math.max(members.length, 1)).toFixed(1));
  return { team, members_count: members.length, members_stats, score, ...totals };
}

function computeRanking() {
  return data.teams.map(computeTeamStats).sort((a,b) => b.score - a.score || b.total_points - a.total_points || b.exact - a.exact || b.diff - a.diff || a.team.name.localeCompare(b.team.name));
}

function computeGroups() {
  const groups = new Map();
  const groupMatches = new Map();
  for (const m of data.matches) {
    if (normalizePhase(m.phase) !== "Group Stage") continue;
    const g = m.group_name || "Groupes";
    if (!groups.has(g)) groups.set(g, new Map());
    if (!groupMatches.has(g)) groupMatches.set(g, []);
    groupMatches.get(g).push(m);
    for (const name of [m.home_team, m.away_team]) {
      if (!groups.get(g).has(name)) groups.get(g).set(name, { name, flag: flagUrl(name), played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0 });
    }
    if (m.status !== "FT" || m.home_score === null || m.away_score === null) continue;
    const h = groups.get(g).get(m.home_team);
    const a = groups.get(g).get(m.away_team);
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score; a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.won++; a.lost++; h.points += 3; }
    else if (m.home_score < m.away_score) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
    h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
  }
  return [...groups.entries()].map(([group, map]) => ({
    group,
    teams: [...map.values()].sort((a,b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)),
    matches: (groupMatches.get(group) || []).sort((a,b) => new Date(a.match_date) - new Date(b.match_date))
  })).sort((a,b) => a.group.localeCompare(b.group, "fr"));
}

function pointsFor(pred, match) {
  if (match.status !== "FT" || match.home_score === null || match.away_score === null) return { points:0, exact:false, diff:false, outcome:false, goalBonus:0 };
  const predDiffValue = pred.home_score - pred.away_score;
  const realDiffValue = match.home_score - match.away_score;
  const predDiff = Math.sign(predDiffValue);
  const realDiff = Math.sign(realDiffValue);
  const exact = pred.home_score === match.home_score && pred.away_score === match.away_score;
  const diff = !exact && predDiffValue === realDiffValue;
  const outcome = !exact && !diff && predDiff === realDiff;
  const goalBonus = (pred.home_score === match.home_score ? POINTS_TEAM_GOAL : 0) + (pred.away_score === match.away_score ? POINTS_TEAM_GOAL : 0);
  let base = 0;
  if (exact) base = POINTS_EXACT_SCORE;
  else if (diff) base = POINTS_GOAL_DIFFERENCE;
  else if (outcome) base = POINTS_OUTCOME;
  return { points: base + goalBonus, exact, diff, outcome, goalBonus };
}

function worldCupWinner() {
  const final = data.matches.find(m => normalizePhase(m.phase) === "Final" && m.status === "FT");
  if (!final) return null;
  if (final.home_score > final.away_score) return final.home_team;
  if (final.away_score > final.home_score) return final.away_team;
  return null;
}

function membersOf(teamId) { return data.users.filter(u => u.team_id === teamId); }

function matchCard(m) {
  return `<article class="match-card"><div class="match-meta"><span>${esc(m.group_name || m.phase)}</span><span>${shortDate(m.match_date)}</span><span>${esc(m.status)}</span></div><div class="match-teams"><span>${flag(m.home_flag || flagUrl(m.home_team))} <strong>${esc(m.home_team)}</strong></span><strong>${m.status==="FT" ? `${m.home_score} - ${m.away_score}` : "-"}</strong><span>${flag(m.away_flag || flagUrl(m.away_team))} <strong>${esc(m.away_team)}</strong></span></div></article>`;
}

function predictionCard(m, p) {
  const locked = isLocked(m);
  return `<article class="match-card"><div class="match-meta"><span>${esc(m.group_name || m.phase)}</span><span>${shortDate(m.match_date)}</span><span>${locked ? "Verrouillé" : "Ouvert"}</span></div><div class="match-teams pred-line"><span>${flag(m.home_flag || flagUrl(m.home_team))} <strong>${esc(m.home_team)}</strong></span><span class="pred-inputs"><input id="ph_${m.id}" type="number" min="0" ${locked ? "disabled" : ""} value="${p?.home_score ?? ""}"><b>-</b><input id="pa_${m.id}" type="number" min="0" ${locked ? "disabled" : ""} value="${p?.away_score ?? ""}"></span><span>${flag(m.away_flag || flagUrl(m.away_team))} <strong>${esc(m.away_team)}</strong></span></div></article>`;
}

function myPredictionCard(p) {
  const m = p.match;
  const pts = pointsFor(p, m);
  return `<article class="match-card"><div class="match-meta"><span>${esc(m.group_name || m.phase)}</span><span>${shortDate(m.match_date)}</span><span>${m.status==="FT" ? `${pts.points} pt(s)` : isLocked(m) ? "Verrouillé" : "Ouvert"}</span></div><div class="match-teams"><span>${flag(m.home_flag || flagUrl(m.home_team))} <strong>${esc(m.home_team)}</strong></span><strong>${p.home_score} - ${p.away_score}</strong><span>${flag(m.away_flag || flagUrl(m.away_team))} <strong>${esc(m.away_team)}</strong></span></div>${m.status==="FT" ? `<small>Score réel : ${m.home_score}-${m.away_score}</small>` : ""}</article>`;
}

function populateFavoriteWinner() {
  const countries = Object.keys(FLAG_CODES).sort((a,b) => a.localeCompare(b, "fr"));
  $("favoriteWinner").innerHTML = `<option value="">Choisir une équipe</option>` + countries.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

async function addHistory(action) {
  await db.from("history").insert({ user_id: me?.id || null, action });
}

function isLocked(m) { return (m.status !== "NS" && m.status !== "TBD") || new Date(m.match_date).getTime() <= Date.now(); }
function normalizePhase(p) {
  const s = String(p || "");
  if (/group/i.test(s) || /^[A-L]$/i.test(s)) return "Group Stage";
  if (/32/.test(s)) return "Round of 32";
  if (/16/.test(s)) return "Round of 16";
  if (/quarter/i.test(s)) return "Quarter-finals";
  if (/semi/i.test(s)) return "Semi-finals";
  if (/third/i.test(s)) return "Third-place match";
  if (/final/i.test(s)) return "Final";
  return s;
}
function countryFr(name) {
  const clean = String(name || "").trim();
  return COUNTRY_FR[clean] || clean || "À déterminer";
}
function canonicalCountryKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
}

function flagUrl(name) {
  const frName = countryFr(name);
  const direct = FLAG_CODES[frName];
  if (direct) return `https://flagcdn.com/w40/${direct}.png`;

  const aliases = {
    "cape verde": "Cap-Vert",
    "cap vert": "Cap-Vert",
    "cabo verde": "Cap-Vert",
    "ivory coast": "Côte d’Ivoire",
    "cote d'ivoire": "Côte d’Ivoire",
    "cote d ivoire": "Côte d’Ivoire",
    "cote divoire": "Côte d’Ivoire",
    "turkiye": "Turquie",
    "turkey": "Turquie",
    "scotland": "Écosse",
    "sweden": "Suède",
    "iraq": "Irak"
  };

  const key = canonicalCountryKey(frName);
  const resolved = aliases[key] || frName;
  const special = SPECIAL_FLAG_URLS[canonicalCountryKey(resolved)];
  if (special) return special;
  const code = FLAG_CODES[resolved];
  return code ? `https://flagcdn.com/w40/${code}.png` : "";
}
function flag(url) { return url ? `<img class="flag" src="${esc(url)}" alt="">` : `<span class="flag fallback"></span>`; }
function shortDate(v) { if (!v) return ""; return new Intl.DateTimeFormat("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(v)); }
function parseOpenFootballDate(date, time) {
  if (!date) return new Date().toISOString();
  const clean = String(time || "12:00").trim();
  const m = clean.match(/^(\d{1,2}):(\d{2})(?:\s*UTC([+-]\d{1,2}))?/i);
  if (!m) return new Date(`${date}T12:00:00Z`).toISOString();
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCHours(Number(m[1]) - Number(m[3] || 0), Number(m[2]), 0, 0);
  return d.toISOString();
}
function slug(v) { return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""); }
function chunks(arr, size) { const out = []; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }
async function sha256(text) { const enc = new TextEncoder().encode(text); const buf = await crypto.subtle.digest("SHA-256", enc); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join(""); }
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); }
