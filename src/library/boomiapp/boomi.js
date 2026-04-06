let _bph_nav_init = false;
function _bph_init_once() {
  if (_bph_nav_init) return;
  _bph_nav_init = true;
  onNavigationChange();
  updateNotificationCheck();
}

let boomi_title = document.title;
let boomiPageLoaded = setInterval(() => {
  if (boomi_title != document.title) {
    clearInterval(boomiPageLoaded);

    var subHeaderContainerNav =
      document.getElementsByClassName("qm-c-servicenav")[0];
    var headerAdd = document.getElementsByClassName(
      "qm-c-servicenav__navbar",
    )[0];

    // this covers about 90% of the use cases where the header should / shouldn't be hidden.

    /* Only hide the header if
        1) The "Show Header" button can be injected
        2) The nav-bar in which the show header button option is visible
        3) The localstorage/chromestorage "headerVisibile" value is set to false

        This doesn't cover two cases:
        1) The user navigated (with header hidden) to another page (such as settings) without the page reloading.
        2) The user changed to another Boomi platform account, which reloads the DOM but this code is never re-executed because the page didn't reload
    */

    if (
      headerAdd &&
      subHeaderContainerNav &&
      subHeaderContainerNav.style.display != "none" &&
      !subHeaderContainerNav.classList.contains("no_display")
    ) {
      chrome.storage.local.get(["headerVisible"], function (e) {
        if (e.headerVisible == false) {
          document
            .getElementsByClassName("qm-c-masthead")[0]
            .classList.add("headerHide");
        }
        var headerVisibilityState =
          !e.headerVisible && typeof e.headerVisible !== "undefined"
            ? "Show"
            : "Hide";
        $("#" + headerAdd.id).append(
          '<li id="showHeaderbtn" class="qm-c-servicenav__nav-item"><a class="gwt-Anchor qm-c-servicenav__nav-link qm-a--alternate"><span id="showHeaderspan" class="">' +
            headerVisibilityState +
            " Header</span></a></li>",
        );
      });
    }
    _bph_init_once();
  }
}, 250);

// Fallback for new React UI where title may already be set at document_end
setTimeout(_bph_init_once, 3000);

function onNavigationChange() {
  var urlPath = getUrlpath();

  // unique page titles
  try {
    chrome.storage.sync.get(["unique_titles_and_favicons"], function (e) {
      if (chrome.runtime.lastError) return;
      if (e.unique_titles_and_favicons !== "off") {
        removeAccountPrefixFromDocumentTitle();
      }
    });
  } catch (e) {
    console.log("[BPH] storage exception:", e);
  }
}

// run on window change states
window.addEventListener("popstate", onNavigationChange);
window.addEventListener("hashchange", onNavigationChange);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    onNavigationChange();
  }
});

function removeAccountPrefixFromDocumentTitle() {
  // Change Page Title to Drop Account Prefix
  setTimeout(function () {
    // Old nav: second element with this class. New nav: account switcher button.
    var accountNameEl =
      document.getElementsByClassName("qm-c-inlinemenu__settings-menu-item-name")[1] ||
      document.querySelector('[data-testid="account-switcher-button"]');
    if (!accountNameEl) return;
    var title = document.title
      .replace(accountNameEl.innerHTML, "")
      .replace(/^(\s-\s)/, "");
    // replace trailing " - Boomi AtomSphere" (optional)
    //title = title.split(' -')[0];
    document.title = title;
  }, 250);
}
