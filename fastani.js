// ==UserScript==
// @name        Fastani - more player buttons and fixes.
// @namespace   Violentmonkey Scripts
// @match       https://fastani.net/*
// @grant       none
// @version     1.8.3
// @author      LagradOst
// @description Fixes and features for fastani.
// @require https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

// edit these to enable/disable features.
const inputTags = true;
const fixLoading = true;
const skipButton = true;
const anilistCountdown = true;
const downloadButton = true;

//https://gist.github.com/chrisjhoughton/7890303
var waitForEl = (selector, callback) => {
    if ($(selector).length) {
        callback();
    } else {
        setTimeout(function() {
            waitForEl(selector, callback);
        }, 100);
    }
};


var rafAsync = () => {
    return new Promise(resolve => {
        requestAnimationFrame(resolve); //faster than set time out
    });
}

// Allows rerunning, unlike waitForEl atm
var checkElement = (selector, element) => {
    if (document.querySelector(selector) === null || $(selector)[0] == element) {
        return rafAsync().then(() => checkElement(selector, element));
    } else {
        return Promise.resolve(true);
    }
}

function request(type, url, data, headers) {
    return new Promise(resolve => {
        resolve(
            $.ajax({
                type: type,
                url: url,
                success: function(data) {
                    console.log(data);
                },
                headers: headers,
                data: data,
            })
        );
    });
}


//var data = request("GET", "https://fastani.net/api/data", "", {"a6e46773cb517a43f5f149f839": "Bearer JBKibPfG5DyirHbTHSy1zQu8cbFrGvtlSTR9b4d55sMWa9EI4KqkNwR+zio3bAifcJv4xyxHDepYxR/qw+W9/g=="});
//console.log(`TEST: ${data}`)

//$.when(request("POST", "https://graphql.anilist.co")).done(function(json) {console.log("TEST1");});

var page = -1;
var searchQuery = "";
var tags = "";
var years = "";
var data = {};

var addAiring = async (selector, element) => {
    console.log(data, page, years, tags);
    console.log("addAiring");
    //console.log(data["animeData"]["cards"])
    checkElement(selector, element)
        .then(async (element) => {
            console.log("In menu");
            // In homepage no page can be found.
            newSearchQuery = $("input")[0].value;
            newPage = $("div.anl-pagination-item.active")[0] ? $("div.anl-pagination-item.active")[0].textContent : null;
            newTags = $("div.anl-vid-tag.active").toArray().map(tag => tag.innerText).join("%2C");
            newYears = $("div.dropdown-box-list-item.active").toArray().map(tag => tag.innerText).join("%2C");
            console.log(newSearchQuery, newPage, newTags, newYears);
            if (page != newPage || searchQuery != newSearchQuery || years != newYears || tags != newTags) {
                url = newPage != null ? `https://fastani.net/api/data?page=${newPage}&animes=1&search=${newSearchQuery}&tags=${newTags}&years=${newYears}` : "https://fastani.net/api/data";
                data = await request("GET", url, "", {
                    "a6e46773cb517a43f5f149f839": "Bearer JBKibPfG5DyirHbTHSy1zQu8cbFrGvtlSTR9b4d55sMWa9EI4KqkNwR+zio3bAifcJv4xyxHDepYxR/qw+W9/g=="
                });
                console.log(data);
                page = newPage;
                searchQuery = newSearchQuery;
                tags = newTags;
                years = newYears;
            }
            title = $("div.anicb-i-title")[0].textContent
            //cards = (data["animeData"]["cards"])
            for (const [key, value] of Object.entries(data)) {
                if (typeof(value) === typeof({})) {
                    cards = "cards" in value ? value["cards"] : value;
                    cards.forEach((card) => {
                        if (card["title"]["english"] === title) {
                            show = card;
                        }
                    });
                }
            };

            console.log(show);

            var addCountdown = (id, text) => {
                console.log(`Countdown: ${id} ${text}`);
                countdown = $("#countdown")[0];
                let element = `<div class="aninfobox-content-body-bar-item" id="countdown" onclick="window.open('https://anilist.co/anime/${id}');">${text}</div>`;
                if (countdown) {
                    countdown.innerText = text;
                    countdown.onclick = () => {
                        window.open(`https://anilist.co/anime/${id}`);
                    }
                } else {
                    $("div.aninfobox-content-body-bar").prepend(element);
                }
            }

            /*
                  $.each($("div.dropdown-box-list-item"), function(i, e) {
                    console.log(e)
                    e.onclick = function(){addAiring('a.aninfobox-content-body-selector-list-item', null);};
                    e.innerHTML = "gg";
                  });
                  */

            let id = show["anilistId"];
            addCountdown(id, "Anilist");
            console.log(id);
            const query = `
            query ($id: Int) {
              Media (id: $id, type: ANIME) {
                relations {
                  edges {
                    id
                    relationType(version: 2)
                    node {
                      id
                      format
                      nextAiringEpisode {
                        timeUntilAiring
                        episode
                      }
                    }
                  }
                }
                nextAiringEpisode {
                  timeUntilAiring
                  episode
                }
                format
              }
            }
            `;

            var toHHMMSS = (secs) => {
                let sec_num = parseInt(secs, 10)
                let days = Math.floor(sec_num / (3600 * 24))
                let hours = Math.floor(sec_num / 3600) - days * 24
                let minutes = Math.floor(sec_num / 60) % 60
                let seconds = sec_num % 60

                let list = [days, hours, minutes, seconds]
                    .map(v => v < 10 ? "0" + v : v)
                    .filter((v, i) => v !== "00" || i > 0)
                //.join(":")
                return `${days}d ${hours}h ${minutes}m`
            }
            var getLatest = async (id) => {
                var data = {
                    'query': query,
                    'variables': {
                        'id': id
                    }
                };
                json = await request("POST", "https://graphql.anilist.co", data, {})
                let nextAiringEpisode = json["data"]["Media"]["nextAiringEpisode"];
                if (nextAiringEpisode) {
                    let remaining = nextAiringEpisode["timeUntilAiring"]
                    let time = toHHMMSS(remaining);
                    addCountdown(id, time);
                    return addAiring(selector, $(selector)[0]);
                }
                // If there's no airing date and a sequel exists. 
                else if (json["data"]["Media"]["format"] === "TV") {
                    let edges = (json["data"]["Media"]["relations"]["edges"]);
                    for (i = 0; i < edges.length; i++) {
                        if (edges[i]["relationType"] === "SEQUEL" && edges[i]["node"]["format"] === "TV") {
                            return getLatest(edges[i]["node"]["id"]);
                        }
                    }
                    // This fuckery to ensure there's always one instane running.
                    return addAiring(selector, $(selector)[0]);
                } else {
                    return addAiring(selector, $(selector)[0]);
                }
            };
            getLatest(id);
        });
};
if (anilistCountdown) {
    addAiring('div.aninfobox-content-body', null);
}


