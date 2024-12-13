const CACHE_UPDATE_TIME = 1*24*60*60*1000;
var selectedList = null;
var data = {};
var loadedData = null;
var parsedData = {
    "Factions": [],
    "Lists": [],
};
var MOBILE_VIEW = window.screen.width < 600;
window.onresize = () =>{MOBILE_VIEW = window.screen.width < 600}
var PROFILE = {};
//IndexedDB link
var db;

const DEBUG = {
    errors:[],

};
const PAGES = {
    MIN_PAGE_TURN: 1,
    MAX_PAGE_TURN: 2,
    IMPORT: 0,
    PHASES: 1,
    UNITS: 2,
    getPageID: (id,pageTurn=true)=>{
        if(pageTurn && id < PAGES.MIN_PAGE_TURN) id = PAGES.MIN_PAGE_TURN;
        if(pageTurn && id > PAGES.MAX_PAGE_TURN) id = PAGES.MAX_PAGE_TURN;
        return PAGES[id];
    },
    getPageName: (id)=>{
        if(id < 0) id = 0;
        if(id > 2) id = 2;
        return PAGES[id+"name"];
    },
    isTurnable: (id)=>{
        return id >= PAGES.MIN_PAGE_TURN && id <= PAGES.MAX_PAGE_TURN;
    },
    0: "importDiv",
    1: "phaseContainer",
    2: "unitContainer",
    "0name": "List Import",
    "1name": "Phases",
    "2name": "Units",
}
var currentPage = 1;
var nextPage = currentPage+1;
var pageStart = false;
var touchInProgress = false;
var lastXPosition;
document.addEventListener("DOMContentLoaded", init);

async function init(){
    await dbSetup();


    await loadCore();
    await loadRegimentsOfRenown();
    
    //load stored lists from cache
    loadExistingLists();

    const error = console.error.bind(console)
    console.error = (...args) => {
        //error logging
        if(args.length == 1){
            DEBUG.errors.push(args[0]);
        } else {
            DEBUG.errors.push(args);
        }
        document.getElementById("debugBtn").style.display = "";
        error(...args)
    }
    
    document.addEventListener("touchstart",handlePageButtonTouchStart);
    document.addEventListener("touchmove",handlePageButtonTouchMove);
    document.addEventListener("touchend",handlePageButtonTouchEnd);
    
    pageTitle.innerHTML = PAGES.getPageName(currentPage);

}
//inits the page buttons and pages
function handlePageButtonTouchStart(event){

    let position = event.touches[0].clientX;
    pageStart = position < window.screen.width/2;
    if((position > 20)&&(window.screen.width - position > 20))return
    touchInProgress = true;

    var lastPage = document.getElementById(PAGES.getPageID(currentPage));
    
    if(!pageStart && currentPage < PAGES.MAX_PAGE_TURN){
        nextPage=currentPage+1;
    }else if(pageStart && currentPage > PAGES.MIN_PAGE_TURN){
        nextPage=currentPage-1;
    }else if(PAGES.isTurnable(currentPage)){ //allow swiping from any side when on a non-turnable page
        return touchInProgress = false;
    }
    //return to Phases page if turning from a page in the non-scrollable range
    if(!PAGES.isTurnable(currentPage)){
        nextPage = 1;
    }
    var page = document.getElementById(PAGES.getPageID(nextPage));
    if(!pageStart){
        page.style.left = window.screen.width;
    }else{
        page.style.left = -window.screen.width;
    }
    
    lastPage.style.zIndex = 0;
    page.style.zIndex = 10;
}
//moves the page button with the touch movement
function handlePageButtonTouchMove(event){
    if(!touchInProgress)return;
    //return to Phases page if turning from a page in the non-scrollable range
    if(!PAGES.isTurnable(currentPage)){
        nextPage = 1;
    }
    
    let position = event.touches[0].clientX;
    lastXPosition = position;
    var page = document.getElementById(PAGES.getPageID(nextPage));
    if(!pageStart){
        //swiping from right
        page.style.left = position;
    }else{
        page.style.left = position - window.screen.width;
    }
    
}
//snap the button to the left or the right of the screen
function handlePageButtonTouchEnd(event){
    if(!touchInProgress)return;
    
    var lastPage = document.getElementById(PAGES.getPageID(currentPage,false));
    var page = document.getElementById(PAGES.getPageID(nextPage));
    
    page.style.left = "unset";
    lastPage.style.left = "unset";

    if(lastXPosition && lastXPosition < window.screen.width/2){
        if(pageStart){//didn't swipe over halfway
            page.style.zIndex = -1;
            lastPage.style.zIndex = 10;
            //console.log("last page - not past halfway")
        }else{
            currentPage = nextPage;
            page.style.zIndex = 10;
            lastPage.style.zIndex = -1;
            //console.log("next page")
        }
    }else if(lastXPosition){
        if(!pageStart){//didn't swipe over halfway
            page.style.zIndex = -1;
            lastPage.style.zIndex = 10;
            //console.log("last page - not past halfway")
        }else{
            currentPage = nextPage;
            page.style.zIndex = 10;
            lastPage.style.zIndex = -1;
            //console.log("last page")
        }
    }else{
        page.style.zIndex = -1;
        lastPage.style.zIndex = 10;
    }
    pageTitle.innerHTML = PAGES.getPageName(currentPage);
    touchInProgress = false;
    lastXPosition = null;
}

