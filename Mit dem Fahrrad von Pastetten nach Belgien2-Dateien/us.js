
(function () {

        const TEST_UUID = 'cGF1bC5qdW5rKzk5MDk5MEBpcHBlbi1kaWdpdGFsLmRl';
        const SCRIPT_ID = "idjs-us-datalayer";
        const SCRIPT_DATAATTR_CLIENT = "data-id-client";
        const SUBSCRIPTION_SERVICE_SUBDOMAIN = "login";
        const CSS_PATH = "/sub/css/us.css";

        const UUID_PARAMETER_PLACEHOLDER = 'CUA_UUID';
        const CLIENT_PARAMETER_PLACEHOLDER = 'CLIENT_ID';
        const ENV_SUBDOMAIN_PARAMETER_PLACEHOLDER = 'ENV_SUBDOMAIN';
        const CLIENT_BASE_URL_PARAMETER_PLACEHOLDER = 'CLIENT_BASE_URL';
        const SUBSCRIBER_COOKIE = "id_user_products";
        const SUBSCRIBER_COOKIE_KEY = "subscribed";
        const MILLIS_7DAYS = 1000*3600*24*7;

        const LOGOUT_BUTTON_LINK_STAGING = "https://login-staging.user.id/landing/logout/" + CLIENT_PARAMETER_PLACEHOLDER + "?cua_uuid=" + UUID_PARAMETER_PLACEHOLDER
            + "&redirect_uri=https://sso-sandbox.subscription-suite.io/auth/realms/ippen-digital/protocol/openid-connect/logout?"
            + "initiating_idp=" + CLIENT_PARAMETER_PLACEHOLDER +"%26cua_uuid=" + UUID_PARAMETER_PLACEHOLDER + "%26"
            + "redirect_uri=https://sso-staging.user.id/as/signoff?post_logout_redirect_uri%3Dhttps://login-staging.user.id/logout?client%253D"
            + CLIENT_PARAMETER_PLACEHOLDER + "%2526redirect_uri%253Dhttps://" + CLIENT_BASE_URL_PARAMETER_PLACEHOLDER + "/j_spring_security_logout?login_ok_url=/"

        const LOGOUT_BUTTON_LINK = "https://login.user.id/landing/logout/" + CLIENT_PARAMETER_PLACEHOLDER + "?cua_uuid=" + UUID_PARAMETER_PLACEHOLDER
            + "&redirect_uri=https://sso.subscription-suite.io/auth/realms/ippen-digital/protocol/openid-connect/logout?"
            + "initiating_idp=" + CLIENT_PARAMETER_PLACEHOLDER +"%26cua_uuid=" + UUID_PARAMETER_PLACEHOLDER + "%26"
            + "redirect_uri=https://sso.user.id/as/signoff?post_logout_redirect_uri%3Dhttps://login.user.id/logout?client%253D"
            + CLIENT_PARAMETER_PLACEHOLDER + "%2526redirect_uri%253Dhttps://" + CLIENT_BASE_URL_PARAMETER_PLACEHOLDER
            + "/j_spring_security_logout?login_ok_url=/";

        const LOGOUT_LINK_SDZ_STAGING = "https://login-staging.user.id/landing/logout/" + CLIENT_PARAMETER_PLACEHOLDER + "?redirect_uri=https://profil-test.sdz-medien.de/auth/logout?client_id%3Dhasso_ippendigital%26redirect_uri"
            + "%3Dhttps://" + CLIENT_BASE_URL_PARAMETER_PLACEHOLDER + "/j_spring_security_logout?login_ok_url%253D/";

        const LOGOUT_LINK_SDZ = "https://login.user.id/landing/logout/" + CLIENT_PARAMETER_PLACEHOLDER + "?redirect_uri=https://profil.sdz-medien.de/auth/logout?client_id%3Dhasso_ippendigital%26redirect_uri"
            + "%3Dhttps://" + CLIENT_BASE_URL_PARAMETER_PLACEHOLDER + "/j_spring_security_logout?login_ok_url%253D/";

        const PROFILE_BUTTON_LINK = "https://checkout.ippen-digital.de/?client_id=" + CLIENT_PARAMETER_PLACEHOLDER;
        const PROFILE_BUTTON_LINK_STAGING = "https://ippen-digital-sandbox.subscription-suite.io/?client_id=" + CLIENT_PARAMETER_PLACEHOLDER;
        const PROFILE_BUTTON_LINK_SDZ = "https://profil.sdz-medien.de/user/profil/?client_id=hasso_ippendigital&redirect_uri=https://" + CLIENT_BASE_URL_PARAMETER_PLACEHOLDER;
        const PROFILE_BUTTON_LINK_SDZ_STAGING = "https://profil-test.sdz-medien.de/user/profil/?client_id=hasso_ippendigital&redirect_uri=https://" + CLIENT_BASE_URL_PARAMETER_PLACEHOLDER;

        const SDZ_ENV_PARAM = "SDZ_ENV_PARAM";
        const ENV_SUFFIX_PARAM = "ENV_SUFFIX_PARAM";
        const CLIENT_ID_PARAM = "client_id";
        const REFERRER_PARAM = "referrer";
        const UUID_PARAM = "uuid";
        const HASSO_AUTHORIZE_URL = "https://profil" + SDZ_ENV_PARAM + ".sdz-medien.de/auth/authorize";
        const SDZ_STATUS_UPDATE_URL = "https://login" + ENV_SUFFIX_PARAM + ".user.id/api/authorization/sdzStatusUpdate/";
        const SDZ_LOGON_STATUS_URL = "https://profil" + SDZ_ENV_PARAM + ".sdz-medien.de/auth/logonstatus";

        function addDatalayerInfo() {
            const uuid = getCookie('UUID');
            const loggedIn = !!uuid;
            const script = document.getElementById(SCRIPT_ID);
            const env = script.src.includes('idstg') ? 'staging' : 'production';
            const client = script.getAttribute(SCRIPT_DATAATTR_CLIENT);
            handleLogin(loggedIn, client, env, uuid);
        }

        function handleLogin(loggedIn, client, env, uuid) {
            if (loggedIn) {
                handleLoggedInUser(client, env, uuid);
            } else {
                handleNotLoggedInUser();
            }
        }

        function handleLoggedInUser(client, env, uuid) {
            getAuthResponsePromise(client, env, uuid).then(authResponse => {
                const dataLayer = window.dataLayer || [];
                const hasAccess = authResponse ? authResponse.granted : false;

                if (shouldUpdateSdzStatus(client, authResponse) && uuid !== TEST_UUID) {
                    let sdzStatusUpdateUrl = getSdzStatusUpdateUrl(client, uuid, env);
                    window.location.href = sdzStatusUpdateUrl;
                }

                createSubscriberCookieIfNeeded(hasAccess);

                dataLayer.push({
                    event: 'de.ippen-digital.user',
                    'de.ippen-digital.user.userType': hasAccess ? 'Premium' : 'Registriert',
                    'de.ippen-digital.user.persistentId': authResponse.persistentId
                });
            }, authRejection => {
                dataLayer.push(noUserMessage);
            });
        }

        function shouldUpdateSdzStatus(client, authResponse) {
            return isSdzClient(client)
                && isPaywallArticle()
                && (authResponse.expired || (!authResponse.granted && new URL(window.location.href).searchParams.has('_')));
        }

        function isPaywallArticle() {
            return document.getElementsByClassName("id-js-pc-start").length > 0;
        }

        function handleNotLoggedInUser() {
            const dataLayer = window.dataLayer || [];
            let noUserMessage = {
                event: 'de.ippen-digital.user',
                'de.ippen-digital.user.userType': ''
            };
            dataLayer.push(noUserMessage);
            createSubscriberCookieIfNeeded(false);
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
                http.timeout = 3000;
                http.ontimeout = () => {
                    rejectionFunc();
                };
                http.open('GET', 'https://' + SUBSCRIPTION_SERVICE_SUBDOMAIN + envSuffix + '.user.id/api/authorization/uuid/' + params);
                http.send(null);
            });
        }

        // TODO: remove duplicated code e.g. merge us.js with pc-offer-west.js
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
                http.timeout = 1000;
                http.ontimeout = () => {
                    rejectionFunc();
                };
                http.open('GET', url);
                http.send();
            });
        }

        // TODO: remove duplicated code e.g. merge us.js with pc-offer-west.js
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

        function getSubscriberStatusFromCookie() {
            const subscriberCookie = getCookie(SUBSCRIBER_COOKIE);
            if (!!subscriberCookie) {
                const cookieKeyValuePairs = subscriberCookie.split(';');
                const subscriberKeyValuePair = cookieKeyValuePairs.find(keyValuePair => keyValuePair.trim().split('=')[0] === SUBSCRIBER_COOKIE_KEY);
                return !!subscriberKeyValuePair && subscriberKeyValuePair.trim().split('=')[1] === 'true';
            }
            return false;
        }

        function createSubscriberCookieIfNeeded(hasAccess) {
            const uuid = getCookie('UUID');
            if (uuid === TEST_UUID) {
                return false; // do not set cookie for test user
            }

            const subscriberCookie = getCookie(SUBSCRIBER_COOKIE);
            const subscriberStatusFromCookie = getSubscriberStatusFromCookie();
            if (!subscriberCookie || subscriberStatusFromCookie !== hasAccess) {
                const expirationDate = new Date();
                expirationDate.setTime(expirationDate.getTime() + MILLIS_7DAYS);
                document.cookie = SUBSCRIBER_COOKIE + '=' + SUBSCRIBER_COOKIE_KEY + '=' + hasAccess + '; expires=' + expirationDate.toUTCString() + '; Path=/';
                return true;
            }

            return false;
        }

        function getCookie(name) {
            const value = "; " + document.cookie;
            const parts = value.split("; " + name + "=");
            return parts.length >= 2 ? parts.pop().split(';').shift().replace(/["]+/g, '') : '';
        }

        function getLoginUrl() {
            const script = document.getElementById(SCRIPT_ID);
            const client = script.getAttribute(SCRIPT_DATAATTR_CLIENT);
            const paywallBaseUrl = script.src.substr(0, script.src.lastIndexOf('/', script.src.lastIndexOf('/') - 1));
            const location = document.location.href.split('?')[0];
            const referer = encodeURIComponent(changeToHttps(location));
            const cua_uuid = getCookie('cua_uuid');
            const loginFetchUrl = paywallBaseUrl + "/links?client=" + client + "&referer=" + referer + "&isMobile="
                + isMobile() + "&cua_uuid=" + cua_uuid;

            const req = new XMLHttpRequest();
            req.onreadystatechange = function () {
                if (req.readyState === 4 && req.status === 200) {
                    const loginUrl = JSON.parse(req.responseText)['loginUrl'];
                    createLoginBox(client, loginUrl, cua_uuid);
                } else if (req.readyState === 4 && req.status !== 200) {
                    console.log("Error fetching login link");
                }
            };
            req.onerror = () => {
                console.log("Error fetching login link");
            };

            req.open('GET', loginFetchUrl);
            req.send();
        }

        function createLoginBox(client, loginUrl, cua_uuid) {
            const uuid = getCookie('UUID');
            const loggedIn = !!uuid;
            const loginMenu = document.getElementsByClassName('idjs-Header-userProfileLink')[0];
            const script = document.getElementById(SCRIPT_ID);
            const env = script.src.includes('idstg') ? 'staging' : 'production';

            addCss();

            loginMenu.setAttribute('href', '');
            loginMenu.parentElement.addEventListener('click', e => toggleLoginBoxOpen(loginBox));
            loginMenu.parentElement.style.cursor = 'pointer';
            loginMenu.addEventListener('click', e => e.preventDefault());

            const headerHeight = document.getElementsByClassName('idjs-Header')[0].offsetHeight;
            const loginBox = document.createElement('div');
            loginBox.setAttribute('id', 'id-HeaderDoubleGum-element--loginBox')
            loginBox.setAttribute('class', 'idjs-pc-offer-login-box id-MainNavigation-itemLink--isActiveCategory');
            loginBox.style.top = headerHeight + 'px';
            loginBox.style.display = "none";

            if (loggedIn === false) {
                addLoginButton(loginBox, loginUrl);
            } else {
                addLoginBoxLink(loginBox, 'Profil bearbeiten', createProfileLink(client, env));
                addLoginBoxLink(loginBox, 'Abmelden', createLogoutLink(client, cua_uuid, env));
            }

            window.addEventListener('resize', function(event) {
                const header = document.getElementsByClassName('idjs-Header')[0];
                loginBox.style.top = header.offsetHeight + 'px';
            }, true);

            loginMenu.parentElement.appendChild(loginBox);
        }

        function addCss() {
            const link  = document.createElement('link');
            link.rel  = 'stylesheet';
            link.type = 'text/css';
            link.href = CSS_PATH;
            link.media = 'all';
            document.head.appendChild(link);
        }

        function addLoginButton(loginBox, loginUrl) {
            const loginButton = document.createElement('a');
            loginButton.text = 'Anmelden';
            loginButton.setAttribute('class', 'id-StoryElement-intestitialLink-cta idjs-pc-offer-login-button');
            loginButton.href = loginUrl;
            loginBox.appendChild(loginButton);
        }

        function addLoginBoxLink(loginBox, text, url) {
            const link = document.createElement('a');
            link.href = url;
            link.text = text;
            link.setAttribute("class", "idjs-pc-offer-login-box__link");
            loginBox.appendChild(link);
        }

        function toggleLoginBoxOpen(loginBox) {
            loginBox.style.display = loginBox.style.display === 'flex' ? 'none' : 'flex';
            return false;
        }

        function createLogoutLink(client, uuid, env) {
            const linkTemplate = isSdzClient(client) ? (env === 'staging' ? LOGOUT_LINK_SDZ_STAGING : LOGOUT_LINK_SDZ) : (env === 'staging' ? LOGOUT_BUTTON_LINK_STAGING : LOGOUT_BUTTON_LINK);
            let logoutLink = linkTemplate.replaceAll(new RegExp(CLIENT_PARAMETER_PLACEHOLDER, 'g'), client);
            logoutLink = logoutLink.replaceAll(new RegExp(UUID_PARAMETER_PLACEHOLDER, 'g'), uuid);
            logoutLink = logoutLink.replaceAll(new RegExp(CLIENT_BASE_URL_PARAMETER_PLACEHOLDER, 'g'), document.location.host);
            logoutLink = logoutLink.replaceAll(new RegExp(ENV_SUBDOMAIN_PARAMETER_PLACEHOLDER, 'g'), env);

            return logoutLink;
            //return "https://" + document.location.host  + "/sub/redirect/update-subscriber-cookie/sdz?redirect="  + encodeURIComponent(logoutLink);
        }

        function createProfileLink(client, env) {
            const linkTemplate = env === 'staging' ? (isSdzClient(client) ? PROFILE_BUTTON_LINK_SDZ_STAGING : PROFILE_BUTTON_LINK_STAGING) :
                (isSdzClient(client) ? PROFILE_BUTTON_LINK_SDZ : PROFILE_BUTTON_LINK);
            return linkTemplate.replace(new RegExp(CLIENT_PARAMETER_PLACEHOLDER, 'g'), client);
        }

        function isSdzClient(client) {
            return ["schwaebische-post", "gmuender-tagespost"].includes(client);
        }

        function changeToHttps(url) {
            return url.replace("http://", "https://");
        }

        function isMobile() {
            return window.matchMedia("(max-width: 450px)").matches;
        }

        function loadContent() {
            const script = document.getElementById(SCRIPT_ID);
            const client = script.getAttribute(SCRIPT_DATAATTR_CLIENT);

            console.log("load content for client: " + client);

            if (!["webnachrichten-de", "merkur-de", "mangfall24-de", "wasserburg24-de", "tz", "werder", "24rhein", "chiemgau24-de", "bgland24-de", "rosenheim24-de", "innsalzach24-de", "ovb-online-de", "fr", "hna-de", "24vita", "hallo-eltern", "24auto", "24books" ].includes(client)) {
                // old paywall
                addDatalayerInfo();
                if(hasLoginHeader()){
                    getLoginUrl();
                }
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                loadContent();
            });
        } else {
            loadContent();
        }

        function hasLoginHeader() {
            return document.getElementsByClassName('idjs-Header-userProfileLink')[0];
        }
    }
)();
