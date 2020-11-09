// ==UserScript==
// @name        Fastani - more player buttons and fixes.
// @namespace   Violentmonkey Scripts
// @match       https://fastani.net/*
// @grant       none
// @version     1.9.0
// @author      LagradOst
// @description Fixes and features for fastani.
// @require https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==
const settingsButton = true;

// Global
globalSettings = null;


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
};

// Allows rerunning, unlike waitForEl atm
var checkElement = (selector, element, triggerOnRemoval = false) => {
    var check = (triggerOnRemoval ? $(selector)[0] == element : document.querySelector(selector) === null || $(selector)[0] == element)
    if (check) {
        return rafAsync().then(() => checkElement(selector, element, triggerOnRemoval));
    } else {
        console.log(selector[0], element)
        return Promise.resolve(true);
    }
};

var writeSettings = (settings) => {
    localStorage.setItem("settings", JSON.stringify(settings))
    globalSettings = settings;
}

var getSettings = () => {
    const defaultSettings = {
        'Download button': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Adds a download button to the player'
        },
        'Skip button': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Adds a skip OP button to the player. Skips 1 minute and 25 seconds'
        },
        'Next button': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Adds a next episode button to the player'
        },
        'Anilist countdown': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Adds an anilist button to all shows which will display a countdown to the next episode if there is one.'
        },
        'Auto next episode': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Automatically skips to the next episode when the current one is finished'
        },
        'Hide controls': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Hides the player controls when paused after 3 seconds, allows screenshotting easier.'
        },
        'Fix loading': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Fixes the player sometimes only playing sound'
        },
        'Input tags': {
            'enabled': true,
            'showInSettings': true,
            'description': 'Allows keyboard input to scroll the tags used in Anime list'
        },
    }
    var settings = JSON.parse(localStorage.getItem("settings"));
    if (settings === null) {
        writeSettings(defaultSettings);
        settings = JSON.parse(localStorage.getItem("settings"));
    }
    // Allows for new settings without messing old ones.
    for (var key in defaultSettings) {
        if (!(key in settings)) {
            settings[key] = defaultSettings[key];
        }
    }
    return settings;
}

globalSettings = getSettings();
console.log(globalSettings);

var toggleKey = (key) => {
    settings = getSettings();
    setting = settings[key];
    element = document.getElementById(key);
    setting.enabled = !setting.enabled
    writeSettings(settings);
    if (setting.enabled) {
        element.classList.add("toggleEnabled");
        element.classList.remove("toggleDisabled");
    } else {
        element.classList.add("toggleDisabled");
        element.classList.remove("toggleEnabled");
    }
}


var showDesc = (key) => {
    settings = getSettings();
    setting = settings[key];
    $("#descriptionText")[0].innerText = setting.description;
    $("#descriptionText")[0].innerText += settings[key].enabled ? "\n\nEnabled" : "\n\nDisabled"
}

