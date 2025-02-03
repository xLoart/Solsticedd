// ==UserScript==
// @name         Auction Enhancer
// @namespace    Loart
// @author       Loart
// @version      2
// @description  Adds auction history (with caching) and blocks users in auctions.
// @match        https://www.neopets.com/auctions.phtml*
// @match        https://www.neopets.com/genie.phtml*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function(){
"use strict";

    const hCache = {},
          tb = document.querySelector("table[align='center'][cellpadding='3'][cellspacing='0'][border='0']")?.tBodies[0];
    if(tb){
        tb.rows[0].appendChild(Object.assign(document.createElement("td"), {
            bgColor:"#dddd77", align:"center", innerHTML:"<b>History</b>"
        }));
        [...tb.rows].slice(1).forEach(r=>{
            const td = document.createElement("td"),
                  a = document.createElement("a");
            a.href = "javascript:void(0)";
            a.textContent = "History";
            a.onclick = e => {
                e.stopPropagation();
                const it = r.querySelector("td:nth-child(3) a");
                if(!it) return alert("Item name not found.");
                const name = it.textContent.trim();
                showHist(name);
                hCache[name]
                    ? (curHist = hCache[name], renderHist(curHist, curF))
                : $.getJSON("https://itemdb.com.br/api/v1/items/" + encodeURIComponent(name) + "/auction")
                    .done(data => {
                    hCache[name] = data; curHist = data; renderHist(curHist, curF);
                    if(data?.recent?.[0]?.item?.image)
                        document.getElementById("auction-history-title").innerHTML =
                            `<img src="${data.recent[0].item.image}" style="height:60px;vertical-align:middle;margin-right:10px;">History for ${name}`;
                })
                    .fail(() => { alert("Error retrieving history for " + name); closeHist(); });
            };
            td.style.verticalAlign = "middle";
            td.appendChild(a);
            r.appendChild(td);
        });
    }
    let curHist = null, curF = "all", modal = null;
    function showHist(n){
        closeHist();
        modal = document.createElement("div");
        modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999";
        const m = document.createElement("div");
        m.id = "auction-history-modal";
        m.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border:1px solid #ccc;max-height:80%;overflow-y:auto;width:80%;max-width:600px;box-shadow:0 0 10px rgba(0,0,0,0.5)";
        m.innerHTML = `
    <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <h2 id="auction-history-title" style="margin:0;">History for ${n}</h2>
      <button id="auction-history-close">Close</button>
    </div>
    <div id="auction-history-filters" style="text-align:center;margin:10px 0;">
      <span class="filt" data-f="all" style="cursor:pointer;margin:0 10px;font-weight:bold;">All</span>
      <span class="filt" data-f="hasBuyer" style="cursor:pointer;margin:0 10px;">Has Buyer</span>
      <span class="filt" data-f="noBuyer" style="cursor:pointer;margin:0 10px;">No Buyer</span>
    </div>
    <div id="auction-history-content" style="margin-top:10px;text-align:center;">Loading...</div>`;
        modal.appendChild(m);
        document.body.appendChild(modal);
        document.getElementById("auction-history-close").onclick = closeHist;
        m.querySelectorAll(".filt").forEach(el => {
            el.onclick = function(){
                curF = this.getAttribute("data-f");
                m.querySelectorAll(".filt").forEach(i => i.style.fontWeight = i.getAttribute("data-f") === curF ? "bold" : "normal");
                renderHist(curHist, curF);
            };
        });
    }
    function renderHist(data, f){
        const c = document.getElementById("auction-history-content");
        if(!c) return;
        let html = `<table align='center' cellpadding='3' cellspacing='0' border='0' style='width:100%;border-collapse:collapse;'>
    <tr bgcolor='#dddd77'>
      <td align='center'><b>ID</b></td>
      <td align='center'><b>Price</b></td>
      <td align='center'><b>Time</b></td>
      <td align='center'><b>Buyer?</b></td>
      <td align='center'><b>Owner</b></td>
      <td align='center'><b>Seen</b></td>
    </tr>`;
        const arr = data && Array.isArray(data.recent)
        ? data.recent.filter(a => f==="hasBuyer" ? a.hasBuyer : f==="noBuyer" ? !a.hasBuyer : true)
        : [];
        if(arr.length)
            arr.forEach((a,i)=>{
                const bg = i % 2 ? "#ffffee" : "#ffffcc",
                      seen = a.addedAt ? new Date(a.addedAt).toLocaleDateString() : "N/A",
                      time = (a.isNF ? "<span style='color:green;'>[NF]</span> " : "") + (a.timeLeft || "N/A");
                html += `<tr bgcolor="${bg}">
        <td align='center'>${a.auction_id || "N/A"}</td>
        <td align='center'>${a.price ? Number(a.price).toLocaleString() : "N/A"} NP</td>
        <td align='center'>${time}</td>
        <td align='center'>${a.hasBuyer ? "Yes" : "No"}</td>
        <td align='center'>${a.owner || "N/A"}</td>
        <td align='center'>${seen}</td>
      </tr>`;
            });
        else html += `<tr><td colspan='6' style='padding:10px;'>No data for filter.</td></tr>`;
        c.innerHTML = html + "</table>";
    }
    function closeHist(){ modal?.parentNode && (modal.parentNode.removeChild(modal), modal = null, curHist = null); }

    const rVal = (k,d) => typeof GM_getValue=="function" ? GM_getValue(k,d) : localStorage[k] || d,
          sVal = (k,v) => typeof GM_setValue=="function" ? GM_setValue(k,v) : (localStorage[k] = v),
          sb = document.querySelector("td.sidebar>div.sidebarModule:last-of-type");
    if(sb){
        const bDiv = document.createElement("div");
        let bList = JSON.parse(rVal("blockList","[]"));
        bDiv.className = "sidebarModule";
        bDiv.innerHTML = `
    <table width="158" cellpadding="2" cellspacing="0" border="0" class="sidebarTable">
      <tr><td class="sidebarHeader medText"><b>Block List</b></td></tr>
      <tr><td class="neofriend" align="center">
        <input id="bInput" style="width:100px"/><button id="bAdd">Add</button>
        <div id="bNames"></div>
      </td></tr>
    </table>`;
        sb.after(bDiv);
        const bNames = document.getElementById("bNames"),
              bInput = document.getElementById("bInput"),
              renderB = () => bNames.innerHTML = bList.map(n => `<div style="font-size:12px"><span data-n="${n}" style="color:red;cursor:pointer;font-size:8px">X</span> ${n}</div>`).join("");
        let unhideMode = false, toggleLink, toggleSuffix;
        const filterA = () => {
            let numBlocked = 0;
            document.querySelectorAll("table[align='center'] tbody tr[bgcolor]").forEach(r => {
                const u = r.querySelector("td:nth-child(4) font.sf")?.textContent.trim().toLowerCase(),
                      blocked = u && bList.some(b => b.toLowerCase() === u);
                if(blocked) numBlocked++;
                r.style.display = (!unhideMode && blocked) ? "none" : "";
            });
            if(toggleLink){
                toggleLink.text(unhideMode ? "Hide" : "Unhide");
                toggleSuffix.text(` ] (Rows affected: ${numBlocked})`);
            }
        };
        renderB(); filterA();
        bDiv.addEventListener("click", e => {
            if(e.target.id=="bAdd"){
                const n = bInput.value.trim();
                if(n && !bList.includes(n)){
                    bList.push(n);
                    sVal("blockList", JSON.stringify(bList));
                    renderB(); filterA(); bInput.value = "";
                }
            } else if(e.target.dataset.n){
                bList = bList.filter(x => x !== e.target.dataset.n);
                sVal("blockList", JSON.stringify(bList));
                renderB(); filterA();
            }
        });
        let next20 = $("a:contains('Next 20')").first();
        if(next20.length){
            const togglePrefix = $("<span>[ </span>");
            toggleLink = $("<a href='javascript:void(0)'>Unhide</a>");
            toggleSuffix = $("<span> ] (Rows affected: 0)</span>");
            const toggleContainer = $("<div style='text-align:center;margin-top:5px;'></div>")
            .append(togglePrefix, toggleLink, toggleSuffix);
            next20.parent().append(toggleContainer);
            toggleLink.on("click", () => { unhideMode = !unhideMode; filterA(); });
        }
    }
})();
