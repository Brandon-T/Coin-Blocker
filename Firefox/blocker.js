var urls = ["Coin-Hive", "CoinHive"];
var words = ["Miner", "CoinHive", "Coin-Hive", "CryptoNight", "CryptoNightWASM", "CNight", "HashesPerSecond", "Hash_Accepted",
    "TWluZXI=", "Q29pbkhpdmU=", "Q29pbi1IaXZl", "Q3J5cHRvTmlnaHQ=", "Q3J5cHRvTmlnaHRXQVNN", "Q05pZ2h0", "SGFzaGVzUGVyU2Vjb25k", "SGFzaF9BY2NlcHRlZA=="];
var exception_urls = [];
var currentTabURL = window.location.href;

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






browser.browserAction.onClicked.addListener(function () {
    browser.runtime.openOptionsPage();
});

function dataContains(url, str, words) {
    for (var i = 0; i < words.length; ++i) {
        if (str.toLowerCase().indexOf(words[i].toLowerCase()) !== -1) {

            //let the content script know that the webpage is making dangerous requests..
            //sendMessage({ messageId: -1, badURL: url });

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
    //Create an async promise..
    var asyncCancel = new Promise((resolve, reject) => {

        let request = new XMLHttpRequest();

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {

                    //Get the tab that made the request..
                    getTab(request.tabId, function (tabURL) {

                        //if that tab has a valid url..
                        if (tabURL !== undefined && tabURL !== null && tabURL.length > 0) {

                            //if the tab is not in the exceptions list.. then handle it..
                            if (!urlMatches(tabURL)) {

                                //handle it..
                                if (dataContains(requestDetails.url, request.responseText, urls) || dataContains(requestDetails.url, request.responseText, words)) {
                                    reject({
                                        url: requestDetails.url,
                                        cancel: true
                                    })
                                }
                                else {
                                    resolve({
                                        cancel: false
                                    })
                                }
                            }
                            else { //don't handle it.. just let it pass through..
                                resolve({
                                    cancel: false
                                })
                            }
                        }
                        else {

                            //else the tab's url is invalid or something went wrong.. handle it anyway..
                            if (dataContains(requestDetails.url, request.responseText, urls) || dataContains(requestDetails.url, request.responseText, words)) {
                                reject({
                                    url: requestDetails.url,
                                    cancel: true
                                })
                            }
                            else {
                                resolve({
                                    cancel: false
                                })
                            }
                        }
                    });
                }
                else {
                    //cancel on fail..
                    reject({
                        url: requestDetails.url,
                        cancel: true
                    })
                }
            }
        };

        //Execute the request asynchronously..
        request.open('GET', requestDetails.url, true);
        request.send();
    });

    asyncCancel.catch(reason => {
        console.log(JSON.stringify(reason));
    });

    return asyncCancel;
}

browser.webRequest.onBeforeRequest.addListener(
    webListener, {
        urls: ["<all_urls>"],
        types: ["script"]
    }, ["blocking"]
);