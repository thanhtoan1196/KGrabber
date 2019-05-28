// ==UserScript==
// @name          KissGrabber
// @namespace     thorou
// @version       2.0
// @description   extracts embed links from kiss sites
// @author        Thorou
// @license       GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
// @copyright     2019 Leon Timm
// @homepageURL   https://github.com/thorio/KGrabber/
// @updateURL     https://github.com/thorio/KGrabber/raw/master/KGrabber.user.js
// @downloadURL   https://github.com/thorio/KGrabber/raw/master/KGrabber.user.js
// @match         https://kissanime.ru/*
// @match         https://kimcartoon.to/*
// @match         https://kissasian.sh/*
// @run-at        document-end
// @noframes
// ==/UserScript==

window.KG = {};

KG.knownServers = {
	"rapidvideo": {
		regex: '"https://www.rapidvideo.com/e/.*?"',
		name: "RapidVideo (no captcha)",
	},
	"nova": {
		regex: '"https://www.novelplanet.me/v/.*?"',
		name: "Nova Server",
	},
	"beta2": {
		regex: '"https://lh3.googleusercontent.com/.*?"',
		name: "Beta2 Server",
	},
	"p2p": {
		regex: '"https://p2p2.replay.watch/public/dist/index.html\\\\?id=.*?"',
		name: "P2P Server",
	},
	"openload": {
		regex: '"https://openload.co/embed/.*?"',
		name: "Openload",
	},
	"mp4upload": {
		regex: '"https://www.mp4upload.com/embed-.*?"',
		name: "Mp4Upload",
	},
	"streamango": {
		regex: '"https://streamango.com/embed/.*?"',
		name: "Streamango",
	},
	"beta": {
		regex: '"https://lh3.googleusercontent.com/.*?"',
		name: "Beta Server",
	},
}

KG.serverOverrides = {
	"kissanime.ru": {},
	"kimcartoon.to": {
		"rapidvideo": null,
		"p2p": null,
		"beta2": null,
		"nova": null,
		"mp4upload": null,
		"rapid": {
			regex: '"https://www.rapidvideo.com/e/.*?"',
			name: "RapidVideo",
		},
		"fs": {
			regex: '"https://video.xx.fbcdn.net/v/.*?"',
			name: "FS (fbcdn.net)",
		},
		"gp": {
			regex: '"https://lh3.googleusercontent.com/.*?"',
			name: "GP (googleusercontent.com)",
		},
		"fe": {
			regex: '"https://www.luxubu.review/v/.*?"',
			name: "FE (luxubu.review)",
		},
	},
	"kissasian.sh": {
		"rapidvideo": null,
		"p2p": null,
		"beta2": null,
		"nova": null,
		"mp4upload": null,
		"streamango": null,
		"beta": null, //should work, but script can't load data because of https/http session storage separation
		"rapid": {
			regex: '"https://www.rapidvideo.com/e/.*?"',
			name: "RapidVideo",
		},
		"fe": {
			regex: '"https://www.gaobook.review/v/.*?"',
			name: "FE (gaobook.review)",
		},
		"mp": {
			regex: '"https://www.mp4upload.com/embed-.*?"',
			name: "MP (mp4upload.com)",
		},
	},
}

KG.supportedSites = {
	"kissanime.ru": {
		contentPath: "/Anime/*",
		noCaptchaServer: "rapidvideo",
		buttonColor: "#548602",
		buttonTextColor: "#fff",
	},
	"kimcartoon.to": {
		contentPath: "/Cartoon/*",
		noCaptchaServer: "rapid",
		buttonColor: "#ecc835",
		buttonTextColor: "#000",
		optsPosition: 1,
		fixes: ["kimcartoon.to_UIFix"],
	},
	"kissasian.sh": {
		contentPath: "/Drama/*",
		noCaptchaServer: "rapid",
		buttonColor: "#F5B54B",
		buttonTextColor: "#000",
	},
}

//entry function
KG.siteLoad = () => {
	if (!KG.supportedSites[location.hostname]) {
		console.warn("KG: site not supported");
		return;
	}

	KG.applyServerOverrides();
	
	if (KG.if(location.pathname, KG.supportedSites[location.hostname].contentPath) && $(".bigBarContainer .bigChar").length != 0) {
		KG.injectWidgets();
	}

	if (KG.loadStatus()) {
		KG.steps[KG.status.func]();
	}
}

//saves data to session storage
KG.saveStatus = () => {
	sessionStorage["KG-status"] = JSON.stringify(KG.status);
}

