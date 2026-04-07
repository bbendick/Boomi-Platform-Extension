$(document).ready(function () {
  /*Start of Sheet*/
  //This is the core sheet that is to be used to call functions required for this extension; listeners, functions etc are on others

  //Show \ Hide Header button clicked, enable or disable the header dependent on flow
  $(document).on("click", "#showHeaderbtn", function () {
    var x = document.getElementsByClassName("qm-c-masthead");

    chrome.storage.local.get(["headerVisible"], function (e) {
      var headerVisible = e.headerVisible;
      if (typeof headerVisible == "undefined") {
        headerVisible = true;
      }
      if (!x[0]) return;
      if (headerVisible == true) {
        x[0].classList.add("headerHide");
        $("#showHeaderspan").text("Show Header");
        headerVisible = false;
      } else {
        x[0].classList.remove("headerHide");
        $("#showHeaderspan").text("Hide Header");
        headerVisible = true;
      }
      chrome.storage.local.set({ headerVisible: headerVisible }, function () {
        //console.log('Header visibility has been set to ' + headerVisible);
      });
    });
  });

  $(document).on("click", "#gwt-uid-84", function () {
    dashboardDays();
  });

  // this is a fix to work with both the legacy "gear" icon (hidden in February 2024 release)
  // and the three ellipse "more" option icon (introduced in Feb 2024 UI update)
  // wait for enter full screen menu to appear, then insert additional options
  document.arrive(
    '[data-locator="link-enter-full-screen"]',
    function (element) {
      var ul = $(element).closest("ul")[0];
      $(ul).append(
        '<li id="copyCompID"><a class="gwt-Anchor">Copy Current Component ID</a></li>',
      );
      $(ul).append(
        '<li id="copyCompURL"><a class="gwt-Anchor">Copy Current Component URL</a></li>',
      );
    },
  );

  $(document).on("click", "#copyCompID", function () {
    var currentId = getUrlParameter("componentIdOnFocus");
    $("#mastfoot").append(
      '<input type="text" value="' + currentId + '" id="currentidval">',
    );
    var currentidval = document.getElementById("currentidval");
    currentidval.select();
    currentidval.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $("#currentidval").remove();

    showInformationAlertDialog(
      "Current ID " + currentId + " Copied to Clipboard.",
    );
    return false;
  });

  $(document).on("click", "#copyCompURL", function () {
    var currentId = getUrlParameter("componentIdOnFocus");
    var processReportingEl = document.querySelector('[data-locator="link-process-reporting"]');
    var accountId =
      getUrlParameter("accountId") ||
      (processReportingEl && processReportingEl.href.split("=").pop().split(";")[0]);
    $("#mastfoot").append(
      '<input type="text" value="https://platform.boomi.com/AtomSphere.html#build;accountId=' +
        accountId +
        ";components=" +
        currentId +
        '" id="currenturlval">',
    );
    var currentidval = document.getElementById("currenturlval");
    currentidval.select();
    currentidval.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $("#currenturlval").remove();

    showInformationAlertDialog(
      "Current Component URL Copied to Clipboard. (" + currentId + ")",
    );
    return false;
  });

  $(document).on("click", "#closeUpdate", function () {
    $(".BoomiUpdateOverlay").remove();
  });
});

// ── Deploy wizard step 1: capture environment name (and atomId when findable) ──

document.arrive('.form_title_label:not(.no_display)', { existing: true }, function (titleEl) {
  if (titleEl.textContent.trim() !== 'Deploy: Select Packaged Components') return;

  var modal = titleEl.closest('.popupContent, [role="dialog"]') || document.body;

  function captureEnv() {
    var dts = modal.querySelectorAll('dt');
    for (var i = 0; i < dts.length; i++) {
      if (dts[i].textContent.trim() === 'Environment') {
        var dd = dts[i].nextElementSibling;
        if (dd && dd.tagName === 'DD' && dd.textContent.trim()) {
          sessionStorage.setItem('bph_deploy_env', dd.textContent.trim());
          // TODO: look for atomId in data attributes or links near the dd
          // e.g. dd.querySelector('[data-atom-id]') or a nearby anchor href
        }
        break;
      }
    }
  }

  // Capture immediately and re-capture if the user changes the environment
  captureEnv();
  new MutationObserver(captureEnv).observe(modal, { subtree: true, childList: true, characterData: true });
});

// ── Deployment Successful modal: inject "View on Runtime" button ──────────────

