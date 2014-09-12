Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    PREF_NAME: 'permissions.provisioning.projecttree',
    USER_PREF_PREFIX: 'permissions.provisioning.user.',
    filter_string: '',
    items: [
        {xtype:'container',itemId:'message_box', padding: 10},
        {xtype: 'container', itemId: 'requested_permissions_box', layout: 'vbox', padding: 10},
        {xtype: 'container', itemId: 'search_box', layout: 'hbox'},
        {xtype: 'container', itemId: 'search_results_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        //Get the project tree.  If we don't have this, then this app is useless!  
        Rally.technicalservices.util.PreferenceSaving.fetchFromJSON(this.PREF_NAME, this.getContext().getWorkspace()).then({
            scope: this, 
            success: this._addAppComponents,
            failure: this._notifyUserOfError
        });
    },
    _addAppComponents: function(obj){
        //TODO: Handle the case where there is no project tree.  

        var tree_obj = obj[0].get(this.PREF_NAME);
        var last_updated = obj[1].get(this.PREF_NAME);
        this.logger.log('_addAppComponents',tree_obj,last_updated);
        this.down('#message_box').update('The project tree was last updated on ' + last_updated);

        
        //Create the internal project tree that we will search  
        this.project_selector = this._createTreeStore(this._getProjectTreeModelFields(),'TSProjectTreeStore',tree_obj);
        
        this._refreshRequestedPermissions(); // creates the grid where we will display the permissions requested by the user
        
        this._createSearchBox();  //Sets up the components for searching by project name or owner
        

    },
    _createSearchResults: function(results){
        this.down('#search_results_box').removeAll();
        
        var store = Ext.create('Ext.data.Store',{
            fields: ['projectpath','projectid','owner'],
            limit: 'infinity',
            pageSize: 10,
            data: results
        });
        this.down('#search_results_box').add({
            xtype: 'rallygrid',
            itemId: 'search-results-grid',
            store: store,
          //  selType: 'rowmodel',
          //  plugins: this._getPlugins(),
            width: 800,  //Set to just less than document.width
            columnCfgs: this._getSearchResultsColumns(),
            showPagingToolbar: true,
            pagingToolbarCfg: {
                pageSizes: [10, 50, 100, 200],
                store: store,
            }
        });
    },
    _getSearchResultsColumns: function(){
        this.logger.log('_getSearchResultsColumns');
        var permission_types = ['Viewer','Editor','Admin'];
        var columns = [{
                text:'Project Path', 
                dataIndex:'projectpath', 
                flex: 1
        },{
            text:'Project Owner', 
            dataIndex:'owner', 
        },{ //Request Permission Action
                    xtype:'actioncolumn',
                    items: [{
                        icon: 'extjs/examples/shared/icons/fam/cog_edit.png',  // Use a URL in the icon config
                        tooltip: 'Request Viewer Permission',
                        handler: this._addRequestedPermission,
                        value: 'Viewer',
                        scope:this
                    },{
                        icon: 'extjs/examples/shared/icons/fam/cog_edit.png',  // Use a URL in the icon config
                        tooltip: 'Request Editor Permission',
                        handler: this._addRequestedPermission,
                        value: 'Editor',
                        scope:this
                    },{
                        icon: 'extjs/examples/restful/images/delete.png',
                        tooltip: 'Request Admin permission',
                        handler: this._addRequestedPermission,
                        value: 'Admin',
                        scope:this
                    }]
                    
                }];
        return columns;        
    },
    _addRequestedPermission: function(grid, row, col,evt){
        console.log(grid,row,col);        
        var req_perm = evt.value;    
        var rec = grid.getStore().getAt(row);
        
        var user = this.getContext().getUser();
        var permission = Ext.create('Rally.technicalservices.TSRequestedPermission');
        permission.set('projectid',rec.get('projectid'));
        permission.set('projectpath',rec.get('projectpath'))
        permission.set('userid',user.ObjectID);
        permission.set('username',user.UserName);
        permission.set('permission',req_perm);
        Rally.technicalservices.util.PreferenceSaving.saveAsJSON(permission.getPrefKey(), permission.getPrefValue(), this.getContext().getWorkspace()).then({
            scope: this,
            success: function(){
                Rally.ui.notify.Notifier.show({message: req_perm + ' permission submitted for ' + user.UserName + ' for project' + rec.get('projectpath')});
                this._refreshRequestedPermissions();
            },
            failure: function(error){
                this._notifyUserOfError(error);
            }
        });
    },
    _nofityUserOfError: function(error){
        Rally.ui.notify.Notifier.showError({message: error});
    },
    /* 
     * ProjectSelector:  The following functions are specific to the tree for searching for a project
     */
    _getProjectTreeModelFields: function(){
        return [
            {name: 'Name', type: 'String'},
            {name: 'Owner', type: 'String'}
        ];
    },
    _generateTypeAheadStore: function(search_field){
        this.logger.log('_generateTypeAheadStore', search_field);
        //generate an array of all project names
        var search_terms = [];
        var project_count = 0;
        this.project_selector.getRootNode().cascadeBy(function(nd){
            project_count++;
            var val = nd.get(search_field);
            if (val.length > 1 && !Ext.Array.contains(search_terms, val)){
                search_terms.push(val);
                var tokens = val.match(/\S+/g);
                console.log(tokens, tokens.length);
                if (tokens.length > 1){
                    search_terms = _.union(search_terms,tokens);
                }
            }
            search_terms.sort();
        });
        this.logger.log('_generateTypeAheadStore END', project_count);
        return search_terms;
    },
    _createTreeStore: function(model_fields, model_name, children){
        var model = {
                extend: 'Ext.data.Model',
                fields: model_fields
            };
        Ext.define(model_name, model);        
        
        var tree_store = Ext.create('Ext.data.TreeStore',{
            model: model_name,
            root: {
                expanded: false,
                children: children
                }
        });
        return tree_store;
    },

    _searchTree: function(){
        var search_field = this.down('#search-by-combo').getValue();
        var search_term = this.down('#search-combo').getValue();
        var root = this.project_selector.getRootNode();
        var search_regex = new RegExp(search_term,'gi');
        search_results = []; 
        root.cascadeBy(function(n){
            console.log(n.get('Name'));
            var match_term = n.get(search_field); 
            if (search_field == 'Name'){
                match_term = n.get(search_field)
            }
            if (match_term.match(search_regex)){
                console.log('match ', n, n.getPath(search_field));
                var result = {};
                result['projectpath'] = n.getPath('Name');
                result['projectid'] = n.get('id');
                result['owner'] = n.get('Owner');
                search_results.push(result);
            }
            return true;
        });
        this._createSearchResults(search_results);

    },
    _addSearchWidgets: function(cb){
        var search_field = cb.getValue();
        var type_ahead_store = this._generateTypeAheadStore(search_field);
        
        if (this.down('#search-combo')){this.down('#search-combo').destroy();}
        if (this.down('#search-button')){this.down('#search-button').destroy();}

        this.down('#search_box').add({
            xtype: 'combobox',
            itemId: 'search-combo',
            typeAhead: true,
            store: type_ahead_store,
            hideTrigger: true,
            enableKeyEvents: true,
            margin: 10,
            minChars: 2,
            width: 300
        });
        this.down('#search_box').add({
            xtype: 'button',
            itemId: 'search-button',
            text: 'Search',
            margin: 10,
            scope: this,
            handler: this._searchTree
        });
    },
    _createSearchBox: function(){
        this.logger.log ('_createSearchBox');
        var search_store = Ext.create('Ext.data.Store', {
            fields: ['display','field_name'],
            data: [{display:'Project Name', field_name:'Name'},
                   {display:'Owner Name or Email', field_name:'Owner'}]  //TODO if we want to search by otherfields, this is where we will set that up.  

        });        this.down('#search_box').add({
            xtype: 'combobox',
            itemId: 'search-by-combo',
            store: search_store,
            displayField: 'display',
            valueField: 'field_name',
            margin: 10,
            labelAlign: 'right',
            fieldLabel: 'Search By',
            forceSelection: true,
            listeners: {
                scope: this,
                change: function(cb) {
                    this._addSearchWidgets(cb);
                }
            }
        });
        this.down('#search-by-combo').setValue('Name');
    },
    /*
     * RequestedPermissions:  The following functions are specific to the tree for requested permissions
     */
    _getRequestedPermissionColumns: function(){
        this.logger.log('_getRequestedPermissionColumns');

        var columns = [
            { //Project Path 
                text: 'Project Path',
                dataIndex: 'projectpath',
                flex: 1
            },
            { //Requested Permission
                text: 'Requested Permission',
                dataIndex: 'permission',
            },{ //Action Column
                xtype:'actioncolumn',
                items: [{
                    icon: '/slm/images/icon_delete.gif',
                    tooltip: 'Delete',
                    scope: this,
                    handler: this._deleteRequestedPermission
                }]
            }]
        return columns;        
    },
    _deleteRequestedPermission: function(grid,row,col){
        alert('delete requested permission');
        var perm = grid.getStore().getAt(row);
        this.logger.log('_deleteRequestedPermission:', perm);
        Rally.technicalservices.util.PreferenceSaving._cleanPrefs(perm.getPrefKey(),this.getContext().getWorkspace()).then({
            scope:this,
            success: function(){
                this._refreshRequestedPermissions();
            },
            failure: function(error){
                alert(error);
            }
        });

    },
    _refreshRequestedPermissions: function(user_pref_key){
        this.logger.log('_refreshRequestedPermissions');

        if (user_pref_key == undefined){
            var userid = this.getContext().getUser().ObjectID;
            user_pref_key = Rally.technicalservices.TSRequestedPermission.getUserPrefKey(userid);
        }

        var obj = Rally.technicalservices.util.PreferenceSaving.fetchFromJSON(user_pref_key, this.getContext().getWorkspace()).then({
            scope: this,
            success: function(objs){
                var request_keys = objs[0].getKeys();
                var requests = [];
                //var key_regex = new RegExp(this.PREF_NAME.[].)
                Ext.Array.each(request_keys, function(key){
                    console.log(key);
                    if (Rally.technicalservices.TSRequestedPermission.isValidPrefKey(key)){
                        console.log('match',key);
                        requests.push(objs[0].get(key));
                    }
                });
                
                this.down('#requested_permissions_box').removeAll();
               if (requests.length > 0){
                    var notes = 'Pending permissions requests for ' + this.getContext().getUser().UserName + ':';
                    this.down('#requested_permissions_box').update(notes);
//                    this.down('#requested_permissions_box').add({
//                        xtype: 'textfield',
//                        value: notes,
//                        border: false
//                    });
                    this._createRequestedPermissionsGrid(requests);
                } else {
                    var notes = 'There are no pending permissions requests for ' + this.getContext().getUser().UserName;
                    this.down('#requested_permissions_box').add({
                        xtype: 'textfield',
                        value: notes,
                        border: false
                    });
                }
            },
            failure: function(error){
                alert(error);
            }
        });
    },
    _getGridWidth: function(){
      //Set to just less than document.width
        return 800;
    },
    _createRequestedPermissionsStore: function(data){
        var store = Ext.create('Rally.data.custom.Store',{
            model: 'Rally.technicalservices.TSRequestedPermission',
            limit: 'infinity',
            data: data
        });
        return store;
    },
    _createRequestedPermissionsGrid: function(data){
        
        var store = this._createRequestedPermissionsStore(data);
        
        this.down('#requested_permissions_box').add({
            xtype: 'rallygrid',
            itemId: 'requested-permissions-grid',
            store: store,
            width: this._getGridWidth(),  
            columnCfgs: this._getRequestedPermissionColumns(),
            pagingToolbarCfg: {
                store: store
            }
        });
    },
    _getPlugins: function(){
        return [
          Ext.create('Ext.grid.plugin.CellEditing', {
              clicksToEdit: 1
          })
      ];
     }
});