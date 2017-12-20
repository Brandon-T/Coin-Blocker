function get_domains() {
    var domains = []
    var table = document.getElementById("urlTable");
    for (var i = 1; i < table.rows.length; ++i) {
        var url = $(table.rows[i].cells[0]).text();
        domains.push(url);
    }

    return domains;
}

function update_domains() {
    var domains = get_domains();
    chrome.storage.sync.set({
        exceptions_domains: domains
    }, function () {
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

function save_options() {
    let addedURL = $("#urlDomain").val();
    if (addedURL.length > 0) {
        var domains = get_domains();

        if (jQuery.inArray(addedURL, domains) == -1) {
            domains.push(addedURL);
            $("#urlDomain").val('');

            chrome.storage.sync.set({
                exceptions_domains: domains
            }, function () {
                var status = document.getElementById('status');
                status.textContent = 'Options saved.';
                setTimeout(function () {
                    status.textContent = '';
                }, 750);
                restore_options();
            });
        }
        else {
            var status = document.getElementById('status');
            status.textContent = 'URL Already Exists.';
            setTimeout(function () {
                status.textContent = '';
            }, 2500);
        }
    }
}

function restore_options() {
    chrome.storage.sync.get({
        exceptions_domains: [],
    }, function (items) {
        $("#urlTable thead").remove();
        $("#urlTable tr").remove();
        $("#urlTable").append("<thead><th>URLs</th><th>Options</th></thead>");

        var domains = items["exceptions_domains"]
        $.each(domains, function (index, value) {
            if (value.length > 0) {
                var item = "<td><a href='#'>" + value + "</a></td>";
                var deleteButton = "<td><button class='remove'>Remove</button></td>";
                var html = "<tr>" + item + deleteButton + "</tr>";
                $("#urlTable").append(html);

                $(".remove").on('click', function (event) {
                    $(this).closest('tr').remove();
                    update_domains();
                });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById("addButton").addEventListener("click", save_options);