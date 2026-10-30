const $ = id => document.getElementById(id);

let guilds = [];

function preview() {
  $("pt").textContent = $("title").value || "Welcome to AYS+ARP";
  $("pd").textContent = $("description").value || "Thanks for joining our server!";
  $("pf").textContent = $("footer").value || "Welcome to the community!";
  $("embed").style.borderLeftColor = $("color").value;
  $("pi").src = $("imageUrl").value;
  $("pi").classList.toggle("hide", !$("imageUrl").value);
}

["title","description","footer","color","imageUrl"].forEach(id =>
  $(id).addEventListener("input", preview)
);

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {"Content-Type":"application/json", ...(options.headers || {})},
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadConfig() {
  const id = $("guild").value;
  if (!id) return;
  try {
    const c = await api("/api/config/" + id);
    ["title","description","footer","color","imageUrl",
     "welcomeChannelId","rulesChannelId","chatChannelId","updatesChannelId"]
      .forEach(k => { if (c[k] !== undefined) $(k).value = c[k]; });
    $("enabled").checked = c.enabled !== false;
    preview();
    $("status").textContent = "Settings loaded";
  } catch(e) {
    $("status").textContent = "Could not load settings";
  }
}

async function start() {
  try {
    const me = await api("/api/me");
    $("user").textContent = me.username || "Signed in";
    $("login").textContent = "Connected";
    guilds = me.guilds || [];
    $("guild").innerHTML = guilds.map(g =>
      `<option value="${g.id}">${g.name}</option>`
    ).join("");
    if (guilds.length) {
      $("editor").classList.remove("hide");
      $("notice").classList.add("hide");
      await loadConfig();
    } else {
      $("notice").textContent = "No servers with Manage Server permission found.";
    }
  } catch(e) {
    $("notice").textContent = "Please login with Discord to use the dashboard.";
  }
}

$("login").onclick = () => location.href = "/auth/discord";
$("guild").onchange = loadConfig;

$("save").onclick = async () => {
  const id = $("guild").value;
  if (!id) return;
  const config = {};
  ["title","description","footer","color","imageUrl",
  "welcomeChannelId","rulesChannelId","chatChannelId","updatesChannelId"]
    .forEach(k => config[k] = $(k).value);
  config.enabled = $("enabled").checked;
  try {
    await api("/api/config/" + id, {
      method:"PUT",
      body:JSON.stringify(config)
    });
    $("status").textContent = "Saved successfully!";
  } catch(e) {
    $("status").textContent = "Save failed: " + e.message;
  }
};

preview();
start();
        
