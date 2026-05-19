/**
 * Nemalá Finanças — Security & Tracking Module v3.0
 * Tracking via GTM — configure GA4 e Meta Pixel no container GTM-NSQ62LBV
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════
     1. CLICKJACKING PROTECTION
     ═══════════════════════════════════════════════ */
  if (window.self !== window.top) {
    document.documentElement.style.display = 'none';
    window.top.location = window.self.location;
  }

  /* ═══════════════════════════════════════════════
     2. INPUT SANITIZATION
     ═══════════════════════════════════════════════ */
  var NmlSec = {};

  NmlSec.escapeHTML = function (str) {
    if (typeof str !== 'string') return '';
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;', '`': '&#96;' };
    return str.replace(/[&<>"'\/`]/g, function (c) { return map[c]; });
  };

  NmlSec.stripTags = function (str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '');
  };

  NmlSec.sanitizeInput = function (str, maxLen) {
    if (typeof str !== 'string') return '';
    maxLen = maxLen || 500;
    return NmlSec.stripTags(str).trim().substring(0, maxLen);
  };

  NmlSec.isValidEmail = function (email) {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  };

  NmlSec.isValidPhone = function (phone) {
    if (typeof phone !== 'string') return false;
    var digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  NmlSec.encodeForURL = function (str) {
    return encodeURIComponent(NmlSec.sanitizeInput(str, 1000));
  };

  NmlSec.buildWhatsAppURL = function (phone, fields) {
    var parts = [];
    for (var key in fields) {
      if (fields.hasOwnProperty(key) && fields[key]) {
        parts.push(NmlSec.sanitizeInput(key) + ': ' + NmlSec.sanitizeInput(fields[key]));
      }
    }
    var msg = encodeURIComponent(parts.join('\n\n'));
    return 'https://wa.me/' + phone.replace(/\D/g, '') + '?text=' + msg;
  };

  /* ═══════════════════════════════════════════════
     3. ANTI-SPAM: HONEYPOT + RATE LIMITING
     ═══════════════════════════════════════════════ */
  var _submitTimestamps = {};

  NmlSec.addHoneypot = function (form) {
    if (!form || form.querySelector('.nml-hp-field')) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'nml-hp-field';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;';
    wrapper.innerHTML = '<label for="nml_website">Website</label><input type="text" name="nml_website" id="nml_website" tabindex="-1" autocomplete="off" value="">';
    form.appendChild(wrapper);
  };

  NmlSec.isBot = function (form) {
    var hp = form.querySelector('input[name="nml_website"]');
    return hp && hp.value.length > 0;
  };

  NmlSec.isRateLimited = function (formId, cooldownMs) {
    cooldownMs = cooldownMs || 10000;
    var now = Date.now();
    if (_submitTimestamps[formId] && (now - _submitTimestamps[formId]) < cooldownMs) return true;
    _submitTimestamps[formId] = now;
    return false;
  };

  NmlSec.validateForm = function (form, formId) {
    if (NmlSec.isBot(form)) return { valid: false, reason: 'bot' };
    if (NmlSec.isRateLimited(formId || form.id, 10000)) return { valid: false, reason: 'rate_limited' };
    var emailField = form.querySelector('input[type="email"]');
    if (emailField && !NmlSec.isValidEmail(emailField.value)) return { valid: false, reason: 'invalid_email' };
    var phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value && !NmlSec.isValidPhone(phoneField.value)) return { valid: false, reason: 'invalid_phone' };
    return { valid: true, reason: '' };
  };


  /* ═══════════════════════════════════════════════
     4. COOKIE CONSENT MANAGER (GTM via dataLayer)
     ═══════════════════════════════════════════════ */
  var CONSENT_KEY = 'nml_cookie_consent';

  NmlSec.getConsent = function () {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  };

  NmlSec.setConsent = function (value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { }
  };

  NmlSec.hasConsent = function () {
    return NmlSec.getConsent() !== 'reject';
  };

  /**
   * Sinaliza ao GTM que o consentimento foi dado.
   * GTM libera GA4 e Meta Pixel automaticamente (Consent Mode v2).
   */
  NmlSec.grantConsent = function () {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
    // Avisa GTM para disparar PageView retroativo e ativar auto-tracking
    window.dataLayer.push({ event: 'nml_consent_granted' });
    NmlSec.initAutoTracking();
  };

  NmlSec.initConsentBanner = function () {
    var consent = NmlSec.getConsent();

    if (consent === 'accept') {
      NmlSec.grantConsent();
      return;
    }

    if (consent === 'reject') return;

    // Mostra banner após 1.5s
    setTimeout(function () {
      var banner = document.getElementById('cookie-banner');
      if (banner) banner.style.display = 'block';
    }, 1500);

    var acceptBtn = document.getElementById('cookie-accept');
    var rejectBtn = document.getElementById('cookie-reject');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        NmlSec.setConsent('accept');
        NmlSec.grantConsent();
        var banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'none';
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        NmlSec.setConsent('reject');
        var banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'none';
      });
    }
  };

  /* ═══════════════════════════════════════════════
     5. TRACKING EVENTS — funil completo (via GTM)
     ═══════════════════════════════════════════════ */

  /**
   * Dispara evento no GTM via dataLayer.
   * GA4 e Meta Pixel são ativados pelos Tags configurados no GTM.
   *
   * Formatos aceitos:
   *   NmlSec.track('Lead', { canal: 'hero_cta' })
   *   NmlSec.track('fbq', 'Lead', { canal: 'hero_cta' })  ← retrocompatível
   *   NmlSec.track('ga4', 'cta_click', { position: 'hero' }) ← retrocompatível
   */
  NmlSec.track = function (platformOrEvent, eventNameOrParams, extraParams) {
    var eventName, eventParams;

    // Suporte ao formato legado NmlSec.track('fbq'/'ga4', 'EventName', {...})
    if (platformOrEvent === 'fbq' || platformOrEvent === 'ga4') {
      eventName = eventNameOrParams;
      eventParams = extraParams || {};
    } else {
      eventName = platformOrEvent;
      eventParams = (typeof eventNameOrParams === 'object') ? eventNameOrParams : {};
    }

    if (!NmlSec.hasConsent() || !eventName) return;

    window.dataLayer = window.dataLayer || [];
    var pushObj = { event: 'nml_' + eventName, nml_event_name: eventName };
    for (var k in eventParams) {
      if (Object.prototype.hasOwnProperty.call(eventParams, k)) {
        pushObj[k] = eventParams[k];
      }
    }
    window.dataLayer.push(pushObj);
  };

  /**
   * Tracking automático de cliques via atributo data-track.
   * Uso: <a data-track="Lead" data-track-canal="hero_cta" href="...">
   * Inicializado apenas após consentimento.
   */
  NmlSec.initAutoTracking = function () {
    if (window._nmlAutoTrackingInit) return;
    window._nmlAutoTrackingInit = true;
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-track]');
      if (!el) return;
      var eventName = el.getAttribute('data-track');
      var params = {};
      Array.prototype.forEach.call(el.attributes, function (attr) {
        if (attr.name.indexOf('data-track-') === 0) {
          var key = attr.name.replace('data-track-', '').replace(/-/g, '_');
          params[key] = attr.value;
        }
      });

      // Se for link externo na mesma aba, segura navegação 350ms
      // para o GTM ter tempo de processar o evento antes da página descarregar
      var href = el.tagName === 'A' ? el.href : null;
      var isExternal = href && el.hostname && el.hostname !== window.location.hostname;
      var isNewTab = el.target === '_blank';

      if (isExternal && !isNewTab) {
        e.preventDefault();
        NmlSec.track(eventName, params);
        setTimeout(function () { window.location.href = href; }, 350);
      } else {
        NmlSec.track(eventName, params);
      }
    }, { passive: false });
  };

  /* ═══════════════════════════════════════════════
     6. SAFE LINK HANDLING
     ═══════════════════════════════════════════════ */
  NmlSec.hardenExternalLinks = function () {
    var links = document.querySelectorAll('a[target="_blank"]');
    for (var i = 0; i < links.length; i++) {
      var rel = (links[i].getAttribute('rel') || '').toLowerCase();
      var parts = rel.split(/\s+/).filter(function (p) { return p; });
      if (parts.indexOf('noopener') === -1) parts.push('noopener');
      if (parts.indexOf('noreferrer') === -1) parts.push('noreferrer');
      links[i].setAttribute('rel', parts.join(' '));
    }
  };

  /* ═══════════════════════════════════════════════
     7. UI COMPONENTS
     ═══════════════════════════════════════════════ */
  NmlSec.initHamburger = function () {
    var btn = document.getElementById('ham-btn');
    var mobNav = document.getElementById('mob-nav');
    if (!btn || !mobNav) return;
    btn.addEventListener('click', function () {
      var isOpen = btn.classList.toggle('open');
      mobNav.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Fecha ao clicar fora
    document.addEventListener('click', function (e) {
      if (!btn.contains(e.target) && !mobNav.contains(e.target)) {
        btn.classList.remove('open');
        mobNav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    }, { passive: true });
  };

  NmlSec.initFAQ = function () {
    var buttons = document.querySelectorAll('.faq-q');
    buttons.forEach(function (btn) {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        if (!item) return;
        var isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(function (el) {
          el.classList.remove('open');
          var b = el.querySelector('.faq-q');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  };

  NmlSec.initNavScroll = function () {
    var nav = document.getElementById('nb');
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 8) nav.classList.add('sc');
      else nav.classList.remove('sc');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  NmlSec.initReveal = function () {
    document.body.classList.add('js-rv');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -50px 0px', threshold: 0.06 });
      // Suporta rv, rv-l, rv-r, rv-sc
      document.querySelectorAll('.rv, .rv-l, .rv-r, .rv-sc').forEach(function (el) {
        io.observe(el);
      });
    } else {
      document.querySelectorAll('.rv, .rv-l, .rv-r, .rv-sc').forEach(function (el) {
        el.classList.add('on');
      });
    }
  };

  NmlSec.initWAFab = function () {
    var fabBtn = document.getElementById('wa-fab-btn');
    var waMenu = document.getElementById('wa-menu');
    if (!fabBtn || !waMenu) return;
    fabBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = !waMenu.classList.contains('open');
      waMenu.classList.toggle('open');
      if (opening) NmlSec.track('ViewContent', { canal: 'fab_open' });
    });
    document.addEventListener('click', function (e) {
      if (!waMenu.contains(e.target) && !fabBtn.contains(e.target)) {
        waMenu.classList.remove('open');
      }
    });
  };

  /* ═══════════════════════════════════════════════
     8. FEAT PREVIEW — home interativa
     ═══════════════════════════════════════════════ */
  NmlSec.initFeatPreview = function () {
    var rows = document.querySelectorAll('.feat-row');
    var preview = document.getElementById('feat-preview');
    var titleEl = document.getElementById('feat-tit');
    if (!rows.length || !preview) return;

    var previews = {
      dash: {
        title: 'Dashboard — Visão geral',
        html: '<div style="padding:20px;font-family:sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
          '<div style="background:#f6ffed;border:1px solid #b7eb8f;border-radius:10px;padding:14px"><div style="font-size:11px;color:#555;margin-bottom:4px">Receita do mês</div><div style="font-size:22px;font-weight:800;color:#1a1a1a">R$ 47.850</div><div style="font-size:11px;color:#52c41a">↑ 12,3% vs mês ant.</div></div>' +
          '<div style="background:#fff2e8;border:1px solid #ffbb96;border-radius:10px;padding:14px"><div style="font-size:11px;color:#555;margin-bottom:4px">Despesas</div><div style="font-size:22px;font-weight:800;color:#1a1a1a">R$ 31.200</div><div style="font-size:11px;color:#fa8c16">↓ 4,1% vs mês ant.</div></div>' +
          '<div style="background:#f6ffed;border:1px solid #b7eb8f;border-radius:10px;padding:14px"><div style="font-size:11px;color:#555;margin-bottom:4px">Lucro líquido</div><div style="font-size:22px;font-weight:800;color:#0ea671">R$ 16.650</div><div style="font-size:11px;color:#52c41a">↑ 8,7%</div></div>' +
          '<div style="background:#e6f7ff;border:1px solid #91d5ff;border-radius:10px;padding:14px"><div style="font-size:11px;color:#555;margin-bottom:4px">Total em caixa</div><div style="font-size:22px;font-weight:800;color:#1890ff">R$ 89.340</div><div style="font-size:11px;color:#1890ff">↑ 3,2%</div></div>' +
          '</div><div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:#1a1a1a;margin-bottom:10px">Entradas × Saídas — 2025</div>' +
          '<svg viewBox="0 0 400 80" style="width:100%;height:60px"><polyline fill="none" stroke="#52c41a" stroke-width="2" points="0,55 50,44 100,47 150,31 200,35 250,23 300,16 350,10 400,14"/><polyline fill="none" stroke="#ff4d4f" stroke-width="2" stroke-dasharray="4,2" points="0,60 50,55 100,50 150,46 200,44 250,41 300,39 350,36 400,31"/></svg>' +
          '<div style="display:flex;justify-content:space-between;font-size:9px;color:#999;margin-top:4px"><span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Set</span></div>' +
          '</div></div>'
      },
      cal: {
        title: 'Calendário financeiro',
        html: '<div style="padding:20px;font-family:sans-serif"><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px">' +
          '<div style="text-align:center;font-size:10px;color:#999;padding:4px">Dom</div><div style="text-align:center;font-size:10px;color:#999;padding:4px">Seg</div><div style="text-align:center;font-size:10px;color:#999;padding:4px">Ter</div><div style="text-align:center;font-size:10px;color:#999;padding:4px">Qua</div><div style="text-align:center;font-size:10px;color:#999;padding:4px">Qui</div><div style="text-align:center;font-size:10px;color:#999;padding:4px">Sex</div><div style="text-align:center;font-size:10px;color:#999;padding:4px">Sáb</div>' +
          '<div style="text-align:center;font-size:11px;padding:6px;border-radius:6px;color:#ccc">29</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px;color:#ccc">30</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">1</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">2</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">3</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">4</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">5</div>' +
          '<div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">6</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">7</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">8</div><div style="text-align:center;font-size:11px;padding:6px;background:#fff2e8;border:1px solid #ffbb96">9<div style="font-size:8px;color:#fa541c;margin-top:1px">Aluguel</div></div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">10</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">11</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">12</div>' +
          '<div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">13</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">14</div><div style="text-align:center;font-size:11px;padding:6px;background:#f6ffed;border:1px solid #b7eb8f">15<div style="font-size:8px;color:#52c41a;margin-top:1px">Receber</div></div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">16</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">17</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px;background:#e6f0ff;font-weight:700">18</div><div style="text-align:center;font-size:11px;padding:6px;border-radius:6px">19</div>' +
          '</div><div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px"><div style="font-size:11px;font-weight:700;margin-bottom:8px">Próximos vencimentos</div><div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:12px"><span>Fornecedor XYZ</span><span style="color:#fa541c;font-weight:600">-R$2.400 · dia 09</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:12px"><span>Cliente ABC</span><span style="color:#52c41a;font-weight:600">+R$8.000 · dia 15</span></div></div></div>'
      },
      ind: {
        title: 'Indicadores e análises',
        html: '<div style="padding:20px;font-family:sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">' +
          '<div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:12px;text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Margem bruta</div><div style="font-size:20px;font-weight:800;color:#52c41a">38,2%</div><div style="font-size:10px;color:#52c41a">↑ 2,1pp</div></div>' +
          '<div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:12px;text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">EBITDA</div><div style="font-size:20px;font-weight:800;color:#1a1a1a">R$14k</div><div style="font-size:10px;color:#52c41a">↑ 8,7%</div></div>' +
          '<div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:12px;text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Ponto equil.</div><div style="font-size:20px;font-weight:800;color:#fa8c16">R$28k</div><div style="font-size:10px;color:#888">receita mín.</div></div>' +
          '</div><div style="background:#1a1a1a;border-radius:10px;padding:14px"><div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:8px">💡 Análise da IA</div><div style="font-size:12px;color:rgba(255,255,255,.85);line-height:1.6">Sua margem bruta subiu <strong style="color:#fbb11e">2,1 pontos percentuais</strong> em relação ao mês anterior. O principal fator foi a redução de 8% nos custos variáveis da categoria Insumos. Mantenha a meta de 40% para o próximo trimestre.</div></div></div>'
      },
      dre: {
        title: 'DRE Gerencial',
        html: '<div style="padding:20px;font-family:sans-serif"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#fafafa"><th style="text-align:left;padding:8px;border-bottom:2px solid #eee;font-weight:700">Descrição</th><th style="text-align:right;padding:8px;border-bottom:2px solid #eee;font-weight:700">Mai/25</th><th style="text-align:right;padding:8px;border-bottom:2px solid #eee;font-weight:700">Δ%</th></tr></thead><tbody>' +
          '<tr style="background:#f6ffed"><td style="padding:8px;font-weight:700;border-bottom:1px solid #f0f0f0">Receita Bruta</td><td style="text-align:right;padding:8px;font-weight:700;color:#52c41a;border-bottom:1px solid #f0f0f0">R$ 47.850</td><td style="text-align:right;padding:8px;color:#52c41a;border-bottom:1px solid #f0f0f0">↑12,3%</td></tr>' +
          '<tr><td style="padding:8px;color:#666;border-bottom:1px solid #f0f0f0;padding-left:16px">(-) Deduções</td><td style="text-align:right;padding:8px;color:#666;border-bottom:1px solid #f0f0f0">R$ 3.800</td><td style="text-align:right;padding:8px;color:#666;border-bottom:1px solid #f0f0f0">—</td></tr>' +
          '<tr style="background:#fafafa"><td style="padding:8px;font-weight:600;border-bottom:1px solid #eee">Receita Líquida</td><td style="text-align:right;padding:8px;font-weight:600;border-bottom:1px solid #eee">R$ 44.050</td><td style="text-align:right;padding:8px;color:#52c41a;border-bottom:1px solid #eee">↑10,1%</td></tr>' +
          '<tr><td style="padding:8px;color:#666;border-bottom:1px solid #f0f0f0;padding-left:16px">(-) CMV / CPV</td><td style="text-align:right;padding:8px;color:#666;border-bottom:1px solid #f0f0f0">R$ 27.200</td><td style="text-align:right;padding:8px;color:#fa8c16;border-bottom:1px solid #f0f0f0">↑3,2%</td></tr>' +
          '<tr style="background:#f6ffed"><td style="padding:8px;font-weight:700;border-bottom:1px solid #eee">Lucro Bruto</td><td style="text-align:right;padding:8px;font-weight:700;color:#52c41a;border-bottom:1px solid #eee">R$ 16.850</td><td style="text-align:right;padding:8px;color:#52c41a;border-bottom:1px solid #eee">↑22,4%</td></tr>' +
          '<tr style="background:#fff2e8"><td style="padding:8px;font-weight:700">Lucro Líquido</td><td style="text-align:right;padding:8px;font-weight:700;color:#fa8c16">R$ 16.650</td><td style="text-align:right;padding:8px;color:#52c41a">↑8,7%</td></tr>' +
          '</tbody></table></div>'
      },
      nf: {
        title: 'Emissão de NF',
        html: '<div style="padding:20px;font-family:sans-serif"><div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:16px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:12px">Nova Nota Fiscal de Serviço</div><div style="display:grid;gap:8px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><div style="font-size:10px;color:#888;margin-bottom:3px">Tomador</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px">Empresa ABC Ltda</div></div><div><div style="font-size:10px;color:#888;margin-bottom:3px">CNPJ</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px">12.345.678/0001-99</div></div></div><div><div style="font-size:10px;color:#888;margin-bottom:3px">Descrição do serviço</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px">Consultoria financeira — Maio/2025</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><div style="font-size:10px;color:#888;margin-bottom:3px">Valor (R$)</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px;font-weight:700">8.000,00</div></div><div><div style="font-size:10px;color:#888;margin-bottom:3px">ISS</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px">2%</div></div></div></div></div><div style="display:flex;align-items:center;justify-content:center;gap:8px;background:#fbb11e;border-radius:8px;padding:10px;font-size:13px;font-weight:700;color:#1a1a1a">Emitir NF — R$ 8.000,00</div></div>'
      },
      prec: {
        title: 'Precificação inteligente',
        html: '<div style="padding:20px;font-family:sans-serif"><div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:16px"><div style="font-size:13px;font-weight:700;margin-bottom:14px">Calculadora de preço ideal</div><div style="display:grid;gap:10px;margin-bottom:14px"><div><div style="font-size:10px;color:#888;margin-bottom:3px">Custo direto do produto/serviço</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px">R$ 180,00</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><div style="font-size:10px;color:#888;margin-bottom:3px">Despesas fixas (%)</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px">22%</div></div><div><div style="font-size:10px;color:#888;margin-bottom:3px">Margem desejada (%)</div><div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px;font-size:12px;color:#fbb11e;font-weight:700">35%</div></div></div></div><div style="background:#1a1a1a;border-radius:10px;padding:14px;text-align:center"><div style="font-size:10px;color:rgba(255,255,255,.5);margin-bottom:6px">Preço mínimo calculado</div><div style="font-size:28px;font-weight:800;color:#fbb11e">R$ 327,00</div><div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:4px">Margem real: 35% · Ponto de equilíbrio: 14 un/mês</div></div></div></div>'
      },
      orc: {
        title: 'Planejamento Orçamentário',
        html: '<div style="padding:20px;font-family:sans-serif"><div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#1a1a1a">Orçado × Realizado — Maio 2025</div><div style="display:flex;flex-direction:column;gap:10px"><div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="font-weight:600">Receita</span><span style="color:#52c41a">R$47.850 / R$45.000</span></div><div style="background:#eee;border-radius:4px;height:8px"><div style="background:#52c41a;height:8px;border-radius:4px;width:106%"></div></div><div style="font-size:10px;color:#52c41a;margin-top:2px">↑ 6,3% acima da meta</div></div><div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="font-weight:600">Despesas operacionais</span><span style="color:#fa8c16">R$27.200 / R$25.000</span></div><div style="background:#eee;border-radius:4px;height:8px"><div style="background:#fa8c16;height:8px;border-radius:4px;width:109%"></div></div><div style="font-size:10px;color:#fa8c16;margin-top:2px">↑ 8,8% acima do orçado</div></div><div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="font-weight:600">Marketing</span><span style="color:#52c41a">R$3.800 / R$4.500</span></div><div style="background:#eee;border-radius:4px;height:8px"><div style="background:#52c41a;height:8px;border-radius:4px;width:84%"></div></div><div style="font-size:10px;color:#52c41a;margin-top:2px">↓ 15,5% abaixo — economizou R$700</div></div><div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="font-weight:600">RH / Folha</span><span style="color:#888">R$18.000 / R$18.000</span></div><div style="background:#eee;border-radius:4px;height:8px"><div style="background:#1890ff;height:8px;border-radius:4px;width:100%"></div></div><div style="font-size:10px;color:#888;margin-top:2px">Dentro do orçado</div></div></div></div>'
      }
    };

    function setPreview(featKey) {
      var data = previews[featKey];
      if (!data) return;
      if (titleEl) titleEl.textContent = data.title;
      preview.innerHTML = data.html;
    }

    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        rows.forEach(function (r) { r.classList.remove('on'); });
        row.classList.add('on');
        setPreview(row.getAttribute('data-feat'));
      });
    });

    // Inicializa com o primeiro
    var firstOn = document.querySelector('.feat-row.on');
    if (firstOn) setPreview(firstOn.getAttribute('data-feat'));
  };

  /* ═══════════════════════════════════════════════
     8. PLANS TOGGLE (toggle mensal/anual)
     ═══════════════════════════════════════════════ */
  NmlSec.initPlanToggle = function () {
    var toggles = document.querySelectorAll('.tog');
    var prices = document.querySelectorAll('.pv');
    var labels = document.querySelectorAll('.ppr');
    if (!toggles.length) return;
    toggles.forEach(function (tog) {
      tog.addEventListener('click', function () {
        toggles.forEach(function (t) { t.classList.remove('on'); });
        tog.classList.add('on');
        var cycle = tog.getAttribute('data-cycle');
        prices.forEach(function (pv) {
          pv.textContent = cycle === 'a' ? pv.getAttribute('data-a') : pv.getAttribute('data-m');
        });
        labels.forEach(function (lbl) {
          lbl.textContent = cycle === 'a' ? '/mês · cobrado anualmente' : '/mês · cobrado mensalmente';
        });
      });
    });
  };

  /* ═══════════════════════════════════════════════
     9. INITIALIZATION
     ═══════════════════════════════════════════════ */
  NmlSec.init = function (options) {
    NmlSec.hardenExternalLinks();
    NmlSec.initHamburger();
    NmlSec.initFAQ();
    NmlSec.initNavScroll();
    NmlSec.initReveal();
    NmlSec.initWAFab();
    NmlSec.initFeatPreview();
    NmlSec.initPlanToggle();
    document.querySelectorAll('form').forEach(function (form) { NmlSec.addHoneypot(form); });
    NmlSec.initConsentBanner();
  };

  window.NmlSec = NmlSec;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { NmlSec.init(); });
  } else {
    NmlSec.init();
  }
})();
