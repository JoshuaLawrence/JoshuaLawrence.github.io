//link the list data to the 
function linkListData(list){
    //console.log(list);
    let _data = data[list.faction];
    list.abilities = {};
    //battle traits
    let battleTraitProfiles = _data.rules.querySelectorAll("sharedSelectionEntries selectionEntry profiles profile");
 
    battleTraitProfiles.forEach(profile=>{
        let name = profile.attributes.name.value;
        let id = profile.attributes.id.value;
        if(!list.abilities[id]){
            list.abilities[id] = parseAbility(profile);
        }
        //lookup keywords in ability effect and add units with those keywords to the ability - first requires storing each unit's keywords
    });

    //battle formation ability

    //Spell lore

    //prayer lore

    //manifestation lore

    //unit abilities
    //console.log(_data);
    list.units.forEach((unit,unit_idx)=>{
        let _unit = _data.units.querySelector('[type="unit"][name="'+unit.unitName+'" i]');
        if(!_unit){
            let msg = "Could not find data for Unit: [" + unit.unitName + "]";
            if(!list.parseErrors)list.parseErrors = [];
            list.parseErrors.push({msg,'str':unit.unitName})
            console.error(msg);
            return;
        }
        //get abilities
       
        parseProfiles(list,_unit,unit_idx,unit);
       
        //add enhancements if unit has any
        if(unit.enhancements){
            
            Object.keys(unit.enhancements).forEach(enhancement=>{
                let profile = _data.rules.querySelector('profile[name="'+enhancement+'"]');
                if(!profile)return;
                let name = profile.attributes.name.value;
                let id = profile.attributes.id.value;
                if(!list.abilities[id]){
               
                    list.abilities[id] = parseAbility(profile);
                    //console.log(list.abilities[id])
                }
                list.abilities[id].units.push(unit_idx);
                unit.abilities.push({id,name});
            })
        }
        //console.log(unit.unitName,_data.units.querySelector('[name="'+unit.unitName+'"]'))
    });
    //console.log(list);
    if(list.regimentsOfRenown){
        list.regimentsOfRenown.forEach((RoR,RoR_idx)=>{
            //get RoR ability
            let RoRName = RoR.name;
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
                if(!ror_data) return console.error("could not find RoR unit " + unit.unitName);
                let _unit = ror_data.units.querySelector('[type="unit"][name="'+unit.unitName+'" i]');
                parseProfiles(list,_unit,'r'+RoR_idx+'_'+unit_idx,unit)
            });

        })
    }
   
}

function parseProfiles(list,xmlData,unit_idx = null,unit = null){
    let RoRProfiles = xmlData.querySelectorAll('profile');
    RoRProfiles.forEach(profile=>{
    
        let typeId = profile.attributes.typeId.value;
        if(PROFILE[typeId].name == "Unit"){
            return;
        }
        let name = profile.attributes.name.value;
        let id = profile.attributes.id.value;
        
        if(!list.abilities[id]){
           
            list.abilities[id] = parseAbility(profile);
        }
        if(unit_idx && unit){
            list.abilities[id].units.push(unit_idx);
            unit.abilities.push({id,name});
        }
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
function sortAbilitiesByPhase(list){
    if(list.phases){
        console.log("already sorted",list.phases);
        return;
    }
     //sort abilities by phase
     let phases = {
        deployment:[],
        start_of_battle_round:[],
        your:{
            Hero:[],
            Movement:[],
            Shooting:[],
            Charge:[],
            Combat:[],
            EndOfTurn:[],
            other:[]
        },
        enemy:{
            Hero:[],
            Movement:[],
            Shooting:[],
            Charge:[],
            Combat:[],
            EndOfTurn:[],
            other:[]
        },
        passive:[],
        reaction:[],
        other:{
            Hero:[],
            Movement:[],
            Shooting:[],
            Charge:[],
            Combat:[],
            EndOfTurn:[],
            other:[]
        }
    }

    Object.values(list.abilities).forEach(ability=>{
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
            phases.your.Combat.push(ability);//.id;
            phases.enemy.Combat.push(ability);//.id;
            return;
        }
        if(ability.typeName.includes("Ranged Weapon")){
            phases.your.Shooting.push(ability);//.id;
            phases.enemy.Shooting.push(ability);//.id;
            return;
        }
        if(ability.chars?.Timing?.includes("Reaction")){
            phases.reaction.push(ability)
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
        if(turn != "any"){
            phases[turn][phase].push(ability);//.id;
        }else{
            
            phases.your[phase].push(ability);//.id;
            phases.enemy[phase].push(ability);//.id;
        }
        
    });
    list.phases = phases;
    //console.log(phases)
}