document.arrive('[data-locator="button-view-deployments"]', { existing: true }, function (viewDeploymentsBtn) {
  var buttonSet = viewDeploymentsBtn.closest('.button_set');
  if (!buttonSet || buttonSet.querySelector('.bph-view-runtime-btn')) return;

  // Process name is in the editable label's title attribute
  var processNameEl = Array.from(document.querySelectorAll('.gwt-EditableLabel.name_label[title]'))
    .find(function (el) { return el.getAttribute('title').trim() !== 'Loading...'; });
  var processName = processNameEl ? processNameEl.getAttribute('title').trim() : '';
  console.log('[BPH] deployment modal — processNameEl:', processNameEl, 'processName:', processName);

  var processReportingEl = document.querySelector('[data-locator="link-process-reporting"]');
  var accountId =
    getUrlParameter("accountId") ||
    (processReportingEl && processReportingEl.href.split("=").pop().split(";")[0]);

  var envName = sessionStorage.getItem('bph_deploy_env') || '';
  var atomId = '4e7219c4-fb66-40b5-ab23-0a5c9a32b5b1';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gwt-Button qm-button--primary-action bph-view-runtime-btn';
  btn.textContent = 'View on Runtime';
  btn.title = (processName ? '"' + processName + '"' : 'Process') +
    (envName ? ' on ' + envName : ' on runtime');

  btn.addEventListener('click', function () {
    console.log('[BPH] View on Runtime clicked — processName:', processName);
    if (processName) localStorage.setItem('bph_runtime_filter', processName);
    sessionStorage.removeItem('bph_deploy_env');
    var url = 'https://platform.boomi.com/AtomSphere.html#atom;accountId=' + accountId +
      ';atomId=' + atomId + ';selection=deployed';
    window.open(url, '_blank');
  });

  buttonSet.appendChild(btn);
});

// ── Atom management page: apply stored filter from localStorage ──────────────

var _bph_filter_applied = false;
document.arrive('.filter_input', { existing: true }, function (filterInput) {
  if (_bph_filter_applied) return;

  console.log('[BPH] filter_input arrived, hash:', window.location.hash);
  console.log('[BPH] bph_runtime_filter in localStorage:', localStorage.getItem('bph_runtime_filter'));

  var pendingFilter = localStorage.getItem('bph_runtime_filter') ||
    getUrlParameter('bph_filter');
  if (!pendingFilter) {
    console.log('[BPH] no pending filter, skipping');
    return;
  }

  var hash = window.location.hash;
  if (hash.indexOf('#atom;') === -1 || hash.indexOf('selection=deployed') === -1) {
    console.log('[BPH] hash does not match atom/deployed pattern, skipping');
    return;
  }

  _bph_filter_applied = true;
  localStorage.removeItem('bph_runtime_filter');
  console.log('[BPH] applying filter:', pendingFilter, '— waiting 2s for list to load');

  setTimeout(function () {
    console.log('[BPH] setting filter_input value');
    filterInput.value = pendingFilter;
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    filterInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 }));
    var searchBtn = document.querySelector('[data-locator="link-search"]');
    if (searchBtn && !searchBtn.hasAttribute('disabled')) searchBtn.click();
  }, 2000);
});

// ── Process monitor link on component detail panel ────────────────────────────

document.arrive('[data-locator="link-description"]', { existing: true }, function (descLink) {
  var linksDiv = descLink.closest('.links');
  if (!linksDiv || linksDiv.querySelector('.bph-monitor-link')) return;

  var currentId = getUrlParameter("componentIdOnFocus");
  if (!currentId) return;

  var processReportingEl = document.querySelector('[data-locator="link-process-reporting"]');
  var accountId =
    getUrlParameter("accountId") ||
    (processReportingEl && processReportingEl.href.split("=").pop().split(";")[0]);
  if (!accountId) return;

  var link = document.createElement('a');
  link.className = 'gwt-Anchor svg-anchor bph-monitor-link';
  link.href = 'https://platform.boomi.com/AtomSphere.html#reporting;accountId=' + accountId + ';processes=' + currentId;
  link.title = 'View in process monitor';
  link.target = '_blank';
  link.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style="width: 24px; height: 24px;"><title>View in Process Monitor</title><path d="M22 12H18L15 21L9 3L6 12H2" stroke="#8C8C8C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  descLink.insertAdjacentElement('afterend', link);
});
