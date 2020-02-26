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

  function setConsent(category) {
    var category = category || 1;
    var cookieConsentObject = (window.ikea || {}).cookieConsent || {
      status: {},
      statusStringified: JSON.stringify(this.status),
      hasConsent: function(consentCategory) {
        return this.status[consentCategory] || false;
      }
    };
    if (!cookieConsentObject.status.hasOwnProperty(category)) {
      cookieConsentObject.status[category] = true;
    } else {
      delete cookieConsentObject.status[category];
    }

    cookieConsentObject.statusStringified = JSON.stringify(
      cookieConsentObject.status
    );

    (window.ikea = window.ikea || {}).cookieConsent = cookieConsentObject;
    console.log('cookieConsentObject.status', cookieConsentObject.status);
    var cookieSettingsEvent = new _customEvent('ikeaCookieConsent', {
      detail: cookieConsentObject.status
    });
    document.dispatchEvent(cookieSettingsEvent);
  }

  function loadScript(scriptTag) {
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

  function enableConsentedScripts(cookieConsentObject) {
    console.log('parseForScripts', cookieConsentObject);
    Object.keys(cookieConsentObject).forEach(function(item) {
      var consentedScripts = document.querySelectorAll(
        'script[data-consent-category*="' + item + '"][type="text/plain"]'
      );
      Array.prototype.forEach.call(consentedScripts, function(item) {
        loadScript(item);
      });
    });
  }

  function consentChanged(event) {
    var consentStatusObject = event.detail || { 1: true };
    enableConsentedScripts(consentStatusObject);
  }

  document.addEventListener('ikeaCookieConsent', consentChanged);

  // Mockup buttons while developing
  document.addEventListener('DOMContentLoaded', function() {
    setConsent();
    console.log('status', ikea.cookieConsent.status);
    var buttons = document.querySelectorAll('.buttons button');

    Array.prototype.forEach.call(buttons, function(item) {
      item.addEventListener('click', function() {
        setConsent(item.getAttribute('data-consent-level'));
      });
    });
  });
})(window, document);
