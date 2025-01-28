// ==UserScript==
// @name         Auction User Blocker
// @namespace    Loart
// @version      1
// @description  Hides annoying fucking people from auction listing.
// @author       Loart
// @match        https://www.neopets.com/auctions.phtml*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(()=> {
  const readVal=(k,d)=>typeof GM_getValue=="function"?GM_getValue(k,d):localStorage[k]||d,
        saveVal=(k,v)=>typeof GM_setValue=="function"?GM_setValue(k,v):(localStorage[k]=v),
        sideBar=document.querySelector("td.sidebar>div.sidebarModule:last-of-type"),
        blockDiv=document.createElement("div");

  let blockList=JSON.parse(readVal("blockList","[]"));

  blockDiv.className="sidebarModule";
  blockDiv.innerHTML=`
    <table width="158" cellpadding="2" cellspacing="0" border="0" class="sidebarTable">
      <tr><td class="sidebarHeader medText"><b>Block List</b></td></tr>
      <tr><td class="neofriend" align="center">
        <input id="blI" style="width:100px"/><button id="blA">Add</button>
        <div id="blN"></div>
      </td></tr>
    </table>`;
  sideBar.after(blockDiv);

  const blN=document.getElementById("blN"),
        blI=document.getElementById("blI");

  const renderBlockList=()=>{
    blN.innerHTML=blockList.map(n=>
      `<div style="font-size:12px">
         <span data-n="${n}" style="color:red;cursor:pointer;font-size:8px">X</span> ${n}
       </div>`).join("");
  };

  const filterAuctions=()=>{
    document.querySelectorAll('table[align="center"] tbody tr[bgcolor]').forEach(row=>{
      const user=row.querySelector('td:nth-child(4) font.sf')?.textContent.trim().toLowerCase();
      row.style.display=(user && blockList.some(b=>b.toLowerCase()===user))?"none":"";
    });
  };

  renderBlockList();filterAuctions();

  blockDiv.addEventListener("click", e=>{
    if(e.target.id==="blA"){
      const val=blI.value.trim();
      if(val && !blockList.includes(val)){
        blockList.push(val);
        saveVal("blockList",JSON.stringify(blockList));
        renderBlockList();filterAuctions();
        blI.value="";
      }
    } else if(e.target.dataset.n){
      blockList=blockList.filter(x=>x!==e.target.dataset.n);
      saveVal("blockList",JSON.stringify(blockList));
      renderBlockList();filterAuctions();
    }
  });
})();
