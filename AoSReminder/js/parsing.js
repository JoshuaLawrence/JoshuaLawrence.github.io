//link the list data to the 
function linkListData(list){
    //console.log(list);
    let _data = data[list.faction];
    list.abilities = {};
    list.parseErrors = [];
    //battle traits - includes spell and prayer lores
    let battleTraitProfiles = _data.rules.querySelectorAll("sharedSelectionEntries selectionEntry profiles profile");
    //console.log(battleTraitProfiles);
    battleTraitProfiles.forEach(profile=>{
        let name = profile.attributes.name.value;
        let id = profile.attributes.id.value;
        if(!list.abilities[id]){
            list.abilities[id] = parseAbility(profile);
        }
        //lookup keywords in ability effect and add units with those keywords to the ability - first requires storing each unit's keywords
    });

    //battle formation ability
    let battleFormationEntries = _data.rules.querySelectorAll('selectionEntryGroup[name="Battle Formations: '+list.faction+'"] selectionEntries selectionEntry');
    //console.log(battleFormationEntries);
    battleFormationEntries.forEach(entry => {
        let _battleFormation = entry.attributes.name.value;
        if(_battleFormation == list.battleFormation){
            parseProfiles(list,entry);
        }
    });
   
    //Manifestation Lore
    //console.log(list.manifestationLore)
    if(list.manifestationLore?.abilities != undefined){
        let factionManifestationLoreEntries = _data.rules.querySelectorAll('selectionEntryGroup[name="Manifestation Lores"] selectionEntries selectionEntry');
        //console.log(manifestationLoreEntries);
        factionManifestationLoreEntries.forEach(entry => {
            //console.log(entry)
            let _manifestationLore = entry.attributes.name.value;
            if(_manifestationLore == list.manifestationLore.name){
                //console.log("parsing profile " + _manifestationLore)
                parseProfiles(list,entry,null,list.manifestationLore,true);
                //add manifestation units to units list
                addManifestationsToList(list,entry);
            }
        });
        //check manifestations from core rules
        let generalManifestationLoreEntries = data.core.querySelectorAll('selectionEntryGroup[name="Manifestation Lores"] selectionEntries selectionEntry');
        //console.log(generalManifestationLoreEntries);
        generalManifestationLoreEntries.forEach(entry => {
            //console.log(entry)
            let _manifestationLore = entry.attributes.name.value;
            //console.log(_manifestationLore,list.manifestationLore.name);
            if(_manifestationLore == list.manifestationLore.name){
                //console.log("parsing profile " + _manifestationLore)
                parseProfiles(list,entry,null,list.manifestationLore,true);
                //add manifestation units to units list
                addManifestationsToList(list,entry);
            }
        });
        //console.log(list.manifestationLore.abilities)
        if(list.manifestationLore.abilities.length == 0){
            logParseError("Manifestation Lore",list.manifestationLore.name,list);
        }
    }
    //unit abilities
    //console.log(_data);
    list.units.forEach((unit,unit_idx)=>{
        let _unit = _data.units.querySelector('[type="unit"][name="'+unit.unitName+'" i]');
        //look in core rules for manifestations if unit wasn't found
        if(!_unit){
            _unit = data.core.querySelector('[name="'+unit.unitName+'" i]');
        }
        if(!_unit){

            let msg = "Could not find data for "+((unit?.type == "manifestation")?("Manifestation"):("Unit"))+": [" + unit.unitName + "]";
            list.parseErrors.push({msg,'str':unit.unitName})
            console.log(msg);
            return;
        }
        //get abilities
        //console.log(_unit)
        parseProfiles(list,_unit,unit_idx,unit);
        
        //get keywords
        parseKeywords(_unit,unit_idx,unit);

        //add enhancements if unit has any
        if(unit.enhancements){
            
            Object.keys(unit.enhancements).forEach(enhancement=>{
                let profile = _data.rules.querySelector('profile[name="'+enhancement+'"]');
                if(profile){
                    let name = profile.attributes.name.value;
                    let id = profile.attributes.id.value;
                    let typeName = profile.attributes.typeName.value; //for showing up in Units page
                    if(!list.abilities[id]){
                
                        list.abilities[id] = parseAbility(profile);
                        //console.log(list.abilities[id])
                    }
                    list.abilities[id].units.push(unit_idx);
                    unit.abilities.push({id,name,typeName});
                }else{
                    //check for wargear options
                    let wargearData = _data.units.querySelector('[name="'+enhancement+'"]');
                    if(wargearData){
                        parseProfiles(list,wargearData,unit_idx,unit,true);
                    }
                }
            })
        }
        parseUnitCharacteristics(list,_unit,unit_idx);
        //console.log(unit.unitName,_data.units.querySelector('[name="'+unit.unitName+'"]'))
    });
    //console.log(list);
    if(list.regimentsOfRenown){
        list.regimentsOfRenown.forEach((RoR,RoR_idx)=>{
            //get RoR ability
            let RoRName = RoR.name;
            RoRName = RoRName.replace("Saviours","Saviors");//convert correct spelling to american to match the BSData
            let dataRow = data.RoR.querySelector('selectionEntry[name="Regiment of Renown: '+ RoRName + '"]');
            parseProfiles(list,dataRow);
            //find units in RoR and add abilities to list
            let ror_data = null;
            RoR.units.forEach((unit,unit_idx)=>{
                if(!ror_data)
                Object.keys(data).find(key=>{
                    let test = data[key]?.units?.querySelector('[type="unit"][name="'+unit.unitName+'" i]');
                    if(test){
                        ror_data = data[key];
                        return true;
                    }
                    return false;
                })
                if(!ror_data) return console.log("could not find RoR unit " + unit.unitName);
                let _unit = ror_data.units.querySelector('[type="unit"][name="'+unit.unitName+'" i]');
                parseProfiles(list,_unit,'r'+RoR_idx+'_'+unit_idx,unit);
                parseUnitCharacteristics(list,_unit,'r'+RoR_idx+'_'+unit_idx);
                
            });

        })
    }
   
}

