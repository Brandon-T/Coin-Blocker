var urls = ["Coin-Hive", "CoinHive"];
var words = ["Miner", "CoinHive", "Coin-Hive", "CryptoNight", "CryptoNightWASM", "CNight", "HashesPerSecond", "Hash_Accepted",
    "TWluZXI=", "Q29pbkhpdmU=", "Q29pbi1IaXZl", "Q3J5cHRvTmlnaHQ=", "Q3J5cHRvTmlnaHRXQVNN", "Q05pZ2h0", "SGFzaGVzUGVyU2Vjb25k", "SGFzaF9BY2NlcHRlZA=="];
var exception_urls = [];
var currentTabURL = window.location.href;
var tabs = {};

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function urlMatches(url) {
    if (exception_urls.length > 0) {
        for (var i = 0; i < exception_urls.length; ++i) {
            var pattern = new RegExp(exception_urls[i].toLowerCase());
            if (pattern.test(url)) {
                console.log("URL IS ACCEPTED: " + url);
                return true;
            }
        }
    }
    return false;
}

function stringContains(str, words) {
    for (var i = 0; i < words.length; ++i) {
        if (str.toLowerCase().indexOf(words[i].toLowerCase()) !== -1) {
            console.log("FOUND WORD: " + words[i]);
            return true;
        }
    }
    return false;
}

function scanJS() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; ++i) {
        if (scripts[i].src !== undefined && scripts[i].src !== null && scripts[i].src.length > 0) {
            if (stringContains(scripts[i].src, urls)) {
                deleteElements([scripts[i]]);
            }
        }
        else if (stringContains(scripts[i].textContent, words)) {
            deleteElements([scripts[i]]);
        }
    }

    var observer = new MutationObserver(removeBadJS);
    observer.observe(document, { subtree: true, childList: true });
    document.addEventListener('DOMContentLoaded', function () {
        observer.disconnect();
    }, false);

    function removeBadJS(elements) {
        var scripts = document.getElementsByTagName("script");
        for (var i = 0; i < scripts.length; ++i) {
            if (scripts[i].src !== undefined && scripts[i].src !== null && scripts[i].src.length > 0) {
                if (stringContains(scripts[i].src, urls)) {
                    deleteElements([scripts[i]]);
                }
            }
            else if (stringContains(scripts[i].textContent, words)) {
                deleteElements([scripts[i]]);
            }
        }
    }

    function deleteElements(nodes) {
        [].forEach.call(nodes, function (node) { node.remove(); });
    }
}

function scanIfPossible() {
    if (exception_urls.length > 0) {
        if (!urlMatches(currentTabURL)) {
            scanJS();
        }
    }
    else {
        scanJS();
    }
}


function dataContains(url, str, words) {
    for (var i = 0; i < words.length; ++i) {
        if (str.toLowerCase().indexOf(words[i].toLowerCase()) !== -1) {
            return true; //cancel the request.. it's dangerous..
        }
    }

    return false;
}

function getTab(tabId, callback) {
    if (tabId != undefined && tabId >= 0) {
        chrome.tabs.get(tabId, function (tab) {
            callback(tab.url);
        });
    }
    else {
        callback(null);
    }
}

function webListener(requestDetails) {
    let request = new XMLHttpRequest();
    request.open(requestDetails.method, requestDetails.url, false); //No longer async.. Chrome and Firefox are leaking requests..
    request.send(requestDetails.requestBody);

    if (request.status === 200) {
        //Get the tab that made the request..
        var requestTabURL = null;
        if (requestDetails.tabId !== -1) {
            requestTabURL = tabs[requestDetails.tabId].url;
        }

        if (requestTabURL !== null) {
            if (!urlMatches(requestTabURL)) {

                //handle it..
                if (dataContains(requestDetails.url, request.responseText, urls) || dataContains(requestDetails.url, request.responseText, words)) {
                    console.log("BLOCKING POTENTIALLY DANGEROUS URL: " + requestDetails.url);
                    // sendMessage({ messageId: -1, badURL: requestDetails.url });
                    return { cancel: true };
                }
                else {
                    return { cancel: false };
                }
            }
            else { //don't handle it.. just let it pass through..
                console.log("URL ALLOWED: " + requestDetails.url);
                return { cancel: false };
            }
        }
        else {
            if (dataContains(requestDetails.url, request.responseText, urls) || dataContains(requestDetails.url, request.responseText, words)) {
                console.log("BLOCKING POTENTIALLY DANGEROUS URL: " + requestDetails.url);
                return { cancel: true }
            }
        }
        return { cancel: false }
    }

    return { cancel: true }
}


//Load the user's settings..
chrome.storage.sync.get({
    exceptions_domains: [],
}, function (items) {
    exception_urls = [];
    var domains = items["exceptions_domains"];
    $.each(domains, function (index, value) {
        if (value.length > 0) {
            exception_urls.push(value.toLowerCase());
        }
    });

    scanIfPossible()
});

//If the settings change..
chrome.storage.onChanged.addListener(function (changes, namespace) {
    chrome.storage.sync.get({
        exceptions_domains: [],
    }, function (items) {
        exception_urls = [];
        var domains = items["exceptions_domains"];
        $.each(domains, function (index, value) {
            if (value.length > 0) {
                exception_urls.push(value.toLowerCase());
            }
        });

        scanIfPossible()
    });
});

//Listen for tab changes..
chrome.tabs.query({}, function (results) {
    results.forEach(function (tab) {
        tabs[tab.id] = tab;
    });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    tabs[tab.id] = tab;
    // sendMessage({ messageId: 0, tabIdentifier: tabId, tabURL: tab.url });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
    delete tabs[tabId];
});

//Listen for button action..
browser.browserAction.onClicked.addListener(function () {
    browser.runtime.openOptionsPage();
});

//Listen to all requests made by the page..
browser.webRequest.onBeforeRequest.addListener(
    webListener, {
        urls: ["<all_urls>"],
        types: ["script"]
    }, ["blocking"]
);