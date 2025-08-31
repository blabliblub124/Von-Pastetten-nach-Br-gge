(function () {
    const SCRIPT_CLASS = "idjs-pc-offer";
    const WRAP_CLASS = "idjs-pc-offer-wrap";
    const WRAP_ACTIVE_CLASS = "idjs-pc-offer-wrap--active";
    const ELEMENT_AFTER_CLASS = "id-js-pc-start";
    const OVERLAY_CLASS = "idjs-pc-offer-overlay";
    const IFRAME_CLASS = "idjs-pc-offer-iframe";
    const STORY_ELEMENT_CLASS_PREFIX = "id-StoryElement";
    const AD_ELEMENT_CLASS = "id-TBeepSlot";
    const SCRIPT_DATAATTR_CLIENT = "data-id-client";

    const PATH_PC_OFFER_JSCSS = "/css/pc-offer-js.css";
    const PATH_PC_OFFER_WERDER_JSCSS = "/css/pc-offer-js-werder.css";
    const PATH_PC_OFFER_SDZ_JSCSS = "/css/pc-offer-js-sdz.css";
    const PATH_PC_OFFER_GTM_JS = "/js/pc-offer-gtm-script.js";
    const PATH_PC_OFFER_GTM_JS_SP = "/js/pc-offer-gtm-script-sp.js";
    const PATH_PC_OFFER_GTM_JS_GT = "/js/pc-offer-gtm-script-gt.js";

    const USER_AGENT_WHITELIST = ['Publication-Access-for-Facebook', 'Mozilla/5.0 (compatible; EchoboxBot/1.0; hash/w4mwnpbXf3MFAbxOkJRw; +http://www.echobox.com)'];

    const GL_PARAMETER_PLACEHOLDER = 'GA_SESSION';
    const SUBSCRIPTION_SERVICE_SUBDOMAIN = 'login';


    const DESKTOP_ABO_CAMPAIGN = "onlineabo_desktop";
    const MOBILE_ABO_CAMPAIGN = "onlineabo_mobile";

    const SDZ_ENV_PARAM = "SDZ_ENV_PARAM";
    const ENV_SUFFIX_PARAM = "ENV_SUFFIX_PARAM";
    const CLIENT_ID_PARAM = "client_id";
    const REFERRER_PARAM = "referrer";
    const UUID_PARAM = "uuid";
    const HASSO_AUTHORIZE_URL = "https://profil" + SDZ_ENV_PARAM + ".sdz-medien.de/auth/authorize";
    const SDZ_STATUS_UPDATE_URL = "https://login" + ENV_SUFFIX_PARAM + ".user.id/api/authorization/sdzStatusUpdate/";
    const SDZ_LOGON_STATUS_URL = "https://profil" + SDZ_ENV_PARAM + ".sdz-medien.de/auth/logonstatus";

    const LOGIN_COOKIE = "UUID";
    const TRACKING_COOKIE = "cua_uuid";

    function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        return parts.length >= 2 ? parts.pop().split(";").shift() : '';
    }

    function getParentUrlParameters() {
        const parts = document.location.href.split('?');
        return parts.length === 2 ? '&' + parts[1] : '';
    }

    function createStyles(paywallBaseUrl, scriptPath) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = paywallBaseUrl + scriptPath;
        return link;
    }

    function createOverlay() {
        const overlay = document.createElement("div");
        overlay.setAttribute("class", OVERLAY_CLASS);
        return overlay;
    }

    function createWrapper() {
        const overlay = document.createElement("div");
        overlay.setAttribute("class", WRAP_CLASS);
        return overlay;
    }

    function createGtmScript(paywallBaseUrl, client) {
        let gtmScriptPath = PATH_PC_OFFER_GTM_JS;
        if (isSdzClient(client)) {
            gtmScriptPath = client === "schwaebische-post" ? PATH_PC_OFFER_GTM_JS_SP : PATH_PC_OFFER_GTM_JS_GT;
        }

        const gtmScript = document.createElement("script");
        gtmScript.src = paywallBaseUrl + gtmScriptPath;
        return gtmScript;
    }

    function createIframe(url) {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("allowtransparency", "true");
        iframe.setAttribute("allow", "layout-animations 'none'; unoptimized-images 'none'; oversized-images 'none'; sync-script 'none'; sync-xhr 'none'; unsized-media 'none';");
        iframe.setAttribute("sandbox", "allow-forms allow-scripts allow-same-origin allow-top-navigation");
        iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
        iframe.setAttribute("src", url);
        iframe.setAttribute("class", IFRAME_CLASS);
        iframe.setAttribute("data-hj-allow-iframe", "");

        return iframe;
    }

    function cleanStoryElements(elementAfter, wrapper) {
        let siblingsAndSelf = Array.from(elementAfter.parentNode.children);
        let index = siblingsAndSelf.indexOf(elementAfter);
        let nextAll = siblingsAndSelf.slice(index + 1);

        let foundFirstStoryElement = false;
        for (let i = 0; i <= nextAll.length; i++) {
            if (nextAll[i] && nextAll[i].className
                && (nextAll[i].className.includes(STORY_ELEMENT_CLASS_PREFIX)  || nextAll[i].className === AD_ELEMENT_CLASS)) {
                if (!foundFirstStoryElement) {
                    wrapper.appendChild(nextAll[i]);
                    foundFirstStoryElement = true;
                } else {
                    nextAll[i].remove();
                }
            }
        }
    }

    function isUserAgentWhitelisted() {
        const userAgent = navigator.userAgent;
        return USER_AGENT_WHITELIST.includes(userAgent);
    }

    function changeToHttps(url) {
        return url.replace("http://", "https://");
    }

    function createGlParam() {
        function getGlSessions() {
            const decorators = window.google_tag_data.gl.decorators;
            const cookieList = {};

            for (let f = 0; f < decorators.length; ++f) {
                const cookie = decorators[f];
                let placement = cookie.placement;
                if (!placement) {
                    placement = cookie.fragment ? 2 : 1
                }

                const info = cookie.callback();
                for (const session in info) info.hasOwnProperty(session) && (cookieList[session] = info[session])
            }
            return cookieList
        }

        const gaCookies = getGlSessions();
        const output = [];
        const base64Charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.";
        const base64Object = {};
        for (let c = 0; c < base64Charset.length; ++c) base64Object[base64Charset[c]] = c;

        function createChecksum(data) {
            const c = [window.navigator.userAgent, (new Date).getTimezoneOffset(), window.navigator.userLanguage || window.navigator.language, Math.floor((new Date).getTime() / 60 / 1E3), data].join("*");
            let checksumInfo = Array(256);
            for (let f = 0; 256 > f; f++) {
                for (var g = f, h = 0; 8 > h; h++) g = g & 1 ? g >>> 1 ^ 3988292384 : g >>> 1;
                checksumInfo[f] = g
            }
            let l = 4294967295;
            for (let m = 0; m < c.length; m++) l = l >>> 8 ^ checksumInfo[(l ^ c.charCodeAt(m)) & 255];
            return ((l ^ -1) >>> 0).toString(36)
        }

        for (const gaCookieName in gaCookies) {
            if (gaCookies.hasOwnProperty(gaCookieName)) {
                const cookieValue = gaCookies[gaCookieName];
                output.push(gaCookieName);

                const valueAsString = String(cookieValue);
                let encodedOutput = [];
                for (let strPosition = 0; strPosition < valueAsString.length; strPosition += 3) {
                    let hasNextCharacter = strPosition + 1 < valueAsString.length,
                        hasSecondNextChar = strPosition + 2 < valueAsString.length,
                        currentCharCode = valueAsString.charCodeAt(strPosition),
                        nextCharCharCode = hasNextCharacter ? valueAsString.charCodeAt(strPosition + 1) : 0,
                        secondNextCharCode = hasSecondNextChar ? valueAsString.charCodeAt(strPosition + 2) : 0,
                        v = currentCharCode >> 2,
                        x = (currentCharCode & 3) << 4 | nextCharCharCode >> 4,
                        z = (nextCharCharCode & 15) << 2 | secondNextCharCode >> 6,
                        w = secondNextCharCode & 63;
                    if (!hasSecondNextChar) {
                        w = 64;
                        if (!hasNextCharacter) {
                            z = 64;
                        }
                    }
                    encodedOutput.push(base64Charset[v], base64Charset[x], base64Charset[z], base64Charset[w])
                }
                output.push(encodedOutput.join(""));
            }
        }
        const valuesArray = output.join("*");
        return ["1", createChecksum(valuesArray), valuesArray].join("*")
    }

    function createPaywall(client, paywallBaseUrl, upgradeRequired, elementAfter) {
        const location = document.location.href.split('?')[0];
        const referer = encodeURIComponent(changeToHttps(location));
        const parameters = getParentUrlParameters();
        const userId = getCookie(TRACKING_COOKIE);


        var currentPageUrl = window.location.href; // Get the URL of the current page
        var url = new URL(currentPageUrl);
        var params = new URLSearchParams(url.search);

        let uuid = getCookie(LOGIN_COOKIE);
        uuid = uuid.replace(/^"(.*)"$/, '$1');
        const loggedIn = !!uuid;

        const fullUrl = url.origin + url.pathname + '?' + 'webview=' + isWebView() + '&' + 'loggedIn=' + loggedIn + '&' + params.toString();


        const paywallHtmlUrl = paywallBaseUrl + "/paywall?client=" + client + "&upgradeRequired="
            + upgradeRequired + "&referer=" + referer + "&isMobile=" + isMobile() + "&" + TRACKING_COOKIE + "=" + userId + parameters  + "&" + "fullUrl=" + encodeURIComponent(fullUrl);
        const iframe = createIframe(paywallHtmlUrl);
        const styles = createStyles(paywallBaseUrl, PATH_PC_OFFER_JSCSS);
        const wrapper = createWrapper();
        const overlay = createOverlay();

        document.head.appendChild(styles);

        if (isSdzClient(client)) {
            const sdzStyles = createStyles(paywallBaseUrl, PATH_PC_OFFER_SDZ_JSCSS);
            document.head.appendChild(sdzStyles);
        }

        if (client === 'werder') {
            const werderStyles = createStyles(paywallBaseUrl, PATH_PC_OFFER_WERDER_JSCSS);
            document.head.appendChild(werderStyles);
        }

        const gtmScript = createGtmScript(paywallBaseUrl, client);
        document.head.appendChild(gtmScript);

        cleanStoryElements(elementAfter, wrapper);
        overlay.appendChild(iframe);
        elementAfter.parentNode.insertBefore(wrapper, elementAfter.nextSibling);

        wrapper.appendChild(overlay);
        wrapper.classList.add(WRAP_ACTIVE_CLASS);
        wrapper.classList.add(WRAP_CLASS + '--' + client);
    }

    function isWebView() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // Check for iOS WebView
        const isIOSWebView = /^(?!.*Safari).*(iPhone|iPad|iPod)/.test(userAgent);

        // Check for Android WebView
        const isAndroidWebView = /wv|Chrome\/[0-9]+/.test(userAgent) && /Android/.test(userAgent);

        return isIOSWebView || isAndroidWebView;
    }


    function addPaywall(elementAfter, hasAccess, client, paywallBaseUrl, loggedIn) {
        const dataLayer = window.dataLayer = window.dataLayer || [];
        if (elementAfter.length > 0 && !isUserAgentWhitelisted() && !hasAccess) {
            createPaywall(client, paywallBaseUrl, loggedIn, elementAfter[0]);
            dataLayer.push({
                'de.ippen-digital.user.hasAccessToContent': false
            });
        } else {
            dataLayer.push({
                'de.ippen-digital.user.hasAccessToContent': true
            });
        }
    }

    function checkAddPaywall() {
        const script = document.getElementById(SCRIPT_CLASS);
        const client = script.getAttribute(SCRIPT_DATAATTR_CLIENT);
        const paywallBaseUrl = script.src.substr(0, script.src.lastIndexOf('/', script.src.lastIndexOf('/') - 1));
        // new userid paywall is handled in a different script

        if (["webnachrichten-de", "merkur-de", "mangfall24-de", "wasserburg24-de", "tz", "werder", "24rhein", "chiemgau24-de", "bgland24-de", "rosenheim24-de", "innsalzach24-de", "ovb-online-de", "fr", "hna-de", "24vita", "hallo-eltern", "24auto", "24books" ].includes(client)) {
            const userIdScript = document.createElement("script");
            userIdScript.src = paywallBaseUrl + "/paywall/js/pc-offer-west.js";
            document.head.appendChild(userIdScript);
            return;
        }



        const elementAfter = document.getElementsByClassName(ELEMENT_AFTER_CLASS);
        const env = script.src.includes('idstg') ? 'staging' : 'production';
        let uuid = getCookie(LOGIN_COOKIE);
        uuid = uuid.replace(/^"(.*)"$/, '$1');

        const loggedIn = !!uuid;


        var referrer = document.referrer;
        var currentPageUrl = window.location.href; // Get the URL of the current page
        var url = new URL(currentPageUrl);
        var params = new URLSearchParams(url.search);
        const fullUrl = url.origin + url.pathname + '?' + 'loggedIn=' + loggedIn + '&' + params.toString();


        var ovbAppWebView = false;
        params.forEach((value, key) => {
            if (key === "loggedIn" && value === "1") {
                ovbAppWebView = true;
            }
        });

        const userAgent = navigator.userAgent;

        handleLogin(elementAfter, loggedIn, paywallBaseUrl, client, env, uuid);
    }

    // TODO add this
    const getSdzLoginStatus = (env) => {
        return new Promise((resolutionFunc, rejectionFunc) => {
            const sdzEnv = env === 'staging' ? '-test' : '';
            let url = SDZ_LOGON_STATUS_URL.replaceAll(new RegExp(SDZ_ENV_PARAM, 'g'), sdzEnv);
            const http = new XMLHttpRequest();
            http.withCredentials = true;
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    const response = JSON.parse(http.responseText);
                    resolutionFunc(response);
                }
            };
            http.onerror = (error) => {
                rejectionFunc();
            };
            http.timeout = 3000;
            http.ontimeout = () => {
                rejectionFunc();
            };
            http.open('GET', url);
            http.send();
        });
    }

    function getSdzStatusUpdateUrl(client, uuid, env) {
        const sdzEnv = env === 'staging' ? '-test' : '';
        const envSuffix = env === 'staging' ? '-staging' : '';

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('_');
        currentUrl.searchParams.delete('utm_source');
        currentUrl.searchParams.delete('utm_medium');
        currentUrl.searchParams.delete('utm_content');
        currentUrl.searchParams.delete('utm_campaign');
        currentUrl.searchParams.delete('page_view_id');
        if(dataLayer.find(o => o["de.ippen-digital.user.converted"]) !== undefined) {
            currentUrl.searchParams.append('converted', "1");
        }

        const redirectUri = new URL(SDZ_STATUS_UPDATE_URL.replaceAll(new RegExp(ENV_SUFFIX_PARAM, 'g'), envSuffix));
        redirectUri.searchParams.append(CLIENT_ID_PARAM, client);
        redirectUri.searchParams.append(UUID_PARAM, uuid);
        redirectUri.searchParams.append(REFERRER_PARAM, currentUrl.href);

        const statusUpdateUrl = new URL(HASSO_AUTHORIZE_URL.replaceAll(new RegExp(SDZ_ENV_PARAM, 'g'), sdzEnv));
        statusUpdateUrl.searchParams.append('response_type', 'code');
        statusUpdateUrl.searchParams.append('client_id', 'hasso_ippendigital');
        statusUpdateUrl.searchParams.append('response_type', 'code');
        statusUpdateUrl.searchParams.append('redirect_uri', redirectUri.href);

        return statusUpdateUrl.href;
    }

    function isSdzClient(client) {
        return ["schwaebische-post", "gmuender-tagespost"].includes(client);
    }

    function handleLogin(elementAfter, loggedIn, paywallBaseUrl, client, env, uuid) {
        if (loggedIn) {
            handleLoggedInUser(elementAfter, client, paywallBaseUrl, env, uuid);
        } else {
            handleNotLoggedInUser(elementAfter, client, paywallBaseUrl);
        }
    }

    function handleLoggedInUser(elementAfter, client, paywallBaseUrl, env, uuid) {
        getAuthResponsePromise(client, env, uuid).then(authResponse => {
            const hasAccess = authResponse ? authResponse.granted : false;

            if (isSdzClient(client) && (authResponse.expired || (!authResponse.granted && new URL(window.location.href).searchParams.has('_')))) {
                window.location.href = getSdzStatusUpdateUrl(client, uuid, env);
            }

            addPaywall(elementAfter, hasAccess, client, paywallBaseUrl, true);
        }, authRejection => {
            handleNotLoggedInUser(elementAfter, client, paywallBaseUrl);
        });
    }

    function handleNotLoggedInUser(elementAfter, client, paywallBaseUrl) {
        addPaywall(elementAfter, false, client, paywallBaseUrl, false);
    }

    function getAuthResponsePromise(clientId, env, uuid) {
        return new Promise((resolutionFunc, rejectionFunc) => {
            const envSuffix = env === 'staging' ? '-staging' : '';
            const http = new XMLHttpRequest();
            const params = '?client_id=' + clientId + '&uuid=' + uuid;
            http.withCredentials = true;
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    const response = JSON.parse(http.responseText);
                    resolutionFunc(response);
                }
            };
            http.onerror = (error) => {
                rejectionFunc();
            };
            http.timeout = 1000;
            http.ontimeout = () => {
                rejectionFunc();
            };
            http.open('GET', 'https://' + SUBSCRIPTION_SERVICE_SUBDOMAIN + envSuffix + '.user.id/api/authorization/uuid/' + params);
            http.send(null);
        });
    }

    function processRedirectUrl(redirectUrl) {
        try {
            const gl = createGlParam();
            return redirectUrl.replace(new RegExp(GL_PARAMETER_PLACEHOLDER, 'g'), gl);
        } catch (error) {
            console.error('Error setting _gl parameter');
            return redirectUrl.replace(new RegExp(GL_PARAMETER_PLACEHOLDER, 'g'), '');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAddPaywall);
    } else {
        checkAddPaywall();
    }

    window.addEventListener('message', function (message) {
        let parsedMsg;

        try {
            parsedMsg = JSON.parse(message.data)
        } catch(e) {
            return;
        }
        if (parsedMsg.iframeSource && parsedMsg.iframeSource.includes('paywall')) {
            adaptUtms(parsedMsg);
            const eventName = parsedMsg.event;
            const newEventName = parsedMsg.newEvent;
            const cuaUuid = parsedMsg.cuaUuid;
            const dataLayer = window.dataLayer = window.dataLayer || [];
            const redirectUrl = parsedMsg.redirectUrl;
            const utm = parsedMsg.utm;

            dataLayer.push({'event': eventName});

            dataLayer.push({
                event: newEventName,
                ecommerce: {
                    promotion_name: eventName,
                    cua_uuid: cuaUuid,
                    utm: utm
                }
            });

            if (redirectUrl) {
                window.location.href = processRedirectUrl(redirectUrl);
            }
        }
    });

    function isMobile() {
        return window.matchMedia("(max-width: 450px)").matches;
    }

    function adaptUtms(parsedMsg) {
        if (isMobile()) {
            parsedMsg.redirectUrl = parsedMsg.redirectUrl? parsedMsg.redirectUrl.replaceAll(DESKTOP_ABO_CAMPAIGN, MOBILE_ABO_CAMPAIGN): parsedMsg.redirectUrl;
            parsedMsg.utm.campaign = parsedMsg.utm.campaign.replace(DESKTOP_ABO_CAMPAIGN, MOBILE_ABO_CAMPAIGN);
        } else{
            parsedMsg.redirectUrl = parsedMsg.redirectUrl? parsedMsg.redirectUrl.replaceAll(MOBILE_ABO_CAMPAIGN, DESKTOP_ABO_CAMPAIGN): parsedMsg.redirectUrl;
            parsedMsg.utm.campaign = parsedMsg.utm.campaign.replace(MOBILE_ABO_CAMPAIGN, DESKTOP_ABO_CAMPAIGN);
        }
    }
})();
