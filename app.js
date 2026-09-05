window.BRX_CONFIG = { API_BASE: "http://localhost:8000" };

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let userId = localStorage.getItem("brx_user_id");
let meData = null;

async function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (userId) headers["X-BRX-User-Id"] = userId;
  const r = await fetch(window.BRX_CONFIG.API_BASE + path, {...options, headers});
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Request failed");
  return data;
}

async function authenticate() {
  if (!tg?.initData) {
    console.warn("Open inside Telegram for real authentication.");
    document.getElementById("welcome").textContent = "BRX Demo Mode";
    return;
  }
  const result = await api("/auth", {method:"POST", body:JSON.stringify({init_data:tg.initData})});
  userId = result.user_id;
  localStorage.setItem("brx_user_id", userId);
}

async function loadMe() {
  if (!userId) return;
  meData = await api("/me");
  document.getElementById("welcome").textContent = `Hello, ${meData.name || "BRX User"} 👋`;
  document.getElementById("brxBalance").textContent = meData.brx_reward_balance.toLocaleString();
  document.getElementById("points").textContent = meData.points.toLocaleString();
  document.getElementById("rewardPoints").textContent = meData.points.toLocaleString();
  document.getElementById("streak").textContent = `${meData.streak} days`;
  document.getElementById("refs").textContent = meData.total_referrals;
  document.getElementById("nft").textContent = meData.nft.owned ? "Owned" : "None";
  document.getElementById("refCode").textContent = meData.referral_code;
  document.getElementById("refTotal").textContent = meData.total_referrals;
  document.getElementById("refActive").textContent = meData.active_referrals;
  document.getElementById("walletText").textContent = meData.wallet_address ? `Connected: ${meData.wallet_address}` : "No wallet connected.";
  document.getElementById("profileName").textContent = meData.name || "BRX User";
  document.getElementById("profileUsername").textContent = meData.username ? "@"+meData.username : "";
  document.getElementById("profileId").textContent = "#"+meData.id;
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "activity") loadActivities();
  if (id === "token") loadToken();
  window.scrollTo({top:0, behavior:"smooth"});
}

async function claimDaily() {
  try {
    const x = await api("/rewards/daily-checkin", {method:"POST"});
    if (tg) tg.showAlert(`Reward claimed: +${x.points_awarded} points`);
    else alert(`Reward claimed: +${x.points_awarded} points`);
    await loadMe();
  } catch(e) { alert(e.message); }
}

async function linkWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Enter a public wallet address.");
  try {
    await api("/wallet/link", {method:"POST", body:JSON.stringify({address})});
    document.getElementById("walletInput").value = "";
    await loadMe();
    alert("Wallet address linked. Production version should verify ownership with a signature.");
  } catch(e) { alert(e.message); }
}

async function loadActivities() {
  if (!userId) return;
  const rows = await api("/activities");
  document.getElementById("activityList").innerHTML = rows.map(x =>
    `<div class="activity"><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.detail)}</small><small>${new Date(x.created_at).toLocaleString()}</small></div>`
  ).join("") || `<p class="hint">No activity yet.</p>`;
}

async function loadToken() {
  const x = await api("/token");
  document.getElementById("tokenName").textContent = x.name + " (" + x.symbol + ")";
  document.getElementById("supply").textContent = Number(x.total_supply).toLocaleString() + " BRX";
  document.getElementById("chain").textContent = x.chain;
  document.getElementById("contract").textContent = x.contract;
}

function copyRef() {
  navigator.clipboard?.writeText(meData?.referral_code || "");
  alert("Referral code copied.");
}

function shareRef() {
  const code = meData?.referral_code || "";
  const text = `Join the BRX ecosystem with my referral code: ${code}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}`);
  } else navigator.clipboard?.writeText(text);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

(async () => {
  try { await authenticate(); await loadMe(); } catch(e) { console.error(e); alert(e.message); }
})();