function showPage(pageID){
    if(!MOBILE_VIEW)return;
    let lastPage = document.getElementById(PAGES.getPageID(currentPage,false));
    let nextPage = document.getElementById(PAGES.getPageID(pageID,false));
    if(!nextPage)return console.error("No page with ID " + pageID);
    currentPage = pageID;
    lastPage.style.zIndex = -1;
    nextPage.style.zIndex = 10;
    pageTitle.innerHTML = PAGES.getPageName(currentPage);
}

function toggleSidePanel(hide = false){
    if(sideContainer.style.display != "none" || hide){
        sideContainer.style.display = "none";
    }else{
        sideContainer.style.display = "unset";
    }
}

function downloadDebugJson(){

    let link = document.createElement('a');
    link.setAttribute('download', 'AoSReminders_debug.json');
    link.href = makeTextFile(JSON.stringify({"ConsoleErrors":DEBUG.errors,"Lists":parsedData.Lists}));
    document.body.appendChild(link);

    window.requestAnimationFrame(function () {
        var event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
        alert("Please send the AoSReminders_debug.json in a message to the dev if you know him.");
    });
    
    
}

var textFile = null;
function makeTextFile (text) {
    var data = new Blob([text], {type: 'application/json'});

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
      window.URL.revokeObjectURL(textFile);
    }

    textFile = window.URL.createObjectURL(data);

    // returns a URL you can use as a href
    return textFile;
  };


function loadExistingLists(){
    //load existing lists from localStorage
    if(localStorage.getItem("Lists")){
        parsedData['Lists'] = JSON.parse(localStorage.getItem("Lists"));
        //get faction data for lists
        parsedData['Lists'].forEach(async (list)=>{
            await loadFaction(list.faction);
            linkListData(list);
            sortAbilitiesByPhase(list);
        });
        //fill the list selector
        fillListSelector();
        
    }
    
}


async function importArmyList(){
    //parse list in import textarea
    let newImportList = parseImportText();
    //load faction data
    console.log("newImportList",newImportList)
    await loadFaction(newImportList.faction);
    //repopulate the List selector
    selectedList = newImportList;
    fillListSelector();
    linkListData(newImportList);
    sortAbilitiesByPhase(newImportList);
    loadList();
    showPage(PAGES.PHASES);
}

