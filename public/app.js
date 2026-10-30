
const $ = id => document.getElementById(id);

let guilds = [];

function preview() {
  $("pt").textContent = $("title").value || "Welcome to AYS+ARP";
  $("pd").textContent = $("description").value || "Thanks for joining our server!";
  $("pf").textContent = $("footer").value || "Welcome to the community!";

  $("embed").style.borderLeftColor = $("color").value;

  const imageUrl = $("imageUrl").value.trim();

  if (imageUrl) {
    $("pi").src = imageUrl;
    $("pi").classList.remove("hide");
  } else {
    $("pi").removeAttribute("src");
    $("pi").classList.add("hide");
  }
}

[
  "title",
  "description",
  "footer",
  "color",
  "imageUrl"
].forEach(id => {
  $(id).addEventListener("input", preview);
});

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

async function loadConfig() {
  const id = $("guild").value;
  if (!id) return;

  try {
    const c = await api("/api/config/" + encodeURIComponent(id));

    [
      "title",
      "description",
      "footer",
      "color",
      "imageUrl",
      "welcomeChannelId",
      "rulesChannelId",
      "chatChannelId",
      "updatesChannelId"
    ].forEach(key => {
      if (c[key] !== undefined) {
        $(key).value = c[key];
      }
    });

    $("enabled").checked = c.enabled !== false;

    preview();
    $("status").textContent = "Settings loaded";
  } catch (error) {
    $("status").textContent = "Could not load settings";
  }
}

async function start() {
  try {
    const me = await api("/api/me");

    $("user").textContent = me.username || "Signed in";
    $("login").textContent = "Connected";

    guilds = me.guilds || [];

    const select = $("guild");
    select.replaceChildren();

    guilds.forEach(guild => {
      const option = document.createElement("option");
      option.value = guild.id;
      option.textContent = guild.name;
      select.appendChild(option);
    });

    if (guilds.length > 0) {
      $("editor").classList.remove("hide");
      $("notice").classList.add("hide");
      await loadConfig();
    } else {
      $("notice").textContent =
        "No servers with Manage Server permission found.";
    }

  } catch (error) {
    $("notice").textContent =
      "Please login with Discord to use the dashboard.";
  }
}

$("login").addEventListener("click", () => {
  window.location.href = "/auth/discord";
});

$("guild").addEventListener("change", loadConfig);

$("save").addEventListener("click", async () => {
  const id = $("guild").value;
  if (!id) return;

  const config = {};

  [
    "title",
    "description",
    "footer",
    "color",
    "imageUrl",
    "welcomeChannelId",
    "rulesChannelId",
    "chatChannelId",
    "updatesChannelId"
  ].forEach(key => {
    config[key] = $(key).value;
  });

  config.enabled = $("enabled").checked;

  $("status").textContent = "Saving...";

  try {
    await api(
      "/api/config/" + encodeURIComponent(id),
      {
        method: "PUT",
        body: JSON.stringify(config)
      }
    );

    $("status").textContent = "Saved successfully!";

  } catch (error) {
    $("status").textContent = "Save failed";
  }
});

preview();
start();
