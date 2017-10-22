var urls = ["Coin-Hive", "CoinHive"];
var words = ["Miner", "CoinHive", "Coin-Hive", "CryptoNight", "CryptoNightWASM", "HashesPerSecond", "Hash_Accepted"];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
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

chrome.storage.sync.get('block', function (res) {
    scanJS();
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    chrome.storage.sync.get('block', function (res) {
        scanJS();
    });
});

function webListener(requestDetails) {

    var asyncCancel = new Promise((resolve, reject) => {

        let request = new XMLHttpRequest();

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    return resolve({ cancel: stringContains(request.responseText, urls) || stringContains(request.responseText, words) });
                }
                else {
                    resolve({ cancel: true });
                }
            }
        };

        request.open('GET', requestDetails.url, true);
        request.send();
    });

    return asyncCancel;
}

browser.webRequest.onBeforeRequest.addListener(
    webListener, {
        urls: ["<all_urls>"],
        types: ["script"]
    }, ["blocking"]
);