function parseUnitCharacteristics(list,_data,unit_idx){
    let move = _data.querySelector('characteristic[name="Move"]')?.innerHTML ?? '-';
    let health = _data.querySelector('characteristic[name="Health"]')?.innerHTML;
    let control = _data.querySelector('characteristic[name="Control"]')?.innerHTML ?? '-';
    let save = _data.querySelector('characteristic[name="Save"]')?.innerHTML;

    if(typeof(unit_idx) == "string" && unit_idx?.slice(0,1) == 'r'){
        let ror_idx = unit_idx.slice(1).split('_')[0];
        unit = list.regimentsOfRenown[ror_idx].units[unit_idx.split('_')[1]].characteristics = {move,health,control,save};
    }else{
        list.units[unit_idx].characteristics = {move,health,control,save};
    }
    
}

function logParseError(parseType,parseName,list){
    let msg = "Could not find data for "+parseType+": [" + parseName + "]";
    if(!list.parseErrors)list.parseErrors = [];
    list.parseErrors.push({msg,'str':parseName})
    console.log(msg);
    return;
}

function addManifestationsToList(list,entry){
    let profiles = entry.querySelectorAll('profile');
    profiles.forEach(profile=>{
        
        let manifestationName = profile.attributes.name.value.slice(7);
        manifestationName = manifestationName.replace('’',"'");//standardise the symbols
        list.units.push({unitName:manifestationName,abilities:[],type:"manifestation",keywords:[]});
    })
}

function parseProfiles(list,xmlData,unit_idx = null,unit = null,wargear = false){
    let query = 'profile';
    if(!wargear) 
        query = 'profile:not(selectionEntryGroup[name="Wargear Options"]>*>*>*>*>*>profile)';
    let profiles = xmlData.querySelectorAll(query);
    let invalidTypeNames = ["Unit","Manifestation"];
    profiles.forEach(profile=>{
        //console.log(profile);
        let typeId = profile.attributes.typeId.value;
        if(invalidTypeNames.includes(PROFILE[typeId].name)){
            return;
        }
        let name = profile.attributes.name.value;
        let id = profile.attributes.id.value;
        let typeName = profile.attributes.typeName.value;
        
        if(!list.abilities[id]){
           
            list.abilities[id] = parseAbility(profile);
        }
        if(unit_idx !== null && unit){
            list.abilities[id].units.push(unit_idx);
        }
        if(unit !== null)
            unit.abilities.push({id,name,typeName});
    })
}

function parseAbility(profile){
    let name = profile.attributes.name.value;
    let id = profile.attributes.id.value;
    let typeId = profile.attributes.typeId.value;
    let ability = {
        name,
        typeName: PROFILE[typeId].name,
        typeId,
        id,
        chars:{},
        units:[]
    }
    let characteristics = profile.children[0].children;
    for(let i=0;i<characteristics.length;i++){
        let char= characteristics[i];
        let charName = char.attributes.name.value;
        let charTypeId = char.attributes.typeId.value;
        let value = char.innerHTML;

        ability.chars[charName]= value;
    }
    return ability;
}

function parseKeywords(xmlData,unit_idx = null,unit = null){
    //console.log(unit)
    let _keywords = xmlData.querySelectorAll('categoryLinks categoryLink');
    _keywords.forEach((categoryLink)=>{
        //console.log(categoryLink.attributes.name)
        let keyword = categoryLink.attributes.name.nodeValue;
        unit.keywords.push(keyword);
    })
}