function parseImportText(){
    let importListRaw = document.getElementById("ListImport").value.split('\n');
    //clear the import input
    document.getElementById("ListImport").value = "";
    //console.log("importListRaw",importListRaw);
    let importList = null;
    /*if(importListRaw[0].split("-").length > 1){
        console.log(importListRaw)
        importList = nrParse(importListRaw);
    }else{*/
        importList = gwParse(importListRaw);
        
    //}
    return importList;
    
}

//for Army Lists generated by the New Recruit App
function nrParse(importListRaw){
    let importList = {
        "armyName":null,
        "faction":null,
        "battleFormation":null,
        "units":[],
        "regimentsOfRenown": [],
        "spellLore":null,
        "prayerLore":null,
        "manifestationLore":null,
        "parseErrors":[],
        "rawInput": importListRaw
    };
    for(let i = 0; i < importListRaw.length; i++){
        let row = importListRaw[i];
        
        //get Faction and Army Name
        if(!importList["faction"] && row.trim() != ""){
            let parts = row.split("-");
            importList["faction"] = parts[0].trim();
            importList["armyName"] = parts[1].trim();
            row = importListRaw[++i];
        }
        else if(row.includes("Battle Formation")){
            importList["battleFormation"] = row.split(":")[1].trim();
        }
        else if(row.includes("Manifestation Lore")){
            let manifestationLore = row.split(":")[1].trim();
            importList["manifestationLore"] = {name:manifestationLore,abilities:[]};
        }
        else if(row.includes("Prayer Lore")){
            let prayerLore = row.split(":")[1].trim();
            importList["prayerLore"] = {name:prayerLore,abilities:[]};
        }
        else if(row.includes("Spell Lore")){
            let spellLore = row.split(":")[1].trim();
            importList["spellLore"] = {name:spellLore,abilities:[]};
        }
        else if(row.includes("FACTION TERRAIN")){
            row = importListRaw[++i];
            while(!row.includes('#')){
                if(row.trim() != ""){
                    importList["units"].push({unitName:row.trim(),abilities:[]});
                }
                row = importListRaw[++i];
            }
        }
        //add units
        else if(row.includes("]:")){
            let unitName = row.split("[")[0].trim();
            if(!isNaN(unitName[0])){
                let unitCount = parseInt(unitName[0]);
                unitName = unitName.slice(2).trim();
                for(let j = 1;j<unitCount;j++){
                    importList["units"].push({unitName,abilities:[]});
                }
            }
            importList["units"].push({unitName,abilities:[]});
        }
        else if(row.includes("Regiments of Renown")){
            //get RoR name
            importList["regimentsOfRenown"].push({"name":row.split("++")[1].trim(),"units":[]});
            //loop through till end of input here
            for(++i; i < importListRaw.length; i++){
                row = importListRaw[i];
                //add RoR units to last added RoR
                if(row.includes("]:")){
                    let unitName = row.split("[")[0].trim();
                    if(!isNaN(unitName[0])){
                        unitName = unitName.slice(2).trim();
                    }
                    importList["regimentsOfRenown"][importList["regimentsOfRenown"].length-1]["units"].push({unitName,abilities:[]});
                }
                else if(row.includes("HERO")){
                    row = importListRaw[++i];
                    while(!row.includes('#')){
                        if(row.trim() != ""){
                            importList["regimentsOfRenown"][importList["regimentsOfRenown"].length-1]["units"].push({unitName:row.split(":")[0].trim(),abilities:[]});
                        }
                        row = importListRaw[++i];
                    }
                }
                else if(row.includes(":") && !row.includes("•")){
                    let unitName = row.split(":")[0].trim();
                    importList["regimentsOfRenown"][importList["regimentsOfRenown"].length-1]["units"].push({unitName,abilities:[]});
                }
            }
        }

    }
    updateListStorage(importList);
    return importList;
}

