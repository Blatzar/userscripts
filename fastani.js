// ==UserScript==
// @name        Fastani - more player buttons and fixes.
// @namespace   Violentmonkey Scripts
// @match       https://fastani.net/*
// @grant       none
// @version     1.8.1
// @author      LagradOst
// @description Fixes and features for fastani.
// @require https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

// edit these to enable/disable features.
const inputTags = true;
const fixLoading = true;
const skipButton = true;
const airDate = true;
const downloadButton = true;

// All of these are already added
const arrowFix = false;
const blurEpisodes = false;

// descriptionCut fixed on website
const descriptionCut = false;

//https://gist.github.com/chrisjhoughton/7890303
var waitForEl = function(selector, callback) {
    if (jQuery(selector).length) {
        callback();
    } else {
        setTimeout(function() {
            waitForEl(selector, callback);
        }, 100);
    }
};


function rafAsync() {
    return new Promise(resolve => {
        requestAnimationFrame(resolve); //faster than set time out
    });
}

// Allows rerunning, unlike waitForEl atm
function checkElement(selector, element) {
    if (document.querySelector(selector) === null || $(selector)[0] == element) {
        return rafAsync().then(() => checkElement(selector, element));
    } else {
        return Promise.resolve(true);
    }
}

function addAiring(selector, element) {
    console.log("addAiring");
    checkElement(selector, element)
        .then((element) => {
            console.log("In menu");
            /*
            $.each($("div.dropdown-box-list-item"), function(i, e) {
              console.log(e)
              e.onclick = function(){addAiring('a.aninfobox-content-body-selector-list-item', null);};
              e.innerHTML = "gg";
            });
            */
            let url = $("a.aninfobox-content-body-selector-list-item > img")[0].src
            console.log(url);
            // Should probably be regex.
            let id = url.split('thumbs/')[1].split('_')[0];
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

            function getAiring(data) {
                console.log(`data`)
                ajax = $.ajax({
                    type: 'POST',
                    url: 'https://graphql.anilist.co',
                    data: data,
                    dataType: 'json',
                    success: function(data) {console.log(data);},
                });
                return ajax
            }

            function getLatest(id){
              console.log(`getLatest ${id}`)
              var data = {
                  'query': query,
                  'variables': {
                      'id': id
                  }
              };
              jQuery.when(
                  getAiring(data)
              ).done(function(json) {
                  console.log(`airing done ${id}`)
                  let nextAiringEpisode = json["data"]["Media"]["nextAiringEpisode"];
                  console.log(nextAiringEpisode);
                  if (nextAiringEpisode) {
                      let remaining = nextAiringEpisode["timeUntilAiring"]
                      let time = toHHMMSS(remaining);
                      console.log(time);
                      let element = `<div class="aninfobox-content-body-bar-item" onclick="window.open('https://anilist.co/anime/${id}');">${time}</div>`;
                      $("div.aninfobox-content-body-bar").prepend(element);
                      return addAiring(selector, $(selector)[0]);
                  }
                  else if (json["data"]["Media"]["format"] === "TV") {
                    let edges = (json["data"]["Media"]["relations"]["edges"]);
                    for (i = 0; i < edges.length; i++) {
                      console.log(`Run ${i}`);
                      if (edges[i]["relationType"] === "SEQUEL" && edges[i]["node"]["format"] === "TV"){
                        return getLatest(edges[i]["node"]["id"]);
                      }
                    }
                    return addAiring(selector, $(selector)[0]);
                  }
                  else {
                    return addAiring(selector, $(selector)[0]);
                  }
              });
            };
          getLatest(id);
        });
};
if (airDate) {
    addAiring('a.aninfobox-content-body-selector-list-item', null);
}

/*
function addAiring (){
  waitForEl("a.aninfobox-content-body-selector-list-item", function() {
  console.log("test");
  console.log($("a.aninfobox-content-body-selector-list-item > img"));
  });
}
*/

//addAiring();

if (arrowFix) {
    // Small fix to arrows in anime list. (https://fastani.net/animes)
    const style = $(`<style> .animelist .anl-vid-tags-arrow-body { overflow: visible; }
                         .animelist .anl-vid-tags-arrow-body .anl-vid-tags-arrow.left { left: -20px; }
                         .animelist .anl-vid-tags-arrow-body .anl-vid-tags-arrow.right { right: -20px; }
                         .animelist .anl-vid-tags .anl-vid-tag-blank { display: none; }
                </style>`);
    $('html > head').append(style);
    $(window).on('ready', function() {
        $("div.anl-vid-tag-blank").remove();
    });

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


if (descriptionCut) {
    // Sets max hover text for descriptions.
    waitForEl("div.card-box-hover-data-desc", function() {
        $.each($("div.card-box-hover-data-desc"), function(i, e) {
            var text = e.innerHTML.substring(0, 120);
            text = (text.split(" ").slice(0, -1).join(' '));
            // removes ,...
            if (text.endsWith(",")) {
                text = text.substring(0, text.length - 1);
            }
            e.innerHTML = text + "...";
        });
        /*
        //Rounds stars
        $.each($('span[type="star"]'), function(i, e){
          console.log(e.innerText)
          e.innerText = (Math.round(e.innerText * 100) / 100)
        });
        */
        console.log("Fixed text");
    });
}

if (blurEpisodes) {
    //Blurs episode thumbnails until hover.
    const style = $('<style> a.aninfobox-content-body-selector-list-item > img { filter: blur(8px);transition: 0.3s; }</style>');
    $('html > head').append(style);

    $(document).on("mouseover", "a.aninfobox-content-body-selector-list-item", function() {
        $(this).find("img").css("filter", "blur(0px)");
    });
    $(document).on("mouseout", "a.aninfobox-content-body-selector-list-item", function() {
        $(this).find("img").css("filter", "blur(8px)");
    });
}

// Fixes for video player.
$(window).on('ready', function() {
    // Forcefully removes the loading overlay.
    if (fixLoading) {
        waitForEl("div.plyr__controls__item", function() {
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