function sortAbilitiesByPhase(list){
    if(list.phases && false){
        console.log("already sorted",list.phases);
        //return;
    }
    //take abilities from the list
    let abilities = Object.values(list.abilities);
    //add core abilities to the abilities list
    abilities.push.apply(abilities,coreAbilities);
    //sort abilities by phase
    let phases = {
        deployment:[],
        start_of_battle_round:[],
        your:{
            Hero:{Passive:[],Abilities:[],Reactions:[],Spells:[]},
            Movement:{Passive:[],Abilities:[],Reactions:[]},
            Shooting:{Passive:[],Abilities:[],Weapons:[],Reactions:[]},
            Charge:{Passive:[],Abilities:[],Reactions:[]},
            Combat:{Passive:[],Abilities:[],Weapons:[],Reactions:[]},
            EndOfTurn:{Passive:[],Abilities:[],Reactions:[]},
            other:{Passive:[],Abilities:[],Reactions:[]},
        },
        enemy:{
            Hero:{Passive:[],Abilities:[],Reactions:[],Spells:[]},
            Movement:{Passive:[],Abilities:[],Reactions:[]},
            Shooting:{Passive:[],Abilities:[],Weapons:[],Reactions:[]},
            Charge:{Passive:[],Abilities:[],Reactions:[]},
            Combat:{Passive:[],Abilities:[],Weapons:[],Reactions:[]},
            EndOfTurn:{Passive:[],Abilities:[],Reactions:[]},
            other:{Passive:[],Abilities:[],Reactions:[]},
        },
        passive:[],
        reaction:[],
        other:[]
    }

    abilities.forEach(ability=>{
        if(ability.typeName.includes("(Passive)")){
            phases.passive.push(ability);
            return;
        }
        if(ability.chars?.Timing?.includes("Deployment Phase")){
            phases.deployment.push(ability);
            return;
        }
        if(ability.chars?.Timing?.includes("Start") && ability.chars?.Timing?.includes("Battle Round")){
            phases.start_of_battle_round.push(ability);
            return;
        }
        if(ability.typeName.includes("Melee Weapon")){
            phases.your.Combat.Weapons.push(ability);//.id;
            phases.enemy.Combat.Weapons.push(ability);//.id;
            return;
        }
        if(ability.typeName.includes("Ranged Weapon")){
            phases.your.Shooting.Weapons.push(ability);//.id;
            phases.enemy.Shooting.Weapons.push(ability);//.id;
            return;
        }
        if(ability.chars?.Timing?.includes("Reaction")){
            let addedToPhase = false;
            if(ability.chars.Timing.includes("Shoot") || ability.chars.Timing.includes("Attack")){
                phases.your.Shooting.Reactions.push(ability);
                phases.enemy.Shooting.Reactions.push(ability);
                addedToPhase = true;
            }
            if(ability.chars.Timing.includes("Attack")){
                phases.your.Combat.Reactions.push(ability);
                phases.enemy.Combat.Reactions.push(ability);
                addedToPhase = true;
            }
            if(ability.chars.Timing.includes("Fight")){
                phases.your.Combat.Reactions.push(ability);
                phases.enemy.Combat.Reactions.push(ability);
                addedToPhase = true;
            }
            if(ability.chars.Timing.includes("Charge")){
                phases.your.Charge.Reactions.push(ability);
                phases.enemy.Charge.Reactions.push(ability);
                addedToPhase = true;
            }
            if(ability.chars.Timing.includes("Run")){
                phases.your.Movement.Reactions.push(ability);
                addedToPhase = true;
            }
            //if not added to any specific phase, then add to general reactions for later debug
            if(!addedToPhase || true){
                phases.reaction.push(ability);
            }
            return;
        }


        let turn = "";
        let phase = "";
        if(ability.chars?.Timing?.includes("Your")){
            turn = "your";
        }else if(ability.chars?.Timing?.includes("Enemy")){
            turn = "enemy";
        }else if(ability.chars?.Timing?.includes("Any")){
            turn = "any";
        }else{
            turn = "other";
        }

        if(ability.chars?.Timing?.includes("End") && ability.chars?.Timing?.includes("Turn")){
            phase = "EndOfTurn";
        }else if(ability.chars?.Timing?.includes("Hero")){
            phase = "Hero";
            if(ability.typeName.includes("Spell")){
                phases.your[phase].Spells.push(ability);
                //return; // enable the return after adding tabs per phase
            }
        }else if(ability.chars?.Timing?.includes("Movement")){
            phase = "Movement";
        }else if(ability.chars?.Timing?.includes("Shooting")){
            phase = "Shooting";
        }else if(ability.chars?.Timing?.includes("Charge")){
            phase = "Charge";
        }else if(ability.chars?.Timing?.includes("Combat")){
            phase = "Combat";
        }else{
            phase = "other";
        }

        if(phase == "other"){
            phases[phase].push(ability);//.id;
        }
        else if(turn != "any"){
            phases[turn][phase].Abilities.push(ability);//.id;
        }else{
            
            phases.your[phase].Abilities.push(ability);//.id;
            phases.enemy[phase].Abilities.push(ability);//.id;
        }
        
    });
    list.phases = phases;
    //console.log(phases)
}