// Allows keyboard usage to scroll tags.
if (inputTags) {
    document.addEventListener('keydown', function(event) {
        if (document.getElementsByTagName("input")[0] !== document.activeElement) {
            var key = String.fromCharCode(event.keyCode);
            console.log(key);
            // console.log(event.keyCode);
            //A - Z or 0-9
            console.log(65 <= event.keyCode <= 70);
            if (65 <= event.keyCode && event.keyCode <= 90 || 48 <= event.keyCode && event.keyCode <= 57) {
                var scroll = 0;
                var scrolled = false;

                $.each($("div.anl-vid-tag"), function(i, e) {
                    var letter = e.innerHTML.substring(0, 1).toUpperCase();
                    if (letter == key && !scrolled) {
                        $("div.anl-vid-tags")[0].scrollLeft = scroll;
                        scrolled = true;
                        //e.style.display = "";
                    } else {
                        scroll = e.offsetLeft + e.offsetWidth;
                        //e.style.display = "none";
                    }
                });
            }
            // ESC
            else if (event.keyCode == 27) {
                /*
                $.each($("div.anl-vid-tag"), function(i, e) {
                  e.style.display = "";
                });
                */
                $("div.anl-vid-tags")[0].scrollLeft = 0;
            }
        }
    });
}


// Fixes for video player.
$(window).on('ready', function() {
    // Forcefully removes the loading overlay.
    if (fixLoading) {
        waitForEl("video", function() {
            console.log("Loading fix.");
            setTimeout(function() {
                $("div.wath-page-loading").css("display", "none");
            }, 1000);
        });
    }
    // Checks if already added.
    if (!document.getElementById("extra_button")) {
        var url = document.getElementsByClassName("plyr__video-wrapper")[0].firstChild.currentSrc;
        var id = document.getElementById("watch-page-main").attributes[4].textContent;
        var cutUrl = window.location.href.split("/");
        // Below in case watch-page-main fails.
        //var end = parseInt(cutUrl.slice(-1), 10);
        cutUrl = cutUrl.slice(0, -1).join('/') + "/";

        //<a href="https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4" target="_blank" class="plyr__control" data-plyr="download"><svg role="presentation" focusable="false"><use xlink:href="#plyr-download"></use></svg><span class="plyr__sr-only">Download</span></a>
        if (downloadButton) {
            var download = `<a href="${url}" download id="extra_button" target="_blank" class="plyr__control" data-plyr="download"><svg role="presentation" focusable="false"><use xlink:href="#plyr-download"></use></svg><span class="plyr__sr-only">Download</span></a download>`;
            $(".plyr__controls__item.plyr__menu").append(download);
        }

        console.log(id);
        if (id != -1 && skipButton) {
            var skip = `<a href="${cutUrl + id}" id="extra_button" class="plyr__control" data-plyr="seekTime"><svg role="presentation" focusable="false"><use xlink:href="#plyr-fast-forward"></use></svg><span class="plyr__sr-only">captions</span></a download>`;
            $(".plyr__controls__item.plyr__menu").append(skip);
        }
        console.log("Applied player controls.");
        fixed = true;
    }
});