//for Army Lists generated by the Age of Sigmar Stormforge App
function gwParse(importListRaw){
    //init imported list
    let importList = {
        "armyName":null,
        "faction":null,
        "battleFormation":null,
        "units":[],
        "regimentsOfRenown": [],
        "spellLore":null,
        "prayerLore":null,
        "manifestationLore":null,
        "parseErrors":[],
        "rawInput": importListRaw
    };
    let RoRFinished = false;
    let unitNames = []; //for tracking unit names - only allow 1 of a unit

    let maxParseLength = importListRaw.length - 3;
    for(let i = 0; i < maxParseLength; i++){
        let row = importListRaw[i];
        if(row.includes("---")) continue;
        if(row.includes("<mark>")){
            row = row.replace("<mark>","");
            row = row.replace("</mark>","");
        }
        //Get Army Name
        if(!importList["armyName"] && row.trim() != ""){
            importList["armyName"] = row.split('(')[0].trim();
            continue;
        }
        //Get Faction
        let j = 0;
        if(parsedData["Factions"].includes(row.split("|")?.[j=0]?.trim().replace("Realm-lord","Realmlords"))){//AoS Android App v1.5.0
            importList["faction"] = row.split("|")[j].trim();
            //Get Battle Formation
            importList["battleFormation"] = row.split("|")[j+1].trim();
        }else if(parsedData["Factions"].includes(row.split("|")?.[j=1]?.trim().replace("Realm-lord","Realmlords"))){ //AoS iOS App v1.6.0(18)
            importList["faction"] = row.split("|")[j].trim();
            //Get Battle Formation
            importList["battleFormation"] = row.split("|")[j+1].trim();
        }
        //Get Spell Lore name
        if(row.includes("Spell Lore")){
            let spellLore = row.split("-")[1].trim();
            importList["spellLore"] = {name:spellLore,abilities:[]};
        }
        //Get Prayer Lore name
        if(row.includes("Prayer Lore")){
            let prayerLore = row.split("-")[1].trim();
            importList["prayerLore"] = {name:prayerLore,abilities:[]};
        }
        //Get Manifestation Lore name
        if(row.includes("Manifestation Lore")){
            let manifestationLore = row.split("-")[1].trim();
            importList["manifestationLore"] = {name:manifestationLore,abilities:[]};
        }
        //Get Unit name
        if(row.includes("(")){
            let unitName = row.split("(")[0].trim();
            if(!unitNames.includes(unitName)){ //only allow 1 of each unit
                unitNames.push(unitName);
                importList["units"].push({
                    unitName,
                    abilities:[],
                    characteristics:{}
                });
            }
            
        }
        //Get Unit Enhancements
        if(row.includes('•')){
            //add to last added unit
            if(!importList["units"][importList["units"].length-1]["enhancements"])importList["units"][importList["units"].length-1]["enhancements"] = {};
            importList["units"][importList["units"].length-1]["enhancements"][row.split('•')[1].trim()] = {};
        }
        //Get Regiment of Renown - at end of list - loop through remaining rows - [RoR name]=[...RoR units]
        if(row.includes('Regiments of Renown') && !RoRFinished){
            i++;
            RoRFound = true;
            //add to unit - do later
            let regex = /\(\d\d\d\)/
            for(i;i<maxParseLength;i++){
                row = importListRaw[i];
                if(row.includes("---")) continue;
                if(row.includes("Faction Terrain")){
                    RoRFinished = true;
                    break;
                }
                //get RoR name
                if(regex.test(row) === true){
                    importList["regimentsOfRenown"].push({"name":row.replace(regex,"").trim(),"units":[]});
                }else if(row.trim() != ""){
                    //add RoR units to last added RoR
                    importList["regimentsOfRenown"][importList["regimentsOfRenown"].length-1]["units"].push({"unitName":row,abilities:[]});
                }
                
                
            }
        }
        if(row.includes('Faction Terrain')){
            i++;
            //faction terrain
            for(i;i<maxParseLength;i++){
                row = importListRaw[i];
                if(row.trim() == "") break;
                importList["units"].push({unitName:row,abilities:[]});
            }
        }
    }
   
    //store the list(s) in local storage
    updateListStorage(importList);
    //console.log("importList",importList);
    return importList;
}