if (settingsButton) {
    $('head').append('<style type="text/css">button.toggleEnabled{background:green !important;color:white !important}button.toggleDisabled{background:red !important;color:white !important}</style>');


    var showSettings = () => {
        element = `
      <div class="auth-modal active">
         <div class="amc-outside"></div>
         <div class="auth-m-container">
            <div class="auth-m-slider">
               <div class="auth-m-slider-col active">
                  <form class="auth-m-slider-col-body">
                     <div class="auth-m-slider-col-b-title">Settings</div>`
        settings = getSettings();
        for (var key in settings) {
            if (settings[key].showInSettings) {
                button = (settings[key].enabled ? `<button id="${key}" class="amsclb-button toggleEnabled" type="button">${key}</button>` : `<button id="${key}" class="amsclb-button toggleDisabled" class="amsclb-button" type="button">${key}</button>`);
                element += button;
            }
        }

        element += `<button class="amsclb-button" onclick="localStorage.clear();location.reload();" type="button">Reset settings</button>
                  </form>
               </div>
            </div>
            <div class="auth-m-c-col"></div>
            <div class="auth-m-c-col active">
               <div class="auth-m-cc-title" id="descriptionTitle">Description</div>
               <div class="auth-m-cc-desc" id="descriptionText"></div>
            </div>
         </div>
      </div>
      `
        $("div.app").append(element);
        $('div.amc-outside')[0].onclick = () => {
            $("div.auth-modal.active").removeClass("active");
            //delay() doesnt wanna work.
            setTimeout(function() {
                $("div.auth-modal").remove();
            }, 300);
        };
        var cards = document.querySelectorAll("button.amsclb-button");
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (card.innerText === "Reset settings") {
                card.onmouseover = function() {
                    $("#descriptionText")[0].innerText = "Resets all settings and reloads the tab";
                }
                continue;
            }
            card.onclick = function() {
                toggleKey(this.attributes[0].ownerElement.innerText);
            };
            card.onmouseover = function() {
                showDesc(this.attributes[0].ownerElement.innerText);
            };
        }
    }
    var addSettingsButton = (selector, element) => {
        checkElement(selector, element)
            .then(async (element) => {
                $("div.hd-buttons.desktop-only").prepend(`<div class="hd-b-button" id="settings">Settings</div>`);
                $("#settings")[0].onclick = () => {
                    showSettings();
                };
                return addSettingsButton("div.hd-buttons.desktop-only", $("div.hd-buttons.desktop-only")[0]);
            })
    }
    addSettingsButton("div.hd-buttons.desktop-only", "");
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
var accountElement = "";

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
            newAccountElement = $("div.hd-b-button");
            console.log(newSearchQuery, newPage, newTags, newYears);
            if (page != newPage || searchQuery != newSearchQuery || years != newYears || tags != newTags || accountElement != newAccountElement) {
                url = newPage != null ? `https://fastani.net/api/data?page=${newPage}&animes=1&search=${newSearchQuery}&tags=${newTags}&years=${newYears}` : "https://fastani.net/api/data";
                data = await request("GET", url, "", {
                    "a6e46773cb517a43f5f149f839": "Bearer JBKibPfG5DyirHbTHSy1zQu8cbFrGvtlSTR9b4d55sMWa9EI4KqkNwR+zio3bAifcJv4xyxHDepYxR/qw+W9/g=="
                });
                if (newPage == null && !newAccountElement.length) {
                    list = await request("GET", "https://fastani.net/api/data/@me/list", "", "");
                    data.list = list.savedAnimesList;
                }
                console.log(data);
                page = newPage;
                searchQuery = newSearchQuery;
                tags = newTags;
                years = newYears;
                accountElement = newAccountElement;
            }
            show = null;
            if ($("a.aninfobox-content-body-selector-list-item > img").length) {
                id = $("a.aninfobox-content-body-selector-list-item > img")[0].src.match(/thumbs\/(\d+)/)[1];
                title = null;
            } else {
                title = $("div.anicb-i-title")[0].textContent;
                id = null;
            }

            for (const [key, value] of Object.entries(data)) {
                if (typeof(value) === typeof({})) {
                    cards = "cards" in value ? value.cards : value;
                    cards.forEach((card) => {
                        if (card.title) {
                            if (card.title.english === title && title !== null || card.anilistId == id && id !== null) {
                                show = card;
                            }
                        }
                    });
                }
            }

            console.log(show);

            var addCountdown = (id, text) => {
                console.log(`Countdown: ${id} ${text}`);
                countdown = $("#countdown")[0];
                let element = `<div class="aninfobox-content-body-bar-item" id="countdown" onclick="window.open('https://anilist.co/anime/${id}');">${text}</div>`;
                if (countdown) {
                    countdown.innerText = text;
                    countdown.onclick = () => {
                        window.open(`https://anilist.co/anime/${id}`);
                    };
                } else {
                    $("div.aninfobox-content-body-bar").prepend(element);
                }
            };

            /*
                  $.each($("div.dropdown-box-list-item"), function(i, e) {
                    console.log(e)
                    e.onclick = function(){addAiring('a.aninfobox-content-body-selector-list-item', null);};
                    e.innerHTML = "gg";
                  });
                  */

            id = show.anilistId;
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
                trailer {
                  id
                  site
                  thumbnail
                }
              }
            }
            `;

            var toHHMMSS = (secs) => {
                let sec_num = parseInt(secs, 10);
                let days = Math.floor(sec_num / (3600 * 24));
                let hours = Math.floor(sec_num / 3600) - days * 24;
                let minutes = Math.floor(sec_num / 60) % 60;
                let seconds = sec_num % 60;

                let list = [days, hours, minutes, seconds]
                    .map(v => v < 10 ? "0" + v : v)
                    .filter((v, i) => v !== "00" || i > 0);
                //.join(":")
                return `${days}d ${hours}h ${minutes}m`;
            };
            var getLatest = async (id) => {
                var data = {
                    'query': query,
                    'variables': {
                        'id': id
                    }
                };
                json = await request("POST", "https://graphql.anilist.co", data, {});
                let nextAiringEpisode = json.data.Media.nextAiringEpisode;
                if (nextAiringEpisode) {
                    let remaining = nextAiringEpisode.timeUntilAiring;
                    let time = toHHMMSS(remaining);
                    addCountdown(id, time);
                    return addAiring(selector, $(selector)[0]);
                }
                // If there's no airing date and a sequel exists. 
                else if (json.data.Media.format === "TV") {
                    let edges = (json.data.Media.relations.edges);
                    for (i = 0; i < edges.length; i++) {
                        if (edges[i].relationType === "SEQUEL" && edges[i].node.format === "TV") {
                            return getLatest(edges[i].node.id);
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

if (globalSettings["Anilist countdown"].enabled) {
    addAiring('div.aninfobox-content-body', null);
}


// Allows keyboard usage to scroll tags.
if (globalSettings["Input tags"].enabled) {
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
    if (globalSettings["Fix loading"].enabled) {
        waitForEl("video", function() {
            console.log("Loading fix.");
            setTimeout(function() {
                $("div.wath-page-loading").css("display", "none");
            }, 1000);
        });
    }
    // Checks if already added.
    if (!document.getElementById("extra_controls")) {
        $("video").append(`<div id="extra_controls" display="none" style="position: absolute; left: 0px; top: 0px; width: 0%; height: 0%; z-index: -2147483647; opacity: 0; pointer-events: none;"><div></div></div>`)
        if (globalSettings["Hide controls"].enabled) {
            timeout = "";
            $("div.plyr.plyr--full-ui")[0].addEventListener("controlsshown", function() {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    if ($("button.plyr__controls__item.plyr__control[aria-label=Play]").length !== 0) {
                        console.log("executed");
                        $("div.plyr.plyr--full-ui").addClass("plyr--hide-controls");
                    }
                }, 3000);
            });
        }

        var url = document.getElementsByClassName("plyr__video-wrapper")[0].firstChild.currentSrc;
        var id = document.getElementById("watch-page-main").attributes[4].textContent;
        var cutUrl = window.location.href.split("/");
        // Below in case watch-page-main fails.
        //var end = parseInt(cutUrl.slice(-1), 10);
        cutUrl = cutUrl.slice(0, -1).join('/') + "/";

        //<a href="https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4" target="_blank" class="plyr__control" data-plyr="download"><svg role="presentation" focusable="false"><use xlink:href="#plyr-download"></use></svg><span class="plyr__sr-only">Download</span></a>
        if (globalSettings["Download button"].enabled) {
            var download = `<a href="${url}" download id="download_button" target="_blank" class="plyr__control" data-plyr="download"><svg role="presentation" focusable="false"><use xlink:href="#plyr-download"></use></svg><span class="plyr__sr-only">Download</span></a download>`;
            $(".plyr__controls__item.plyr__menu").append(download);
        }

        console.log(id);

        if (globalSettings["Skip button"].enabled) {
            var skip = `<a id="skip_button" onclick="document.getElementsByTagName('video')[0].currentTime += 85;" class="plyr__control" data-plyr="seekTime"><svg role="presentation" focusable="false"><use xlink:href="#plyr-fast-forward"></use></svg><span class="plyr__sr-only">Skip intro</span></a>`;
            $(".plyr__controls__item.plyr__menu").append(skip);
        }
        if (id != -1 && globalSettings["Auto next episode"].enabled) {
            $("video")[0].onended = () => {
                console.log("Next episode.");
                window.location.href = cutUrl + id;
            };
        }
        if (id != -1 && globalSettings["Next button"].enabled) {
            var next = `<a href="${cutUrl + id}" class="plyr__control">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25pt" height="25pt" viewBox="0 0 25 25" version="1.1">
                        <g>
                        <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 0 25 L 17.707031 12.5 L 0 0 Z M 20.832031 0 L 20.832031 25 L 25 25 L 25 0 Z M 20.832031 0 "></path>
                        </g>
                        </svg></a>`;
            $(".plyr__controls__item.plyr__menu").append(next);
        }
        console.log("Applied player controls.");
        fixed = true;
    }
});
