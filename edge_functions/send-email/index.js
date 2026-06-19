const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "vmi2335626.contaboserver.net";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER || "noreply@wimrux.app";
const SMTP_PASS = process.env.SMTP_PASS || "";

const LOGO_URL = "https://www.wimrux.app/icons/favicon-192x192.png";
const BRAND_COLOR = "#0F172A";
const ACCENT_COLOR = "#1976d2";

function buildHtmlEmail(opts) {
  const { title, preheader = "", bodyHtml, footerExtra = "" } = opts;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:${BRAND_COLOR}; padding:32px 40px; text-align:center; }
    .header img { height:56px; width:auto; }
    .header-title { color:#ffffff; font-size:20px; font-weight:700; margin:16px 0 0; letter-spacing:0.5px; }
    .header-subtitle { color:#94a3b8; font-size:13px; margin:4px 0 0; }
    .body { padding:40px 40px 32px; color:#1e293b; font-size:15px; line-height:1.7; }
    .body h1 { font-size:22px; font-weight:700; color:${BRAND_COLOR}; margin:0 0 16px; }
    .body p { margin:0 0 16px; }
    .btn { display:inline-block; background:${ACCENT_COLOR}; color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:600; margin:8px 0 24px; }
    .code-box { background:#f1f5f9; border:2px solid ${ACCENT_COLOR}; border-radius:10px; padding:20px; text-align:center; font-size:36px; font-weight:800; letter-spacing:10px; color:${BRAND_COLOR}; margin:16px 0 24px; }
    .divider { border:none; border-top:1px solid #e2e8f0; margin:24px 0; }
    .alert { background:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; font-size:13px; color:#92400e; margin-bottom:16px; }
    .footer { background:#f8fafc; padding:24px 40px; border-top:1px solid #e2e8f0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.8; }
    .footer a { color:${ACCENT_COLOR}; text-decoration:none; }
    .footer-logo { margin-bottom:12px; }
    .footer-logo img { height:28px; opacity:0.7; }
    @media (max-width:600px) {
      .body { padding:28px 20px 24px; }
      .footer { padding:20px; }
      .header { padding:24px 20px; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#f4f6f9;font-size:1px;">${preheader}</div>` : ""}
  <div class="wrapper">
    <div class="header">
      <img src="${LOGO_URL}" alt="WIMRUX Finance" />
      <div class="header-title">WIMRUX<sup>®</sup> Finance</div>
      <div class="header-subtitle">Gestion financière &amp; Facturation — Burkina Faso</div>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <div class="footer-logo">
        <img src="${LOGO_URL}" alt="W" />
      </div>
      ${footerExtra}
      <p>
        <strong>WIMRUX<sup>®</sup> Finance</strong> — Développé par ILTIC<br />
        Ouagadougou, Burkina Faso &nbsp;|&nbsp;
        <a href="mailto:contact@wimrux.bf">contact@wimrux.bf</a>
      </p>
      <p>
        <a href="https://www.wimrux.app/legal/privacy">Confidentialité</a> &nbsp;·&nbsp;
        <a href="https://www.wimrux.app/legal/terms">CGU</a> &nbsp;·&nbsp;
        <a href="https://www.wimrux.app">www.wimrux.app</a>
      </p>
      <p style="margin-top:8px;font-size:11px;color:#cbd5e1;">
        © ${year} WIMRUX® Finance. Tous droits réservés.<br />
        Cet email a été envoyé automatiquement, merci de ne pas y répondre.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function getTemplate(name, vars) {
  switch (name) {
    case "otp": {
      return {
        subject: "Votre code de vérification WIMRUX® Finance",
        preheader: `Votre code : ${vars.code}`,
        bodyHtml: `
          <h1>Vérification en deux étapes</h1>
          <p>Bonjour <strong>${vars.name ?? "utilisateur"}</strong>,</p>
          <p>Voici votre code de vérification pour accéder à WIMRUX® Finance :</p>
          <div class="code-box">${vars.code}</div>
          <div class="alert">⏱ Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</div>
          <p>Si vous n'avez pas tenté de vous connecter, ignorez cet email ou contactez-nous immédiatement.</p>`,
      };
    }
    case "welcome": {
      return {
        subject: "Bienvenue sur WIMRUX® Finance — votre compte est prêt",
        preheader: "Votre gestion financière commence maintenant.",
        bodyHtml: `
          <h1>Bienvenue, ${vars.name ?? "cher utilisateur"} !</h1>
          <p>Votre compte <strong>WIMRUX® Finance</strong> a été créé avec succès.</p>
          <p>Vous pouvez dès maintenant accéder à votre plateforme de gestion financière :</p>
          <a href="https://www.wimrux.app/auth/login" class="btn">Accéder à mon compte →</a>
          <hr class="divider" />
          <p><strong>Ce que vous pouvez faire dès maintenant :</strong></p>
          <ul>
            <li>Créer votre première facture en moins de 2 minutes</li>
            <li>Configurer vos comptes bancaires et mobile money</li>
            <li>Inviter votre équipe</li>
            <li>Paramétrer votre profil fiscal (TVA, PSVB…)</li>
          </ul>
          <p>Notre équipe est disponible pour vous accompagner. N'hésitez pas à nous contacter.</p>`,
      };
    }
    case "reset_password": {
      return {
        subject: "Réinitialisation de votre mot de passe WIMRUX® Finance",
        preheader: "Cliquez pour choisir un nouveau mot de passe.",
        bodyHtml: `
          <h1>Réinitialisation du mot de passe</h1>
          <p>Bonjour ${vars.name ?? ""},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <a href="${vars.reset_url}" class="btn">Choisir un nouveau mot de passe →</a>
          <div class="alert">⏱ Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas effectué cette demande, ignorez cet email — votre compte reste sécurisé.</div>`,
      };
    }
    case "reminder": {
      return {
        subject: vars.subject ?? `Rappel de paiement — ${vars.invoice_ref}`,
        preheader: `Facture ${vars.invoice_ref} en attente de règlement.`,
        bodyHtml: `
          <h1>Rappel de paiement</h1>
          <p>Bonjour <strong>${vars.client_name}</strong>,</p>
          <p>Nous vous contactons concernant la facture suivante qui reste à régler :</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Référence</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.invoice_ref}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Montant dû</td>
              <td style="padding:10px 14px;font-weight:700;color:#dc2626;">${vars.amount} ${vars.currency ?? "FCFA"}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Échéance</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.due_date}</td>
            </tr>
          </table>
          <p>${vars.custom_message ?? "Nous vous remercions de procéder au règlement dans les meilleurs délais."}</p>
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>`,
      };
    }
    case "invoice_sent": {
      return {
        subject: vars.subject ?? `Votre facture ${vars.invoice_ref} — ${vars.company_name}`,
        preheader: `Facture ${vars.invoice_ref} de ${vars.company_name}.`,
        bodyHtml: `
          <h1>Votre facture</h1>
          <p>Bonjour <strong>${vars.client_name}</strong>,</p>
          <p>Veuillez trouver ci-joint votre facture <strong>${vars.invoice_ref}</strong> émise par <strong>${vars.company_name}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Référence</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.invoice_ref}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Montant total</td>
              <td style="padding:10px 14px;font-weight:700;">${vars.amount} ${vars.currency ?? "FCFA"}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Date d'échéance</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.due_date ?? "À réception"}</td>
            </tr>
          </table>
          ${vars.custom_message ? `<p>${vars.custom_message}</p>` : ""}
          <p>Merci de votre confiance.</p>`,
      };
    }
    case "payment_confirmed": {
      return {
        subject: vars.subject ?? `Paiement reçu — ${vars.invoice_ref}`,
        preheader: `Paiement de ${vars.amount} ${vars.currency ?? "FCFA"} bien reçu.`,
        bodyHtml: `
          <h1>Paiement confirmé ✓</h1>
          <p>Bonjour <strong>${vars.client_name ?? ""}</strong>,</p>
          <p>Nous avons bien reçu votre règlement concernant la facture suivante :</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Référence</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.invoice_ref}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Montant réglé</td>
              <td style="padding:10px 14px;font-weight:700;color:#16a34a;">${vars.amount} ${vars.currency ?? "FCFA"}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Date</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.payment_date ?? new Date().toLocaleDateString("fr-FR")}</td>
            </tr>
            ${vars.payment_method ? `<tr><td style="padding:10px 14px;font-weight:600;">Mode de paiement</td><td style="padding:10px 14px;">${vars.payment_method}</td></tr>` : ""}
          </table>
          <p>Merci pour votre règlement. Vous pouvez conserver cet email comme accusé de réception.</p>`,
      };
    }
    case "support_ticket": {
      return {
        subject: `Ticket #${vars.ticket_ref} créé — WIMRUX® Finance Support`,
        preheader: `Votre demande a bien été enregistrée.`,
        bodyHtml: `
          <h1>Votre demande a été enregistrée</h1>
          <p>Bonjour <strong>${vars.name ?? ""}</strong>,</p>
          <p>Votre ticket de support a été créé avec succès. Notre équipe vous répondra dans les plus brefs délais.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Numéro de ticket</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;font-weight:700;">#${vars.ticket_ref}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Sujet</td>
              <td style="padding:10px 14px;">${vars.subject ?? ""}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Priorité</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.priority ?? "Normale"}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Catégorie</td>
              <td style="padding:10px 14px;">${vars.category ?? ""}</td>
            </tr>
          </table>
          <div class="alert">Notre équipe traite les tickets dans un délai de <strong>24 à 48 heures ouvrées</strong>.</div>
          <p>Vous serez notifié par email dès qu'une réponse sera disponible.</p>`,
      };
    }
    case "budget_alert": {
      return {
        subject: `⚠️ Alerte budget — ${vars.budget_name}`,
        preheader: `Le budget "${vars.budget_name}" a atteint ${vars.percent}% de consommation.`,
        bodyHtml: `
          <h1>Alerte de dépassement budgétaire</h1>
          <p>Bonjour <strong>${vars.name ?? ""}</strong>,</p>
          <p>Le budget suivant a atteint un seuil d'alerte :</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Budget</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;font-weight:700;">${vars.budget_name}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Montant alloué</td>
              <td style="padding:10px 14px;">${vars.allocated} ${vars.currency ?? "FCFA"}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Montant consommé</td>
              <td style="padding:10px 14px;border-radius:0 6px 6px 0;font-weight:700;color:#dc2626;">${vars.consumed} ${vars.currency ?? "FCFA"}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;">Consommation</td>
              <td style="padding:10px 14px;font-weight:700;color:#dc2626;">${vars.percent}%</td>
            </tr>
            ${vars.period ? `<tr style="background:#f1f5f9;"><td style="padding:10px 14px;font-weight:600;border-radius:6px 0 0 6px;">Période</td><td style="padding:10px 14px;border-radius:0 6px 6px 0;">${vars.period}</td></tr>` : ""}
          </table>
          <div class="alert">⚠️ Veuillez revoir vos dépenses ou ajuster le budget pour éviter un dépassement.</div>
          <a href="https://www.wimrux.app/app/budgets" class="btn">Voir mes budgets →</a>`,
      };
    }
    default: {
      return {
        subject: vars.subject ?? "Message de WIMRUX® Finance",
        bodyHtml: vars.html_body ?? "<p>Bonjour,</p><p>Vous avez reçu un message de WIMRUX® Finance.</p>",
      };
    }
  }
}

module.exports = async function (context) {
  const { req, res, log, error } = context;

  if (req.method === "OPTIONS") {
    return res.send("", 204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
  }

  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed" }, 405);
  }

  let body = {};
  try {
    log("DEBUG body type: " + typeof req.body);
    log("DEBUG body: " + String(req.body).slice(0, 500));
    const rawStr = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const raw = JSON.parse(rawStr);
    if (raw.data && typeof raw.data === "string") {
      body = JSON.parse(raw.data);
    } else {
      body = raw;
    }
    log("DEBUG parsed to: " + (body.to || "undefined"));
  } catch (e) {
    log("DEBUG parse error: " + (e.message || String(e)));
    return res.json({ error: "Invalid JSON", detail: String(e) }, 400);
  }

  const to = body.to;
  const templateName = body.template ?? "custom";
  const vars = body.vars ?? {};
  const customSubject = body.subject;
  const customHtmlBody = body.html_body;

  if (!to) {
    return res.json({ error: "Missing 'to' field" }, 400);
  }

  const tpl = getTemplate(templateName, { ...vars, ...(customSubject ? { subject: customSubject } : {}), ...(customHtmlBody ? { html_body: customHtmlBody } : {}) });
  const subject = customSubject ?? tpl.subject;
  const finalHtml = buildHtmlEmail({
    title: subject,
    preheader: tpl.preheader,
    bodyHtml: tpl.bodyHtml,
  });

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"WIMRUX® Finance" <${SMTP_USER}>`,
      to,
      subject,
      html: finalHtml,
    });

    return res.json({ success: true, to, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error("SMTP error: " + message);
    return res.json({ error: "SMTP send failed", detail: message }, 500);
  }
};
