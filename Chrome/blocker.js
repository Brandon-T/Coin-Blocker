var urls = ["Coin-Hive", "CoinHive"];
var words = ["Miner", "CoinHive", "Coin-Hive", "CryptoNight", "CryptoNightWASM", "CNight", "HashesPerSecond", "Hash_Accepted",
    "TWluZXI=", "Q29pbkhpdmU=", "Q29pbi1IaXZl", "Q3J5cHRvTmlnaHQ=", "Q3J5cHRvTmlnaHRXQVNN", "Q05pZ2h0", "SGFzaGVzUGVyU2Vjb25k", "SGFzaF9BY2NlcHRlZA=="];
var exception_urls = [];

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

function sendMessage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs !== undefined && tabs[0] !== undefined) {
            chrome.tabs.sendMessage(tabs[0].id, { greeting: message }, function (response) {
                if (response !== undefined && response.farewell !== undefined) {
                    console.log(response.farewell);
                }
            });
        }
    });
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

function dataContains(url, str, words) {
    for (var i = 0; i < words.length; ++i) {
        if (str.toLowerCase().indexOf(words[i].toLowerCase()) !== -1) {

            //let the content script know that the webpage is making dangerous requests..
            sendMessage({ messageId: -1, badURL: url });

            return true; //cancel the request.. it's dangerous..
        }
    }

    return false;
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
    });
});


//Listen for button action..
chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.runtime.openOptionsPage();
});

//Listen for tab changes..
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    sendMessage({ messageId: 0, tabIdentifier: tabId, tabURL: tab.url });
});

//Listen to all requests made by the page..
chrome.webRequest.onBeforeRequest.addListener(
    webListener, {
        urls: ["<all_urls>"],
        types: ["script"]
    }, ["blocking"]
);