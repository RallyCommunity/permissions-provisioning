Ext.define('Rally.technicalservices.TSRequestedPermission',{
    extend: 'Ext.data.Model',
    fields: [
             {name: 'permission', type:'String', defaultValue: 'Editor'},
             {name: 'userid', type: 'Integer'},
             {name: 'username', type: 'String'},
             {name: 'projectpath', type: 'String'},
             {name: 'projectid', type: 'Integer'}
             ],
    getPrefKey: function(){
        return Rally.technicalservices.TSRequestedPermission.getUserPrefKey(this.get('userid')) + 'project.' + this.get('projectid');
    },
    getPrefValue: function(){
        return this.getData();
    },
    statics: {
        PREF_PREFIX_USER: 'permissions.provisioning.user.',
        getUserPrefKey: function(userid){
            return this.PREF_PREFIX_USER + userid + '.';
        },
        isValidPrefKey: function(pref_key){
            var regex = new RegExp(this.PREF_PREFIX_USER.replace('.','\.') + '([0-9]+)\.project\.([0-9]+)', 'i');
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