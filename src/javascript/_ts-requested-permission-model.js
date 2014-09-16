Ext.define('Rally.technicalservices.TSRequestedPermission',{
    extend: 'Ext.data.Model',
    fields: [
             {name: 'permission', type:'string', defaultValue: 'Editor'},
             {name: 'userid', type: 'int'},
             {name: 'username', type: 'string'},
             {name: 'projectpath', type: 'string'},
             {name: 'projectid', type: 'int'},
             {name: 'team_member',type:'Boolean'}
             ],
    getPrefKey: function(wksp_id){
        return Rally.technicalservices.TSRequestedPermission.getUserPrefKey(wksp_id, this.get('userid')) + 'project.' + this.get('projectid');
    },
    getPrefValue: function(){
        return this.getData();
    },
    statics: {
        
        getPrefPrefixUser: function(wksp_id){
            var PREF_PREFIX_USER = 'permissions.provisioning.user.'; 
            return wksp_id.toString() + PREF_PREFIX_USER;
        },
        getUserPrefKey: function(wksp_id, userid){
            return wksp_id + this.PREF_PREFIX_USER + userid + '.';
        },
        isValidPrefKey: function(pref_key){
            var regex = new RegExp(this.getPrefPrefixUser('').replace('.','\.') + '([0-9]+)\.project\.([0-9]+)', 'i');
            var pref_matches = pref_key.match(regex);
            if (pref_matches){
                //make sure ids > 0 
                if (pref_matches[1] > 0 && pref_matches[2]>0){
                    return true;
                };
            }
            return false;
        }
    }
});