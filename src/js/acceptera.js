(function(window, document) {
  var _customEvent =
    typeof window.CustomEvent === 'function'
      ? window.CustomEvent
      : (function() {
          function CustomEvent(event, params) {
            params = params || {
              bubbles: false,
              cancelable: false,
              detail: null
            };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(
              event,
              params.bubbles,
              params.cancelable,
              params.detail
            );
            return evt;
          }
          CustomEvent.prototype = window.Event.prototype;
          return CustomEvent;
        })();

  // This value will be read from a configuration file
  // Some markets have {1: true}, others have {1: true, 2: true}
  var defaultConsentStatus = { 1: true, 2: true };

  function setConsent(category) {
    var category = category || 1;
    var cookieConsentObject = (window.ikea || {}).cookieConsent || {
      status: defaultConsentStatus,
      statusStringified: JSON.stringify(this.status),
      hasConsent: function(consentCategory) {
        return this.status[consentCategory] || false;
      }
    };
    if (!cookieConsentObject.status.hasOwnProperty(category)) {
      cookieConsentObject.status[category] = true;
    }
    updateCookieConsent(cookieConsentObject);
  }

  function unsetConsent(category) {
    if (!Boolean(window.ikea.cookieConsent)) {
      return;
    }
    var cookieConsentObject = window.ikea.cookieConsent;
    delete cookieConsentObject.status[category];
    updateCookieConsent(cookieConsentObject);
  }

  function updateCookieConsent(cookieConsentObject) {
    cookieConsentObject.statusStringified = JSON.stringify(
      cookieConsentObject.status
    );

    (window.ikea = window.ikea || {}).cookieConsent = cookieConsentObject;
    var cookieSettingsEvent = new _customEvent('ikeaCookieConsent', {
      detail: cookieConsentObject.status
    });
    console.log('consent status is now:', cookieConsentObject.status);

    // @TODO: write cookieConsentObject to a cookie
    document.dispatchEvent(cookieSettingsEvent);
  }

  function invokeScript(scriptTag) {
    scriptTag.setAttribute('type', 'text/javascript');
    if (scriptTag.src) {
      // Create a new script tag
      var newNode = document.createElement('script');

      Array.prototype.forEach.call(scriptTag.attributes, function(attribute) {
        attribute.specified &&
          newNode.setAttribute(attribute.name, attribute.value);
      });

      scriptTag.parentNode.insertBefore(newNode, scriptTag.nextSibling);
      // Remove original
      scriptTag.parentNode.removeChild(scriptTag);
    } else {
      eval(scriptTag.innerHTML);
    }
  }

  function enableConsentedScripts(cookieConsentStatus) {
    Object.keys(cookieConsentStatus).forEach(function(item) {
      var consentedScripts = document.querySelectorAll(
        'script[data-consent-category*="' + item + '"][type="text/plain"]'
      );
      Array.prototype.forEach.call(consentedScripts, invokeScript);
    });
  }

  function consentChanged(event) {
    var consentStatusObject = event.detail || { 1: true };
    enableConsentedScripts(consentStatusObject);
  }
  document.addEventListener('ikeaCookieConsent', consentChanged);

  /**
   * Consent Settings Panel
   */
  function toggleSettingsClickHandler(event) {
    if (event.target.className.indexOf('toggle-consent-settings') !== -1) {
      toggleSettingsPanel();
    }
  }
  document.body.addEventListener('click', toggleSettingsClickHandler);

  function toggleSettingsPanel() {
    document.querySelector('.modal').classList.toggle('visible');
    document.querySelector('.modal-overlay').classList.toggle('visible');
    if (document.querySelector('.modal').className.indexOf('visible')) {
      prepareSettingsPanel(window.ikea.cookieConsent.status);
    }
  }

  function prepareSettingsPanel(consentStatus) {
    console.log('prepareSettingsPanel');
    var checkboxes = document.querySelectorAll(
      '#acceptera-settings-panel input[type=checkbox]'
    );
    Array.prototype.forEach.call(checkboxes, function(checkbox) {
      checkbox.checked = Boolean(consentStatus[checkbox.value]);
    });
  }

  function consentToAll(event) {
    if (event.target.id === 'acceptera-accept-all') {
      console.log('Accept all was clicked');
      var accepteraCategories = document.querySelectorAll(
        '#acceptera-settings-panel input[type=checkbox]'
      );
      Array.prototype.forEach.call(accepteraCategories, function(item) {
        setConsent(item.value);
      });
      toggleSettingsPanel();
    }
  }
  document.body.addEventListener('click', consentToAll);

  function consentToSelected(event) {
    if (event.target.id === 'acceptera-save-settings') {
      console.log('Save settings was clicked');
      var accepteraCategories = document.querySelectorAll(
        '#acceptera-settings-panel input[type=checkbox]'
      );
      Array.prototype.forEach.call(accepteraCategories, function(item) {
        item.checked ? setConsent(item.value) : unsetConsent(item.value);
      });
      toggleSettingsPanel();
    }
  }
  document.body.addEventListener('click', consentToSelected);

  /**
   * Mockup button events while developing,
   * will be replaced by preference center and banner
   */
  document.addEventListener('DOMContentLoaded', function() {
    setConsent();
    var buttons = document.querySelectorAll('.buttons button');

    Array.prototype.forEach.call(buttons, function(item) {
      item.addEventListener('click', function() {
        setConsent(item.getAttribute('data-consent-level'));
      });
    });
  });
})(window, document);

/**
 * References:
 * https://css-tricks.com/considerations-styling-modal/
 */