//attempts to load data from session storage
KG.loadStatus = () => {
	if (!sessionStorage["KG-status"]) {
		return false;
	}
	try {
		KG.status = JSON.parse(sessionStorage["KG-status"]);
	} catch (e) {
		console.error("KG: unable to parse JSON");
		return false;
	}
	return true;
}

//clears data from session storage
KG.clearStatus = () => {
	sessionStorage.clear("KG-data");
}

//patches the knownServers object based on the current url
KG.applyServerOverrides = () => {
	var over = KG.serverOverrides[location.hostname]
	for (var i in over) {
		if (KG.knownServers[i]) {
			if (over[i] === null) { //server should be removed
				delete KG.knownServers[i];
			} else { //server should be patched
				console.err("KG: patching server entries not implemented");
			}
		} else { //server should be added
			KG.knownServers[i] = over[i];
		}
	}
}

//injects element into page
KG.injectWidgets = () => {
	var site = KG.supportedSites[location.hostname];
	var epCount = $(".listing a").length;

	//css
	$(document.head).append(`<style>${grabberCSS}</style>`);

	//box on the right
	$(`#rightside .clear2:eq(${site.optsPosition || 0})`).after(optsHTML);
	$("#KG-input-to").val(epCount)
		.attr("max", epCount);
	$("#KG-input-from").attr("max", epCount);

	for (var i in KG.knownServers) {
		$(`<option value="${i}">${KG.knownServers[i].name}</>`)
			.appendTo("#KG-input-server");
	}
	KG.markAvailableServers($(".listing tr:eq(2) a").attr("href"), site.noCaptchaServer);
	KG.loadPreferredServer();

	//links in the middle
	$("#leftside").prepend(linkListHTML);

	//numbers and buttons on each episode
	$(".listing tr:eq(0)").prepend(`<th class="KG-episodelist-header">#</th>`);
	$(".listing tr:gt(1)").each((i, obj) => {
		$(obj).prepend(`<td class="KG-episodelist-number">${epCount-i}</td>`)
			.children(":eq(1)").prepend(`<input type="button" value="grab" class="KG-episodelist-button" onclick="KG.startSingle(${epCount-i})">&nbsp;`);
	});

	//colors
	$(".KG-episodelist-button").add(".KG-button")
		.css({ color: site.buttonTextColor, "background-color": site.buttonColor });

	//fixes
	for (var i in site.fixes) {
		if (KG.fixes[site.fixes[i]]) {
			KG.fixes[site.fixes[i]]();
		} else {
			console.error(`KG: nonexistant fix "${site.fixes[i]}"`);
		}
	}
}

//grays out servers that aren't available on the url
KG.markAvailableServers = async (url, server) => {
	var servers = []
	var html = await $.get(`${url}&s=${server}`);
	$(html).find("#selectServer").children().each((i, obj) => {
		servers.push(obj.value.match(/s=\w+/g)[0].slice(2, Infinity));
	})
	if (servers.length == 0) {
		console.error("KG: no servers found");
	}

	$("#KG-input-server option").each((i, obj) => {
		if (servers.indexOf(obj.value) < 0) {
			$(obj).css("color", "#888");
		}
	});
}

//gets link for single episode
KG.startSingle = (num) => {
	KG.startRange(num, num);
}

//gets links for a range of episodes
KG.startRange = (start, end) => {
	KG.status = {
		url: location.href,
		title: $(".bigBarContainer .bigChar").text(),
		server: $("#KG-input-server").val(),
		episodes: [],
		start: start,
		current: 0,
		func: "defaultBegin",
	}
	var epCount = $(".listing a").length;
	KG.for($(`.listing a`).get().reverse(), start - 1, end - 1, (i, obj) => {
		KG.status.episodes.push({
			kissLink: obj.href,
			grabLink: "",
			num: i + 1,
		});
	});
	KG.saveStatus();
	KG.steps[KG.status.func]();
}

KG.displayLinks = () => {
	var html = "";
	var padLength = Math.max(2, $(".listing a").length.toString().length);
	KG.for(KG.status.episodes, (i, obj) => {
		var num = obj.num.toString().padStart(padLength, "0");
		var number = `<div class="KG-linkdisplay-episodenumber">E${num}:</div>`;
		var link = `<a href="${obj.grabLink}" target="_blank">${obj.grabLink}</a>`;
		html += `<div class="KG-linkdisplay-row">${number} ${link}</div>`;
	});
	$("#KG-linkdisplay-text").html(`<div class="KG-linkdisplay-table">${html}</div>`);
	$("#KG-linkdisplay-title").text(`Extracted Links | ${KG.status.title}`);

	var onSamePage = KG.status.url == location.href;
	for (var i in KG.exporters) {
		var disable = KG.exporters[i].requireSamePage && !onSamePage;
		var disabled = disable ? "disabled" : "";
		$("#KG-input-export").append(`<option value="${i}" ${disabled}>${KG.exporters[i].name}</option>`);
	}

	$("#KG-linkdisplay").show();
}