function loadImportText(){
    if(!selectedList)return;
    
    document.getElementById("ListImport").value = selectedList.rawInput.join('\n');
    
}

function fillListSelector(){
    console.log("filling list selector")
    let listSelector = document.getElementById("listSel");
    
    listSelector.innerHTML = "";
    listSelector.appendChild(document.createElement("OPTION"));
    parsedData["Lists"].forEach((list,idx)=>{
        let opt = document.createElement("OPTION");
        opt.value = idx;
        opt.innerHTML = list.armyName;
        listSelector.appendChild(opt);
        if(selectedList && selectedList.armyName == list.armyName){
            listSelector.value = idx;
        }
    })
}

function loadList(listIdx = null){
    if(listIdx){
        let list = parsedData["Lists"][listIdx];
        selectedList = list;
    }//otherwise refresh list
    document.getElementById("ListImport").value = "";
    displayParseErrors(selectedList);

    displayAbilities(selectedList);

    displayUnits(selectedList);
   
}

function displayParseErrors(list){
    let listView = document.getElementById("listView");
    listView.innerHTML = "";

    if(!list || !list?.parseErrors || list.parseErrors.length == 0)return;
    let h1 = document.createElement("h2");
    h1.innerHTML = "Parse Errors (check spelling)";
    listView.appendChild(h1);
    list.parseErrors.forEach(e=>{
        let p = document.createElement("p");
        p.innerHTML = e.msg;
        listView.appendChild(p);
    })
}

function displayAbilities(list){
    let phaseView = document.getElementById("phaseView");
    phaseView.innerHTML = "";
    if(!list)return;
    let factionTitle = document.createElement("h3");
    factionTitle.innerHTML = "Faction: " + list.faction;
    phaseView.appendChild(factionTitle);
    console.log("Displaying List: " + list.armyName);
    //should be all sorted and ready to display the Turn reminder
    Object.entries(list.phases).forEach(([phase,abilities])=>{
        let div = createPhaseDiv(phase,abilities);
        phaseView.appendChild(div);
    })
}

function createPhaseDiv(phase,abilities){
    //console.log(phase,abilities)
    let phaseDiv = document.createElement("div");
    let header = document.createElement("div");
    let body = document.createElement("div");
    phaseDiv.appendChild(header);
    phaseDiv.appendChild(body);

    header.classList.add("phaseTitleDiv");

    let title = document.createElement("h1");
    
    

    if(phase == "your" || phase == "enemy"){
        Object.entries(abilities).forEach(([_phase,profiles])=>{
            let _abilities = profiles.Abilities;
            let _weapons = profiles.Weapons;
            if(_phase=="other"){
                if(_abilities.length>0)
                    console.log(phase + "_" + _phase,_abilities);
                if(_weapons?.length>0)
                    console.log(phase + "_" + _phase,_weapons);
                return;
            }
            if(_abilities.length > 0 || _weapons?.length > 0)
                phaseDiv.appendChild(createPhaseDiv(phase.slice(0,1).toUpperCase() + phase.slice(1) +" " +_phase,profiles));
        });
        
    }else {//if(phase != "other"){ display abilities with missing timings in own div at end

        header.appendChild(title); 
        let _abilities = abilities;
        if(abilities?.Abilities != undefined){
            _abilities = abilities.Abilities;
        }
        _abilities.forEach(ability=>{
            let abilityDiv = createAbilityDiv(ability);
            if(abilityDiv)
                body.appendChild(abilityDiv);
        })
        let _weapons = abilities.Weapons;
        if(_weapons != undefined){
            _weapons.forEach(weapon=>{
                let weaponDiv = createAbilityDiv(weapon);
                if(weaponDiv)
                    body.appendChild(weaponDiv);
            })
        }

    }/*else{  
        console.log(phase,abilities);
    }*/
    while(phase.includes("_")){
        let i = phase.indexOf("_");
        phase = phase.slice(0,i) + " " + phase.slice(i+1,i+2).toUpperCase() + phase.slice(i+2);
    }

    title.innerHTML = phase.slice(0,1).toUpperCase() + phase.slice(1);


    
    return phaseDiv;
}

