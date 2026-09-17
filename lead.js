/* AutoBiz Academy — capture des demandes d'infos.
   Un seul fichier pilote les 3 pages. Pour changer l'adresse de réception,
   modifie UNIQUEMENT la ligne ENDPOINT ci-dessous. */
(function () {
  'use strict';

  /* ---- 1. COLLE ICI L'URL /exec DE TON APPS SCRIPT ---- */
  var ENDPOINT = '';
  /* ----------------------------------------------------- */

  var WA = '33756946616';

  function waFallback(d) {
    var t = "Salut Sabry, je veux des infos sur la formation AutoBiz Academy.\n"
      + "Prénom : " + (d.nom || '') + "\n"
      + "Téléphone : " + (d.tel || '') + "\n"
      + "Email : " + (d.email || '') + "\n"
      + "Ville : " + (d.ville || '') + "\n"
      + "Objectif : " + (d.objectif || '');
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t);
  }

  function send(d) {
    d.page = location.pathname || '/';
    if (!ENDPOINT) return Promise.reject(new Error('no-endpoint'));
    var body = new URLSearchParams();
    Object.keys(d).forEach(function (k) { body.append(k, d[k] == null ? '' : String(d[k])); });
    return fetch(ENDPOINT, { method: 'POST', body: body })
      .then(function (r) { return r.json().catch(function () { return { ok: true }; }); })
      .then(function (j) { if (j && j.ok === false) throw new Error(j.error || 'server'); return j; })
      .catch(function () {
        /* 2e tentative opaque : la donnée part quand même si le CORS bloque la lecture */
        return fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: body })
          .then(function () { return { ok: true, opaque: true }; });
      });
  }

  window.autobizSendLead = send;
  window.autobizWaFallback = waFallback;
  window.autobizHasEndpoint = function () { return !!ENDPOINT; };

  /* ---------- Modale partagée (landing-v2 + espace membre) ---------- */
  var CSS = ''
    + '.abz-ov{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);z-index:99999;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .25s}'
    + '.abz-ov.open{opacity:1;pointer-events:all}'
    + '.abz-md{background:#141312;border:0.5px solid rgba(201,168,76,.28);border-radius:6px;padding:30px 26px;'
    + 'width:100%;max-width:440px;max-height:92vh;overflow-y:auto;position:relative;transform:translateY(14px);transition:transform .25s;'
    + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f5f4f0;box-sizing:border-box}'
    + '.abz-ov.open .abz-md{transform:translateY(0)}'
    + '.abz-x{position:absolute;top:12px;right:14px;background:none;border:none;color:#8a877f;font-size:20px;cursor:pointer;line-height:1}'
    + '.abz-t{font-size:21px;font-weight:700;margin:0 0 4px}'
    + '.abz-s{font-size:13px;color:#8a877f;margin:0 0 20px}'
    + '.abz-g{margin-bottom:14px}'
    + '.abz-l{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a877f;margin-bottom:6px}'
    + '.abz-i,.abz-sel,.abz-ta{width:100%;background:#0d0c0b;border:0.5px solid rgba(255,255,255,.14);border-radius:3px;'
    + 'padding:12px 13px;color:#f5f4f0;font-size:15px;font-family:inherit;box-sizing:border-box;outline:none}'
    + '.abz-i:focus,.abz-sel:focus,.abz-ta:focus{border-color:#c9a84c}'
    + '.abz-ta{min-height:74px;resize:vertical}'
    + '.abz-b{width:100%;background:#c9a84c;color:#0d0c0b;border:none;border-radius:3px;padding:15px;font-size:15px;'
    + 'font-weight:600;cursor:pointer;margin-top:6px;font-family:inherit}'
    + '.abz-b:disabled{opacity:.55;cursor:wait}'
    + '.abz-err{color:#e2a0a0;font-size:13px;margin-top:10px;display:none}'
    + '.abz-ok{display:none;text-align:center;padding:14px 0}'
    + '.abz-ok .ic{font-size:44px;margin-bottom:12px}'
    + '.abz-ok .h{font-size:19px;font-weight:700;margin-bottom:6px}'
    + '.abz-ok .p{font-size:14px;color:#8a877f}'
    + '.abz-hp{position:absolute;left:-9999px;opacity:0;height:0;width:0}';

  var OBJECTIFS = [
    'Lancer mon business de recharge clim',
    'Un revenu complémentaire',
    'Ajouter le service à mon garage',
    'Je me renseigne pour plus tard',
    'Autre'
  ];

  var built = false, ov;

  function build() {
    if (built) return;
    built = true;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    ov = document.createElement('div');
    ov.className = 'abz-ov';
    ov.innerHTML = ''
      + '<div class="abz-md" role="dialog" aria-modal="true" aria-label="Demande d\'infos">'
      + '<button class="abz-x" type="button" aria-label="Fermer">&#10005;</button>'
      + '<div class="abz-form">'
      + '<div class="abz-t">Demander des infos</div>'
      + '<div class="abz-s">Réponse sous 24h · Sans engagement</div>'
      + '<div class="abz-g"><label class="abz-l" for="abz-nom">Ton prénom</label>'
      + '<input class="abz-i" id="abz-nom" type="text" autocomplete="given-name" placeholder="Prénom"></div>'
      + '<div class="abz-g"><label class="abz-l" for="abz-tel">Ton numéro WhatsApp</label>'
      + '<input class="abz-i" id="abz-tel" type="tel" autocomplete="tel" placeholder="+33 6 00 00 00 00"></div>'
      + '<div class="abz-g"><label class="abz-l" for="abz-email">Ton email</label>'
      + '<input class="abz-i" id="abz-email" type="email" autocomplete="email" placeholder="prenom@email.com"></div>'
      + '<div class="abz-g"><label class="abz-l" for="abz-ville">Ta ville</label>'
      + '<input class="abz-i" id="abz-ville" type="text" placeholder="Cergy, Paris, Lyon..."></div>'
      + '<div class="abz-g"><label class="abz-l" for="abz-obj">Ton objectif</label>'
      + '<select class="abz-sel" id="abz-obj"><option value="">Sélectionne</option>'
      + OBJECTIFS.map(function (o) { return '<option>' + o + '</option>'; }).join('')
      + '</select></div>'
      + '<input class="abz-hp" id="abz-website" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + '<button class="abz-b" type="button">Envoyer ma demande &rarr;</button>'
      + '<div class="abz-err"></div>'
      + '</div>'
      + '<div class="abz-ok"><div class="ic">&#9989;</div><div class="h">Demande envoyée !</div>'
      + '<div class="p">Sabry te recontacte sous 24h. Prépare tes questions.</div></div>'
      + '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('.abz-x').addEventListener('click', close);
    ov.querySelector('.abz-b').addEventListener('click', submit);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('open')) close();
    });
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function submit() {
    var err = ov.querySelector('.abz-err');
    var btn = ov.querySelector('.abz-b');
    err.style.display = 'none';

    if (val('abz-website')) { close(); return; } /* piège à bots */

    var d = {
      nom: val('abz-nom'), tel: val('abz-tel'), email: val('abz-email'),
      ville: val('abz-ville'), objectif: val('abz-obj'), source: 'modale'
    };
    if (!d.nom || !d.tel) {
      err.textContent = 'Merci de renseigner au minimum ton prénom et ton numéro.';
      err.style.display = 'block';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Envoi...';

    window.autobizSendLead(d).then(function () {
      ov.querySelector('.abz-form').style.display = 'none';
      ov.querySelector('.abz-ok').style.display = 'block';
      setTimeout(close, 4500);
    }).catch(function () {
      /* Rien n'est perdu : on bascule sur WhatsApp avec les infos pré-remplies */
      window.open(window.autobizWaFallback(d), '_blank', 'noopener');
      ov.querySelector('.abz-form').style.display = 'none';
      ov.querySelector('.abz-ok').style.display = 'block';
      setTimeout(close, 4500);
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Envoyer ma demande →';
    });
  }

  function open() {
    build();
    ov.querySelector('.abz-form').style.display = '';
    ov.querySelector('.abz-ok').style.display = 'none';
    ov.querySelector('.abz-err').style.display = 'none';
    ov.classList.add('open');
    setTimeout(function () { var n = document.getElementById('abz-nom'); if (n) n.focus(); }, 180);
  }
  function close() { if (ov) ov.classList.remove('open'); }

  window.autobizLead = open;
  window.autobizLeadClose = close;
})();