KG.exportData = (exporter) => {
	$("#KG-input-export").val("");

	var text = KG.exporters[exporter].export(KG.status);
	$("#KG-linkdisplay-export-text").text(text);
	$("#KG-input-export-download").attr({
		href: `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
		download: `${KG.status.title}.${KG.exporters[exporter].extension}`,
	})
	$("#KG-linkdisplay-export").show();
}

//hides the linkdisplay
KG.closeLinkdisplay = () => {
	$("#KG-linkdisplay").hide();
	KG.clearStatus();
}

//saves a new preferred server
KG.updatePreferredServer = () => {
	localStorage["KG-preferredServer"] = $("#KG-input-server").val();
}

KG.loadPreferredServer = () => {
	$("#KG-input-server").val(localStorage["KG-preferredServer"]);
}

//applies regex to html page to find a link
KG.findLink = (regexString) => {
	var re = new RegExp(regexString);
	var result = document.body.innerHTML.match(re);
	if (result && result.length > 0) {
		return result[0].split('"')[1];
	}
	return "";
}

//wildcard-enabled string comparison
KG.if = (str, rule) => {
	return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

//iterates over an array with supplied function
//either (array, min, max, func)
//or     (array, func)
KG.for = (array, min, max, func) => {
	if (typeof min == "function") {
		func = min;
		max = array.length - 1;
	}
	min = Math.max(0, min) || 0;
	max = Math.min(array.length - 1, max);
	for (var i = min; i <= max; i++) {
		func(i, array[i]);
	}
}

//allows multiple different approaches to collecting links, if sites differ greatly
KG.steps = {};

//default
KG.steps.defaultBegin = () => {
	KG.status.func = "defaultGetLink";
	KG.saveStatus();
	location.href = KG.status.episodes[KG.status.current].kissLink + `&s=${KG.status.server}`;
}

KG.steps.defaultGetLink = () => {
	if (!KG.if(location.pathname, KG.supportedSites[location.hostname].contentPath)) { //captcha
		return;
	}
	link = KG.findLink(KG.knownServers[KG.status.server].regex);
	KG.status.episodes[KG.status.current].grabLink = link || "error (selected server may not be available)";

	KG.status.current++;
	if (KG.status.current >= KG.status.episodes.length) {
		KG.status.func = "defaultFinished";
		location.href = KG.status.url;
	} else {
		location.href = KG.status.episodes[KG.status.current].kissLink + `&s=${KG.status.server}`;
	}
	KG.saveStatus();
}

KG.steps.defaultFinished = () => {
	KG.displayLinks();
}

//allows for multiple ways to export collected data
KG.exporters = {};

KG.exporters.json = {
	name: "json",
	extension: "json",
	requireSamePage: true,
	export: (data) => {
		var listing = $(".listing a").get().reverse();
		var json = {
			title: data.title,
			server: data.server,
			episodes: []
		};
		for (var i in data.episodes) {
			json.episodes.push({
				number: data.episodes[i].num,
				name: listing[data.episodes[i].num - 1].innerText,
				link: data.episodes[i].grabLink
			});
		}
		return JSON.stringify(json);
	},
}

KG.exporters.csv = {
	name: "csv",
	extension: "csv",
	requireSamePage: true,
	export: (data) => {
		var listing = $(".listing a").get().reverse();
		var str = "episode, name, url\n";
		for (var i in data.episodes) {
			str += `${data.episodes[i].num}, ${listing[data.episodes[i].num-1].innerText}, ${data.episodes[i].grabLink}\n`;
		}
		return str;
	}
}

KG.exporters.list = {
	name: "list",
	extension: "txt",
	requireSamePage: false,
	export: (data) => {
		var str = "";
		for (var i in data.episodes) {
			str += data.episodes[i].grabLink + "\n";
		}
		return str;
	}
}

KG.exporters.aria2c = {
	name: "aria2c file",
	extension: "txt",
	requireSamePage: false,
	export: (data) => {
		var padLength = Math.max(2, data.episodes[data.episodes.length - 1].num.toString().length);
		var str = "";
		KG.for(data.episodes, (i, obj) => {
			str += `${obj.grabLink}\n	-o E${obj.num.toString().padStart(padLength, "0")}.mp4\n`;
		});
		return str;
	}
}

//if something doesn't look right on a specific site, a fix can be written here
KG.fixes = {}

KG.fixes["kimcartoon.to_UIFix"] = () => {
	//linkdisplay
	var $ld = $("#KG-linkdisplay");
	$ld.find(".barTitle").removeClass("barTitle")
		.css({
			"height": "20px",
			"padding": "5px",
		});
	$("#KG-linkdisplay-title").css({
		"font-size": "20px",
		"color": $("a.bigChar").css("color"),
	})
	$ld.find(".arrow-general").remove();

	//opts
	var $opts = $("#KG-opts-widget");
	var title = $opts.find(".barTitle").text();
	$opts.find(".barTitle").remove();
	$opts.find(".arrow-general").remove();
	$opts.before(`<div class="title-list icon">${title}</div><div class="clear2"></div>`)
}

//HTML and CSS pasted here because Tampermonkey apparently doesn't allow resources to be updated
//if you have a solution for including extra files that are updated when the script is reinstalled please let me know: thorio.git@gmail.com

//the grabber widget injected into the page
var optsHTML = `<div class="rightBox" id="KG-opts-widget">
	<div class="barTitle">
		KissGrabber
	</div>
	<div class="barContent">
		<div class="arrow-general">
			&nbsp;
		</div>
		<select id="KG-input-server" onchange="KG.updatePreferredServer()" style="">
		</select>
		<p>
			from
			<input type="number" id="KG-input-from" class="KG-input-episode" value=1 min=1> to
			<input type="number" id="KG-input-to" class="KG-input-episode" min=1>
		</p>
		<div class="KG-button-container">
			<input type="button" class="KG-button" value="Extract Links" onclick="KG.startRange($('#KG-input-from').val(),$('#KG-input-to').val())">
		</div>
	</div>
</div>
<div class="clear2">
</div>`;

//initially hidden HTML that is revealed and filled in by the grabber script
var linkListHTML = `<div class="bigBarContainer" id="KG-linkdisplay" style="display: none;">
	<div class="barTitle">
		<div id="KG-linkdisplay-title">
			Extracted Links
		</div>
		<a id="KG-linkdisplay-close" onclick="KG.closeLinkdisplay()">
			close &nbsp;
		</a>
	</div>
	<div class="barContent">
		<div class="arrow-general">
			&nbsp;</div>
		<div id="KG-linkdisplay-text"></div>
		<div class="KG-button-container">
			<select id="KG-input-export" onchange="KG.exportData(this.value)">
				<option value="" selected disabled hidden>Export as</option>
			</select>
		</div>
		<div id="KG-linkdisplay-export" style="display: none;">
			<textarea id="KG-linkdisplay-export-text" spellcheck="false"></textarea>
			<div class="KG-button-container">
				<a id="KG-input-export-download">
					<input type="button" value="Download" class="KG-button" style="float: right;">
				</a>
			</div>
		</div>
	</div>
</div>`;

//css to make it all look good
var grabberCSS = `.KG-episodelist-header {
	width: 3%;
	text-align: center !important;
}

.KG-episodelist-number {
	text-align: right;
	padding-right: 4px;
}

.KG-episodelist-button {
	background-color: #527701;
	color: #ffffff;
	border: none;
	cursor: pointer;
}

.KG-input-episode {
	width: 40px;
	border: 1px solid #666666;
	background: #393939;
	padding: 3px;
	color: #ffffff;
}

#KG-input-server {
	width: 100%;
	font-size: 14.5px;
	color: #fff;
}

#KG-input-export {
 	margin: 6px;
 	float: left;
}

.KG-button {
	background-color: #548602;
	color: #ffffff;
	border: none;
	padding: 5px;
	padding-left: 12px;
	padding-right: 12px;
	font-size: 15px;
	margin: 3px;
	float: left;
}

.KG-button-container {
	margin-top: 10px;
	height: 34px;
}

#KG-linkdisplay-title {
	width: 80%;
	float: left;
}

#KG-linkdisplay-text {
	word-break: break-all;
}

.KG-linkdisplay-row {
	display: flex;
	flex-direction: row;
}

.KG-linkdisplay-episodenumber {
	min-width: 30px;
	text-align: right;
	user-select: none;
	margin-right: 5px;
}

#KG-linkdisplay-export {
	margin-top: 10px;
}

#KG-linkdisplay-export-text {
	width: 100%;
	height: 150px;
	min-height: 40px;
	resize: vertical;
	background-color: #222;
	color: #fff;
	border: none;
}

#KG-linkdisplay-close {
	float: right;
	cursor: pointer;
}`;

KG.siteLoad();