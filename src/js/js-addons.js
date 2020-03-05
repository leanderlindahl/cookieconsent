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

  function getCookie(name) {
    return document.cookie.split('; ').filter(function(cookie) {
      return cookie.indexOf(name) === 0;
    })[0];
  }

  function getConsentFromOnetrustCookie() {
    var consentCookie = getCookie('OptanonConsent');
    if (Boolean(consentCookie)) {
      return decodeURIComponent(
        consentCookie.split('&').filter(function(groups) {
          return groups.indexOf('groups=') !== -1;
        })
      ).replace('groups=', '');
    } else {
      return '1';
    }
  }

  function hasBannerCookieFromOnetrust() {
    var bannerCookie = getCookie('OptanonAlertBoxClosed');
    return !!bannerCookie;
  }

  function createCookieConsentStatusObject(activeGroups, alertBoxClosed) {
    var processedGroups = activeGroups
      .split(',')
      .filter(function(item) {
        return item !== '';
      })
      .filter(function(item) {
        return item.substring(item.length - 2) !== ':0';
      })
      .map(function(item) {
        return item === '1' ? item : item.substring(0, item.length - 2);
      })
      .reduce(function(a, b) {
        a[b] = true;
        return a;
      }, {});
    if (!alertBoxClosed) {
      processedGroups.showBanner = true;
    }
    return processedGroups;
  }

  function setConsentInfoCookie(consentStatusObject) {
    var d = new Date();
    d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * 365);
    document.cookie =
      'ikea_cookieconsent_' +
      window.location.pathname.split('/')[1] +
      '=' +
      encodeURIComponent(JSON.stringify(consentStatusObject)) +
      ';path=/;expires=' +
      d.toGMTString() +
      ';domain=.ikea.com';
  }

  function setIkeaCookieConsentObject(consentStatusObject) {
    var cookieConsentObject = {
      /**
       * @type {Object}
       */
      status: consentStatusObject,
      /**
       * @type {String}
       */
      statusStringified: JSON.stringify(consentStatusObject),
      /**
       * @type {Function}
       * @param {String} consentCategory – Category of cookies user has consented to.
       * @return {Boolean} – Status for the submitted category.
       */
      hasConsent: function(consentCategory) {
        return this.status[consentCategory] || false;
      }
    };
    (window.ikea = window.ikea || {}).cookieConsent = cookieConsentObject;
  }

  function adjustMarkupForSwitchHandler() {
    var iconXToggleSwitch =
      '<span class="switch__ball"><svg focusable="false" viewBox="0 0 24 24" class="svg-icon switch__icon" aria-hidden="true"><path d="M13.45,12,16.71,8.7,15.29,7.3,12,10.59,8.74,7.32,7.33,8.75,10.62,12,7.36,15.3l1.42,1.4L12,13.41l3.32,3.26,1.41-1.42Z"></path></svg></span>';
    var iconCheckToggleSwitch =
      '<span class="switch__ball"><svg focusable="false" viewBox="0 0 24 24" class="svg-icon switch__icon" aria-hidden="true"><path d="M19.29,6.79l-8.76,8.77L5.74,10.32,4.26,11.68l6.21,6.76L20.71,8.21Z"></path></svg></span>';
    var createSwitchMarkup = function() {
      var switchBackground = document.createElement('div');
      switchBackground.classList.add('switch__background');
      switchBackground.innerHTML = iconXToggleSwitch;
      return switchBackground;
    };
    var uxElementForSwitchInput = document.getElementsByClassName(
      'category-switch-handler'
    );
    [].forEach.call(uxElementForSwitchInput, function(item) {
      // Add markup
      item.parentNode.insertBefore(createSwitchMarkup(), item.nextSibling);
      // Add icon toggle
      item.addEventListener('click', function(event) {
        this.nextSibling.innerHTML = this.checked
          ? iconCheckToggleSwitch
          : iconXToggleSwitch;
      });
    });
  }

  function removeAllowAllButtonInPc() {
    var allowAllButton = document.getElementById(
      'accept-recommended-btn-handler'
    );
    allowAllButton.parentNode.removeChild(allowAllButton);
  }

  // Create cookie consent status immediately when document is loaded
  var market = window.location.pathname.split('/')[1];
  var removeAllowAllButtonInPcMarkets = ['es'];
  var updateConsentStatus = function() {
    var consentStatusObject = createCookieConsentStatusObject(
      getConsentFromOnetrustCookie(),
      hasBannerCookieFromOnetrust()
    );
    setIkeaCookieConsentObject(consentStatusObject);
    setConsentInfoCookie(consentStatusObject);

    var cookieSettingsEvent = new _customEvent('ikeaCookieConsent', {
      detail: consentStatusObject
    });

    document.dispatchEvent(cookieSettingsEvent);
    ikea.pubsub &&
      ikea.pubsub.publish('ikeaCookieConsent/changed', consentStatusObject);
  };
  updateConsentStatus();

  // Check OneTrust/Optanon is loaded before performing these tasks
  var targetId = 'onetrust-pc-sdk';
  var checkOptanonExists = setInterval(function() {
    if (document.getElementById(targetId)) {
      clearInterval(checkOptanonExists);
      updateConsentStatus();
      // Bugfix for OneTrust changing the markup suddenly 2019-12-16
      var wrapper = document.querySelector('.pc-title-container');
      if (wrapper) {
        wrapper.outerHTML = wrapper.innerHTML;
      }

      Optanon.OnConsentChanged(updateConsentStatus);

      // Remove "Allow all" from preference center for certain markets
      if (removeAllowAllButtonInPcMarkets.indexOf(market) !== -1) {
        removeAllowAllButtonInPc();
      }

      // Add markup for the IKEA Switch UX Element from the IKEA Design System
      adjustMarkupForSwitchHandler();

      // Watch the DOM and add toggle classes on the Cookie Preferences Modal
      var targetNode = document.getElementById(targetId);
      var cookiePreferenceCallback = function(mutationsList, observer) {
        var i = 0;
        while (i < mutationsList.length) {
          var mutation = mutationsList[i];
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'style'
          ) {
            var ontrustConsentSdkElement = document.getElementById(
              'onetrust-consent-sdk'
            );
            var headerElement =
              document.getElementsByTagName('header')[0] || {};
            if (targetNode.style.opacity === '') {
              document.body.classList.add('noscroll');
              ontrustConsentSdkElement.classList.add('show');
              headerElement.classList.add('cookie-overlay');
            } else {
              document.body.classList.remove('noscroll');
              ontrustConsentSdkElement.classList.remove('show');
              headerElement.classList.remove('cookie-overlay');
            }
          }
          i++;
        }
      };

      var cookieModalObserver = new MutationObserver(cookiePreferenceCallback);
      cookieModalObserver.observe(targetNode, {
        attributes: true,
        childList: false,
        subtree: false
      });
    }
  }, 100);
})(window, document);
