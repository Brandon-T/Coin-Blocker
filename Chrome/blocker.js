var urls = ["Coin-Hive", "CoinHive"];
var words = ["Miner", "CoinHive", "Coin-Hive", "CryptoNight", "CryptoNightWASM", "HashesPerSecond", "Hash_Accepted"];

function dataContains(url, str, words) {
    for (var i = 0; i < words.length; ++i) {
        if (str.toLowerCase().indexOf(words[i].toLowerCase()) !== -1) {

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { greeting: url }, function (response) {
                    console.log(response.farewell);
                });
            });

            return true;
        }
    }

    return false;
}

function webListener(requestDetails) {
    var asyncCancel = new Promise((resolve, reject) => {

        let request = new XMLHttpRequest();

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    return resolve({
                        cancel: dataContains(requestDetails.url, request.responseText, urls) || dataContains(requestDetails.url, request.responseText, words)
                    });
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

chrome.webRequest.onBeforeRequest.addListener(
    webListener, {
        urls: ["<all_urls>"],
        types: ["script"]
    }, ["blocking"]
);