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
    removeBadJS(null);

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
        [].forEach.call(nodes, function (node) { 
            node.remove()
        });
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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    urls.push(request.greeting);
    sendResponse({ farewell: request.greeting });
});