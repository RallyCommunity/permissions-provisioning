Ext.define('Rally.technicalservices.util.PreferenceSaving',{
    singleton: true,
    logger: new Rally.technicalservices.Logger(),
    PREF_CHUNK_LEN: 999,
    saveAsJSON: function(name, object, workspace, appId, filterByUser, project){
        /*
         * This function does the following:
         * 1- Cleans up any existing preferences with this name
         * 2- Saves the object as JSON encoded preference.  
         * If the JSON encoded string is larger than the limit, then
         * the string is broken into pieces and saved.  
         * 3- Saves meta data (.lastupdate)
         * 
         */
        if (appId == undefined) {appId == null;}
        if (project == undefined) {project == null;}
        if (filterByUser == undefined) {filterByUser = false;}
        
        var deferred = Ext.create('Deft.Deferred');
        
        var pref_chunks = this._getJSONChunksFromObject(object);
        var prefs = {};
        Ext.each(pref_chunks, function(chunk, index){
            var pref_name = this._getPrefName(name,index);
            prefs[pref_name] = chunk;
        }, this);
        
        //remove old prefs for name....
        this._cleanPrefs(name, workspace, appId,filterByUser,project).then({
            scope: this,
            success: function(){
                this.logger.log('preferences cleaned, now saving new ones');
                this.save(prefs,workspace,appId,filterByUser,project).then({
                    scope: this,
                    success: function(){
                        deferred.resolve();
                    },
                    failure: function(error){
                        deferred.reject(error);
                    }
                });
            }, 
            failure: function(error){
                this.logger.log('failed to clean out preferences: ', error);
                deferred.reject('failed to clean out preferences: ', error);
            }
        });
        return deferred.promise; 
    },
    removePref: function(prefix, workspace,appId, filterByUser,project){
        this._cleanPrefs(prefix, workspace,appId,filterByUser,project);
    },
    _cleanPrefs: function(prefix,workspace, appId,filterByUser,project){
        this.logger.log('_cleanPrefs');
        var deferred = Ext.create('Deft.Deferred');
        this._findPreferencesContainingKey(prefix, workspace).then({
            scope: this,
            success: function(records){
                this.logger.log('Destroying ' + records.length + ' records.');
                if (records.length > 0){
                    this._destroyRecords(records).then({
                        success: function(){
                            deferred.resolve(); 
                        }
                    });
                } else {
                    deferred.resolve();
                }
                
            },
            failure: function(){
                deferred.reject('Failed to find preferences with key ', prefix);
            }
        });
        return deferred.promise;
    },
    _getPrefName: function(name,suffix){
        return name.concat(".").concat(suffix.toString());
    },
    _getJSONChunksFromObject: function(object){
        var pref = Ext.JSON.encode(object);
        var pref_chunks = [];
        
        while (pref.length > this.PREF_CHUNK_LEN){
            pref_chunks.push(pref.substr(0,this.PREF_CHUNK_LEN));
            pref = pref.substr(this.PREF_CHUNK_LEN);
        }
        pref_chunks.push(pref);
        console.log('pref_chunks',pref_chunks);
        return pref_chunks;
    },
    _getObjectFromJSONChunks: function(json_chunks){
        var json_string = '';
        Ext.Array.each(json_chunks, function(chunk){
            console.log(chunk);
            json_string += chunk;
        });
        console.log(json_string);
        var obj = Ext.JSON.decode(json_string);
        return obj; 
    },
    _getPrefSuffix: function(name){
        var suffix = name.substr(name.lastIndexOf('.')+1);
        return suffix;  
    },
    _getPrefRoot: function(name){
        var root = name.substr(0, name.lastIndexOf('.'));
        return root;  
    },
    fetchFromJSON: function(name, workspace){
        var deferred = Ext.create('Deft.Deferred');
        //Returns an object retrieved from a JSON encoded preference.
        var json_chunks = new Ext.util.HashMap();
        var last_updated = new Ext.util.HashMap();
        this._findPreferencesContainingKey(name, workspace).then({
            scope:this,
            success: function(data){
                this.logger.log('fetchFromJSON Success.',data);
                //var json_chunks = [];
                //var last_updated = '';
                Ext.each(data, function(rec){
                    var key = this._getPrefRoot(rec.get('Name'));
                    if (!json_chunks.containsKey(key)){
                        json_chunks.add(key,[]);
                        last_updated.add(key,rec.get('CreationDate'));
                    }
                    var idx =  this._getPrefSuffix(rec.get('Name'));
                    var val = rec.get('Value');
                    this.logger.log('key:',key,' idx:',idx);
                    if (!isNaN(idx)){
                        json_chunks.get(key)[idx] = val;
                    } 
                },this);
                
                console.log(json_chunks);
                var objs = new Ext.util.HashMap();
                json_chunks.each(function(key,value,length){
                    console.log(key,value.length,length);
                    objs.add(key,this._getObjectFromJSONChunks(value));
                },this);
               // var obj = this._getObjectFromJSONChunks(json_chunks);
                console.log('x',objs);
                deferred.resolve([objs,last_updated]);
            },
            failure: function(error) {
                deferred.reject(error);
            }
        });
        return deferred.promise; 
    },
    save: function(prefs, workspace, appId, filterByUser, project){
        //Set defaults
        if (appId == undefined) {appId == null;}
        if (project == undefined) {project == null;}
        if (filterByUser == undefined) {filterByUser = false;}
        
        var deferred = Ext.create('Deft.Deferred');
         Rally.data.PreferenceManager.update({
            appID: appId,
            project: project,
            workspace: workspace.Name,
            filterByUser: filterByUser,
            settings: prefs,
            scope: this, 
            success: function() {
                this.logger.log('Successfully saved preference:',prefs);
                deferred.resolve();
            },
            failure: function(){
                this.logger.log('Failed to save preference',prefs);
                deferred.reject('Rally.data.PreferenceManager.update failed.');
            }
        });
        return deferred.promise;
    },
    _findPreferencesContainingKey: function( key_part, workspace ) {
        this.logger.log( "_findPreferencesContainingKey", key_part );
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Preference',
            fetch: ['Name','Value','CreationDate'],
            limit: 'Infinity',
            context: {workspace: workspace},
            sorters: [ { property: 'Name', direction: 'ASC' } ],
            autoLoad: true,
            filters: [ { property: 'Name', operator: 'contains', value: key_part }, 
                       { property: 'workspace', value: workspace}],
            listeners: {
                scope: this, 
                load: function(store,data,success) {
                    this.logger.log('_findPreferencesContainingKey load', success);
                    if (success) {
                        deferred.resolve(data);
                    } else {
                        deferred.reject('Error creating wsapi Store');
                    }
                }
            }
        });
        return deferred.promise;
    },
    _destroyRecords: function(records){
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.each(records,function(rec){
            promises.push(this._destroyRecord(rec));
        }, this);
        Deft.Promise.all(promises).then({
            scope: this,
            success: function(successes){
                deferred.resolve(successes);
                //TODO process to see if everything succeeeded
            }
        });
        return deferred.promise;
        
    },
    _destroyRecord: function(record){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('destroying ' + record.get('Name'));
        record.destroy({
            callback: function(records, operation, success){
                
                deferred.resolve(success); 
            }
        });
        return deferred.promise;
    }
   

});