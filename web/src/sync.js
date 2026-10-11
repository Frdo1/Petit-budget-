/* Carte de synchronisation entre deux téléphones (version hors ligne) */
(function(){
  var host = document.getElementById("v-prod");
  if (!host || !window.PBS_LOCAL) return;
  var card = document.createElement("div");
  card.className = "card";
  card.innerHTML =
    '<h2>Synchroniser avec l’autre téléphone</h2>' +
    '<p class="msg">Sans Internet, chaque téléphone garde ses propres données. Pour les mettre en commun : envoyez vos données à l’autre (WhatsApp, SMS…), puis il colle le message ci-dessous et touche « Fusionner ». Faites-le dans les deux sens.</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn solid" id="syOut">Envoyer nos données</button><span class="msg" id="syOutMsg"></span></div>' +
    '<div class="field"><label class="label" for="syIn">Message reçu de l’autre téléphone</label>' +
    '<textarea id="syIn" rows="3" placeholder="Collez ici le message qui commence par PBS1" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:500 .85rem var(--mono);resize:vertical"></textarea></div>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" class="btn" id="syGo">Fusionner</button><p class="msg" id="syMsg"></p></div>';
  var after = document.getElementById("budBox");
  if (after && after.nextSibling) host.insertBefore(card, after.nextSibling); else host.appendChild(card);

  document.getElementById("syOut").onclick = function () {
    var txt = window.PBS_LOCAL.exportText();
    var m = document.getElementById("syOutMsg");
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "share", text: txt }));
      m.textContent = "";
      return;
    }
    try {
      navigator.clipboard.writeText(txt).then(function () { m.textContent = "Copié. Collez-le dans un message."; }, function () { m.textContent = "Copie impossible sur cet appareil."; });
    } catch (e) { m.textContent = "Copie impossible sur cet appareil."; }
  };
  document.getElementById("syGo").onclick = function () {
    var box = document.getElementById("syIn"), msg = document.getElementById("syMsg");
    msg.classList.remove("err");
    try {
      var r = window.PBS_LOCAL.merge(box.value);
      box.value = "";
      msg.textContent = "Fusion faite : " + r.added + " élément" + (r.added > 1 ? "s" : "") + " ajouté" + (r.added > 1 ? "s" : "") + ", " + r.updated + " compteur" + (r.updated > 1 ? "s" : "") + " mis à jour.";
    } catch (e) {
      msg.classList.add("err");
      msg.textContent = "Ce message n’est pas reconnu. Copiez bien tout le texte qui commence par PBS1.";
    }
  };
})();
