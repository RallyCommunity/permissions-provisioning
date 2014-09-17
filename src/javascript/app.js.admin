Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    PREF_NAME: 'permissions.provisioning.projecttree',
    USER_PREF_NAME: 'permissions.provisioning.user',
    items: [
        {xtype:'container',itemId:'display_box', layout: 'hbox', padding: 25},
        {xtype:'container',itemId: 'requested_permissions_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#display_box').add({
            itemId: 'button_build_projects',
            xtype: 'button',
            text: 'Refresh Projects',
            scope: this,
            margin: 10,
            handler: this._refreshProjectTreePreferences
        });
        
        this._updateProjectTreeStatus();

        this._createPendingPermissionsGrid();
    },
    _getPrefName: function(){
        var wksp_id = this.getContext().getWorkspace().ObjectID;
        return wksp_id.toString() + this.PREF_NAME;  
    },
    _getUserPrefName: function(){
        var wksp_id = this.getContext().getWorkspace().ObjectID;
        return wksp_id.toString() + this.USER_PREF_NAME;  
    },
    _getRequestedPermissionColumns: function(){
        this.logger.log('_getRequestedPermissionColumns');
       
        var columns = [{ //username
                text: 'UserName',
                dataIndex: 'username',
                renderer: function(value, metaData, record){
                    return '<a href="/slm/user/edit.sp?oid=' + record.get('userid') + '" target="_blank">' + value + '</a>'; 
                } 
            },{//project 
                text: 'Project Path',
                dataIndex: 'projectpath',
                flex: 1
            },{
              text: 'Team Member?',
              dataIndex: 'team_member',
              renderer: function(v){
                  if (v) {return 'Yes';}
                  return 'No';
              }
            },{//Permission
                dataIndex: 'permission',
                text: 'Requested Permission',
            },{ //Action Column (dismiss)
                        scope: this,
                        xtype:'actioncolumn',
                        items: [{
                            icon: '/slm/images/icon_delete.gif',
                            tooltip: 'Dismiss',
                            scope: this,
                            handler: this._dismissRequest
                        }],
            }];
        return columns;        
    },
    
    _dismissRequest: function(grid, row_index, col_index){
        var perm = grid.getStore().getAt(row_index);
        var wksp_id = this.getContext().getWorkspace().ObjectID;
        this.logger.log('_dismissRequest:', perm, this);
        Rally.technicalservices.util.PreferenceSaving._cleanPrefs(perm.getPrefKey(wksp_id),this.getContext().getWorkspaceRef()).then({
            scope:this,
            success: function(){
                this._createPendingPermissionsGrid();
            },
            failure: function(error){
                alert(error);
            }
        });
    },
       _createPendingPermissionsGrid: function(){
           if (this.down('#requested-permissions-grid')){
               this.down('#requested-permissions-grid').destroy();
           }
           
           this._createPendingPermissionsStore().then({
            scope: this,
            success: function(store){
                this.down('#requested_permissions_box').add({
                    xtype:'rallygrid',
                    itemId: 'requested-permissions-grid',
                    title: 'Pending User Project Permission Requests',
                    store: store,
                    scope: this,
                    columnCfgs: this._getRequestedPermissionColumns(),
                    showPagingToolbar: false,
                    width: 800
                    
                });
            },
            failure: function(error){
                alert(error);
            }
        });
    },
    _createPendingPermissionsStore: function(){
        var workspace = this.getContext().getWorkspaceRef();
        var wksp_id = this.getContext().getWorkspace().ObjectID;
        var deferred = Ext.create('Deft.Deferred');
        
        Rally.technicalservices.util.PreferenceSaving.fetchFromJSON(Rally.technicalservices.TSRequestedPermission.getPrefPrefixUser(wksp_id),workspace).then({
            scope: this,
            success: function(obj){
                var requests = obj[0].getKeys();
                var data = [];
                Ext.each(requests, function(req_key){
                   if (Rally.technicalservices.TSRequestedPermission.isValidPrefKey(req_key)){
                       data.push(obj[0].get(req_key));
                   }
                }, this);

                var store = Ext.create('Rally.data.custom.Store',{
                    model: 'Rally.technicalservices.TSRequestedPermission',
                    data: data,
                    limit: 'infinity'
                });
                deferred.resolve(store);
            },
            failure: function(error){
                deferred.reject(error);
            }
        });
        return deferred.promise; 
    },
    _refreshProjectTreePreferences: function(){
        var me = this; 
        this.down('#button_build_projects').setDisabled(true);
        this.down('#display_box').setLoading({msg: 'Generating Project tree...'})
        var workspace = this.getContext().getWorkspaceRef();
        this._fetchProjectTree().then({
            scope: this,
            success: function(tree){
                Rally.technicalservices.util.PreferenceSaving.saveAsJSON(this._getPrefName(),tree,workspace).then({
                    scope: this,
                    success: function(){
                        Rally.ui.notify.Notifier.show({message: 'Project Tree Saved.'});
                    },
                    failure: function(error){
                        Rally.ui.notify.Notifier.showError({message: error});
                    }
                });
            },
            failure: function(error){
                Rally.ui.notify.Notifier.showError({message: error});
           }
        }).always(function(){
            me.down('#display_box').setLoading(false);
            me.down('#button_build_projects').setDisabled(false);
            me._updateProjectTreeStatus(true);
        });
         
    },
    _fetchProjectTree: function(){
        var deferred = Ext.create('Deft.Deferred');
        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Project',
            fetch: ['Name','ObjectID','Parent','Children','Owner','FirstName','LastName','EmailAddress'],
            limit: Infinity,
            autoLoad: true,
            context: {project: null},
            listeners: {
                scope: this, 
                load: function(store, records, successful){
                    this.logger.log('_fetchProjectTree success', successful);
                    if (successful){
                        var fields = ['Name','Owner'];
                        var flattened_project_hash = this._createProjectModelHash(records);  
                        var project_tree = Rally.technicalservices.util.TreeBuilding.constructRootItems(flattened_project_hash);
                        var project_tree_hash = Rally.technicalservices.util.TreeBuilding.convertModelsToHashesLimitFields(project_tree, fields);
                        deferred.resolve(project_tree_hash);
                    } else {
                        deferred.reject('Error loading projects');
                    }
                }
            }
       });
       return deferred.promise;
    },
    _createProjectModelHash: function(records){
        var project_hash = {};
        Ext.Array.each(records, function(rec){
            var parent = rec.get('Parent');
            rec.set('parent',parent);
            project_hash[rec.get('ObjectID')] = rec;
            var owner_obj = rec.get('Owner');
            var owner = '';
            if (owner_obj){
                if (owner_obj.FirstName){
                    owner += owner_obj.FirstName + ' ';
                }
                if (owner_obj.LastName){
                    owner += owner_obj.LastName + ' ';
                }
                owner += owner_obj.EmailAddress;
            }
            rec.set('Owner',owner);
         }, this);
        return project_hash;
    },  
    _updateProjectTreeStatus: function(just_updated){
        var html ='';
        if (this.down('#text-area-project-tree-status')){
            this.down('#text-area-project-tree-status').destroy();
        }
        var status =  this.down('#display_box').add({
            itemId: 'text-area-project-tree-status',
            xtype: 'container',
            html: html
        });
        var me = this; 
        if (just_updated){
            html = '';
            status.update(html);
        } else {
            this.down('#display_box').setLoading(true);
            Rally.technicalservices.util.PreferenceSaving.findKeysAndCreateDate(this._getPrefName(), this.getContext().getWorkspaceRef()).then({
                scope: this,
                success: function(key_hash_map){
                    if (Object.keys(key_hash_map).length>0){
                        last_updated = _.values(key_hash_map)[0];
                        html = 'The project tree was last updated on ' + last_updated;
                    } else {
                        html = 'The project tree has not yet been created.  Please click <b>Refresh Projects</b> to build the project tree for the user permissions provisioning app.';
                        var cls = 'cls-error';
                        status.addCls(cls); 
                   }
                },
                failure: function(error){
                    this.logger.log('findKeysAndCreateDate',error);
                    html = 'Error creating the project tree structure: ' + error;
                    var cls = 'cls-error';
                    status.addCls(cls); 
                }
            }).always(function(){
                status.update(html);
                me.down('#display_box').setLoading(false);
            });
        }
    }
});