function createAbilityDiv(ability,showWeapon = false){
    let abilityDiv = document.createElement("div");
    let abTitle = document.createElement("span");
    abTitle.innerHTML = ability.name + " - " + ability.typeName;
    abilityDiv.appendChild(abTitle);
    let containerDiv = document.createElement("div");
    abilityDiv.appendChild(containerDiv);
    let unitAbilities = ['Melee Weapon','Ranged Weapon'];

    if(unitAbilities.includes(ability.typeName)){
        if(!showWeapon)return;
        abilityDiv.classList.add("weaponProfileDiv");
        switch(ability.typeName){
            case "Melee Weapon":
                abilityDiv.classList.add("meleeProfile");
                break;
            case "Ranged Weapon":
                abilityDiv.classList.add("rangedProfile");
                break;
        }
    }else{
        abilityDiv.classList.add("abilityDiv");
    }

    Object.entries(ability.chars).forEach(([key,value])=>{
        let div = createAbilityCharDiv(key,value);
        //display weapon profiles with the weapon abilities beneath the characteristics
        if(key == "Ability"){
            abilityDiv.appendChild(div);
        }else{
            containerDiv.appendChild(div);
        }
        
    });
    //dont bother with the Unit name as it'll be under the unit on the Units page
    if(showWeapon)return abilityDiv;

    let unitsDiv = document.createElement("div");
    let unTitle = document.createElement("label");
    unTitle.innerHTML = "Units";
    unitsDiv.appendChild(unTitle);
    ability.units?.forEach(unitIdx=>{
        let unit = null;
        if(typeof(unitIdx) == "string" && unitIdx?.slice(0,1) == 'r'){
            let ror_idx = unitIdx.slice(1).split('_')[0];
            unit = selectedList.regimentsOfRenown[ror_idx].units[unitIdx.split('_')[1]];
        }else{
            unit = selectedList.units[unitIdx];
        }
       
        let span = document.createElement("span");
        span.innerHTML = unit.unitName;
        unitsDiv.appendChild(span);
    })
    containerDiv.appendChild(unitsDiv);
    return abilityDiv;
}

function createAbilityCharDiv(char,val){
    let div = document.createElement("div")
    if(val == ""){ 
        //don't sho a characteristic if it has no values
        div.style.display = "none";
        return div;
    }
    let span = document.createElement("span");
    let label = document.createElement("label");
    label.innerHTML = char;
    //do any keyword "bolding"
    while(val.includes("**^^")){
        val = val.slice(0,val.indexOf("**^^")) + val.slice(val.indexOf("**^^"),val.indexOf("^^**")).toUpperCase() + val.slice(val.indexOf("^^**"))
        val = val.replace("**^^","<b>");
        val = val.replace("^^**","</b>");
    }
    //do listing
    while(val.includes("**")){
        val = val.replace("**","<b>");
        val = val.replace("**","</b>");
    }
    //do italicising
    while(val.includes("*")){
        val = val.replace("*","<i>");
        val = val.replace("*","</i>");
    }
    //do line breakes
    while(val.includes("\n")){//
        val = val.replace("\n","<br>");
    }
    
    span.innerHTML=val;
    //dont append the Ability label to weapon profiles
    if(char!="Ability")
        div.appendChild(label);
    div.appendChild(span);
    return div;
}


