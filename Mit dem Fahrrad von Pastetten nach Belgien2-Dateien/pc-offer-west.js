(function () {
    const SCRIPT_CLASS = "idjs-us-datalayer";
    const ELEMENT_AFTER_CLASS = "id-js-pc-start";
    //ELEMENT_AFTER_CLASS = "id-StoryElement-leadText";
    const IFRAME_CLASS = "idjs-pc-offer-iframe";
    const WRAP_CLASS = "idjs-pc-offer-wrap";
    const SCRIPT_DATAATTR_CLIENT = "data-id-client";
    const TRACKING_COOKIE = "cua_uuid";
    const GL_PARAMETER = '_gl';
    const PAGE_VIEW_ID_PARAMETER = 'page_view_id';
    const ARTICLE_REFERER_PARAMETER = 'articleReferer';
    const OVERLAY_CLASS = "idjs-pc-offer-overlay";
    const REGWALL_CLIENTS = ["merkur-de"]
    const REGWALL_UTM_CAMPAIGN = "id-newsletter"
    const REGWALL_UTM_MEDIUM = "email"
    const REGWALL_UTM_SOURCES = ["bayern", "bayern_reg"]

    function isPaywallArticle() {
        const isPaidArticle = window.document.getElementsByClassName(ELEMENT_AFTER_CLASS).length > 0;
        if (isPaidArticle) {
            return true
        } else {
            return enableRegwallForNewsletterIfNeccessary();
        }
    }


    function enableRegwallForNewsletterIfNeccessary() {
        const utm_campaign = getSingleParameter("utm_campaign");
        console.log('parameters - utm_campaign:', utm_campaign);

        const utm_medium = getSingleParameter("utm_medium");
        console.log('parameters - utm_medium:', utm_medium);

        const utm_source = getSingleParameter("utm_source");
        console.log('parameters - utm_source:', utm_source);

        const script = document.getElementById(SCRIPT_CLASS);
        const client = script.getAttribute(SCRIPT_DATAATTR_CLIENT);
        console.log('parameters - client:', client);
        let enableRegwallForNewsletter = REGWALL_CLIENTS.includes(client) && REGWALL_UTM_SOURCES.includes(utm_source) && REGWALL_UTM_CAMPAIGN === utm_campaign && REGWALL_UTM_MEDIUM === utm_medium;
        if (enableRegwallForNewsletter) {
            // First, let's find the paragraph element
            const paragraph = document.querySelector('p.id-StoryElement-leadText');
            // Create the new span element
            const span = document.createElement('span')
            span.className = 'id-js-pc-start';

            if (paragraph && paragraph.parentNode) {
                paragraph.parentNode.insertBefore(span, paragraph.nextSibling);
            }
        }
        return enableRegwallForNewsletter;
    }


    function addDataLayerInfoOnlyForNonePaywall() {
        const enableDataLayer = !isPaywallArticle();
        console.log("enableDataLayer:", enableDataLayer)
        if (enableDataLayer) {
            addDatalayerInfo();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addDataLayerInfoOnlyForNonePaywall();
        });
    } else {
        addDataLayerInfoOnlyForNonePaywall();
    }

    function addDatalayerInfo() {
        const dataLayer = window.dataLayer || [];
        const uuid = getCookie('UUID');
        const loggedIn = !!uuid;
        let noUserMessage = {
            event: 'de.ippen-digital.user',
            'de.ippen-digital.user.userType': ''
        };

        const script = document.getElementById(SCRIPT_CLASS);
        const CLIENT = script.getAttribute(SCRIPT_DATAATTR_CLIENT);

        console.log("User is logged in. Source", script.src);
        const ENV = script.src.includes('idstg') ? '-staging' : '';


        const baseUrl = extractBaseUrl( script.src);

        if (loggedIn) {
            getAuthResponsePromise(CLIENT, baseUrl, uuid).then(authResponse => {
                const hasAccess = authResponse ? authResponse.granted : false;
                dataLayer.push({
                    event: 'de.ippen-digital.user',
                    'de.ippen-digital.user.userType': hasAccess ? 'Premium' : 'Registriert',
                    'de.ippen-digital.user.persistentId': authResponse.persistentId
                });
            }, authRejection => {
                dataLayer.push(noUserMessage);
            });
        } else {
            dataLayer.push(noUserMessage);
        }
    }

    function extractBaseUrl(url) {
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    }


    function getAuthResponsePromise(clientId, baseUrl, uuid) {
        return new Promise((resolutionFunc, rejectionFunc) => {
            const http = new XMLHttpRequest();
            const params = '?client_id=' + clientId + '&uuid=' + uuid;

            http.withCredentials = true;
            http.onreadystatechange = function () {
                if (http.readyState == 4 && http.status == 200) {
                    const response = JSON.parse(http.responseText);
                    resolutionFunc(response);
                }
            };
            http.onerror = (error) => {
                rejectionFunc();
            };
            http.timeout = 5000;
            http.ontimeout = () => {
                rejectionFunc();
            };
            const url = baseUrl + '/sub/api/authorization/uuid/' + params;
            console.log("User is logged in and is checked for access with url:", url);
            http.open('GET', url);
            http.send(null);
        });
    }


    function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        return parts.length >= 2 ? parts.pop().split(";").shift() : '';
    }

    function getParentUrlParameters() {
        const parts = document.location.href.split('?');
        return parts.length === 2 ? '&' + parts[1] : '';
    }

    function getSingleParameter(paramName) {
        const allParamsAsString = getParentUrlParameters();
        const urlParams = new URLSearchParams(allParamsAsString);
        return urlParams.get(paramName);
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

    function createOverlay() {
        const overlay = window.document.createElement("div");
        overlay.setAttribute("class", OVERLAY_CLASS);
        return overlay;
    }

    function createWrapper(client) {
        const overlay = window.document.createElement("div");
        overlay.setAttribute("class", WRAP_CLASS);
        overlay.classList.add(WRAP_CLASS + '--' + client);
        overlay.style.visibility = 'hidden';
        overlay.style.height = '0';
        return overlay;
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
        iframe.style.visibility = "hidden";
        return iframe;
    }

    function changeToHttps(url) {
        return url.replace("http://", "https://");
    }

    function createPaywallIframe(client, paywallBaseUrl, elementAfter) {
        const location = document.location.href.split('?')[0];
        const referer = encodeURIComponent(changeToHttps(location));
        const parameters = getParentUrlParameters();
        const userId = getCookie(TRACKING_COOKIE);
        const glParameterValue = getGlParameter();
        let paywallHtmlUrl = paywallBaseUrl + "/paywall/" + client
            + "?referer=" + referer + "&isMobile=" + isMobile();

        if (glParameterValue !== null) {
            paywallHtmlUrl = paywallHtmlUrl + '&' + GL_PARAMETER + "=" + glParameterValue;
        }

        const pageViewId = getPageViewIdFromDataLayer();
        if (pageViewId !== null) {
            paywallHtmlUrl = paywallHtmlUrl + '&' + PAGE_VIEW_ID_PARAMETER + "=" + pageViewId;
        }

        const articleReferer = window.document.referrer;
        if (articleReferer) {
            paywallHtmlUrl = paywallHtmlUrl + '&' + ARTICLE_REFERER_PARAMETER + "=" + encodeURIComponent(articleReferer);
        }


        paywallHtmlUrl = paywallHtmlUrl + "&" + TRACKING_COOKIE + "=" + userId + parameters;
        const wrapper = createWrapper(client);
        const overlay = createOverlay();
        const iframe = createIframe(paywallHtmlUrl);

        overlay.appendChild(iframe);
        wrapper.appendChild(overlay);
        elementAfter.parentNode.insertBefore(wrapper, elementAfter.nextSibling);
    }

    function getPageViewIdFromDataLayer() {
        const pageViewIdObject = window.dataLayer.find(obj => obj.hasOwnProperty("de.ippen-digital.page.pageViewId"));
        return pageViewIdObject ? pageViewIdObject["de.ippen-digital.page.pageViewId"] : null;
    }

    function getGlParameter() {
        try {
            return createGlParam();
        } catch (error) {
            console.error('Error setting _gl parameter');
            return null;
        }
    }

    function addPaywall(elementAfter, client, paywallBaseUrl) {
        console.log("check test paywall or not. element after length", elementAfter.length);
        if (elementAfter.length > 0) {
            createPaywallIframe(client, paywallBaseUrl, elementAfter[0]);
        }
    }

    function checkAddPaywall() {
        const script = document.getElementById(SCRIPT_CLASS);
        const elementAfter = document.getElementsByClassName(ELEMENT_AFTER_CLASS);
        const paywallBaseUrl = script.src.substr(0, script.src.lastIndexOf('/', script.src.lastIndexOf('/') - 1));
        const client = script.getAttribute(SCRIPT_DATAATTR_CLIENT);
        addPaywall(elementAfter, client, paywallBaseUrl);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAddPaywall);
    } else {
        checkAddPaywall();
    }

    function isMobile() {
        return window.matchMedia("(max-width: 450px)").matches;
    }


})();