function removeSelectedList(listIdx = null){
    if(!listIdx){
        listIdx = document.getElementById("listSel").value;
    }
    let list = parsedData['Lists'][listIdx];
    if(confirm("Are you sure you want to delete ["+list.armyName+"]?")){
        //remove list from storage
        parsedData['Lists'].splice(listIdx,1);
        selectedList = null;
        //re-fill the list selector
        fillListSelector();
        //update storage
        updateListStorage();
        loadList();
    }
   
}

function updateListStorage(listUpdate = null){
    if(listUpdate){
        //check if this is a list update or a new list
        let existingListIndex = parsedData["Lists"].findIndex((list) => list.armyName == listUpdate.armyName);
        if(existingListIndex < 0){
            console.log("Adding List ["+listUpdate.armyName+"]");
            parsedData["Lists"].push(listUpdate);
        }else{
            console.log("Updating List["+listUpdate.armyName+"]");
            parsedData["Lists"][existingListIndex] = listUpdate;
        }
    }
    localStorage.setItem("Lists",JSON.stringify(parsedData['Lists']));
}

function displayUnits(list){
    let unitView = document.getElementById("unitView");
    unitView.innerHTML = "";
    list.units.forEach((unit)=>{
        let unitDiv = createUnitDiv(list,unit);
        unitView.appendChild(unitDiv);
    })
    list.regimentsOfRenown[0].units.forEach((unit)=>{
        let unitDiv = createUnitDiv(list,unit);
        unitView.appendChild(unitDiv);
    })
}

function createUnitDiv(list,unit){
    let unitDiv = document.createElement("div");
    let header = document.createElement("div");
    header.classList.add("unitTitleDiv");

    let unitTitle = document.createElement("h1");
    unitTitle.innerHTML = unit.unitName;

    let charDiv = createUnitCharDiv(unit);

    header.appendChild(charDiv);    
    header.appendChild(unitTitle);    
    unitDiv.appendChild(header);

    let containerDiv = document.createElement("div");
    unitDiv.appendChild(containerDiv);
    //sort unit abilities Ranged > Melee > Passive
   
    let _abilities = unit.abilities.sort(sortUnitAbilities);

    _abilities.forEach((ability) =>{
        if(['Melee Weapon','Ranged Weapon', 'Ability (Passive)'].includes(ability.typeName)){
            let _ability = list.abilities[ability.id];
            let div = createAbilityDiv(_ability,true);
            containerDiv.appendChild(div);
        }
    });



    return unitDiv;
}

function createUnitCharDiv(unit){
    let charDiv = document.createElement("div");
    charDiv.classList.add("unitCharacteristics");
    let moveDiv = document.createElement("div");
    let healthDiv = document.createElement("div");
    let saveDiv = document.createElement("div");
    let controlDiv = document.createElement("div");
    
    charDiv.appendChild(moveDiv);
    charDiv.appendChild(saveDiv);
    charDiv.appendChild(healthDiv);
    charDiv.appendChild(controlDiv);
    moveDiv.innerHTML = unit.characteristics.move + " Move";
    healthDiv.innerHTML = unit.characteristics.health + " Health";
    saveDiv.innerHTML = unit.characteristics.save + " Save";
    controlDiv.innerHTML = unit.characteristics.control + " Control";

    return charDiv;
}


function sortUnitAbilities(a,b){
    if(!a.typeName)return -1;
    if(!b.typeName)return 1;
    if(a.typeName.includes("Ability") && ['Melee Weapon','Ranged Weapon'].includes(b.typeName)){
        return 1;
    }
    if(b.typeName.includes("Ability") && ['Melee Weapon','Ranged Weapon'].includes(a.typeName)){
        return -1;
    }

    if(a.typeName.includes("Ranged") && (b.typeName.includes("Melee") || b.typeName.includes("Ability"))){
        return -1;
    }
    if(b.typeName.includes("Ranged") && (a.typeName.includes("Melee") || a.typeName.includes("Ability"))){
        return 1;
    }
}